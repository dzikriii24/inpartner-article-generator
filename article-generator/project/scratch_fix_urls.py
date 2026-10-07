import os
import glob

for f in glob.glob('api/templates/*.html'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace absolute URLs with /inpartner/
    content = content.replace('href="/', 'href="/inpartner/')
    content = content.replace('src="/', 'src="/inpartner/')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print(f"Fixed {f}")
