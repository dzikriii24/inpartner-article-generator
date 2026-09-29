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

def test_browser_pdf(article):
    browser_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    if not os.path.exists(browser_exe):
        browser_exe = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

    print("Using browser:", browser_exe)

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

    c_title = clean_txt(article.title)
    c_sub = clean_txt(article.subtitle)
    c_content = clean_txt(article.content)

    if c_title:
        c_content = re.sub(r'^\s*<h1[^>]*>.*?</h1>', '', c_content, flags=re.IGNORECASE | re.DOTALL)

    hero_b64 = img_to_b64(article.hero_image_url) if article.hero_image_url else ''

    full_html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{c_title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,700;1,6..72,400&family=Inter:wght@400;600;700&display=swap');
@page {{ size: A4; margin: 16mm 14mm 18mm 14mm; }}
body {{ font-family: 'Newsreader', serif; font-size: 11pt; line-height: 1.7; color: #2c2a26; margin: 0; padding: 0; }}
.kicker {{ font-family: 'Inter', sans-serif; font-size: 8pt; font-weight: 700; color: #93602a; text-transform: uppercase; border-bottom: 1px solid #e6e2d8; padding-bottom: 4px; margin-bottom: 10px; }}
h1 {{ font-family: 'Newsreader', serif; font-size: 24pt; color: #141311; margin: 10px 0; }}
.deck {{ font-style: italic; font-size: 13pt; color: #575349; margin-bottom: 14px; }}
.meta {{ font-family: 'Inter', sans-serif; font-size: 8.5pt; color: #888375; border-top: 1px solid #e6e2d8; border-bottom: 1px solid #e6e2d8; padding: 6px 0; margin-bottom: 20px; }}
.hero {{ text-align: center; margin-bottom: 20px; }}
.hero img {{ max-width: 100%; max-height: 380px; border-radius: 6px; border: 1px solid #e6e2d8; }}
.caption {{ font-family: 'Inter', sans-serif; font-size: 8pt; color: #888375; font-style: italic; margin-top: 4px; }}
p {{ margin-bottom: 12px; text-align: justify; }}
blockquote {{ margin: 16px 0; padding: 10px 14px; background: #f8f4ee; border-left: 4px solid #93602a; font-style: italic; }}
.callout-box {{ background: #eef3f8; border-left: 4px solid #1d5288; padding: 10px 14px; margin: 16px 0; color: #163f69; font-size: 10.5pt; }}
</style>
</head>
<body>
<div class="kicker">{html.escape(article.category or 'Editorial')} &bull; Inpartner Digital Publishing</div>
<h1>{c_title}</h1>
{f'<div class="deck">{c_sub}</div>' if c_sub else ''}
<div class="meta">By {html.escape(article.author or 'Inpartner Board')} &bull; {article.reading_time or 5} min read</div>
{f'<div class="hero"><img src="{hero_b64}"><div class="caption">{html.escape(article.hero_image_caption or "")}</div></div>' if hero_b64 else ''}
<div class="body">{c_content}</div>
</body>
</html>'''

    t_html = os.path.join(tempfile.gettempdir(), 'test_art11.html')
    t_pdf = os.path.join(tempfile.gettempdir(), 'test_art11.pdf')
    u_dir = os.path.join(tempfile.gettempdir(), 'chrome_user_dir_' + str(int(time.time())))

    with open(t_html, 'w', encoding='utf-8') as f:
        f.write(full_html)

    file_url = 'file:///' + t_html.replace('\\', '/')

    cmd = [
        browser_exe,
        '--headless=new',
        f'--user-data-dir={u_dir}',
        '--disable-gpu',
        '--no-sandbox',
        '--no-pdf-header-footer',
        '--virtual-time-budget=3000',
        '--run-all-compositor-stages-before-draw',
        f'--print-to-pdf={t_pdf}',
        file_url
    ]

    print("Running command:", " ".join(cmd))
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
    print('Command returncode:', res.returncode)
    print('PDF exists:', os.path.exists(t_pdf))
    if os.path.exists(t_pdf):
        print('PDF size:', os.path.getsize(t_pdf), 'bytes')

test_browser_pdf(art)
