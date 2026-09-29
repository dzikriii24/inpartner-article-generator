import os
import subprocess
import tempfile
import time
import base64
import urllib.request
import ssl
import re
import html
import sys
from datetime import datetime
import uuid

sys.path.append('c:/Users/dzikri/Downloads/Inpartner/article-generator/project')
from database import SessionLocal
from models import GeneratedArticle

def generate_pdf_via_browser(article) -> bytes:
    """
    Renders styled HTML document for article and converts to PDF using Headless Chrome/Edge.
    Embeds all images as Base64 data URLs to prevent network blocks/timeouts.
    """
    browser_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    if not os.path.exists(browser_path):
        browser_path = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
        
    if not os.path.exists(browser_path):
        print("No browser found for headless PDF generation")
        return None

    def image_to_base64(src):
        if not src:
            return ""
        if src.startswith('data:image/'):
            return src
        try:
            img_bytes = None
            if src.startswith(('http://', 'https://')):
                req = urllib.request.Request(
                    src,
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'}
                )
                ssl_ctx = ssl.create_default_context()
                ssl_ctx.check_hostname = False
                ssl_ctx.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(req, timeout=8, context=ssl_ctx) as resp:
                    img_bytes = resp.read()
            elif src.startswith('/static/') or src.startswith('static/'):
                clean_p = src.lstrip('/')
                base_dir = os.path.dirname(os.path.abspath(__file__))
                local_path = os.path.join(base_dir, clean_p)
                if not os.path.exists(local_path):
                    local_path = os.path.join(base_dir, 'api', clean_p)
                if os.path.exists(local_path):
                    with open(local_path, 'rb') as f:
                        img_bytes = f.read()
            elif os.path.exists(src):
                with open(src, 'rb') as f:
                    img_bytes = f.read()
                    
            if img_bytes:
                mime = 'image/jpeg'
                if src.lower().endswith('.png'): mime = 'image/png'
                elif src.lower().endswith('.webp'): mime = 'image/webp'
                elif src.lower().endswith('.svg'): mime = 'image/svg+xml'
                b64 = base64.b64encode(img_bytes).decode('utf-8')
                return f'data:{mime};base64,{b64}'
        except Exception as e:
            print(f"Error converting image to b64: {e}")
        return src

    def clean_text_encoding(text):
        if not text:
            return ""
        # Clean corrupted text encoding issues
        text = re.sub(r'([a-zA-Z])s\b', r"\1's", text)
        text = re.sub(r'([a-zA-Z])t\b', r"\1't", text)
        text = re.sub(r'([a-zA-Z])re\b', r"\1're", text)
        text = re.sub(r'([a-zA-Z])ve\b', r"\1've", text)
        text = re.sub(r'([a-zA-Z])ll\b', r"\1'll", text)
        text = text.replace('', "'")
        return text

    clean_title = clean_text_encoding(article.title)
    clean_subtitle = clean_text_encoding(article.subtitle)
    clean_content = clean_text_encoding(article.content)

    # Deduplicate H1 title at top of body content
    if clean_title:
        clean_content = re.sub(r'^\s*<h1[^>]*>.*?</h1>', '', clean_content, flags=re.IGNORECASE | re.DOTALL)

    hero_b64 = image_to_base64(article.hero_image_url) if article.hero_image_url else None

    def replace_img(match):
        full_tag = match.group(0)
        src = match.group(1)
        b64_src = image_to_base64(src)
        return full_tag.replace(src, b64_src)

    clean_content = re.sub(r'<img[^>]+src=["\']([^"\']+)["\']', replace_img, clean_content)

    # Build sources HTML
    sources_html = ""
    if hasattr(article, 'sources') and article.sources:
        sources_html += "<div class='references-section'>\n"
        sources_html += "<h3>Verified Sources & References</h3>\n"
        sources_html += "<ol style='padding-left: 18px; margin: 0;'>\n"
        for source in article.sources:
            pub = f"<span class='ref-publisher'>{html.escape(source.publisher)}</span> — " if source.publisher else ""
            sources_html += f"<li class='ref-item'>{pub}<a href='{html.escape(source.url)}' class='ref-link' target='_blank'>{html.escape(source.title)}</a></li>\n"
        sources_html += "</ol>\n</div>\n"

    pub_date = article.generated_at.strftime('%B %d, %Y') if article.generated_at else datetime.now().strftime('%B %d, %Y')

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{clean_title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        @page {{
            size: A4;
            margin: 18mm 16mm 20mm 16mm;
        }}
        :root {{
            --paper: #ffffff;
            --ink: #141311;
            --ink-body: #2c2a26;
            --ink-soft: #575349;
            --muted: #888375;
            --accent: #93602a;
            --accent-soft: #f8f4ee;
            --accent-border: #e2d2b8;
            --border: #e6e2d8;
            --info: #1d5288;
            --info-soft: #eef3f8;
        }}
        * {{ box-sizing: border-box; }}
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Newsreader', Georgia, serif;
            background: #ffffff;
            color: var(--ink-body);
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-size: 11.5pt;
            line-height: 1.75;
        }}
        .header-kicker {{
            font-family: 'Inter', sans-serif;
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid var(--border);
            padding-bottom: 6px;
        }}
        h1.article-title {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 24pt;
            line-height: 1.2;
            font-weight: 700;
            color: var(--ink);
            margin: 12px 0 10px 0;
            letter-spacing: -0.02em;
        }}
        .article-deck {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 13pt;
            line-height: 1.45;
            color: var(--ink-soft);
            font-style: italic;
            margin-bottom: 16px;
        }}
        .article-meta {{
            font-family: 'Inter', sans-serif;
            font-size: 8.5pt;
            color: var(--muted);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            padding: 8px 0;
            margin-bottom: 22px;
            display: flex;
            gap: 16px;
            align-items: center;
        }}
        .hero-figure {{
            margin: 0 0 24px 0;
            text-align: center;
            page-break-inside: avoid;
        }}
        .hero-figure img {{
            max-width: 100%;
            max-height: 400px;
            width: auto;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid var(--border);
        }}
        .hero-caption {{
            font-family: 'Inter', sans-serif;
            font-size: 8.5pt;
            color: var(--muted);
            margin-top: 6px;
            font-style: italic;
        }}
        .article-body {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 11.5pt;
            line-height: 1.75;
            color: var(--ink-body);
        }}
        .article-body h2 {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 16pt;
            font-weight: 700;
            margin-top: 24px;
            margin-bottom: 8px;
            color: var(--ink);
            page-break-after: avoid;
            letter-spacing: -0.01em;
        }}
        .article-body h3 {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 13.5pt;
            font-weight: 700;
            margin-top: 18px;
            margin-bottom: 6px;
            color: var(--accent);
            page-break-after: avoid;
        }}
        .article-body p {{
            margin-top: 0;
            margin-bottom: 14px;
            text-align: justify;
        }}
        .article-body blockquote {{
            margin: 18px 0;
            padding: 10px 16px;
            background: var(--accent-soft);
            border-left: 4px solid var(--accent);
            font-style: italic;
            border-radius: 0 6px 6px 0;
            font-size: 11pt;
            page-break-inside: avoid;
        }}
        .callout-box {{
            background: var(--info-soft);
            border: 1px solid rgba(29, 82, 136, 0.25);
            border-left: 4px solid var(--info);
            border-radius: 6px;
            padding: 12px 16px;
            margin: 18px 0;
            font-size: 10.5pt;
            color: #163f69;
            page-break-inside: avoid;
        }}
        .article-body figure, .article-image-block {{
            margin: 18px 0;
            text-align: center;
            page-break-inside: avoid;
        }}
        .article-body img {{
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            border: 1px solid var(--border);
        }}
        .article-body ul, .article-body ol {{
            margin: 10px 0 16px 20px;
            padding: 0;
        }}
        .article-body li {{
            margin-bottom: 6px;
        }}
        .references-section {{
            margin-top: 36px;
            padding-top: 18px;
            border-top: 2px solid var(--ink);
            font-family: 'Inter', sans-serif;
            page-break-inside: avoid;
        }}
        .references-section h3 {{
            font-size: 10pt;
            font-weight: 700;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--ink);
        }}
        .ref-item {{
            margin-bottom: 8px;
            font-size: 8.5pt;
            line-height: 1.5;
        }}
        .ref-publisher {{
            font-weight: 700;
            color: var(--ink);
        }}
        .ref-link {{
            color: var(--accent);
            text-decoration: underline;
        }}
    </style>
