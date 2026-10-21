import requests
import json
import os
import re
import markdown as md_lib
from bs4 import BeautifulSoup
from datetime import datetime
from sqlalchemy.orm import Session
from models import GeneratedArticle, ArticleStatus, WordPressSyncLog, AutomationSetting

WP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 InpartnerArticleGenerator/1.0"

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
            headers={"User-Agent": WP_USER_AGENT},
            timeout=35
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
    headers = {"User-Agent": WP_USER_AGENT}
    
    categories = []
    authors = []
    
    try:
        cat_resp = requests.get(f"{clean_url}/wp-json/wp/v2/categories?per_page=100", auth=auth, headers=headers, timeout=35)
        if cat_resp.status_code == 200:
            categories = [{"id": c["id"], "name": c["name"]} for c in cat_resp.json()]
    except Exception as e:
        print(f"[WP Service] Fetch categories error: {e}")
        
    # First, always get the authenticated user from /users/me
    try:
        me_resp = requests.get(f"{clean_url}/wp-json/wp/v2/users/me", auth=auth, headers=headers, timeout=35)
        if me_resp.status_code == 200:
            me_data = me_resp.json()
            authors.append({"id": me_data.get("id"), "name": me_data.get("name", username)})
    except Exception as e:
        print(f"[WP Service] Fetch /users/me error: {e}")
        
    # Then attempt to fetch other users / authors if allowed
    try:
        user_resp = requests.get(f"{clean_url}/wp-json/wp/v2/users?per_page=50&who=authors", auth=auth, headers=headers, timeout=35)
        if user_resp.status_code != 200:
            user_resp = requests.get(f"{clean_url}/wp-json/wp/v2/users?per_page=50", auth=auth, headers=headers, timeout=35)
            
        if user_resp.status_code == 200:
            for u in user_resp.json():
                if not any(a["id"] == u["id"] for a in authors):
                    authors.append({"id": u["id"], "name": u["name"]})
    except Exception as e:
        print(f"[WP Service] Fetch users error: {e}")
        
    # Fallback: if authors is still empty, add default with username
    if not authors:
        authors.append({"id": 1, "name": username})
        
    return {
        "categories": categories,
        "authors": authors
    }


def upload_featured_image(clean_url: str, auth: tuple, image_url: str, title: str) -> int:
    """
    Uploads featured image from external URL to WordPress Media Library and returns media ID.
    """
    try:
        img_resp = requests.get(image_url, headers={"User-Agent": WP_USER_AGENT}, timeout=15)
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
            "User-Agent": WP_USER_AGENT
        }
        
        up_resp = requests.post(media_endpoint, auth=auth, headers=wp_headers, data=img_resp.content, timeout=20)
        if up_resp.status_code in [200, 201]:
            media_data = up_resp.json()
            return media_data.get("id")
    except Exception as e:
        print(f"[WP Service] Featured image upload failed: {e}")
        
    return None


