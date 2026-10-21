import os
import sys
import re
import time
import shutil
import pandas as pd
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed

import config
from idx_service import IDXService
from fuzzy_matcher import FuzzyMatcher
from crawler import WebCrawler, normalize_url
from ddg_searcher import DDGFallbackSearcher

def format_emails(corsec_email: str, general_email: str, scraped_emails: set) -> str:
    """Formats emails prioritizing Corporate Secretary and official channels."""
    emails = []
    seen = set()

    def is_valid_email(e):
        if not e or '@' not in e or '.' not in e:
            return False
        e_low = e.lower()
        if re.search(r'@\d+\.\d+', e_low):
            return False
        if any(j in e_low for j in ['wix', 'sentry', 'example', 'domain', 'bootstrap', 'schema.org', 'wordpress', 'sandbox@', 'nama@', 'test@', 'yourname@', 'email.com', 'dummy@']):
            return False
        return True

    def add_email(e, label=""):
        if not is_valid_email(e):
            return
        e = e.strip().lower()
        if e not in seen:
            seen.add(e)
            emails.append(f"{e} ({label})" if label else e)

    # 1. Primary: Corsec email
    if corsec_email:
        add_email(corsec_email, "Corsec")

    # 2. General email from IDX
    if general_email:
        add_email(general_email, "Umum" if corsec_email else "")

    # 3. Scraped emails from official website
    if scraped_emails:
        for se in scraped_emails:
            if se not in seen:
                if any(k in se for k in ['corsec', 'secretar', 'sekretaris', 'investor', 'ir@']):
                    add_email(se, "Corsec/IR")
                elif len(emails) < 3:
                    add_email(se)

    return "; ".join(emails)

def format_phones(office_phone: str, corsec_phone: str, corsec_hp: str, scraped_phones: set) -> str:
    """Formats phone numbers cleanly."""
    phones = []
    seen = set()

    def add_phone(p, label=""):
        if not p:
            return
        p_clean = re.sub(r'[\r\n\t]+', ' ', p).strip()
        p_num = re.sub(r'[^0-9+]', '', p_clean)
        if len(p_num) >= 6 and p_num not in seen:
            seen.add(p_num)
            phones.append(f"{p_clean} ({label})" if label else p_clean)

    if office_phone:
        add_phone(office_phone, "Kantor Pusat")
    if corsec_phone:
        add_phone(corsec_phone, "Corsec")
    if corsec_hp:
        add_phone(corsec_hp, "HP Corsec")
    if scraped_phones:
        for sp in scraped_phones:
            if len(phones) < 3:
                add_phone(sp)

    return " | ".join(phones)

def format_socials(socials_dict: dict) -> str:
    """Formats social media dictionary into clean readable string."""
    if not socials_dict:
        return ""
    order = ['LinkedIn', 'Instagram', 'Facebook', 'Twitter / X', 'YouTube']
    parts = []
    for platform in order:
        if platform in socials_dict:
            parts.append(f"{platform}: {socials_dict[platform]}")
    for k, v in socials_dict.items():
        if k not in order:
            parts.append(f"{k}: {v}")
    return " | ".join(parts)

def clean_address(addr: str) -> str:
    if not addr:
        return ""
    lines = [line.strip() for line in re.split(r'[\r\n]+', addr) if line.strip()]
    return ", ".join(lines)

def style_and_save_excel(df: pd.DataFrame, output_path: str):
    """Saves DataFrame to Excel with formatted column widths."""
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name="Data Perusahaan")
        worksheet = writer.sheets["Data Perusahaan"]

        for col in worksheet.columns:
            max_len = 0
            col_letter = col[0].column_letter
            header = str(col[0].value or '')
            max_len = max(len(header), max_len)

            for cell in col[1:]:
                val_str = str(cell.value or '')
                if val_str:
                    line_lens = [len(line) for line in val_str.split('\n')]
                    max_len = max(max_len, max(line_lens) if line_lens else 0)

            col_width = min(max(max_len + 3, 12), 50)
            worksheet.column_dimensions[col_letter].width = col_width

