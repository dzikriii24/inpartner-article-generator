import os
import subprocess
import time
import sys
import re
import html
import base64
import urllib.request
import ssl

sys.path.append('c:/Users/dzikri/Downloads/Inpartner/article-generator/project')
from database import SessionLocal
from models import GeneratedArticle

db = SessionLocal()
art = db.query(GeneratedArticle).filter(GeneratedArticle.id == 11).first()

def image_to_base64(src):
    if not src:
        return None
    if src.startswith('data:image/'):
        return src
    try:
        img_bytes = None
        if src.startswith(('http://', 'https://')):
            req = urllib.request.Request(
                src,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
            )
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, timeout=10, context=ssl_ctx) as resp:
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
            if src.endswith('.png'): mime = 'image/png'
            elif src.endswith('.webp'): mime = 'image/webp'
            elif src.endswith('.svg'): mime = 'image/svg+xml'
            b64 = base64.b64encode(img_bytes).decode('utf-8')
            return f'data:{mime};base64,{b64}'
    except Exception as e:
        print(f"Error converting image {src[:50]}: {e}")
    return src

# Clean unicode replacement characters
def clean_text_encoding(text):
    if not text:
        return ""
    text = text.replace('s', "'s")
    text = text.replace('t', "'t")
    text = text.replace('re', "'re")
    text = text.replace('ve', "'ve")
    text = text.replace('ll', "'ll")
    text = text.replace('', "'")
    return text

clean_title = clean_text_encoding(art.title)
clean_subtitle = clean_text_encoding(art.subtitle)
clean_content = clean_text_encoding(art.content)

# Deduplicate title inside content
if clean_title:
    clean_content = re.sub(r'^\s*<h1[^>]*>.*?</h1>', '', clean_content, flags=re.IGNORECASE | re.DOTALL)

# Convert hero image to base64
hero_b64 = image_to_base64(art.hero_image_url) if art.hero_image_url else None

# Convert inline images in content to base64
def replace_img_src(match):
    full_tag = match.group(0)
    src = match.group(1)
    b64_src = image_to_base64(src)
    return full_tag.replace(src, b64_src)

clean_content = re.sub(r'<img[^>]+src=["\']([^"\']+)["\']', replace_img_src, clean_content)

html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{clean_title}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        @page {{
            size: A4;
            margin: 20mm 18mm 22mm 18mm;
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
            max-height: 380px;
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
        <span>{art.category or 'EDITORIAL REPORT'} &bull; INPARTNER DIGITAL PUBLISHING</span>
        <span>ISSUE #{art.id}</span>
    </div>
    
    <h1 class="article-title">{clean_title}</h1>
    {f'<div class="article-deck">{clean_subtitle}</div>' if clean_subtitle else ''}
    
    <div class="article-meta">
        <span>By <strong>{art.author or 'Inpartner Editorial Board'}</strong></span> &bull;
        <span>Published {art.generated_at.strftime('%B %d, %Y') if art.generated_at else 'Recent'}</span> &bull;
        <span>{art.reading_time or 5} min read</span>
    </div>

    {f'<div class="hero-figure"><img src="{hero_b64}"><div class="hero-caption">{html.escape(art.hero_image_caption or "")}</div></div>' if hero_b64 else ''}

    <div class="article-body">
        {clean_content}
    </div>
</body>
</html>
"""

test_html_path = "c:/Users/dzikri/Downloads/Inpartner/article-generator/project/scratch_art11_full.html"
test_pdf_path = "c:/Users/dzikri/Downloads/Inpartner/article-generator/project/scratch_art11_full.pdf"

with open(test_html_path, "w", encoding="utf-8") as f:
    f.write(html_template)

edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--print-to-pdf-no-header",
    f"--print-to-pdf={test_pdf_path}",
    test_html_path
]

print("Running command:", " ".join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True)
time.sleep(1)

print("PDF Created:", os.path.exists(test_pdf_path))
if os.path.exists(test_pdf_path):
    print("PDF Size:", os.path.getsize(test_pdf_path), "bytes")