def format_content_for_wordpress(
    content: str, 
    subtitle: str = None, 
    sources: list = None, 
    hero_caption: str = None,
    title: str = None,
    category: str = None,
    author: str = None,
    reading_time: int = None,
    generated_at = None,
    hero_image_url: str = None,
    include_hero_in_body: bool = True
) -> str:
    """
    Transforms article content into rich, WordPress Gutenberg-compatible HTML
    with full Inpartner editorial header (category kicker, title, deck, meta bar, hero figure),
    self-contained typography, callout boxes, and Gutenberg block structure.
    """
    if not content:
        return ""
        
    # If the content is markdown (not HTML), convert to HTML first
    is_html = bool(re.search(r'<(?:p|h\d|div|figure|blockquote|ul|ol|table)', content, re.IGNORECASE))
    if not is_html:
        raw_html = md_lib.markdown(content, extensions=['extra', 'tables'])
    else:
        raw_html = content

    soup = BeautifulSoup(raw_html, "html.parser")

    # 1. Strip editor-only artifacts & attributes
    for el in soup.find_all(True):
        for attr in ['contenteditable', 'spellcheck', 'data-gramm', 'tabindex', 'data-gramm_editor']:
            if attr in el.attrs:
                del el[attr]

    for el in soup.find_all(class_=['block-handle-bar', 'img-toolbar-overlay', 'img-tb-btn', 'block-btn', 'callout-actions-bar', 'callout-act-btn', 'block-quick-inserter']):
        el.decompose()

    # 2. Transform Callout Boxes (.callout-box)
    for box in soup.find_all(class_='callout-box'):
        # Replace fontawesome lightbulb with standard emoji
        for icon in box.find_all('i'):
            if 'fa-lightbulb' in ' '.join(icon.get('class', [])):
                icon.replace_with("💡 ")
            else:
                icon.decompose()
                
        # Clean inline styling
        box['class'] = ['inpartner-callout-box']
        box['style'] = (
            "background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; "
            "border-radius: 8px; padding: 18px 24px; margin: 28px 0; color: #0c4a6e; "
            "font-size: 1.05rem; line-height: 1.65; box-shadow: 0 2px 10px rgba(2, 132, 199, 0.05);"
        )

    # 3. Transform Image Blocks (<figure class="article-image-block">)
    for fig in soup.find_all('figure'):
        align = fig.get('data-align', 'center')
        w_data = fig.get('data-width', 'medium')
        w_map = {'small': '320px', 'medium': '620px', 'large': '820px', 'full': '100%'}
        width_css = w_map.get(w_data, '620px')

        img = fig.find('img')
        if not img:
            continue
            
        src = img.get('src', '')
        alt = img.get('alt', 'Article Image')

        cap_el = fig.find('figcaption')
        cap_text = cap_el.get_text(strip=True) if cap_el else ''
        cred_el = fig.find(class_='img-credit')
        cred_text = cred_el.get_text(strip=True) if cred_el else ''

        full_caption = ""
        if cap_text and cred_text:
            full_caption = f"{cap_text} (Foto: {cred_text})"
        elif cap_text:
            full_caption = cap_text
        elif cred_text:
            full_caption = f"Foto: {cred_text}"

        align_cls = f"align{align}" if align in ['left', 'center', 'right'] else "aligncenter"
        if align == 'center':
            fig_style = f"margin: 2.5rem auto; text-align: center; max-width: {width_css}; clear: both;"
        elif align == 'left':
            fig_style = f"float: left; margin: 1rem 2rem 1.5rem 0; max-width: {width_css};"
        else:
            fig_style = f"float: right; margin: 1rem 0 1.5rem 2rem; max-width: {width_css};"

        img_style = (
            "width: 100%; height: auto; border-radius: 8px; "
            "box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); display: block; margin: 0 auto; "
            "border: 1px solid #e2e8f0;"
        )

        caption_markup = ""
        if full_caption:
            caption_markup = f'<figcaption class="wp-element-caption">{full_caption}</figcaption>'

        new_figure_html = (
            f'<!-- wp:image {{"align":"{align}","sizeSlug":"large"}} -->\n'
            f'<figure class="wp-block-image {align_cls} size-large">\n'
            f'    <img src="{src}" alt="{alt}" />\n'
            f'    {caption_markup}\n'
            f'</figure>\n'
            f'<!-- /wp:image -->'
        )
        
        parsed_fig = BeautifulSoup(new_figure_html, "html.parser")
        fig.replace_with(parsed_fig)

    # 4. Transform Blockquotes
    for bq in soup.find_all('blockquote'):
        bq['class'] = ['wp-block-quote']
        bq['style'] = (
            "font-family: 'Newsreader', Georgia, serif; margin: 32px 0; padding: 20px 26px; "
            "background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; "
            "font-size: 1.22rem; line-height: 1.6; color: #0f172a; font-style: italic;"
        )

    # 5. Transform Headings
    for h1 in soup.find_all('h1'):
        h1['class'] = ['wp-block-heading']
        h1['style'] = "font-family: 'Newsreader', Georgia, serif; font-size: 2.1rem; font-weight: 700; color: #0f172a; margin: 36px 0 16px 0; line-height: 1.25; letter-spacing: -0.015em;"

    for h2 in soup.find_all('h2'):
        h2['class'] = ['wp-block-heading']
        h2['style'] = "font-family: 'Newsreader', Georgia, serif; font-size: 1.75rem; font-weight: 700; color: #0f172a; margin: 36px 0 16px 0; line-height: 1.25; letter-spacing: -0.01em;"

    for h3 in soup.find_all('h3'):
        h3['class'] = ['wp-block-heading']
        h3['style'] = "font-family: 'Newsreader', Georgia, serif; font-size: 1.4rem; font-weight: 600; color: #0f172a; margin: 28px 0 12px 0; line-height: 1.3;"

    for h4 in soup.find_all('h4'):
        h4['class'] = ['wp-block-heading']
        h4['style'] = "font-family: 'Newsreader', Georgia, serif; font-size: 1.2rem; font-weight: 600; color: #0f172a; margin: 24px 0 10px 0; line-height: 1.35;"

    # 6. Transform Paragraphs
    for p in soup.find_all('p'):
        if p.find_parent(['blockquote', 'figure', 'div']):
            continue
        p_text = p.get_text(strip=True)
        if not p_text and not p.find('img'):
            p.decompose()
            continue
        p['style'] = "font-family: 'Newsreader', Georgia, serif; font-size: 1.22rem; line-height: 1.8; color: #1e293b; margin: 0 0 24px 0; text-align: justify; text-justify: inter-word;"

    # 7. Transform Lists
    for ul in soup.find_all('ul'):
        if not ul.get('style'):
            ul['style'] = "font-family: 'Newsreader', Georgia, serif; margin: 0 0 24px 0; padding-left: 24px; font-size: 1.18rem; line-height: 1.85; color: #1e293b;"
        for li in ul.find_all('li', recursive=False):
            li['style'] = "font-family: 'Newsreader', Georgia, serif; margin-bottom: 8px;"

    for ol in soup.find_all('ol'):
        if not ol.get('style'):
            ol['style'] = "font-family: 'Newsreader', Georgia, serif; margin: 0 0 24px 0; padding-left: 24px; font-size: 1.18rem; line-height: 1.85; color: #1e293b;"
        for li in ol.find_all('li', recursive=False):
            li['style'] = "font-family: 'Newsreader', Georgia, serif; margin-bottom: 8px;"

    # 8. Transform Dividers
    for hr in soup.find_all('hr'):
        hr['class'] = ['wp-block-separator', 'has-alpha-channel-opacity']
        hr['style'] = "border: none; border-top: 1px solid #e2e8f0; margin: 36px 0;"

    # 9. Clean standalone empty <p><br></p>
    for p in soup.find_all('p'):
        if len(p.contents) == 1 and p.contents[0].name == 'br':
            p.decompose()

    body_html = str(soup)

    # 10. Assemble complete WordPress content using valid Gutenberg blocks
    parts = []

    # 0. Google Font Newsreader & Inter link block with explicit post title override styling (Valid Gutenberg wp:html block)
    font_block = (
        '<!-- wp:html -->\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
        '<style>\n'
        '@import url("https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Inter:wght@400;500;600;700&display=swap");\n\n'
        '/* Inpartner Editorial Post Title - Synchronized with article.html */\n'
        '.entry-title,\n'
        '.wp-block-post-title,\n'
        '.editor-post-title__input,\n'
        '.post-title,\n'
        'h1.entry-title,\n'
        'h1.wp-block-post-title,\n'
        'header.entry-header h1,\n'
        'header h1,\n'
        '.single-post h1,\n'
        'article h1,\n'
        '.post h1,\n'
        'h1.article-title {\n'
        '    font-family: "Newsreader", Georgia, "Times New Roman", serif !important;\n'
        '    font-weight: 700 !important;\n'
        '    font-size: 2.75rem !important;\n'
        '    line-height: 1.18 !important;\n'
        '    letter-spacing: -0.02em !important;\n'
        '    color: #0f172a !important;\n'
        '    margin-top: 0 !important;\n'
        '    margin-bottom: 1rem !important;\n'
        '}\n\n'
        '@media (max-width: 768px) {\n'
        '    .entry-title,\n'
        '    .wp-block-post-title,\n'
        '    .editor-post-title__input,\n'
        '    .post-title,\n'
        '    h1.entry-title,\n'
        '    h1.wp-block-post-title,\n'
        '    header.entry-header h1,\n'
        '    header h1,\n'
        '    .single-post h1,\n'
        '    article h1,\n'
        '    .post h1 {\n'
        '        font-size: 2rem !important;\n'
        '        line-height: 1.22 !important;\n'
        '    }\n'
        '}\n\n'
        '/* Subtitle / Deck */\n'
        '.inpartner-article-lead {\n'
        '    font-family: "Newsreader", Georgia, serif !important;\n'
        '    font-size: 1.35rem !important;\n'
        '    line-height: 1.45 !important;\n'
        '    color: #334155 !important;\n'
        '    font-style: italic !important;\n'
        '    margin: 0 0 24px 0 !important;\n'
        '}\n\n'
        '/* Meta Bar */\n'
        '.inpartner-article-meta {\n'
        '    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;\n'
        '    font-size: 0.88rem !important;\n'
        '    color: #64748b !important;\n'
        '    margin: 0 0 24px 0 !important;\n'
        '    line-height: 1.6 !important;\n'
        '}\n\n'
        '/* Hero Image Figure */\n'
        '.inpartner-hero-figure {\n'
        '    margin: 0 auto 36px auto !important;\n'
        '    text-align: center !important;\n'
        '}\n'
        '.inpartner-hero-figure img {\n'
        '    width: 100% !important;\n'
        '    max-height: 520px !important;\n'
        '    object-fit: cover !important;\n'
        '    border-radius: 10px !important;\n'
        '    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08) !important;\n'
        '    display: block !important;\n'
        '    margin: 0 auto !important;\n'
        '    border: 1px solid #e2e8f0 !important;\n'
        '}\n\n'
        '/* In-body Images */\n'
        '.wp-block-image.aligncenter {\n'
        '    margin: 2.5rem auto !important;\n'
        '    text-align: center !important;\n'
        '    clear: both !important;\n'
        '}\n'
        '.wp-block-image.alignleft {\n'
        '    float: left !important;\n'
        '    margin: 1rem 2rem 1.5rem 0 !important;\n'
        '    max-width: 380px !important;\n'
        '}\n'
        '.wp-block-image.alignright {\n'
        '    float: right !important;\n'
        '    margin: 1rem 0 1.5rem 2rem !important;\n'
        '    max-width: 380px !important;\n'
        '}\n'
        '.wp-block-image img {\n'
        '    border-radius: 8px !important;\n'
        '    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08) !important;\n'
        '    border: 1px solid #e2e8f0 !important;\n'
        '}\n'
        'figcaption.wp-element-caption {\n'
        '    font-size: 0.86rem !important;\n'
        '    color: #64748b !important;\n'
        '    margin-top: 8px !important;\n'
        '    text-align: center !important;\n'
        '    font-style: italic !important;\n'
        '    line-height: 1.4 !important;\n'
        '}\n\n'
        '/* Separator & References */\n'
        'hr.wp-block-separator,\n'
        '.wp-block-separator {\n'
        '    border: none !important;\n'
        '    border-top: 1px solid #e2e8f0 !important;\n'
        '    margin: 44px 0 24px 0 !important;\n'
        '}\n\n'
        'ul.inpartner-references-list {\n'
        '    padding-left: 20px !important;\n'
        '    font-size: 0.95rem !important;\n'
        '    color: #475569 !important;\n'
        '    line-height: 1.65 !important;\n'
        '    margin-bottom: 24px !important;\n'
        '}\n'
        'ul.inpartner-references-list li {\n'
        '    margin-bottom: 6px !important;\n'
        '}\n'
        'ul.inpartner-references-list a {\n'
        '    color: #2563eb !important;\n'
        '    text-decoration: underline !important;\n'
        '}\n\n'
        '/* Article Body Typography */\n'
        '.entry-content,\n'
        '.wp-block-post-content {\n'
        '    font-family: "Newsreader", Georgia, serif !important;\n'
        '}\n\n'
        '.entry-content p,\n'
        '.wp-block-post-content p {\n'
        '    font-family: "Newsreader", Georgia, serif !important;\n'
        '    text-align: justify !important;\n'
        '    text-justify: inter-word !important;\n'
        '}\n\n'
        '/* Sembunyikan duplicate featured image yang di-render otomatis oleh tema pada halaman single post */\n'
        'body.single .wp-block-post-featured-image,\n'
        'body.single-post .wp-block-post-featured-image,\n'
        'body.wp-singular .wp-block-post-featured-image,\n'
        'body.single .wp-block-post-featured-image img,\n'
        'body.single-post .wp-block-post-featured-image img,\n'
        'body.wp-singular .wp-block-post-featured-image img,\n'
        '.single figure.wp-block-post-featured-image,\n'
        '.single-post figure.wp-block-post-featured-image,\n'
        '.single figure.wp-block-post-featured-image img,\n'
        '.single-post figure.wp-block-post-featured-image img,\n'
        '.single .post-thumbnail,\n'
        '.single-post .post-thumbnail,\n'
        '.single .entry-thumbnail,\n'
        '.single-post .entry-thumbnail,\n'
        '.single img.wp-post-image,\n'
        '.single-post img.wp-post-image {\n'
        '    display: none !important;\n'
        '    visibility: hidden !important;\n'
        '    height: 0 !important;\n'
        '    max-height: 0 !important;\n'
        '    opacity: 0 !important;\n'
        '    margin: 0 !important;\n'
        '    padding: 0 !important;\n'
        '    overflow: hidden !important;\n'
        '    pointer-events: none !important;\n'
        '}\n'
        '</style>\n'
        '<!-- /wp:html -->\n'
    )
    parts.append(font_block)

    # 1. Lead Subtitle / Deck (if present) - Strict Gutenberg core/paragraph
    if subtitle and subtitle.strip():
        parts.append(
            f'<!-- wp:paragraph {{"className":"inpartner-article-lead"}} -->\n'
            f'<p class="inpartner-article-lead">{subtitle.strip()}</p>\n'
            f'<!-- /wp:paragraph -->\n'
        )

    # 2. Metadata Byline - Strict Gutenberg core/paragraph
    cat_text = category.strip() if category and category.strip() else "IN-DEPTH EDITORIAL"
    date_str = ""
    if generated_at:
        if hasattr(generated_at, "strftime"):
            date_str = generated_at.strftime("%B %d, %Y")
        else:
            date_str = str(generated_at)
    else:
        date_str = datetime.now().strftime("%B %d, %Y")
        
    auth_text = author.strip() if author and author.strip() else "Inpartner"
    read_time_val = reading_time or 5
    
    sources_meta_str = ""
    if sources:
        count = len(sources)
        sources_meta_str = f' &bull; <span>{count} reference{"s" if count != 1 else ""}</span>'

    meta_paragraph = (
        f'<!-- wp:paragraph {{"className":"inpartner-article-meta"}} -->\n'
        f'<p class="inpartner-article-meta">'
        f'<span style="color: #2563eb; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; font-size: 0.78rem;">{cat_text}</span>'
        f' &bull; By <strong style="color: #0f172a;">{auth_text}</strong>'
        f' &bull; <span>{date_str}</span>'
        f' &bull; <strong>{read_time_val} min read</strong>'
        f'{sources_meta_str}'
        f'</p>\n'
        f'<!-- /wp:paragraph -->\n'
    )
    parts.append(meta_paragraph)

    # 3. Hero Image - Strict Gutenberg core/image schema
    if include_hero_in_body and hero_image_url and hero_image_url.strip():
        caption_markup = ""
        if hero_caption and hero_caption.strip() and not hero_caption.strip().lower().startswith("click to edit"):
            caption_markup = f'<figcaption class="wp-element-caption">{hero_caption.strip()}</figcaption>'
        hero_alt = title if title else "Featured Hero Image"
        clean_hero_url = hero_image_url.strip()
        hero_figure_markup = (
            f'<!-- wp:image {{"align":"center","sizeSlug":"large","className":"inpartner-hero-figure"}} -->\n'
            f'<figure class="wp-block-image aligncenter size-large inpartner-hero-figure"><img src="{clean_hero_url}" alt="{hero_alt}"/>{caption_markup}</figure>\n'
            f'<!-- /wp:image -->\n'
        )
        parts.append(hero_figure_markup)

    # 4. Main Article Body
    parts.append(body_html)

    # 5. References & Sources - Strict Gutenberg core/separator, core/heading, core/list
    if sources:
        parts.append(
            f'\n<!-- wp:separator -->\n'
            f'<hr class="wp-block-separator has-alpha-channel-opacity"/>\n'
            f'<!-- /wp:separator -->\n'
            f'<!-- wp:heading {{"level":3}} -->\n'
            f'<h3 class="wp-block-heading">📚 References &amp; Sources</h3>\n'
            f'<!-- /wp:heading -->\n'
            f'<!-- wp:list {{"className":"inpartner-references-list"}} -->\n'
            f'<ul class="wp-block-list inpartner-references-list">\n'
        )
        for s in sources:
            pub = s.publisher or 'Source'
            parts.append(f'    <li><strong>{pub}:</strong> <a href="{s.url}" target="_blank" rel="noopener noreferrer">{s.title}</a></li>\n')
        parts.append('</ul>\n<!-- /wp:list -->\n')

    return "".join(parts)


