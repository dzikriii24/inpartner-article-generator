from playwright.sync_api import sync_playwright
import time
import json

test_codes = [
    'SMGA', 'UNTD', 'TOSK', 'MPIX', 'MKAP', 'ALII', 'LIVE', 'MEJA', 'BAIK', 'VISI',
    'HYGN', 'AREA', 'MHKI', 'ATLA', 'SOLA', 'BATR', 'BAUT', 'BAYU', 'BBCA', 'BBHI'
]

def fetch_chunk_fresh(p, codes):
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
    time.sleep(1.5)
    
    out = []
    for c in codes:
        try:
            res = page.evaluate("""async (code) => {
                const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                if (!r.ok) return { ok: false, status: r.status };
                const j = await r.json();
                const sek = (j.Sekretaris && j.Sekretaris.length > 0) ? j.Sekretaris[0] : {};
                return { ok: true, code: code, nama: sek.Nama || '', email: sek.Email || '' };
            }""", c)
            out.append(res)
        except Exception as e:
            out.append({"ok": False, "code": c, "error": str(e)})
        time.sleep(0.08)
        
    browser.close()
    return out

with sync_playwright() as p:
    t0 = time.time()
    results = fetch_chunk_fresh(p, test_codes)
    print(f"Fetched {len(results)} in {time.time() - t0:.2f} seconds:")
    for r in results:
        print(" ", r)
