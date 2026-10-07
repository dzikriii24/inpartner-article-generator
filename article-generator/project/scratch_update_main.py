import re

with open('api/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove middleware
content = re.sub(r'@app\.middleware\("http"\).*?return await call_next\(request\)\n', '', content, flags=re.DOTALL)

# Change app to router
content = content.replace('@app.get(', '@router.get(')
content = content.replace('@app.post(', '@router.post(')

# But we need APIRouter
content = content.replace('app = FastAPI(title="Inpartner Article Generator", root_path="/inpartner")',
'''app = FastAPI(title="Inpartner Article Generator")

from fastapi import APIRouter
router = APIRouter()''')

# And we need to include router
content = content.replace('if __name__ == "__main__":',
'''app.include_router(router)
app.include_router(router, prefix="/inpartner")

if __name__ == "__main__":''')

with open('api/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
