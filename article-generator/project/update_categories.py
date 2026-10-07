from database import SessionLocal
from models import Topic

db = SessionLocal()
topics = db.query(Topic).filter(Topic.category == None).all()
topics_business = db.query(Topic).filter(Topic.category == "Business").all()

all_topics = topics + topics_business

for topic in all_topics:
    title_lower = topic.title.lower() if topic.title else ""
    cat = "Bisnis / Ekonomi"
    if any(kw in title_lower for kw in ["indonesia", "jokowi", "prabowo", "jakarta", "nasional", "rupiah", "bumn", "nusantara", "ikn", "dpr", "kpk", "polri", "mk", "mahkamah", "kpu", "gibran", "menteri", "pemerintah"]):
        cat = "Nasional"
    elif any(kw in title_lower for kw in ["crypto", "bitcoin", "ethereum", "btc", "eth", "kripto"]):
        cat = "Crypto"
    elif any(kw in title_lower for kw in ["saham", "stock", "invest", "ihsg", "ekonomi", "finance", "bank"]):
        cat = "Ekonomi"
    elif any(kw in title_lower for kw in ["tech", "ai", "google", "apple", "microsoft", "teknologi"]):
        cat = "Teknologi"
    
    topic.category = cat

db.commit()
print(f"Updated {len(all_topics)} topics.")
db.close()
