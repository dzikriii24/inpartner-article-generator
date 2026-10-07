from fastapi import FastAPI, Request, Depends, Form, BackgroundTasks, HTTPException, File, UploadFile
from fastapi.responses import RedirectResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import sys
import uuid
import markdown
import asyncio
import threading
from fastapi.concurrency import run_in_threadpool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Topic, Source, GeneratedArticle, NewsContent, ArticleStatus
from services.generator import generate_article_for_topic, update_article_step
from services.aggregator import run_aggregation, FETCH_PROGRESS, update_fetch_progress
from services.clustering import cluster_topics, filter_relevant_sources_for_prompt
from services.export_service import export_markdown, export_html, export_docx, export_pdf, get_formatted_references
from services.wordpress_service import test_wordpress_connection, fetch_wordpress_metadata, publish_to_wordpress
from services.quota_service import get_usage_and_model_status, record_article_generation
from services.llm_client import call_llm_json
from api.store_routes import store_router
import uvicorn


app = FastAPI(title="Inpartner Article Generator")

from fastapi import APIRouter
router = APIRouter()


# Setup templates and Jinja filters
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
uploads_dir = os.path.join(static_dir, "uploads")
os.makedirs(uploads_dir, exist_ok=True)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

templates = Jinja2Templates(directory=os.path.join(current_dir, "templates"))

def render_md(text: str):
    if not text:
        return ""
    cleaned = text.strip()
    rendered = markdown.markdown(cleaned, extensions=['extra', 'nl2br', 'tables'])
    
    # Convert citation brackets like [1] or [8, 16] into interactive anchor links
    def replace_citation(match):
        raw_nums = match.group(1)
        nums = [n.strip() for n in raw_nums.split(',')]
        links = [f'<a href="#ref-{n}" data-target="ref-{n}" class="citation-link" onclick="scrollToReference(event, \'{n}\')">[{n}]</a>' for n in nums if n.isdigit()]
        return ', '.join(links) if links else match.group(0)

    rendered = re.sub(r'\[(\d+(?:\s*,\s*\d+)*)\]', replace_citation, rendered)
    return rendered

templates.env.filters["markdown"] = render_md
templates.env.filters["formatted_references"] = get_formatted_references

import html
import re

def clean_html_text(text: str):
    if not text:
        return ""
    # Strip HTML tags
    cleaned = re.sub(r'<[^>]+>', '', str(text))
    # Unescape HTML entities (&nbsp;, &amp;, &quot;, etc.)
    cleaned = html.unescape(cleaned)
    # Collapse multiple whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned.strip()

templates.env.filters["clean_html"] = clean_html_text

def date_format(value, fmt="%B %d, %Y"):
    if not value:
        return ""
    if isinstance(value, str):
        return value
    return value.strftime(fmt)

templates.env.filters["date_format"] = date_format

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class GeneratePromptRequest(BaseModel):
    prompt: str

from typing import Optional

