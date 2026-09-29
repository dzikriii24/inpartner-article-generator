import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from services.aggregator import run_aggregation
from services.clustering import cluster_topics
from services.generator import generate_article_for_topic
from models import Topic

def main():
    load_dotenv()
    db = SessionLocal()
    
    try:
        print("=== STEP 1: Aggregation ===")
        run_aggregation(db)
        
        print("\n=== STEP 2: Clustering ===")
        cluster_topics(db)
        
        print("\n=== STEP 3: Generation ===")
        # Get top ungenerated topic
        topic = db.query(Topic).filter(Topic.status == "DISCOVERED").order_by(Topic.score.desc()).first()
        if topic:
            print(f"Generating article for topic: {topic.title} (Score: {topic.score})")
            article = generate_article_for_topic(db, topic)
            if article:
                print("\n[SUCCESS] Article Generated Successfully!")
                print(f"Title: {article.title}")
                print(f"Preview: {article.content[:200]}...")
                print(f"SEO Meta: {article.seo_metadata}")
            else:
                print("[ERROR] Failed to generate article.")
        else:
            print("No discovered topics to generate.")
            
    except Exception as e:
        print(f"Pipeline error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
