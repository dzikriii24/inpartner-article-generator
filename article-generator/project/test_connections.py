import os
import requests
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def test_gnews():
    print("\n--- Testing GNews API ---")
    api_key = os.getenv("GNEWS_API_KEY")
    if not api_key:
        print("[ERROR] GNEWS_API_KEY not found.")
        return
    url = f"https://gnews.io/api/v4/top-headlines?category=business&lang=en&apikey={api_key}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("[OK] GNews API connected successfully.")
        else:
            print(f"[ERROR] GNews API failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[ERROR] Error connecting to GNews API: {e}")

def test_newsapi():
    print("\n--- Testing NewsAPI ---")
    api_key = os.getenv("NEWSAPI_KEY")
    if not api_key:
        print("[ERROR] NEWSAPI_KEY not found.")
        return
    url = f"https://newsapi.org/v2/top-headlines?category=business&language=en&apiKey={api_key}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("[OK] NewsAPI connected successfully.")
        else:
            print(f"[ERROR] NewsAPI failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[ERROR] Error connecting to NewsAPI: {e}")

def test_gemini():
    print("\n--- Testing Gemini API ---")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[ERROR] GEMINI_API_KEY not found.")
        return
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print("[OK] Gemini API connected successfully.")
        else:
            print(f"[ERROR] Gemini API failed with status {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[ERROR] Error connecting to Gemini API: {e}")

def test_database():
    print("\n--- Testing MySQL Connection ---")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("[ERROR] DATABASE_URL not found.")
        return
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            db_version = result.fetchone()
            print(f"[OK] Database connected successfully. Version: {db_version[0]}")
    except Exception as e:
        print(f"[ERROR] Error connecting to MySQL: {e}")

if __name__ == "__main__":
    print("Loading environment variables from .env...")
    load_dotenv()
    test_gnews()
    test_newsapi()
    test_gemini()
    test_database()
