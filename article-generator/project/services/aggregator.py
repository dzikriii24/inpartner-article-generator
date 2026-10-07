import os
import requests
import feedparser
from datetime import datetime
import hashlib
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from models import Source, Topic, NewsContent
from concurrent.futures import ThreadPoolExecutor, as_completed

RSS_FEEDS = {
    "Macro Economics": [
        "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
    ],
    "Nasional": [
        "https://www.antaranews.com/rss/nasional.xml",
        "https://www.suara.com/rss/news"
    ],
    "Ekonomi": [
        "https://www.antaranews.com/rss/ekonomi.xml"
    ],
    "Stock Market": [
        "https://search.cnbc.com/rs/search/combinedcms/view.xml?profile=12000000&id=10000664",
    ],
    "Crypto": [
        "https://cointelegraph.com/rss"
    ],
    "Geopolitics": [
        "https://feeds.bbci.co.uk/news/world/rss.xml"
    ]
}

FETCH_PROGRESS = {
    "is_fetching": False,
    "step": "idle", # "rss", "extracting", "clustering", "done", "failed"
    "message": "Idle",
    "fetched_count": 0,
    "clustered_count": 0,
    "error": None
}

def update_fetch_progress(step: str, message: str, is_fetching: bool = True, error: str = None):
    FETCH_PROGRESS["step"] = step
    FETCH_PROGRESS["message"] = message
    FETCH_PROGRESS["is_fetching"] = is_fetching
    if error:
        FETCH_PROGRESS["error"] = error

def extract_article_content(url: str) -> str:
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
        resp = requests.get(url, headers=headers, timeout=6)
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.content, 'html.parser')
            for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
                element.decompose()
            
            paragraphs = soup.find_all('p')
            text_content = "\n".join([p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 20])
            text_content = "".join(c for c in text_content if ord(c) <= 0xFFFF)
            return text_content
    except Exception as e:
        print(f"Extraction failed for {url}: {e}")
    return ""

def collect_rss_news(db: Session):
    update_fetch_progress("rss", "Discovering RSS feeds & GNews API headlines...")
    pending_items = []
    
    for category, feeds in RSS_FEEDS.items():
        for feed_url in feeds:
            try:
                parsed = feedparser.parse(feed_url)
                for entry in parsed.entries[:15]: # Top 15 fresh entries per feed
                    url = entry.link
                    title = entry.title
                    
                    existing = db.query(Source).filter(Source.url == url).first()
                    if existing:
                        continue
                        
                    published_at = datetime.utcnow()
                    description = entry.get('summary', '')
                    publisher = parsed.feed.get('title', 'RSS Source')
                    
                    pending_items.append({
                        "url": url,
                        "title": title,
                        "publisher": publisher,
                        "published_at": published_at,
                        "description": description,
                        "source_type": "rss"
                    })
            except Exception as e:
                print(f"Error fetching RSS {feed_url}: {e}")

    if not pending_items:
        return 0

    update_fetch_progress("extracting", f"Extracting full body text for {len(pending_items)} new stories concurrently...")
    
    # Concurrent extraction with ThreadPoolExecutor
    collected_sources = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        future_to_item = {executor.submit(extract_article_content, item["url"]): item for item in pending_items}
        for future in as_completed(future_to_item):
            item = future_to_item[future]
            try:
                full_text = future.result()
            except Exception:
                full_text = ""
                
            source = Source(
                url=item["url"],
                title=item["title"],
                publisher=item["publisher"],
                published_at=item["published_at"],
                description=item["description"],
                source_type=item["source_type"],
                reliability=2
            )
            db.add(source)
            db.flush()
            
            news_content = NewsContent(
                source_id=source.id,
                full_content=full_text if full_text else item["description"],
                cleaned_content=full_text if full_text else item["description"],
                extracted_at=datetime.utcnow()
            )
            db.add(news_content)
            collected_sources.append(source)

    if collected_sources:
        db.commit()
        
    FETCH_PROGRESS["fetched_count"] = len(collected_sources)
    return len(collected_sources)

def collect_gnews(db: Session):
    api_key = os.getenv("GNEWS_API_KEY")
    if not api_key:
        return 0
        
    categories = ['business', 'technology', 'science', 'nation', 'world']
    collected_count = 0
    
    for category in categories:
        url = f"https://gnews.io/api/v4/top-headlines?category={category}&lang=id&country=id&apikey={api_key}"
        try:
            response = requests.get(url, timeout=8)
            if response.status_code == 200:
                articles = response.json().get('articles', [])
                for article in articles[:10]:
                    url = article.get('url')
                    existing = db.query(Source).filter(Source.url == url).first()
                    if existing:
                        continue
                    
                    source = Source(
                        url=url,
                        title=article.get('title'),
                        publisher=article.get('source', {}).get('name', 'GNews'),
                        published_at=datetime.utcnow(),
                        description=article.get('description', ''),
                        source_type="gnews",
                        reliability=2
                    )
                    db.add(source)
                    db.flush()
                    
                    full_text = extract_article_content(url)
                    news_content = NewsContent(
                        source_id=source.id,
                        full_content=full_text if full_text else article.get('description', ''),
                        cleaned_content=full_text if full_text else article.get('description', ''),
                        extracted_at=datetime.utcnow()
                    )
                    db.add(news_content)
                    collected_count += 1
                    
            if collected_count > 0:
                db.commit()
        except Exception as e:
            print(f"Error fetching GNews category {category}: {e}")
        
    return collected_count

def run_aggregation(db: Session):
    print("Starting Aggregation...")
    rss_count = collect_rss_news(db)
    gnews_count = collect_gnews(db)
    print(f"Aggregation complete. RSS: {rss_count}, GNews: {gnews_count}")
    return rss_count + gnews_count
