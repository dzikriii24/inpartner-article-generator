from database import SessionLocal
from models import Source, Topic, GeneratedArticle
db = SessionLocal()
try:
    sources = db.query(Source).count()
    topics = db.query(Topic).count()
    articles = db.query(GeneratedArticle).all()
    print(f"Sources: {sources}, Topics: {topics}, Articles: {len(articles)}")
    for a in articles:
        print(f"- Article [{a.status}]: {a.title[:50]}...")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
