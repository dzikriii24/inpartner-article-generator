import os
import re
import time
import json
import pandas as pd
from tqdm import tqdm
from playwright.sync_api import sync_playwright

CACHE_FILE = "idx_details_cache.json"
EXCEL_PATH = "Pipeline AR-SR_Lengkap.xlsx"
DEST_PATH = r"c:\Users\dzikri\Downloads\Inpartner\web-scraping-contact\Pipeline AR-SR_Lengkap.xlsx"

def is_valid_email(e: str) -> bool:
    if not e or '@' not in e or '.' not in e:
        return False
    e_clean = re.sub(r'\(.*?\)', '', e).strip().lower()
    if re.search(r'@\d+\.\d+', e_clean):
        return False
    if any(j in e_clean for j in ['wix', 'sentry', 'example', 'domain', 'bootstrap', 'schema.org', 'wordpress', 'sandbox@', 'nama@', 'test@', 'yourname@', 'email.com', 'dummy@']):
        return False
    return True

def clean_email_string(email_str: str, corsec_email: str = None) -> str:
    """Removes npm package artifacts, mock emails, and adds/cleans corsec email."""
    if not isinstance(email_str, str):
        email_str = ""

    tokens = [t.strip() for t in email_str.split(';') if t.strip()]
    cleaned_tokens = []
    seen = set()

    # 1. Add/ensure Corsec email first if provided
    if corsec_email and is_valid_email(corsec_email):
        c_clean = corsec_email.strip().lower()
        seen.add(c_clean)
        cleaned_tokens.append(f"{c_clean} (Corsec)")

    # 2. Add existing tokens that pass validation
    for tok in tokens:
        raw_e = re.sub(r'\(.*?\)', '', tok).strip().lower()
        if is_valid_email(tok) and raw_e not in seen:
            seen.add(raw_e)
            cleaned_tokens.append(tok)

    return "; ".join(cleaned_tokens)

def fetch_batch_fresh(playwright_inst, codes):
    browser = playwright_inst.chromium.launch(headless=True)
    page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    try:
        page.goto("https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat", wait_until="domcontentloaded", timeout=30000)
        time.sleep(1.2)
    except Exception:
        pass

    results = {}
    for c in codes:
        try:
            res = page.evaluate("""async (code) => {
                const r = await fetch(`https://www.idx.co.id/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten=${code}&language=id-id`);
                if (!r.ok) return { ok: false, status: r.status };
                const j = await r.json();
                const sek = (j.Sekretaris && j.Sekretaris.length > 0) ? j.Sekretaris[0] : {};
                const prof = (j.Profiles && j.Profiles.length > 0) ? j.Profiles[0] : {};
                return {
                    ok: true,
                    code: code,
                    corsec_nama: (sek.Nama || '').trim(),
                    corsec_email: (sek.Email || '').trim(),
                    corsec_telp: (sek.Telepon || '').trim(),
                    corsec_hp: (sek.HP || '').trim(),
                    address: prof.Alamat || '',
                    phone: prof.Telepon || '',
                    email: prof.Email || ''
                };
            }""", c)
            if res.get("ok"):
                results[c] = res
        except Exception:
            pass
        time.sleep(0.08)

    browser.close()
    return results

