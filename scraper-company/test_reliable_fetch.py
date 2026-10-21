from playwright.sync_api import sync_playwright
import time
import json

test_codes = ['CNMA', 'TGUK', 'INET', 'MAHA', 'RMKO', 'FOLK', 'GRPM', 'WIDI', 'RELF', 'CRSN']

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)

    for code in test_codes:
        try:
            res = page.evaluate("""async (c) => {
                const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${c}&language=id-id`);
                if (!r.ok) return { ok: false, status: r.status };
                const j = await r.json();
                const sek = (j.Sekretaris && j.Sekretaris.length > 0) ? j.Sekretaris[0] : {};
                return { ok: true, nama: sek.Nama || '', email: sek.Email || '' };
            }""", code)
            print(f"{code}: {res}")
        except Exception as e:
            print(f"{code} ERROR: {e}")
            page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
            time.sleep(2)
        time.sleep(0.15)

    browser.close()