def worker_enrich_website_and_social(task_data):
    """
    Executed concurrently in ThreadPoolExecutor for deep website crawling & DDG search.
    """
    idx, raw_name, matched_profile, detail = task_data
    crawler = WebCrawler(timeout=config.WEB_CRAWL_TIMEOUT)
    ddg_searcher = DDGFallbackSearcher() if config.DDG_FALLBACK_ENABLED else None

    kode_emiten = ""
    corsec_nama = ""
    corsec_email = ""
    corsec_telp = ""
    corsec_hp = ""
    general_email = ""
    office_phone = ""
    website_url = ""
    address = ""

    if matched_profile:
        kode_emiten = matched_profile.get('KodeEmiten', '')
        general_email = matched_profile.get('Email', '')
        office_phone = matched_profile.get('Telepon', '')
        website_url = matched_profile.get('Website', '')
        address = clean_address(matched_profile.get('Alamat', ''))

    if detail:
        if detail.get('corsec_nama'):
            corsec_nama = detail['corsec_nama']
        if detail.get('corsec_email'):
            corsec_email = detail['corsec_email']
        if detail.get('corsec_telp'):
            corsec_telp = detail['corsec_telp']
        if detail.get('corsec_hp'):
            corsec_hp = detail['corsec_hp']
        if not address and detail.get('address'):
            address = clean_address(detail['address'])
        if not office_phone and detail.get('phone'):
            office_phone = detail['phone']
        if not website_url and detail.get('website'):
            website_url = detail['website']
        if not general_email and detail.get('general_email'):
            general_email = detail['general_email']

    socials = {}
    scraped_emails = set()
    scraped_phones = set()

    # 1. DDG Fallback if website missing
    if not website_url and ddg_searcher:
        fallback_info = ddg_searcher.search_company_info(raw_name)
        if fallback_info.get('website'):
            website_url = fallback_info['website']
        if fallback_info.get('socials'):
            socials.update(fallback_info['socials'])
        if fallback_info.get('emails'):
            scraped_emails.update(fallback_info['emails'])

    # 2. Deep Web Crawling on official website
    if website_url:
        crawl_res = crawler.crawl(website_url)
        for k, v in crawl_res.get('socials', {}).items():
            if k not in socials:
                socials[k] = v
        scraped_emails.update(crawl_res.get('emails', set()))
        scraped_phones.update(crawl_res.get('phones', set()))

    # 3. DDG Fallback for social media if website didn't have social links
    if not socials and ddg_searcher:
        search_target = matched_profile.get('NamaEmiten', raw_name) if matched_profile else raw_name
        fallback_info = ddg_searcher.search_company_info(search_target)
        if fallback_info.get('socials'):
            socials.update(fallback_info['socials'])
        if fallback_info.get('emails'):
            scraped_emails.update(fallback_info['emails'])

    formatted_email = format_emails(corsec_email, general_email, scraped_emails)
    formatted_phone = format_phones(office_phone, corsec_telp, corsec_hp, scraped_phones)
    formatted_socials = format_socials(socials)
    normalized_site = normalize_url(website_url)

    return idx, {
        'Kode Emiten': kode_emiten,
        'Email Perusahaan': formatted_email,
        'No. Telepon': formatted_phone,
        'Website': normalized_site,
        'Alamat': address,
        'Nama Corporate Secretary': corsec_nama,
        'Sosial Media': formatted_socials
    }

