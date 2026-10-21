from playwright.sync_api import sync_playwright
import time
import json

with open("all_profiles.json", "r", encoding="utf-8") as f:
    all_codes = [c['KodeEmiten'] for c in json.load(f)['data']]

with open("idx_details_cache.json", "r", encoding="utf-8") as f:
    cached = set(json.load(f).keys())

missing = [c for c in all_codes if c not in cached][:20]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(2000)
    
    res = page.evaluate("""async (codes) => {
        const out = [];
        for (const code of codes) {
            try {
                const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                out.push({ code, status: r.status, ok: r.ok });
            } catch(e) {
                out.push({ code, error: e.toString() });
            }
            await new Promise(r => setTimeout(r, 60));
        }
        return out;
    }""", missing)
    print("Test missing 20:", res)
    browser.close()
