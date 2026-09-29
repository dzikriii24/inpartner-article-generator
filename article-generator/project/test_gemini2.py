import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY", "your_gemini_api_key_here")
models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-flash-latest"]

for model in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key
    }
    payload = {
        "contents": [{"parts": [{"text": "Hello"}]}]
    }
    response = requests.post(url, headers=headers, json=payload)
    print(f"Model: {model} -> Status: {response.status_code}")
    print(response.text[:200])