class DataEnrichmentPipeline:
    def __init__(self, input_file=config.DEFAULT_INPUT_EXCEL, checkpoint_file=config.DEFAULT_CHECKPOINT_EXCEL, output_file=config.DEFAULT_OUTPUT_EXCEL):
        self.input_file = input_file
        self.checkpoint_file = checkpoint_file
        self.output_file = output_file
        self.idx_service = IDXService()
        self.matcher = None

    def initialize(self):
        print("=" * 70)
        print("  INPARTNER DATA ENRICHMENT PIPELINE - IDX & COMPANY INTELLIGENCE  ")
        print("=" * 70)
        print(f"Loading input file: {self.input_file}")
        
        print("Connecting to IDX service...")
        profiles = self.idx_service.fetch_all_profiles()
        print(f"Loaded {len(profiles)} listed company profiles from IDX.")

        print("Initializing Fuzzy Matcher engine...")
        self.matcher = FuzzyMatcher(profiles)
        print("Fuzzy Matcher ready.")

    def run(self):
        self.initialize()

        if os.path.exists(self.checkpoint_file):
            print(f"Found existing checkpoint file: {self.checkpoint_file}")
            df = pd.read_excel(self.checkpoint_file)
            print(f"Loaded checkpoint with {len(df)} rows.")
        else:
            df = pd.read_excel(self.input_file)
            print(f"Loaded fresh input file with {len(df)} rows.")

        for col in config.OUTPUT_COLUMNS:
            if col not in df.columns:
                df[col] = ""

        total_rows = len(df)
        unprocessed_indices = []

        for idx, row in df.iterrows():
            if pd.isna(row.get('Kode Emiten')) or not str(row.get('Kode Emiten', '')).strip():
                unprocessed_indices.append(idx)

        print(f"Total rows: {total_rows} | Already completed: {total_rows - len(unprocessed_indices)} | Remaining: {len(unprocessed_indices)}")

        if not unprocessed_indices:
            print("All rows are already completed in checkpoint!")
            self.finalize(df)
            return

        pbar = tqdm(total=len(unprocessed_indices), desc="Enriching Companies", unit="emiten")
        batch_size = config.CHECKPOINT_INTERVAL

        try:
            # Process in batches of 25 for checkpointing and parallel scraping
            for b_start in range(0, len(unprocessed_indices), batch_size):
                b_indices = unprocessed_indices[b_start:b_start + batch_size]
                
                # 1. Main thread: match names and retrieve IDX Corsec details
                batch_tasks = []
                for idx in b_indices:
                    row = df.loc[idx]
                    raw_name = str(row['Nama Perusahaan']) if pd.notna(row['Nama Perusahaan']) else ""
                    matched_profile, score, method = self.matcher.match(raw_name, score_cutoff=config.FUZZY_SCORE_CUTOFF)

                    detail = {}
                    if matched_profile:
                        ticker = matched_profile.get('KodeEmiten', '')
                        detail = self.idx_service.get_company_detail(ticker)

                    batch_tasks.append((idx, raw_name, matched_profile, detail))

                # 2. Parallel thread workers: crawl websites & social media
                with ThreadPoolExecutor(max_workers=config.MAX_CRAWL_WORKERS) as executor:
                    futures = [executor.submit(worker_enrich_website_and_social, task) for task in batch_tasks]
                    for future in as_completed(futures):
                        try:
                            idx, enriched_data = future.result()
                            for col_name, col_val in enriched_data.items():
                                df.at[idx, col_name] = col_val
                            pbar.update(1)
                        except Exception as item_err:
                            print(f"\n[Warning] Error in worker task: {item_err}")
                            pbar.update(1)

                # 3. Checkpoint save after every batch of 25
                self.save_checkpoint(df)

        except KeyboardInterrupt:
            print("\n[Notice] Process interrupted by user. Saving current checkpoint...")
            self.save_checkpoint(df)
            sys.exit(0)
        except Exception as e:
            print(f"\n[Error] Exception during processing: {e}")
            self.save_checkpoint(df)
            raise e
        finally:
            pbar.close()
            self.idx_service.close()

        self.finalize(df)

    def save_checkpoint(self, df: pd.DataFrame):
        try:
            style_and_save_excel(df, self.checkpoint_file)
            self.idx_service.save_details_cache()
        except Exception as e:
            print(f"[Warning] Failed to save checkpoint: {e}")

    def finalize(self, df: pd.DataFrame):
        print("\n" + "=" * 70)
        print("  ENRICHMENT COMPLETE - SAVING FINAL EXCEL REPORTS  ")
        print("=" * 70)

        final_df = df[config.OUTPUT_COLUMNS]

        # 1. Save in scraper-company
        style_and_save_excel(final_df, self.output_file)
        print(f"[SUCCESS] Saved final output to: {self.output_file}")

        # 2. Save in web-scraping-contact
        try:
            style_and_save_excel(final_df, config.EXPORT_DEST_EXCEL)
            print(f"[SUCCESS] Saved copy to: {config.EXPORT_DEST_EXCEL}")
        except Exception as e:
            print(f"[Warning] Could not save copy to web-scraping-contact: {e}")

        total = len(final_df)
        with_code = len(final_df[final_df['Kode Emiten'].fillna('').str.strip() != ''])
        with_email = len(final_df[final_df['Email Perusahaan'].fillna('').str.strip() != ''])
        with_phone = len(final_df[final_df['No. Telepon'].fillna('').str.strip() != ''])
        with_corsec = len(final_df[final_df['Nama Corporate Secretary'].fillna('').str.strip() != ''])
        with_socials = len(final_df[final_df['Sosial Media'].fillna('').str.strip() != ''])
        with_website = len(final_df[final_df['Website'].fillna('').str.strip() != ''])

        print("\n--- Summary Statistics ---")
        print(f"Total Companies Processed : {total}")
        print(f"Kode Emiten (IDX Ticker)  : {with_code}/{total} ({with_code/total*100:.1f}%)")
        print(f"Corporate Secretary Name  : {with_corsec}/{total} ({with_corsec/total*100:.1f}%)")
        print(f"Email Perusahaan (Corsec) : {with_email}/{total} ({with_email/total*100:.1f}%)")
        print(f"Nomor Telepon Kantor      : {with_phone}/{total} ({with_phone/total*100:.1f}%)")
        print(f"Website Resmi             : {with_website}/{total} ({with_website/total*100:.1f}%)")
        print(f"Sosial Media Accounts     : {with_socials}/{total} ({with_socials/total*100:.1f}%)")
        print("=" * 70)

if __name__ == "__main__":
    pipeline = DataEnrichmentPipeline()
    pipeline.run()