def run_enrichment():
    print("=" * 70)
    print("  COMPREHENSIVE CORPORATE SECRETARY ENRICHMENT & DATA REFINEMENT  ")
    print("=" * 70)

    # 1. Load Excel
    df = pd.read_excel(EXCEL_PATH)
    print(f"Loaded Excel with {len(df)} rows.")

    # 2. Load Details Cache
    cache = {}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)

    all_tickers = df['Kode Emiten'].dropna().str.strip().str.upper().unique().tolist()
    missing_tickers = [t for t in all_tickers if not cache.get(t, {}).get('corsec_nama')]
    print(f"Total tickers: {len(all_tickers)} | With Corsec in cache: {len(all_tickers) - len(missing_tickers)} | Missing: {len(missing_tickers)}")

    # 3. Batch fetch in fresh sessions
    if missing_tickers:
        batch_size = 20
        with sync_playwright() as p:
            pbar = tqdm(total=len(missing_tickers), desc="Fetching Corsec PICs", unit="ticker")
            for i in range(0, len(missing_tickers), batch_size):
                chunk = missing_tickers[i:i + batch_size]
                batch_res = fetch_batch_fresh(p, chunk)
                for code, data in batch_res.items():
                    cache[code] = data
                pbar.update(len(chunk))

                # Save cache after each chunk
                with open(CACHE_FILE, "w", encoding="utf-8") as f:
                    json.dump(cache, f, ensure_ascii=False, indent=2)

                time.sleep(0.5)
            pbar.close()

    # 4. Apply all enriched Corsec details and clean emails
    print("Applying enriched data to DataFrame and cleaning email artifacts...")
    for idx, row in df.iterrows():
        ticker = str(row.get('Kode Emiten', '')).strip().upper()
        detail = cache.get(ticker, {})

        # Corsec Name
        corsec_nama = detail.get('corsec_nama', '')
        if corsec_nama:
            df.at[idx, 'Nama Corporate Secretary'] = corsec_nama

        # Clean and update emails
        existing_email = str(row.get('Email Perusahaan', ''))
        corsec_email = detail.get('corsec_email', '')
        cleaned_email = clean_email_string(existing_email, corsec_email)
        df.at[idx, 'Email Perusahaan'] = cleaned_email

        # If phone is empty, check detail
        existing_phone = str(row.get('No. Telepon', '')).strip()
        if not existing_phone or existing_phone == 'nan':
            p_cand = detail.get('phone') or detail.get('corsec_telp') or detail.get('corsec_hp', '')
            if p_cand:
                df.at[idx, 'No. Telepon'] = p_cand

    # 5. Save styled Excel files
    from main import style_and_save_excel
    style_and_save_excel(df, EXCEL_PATH)
    print(f"[SUCCESS] Saved final updated file to: {EXCEL_PATH}")

    try:
        style_and_save_excel(df, DEST_PATH)
        print(f"[SUCCESS] Saved copy to: {DEST_PATH}")
    except Exception as e:
        print(f"[Warning] Failed to copy to {DEST_PATH}: {e}")

    # Summary
    total = len(df)
    with_code = len(df[df['Kode Emiten'].fillna('').str.strip() != ''])
    with_email = len(df[df['Email Perusahaan'].fillna('').str.strip() != ''])
    with_phone = len(df[df['No. Telepon'].fillna('').str.strip() != ''])
    with_corsec = len(df[df['Nama Corporate Secretary'].fillna('').str.strip() != ''])
    with_socials = len(df[df['Sosial Media'].fillna('').str.strip() != ''])
    with_website = len(df[df['Website'].fillna('').str.strip() != ''])

    print("\n" + "=" * 70)
    print("  FINAL ENRICHMENT SUMMARY STATISTICS  ")
    print("=" * 70)
    print(f"Total Emiten Diproses    : {total}")
    print(f"Kode Emiten (IDX Ticker) : {with_code}/{total} ({with_code/total*100:.1f}%)")
    print(f"Corporate Secretary PIC  : {with_corsec}/{total} ({with_corsec/total*100:.1f}%)")
    print(f"Email Perusahaan         : {with_email}/{total} ({with_email/total*100:.1f}%)")
    print(f"Nomor Telepon Kantor     : {with_phone}/{total} ({with_phone/total*100:.1f}%)")
    print(f"Website Resmi            : {with_website}/{total} ({with_website/total*100:.1f}%)")
    print(f"Akun Sosial Media        : {with_socials}/{total} ({with_socials/total*100:.1f}%)")
    print("=" * 70)

if __name__ == "__main__":
    run_enrichment()
