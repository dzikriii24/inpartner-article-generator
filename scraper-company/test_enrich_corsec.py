from playwright.sync_api import sync_playwright
import time
import json
import pandas as pd

excel_path = "Pipeline AR-SR_Lengkap.xlsx"
df = pd.read_excel(excel_path)

missing_corsec = df[df['Nama Corporate Secretary'].isna() | (df['Nama Corporate Secretary'].str.strip() == '')]
print(f"Total missing Corsec: {len(missing_corsec)}")
test_tickers = missing_corsec['Kode Emiten'].dropna().unique()[:10].tolist()
print("Test tickers:", test_tickers)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
    time.sleep(2)
    
    res = page.evaluate("""async (codes) => {
        const out = [];
        for (const code of codes) {
            try {
                const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                if (r.ok) {
                    const json = await r.json();
                    const sek = (json.Sekretaris && json.Sekretaris.length > 0) ? json.Sekretaris[0] : {};
                    out.push({ code, ok: true, nama: sek.Nama || '', email: sek.Email || '' });
                } else {
                    out.push({ code, ok: false, status: r.status });
                }
            } catch(e) {
                out.push({ code, ok: false, error: e.toString() });
            }
            await new Promise(r => setTimeout(r, 120));
        }
        return out;
    }""", test_tickers)
    
    print("Test results:")
    for item in res:
        print(" ", item)
    browser.close()
