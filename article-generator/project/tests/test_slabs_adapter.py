import asyncio
import os
import sys
import unittest
from unittest.mock import patch

import httpx

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

os.environ["ENABLE_SCHEDULER"] = "false"
os.environ["SLABS_INTEGRATION_KEY"] = "unit-test-key-999"

from api.main import app  # noqa: E402
import base64
import io

from PIL import Image
from services.slabs_pipeline import generate_slabs_article, research_topics_for_slabs  # noqa: E402
from services.slabs_image_service import (  # noqa: E402
    optimize_image_binary,
    plan_image_requirements,
    rank_and_select_candidates,
)


SAMPLE_KB = {
    "entries": [
        {
            "category_number": 4,
            "category_label": "Free Hosting Program",
            "title": "Program Free Plan 1sLabs",
            "verification_status": "verified",
            "summary": "1 kali klaim per akun berupa subdomain *.1slabs.my.id dan hosting Node.js.",
            "facts": [
                {"label": "Kelayakan", "value": "1 klaim per akun seumur hidup", "status": "verified"}
            ],
        }
    ],
    "verified_paths": ["/portal?tab=freeplan", "/hosting", "/docs"],
    "forbidden_claims": [
        {
            "id": "fake_scale",
            "label": "Angka 200+ klien fiktif",
            "regexes": [r"200\+\s*(active\s*)?(clients?|klien)"],
            "reason": "Klaim dilarang",
        }
    ],
}


