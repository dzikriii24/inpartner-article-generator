import requests
import json
import os
import markdown as md_lib
from datetime import datetime
from sqlalchemy.orm import Session
from models import GeneratedArticle, ArticleStatus

def clean_wp_url(url: str) -> str:
    """Ensure URL has protocol and no trailing slash."""
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    return url.rstrip("/")


def test_wordpress_connection(wp_url: str, username: str, app_password: str) -> dict:
    """
    Test WordPress REST API connection and basic credentials.
    """
    clean_url = clean_wp_url(wp_url)
    api_endpoint = f"{clean_url}/wp-json/wp/v2/users/me"
    
    try:
        resp = requests.get(
            api_endpoint,
            auth=(username, app_password.replace(" ", "")),
            headers={"User-Agent": "InpartnerArticleGenerator/1.0"},
            timeout=10
        )
        if resp.status_code == 200:
            user_data = resp.json()
            return {
                "success": True,
                "message": f"Successfully connected as {user_data.get('name', username)}",
                "user_id": user_data.get("id"),
                "name": user_data.get("name")
            }
        else:
            return {
                "success": False,
                "error": f"WordPress auth failed (HTTP {resp.status_code}): {resp.text[:200]}"
            }
    except Exception as e:
        return {"success": False, "error": f"Connection error: {str(e)}"}


def fetch_wordpress_metadata(wp_url: str, username: str, app_password: str) -> dict:
    """
    Fetches categories and authors list from WordPress REST API.
    """
    clean_url = clean_wp_url(wp_url)
    auth = (username, app_password.replace(" ", ""))
    headers = {"User-Agent": "InpartnerArticleGenerator/1.0"}
    
    categories = []
    authors = []
    
    try:
        cat_resp = requests.get(f"{clean_url}/wp-json/wp/v2/categories?per_page=100", auth=auth, headers=headers, timeout=10)
        if cat_resp.status_code == 200:
            categories = [{"id": c["id"], "name": c["name"]} for c in cat_resp.json()]
    except Exception as e:
        print(f"[WP Service] Fetch categories error: {e}")
        
    try:
        user_resp = requests.get(f"{clean_url}/wp-json/wp/v2/users?per_page=50", auth=auth, headers=headers, timeout=10)
        if user_resp.status_code == 200:
            authors = [{"id": u["id"], "name": u["name"]} for u in user_resp.json()]
    except Exception as e:
        print(f"[WP Service] Fetch users error: {e}")
        
    return {
        "categories": categories,
        "authors": authors
    }


def upload_featured_image(clean_url: str, auth: tuple, image_url: str, title: str) -> int:
    """
    Uploads featured image from external URL to WordPress Media Library and returns media ID.
    """
    try:
        # Download image content
        img_resp = requests.get(image_url, timeout=15)
        if img_resp.status_code != 200:
            return None
            
        content_type = img_resp.headers.get("content-type", "image/jpeg")
        ext = "jpg"
        if "png" in content_type:
            ext = "png"
        elif "webp" in content_type:
            ext = "webp"
            
        filename = f"featured_hero_{int(datetime.utcnow().timestamp())}.{ext}"
        
        media_endpoint = f"{clean_url}/wp-json/wp/v2/media"
        wp_headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": content_type,
            "User-Agent": "InpartnerArticleGenerator/1.0"
        }
        
        up_resp = requests.post(media_endpoint, auth=auth, headers=wp_headers, data=img_resp.content, timeout=20)
        if up_resp.status_code in [200, 201]:
            media_data = up_resp.json()
            return media_data.get("id")
    except Exception as e:
        print(f"[WP Service] Featured image upload failed: {e}")
        
    return None


def publish_to_wordpress(
    db: Session,
    article: GeneratedArticle,
    wp_url: str,
    username: str,
    app_password: str,
    status: str = "draft",
    category_id: int = None,
    author_id: int = None
) -> dict:
    """
    Publishes or updates an article on WordPress via REST API.
    """
    clean_url = clean_wp_url(wp_url)
    auth = (username, app_password.replace(" ", ""))
    headers = {"Content-Type": "application/json", "User-Agent": "InpartnerArticleGenerator/1.0"}
    
    # Upload featured image if hero image is present
    featured_media_id = None
    if article.hero_image_url:
        featured_media_id = upload_featured_image(clean_url, auth, article.hero_image_url, article.title)
        
    # Render body HTML cleanly
    html_content = md_lib.markdown(article.content or "", extensions=['extra', 'nl2br', 'tables'])
    
    # Append references block to content
    if article.sources:
        html_content += "<hr><h3>References & Sources</h3><ul>"
        for s in article.sources:
            html_content += f"<li><strong>{s.publisher or 'Source'}:</strong> <a href='{s.url}' target='_blank'>{s.title}</a></li>"
        html_content += "</ul>"
        
    post_payload = {
        "title": article.title,
        "content": html_content,
        "excerpt": article.subtitle or "",
        "status": status if status in ["publish", "draft"] else "draft"
    }
    
    if category_id:
        post_payload["categories"] = [int(category_id)]
    if author_id:
        post_payload["author"] = int(author_id)
    if featured_media_id:
        post_payload["featured_media"] = featured_media_id

    # Check if article already has a wordpress_post_id -> UPDATE post
    if article.wordpress_post_id:
        endpoint = f"{clean_url}/wp-json/wp/v2/posts/{article.wordpress_post_id}"
        print(f"[WP Service] Updating existing WordPress Post ID: {article.wordpress_post_id}")
    else:
        endpoint = f"{clean_url}/wp-json/wp/v2/posts"
        print(f"[WP Service] Creating new WordPress Post on: {clean_url}")

    try:
        resp = requests.post(endpoint, auth=auth, headers=headers, json=post_payload, timeout=25)
        if resp.status_code in [200, 201]:
            data = resp.json()
            post_id = data.get("id")
            post_link = data.get("link", "")
            
            # Update article DB model
            article.wordpress_post_id = post_id
            article.wordpress_site = clean_url
            article.wordpress_status = status.capitalize()
            article.last_synced_at = datetime.utcnow()
            article.sync_status = "Synced"
            article.status = ArticleStatus.WORDPRESS_SYNCED
            db.commit()
            
            return {
                "success": True,
                "post_id": post_id,
                "post_link": post_link,
                "wordpress_status": status.capitalize(),
                "message": f"Successfully synced to WordPress (Post #{post_id})"
            }
        else:
            err_msg = f"WP API Error (HTTP {resp.status_code}): {resp.text[:300]}"
            article.sync_status = "Sync Failed"
            db.commit()
            return {"success": False, "error": err_msg}
    except Exception as e:
        article.sync_status = f"Sync Error: {str(e)[:50]}"
        db.commit()
        return {"success": False, "error": f"WordPress request error: {str(e)}"}
