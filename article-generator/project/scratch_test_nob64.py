import os
import subprocess
import tempfile
import urllib.request
import ssl

chrome_exe = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
edge_exe = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

# Download pinterest image to local disk file first!
local_img = os.path.join(tempfile.gettempdir(), 'local_hero.jpg')
if not os.path.exists(local_img):
    req = urllib.request.Request('https://i.pinimg.com/736x/af/12/22/af122206ed8f7718de7d7b04477ab054.jpg', headers={'User-Agent': 'Mozilla/5.0'})
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, timeout=5, context=ssl_ctx) as resp:
        with open(local_img, 'wb') as f:
            f.write(resp.read())

print("Local image downloaded:", os.path.exists(local_img), "size:", os.path.getsize(local_img) if os.path.exists(local_img) else 0)

local_img_url = 'file:///' + local_img.replace('\\', '/')

html_local_img = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Article 11 PDF Export</title>
<style>
@page {{ size: A4; margin: 15mm; }}
body {{ font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #141311; }}
h1 {{ font-size: 22pt; color: #141311; }}
.hero {{ text-align: center; margin-bottom: 20px; }}
.hero img {{ max-width: 100%; max-height: 400px; border-radius: 6px; }}
.caption {{ font-size: 8.5pt; color: #777; font-style: italic; margin-top: 4px; font-family: sans-serif; }}
p {{ margin-bottom: 12px; text-align: justify; }}
blockquote {{ margin: 16px 0; padding: 10px 14px; background: #f8f4ee; border-left: 4px solid #93602a; font-style: italic; }}
.callout-box {{ background: #eef3f8; border-left: 4px solid #1d5288; padding: 10px 14px; margin: 16px 0; color: #163f69; font-size: 10.5pt; }}
</style>
</head>
<body>
<h1>Jakarta's Balancing Act: The Triple Threat Testing Indonesia's Market Resilience</h1>
<div class="hero">
    <img src="{local_img_url}">
    <div class="caption">Bursa Efek Indonesia</div>
</div>
<p>As institutional instability and shifting monetary policy converge, the Jakarta Composite Index (IHSG) serves as a barometer for a nation caught between global capital rebalancing and domestic economic uncertainty.</p>
<blockquote>The unexpected resignation of the Bank Indonesia (BI) Governor has introduced a period of acute volatility...</blockquote>
<div class="callout-box">DATA METRIC: Emerging Market Status: Maintained by MSCI</div>
</body>
</html>'''

t_html = os.path.join(tempfile.gettempdir(), 'test_local_img.html')
t_pdf = os.path.join(tempfile.gettempdir(), 'test_local_img.pdf')

with open(t_html, 'w', encoding='utf-8') as f:
    f.write(html_local_img)

for exe_name, exe in [('Chrome', chrome_exe), ('Edge', edge_exe)]:
    if os.path.exists(t_pdf): os.remove(t_pdf)
    cmd = [
        exe,
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--allow-file-access-from-files',
        f'--print-to-pdf={t_pdf}',
        t_html
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    exists = os.path.exists(t_pdf)
    print(f'{exe_name} local image test -> exists: {exists}')
    if exists:
        print(f'   SUCCESS! Generated PDF Size: {os.path.getsize(t_pdf)} bytes')
