import os
import sys
import unittest
import asyncio
import httpx

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import GeneratedArticle, ArticleAudit, ArticleRevision, WordPressSyncLog
from services.seo_engine import (
    analyze_readability,
    analyze_seo,
    run_article_audit,
    extract_sentences,
    extract_paragraphs,
    extract_sections
)
from services.wordpress_service import preview_wordpress_sync
from api.main import app

class TestSeoReadabilityEngine(unittest.TestCase):

    def test_sentence_extraction(self):
        text = "Global venture capital markets contracted in 2024. However, Southeast Asian fintech demonstrated remarkable resilience! Will seed-stage funding rebound in 2025? Economists suggest it might."
        sentences = extract_sentences(text)
        self.assertEqual(len(sentences), 4)

    def test_paragraph_extraction(self):
        text = "First paragraph content here.\n\nSecond paragraph content with more text."
        paras = extract_paragraphs(text)
        self.assertEqual(len(paras), 2)

    def test_section_extraction(self):
        text = "Introduction context.\n\n## Market Landscape\nMarket details.\n\n### Strategic Outlook\nFuture outlook."
        sections = extract_sections(text)
        self.assertEqual(len(sections), 3)

    def test_readability_analysis(self):
        text = """## Market Context
Global semiconductor supply chains faced major shifts throughout 2024. Therefore, domestic manufacturers accelerated regional nearshoring strategies.

## Investment Trends
However, institutional capital flows remained highly selective across emerging markets. Consequently, technology leaders prioritized operational cash flow over unhedged capital expansion."""
        res = analyze_readability(text, title="Semiconductor Supply Chain Strategy")
        self.assertIn("score", res)
        self.assertIn("status", res)
        self.assertIn("metrics", res)
        self.assertIn("sentence_length", res["metrics"])
        self.assertIn("transition_words", res["metrics"])
        self.assertIn("passive_voice", res["metrics"])
        self.assertIn("consecutive_sentences", res["metrics"])
        self.assertIn("subheading_distribution", res["metrics"])
        self.assertIn("flesch_reading_ease", res["metrics"])
        self.assertGreaterEqual(res["score"], 60)
        print(f"[PASSED] Readability Score: {res['score']}/100, Status: {res['status']}")

    def test_seo_analysis(self):
        title = "Renewable Energy Investments: Growth and Outlook in 2025"
        meta_desc = "Explore renewable energy investments in Southeast Asia, examining capital deployment, key growth drivers, and strategic investor returns."
        content = """Renewable energy investments have expanded rapidly across Southeast Asia as institutional capital seeks sustainable yields.

## Strategic Landscape for Renewable Energy Investments
Moreover, sovereign wealth funds have committed significant capital to green utility infrastructure projects.

## Financial Returns and Outlook
Consequently, long-term power purchase agreements guarantee predictable cash yields for utility investors."""
        keyphrase = "renewable energy investments"

        seo = analyze_seo(
            content=content,
            title=title,
            subtitle=meta_desc,
            seo_metadata={
                "focus_keyphrase": keyphrase,
                "seo_title": title,
                "meta_description": meta_desc,
                "slug": "renewable-energy-investments-growth-outlook"
            }
        )
        self.assertIn("score", seo)
        self.assertIn("status", seo)
        self.assertIn("metrics", seo)
        self.assertEqual(seo["metrics"]["keyphrase_in_title"]["status"], "good")
        self.assertEqual(seo["metrics"]["keyphrase_in_intro"]["status"], "good")
        self.assertEqual(seo["metrics"]["keyphrase_in_meta_description"]["status"], "good")
        self.assertGreaterEqual(seo["score"], 65)
        print(f"[PASSED] SEO Score: {seo['score']}/100, Status: {seo['status']}")

    def test_database_audit_flow(self):
        db = SessionLocal()
        try:
            art = db.query(GeneratedArticle).order_by(GeneratedArticle.id.desc()).first()
            if art:
                audit = run_article_audit(db, art.id)
                self.assertIsNotNone(audit)
                self.assertEqual(audit.article_id, art.id)
                self.assertTrue(audit.is_latest)

                db.refresh(art)
                self.assertIsNotNone(art.seo_score)
                self.assertIsNotNone(art.readability_score)
                self.assertIn(art.seo_status.lower(), ["good", "ok", "poor"])
                self.assertIn(art.readability_status.lower(), ["good", "ok", "poor"])
                print(f"[PASSED] Database Audit on Article #{art.id}: SEO={art.seo_score}, Readability={art.readability_score}")
        finally:
            db.close()

    def test_wordpress_sync_preview_safety(self):
        db = SessionLocal()
        try:
            art = db.query(GeneratedArticle).filter(GeneratedArticle.wordpress_post_id != None).first()
            if art:
                preview = preview_wordpress_sync(db, art.id)
                self.assertTrue(preview["is_existing_post"])
                self.assertEqual(preview["wordpress_post_id"], art.wordpress_post_id)
                self.assertIn("blog.inpartner.id", preview["wordpress_site"])
                print(f"[PASSED] WP Safe Sync Preview on Article #{art.id} (Target Post #{art.wordpress_post_id})")
        finally:
            db.close()

    def test_admin_api_endpoints_async(self):
        async def run_api_tests():
            from services.auth_service import create_session_token, SESSION_COOKIE_NAME
            auth_token = create_session_token(1, "admin")
            cookies = {SESSION_COOKIE_NAME: auth_token}

            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver", cookies=cookies) as client:
                # 1. Test SEO Overview
                res = await client.get("/api/admin/seo/overview")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertIn("total_articles", data)
                self.assertIn("total_audited", data)
                print(f"[PASSED] GET /api/admin/seo/overview: {data['total_audited']}/{data['total_articles']} audited")

                # 2. Test SEO Articles List
                res_arts = await client.get("/api/admin/seo/articles?page=1&limit=5")
                self.assertEqual(res_arts.status_code, 200)
                arts_data = res_arts.json()
                self.assertIn("articles", arts_data)
                self.assertGreater(len(arts_data["articles"]), 0)
                print(f"[PASSED] GET /api/admin/seo/articles: {len(arts_data['articles'])} articles returned")

                # 3. Test Sync Preview API Endpoint
                target_art = next((a for a in arts_data["articles"] if a.get("wordpress_post_id")), None)
                if target_art:
                    art_id = target_art["id"]
                    res_prev = await client.get(f"/api/admin/seo/sync-preview/{art_id}")
                    self.assertEqual(res_prev.status_code, 200)
                    prev_data = res_prev.json()
                    self.assertTrue(prev_data["is_update"])
                    self.assertFalse(prev_data["will_create_duplicate"])
                    self.assertEqual(prev_data["wordpress_post_id"], target_art["wordpress_post_id"])
                    print(f"[PASSED] GET /api/admin/seo/sync-preview/{art_id}: Verified safe update without duplication.")

        asyncio.run(run_api_tests())

if __name__ == "__main__":
    unittest.main()
