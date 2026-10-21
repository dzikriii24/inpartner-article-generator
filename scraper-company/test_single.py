from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
    page.wait_for_timeout(2000)
    
    code = "BMBL"
    js_code = f"""async () => {{
        try {{
            const r = await fetch('https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten={code}&language=id-id');
            const data = await r.json();
            return {{ status: r.status, sekretaris: data.Sekretaris }};
        }} catch(e) {{
            return {{ error: e.toString() }};
        }}
    }}"""
    res = page.evaluate(js_code)
    print("BMBL sekretaris:", res)
    browser.close()
