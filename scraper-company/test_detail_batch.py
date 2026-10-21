from playwright.sync_api import sync_playwright
import time

def test_batch_detail():
    codes = ["AADI", "AALI", "ABBA", "ABDA", "ABMM", "ACES", "ACST", "ADHI", "ADMF", "ADRO"]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
        time.sleep(2)
        
        t0 = time.time()
        results = page.evaluate("""async (codes) => {
            const fetchOne = async (code) => {
                try {
                    const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                    if (!r.ok) return { code, error: `Status ${r.status}` };
                    const json = await r.json();
                    const sek = (json.Sekretaris && json.Sekretaris.length > 0) ? json.Sekretaris[0] : {};
                    return {
                        code,
                        corsec_nama: sek.Nama || '',
                        corsec_email: sek.Email || '',
                        corsec_telp: sek.Telepon || '',
                        corsec_hp: sek.HP || ''
                    };
                } catch(e) {
                    return { code, error: e.toString() };
                }
            };
            return await Promise.all(codes.map(fetchOne));
        }""", codes)
        t1 = time.time()
        print(f"Fetched {len(results)} in {t1 - t0:.2f} seconds:")
        for r in results:
            print(" ", r)
            
        browser.close()

if __name__ == "__main__":
    test_batch_detail()
