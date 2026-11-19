import os
import gc
from datetime import datetime
import feedparser
from sqlalchemy.orm import Session
from models import Source, Topic, NewsContent
from concurrent.futures import ThreadPoolExecutor, as_completed
from services.research_engine import get_http_session, extract_article_content_clean, MAX_STORED_CONTENT_CHARS

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
    "step": "idle",  # "rss", "extracting", "clustering", "done", "failed"
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
    res = extract_article_content_clean(url)
    return res.get("text", "")


def collect_rss_news(db: Session):
    update_fetch_progress("rss", "Discovering RSS feeds & GNews API headlines...")
    pending_items = []
    session = get_http_session()

    for category, feeds in RSS_FEEDS.items():
        for feed_url in feeds:
            resp = None
            try:
                resp = session.get(feed_url, timeout=6)
                if resp.status_code != 200:
                    continue
                parsed = feedparser.parse(resp.content)
                for entry in parsed.entries[:8]:  # Top 8 fresh entries per feed
                    url = getattr(entry, "link", None)
                    title = getattr(entry, "title", None)
                    if not url or not title:
                        continue

                    existing = db.query(Source).filter(Source.url == url).first()
                    if existing:
                        continue

                    published_at = datetime.utcnow()
                    description = (entry.get('summary', '') or '')[:1000]
                    publisher = (parsed.feed.get('title', 'RSS Source') or 'RSS Source')[:100]

                    pending_items.append({
                        "url": url,
                        "title": title[:490],
                        "publisher": publisher,
                        "published_at": published_at,
                        "description": description,
                        "source_type": "rss"
                    })
                    if len(pending_items) >= 24:
                        break
            except Exception as e:
                print(f"Error fetching RSS {feed_url}: {e}")
            finally:
                if resp is not None:
                    try:
                        resp.close()
                    except Exception:
                        pass
            if len(pending_items) >= 24:
                break

    if not pending_items:
        return 0

    update_fetch_progress("extracting", f"Extracting full body text for {len(pending_items)} new stories...")

    # Bounded concurrent extraction (max_workers=2 for shared hosting stability)
    collected_sources = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_to_item = {executor.submit(extract_article_content, item["url"]): item for item in pending_items}
        for future in as_completed(future_to_item):
            item = future_to_item[future]
            try:
                full_text = future.result(timeout=8)
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

            body = (full_text if full_text else item["description"])[:MAX_STORED_CONTENT_CHARS]
            news_content = NewsContent(
                source_id=source.id,
                full_content=body,
                cleaned_content=body,
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

    categories = ['business', 'technology', 'nation']
    collected_count = 0
    session = get_http_session()

    for category in categories:
        url = f"https://gnews.io/api/v4/top-headlines?category={category}&lang=id&country=id&apikey={api_key}"
        resp = None
        try:
            resp = session.get(url, timeout=7)
            if resp.status_code == 200:
                articles = resp.json().get('articles', [])
                for article in articles[:5]:
                    art_url = article.get('url')
                    if not art_url:
                        continue
                    existing = db.query(Source).filter(Source.url == art_url).first()
                    if existing:
                        continue

                    desc = (article.get('description') or '')[:1000]
                    source = Source(
                        url=art_url,
                        title=(article.get('title') or 'News')[:490],
                        publisher=(article.get('source', {}).get('name', 'GNews') or 'GNews')[:100],
                        published_at=datetime.utcnow(),
                        description=desc,
                        source_type="gnews",
                        reliability=2
                    )
                    db.add(source)
                    db.flush()

                    full_text = extract_article_content(art_url)
                    body = (full_text if full_text else desc)[:MAX_STORED_CONTENT_CHARS]
                    news_content = NewsContent(
                        source_id=source.id,
                        full_content=body,
                        cleaned_content=body,
                        extracted_at=datetime.utcnow()
                    )
                    db.add(news_content)
                    collected_count += 1

            if collected_count > 0:
                db.commit()
        except Exception as e:
            print(f"Error fetching GNews category {category}: {e}")
        finally:
            if resp is not None:
                try:
                    resp.close()
                except Exception:
                    pass

    return collected_count


def run_aggregation(db: Session):
    print("Starting Aggregation...")
    rss_count = collect_rss_news(db)
    gnews_count = collect_gnews(db)
    gc.collect()
    print(f"Aggregation complete. RSS: {rss_count}, GNews: {gnews_count}")
    return rss_count + gnews_count
