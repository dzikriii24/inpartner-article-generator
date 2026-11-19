"""
FastAPI Service Adapter Routes for 1sLabs Content Automation Engine.

Exposes authenticated internal endpoints `/api/v1/1slabs/*` so the 1sLabs
Node.js backend can drive generation and topic research locally without
direct cross-database credential coupling or modifying Inpartner data.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import subprocess
import sys
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from services.llm_client import call_llm, _sanitize_error
from services.slabs_pipeline import generate_slabs_article, research_topics_for_slabs
from services.slabs_image_service import (
    plan_image_requirements,
    rank_and_select_candidates,
    optimize_image_binary,
    generate_ai_image_fallback,
)


slabs_router = APIRouter(prefix="/api/v1/1slabs", tags=["1sLabs Adapter"])

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_JOB_RUNNER_PATH = os.path.join(_PROJECT_ROOT, "job_runner.py")
_JOB_LOCK = threading.Lock()
_JOB_DIR = os.path.join(_PROJECT_ROOT, "tmp", "slabs_jobs")
os.makedirs(_JOB_DIR, exist_ok=True)
_MEMORY_JOBS: Dict[str, Dict[str, Any]] = {}


def _resolve_python_executable() -> str:
    exe_name = os.path.basename(sys.executable).lower()
    if "python" in exe_name:
        return sys.executable
    for candidate in (
        os.path.join(sys.prefix, "bin", "python"),
        os.path.join(sys.prefix, "bin", "python3"),
        os.path.join(sys.prefix, "Scripts", "python.exe"),
    ):
        if os.path.exists(candidate):
            return candidate
    return sys.executable


def _constant_time_eq(a: str, b: str) -> bool:
    ha = hashlib.sha256(a.encode("utf-8")).hexdigest()
    hb = hashlib.sha256(b.encode("utf-8")).hexdigest()
    return hmac.compare_digest(ha, hb)


def verify_slabs_integration_key(
    x_integration_key: Optional[str] = Header(default=None, alias="X-Integration-Key")
) -> bool:
    expected = (
        os.getenv("SLABS_INTEGRATION_KEY")
        or os.getenv("STORE_INTEGRATION_KEY")
        or ""
    ).strip()

    # In purely local execution when no key is configured, require localhost-only ops or reject?
    # Fail closed whenever key is configured; when unset in dev, require explicit env or matching dev marker.
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="SLABS_INTEGRATION_KEY / STORE_INTEGRATION_KEY belum dikonfigurasi pada engine generator.",
        )
    if not x_integration_key or not _constant_time_eq(x_integration_key.strip(), expected):
        raise HTTPException(
            status_code=401,
            detail="X-Integration-Key tidak valid atau tidak disertakan.",
        )
    return True


def _is_valid_job_id(job_id: str) -> bool:
    return bool(job_id and re.fullmatch(r"[A-Za-z0-9_-]{8,80}", job_id))


def _save_job(job_id: str, data: Dict[str, Any]) -> None:
    if not _is_valid_job_id(job_id):
        return
    with _JOB_LOCK:
        _MEMORY_JOBS[job_id] = data
        try:
            path = os.path.join(_JOB_DIR, f"{job_id}.json")
            tmp_path = f"{path}.{os.getpid()}.tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
            os.replace(tmp_path, path)
        except Exception:
            pass


def _load_job(job_id: str) -> Optional[Dict[str, Any]]:
    if not _is_valid_job_id(job_id):
        return None
    # Always prefer disk state so LiteSpeed multi-worker prefork & detached job_runner share fresh progress.
    with _JOB_LOCK:
        path = os.path.join(_JOB_DIR, f"{job_id}.json")
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                _MEMORY_JOBS[job_id] = data
                return data
            except Exception:
                pass
        if job_id in _MEMORY_JOBS:
            return _MEMORY_JOBS[job_id]
    return None


class SlabsGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300)
    target_keyword: Optional[str] = None
    secondary_keywords: List[str] = Field(default_factory=list)
    pillar: Dict[str, Any] = Field(default_factory=dict)
    search_intent: Optional[str] = "informational"
    language: str = "id"
    tone: str = "practitioner_clear"
    word_count_target: int = 1050
    enable_web_research: bool = False
    custom_instructions: Optional[str] = ""
    knowledge_base: Dict[str, Any] = Field(default_factory=dict)
    existing_articles: List[Dict[str, Any]] = Field(default_factory=list)
    async_mode: bool = False


class SlabsResearchRequest(BaseModel):
    pillar_code: Optional[str] = ""
    pillar_codes: List[str] = Field(default_factory=list)
    count: int = 6
    pillars: List[Dict[str, Any]] = Field(default_factory=list)
    knowledge_base: Dict[str, Any] = Field(default_factory=dict)
    existing_titles: List[str] = Field(default_factory=list)
    existing_queue_titles: List[str] = Field(default_factory=list)
    gsc_queries: List[Dict[str, Any]] = Field(default_factory=list)


@slabs_router.get("/health")
def slabs_engine_health(_auth: bool = Depends(verify_slabs_integration_key)):
    gemini_configured = bool((os.getenv("GEMINI_API_KEY") or "").strip())
    return {
        "success": True,
        "engine": "1slabs-article-generator-adapter",
        "version": "1.0.0",
        "gemini_configured": gemini_configured,
        "timestamp": int(time.time()),
    }


def _run_async_job(job_id: str, payload: Dict[str, Any]) -> None:
    def on_progress(stage: str, pct: int, detail: str) -> None:
        current = _load_job(job_id) or {"job_id": job_id}
        current.update({
            "status": "running",
            "stage": stage,
            "progress": pct,
            "detail": detail,
            "updated_at": int(time.time()),
        })
        _save_job(job_id, current)

    try:
        result = generate_slabs_article(payload, progress_cb=on_progress)
        _save_job(job_id, {
            "job_id": job_id,
            "status": "completed",
            "stage": "completed",
            "progress": 100,
            "result": result,
            "updated_at": int(time.time()),
        })
    except Exception as exc:
        _save_job(job_id, {
            "job_id": job_id,
            "status": "failed",
            "stage": "failed",
            "progress": 0,
            "error": _sanitize_error(str(exc)),
            "updated_at": int(time.time()),
        })


def run_slabs_job_from_file(job_id: str) -> None:
    payload_path = os.path.join(_JOB_DIR, f"{job_id}.payload.json")
    try:
        with open(payload_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except Exception as exc:
        _save_job(job_id, {
            "job_id": job_id,
            "status": "failed",
            "stage": "failed",
            "progress": 0,
            "error": _sanitize_error(f"Payload job tidak terbaca: {exc}"),
            "updated_at": int(time.time()),
        })
        return
    try:
        _run_async_job(job_id, payload)
    finally:
        try:
            if os.path.exists(payload_path):
                os.remove(payload_path)
        except Exception:
            pass


def _spawn_detached_slabs_job(job_id: str, payload: Dict[str, Any]) -> None:
    payload_path = os.path.join(_JOB_DIR, f"{job_id}.payload.json")
    with open(payload_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)

    try:
        kwargs: Dict[str, Any] = {
            "cwd": _PROJECT_ROOT,
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
            "stdin": subprocess.DEVNULL,
        }
        if os.name == "nt":
            kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0x00000200)
        else:
            kwargs["start_new_session"] = True
            kwargs["close_fds"] = True
        subprocess.Popen(
            [_resolve_python_executable(), _JOB_RUNNER_PATH, "--mode", "slabs", "--slabs-job-id", job_id],
            **kwargs,
        )
    except Exception:
        t = threading.Thread(target=run_slabs_job_from_file, args=(job_id,), daemon=True)
        t.start()


@slabs_router.post("/generate")
def slabs_generate_article(
    req: SlabsGenerateRequest,
    _auth: bool = Depends(verify_slabs_integration_key),
):
    payload = req.model_dump()
    if req.async_mode:
        job_id = str(uuid.uuid4())
        _save_job(job_id, {
            "job_id": job_id,
            "status": "queued",
            "stage": "queued",
            "progress": 5,
            "detail": "Menunggu eksekusi engine...",
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
        })
        _spawn_detached_slabs_job(job_id, payload)
        return {"success": True, "async": True, "job_id": job_id, "status": "queued"}

    try:
        result = generate_slabs_article(payload)
        return {"success": True, "async": False, "article": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_sanitize_error(str(exc)))


@slabs_router.get("/jobs/{job_id}")
def slabs_job_status(job_id: str, _auth: bool = Depends(verify_slabs_integration_key)):
    job = _load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Engine job tidak ditemukan.")
    return {"success": True, "job": job}


class SlabsPlanImagesRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    target_keyword: Optional[str] = ""
    target_audience: Optional[str] = ""
    content: str = Field(default="")
    pillar: Dict[str, Any] = Field(default_factory=dict)
    pillar_code: Optional[str] = ""
    language: str = "id"
    max_images_per_article: int = 4
    featured_image_recommendation: Optional[str] = ""
    featured_image_alt: Optional[str] = ""


class SlabsRankImagesRequest(BaseModel):
    title: str = ""
    requirement: Dict[str, Any] = Field(default_factory=dict)
    candidates: List[Dict[str, Any]] = Field(default_factory=list)
    used_urls: List[str] = Field(default_factory=list)
    min_width: int = 800
    min_height: int = 450
    preferred_aspect: str = "16:9"
    use_llm_rerank: bool = True


class SlabsOptimizeImageRequest(BaseModel):
    image_base64: str
    preferred_format: str = "webp"
    max_width: int = 1440
    min_accept_width: int = 400
    crop_aspect: bool = False
    target_aspect: str = "16:9"


class SlabsAiImageFallbackRequest(BaseModel):
    prompt: str = Field(..., min_length=5, max_length=600)
    preferred_format: str = "webp"
    max_width: int = 1280
    crop_aspect: bool = True


@slabs_router.post("/plan-images")
def slabs_plan_images(
    req: SlabsPlanImagesRequest,
    _auth: bool = Depends(verify_slabs_integration_key),
):
    try:
        result = plan_image_requirements(req.model_dump())
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_sanitize_error(str(exc)))


@slabs_router.post("/rank-images")
def slabs_rank_images(
    req: SlabsRankImagesRequest,
    _auth: bool = Depends(verify_slabs_integration_key),
):
    try:
        result = rank_and_select_candidates(req.model_dump())
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_sanitize_error(str(exc)))


@slabs_router.post("/optimize-image")
def slabs_optimize_image(
    req: SlabsOptimizeImageRequest,
    _auth: bool = Depends(verify_slabs_integration_key),
):
    try:
        result = optimize_image_binary(req.model_dump())
        return result
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=_sanitize_error(str(exc)))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_sanitize_error(str(exc)))


@slabs_router.post("/generate-image-fallback")
def slabs_generate_image_fallback(
    req: SlabsAiImageFallbackRequest,
    _auth: bool = Depends(verify_slabs_integration_key),
):
    try:
        result = generate_ai_image_fallback(req.model_dump())
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_sanitize_error(str(exc)))


@slabs_router.post("/research-topics")
def slabs_research_topics(
    req: SlabsResearchRequest,
    _auth: bool = Depends(verify_slabs_integration_key),
):
    try:
        result = research_topics_for_slabs(req.model_dump())
        return {"success": True, **result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=_sanitize_error(str(exc)))