def publish_to_wordpress(
    db: Session,
    article: GeneratedArticle,
    wp_url: str,
    username: str,
    app_password: str,
    status: str = "draft",
    category_id: int = None,
    author_id: int = None,
    include_hero_in_body: bool = True,
    set_featured_image: bool = False
) -> dict:
    """
    Publishes or updates an article on WordPress via REST API with rich styling and Gutenberg compatibility.
    """
    clean_url = clean_wp_url(wp_url)
    auth = (username, app_password.replace(" ", ""))
    headers = {"Content-Type": "application/json", "User-Agent": WP_USER_AGENT}
    
    # Upload and assign featured image only if requested (prevents theme rendering duplicate image above title)
    featured_media_id = None
    if set_featured_image and article.hero_image_url:
        featured_media_id = upload_featured_image(clean_url, auth, article.hero_image_url, article.title)
        
    # Render body HTML cleanly with rich styling
    html_content = format_content_for_wordpress(
        article.content or "",
        subtitle=article.subtitle,
        sources=article.sources,
        hero_caption=article.hero_image_caption,
        title=article.title,
        category=article.category,
        author=article.author,
        reading_time=article.reading_time,
        generated_at=article.generated_at,
        hero_image_url=article.hero_image_url,
        include_hero_in_body=include_hero_in_body
    )
        
    # Preserve published status for existing WordPress posts unless explicitly requested
    target_status = status
    if article.wordpress_post_id:
        if status == "draft" and article.wordpress_status and article.wordpress_status.lower() in ["publish", "published"]:
            target_status = "publish"
            
    post_payload = {
        "title": article.title,
        "content": html_content,
        "excerpt": article.subtitle or "",
        "status": target_status if target_status in ["publish", "draft"] else "draft"
    }
    
    # Map Yoast SEO metadata fields
    seo_meta = article.seo_metadata or {}
    meta_fields = {}
    
    focus_kw = getattr(article, "focus_keyphrase", None) or seo_meta.get("focus_keyphrase")
    if focus_kw:
        meta_fields["_yoast_wpseo_focuskw"] = str(focus_kw).strip()
        
    seo_title = seo_meta.get("seo_title") or seo_meta.get("title")
    if seo_title:
        meta_fields["_yoast_wpseo_title"] = str(seo_title).strip()
        
    meta_desc = seo_meta.get("meta_description") or seo_meta.get("description") or article.subtitle
    if meta_desc:
        meta_fields["_yoast_wpseo_metadesc"] = str(meta_desc).strip()
        
    if meta_fields:
        post_payload["meta"] = meta_fields
        
    # Slug mapping
    if seo_meta.get("slug"):
        clean_slug = re.sub(r'[^a-zA-Z0-9\-]+', '-', str(seo_meta.get("slug"))).strip('-').lower()
        if clean_slug:
            post_payload["slug"] = clean_slug
    
    if category_id:
        post_payload["categories"] = [int(category_id)]
    if author_id:
        post_payload["author"] = int(author_id)
        
    if set_featured_image and featured_media_id:
        post_payload["featured_media"] = featured_media_id
    elif not set_featured_image:
        # Explicitly remove featured_media so theme never renders any image above the title
        post_payload["featured_media"] = 0

    is_update = bool(article.wordpress_post_id)
    if is_update:
        endpoint = f"{clean_url}/wp-json/wp/v2/posts/{article.wordpress_post_id}"
        print(f"[WP Service] Updating existing WordPress Post ID: {article.wordpress_post_id}")
    else:
        endpoint = f"{clean_url}/wp-json/wp/v2/posts"
        print(f"[WP Service] Creating new WordPress Post on: {clean_url}")

    sync_type = "re_sync_update" if is_update else "initial_publish"

    try:
        resp = requests.post(endpoint, auth=auth, headers=headers, json=post_payload, timeout=45)
        if resp.status_code in [200, 201]:
            data = resp.json()
            post_id = data.get("id")
            post_link = data.get("link", "")
            
            # Update article DB model
            article.wordpress_post_id = post_id
            article.wordpress_site = clean_url
            article.wordpress_status = target_status.capitalize()
            article.last_synced_at = datetime.utcnow()
            article.sync_status = "Synced (Re-optimized)" if is_update else "Synced"
            article.status = ArticleStatus.WORDPRESS_SYNCED
            
            # Log sync operation
            sync_log = WordPressSyncLog(
                article_id=article.id,
                wordpress_post_id=post_id,
                synced_at=datetime.utcnow(),
                sync_type=sync_type,
                status="SUCCESS",
                response_code=resp.status_code,
                changes_applied={
                    "title": article.title,
                    "target_status": target_status,
                    "yoast_meta": meta_fields,
                    "slug": post_payload.get("slug")
                }
            )
            db.add(sync_log)
            db.commit()
            
            edit_link = f"{clean_url}/wp-admin/post.php?post={post_id}&action=edit"
            
            return {
                "success": True,
                "post_id": post_id,
                "post_link": post_link,
                "edit_link": edit_link,
                "wordpress_status": target_status.capitalize(),
                "is_update": is_update,
                "yoast_synced": bool(meta_fields),
                "message": f"Successfully {'updated' if is_update else 'published'} WordPress Post #{post_id} with Yoast SEO metadata."
            }
        else:
            err_msg = f"WP API Error (HTTP {resp.status_code}): {resp.text[:300]}"
            article.sync_status = "Sync Failed"
            
            sync_log = WordPressSyncLog(
                article_id=article.id,
                wordpress_post_id=article.wordpress_post_id,
                synced_at=datetime.utcnow(),
                sync_type=sync_type,
                status="FAILED",
                response_code=resp.status_code,
                error_message=err_msg
            )
            db.add(sync_log)
            db.commit()
            return {"success": False, "error": err_msg}
    except Exception as e:
        err_msg = f"WordPress request error: {str(e)}"
        article.sync_status = f"Sync Error: {str(e)[:50]}"
        sync_log = WordPressSyncLog(
            article_id=article.id,
            wordpress_post_id=article.wordpress_post_id,
            synced_at=datetime.utcnow(),
            sync_type=sync_type,
            status="FAILED",
            error_message=err_msg
        )
        db.add(sync_log)
        db.commit()
        return {"success": False, "error": err_msg}


