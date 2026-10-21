from playwright.sync_api import sync_playwright
import time
import json

def test_detail():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
        time.sleep(3)
        
        candidates = [
            "https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=AADI&language=id-id",
            "https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=AADI",
            "https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?kodeEmiten=AADI",
            "https://www.idx.co.id/primary/ListedCompany/GetCompanyProfileDetail?KodeEmiten=AADI&language=id-id",
            "https://www.idx.co.id/primary/ListedCompany/GetCompanyProfileDetail?KodeEmiten=AADI",
            "https://www.idx.co.id/primary/ListedCompany/GetCorporateSecretary?KodeEmiten=AADI",
            "https://www.idx.co.id/primary/ListedCompany/GetCorsec?KodeEmiten=AADI",
            "https://www.idx.co.id/primary/ListedCompany/GetManagement?KodeEmiten=AADI",
        ]
        
        for c in candidates:
            res = page.evaluate("""async (url) => {
                try {
                    const r = await fetch(url, {
                        headers: {
                            'Accept': 'application/json, text/plain, */*',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                    const text = await r.text();
                    return { status: r.status, len: text.length, preview: text.substring(0, 150) };
                } catch(e) {
                    return { error: e.toString() };
                }
            }""", c)
            print(c.split('/')[-1], "-->", res["status"], res.get("preview")[:80])
            
        browser.close()

if __name__ == "__main__":
    test_detail()
