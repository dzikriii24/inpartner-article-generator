from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models import ArticleTopic

DEFAULT_PRESET_TOPICS = [
    # Finance
    {"category": "Finance", "name": "Global Markets"},
    {"category": "Finance", "name": "Stocks & Equities"},
    {"category": "Finance", "name": "Cryptocurrency"},
    {"category": "Finance", "name": "Commodities"},
    {"category": "Finance", "name": "IPO & M&A"},
    {"category": "Finance", "name": "Investment Strategy"},
    # Business
    {"category": "Business", "name": "Corporate Strategy"},
    {"category": "Business", "name": "Business Expansion"},
    {"category": "Business", "name": "Mergers & Acquisitions"},
    {"category": "Business", "name": "Corporate Finance"},
    {"category": "Business", "name": "Entrepreneurship"},
    # Tech & AI
    {"category": "Tech & AI", "name": "Enterprise AI"},
    {"category": "Tech & AI", "name": "AI Infrastructure"},
    {"category": "Tech & AI", "name": "Digital Transformation"},
    {"category": "Tech & AI", "name": "Fintech"},
    {"category": "Tech & AI", "name": "Technology Investment"},
    # Economy
    {"category": "Economy", "name": "Indonesian Economy"},
    {"category": "Economy", "name": "Global Economy"},
    {"category": "Economy", "name": "Monetary Policy"},
    {"category": "Economy", "name": "Geopolitics"},
    {"category": "Economy", "name": "Trade & Industry"},
]


def ensure_default_topics(db: Session):
    """
    Seeds default preset topics if none exist in article_topics table.
    """
    count = db.query(ArticleTopic).count()
    if count == 0:
        for t in DEFAULT_PRESET_TOPICS:
            topic = ArticleTopic(
                name=t["name"],
                category=t["category"],
                is_preset=True,
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(topic)
        db.commit()
        print(f"[Topic Service] Seeded {len(DEFAULT_PRESET_TOPICS)} default preset topics.")


def get_all_topics(db: Session, active_only: bool = True) -> List[ArticleTopic]:
    query = db.query(ArticleTopic)
    if active_only:
        query = query.filter(ArticleTopic.is_active == True)
    return query.order_by(ArticleTopic.category.asc(), ArticleTopic.name.asc()).all()


def get_topics_grouped(db: Session, active_only: bool = True) -> Dict[str, List[Dict]]:
    topics = get_all_topics(db, active_only=active_only)
    grouped = {}
    for t in topics:
        if t.category not in grouped:
            grouped[t.category] = []
        grouped[t.category].append({
            "id": t.id,
            "name": t.name,
            "category": t.category,
            "is_preset": t.is_preset,
            "is_active": t.is_active
        })
    return grouped


def add_topic(db: Session, name: str, category: str = "Custom", is_preset: bool = False) -> ArticleTopic:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("Topic name cannot be empty.")
    
    # Check if duplicate exists
    existing = db.query(ArticleTopic).filter(ArticleTopic.name.ilike(clean_name)).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.commit()
            return existing
        return existing
        
    topic = ArticleTopic(
        name=clean_name,
        category=category.strip() or "Custom",
        is_preset=is_preset,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic


def delete_topic(db: Session, topic_id: int) -> bool:
    topic = db.query(ArticleTopic).filter(ArticleTopic.id == topic_id).first()
    if not topic:
        return False
    # If preset, we soft-delete (deactivate) so system presets aren't completely wiped
    if topic.is_preset:
        topic.is_active = False
        db.commit()
    else:
        db.delete(topic)
        db.commit()
    return True