class TestSlabsEngineAdapter(unittest.TestCase):
    def test_auth_and_health(self):
        async def run():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                no_auth = await client.get("/api/v1/1slabs/health")
                self.assertEqual(no_auth.status_code, 401)
                bad_auth = await client.get(
                    "/api/v1/1slabs/health", headers={"X-Integration-Key": "invalid"}
                )
                self.assertEqual(bad_auth.status_code, 401)
                ok = await client.get(
                    "/api/v1/1slabs/health", headers={"X-Integration-Key": "unit-test-key-999"}
                )
                self.assertEqual(ok.status_code, 200)
                self.assertTrue(ok.json()["success"])

        asyncio.run(run())

    def test_pipeline_normalizes_h1_strips_slop_and_adds_links_and_cta(self):
        fake_brief = {
            "recommended_title": "Cara Mendapatkan Hosting Gratis untuk Website Pemula",
            "slug": "cara-mendapatkan-hosting-gratis-website-pemula",
            "focus_keyphrase": "hosting gratis",
            "secondary_keyphrases": ["subdomain gratis", "deploy website"],
            "meta_title": "Cara Mendapatkan Hosting Gratis untuk Website Pemula | 1sLabs",
            "meta_description": "Pelajari cara mendapatkan hosting gratis dan subdomain .1slabs.my.id untuk deploy website dan API Node.js tanpa biaya awal.",
            "excerpt": "Panduan praktis memulai website dengan program Free Plan 1sLabs.",
            "direct_answer_summary": "Anda bisa mendapatkan hosting gratis di 1sLabs melalui Free Plan.",
            "faq_candidates": [
                {"question": "Apakah Free Plan gratis?", "answer": "Ya, untuk belajar."}
            ],
        }

        dirty_html = """<h1>Cara Hosting</h1>
        <p>Menggunakan hosting gratis — langkah awal developer pemula.</p>
        <h2>Persiapan Akun</h2>
        <p>Buat akun di portal resmi.</p>"""

        clean_html = """<h2>Langkah Persiapan Akun</h2>
        <p>Menggunakan hosting gratis adalah langkah awal praktis untuk mencoba deploy proyek web.</p>
        <h2>Cara Klaim Subdomain</h2>
        <p>Masuk ke halaman <a href="/portal?tab=freeplan">Free Plan 1sLabs</a> dan ikuti panduan di <a href="/docs">dokumentasi</a>.</p>"""

        dirty_with_forbidden = dirty_html + "<p>Kami dipercaya 200+ klien di Indonesia.</p>"
        with (
            patch("services.slabs_pipeline.call_llm_json", return_value=(fake_brief, "gemini-3.5-flash-lite")),
            patch(
                "services.slabs_pipeline.call_llm",
                side_effect=[(dirty_with_forbidden, "gemini-3.5-flash"), (clean_html, "gemini-3.5-flash")],
            ),
        ):
            res = generate_slabs_article(
                {
                    "topic": "Cara Mendapatkan Hosting Gratis untuk Website",
                    "target_keyword": "hosting gratis",
                    "pillar": {
                        "name": "Free Hosting & Free Domain",
                        "primary_cta_path": "/portal?tab=freeplan",
                        "primary_cta_label": "Klaim Free Plan Sekarang",
                    },
                    "knowledge_base": SAMPLE_KB,
                    "existing_articles": [],
                }
            )
        self.assertNotIn("<h1", res["content"].lower())
        self.assertNotIn("200+ klien", res["content"].lower())
        self.assertIn("/portal?tab=freeplan", res["content"])
        self.assertIn("text-align: justify;", res["content"])
        self.assertEqual(res["model_used"], "gemini-3.5-flash")
        self.assertTrue(bool(res.get("target_audience")))
        self.assertTrue(bool(res.get("featured_image_alt")))
        self.assertEqual(len(res["faq_items"]), 1)
        self.assertTrue(len(res["generation_trace"]) >= 4)

    def test_research_topics_accepts_model_used_tuple(self):
        fake_topics = {
            "topics": [
                {
                    "pillar_code": "free-hosting-domain",
                    "title": "Panduan Deploy Website Portofolio dengan Subdomain Gratis 1sLabs",
                    "target_keyword": "subdomain gratis 1slabs",
                    "secondary_keywords": ["free hosting"],
                    "search_intent": "transactional",
                    "funnel_stage": "decision",
                    "target_audience": "Mahasiswa & Junior Developer",
                    "service_target": "/portal?tab=freeplan",
                    "opportunity_score": 90,
                    "rationale": "Kesenjangan topik tinggi",
                }
            ]
        }
        with patch("services.slabs_pipeline.call_llm_json", return_value=(fake_topics, "gemini-3.5-flash-lite")):
            res = research_topics_for_slabs(
                {
                    "pillar_codes": ["free-hosting-domain"],
                    "count": 3,
                    "pillars": [
                        {
                            "code": "free-hosting-domain",
                            "name": "Free Hosting & Free Domain",
                            "description": "Free hosting",
                            "default_intent": "transactional",
                            "primary_cta_path": "/portal?tab=freeplan",
                        }
                    ],
                    "knowledge_base": SAMPLE_KB,
                    "existing_titles": [],
                    "existing_queue_titles": [],
                }
            )
        self.assertEqual(res["count"], 1)
        self.assertEqual(res["model_used"], "gemini-3.5-flash-lite")

    def test_plan_images_and_dedupe_queries(self):
        html = """
        <h2>Mengapa UMKM Butuh Website Profesional</h2>
        <p>Banyak bisnis kecil hanya mengandalkan media sosial padahal website memberi kredibilitas tinggi.</p>
        <h2>Menentukan Desain Responsif Mobile</h2>
        <p>Pastikan tampilan tetap rapi di smartphone dan komputer.</p>
        <h2>Integrasi Hosting Aman dan Domain Resmi</h2>
        <p>Gunakan HTTPS SSL serta infrastruktur cloud yang handal.</p>
        <h2>Kesimpulan</h2>
        <p>Mulai sekarang bersama 1sLabs.</p>
        """
        fake_plan = {
            "visual_theme": "Transformasi digital UMKM Indonesia",
            "featured": {
                "search_query": "small business owner working on website laptop office",
                "secondary_query": "modern company profile website design desk",
                "alt_text": "Pemilik usaha UMKM mengelola website perusahaan di laptop modern",
                "caption": "Ilustrasi pemilik bisnis memantau website profesional.",
                "ai_prompt": "Editorial photo of small business owner working on website laptop, no text, no watermark",
            },
            "inline": [
                {
                    "section_index": 0,
                    "section_heading": "Mengapa UMKM Butuh Website Profesional",
                    "search_query": "small business owner working on website laptop office",
                    "alt_text": "Pengusaha UMKM bekerja membangun kredibilitas digital",
                    "caption": "Kehadiran digital profesional mendukung kepercayaan pelanggan.",
                }
            ],
        }
        with patch("services.slabs_image_service.call_llm_json", return_value=(fake_plan, "gemini-3.5-flash-lite")):
            plan = plan_image_requirements({
                "title": "Panduan Membuat Website Profesional untuk UMKM",
                "target_keyword": "website profesional umkm",
                "content": html,
                "max_images_per_article": 3,
                "pillar": {"name": "Website Development"},
            })
        self.assertEqual(plan["featured"]["search_query"], "small business owner")
        self.assertLessEqual(len(plan["featured"]["search_query"].split()), 3)
        self.assertTrue(len(plan["inline"]) >= 1)
        self.assertNotEqual(
            plan["featured"]["search_query"].lower(),
            plan["inline"][0]["search_query"].lower(),
        )

    def test_rank_rejects_watermarks_and_duplicates(self):
        candidates = [
            {
                "provider": "openverse",
                "provider_image_id": "bad1",
                "original_url": "https://cdn.example.com/shutterstock-preview.jpg",
                "title": "Shutterstock watermark preview laptop",
                "width": 1600,
                "height": 900,
            },
            {
                "provider": "unsplash",
                "provider_image_id": "used1",
                "original_url": "https://images.unsplash.com/photo-already-used",
                "title": "Software developer laptop code",
                "width": 1920,
                "height": 1080,
            },
            {
                "provider": "pexels",
                "provider_image_id": "good1",
                "original_url": "https://images.pexels.com/photos/1234/pexels-photo.jpeg",
                "title": "Web developer coding modern office laptop",
                "width": 1600,
                "height": 900,
            },
        ]
        res = rank_and_select_candidates({
            "title": "Panduan Website",
            "requirement": {"role": "featured", "search_query": "developer coding modern office laptop"},
            "candidates": candidates,
            "used_urls": ["https://images.unsplash.com/photo-already-used"],
            "use_llm_rerank": False,
        })
        self.assertIsNotNone(res["selected"])
        self.assertEqual(res["selected"]["provider_image_id"], "good1")

    def test_optimize_image_binary_webp_and_api_endpoint(self):
        img = Image.new("RGB", (2000, 1125), color=(37, 99, 235))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        out = optimize_image_binary({
            "image_base64": b64,
            "preferred_format": "webp",
            "max_width": 1200,
            "crop_aspect": True,
        })
        self.assertTrue(out["success"])
        self.assertEqual(out["format"], "webp")
        self.assertEqual(out["width"], 1200)

        async def call_api():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
                r = await client.post(
                    "/api/v1/1slabs/optimize-image",
                    headers={"X-Integration-Key": "unit-test-key-999"},
                    json={"image_base64": b64, "preferred_format": "webp", "max_width": 1000},
                )
                self.assertEqual(r.status_code, 200)
                self.assertEqual(r.json()["width"], 1000)

        asyncio.run(call_api())


if __name__ == "__main__":
    unittest.main()