class ArticleSaveRequest(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = ""
    content: Optional[str] = None
    hero_image_url: Optional[str] = None
    hero_image_caption: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = None
    reading_time: Optional[int] = None
    status: Optional[str] = None
    images_metadata: Optional[list] = None
    translations: Optional[dict] = None


class TranslateRequest(BaseModel):
    target_language: str
    title: str
    subtitle: str
    content: str


class WordPressConnectRequest(BaseModel):
    wp_url: str
    username: str
    app_password: str

class WordPressPublishRequest(BaseModel):
    wp_url: str
    username: str
    app_password: str
    status: str = "draft"
    category_id: Optional[int] = None
    author_id: Optional[int] = None
    lang: Optional[str] = None


def background_generate_prompt(article_id: int, user_prompt: str):
    db = SessionLocal()
    try:
        article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
        if not article:
            return
            
        # Extract clean title from user_prompt
        clean_prompt_title = user_prompt.strip().split('\n')[0]
        if len(clean_prompt_title) > 200:
            clean_prompt_title = clean_prompt_title[:197] + "..."

        topic = Topic(
            title=clean_prompt_title,
            user_prompt=user_prompt,
            status="RESEARCHING"
        )
        db.add(topic)
        db.flush()
        
        article.topic_id = topic.id
        db.commit()
        
        generate_article_for_topic(db, topic, article)
        
    except Exception as e:
        print(f"Background generation error: {e}")
        db_fail = SessionLocal()
        art_fail = db_fail.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
        if art_fail:
            update_article_step(db_fail, art_fail, "failed", ArticleStatus.FAILED, str(e))
        db_fail.close()
    finally:
        db.close()


def background_generate_topic(article_id: int, topic_id: int):
    db = SessionLocal()
    try:
        article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
        topic = db.query(Topic).filter(Topic.id == topic_id).first()
        if not article or not topic:
            return
            
        generate_article_for_topic(db, topic, article)
    except Exception as e:
        print(f"Background topic generation error: {e}")
        db_fail = SessionLocal()
        art_fail = db_fail.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
        if art_fail:
            update_article_step(db_fail, art_fail, "failed", ArticleStatus.FAILED, str(e))
        db_fail.close()
    finally:
        db.close()


@router.get("/")
def dashboard(request: Request, db: Session = Depends(get_db)):
    topics = db.query(Topic).order_by(Topic.detected_at.desc()).limit(100).all()
    articles = db.query(GeneratedArticle).order_by(GeneratedArticle.generated_at.desc()).limit(100).all()
    
    last_7d = datetime.utcnow() - timedelta(days=7)
    recent_topics = db.query(Topic).filter(Topic.detected_at >= last_7d).order_by(Topic.score.desc(), Topic.detected_at.desc()).limit(50).all()
    
    # Fallback if no recent topics in last 7 days
    if not recent_topics:
        recent_topics = db.query(Topic).order_by(Topic.score.desc(), Topic.detected_at.desc()).limit(50).all()
        
    national_keywords = ["indonesia", "jokowi", "prabowo", "jakarta", "nasional", "rupiah", "bumn", "nusantara", "ikn", "dpr", "kpk", "polri", "mk", "mahkamah", "kpu", "gibran"]
    national_topics = []
    international_topics = []
    
    for t in recent_topics:
        is_national = False
        title_lower = t.title.lower() if t.title else ""
        cat_lower = t.category.lower() if t.category else ""
        
        if cat_lower == "nation" or cat_lower == "nasional":
            is_national = True
        else:
            for kw in national_keywords:
                if kw in title_lower or kw in cat_lower:
                    is_national = True
                    break
                    
        if is_national:
            national_topics.append(t)
        else:
            international_topics.append(t)
            
    usage = get_usage_and_model_status(db)
    
    return templates.TemplateResponse(
        name="dashboard.html",
        context={
            "request": request,
            "topics": topics,
            "articles": articles,
            "national_topics": national_topics[:10],
            "international_topics": international_topics[:10],
            "usage": usage
        }
    )

@router.get("/api/usage/status")
def get_usage_status(db: Session = Depends(get_db)):
    return get_usage_and_model_status(db)

@router.post("/api/generate/prompt")
def api_generate_from_prompt(req: GeneratePromptRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    prompt_text = req.prompt.strip()
    if not prompt_text:
        return JSONResponse({"status": "error", "message": "Prompt cannot be empty."}, status_code=400)
        
    article = GeneratedArticle(
        title=f"Generating: {prompt_text[:60]}...",
        user_prompt=prompt_text,
        content="",
        status=ArticleStatus.RESEARCHING,
        generation_step="discovering",
        generated_at=datetime.utcnow()
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    
    record_article_generation(db)
    
    # Use threading.Thread instead of FastAPI BackgroundTasks for WSGI/cPanel
    thread = threading.Thread(target=background_generate_prompt, args=(article.id, prompt_text))
    thread.daemon = True
    thread.start()
    
    return {"status": "success", "article_id": article.id}

@router.post("/api/generate/{topic_id}")
def api_generate_article(topic_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return JSONResponse({"status": "error", "message": "Topic not found"}, status_code=404)
        
    article = GeneratedArticle(
        topic_id=topic.id,
        title=topic.title,
        user_prompt=topic.user_prompt or topic.title,
        content="",
        status=ArticleStatus.RESEARCHING,
        generation_step="discovering",
        generated_at=datetime.utcnow()
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    
    record_article_generation(db)
    
    # Use threading.Thread instead of FastAPI BackgroundTasks for WSGI/cPanel
    thread = threading.Thread(target=background_generate_topic, args=(article.id, topic.id))
    thread.daemon = True
    thread.start()
    
    return {"status": "success", "article_id": article.id}

@router.get("/api/article/{article_id}/status")
def get_article_status(article_id: int, db: Session = Depends(get_db)):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    return {
        "status": article.status.value if hasattr(article.status, "value") else str(article.status),
        "generation_step": article.generation_step,
        "error_message": article.error_message,
        "article_id": article.id
    }

def background_fetch_job():
    db = SessionLocal()
    try:
        agg_count = run_aggregation(db)
        update_fetch_progress("clustering", f"Fetched {agg_count} new sources. Performing semantic topic clustering...")
        cluster_count = cluster_topics(db)
        update_fetch_progress("done", f"Complete! Fetched {agg_count} sources and created {cluster_count} new topics.", is_fetching=False)
        FETCH_PROGRESS["clustered_count"] = cluster_count
    except Exception as e:
        print(f"Background fetch error: {e}")
        update_fetch_progress("failed", str(e), is_fetching=False, error=str(e))
    finally:
        db.close()

@router.post("/api/fetch")
def api_fetch_news(background_tasks: BackgroundTasks):
    if FETCH_PROGRESS.get("is_fetching", False):
        return {"status": "in_progress", "message": "News discovery is already running."}
        
    update_fetch_progress("rss", "Starting news discovery & RSS aggregation...", is_fetching=True)
    
    thread = threading.Thread(target=background_fetch_job)
    thread.daemon = True
    thread.start()
    
    return {"status": "started"}

@router.get("/api/fetch/status")
def get_fetch_status():
    return FETCH_PROGRESS

@router.get("/topic/{topic_id}")
def view_topic(topic_id: int, request: Request, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return RedirectResponse(url="/inpartner/", status_code=303)
    return templates.TemplateResponse(name="topic.html", context={"request": request, "topic": topic})

@router.get("/article/{article_id}")
def view_article(article_id: int, request: Request, db: Session = Depends(get_db)):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return RedirectResponse(url="/inpartner/", status_code=303)
        
    related_articles = db.query(GeneratedArticle).filter(
        GeneratedArticle.id != article_id,
        GeneratedArticle.status.in_([ArticleStatus.READY, ArticleStatus.PUBLISHED, ArticleStatus.WORDPRESS_SYNCED])
    ).order_by(GeneratedArticle.generated_at.desc()).limit(3).all()
    
    return templates.TemplateResponse(
        name="article.html",
        context={
            "request": request,
            "article": article,
            "related_articles": related_articles
        }
    )

@router.post("/api/article/{article_id}/save")
def api_save_article(article_id: int, req: ArticleSaveRequest, db: Session = Depends(get_db)):
    """
    Autosave / Manual save endpoint for inline editor changes and article metadata.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    if req.title:
        article.title = req.title.strip()
    if req.subtitle is not None:
        article.subtitle = req.subtitle.strip()
    if req.content is not None:
        article.content = req.content
    if req.hero_image_url is not None:
        article.hero_image_url = req.hero_image_url
    if req.hero_image_caption is not None:
        article.hero_image_caption = req.hero_image_caption
    if req.category is not None:
        article.category = req.category.strip()
    if req.author is not None:
        article.author = req.author.strip()
    if req.reading_time is not None:
        article.reading_time = req.reading_time
    if req.images_metadata is not None:
        article.images_metadata = req.images_metadata
    if req.translations is not None:
        article.translations = req.translations
        
    if req.status is not None and req.status in ArticleStatus.__members__:
        article.status = ArticleStatus[req.status]
    elif article.status == ArticleStatus.READY:
        article.status = ArticleStatus.DRAFT
        
    db.commit()
    
    return {
        "status": "success",
        "message": "Article saved successfully.",
        "saved_at": datetime.now().strftime('%H:%M:%S'),
        "reading_time": article.reading_time,
        "category": article.category,
        "author": article.author,
        "article_status": article.status.value if hasattr(article.status, "value") else str(article.status) if article.status else "DRAFT"
    }

@router.post("/api/article/{article_id}/delete-image")
def api_delete_article_image(article_id: int, req: dict, db: Session = Depends(get_db)):
    """
    Deletes an image from article metadata and resets hero image if matching.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    img_url = req.get("url")
    if not img_url:
        return JSONResponse({"status": "error", "message": "Image URL required"}, status_code=400)
        
    if article.hero_image_url == img_url:
        article.hero_image_url = None
        article.hero_image_caption = None
        
    if article.images_metadata:
        new_meta = [m for m in article.images_metadata if isinstance(m, dict) and m.get("url") != img_url]
        article.images_metadata = new_meta
        
    db.commit()
    return {"status": "success", "message": "Image deleted successfully"}

@router.post("/api/article/{article_id}/delete")
@router.delete("/api/article/{article_id}")
def api_delete_article(article_id: int, db: Session = Depends(get_db)):
    """
    Deletes a generated article from the database.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    db.delete(article)
    db.commit()
    return {"status": "success", "message": "Article deleted successfully."}

import base64

@router.post("/api/article/{article_id}/upload-image")
async def api_upload_article_image(article_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Handles image uploads for article body or hero image by converting file to Base64 data URL
    and storing metadata directly in the database (no local disk saving).
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    contents = await file.read()
    if not contents:
        return JSONResponse({"status": "error", "message": "Uploaded file is empty"}, status_code=400)
        
    mime_type = file.content_type or "image/jpeg"
    if not mime_type or mime_type == "application/octet-stream" or not mime_type.startswith("image/"):
        ext = os.path.splitext(file.filename)[1].lower()
        if ext in ['.png']:
            mime_type = "image/png"
        elif ext in ['.gif']:
            mime_type = "image/gif"
        elif ext in ['.webp']:
            mime_type = "image/webp"
        elif ext in ['.svg']:
            mime_type = "image/svg+xml"
        else:
            mime_type = "image/jpeg"
            
    b64_encoded = base64.b64encode(contents).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64_encoded}"
    
    # Store image metadata in database
    meta = article.images_metadata or []
    meta.append({
        "url": data_url,
        "filename": file.filename,
        "mime_type": mime_type,
        "size_bytes": len(contents),
        "uploaded_at": datetime.utcnow().isoformat()
    })
    article.images_metadata = meta
    db.commit()
    
    return {"status": "success", "url": data_url}

class ArticleProxy:
    """
    Lightweight proxy for GeneratedArticle to override title, subtitle, or content
    without breaking SQLAlchemy relationship lazy loaders.
    """
    def __init__(self, article, title=None, subtitle=None, content=None):
        self._article = article
        self.override_title = title
        self.override_subtitle = subtitle
        self.override_content = content

    @property
    def title(self):
        return self.override_title if self.override_title is not None else self._article.title

    @property
    def subtitle(self):
        return self.override_subtitle if self.override_subtitle is not None else self._article.subtitle

    @property
    def content(self):
        return self.override_content if self.override_content is not None else self._article.content

    def __getattr__(self, item):
        return getattr(self._article, item)

@router.get("/api/article/{article_id}/export/{format}")
def export_article_file(article_id: int, format: str, lang: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Exports article in PDF, DOCX, HTML, or Markdown with language version selection support.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    export_article = article
    if lang and lang.lower() != "original" and article.translations:
        t_data = None
        if isinstance(article.translations, dict):
            if lang in article.translations:
                t_data = article.translations[lang]
            else:
                for k, v in article.translations.items():
                    if k.lower() == lang.lower() or (isinstance(v, dict) and v.get("language_name", "").lower() == lang.lower()):
                        t_data = v
                        break
                if not t_data and list(article.translations.keys()):
                    first_key = list(article.translations.keys())[0]
                    t_data = article.translations[first_key]
                    
        if t_data and isinstance(t_data, dict):
            export_article = ArticleProxy(
                article,
                title=t_data.get("title") or article.title,
                subtitle=t_data.get("subtitle") or article.subtitle,
                content=t_data.get("content") or article.content
            )
            
    safe_title = "".join(c for c in export_article.title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')[:40] or "article"
    
    fmt = format.lower()
    if fmt == "markdown" or fmt == "md":
        md_text = export_markdown(export_article)
        return Response(
            content=md_text,
            media_type="text/markdown",
            headers={"Content-Disposition": f'inline; filename="{safe_title}.md"'}
        )
    elif fmt == "html":
        html_text = export_html(export_article)
        return Response(
            content=html_text,
            media_type="text/html",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.html"'}
        )
    elif fmt == "docx":
        doc_buf = export_docx(export_article)
        return StreamingResponse(
            doc_buf,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.docx"'}
        )
    elif fmt == "pdf":
        print(f"[DEBUG EXPORT PDF] Article ID: {export_article.id}, Title: {export_article.title}")
        print(f"[DEBUG EXPORT PDF] Hero URL: {export_article.hero_image_url}")
        print(f"[DEBUG EXPORT PDF] Content len: {len(export_article.content or '')}")
        pdf_buf = export_pdf(export_article)
        pdf_data = pdf_buf.getvalue()
        print(f"[DEBUG EXPORT PDF] PDF generated bytes: {len(pdf_data)}")
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{safe_title}.pdf"'}
        )
    else:
        return JSONResponse({"status": "error", "message": f"Unsupported export format '{format}'"}, status_code=400)

@router.post("/api/wordpress/connect")
def api_wordpress_connect(req: WordPressConnectRequest):
    """
    Validates WordPress REST API credentials and returns metadata (categories, authors).
    """
    auth_res = test_wordpress_connection(req.wp_url, req.username, req.app_password)
    if not auth_res.get("success"):
        return JSONResponse({"status": "error", "message": auth_res.get("error", "Connection failed")}, status_code=400)
        
    meta = fetch_wordpress_metadata(req.wp_url, req.username, req.app_password)
    return {
        "status": "success",
        "user_name": auth_res.get("name"),
        "categories": meta.get("categories", []),
        "authors": meta.get("authors", [])
    }

@router.post("/api/article/{article_id}/publish-wordpress")
def api_publish_wordpress(article_id: int, req: WordPressPublishRequest, db: Session = Depends(get_db)):
    """
    Publishes or updates the article on WordPress via REST API with language support.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    pub_article = article
    if req.lang and req.lang.lower() != "original" and article.translations:
        t_data = None
        if isinstance(article.translations, dict):
            if req.lang in article.translations:
                t_data = article.translations[req.lang]
            else:
                for k, v in article.translations.items():
                    if k.lower() == req.lang.lower() or (isinstance(v, dict) and v.get("language_name", "").lower() == req.lang.lower()):
                        t_data = v
                        break
                if not t_data and list(article.translations.keys()):
                    first_key = list(article.translations.keys())[0]
                    t_data = article.translations[first_key]
                    
        if t_data and isinstance(t_data, dict):
            pub_article = ArticleProxy(
                article,
                title=t_data.get("title") or article.title,
                subtitle=t_data.get("subtitle") or article.subtitle,
                content=t_data.get("content") or article.content
            )
            
    res = publish_to_wordpress(
        db=db,
        article=pub_article,
        wp_url=req.wp_url,
        username=req.username,
        app_password=req.app_password,
        status=req.status,
        category_id=req.category_id,
        author_id=req.author_id
    )
    
    if res.get("success"):
        return {
            "status": "success",
            "message": res.get("message"),
            "post_id": res.get("post_id"),
            "post_link": res.get("post_link"),
            "wordpress_status": res.get("wordpress_status")
        }
    else:
        return JSONResponse({"status": "error", "message": res.get("error", "Failed to sync to WordPress.")}, status_code=400)

@router.post("/api/article/{article_id}/translate")
def api_translate_article(article_id: int, req: TranslateRequest, db: Session = Depends(get_db)):
    prompt = f"""
    You are an expert professional translator and journalist.
    Translate the following article HTML content, title, and subtitle into {req.target_language}.
    Maintain the EXACT HTML structure, tags, and formatting in the content. 
    Do not change or remove any HTML tags, classes, or attributes. Only translate the text inside them.
    
    Output strictly a valid JSON object with exactly these keys: "translated_title", "translated_subtitle", "translated_content".
    
    Original Title:
    {req.title}
    
    Original Subtitle:
    {req.subtitle}
    
    Original HTML Content:
    {req.content}
    """
    
    parsed, _ = call_llm_json(prompt, role="EDITORIAL")
    
    if parsed and isinstance(parsed, dict) and "translated_content" in parsed:
        return {
            "status": "success",
            "translated_title": parsed.get("translated_title", req.title),
            "translated_subtitle": parsed.get("translated_subtitle", req.subtitle),
            "translated_content": parsed.get("translated_content", req.content)
        }
    else:
        return JSONResponse({"status": "error", "message": "Failed to translate article."}, status_code=500)

@router.post("/article/{article_id}/edit")
def edit_article(article_id: int, request: Request, title: str = Form(...), content: str = Form(...), db: Session = Depends(get_db)):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if article:
        article.title = title
        article.content = content
        db.commit()
    return RedirectResponse(url=f"/inpartner/article/{article_id}", status_code=303)

async def auto_fetch_loop():
    # Wait a few seconds on startup before starting the first fetch
    await asyncio.sleep(10)
    while True:
        try:
            if not FETCH_PROGRESS.get("is_fetching", False):
                print("Starting automatic scheduled fetch...")
                update_fetch_progress("rss", "Auto-fetching news & discovering themes...", is_fetching=True)
                await run_in_threadpool(background_fetch_job)
        except Exception as e:
            print(f"Auto-fetch loop error: {e}")
            
        # Run automatically every 1 hour (3600 seconds)
        await asyncio.sleep(3600)

from sqlalchemy import text

def ensure_schema_updates():
    try:
        db = SessionLocal()
        db.execute(text("ALTER TABLE generated_articles ADD COLUMN translations JSON NULL"))
        db.commit()
        db.close()
    except Exception as e:
        pass

@app.on_event("startup")
async def schedule_auto_fetch():
    await run_in_threadpool(ensure_schema_updates)
    asyncio.create_task(auto_fetch_loop())

app.include_router(router)
app.include_router(router, prefix="/inpartner")

# Inpartner Store integration (pull API + push-to-store actions)
app.include_router(store_router)
app.include_router(store_router, prefix="/inpartner")

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=False)


