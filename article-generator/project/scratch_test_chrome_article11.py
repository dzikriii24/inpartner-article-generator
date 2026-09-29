import os
import subprocess
import time
import sys

sys.path.append('c:/Users/dzikri/Downloads/Inpartner/article-generator/project')
from database import SessionLocal
from models import GeneratedArticle

db = SessionLocal()
art = db.query(GeneratedArticle).filter(GeneratedArticle.id == 11).first()

if not art:
    print("Article 11 not found")
    sys.exit(1)

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{art.title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,400;1,6..72,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        @page {{
            size: A4;
            margin: 18mm 16mm 20mm 16mm;
            @bottom-right {{
                content: counter(page);
            }}
        }}
        :root {{
            --paper: #ffffff;
            --ink: #141311;
            --ink-body: #2c2a26;
            --ink-soft: #575349;
            --muted: #888375;
            --accent: #93602a;
            --accent-soft: #f5ece0;
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
        }}
        .kicker {{
            font-family: 'Inter', sans-serif;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--accent);
            margin-bottom: 0.6rem;
        }}
        h1.article-title {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 2.3rem;
            line-height: 1.2;
            font-weight: 700;
            color: var(--ink);
            margin: 0 0 0.8rem 0;
            letter-spacing: -0.02em;
        }}
        .article-deck {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 1.25rem;
            line-height: 1.45;
            color: var(--ink-soft);
            font-style: italic;
            margin-bottom: 1.2rem;
        }}
        .article-meta {{
            font-family: 'Inter', sans-serif;
            font-size: 0.8rem;
            color: var(--muted);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            padding: 0.6rem 0;
            margin-bottom: 1.5rem;
            display: flex;
            gap: 0.75rem;
        }}
        .hero-figure {{
            margin: 0 0 2rem 0;
            text-align: center;
        }}
        .hero-figure img {{
            max-width: 100%;
            max-height: 380px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid var(--border);
        }}
        .hero-caption {{
            font-family: 'Inter', sans-serif;
            font-size: 0.78rem;
            color: var(--muted);
            margin-top: 0.4rem;
            font-style: italic;
        }}
        .article-body {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 1.15rem;
            line-height: 1.75;
            color: var(--ink-body);
        }}
        .article-body h2 {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 1.6rem;
            margin-top: 1.8rem;
            margin-bottom: 0.6rem;
            color: var(--ink);
            page-break-after: avoid;
        }}
        .article-body h3 {{
            font-family: 'Newsreader', Georgia, serif;
            font-size: 1.3rem;
            margin-top: 1.4rem;
            margin-bottom: 0.5rem;
            color: var(--accent);
            page-break-after: avoid;
        }}
        .article-body blockquote {{
            margin: 1.4rem 0;
            padding: 0.8rem 1.2rem;
            background: var(--accent-soft);
            border-left: 4px solid var(--accent);
            font-style: italic;
            border-radius: 0 6px 6px 0;
        }}
        .callout-box {{
            background: var(--info-soft);
            border: 1px solid rgba(29, 82, 136, 0.3);
            border-left: 4px solid var(--info);
            border-radius: 6px;
            padding: 1rem 1.2rem;
            margin: 1.4rem 0;
            font-size: 1.05rem;
            color: #163f69;
        }}
        .article-body img {{
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            margin: 1rem 0 0.4rem;
        }}
        .references-section {{
            margin-top: 2.5rem;
            padding-top: 1.5rem;
            border-top: 2px solid var(--ink);
            font-family: 'Inter', sans-serif;
            page-break-inside: avoid;
        }}
        .references-section h3 {{
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--ink);
        }}
        .ref-item {{
            margin-bottom: 0.75rem;
            font-size: 0.85rem;
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
    <div class="kicker">{art.category or 'Editorial Report'} &bull; Inpartner Digital Publishing</div>
    <h1 class="article-title">{art.title}</h1>
    {f'<div class="article-deck">{art.subtitle}</div>' if art.subtitle else ''}
    <div class="article-meta">
        <span>By <strong>{art.author or 'Inpartner Editorial Board'}</strong></span> &bull;
        <span>Published {art.generated_at.strftime('%B %d, %Y') if art.generated_at else 'Recent'}</span> &bull;
        <span>{art.reading_time or 5} min read</span>
    </div>

    {f'<div class="hero-figure"><img src="{art.hero_image_url}"><div class="hero-caption">{art.hero_image_caption or ""}</div></div>' if art.hero_image_url else ''}

    <div class="article-body">
        {art.content}
    </div>
</body>
</html>
"""

test_html_path = "c:/Users/dzikri/Downloads/Inpartner/article-generator/project/scratch_art11.html"
test_pdf_path = "c:/Users/dzikri/Downloads/Inpartner/article-generator/project/scratch_art11.pdf"

with open(test_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

chrome_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
cmd = [
    chrome_exe,
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--print-to-pdf-no-header",
    f"--print-to-pdf={test_pdf_path}",
    f"file:///{test_html_path}"
]

print("Executing command:", " ".join(cmd))
proc = subprocess.Popen(cmd)
proc.wait()
time.sleep(1)

print("PDF created:", os.path.exists(test_pdf_path))
if os.path.exists(test_pdf_path):
    print("PDF size:", os.path.getsize(test_pdf_path), "bytes")
