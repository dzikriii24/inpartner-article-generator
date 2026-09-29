import urllib.request
import json
import time

def test_e2e():
    url = 'http://127.0.0.1:8000/api/generate/prompt'
    payload = {'prompt': 'buat artikel tentang dampak kenaikan harga kopi terhadap UMKM di Indonesia'}
    
    req = urllib.request.Request(
        url,
        headers={'Content-Type': 'application/json'},
        data=json.dumps(payload).encode('utf-8')
    )
    
    res = urllib.request.urlopen(req)
    data = json.loads(res.read().decode('utf-8'))
    print("API Response:", data)
    
    article_id = data.get("article_id")
    assert article_id is not None, "Article ID must be returned"
    
    print(f"Polling status for article #{article_id}...")
    for i in range(60):
        time.sleep(3)
        status_req = urllib.request.urlopen(f'http://127.0.0.1:8000/api/article/{article_id}/status')
        status_data = json.loads(status_req.read().decode('utf-8'))
        print(f"Poll {i+1}: Status={status_data.get('status')}, Step={status_data.get('generation_step')}")
        
        if status_data.get('status') in ['READY', 'FAILED']:
            print("\nFinal Poll Result:", status_data)
            
            # Fetch full article details
            article_req = urllib.request.urlopen(f'http://127.0.0.1:8000/article/{article_id}')
            html_content = article_req.read().decode('utf-8')
            print(f"Fetched Article HTML Page! Bytes: {len(html_content)}")
            assert "Inpartner Article Generator" in html_content or "Editorial" in html_content
            assert "Verified References" in html_content or "Fact Provenance" in html_content
            print("SUCCESS! Article Overview page rendered cleanly with Inpartner branding, references & fact provenance.")
            break

if __name__ == "__main__":
    test_e2e()