def preview_wordpress_sync(db: Session, article_id: int) -> dict:
    """
    Generates a preview summary before synchronizing an article back to WordPress.
    Verifies target WordPress post, existing publication status, content changes,
    and Yoast SEO metadata mapping.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return {"success": False, "error": "Article not found."}
        
    settings = db.query(AutomationSetting).first()
    wp_site = article.wordpress_site or (settings.wp_url if settings else None)
    
    seo_meta = article.seo_metadata or {}
    focus_kw = getattr(article, "focus_keyphrase", None) or seo_meta.get("focus_keyphrase", "")
    seo_title = seo_meta.get("seo_title") or seo_meta.get("title") or article.title
    meta_desc = seo_meta.get("meta_description") or seo_meta.get("description") or article.subtitle or ""
    slug = seo_meta.get("slug") or re.sub(r'[^a-zA-Z0-9\-]+', '-', str(focus_kw).lower()).strip('-')

    fields_to_update = [
        f"Post Content HTML ({len((article.content or '').split())} words)",
        f"Post Title: '{article.title}'",
        f"Post Slug: '{slug}'",
        f"Yoast Focus Keyphrase: '{focus_kw}'",
        f"Yoast SEO Title: '{seo_title}'",
        f"Yoast Meta Description: '{meta_desc[:60]}...'"
    ]

    return {
        "success": True,
        "article_id": article.id,
        "article_title": article.title,
        "is_existing_post": bool(article.wordpress_post_id),
        "is_update": bool(article.wordpress_post_id),
        "will_create_duplicate": False,
        "wordpress_post_id": article.wordpress_post_id,
        "wordpress_site": wp_site,
        "target_site_url": wp_site,
        "current_wordpress_status": article.wordpress_status or "Not Published",
        "current_wp_status": article.wordpress_status or "Not Published",
        "last_synced_at": article.last_synced_at.strftime("%Y-%m-%d %H:%M:%S") if article.last_synced_at else None,
        "fields_to_update": fields_to_update,
        "proposed_changes": {
            "title": article.title,
            "excerpt": article.subtitle or "",
            "slug": slug,
            "word_count": len((article.content or "").split()),
            "yoast_seo": {
                "focus_keyphrase": focus_kw,
                "seo_title": seo_title,
                "meta_description": meta_desc
            }
        }
    }


def re_sync_article_to_wordpress(db: Session, article_id: int) -> dict:
    """
    Safely re-synchronizes an approved, optimized article to its existing WordPress post.
    Uses stored WordPress credentials and preserves publication status.
    """
    article = db.query(GeneratedArticle).filter(GeneratedArticle.id == article_id).first()
    if not article:
        return {"success": False, "error": f"Article #{article_id} not found."}
        
    setting = db.query(AutomationSetting).first()
    if not setting or not setting.wp_url or not setting.wp_username or not setting.wp_app_password:
        return {"success": False, "error": "WordPress credentials not configured in settings."}
        
    # Target status: preserve current published status
    target_status = "publish" if (article.wordpress_status and article.wordpress_status.lower() in ["publish", "published"]) else "draft"
    
    res = publish_to_wordpress(
        db=db,
        article=article,
        wp_url=setting.wp_url,
        username=setting.wp_username,
        app_password=setting.wp_app_password,
        status=target_status,
        category_id=setting.wp_category_id,
        author_id=setting.wp_author_id,
        include_hero_in_body=True,
        set_featured_image=False
    )
    return res

