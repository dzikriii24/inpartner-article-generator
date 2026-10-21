from playwright.sync_api import sync_playwright
import time
import json

with open("all_profiles.json", "r", encoding="utf-8") as f:
    data = json.load(f)["data"]
codes = [item["KodeEmiten"] for item in data]
test_codes = codes[125:175]  # 50 items

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
    
    # Wait for Cloudflare to clear
    for _ in range(10):
        if "Just a moment" not in page.title() and page.title() != "":
            print("Cloudflare cleared! Title:", page.title())
            break
        time.sleep(0.5)

    res = page.evaluate("""async (codes) => {
        const out = [];
        for (const code of codes) {
            try {
                const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                out.push({ code, status: r.status, ok: r.ok });
            } catch(e) {
                out.push({ code, error: e.toString() });
            }
            await new Promise(r => setTimeout(r, 80));
        }
        return out;
    }""", test_codes)
    
    ok_count = sum(1 for x in res if x.get('ok'))
    print(f"Result: {ok_count}/{len(test_codes)} OK!")
    if ok_count < len(test_codes):
        print("Failures:", [x for x in res if not x.get('ok')])
    browser.close()
