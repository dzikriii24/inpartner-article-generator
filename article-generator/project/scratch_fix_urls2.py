import os
import glob

for f in glob.glob('api/templates/*.html'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace fetch absolute URLs with /inpartner/
    content = content.replace("fetch('/api/", "fetch('/inpartner/api/")
    content = content.replace("fetch(`/api/", "fetch(`/inpartner/api/")
    content = content.replace('window.location.href = "/', 'window.location.href = "/inpartner/')
    content = content.replace('window.location.href="/', 'window.location.href="/inpartner/')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f"Fixed fetch URLs in {f}")
