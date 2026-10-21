import os
import json
import time
from playwright.sync_api import sync_playwright
import config

class IDXService:
    def __init__(self, profiles_cache_path=config.CACHE_PROFILES_FILE, details_cache_path=config.CACHE_DETAILS_FILE):
        self.profiles_cache_path = profiles_cache_path
        self.details_cache_path = details_cache_path
        self.profiles = []
        self.details_cache = {}
        self.playwright = None
        self.browser = None
        self.page = None
        self._load_caches()

    def _load_caches(self):
        if os.path.exists(self.profiles_cache_path):
            try:
                with open(self.profiles_cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.profiles = data.get("data", [])
            except Exception as e:
                print(f"[Warning] Failed to load {self.profiles_cache_path}: {e}")

        if os.path.exists(self.details_cache_path):
            try:
                with open(self.details_cache_path, "r", encoding="utf-8") as f:
                    self.details_cache = json.load(f)
            except Exception as e:
                print(f"[Warning] Failed to load {self.details_cache_path}: {e}")

    def save_details_cache(self):
        try:
            with open(self.details_cache_path, "w", encoding="utf-8") as f:
                json.dump(self.details_cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[Warning] Failed to save {self.details_cache_path}: {e}")

    def _ensure_browser(self):
        if self.page is None or self.browser is None:
            self.playwright = sync_playwright().start()
            self.browser = self.playwright.chromium.launch(headless=True)
            self.page = self.browser.new_page(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            )
            # Initialize session on IDX
            self.page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=45000)
            # Wait for Cloudflare
            for _ in range(12):
                if "Just a moment" not in self.page.title() and self.page.title() != "":
                    break
                time.sleep(0.5)

    def close(self):
        try:
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
        except Exception:
            pass
        self.page = None
        self.browser = None
        self.playwright = None

    def fetch_all_profiles(self, force_refresh=False):
        """Fetches all 962+ listed company profiles from IDX."""
        if self.profiles and not force_refresh:
            return self.profiles

        self._ensure_browser()
        print("Fetching full company profile directory from IDX...")
        res = self.page.evaluate("""async () => {
            const r = await fetch('https://www.idx.co.id/primary/ListedCompany/GetCompanyProfiles?start=0&length=1500');
            return await r.json();
        }""")
        self.profiles = res.get("data", [])
        with open(self.profiles_cache_path, "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=2)
        print(f"Successfully retrieved {len(self.profiles)} company profiles.")
        return self.profiles

    def get_company_detail(self, ticker: str):
        """
        Retrieves company detail including Corporate Secretary.
        Uses cached data if available; otherwise fetches with backoff.
        """
        if not ticker:
            return {}

        ticker = ticker.upper().strip()
        if ticker in self.details_cache:
            return self.details_cache[ticker]

        self._ensure_browser()
        retries = 3
        backoff = 3.0

        for attempt in range(retries):
            try:
                res = self.page.evaluate("""async (code) => {
                    try {
                        const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                        if (r.status === 429) {
                            return { code: code, status: 429, error: 'Rate limit' };
                        }
                        if (!r.ok) {
                            return { code: code, status: r.status, error: `HTTP ${r.status}` };
                        }
                        const json = await r.json();
                        const sek = (json.Sekretaris && json.Sekretaris.length > 0) ? json.Sekretaris[0] : {};
                        const prof = (json.Profiles && json.Profiles.length > 0) ? json.Profiles[0] : {};
                        return {
                            code: code,
                            status: 200,
                            corsec_nama: sek.Nama || '',
                            corsec_email: sek.Email || '',
                            corsec_telp: sek.Telepon || '',
                            corsec_hp: sek.HP || '',
                            general_email: prof.Email || '',
                            phone: prof.Telepon || '',
                            website: prof.Website || '',
                            address: prof.Alamat || '',
                            company_name: prof.NamaEmiten || ''
                        };
                    } catch(e) {
                        return { code: code, error: e.toString() };
                    }
                }""", ticker)

                if res.get("status") == 200:
                    self.details_cache[ticker] = res
                    return res
                elif res.get("status") == 429:
                    # Rate limited: wait and retry
                    time.sleep(backoff)
                    backoff *= 1.5
                else:
                    time.sleep(1.0)

            except Exception as e:
                time.sleep(1.5)

        # Fallback empty detail
        empty_res = {"code": ticker, "corsec_nama": "", "corsec_email": "", "corsec_telp": "", "corsec_hp": ""}
        self.details_cache[ticker] = empty_res
        return empty_res

    def batch_fetch_details(self, tickers: list, delay_between: float = 0.35):
        """Pre-fetches a list of tickers, skipping ones already cached."""
        missing = [t for t in tickers if t and t.upper() not in self.details_cache]
        if not missing:
            return

        self._ensure_browser()
        for idx, t in enumerate(missing):
            self.get_company_detail(t)
            time.sleep(delay_between)
            if (idx + 1) % 25 == 0:
                self.save_details_cache()
        self.save_details_cache()
