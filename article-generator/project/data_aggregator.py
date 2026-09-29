import feedparser
import requests
import hashlib
from datetime import datetime
import json
import os
from dotenv import load_dotenv

load_dotenv()

# List of predefined RSS feeds (Global and Indonesia)
RSS_FEEDS = {
    "global": [
        "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", # WSJ Markets
        "https://search.cnbc.com/rs/search/combinedcms/view.xml?profile=12000000&id=10000664", # CNBC Finance
    ],
    "indonesia": [
        "https://www.cnbcindonesia.com/market/rss", # CNBC Indonesia Market
        "https://rss.kontan.co.id/news/nasional", # Kontan Nasional
    ]
}

def generate_hash_id(url: str) -> str:
    """Generate a unique ID based on the URL to prevent duplicates."""
    return hashlib.md5(url.encode('utf-8')).hexdigest()

def fetch_rss_feeds():
    """Fetch and parse RSS feeds."""
    raw_articles = []
    
    for region, feeds in RSS_FEEDS.items():
        for feed_url in feeds:
            try:
                parsed_feed = feedparser.parse(feed_url)
                for entry in parsed_feed.entries:
                    # Basic Normalization
                    url = entry.link
                    title = entry.title
                    published_at = entry.get('published', datetime.utcnow().isoformat())
                    description = entry.get('summary', '')
                    
                    article_data = {
                        "id": generate_hash_id(url),
                        "title": title,
                        "url": url,
                        "publisher": parsed_feed.feed.get('title', 'Unknown Publisher'),
                        "published_at": published_at,
                        "description": description,
                        "region": region,
                        "source_type": "rss"
                    }
                    raw_articles.append(article_data)
            except Exception as e:
                print(f"Error fetching feed {feed_url}: {e}")
                
    return raw_articles

def fetch_gnews_fallback():
    """Fetch news from GNews API as a fallback."""
    api_key = os.getenv("GNEWS_API_KEY")
    if not api_key or api_key == "your_gnews_api_key_here":
        print("GNews API key not configured. Skipping GNews fallback.")
        return []

    url = f"https://gnews.io/api/v4/top-headlines?category=business&lang=en&apikey={api_key}"
    raw_articles = []
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            for article in data.get('articles', []):
                article_url = article.get('url')
                article_data = {
                    "id": generate_hash_id(article_url),
                    "title": article.get('title'),
                    "url": article_url,
                    "publisher": article.get('source', {}).get('name', 'GNews Source'),
                    "published_at": article.get('publishedAt'),
                    "description": article.get('description', ''),
                    "region": "global",
                    "source_type": "gnews"
                }
                raw_articles.append(article_data)
        else:
            print(f"Failed to fetch GNews: {response.status_code}")
    except Exception as e:
        print(f"Error fetching from GNews: {e}")
        
    return raw_articles

def deduplicate_articles(articles):
    """Remove duplicates based on URL hash ID."""
    unique_articles = {}
    for article in articles:
        if article['id'] not in unique_articles:
            unique_articles[article['id']] = article
    return list(unique_articles.values())

def main():
    print("Starting News Aggregation Layer...")
    
    # 1. Fetch from sources
    print("Fetching from RSS Feeds...")
    rss_articles = fetch_rss_feeds()
    print(f"Retrieved {len(rss_articles)} articles from RSS.")
    
    print("Fetching from GNews (Fallback)...")
    gnews_articles = fetch_gnews_fallback()
    print(f"Retrieved {len(gnews_articles)} articles from GNews.")
    
    # 2. Combine all raw articles
    all_articles = rss_articles + gnews_articles
    
    # 3. Deduplicate
    print("Deduplicating articles...")
    clean_articles = deduplicate_articles(all_articles)
    
    print(f"Total unique articles collected: {len(clean_articles)}")
    
    # Temporarily saving to JSON to verify the logic
    output_path = "collected_news.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(clean_articles, f, indent=4, ensure_ascii=False)
    
    print(f"Saved collected news to {output_path}")

if __name__ == "__main__":
    main()