</head>
<body>
    <div class="header-kicker">
        <span>{html.escape(article.category or 'EDITORIAL REPORT')} &bull; INPARTNER DIGITAL PUBLISHING</span>
        <span>ISSUE #{article.id}</span>
    </div>
    
    <h1 class="article-title">{clean_title}</h1>
    {f'<div class="article-deck">{clean_subtitle}</div>' if clean_subtitle else ''}
    
    <div class="article-meta">
        <span>By <strong>{html.escape(article.author or 'Inpartner Editorial Board')}</strong></span> &bull;
        <span>Published {pub_date}</span> &bull;
        <span>{article.reading_time or 5} min read</span>
    </div>

    {f'<div class="hero-figure"><img src="{hero_b64}"><div class="hero-caption">{html.escape(article.hero_image_caption or "")}</div></div>' if hero_b64 else ''}

    <div class="article-body">
        {clean_content}
    </div>
    
    {sources_html}
</body>
</html>
"""

    temp_html = os.path.join(tempfile.gettempdir(), f"art_{article.id}_{uuid.uuid4().hex[:8]}.html")
    temp_pdf = os.path.join(tempfile.gettempdir(), f"art_{article.id}_{uuid.uuid4().hex[:8]}.pdf")

    try:
        with open(temp_html, 'w', encoding='utf-8') as f:
            f.write(full_html)

        file_url = "file:///" + temp_html.replace("\\", "/")

        cmd = [
            browser_path,
            '--headless',
            '--disable-gpu',
            '--no-sandbox',
            '--no-pdf-header-footer',
            '--allow-file-access-from-files',
            f'--print-to-pdf={temp_pdf}',
            file_url
        ]

        proc = subprocess.Popen(cmd)
        proc.wait(timeout=15)
        time.sleep(1)

        if os.path.exists(temp_pdf) and os.path.getsize(temp_pdf) > 1000:
            with open(temp_pdf, 'rb') as f:
                pdf_data = f.read()
            return pdf_data
    except Exception as e:
        print(f"Browser PDF generation error: {e}")
    finally:
        if os.path.exists(temp_html):
            try: os.remove(temp_html)
            except: pass
        if os.path.exists(temp_pdf):
            try: os.remove(temp_pdf)
            except: pass

    return None

db = SessionLocal()
art = db.query(GeneratedArticle).filter(GeneratedArticle.id == 11).first()
pdf_bytes = generate_pdf_via_browser(art)
print("PDF Bytes length:", len(pdf_bytes) if pdf_bytes else "FAILED")
if pdf_bytes:
    out_path = "c:/Users/dzikri/Downloads/Inpartner/article-generator/project/test_browser_art11.pdf"
    with open(out_path, "wb") as f:
        f.write(pdf_bytes)
    print(f"Saved to {out_path} successfully! Size: {len(pdf_bytes)} bytes")
