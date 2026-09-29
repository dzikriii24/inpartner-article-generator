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

sys.path.append('c:/Users/dzikri/Downloads/Inpartner/article-generator/project')
from database import SessionLocal
from models import GeneratedArticle

db = SessionLocal()
art = db.query(GeneratedArticle).filter(GeneratedArticle.id == 11).first()

chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
if not os.path.exists(chrome_exe):
    chrome_exe = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

def img_to_b64(src):
    if not src: return ''
    if src.startswith('data:image/'): return src
    try:
        img_bytes = None
        if src.startswith(('http://', 'https://')):
            req = urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, timeout=5, context=ssl_ctx) as resp:
                img_bytes = resp.read()
        elif os.path.exists(src):
            with open(src, 'rb') as f: img_bytes = f.read()
        if img_bytes:
            b64 = base64.b64encode(img_bytes).decode('utf-8')
            return f'data:image/jpeg;base64,{b64}'
    except Exception as e:
        print('b64 error:', e)
    return src

def clean_txt(t):
    if not t: return ''
    t = re.sub(r'([a-zA-Z])s\b', r"\1's", t)
    t = re.sub(r'([a-zA-Z])t\b', r"\1't", t)
    t = t.replace('\ufffd', "'")
    return t

c_title = clean_txt(art.title)
c_sub = clean_txt(art.subtitle)
c_content = clean_txt(art.content)

if c_title:
    c_content = re.sub(r'^\s*<h1[^>]*>.*?</h1>', '', c_content, flags=re.IGNORECASE | re.DOTALL)

hero_b64 = img_to_b64(art.hero_image_url) if art.hero_image_url else ''

full_html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{c_title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page {{ size: A4; margin: 18mm 16mm 20mm 16mm; }}
:root {{
    --paper: #ffffff;
    --ink: #141311;
    --ink-body: #2c2a26;
    --ink-soft: #575349;
    --muted: #888375;
    --accent: #93602a;
    --accent-soft: #f8f4ee;
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
.kicker {{
    font-family: 'Inter', sans-serif;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 8px;
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
</style>
</head>
<body>
<div class="kicker">{html.escape(art.category or 'EDITORIAL REPORT')} &bull; INPARTNER DIGITAL PUBLISHING</div>
<h1 class="article-title">{c_title}</h1>
{f'<div class="article-deck">{c_sub}</div>' if c_sub else ''}
<div class="article-meta">By <strong>{html.escape(art.author or 'Inpartner Board')}</strong> &bull; {art.reading_time or 5} min read</div>
{f'<div class="hero-figure"><img src="{hero_b64}"><div class="hero-caption">{html.escape(art.hero_image_caption or "")}</div></div>' if hero_b64 else ''}
<div class="article-body">{c_content}</div>
</body>
</html>'''

t_html = os.path.join(tempfile.gettempdir(), 'article_11_test.html')
t_pdf = os.path.join(tempfile.gettempdir(), 'article_11_test.pdf')

with open(t_html, 'w', encoding='utf-8') as f:
    f.write(full_html)

cmd = [
    chrome_exe,
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--no-pdf-header-footer',
    f'--print-to-pdf={t_pdf}',
    t_html
]

print("Running command:", " ".join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
print('Returncode:', res.returncode)
print('PDF Exists:', os.path.exists(t_pdf))
if os.path.exists(t_pdf):
    print('Generated PDF Size:', os.path.getsize(t_pdf), 'bytes')
