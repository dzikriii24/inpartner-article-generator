from fastapi import FastAPI, Request, Depends, Form, BackgroundTasks, HTTPException, File, UploadFile
from fastapi.responses import RedirectResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import os
import sys
import uuid
import markdown

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Topic, Source, GeneratedArticle, NewsContent, ArticleStatus
from services.generator import generate_article_for_topic, update_article_step
from services.aggregator import run_aggregation, FETCH_PROGRESS, update_fetch_progress
from services.clustering import cluster_topics, filter_relevant_sources_for_prompt
from services.export_service import export_markdown, export_html, export_docx, export_pdf
from services.wordpress_service import test_wordpress_connection, fetch_wordpress_metadata, publish_to_wordpress
from services.quota_service import get_usage_and_model_status, record_article_generation
import uvicorn


app = FastAPI(title="Inpartner Article Generator")

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
    return markdown.markdown(cleaned, extensions=['extra', 'nl2br', 'tables'])

templates.env.filters["markdown"] = render_md

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


class WordPressConnectRequest(BaseModel):
    wp_url: str
    username: str
    app_password: str

class WordPressPublishRequest(BaseModel):
    wp_url: str
    username: str
    app_password: str
    status: str = "draft"
    category_id: int = None
    author_id: int = None


def background_generate_prompt(article_id: int, user_prompt: str):
    db = SessionLocal()
    try:
        article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
        if not article:
            return
            
        topic = Topic(
            title=user_prompt,
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


@app.get("/")
def dashboard(request: Request, db: Session = Depends(get_db)):
    topics = db.query(Topic).order_by(Topic.detected_at.desc()).limit(15).all()
    articles = db.query(GeneratedArticle).order_by(GeneratedArticle.generated_at.desc()).limit(15).all()
    usage = get_usage_and_model_status(db)
    
    return templates.TemplateResponse(
        request=request,
        name="dashboard.html",
        context={
            "topics": topics,
            "articles": articles,
            "usage": usage
        }
    )

@app.get("/api/usage/status")
def get_usage_status(db: Session = Depends(get_db)):
    return get_usage_and_model_status(db)

@app.post("/api/generate/prompt")
def api_generate_from_prompt(req: GeneratePromptRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    prompt_text = req.prompt.strip()
    if not prompt_text:
        return JSONResponse({"status": "error", "message": "Prompt cannot be empty."}, status_code=400)
        
    usage = get_usage_and_model_status(db)
    if not usage["can_generate"]:
        return JSONResponse({
            "status": "error", 
            "message": f"Daily limit reached ({usage['generated_today']}/{usage['daily_limit']}). You have 0 article generations remaining today."
        }, status_code=400)
        
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
    background_tasks.add_task(background_generate_prompt, article.id, prompt_text)
    return {"status": "success", "article_id": article.id}

@app.post("/api/generate/{topic_id}")
def api_generate_article(topic_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return JSONResponse({"status": "error", "message": "Topic not found"}, status_code=404)
        
    usage = get_usage_and_model_status(db)
    if not usage["can_generate"]:
        return JSONResponse({
            "status": "error", 
            "message": f"Daily limit reached ({usage['generated_today']}/{usage['daily_limit']}). You have 0 article generations remaining today."
        }, status_code=400)
        
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
    background_tasks.add_task(background_generate_topic, article.id, topic.id)
    return {"status": "success", "article_id": article.id}

@app.get("/api/article/{article_id}/status")
def get_article_status(article_id: int, db: Session = Depends(get_db)):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    return {
        "status": article.status.value,
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

@app.post("/api/fetch")
def api_fetch_news(background_tasks: BackgroundTasks):
    if FETCH_PROGRESS.get("is_fetching", False):
        return {"status": "in_progress", "message": "News discovery is already running."}
        
    update_fetch_progress("rss", "Starting news discovery & RSS aggregation...", is_fetching=True)
    background_tasks.add_task(background_fetch_job)
    return {"status": "started"}

@app.get("/api/fetch/status")
def get_fetch_status():
    return FETCH_PROGRESS

@app.get("/topic/{topic_id}")
def view_topic(topic_id: int, request: Request, db: Session = Depends(get_db)):
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return RedirectResponse(url="/", status_code=303)
    return templates.TemplateResponse(request=request, name="topic.html", context={"topic": topic})

@app.get("/article/{article_id}")
def view_article(article_id: int, request: Request, db: Session = Depends(get_db)):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return RedirectResponse(url="/", status_code=303)
        
    related_articles = db.query(GeneratedArticle).filter(
        GeneratedArticle.id != article_id,
        GeneratedArticle.status.in_([ArticleStatus.READY, ArticleStatus.PUBLISHED, ArticleStatus.WORDPRESS_SYNCED])
    ).order_by(GeneratedArticle.generated_at.desc()).limit(3).all()
    
    return templates.TemplateResponse(
        request=request,
        name="article.html",
        context={
            "article": article,
            "related_articles": related_articles
        }
    )

@app.post("/api/article/{article_id}/save")
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
        "article_status": article.status.value if article.status else "DRAFT"
    }

@app.post("/api/article/{article_id}/delete-image")
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

import base64

@app.post("/api/article/{article_id}/upload-image")
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

@app.get("/api/article/{article_id}/export/{format}")
def export_article_file(article_id: int, format: str, db: Session = Depends(get_db)):
    """
    Exports article in PDF, DOCX, HTML, or Markdown.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    safe_title = "".join(c for c in article.title if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')[:40] or "article"
    
    fmt = format.lower()
    if fmt == "markdown" or fmt == "md":
        md_text = export_markdown(article)
        return Response(
            content=md_text,
            media_type="text/markdown",
            headers={"Content-Disposition": f'inline; filename="{safe_title}.md"'}
        )
    elif fmt == "html":
        html_text = export_html(article)
        return Response(
            content=html_text,
            media_type="text/html",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.html"'}
        )
    elif fmt == "docx":
        doc_buf = export_docx(article)
        return StreamingResponse(
            doc_buf,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}.docx"'}
        )
    elif fmt == "pdf":
        print(f"[DEBUG EXPORT PDF] Article ID: {article.id}, Title: {article.title}")
        print(f"[DEBUG EXPORT PDF] Hero URL: {article.hero_image_url}")
        print(f"[DEBUG EXPORT PDF] Content len: {len(article.content or '')}")
        pdf_buf = export_pdf(article)
        pdf_data = pdf_buf.getvalue()
        print(f"[DEBUG EXPORT PDF] PDF generated bytes: {len(pdf_data)}")
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'inline; filename="{safe_title}.pdf"'}
        )
    else:
        return JSONResponse({"status": "error", "message": f"Unsupported export format '{format}'"}, status_code=400)

@app.post("/api/wordpress/connect")
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

@app.post("/api/article/{article_id}/publish-wordpress")
def api_publish_wordpress(article_id: int, req: WordPressPublishRequest, db: Session = Depends(get_db)):
    """
    Publishes or updates the article on WordPress via REST API.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return JSONResponse({"status": "error", "message": "Article not found"}, status_code=404)
        
    res = publish_to_wordpress(
        db=db,
        article=article,
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

@app.post("/article/{article_id}/edit")
def edit_article(article_id: int, request: Request, title: str = Form(...), content: str = Form(...), db: Session = Depends(get_db)):
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if article:
        article.title = title
        article.content = content
        db.commit()
    return RedirectResponse(url=f"/article/{article_id}", status_code=303)

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="127.0.0.1", port=8000, reload=True)

