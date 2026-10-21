from playwright.sync_api import sync_playwright
import time
import json
import os
from tqdm import tqdm

CACHE_FILE = "idx_details_cache.json"

def fetch_all_details(all_codes, chunk_size=20, delay_ms=80):
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} details from {CACHE_FILE}")
        except Exception:
            cache = {}

    missing_codes = [c for c in all_codes if c not in cache]
    print(f"Total codes: {len(all_codes)} | Cached: {len(cache)} | To fetch: {len(missing_codes)}")

    if not missing_codes:
        print("All company details are already cached!")
        return cache

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        print("Opening IDX session...")
        page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=45000)
        time.sleep(2)

        pbar = tqdm(total=len(missing_codes), desc="Fetching IDX Details")

        chunks_since_refresh = 0
        for i in range(0, len(missing_codes), chunk_size):
            chunk = missing_codes[i:i + chunk_size]

            # Refresh session every 3 chunks (60 items) to keep Cloudflare happy
            if chunks_since_refresh >= 3:
                try:
                    page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
                    time.sleep(1.5)
                    chunks_since_refresh = 0
                except Exception:
                    pass

            try:
                res = page.evaluate("""async ({ codes, delay }) => {
                    const out = [];
                    for (const code of codes) {
                        try {
                            const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                            if (r.ok) {
                                const json = await r.json();
                                const sek = (json.Sekretaris && json.Sekretaris.length > 0) ? json.Sekretaris[0] : {};
                                const prof = (json.Profiles && json.Profiles.length > 0) ? json.Profiles[0] : {};
                                out.push({
                                    code: code,
                                    corsec_nama: sek.Nama || '',
                                    corsec_email: sek.Email || '',
                                    corsec_telp: sek.Telepon || '',
                                    corsec_hp: sek.HP || '',
                                    general_email: prof.Email || '',
                                    phone: prof.Telepon || '',
                                    website: prof.Website || '',
                                    address: prof.Alamat || '',
                                    company_name: prof.NamaEmiten || ''
                                });
                            } else {
                                out.push({ code: code, error: `Status ${r.status}` });
                            }
                        } catch(e) {
                            out.push({ code: code, error: e.toString() });
                        }
                        if (delay > 0) {
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                    return out;
                }""", {"codes": chunk, "delay": delay_ms})

                success_in_chunk = 0
                for item in res:
                    if item.get("code") and "error" not in item:
                        cache[item["code"]] = item
                        success_in_chunk += 1

                pbar.update(len(chunk))
                chunks_since_refresh += 1

                # If chunk had errors, force a page reload
                if success_in_chunk < len(chunk):
                    # print(f"\n[Notice] {len(chunk) - success_in_chunk} items failed in chunk, refreshing session...")
                    try:
                        page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
                        time.sleep(2)
                        chunks_since_refresh = 0
                    except Exception:
                        pass

                # Checkpoint save
                with open(CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump(cache, f, ensure_ascii=False, indent=2)

            except Exception as e:
                # print(f"\n[Warning] Error in chunk: {e}")
                time.sleep(2)

        pbar.close()
        browser.close()

    print(f"Caching complete! Total in cache: {len(cache)}")
    return cache

if __name__ == "__main__":
    with open("all_profiles.json", "r", encoding="utf-8") as f:
        data = json.load(f)["data"]
    codes = [item["KodeEmiten"] for item in data]
    t0 = time.time()
    fetch_all_details(codes, chunk_size=20, delay_ms=70)
    print(f"Completed in {time.time() - t0:.2f} seconds.")
