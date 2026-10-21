# IDX Listed Company Web Scraping & Data Enrichment Platform

Script Python modular dan enterprise-ready untuk melakukan web scraping, data enrichment, serta verifikasi kontak emiten Bursa Efek Indonesia (BEI / IDX) dari file Excel input `Pipeline AR-SR.xlsx`.

---

## 1. Arsitektur & Strategi Teknis

Sistem ini dirancang dengan pipeline multi-tier berkinerja tinggi:

1. **Primary Data Source (BEI / IDX Public Endpoints via Playwright):**
   - Menghubungkan sesi browser Chromium headless yang melewati proteksi Cloudflare Turnstile BEI secara otomatis.
   - Mengambil seluruh direktori profil perusahaan terbuka (`/primary/ListedCompany/GetCompanyProfiles?start=0&length=1500`).
   - Mengambil informasi detail per emiten (`/primary/ListedCompany/GetCompanyProfilesDetail?KodeEmiten={KODE}&language=id-id`), termasuk identitas **Corporate Secretary** (Nama PIC, Email, Telepon, HP).
   - Dilengkapi caching lokal (`all_profiles.json` dan `idx_details_cache.json`) agar data tidak perlu diunduh berulang-ulang.

2. **Fuzzy String Matching (`rapidfuzz`):**
   - Membersihkan prefiks dan sufiks perusahaan seperti `"PT"`, `"PT."`, `"Persero"`, `"Tbk."`, `"Tbk"`, `"Tb"`, serta tanda baca.
   - Menggunakan kombinasi `fuzz.token_set_ratio` dan `fuzz.token_sort_ratio` untuk menangani nama yang terpotong di akhir (misalnya `"NexAI Digital Infrastruktur Tb"` -> `PT NexAI Digital Infrastruktur Tbk (MGLV)`).
   - Memiliki kamus alias historis untuk emiten yang berganti nama (misal `"Calculus Global Ventures Tbk"` -> `STAR`).

3. **Multi-Threaded Website & Deep Social Media Crawler (`curl_cffi` + `ThreadPoolExecutor`):**
   - Menjelajahi halaman utama situs resmi emiten dan sub-halaman kontak/tentang (`/contact`, `/about`).
   - Mengekstrak tautan media sosial resmi:
     - **LinkedIn** (`linkedin.com/company/...`)
     - **Instagram** (`instagram.com/...`)
     - **Facebook** (`facebook.com/...`)
     - **Twitter / X** (`twitter.com/...` / `x.com/...`)
     - **YouTube** (`youtube.com/...`)
   - Mengekstrak email tambahan dari tautan `mailto:` dan pola regex, dengan prioritas khusus untuk Corporate Secretary / Investor Relations.

4. **Fallback Web Search (`ddgs` / DuckDuckGo):**
   - Jika situs web tidak tercantum di IDX atau tautan media sosial tidak ditemukan pada halaman website, sistem secara otomatis melakukan query web search untuk menemukan akun media sosial resmi dan kontak pendukung.

5. **Reliability & Checkpointing:**
   - **Progress Bar Interaktif:** Dilengkapi `tqdm` yang menampilkan estimasi waktu selesai, kecepatan emiten per detik, dan metrik langsung.
   - **Auto-Save Checkpoint Setiap 25 Baris:** Disimpan ke `Pipeline AR-SR_checkpoint.xlsx`. Jika koneksi terputus atau komputer dimatikan, proses dapat dilanjutkan (*resume*) kapan saja tanpa mengulang dari awal.
   - **Excel Styling Otomatis:** Menghasilkan berkas Excel final `Pipeline AR-SR_Lengkap.xlsx` dengan lebar kolom yang rapi dan terformat profesional.

---

## 2. Struktur Modul Proyek

```
scraper-company/
├── config.py             # Konfigurasi path berkas, timeout, interval checkpoint, dan kolom output
├── idx_service.py        # Layanan API IDX via Playwright Chromium, handling rate-limit & caching
├── fuzzy_matcher.py      # Engine pencocokan nama perusahaan (rapidfuzz token ratio & aliases)
├── crawler.py            # High-speed web crawler dengan curl_cffi & BeautifulSoup
├── ddg_searcher.py       # Fallback search engine berbasis DuckDuckGo (ddgs)
├── main.py               # Main pipeline orchestrator, ThreadPoolExecutor & checkpointing
├── requirements.txt      # Daftar dependensi Python
├── all_profiles.json     # Cache 962 emiten BEI
├── idx_details_cache.json# Cache detail Corporate Secretary per emiten
└── README.md             # Dokumentasi teknis & panduan eksekusi
```

---

## 3. Instalasi & Persiapan (Windows)

Pastikan Python 3.10+ (atau Python 3.11 / 3.12 / 3.14) telah terpasang.

1. Buka terminal (PowerShell atau Command Prompt) pada direktori ini:
   ```powershell
   cd "c:\Users\dzikri\Downloads\Inpartner\scraper-company"
   ```

2. Pasang dependensi yang dibutuhkan:
   ```powershell
   pip install -r requirements.txt
   ```

3. Jika Playwright belum terpasang browser-nya, unduh Chromium headless:
   ```powershell
   playwright install chromium
   ```

---

## 4. Cara Menjalankan

Cukup jalankan perintah berikut:

```powershell
python main.py
```

### Opsi Lanjutan:
Jika proses terhenti di tengah jalan karena kendala jaringan atau pengguna menekan `Ctrl+C`:
Jalankan kembali `python main.py`. Sistem akan otomatis mendeteksi `Pipeline AR-SR_checkpoint.xlsx` dan melanjutkan proses dari baris terakhir yang belum selesai!

---

## 5. Struktur Kolom Output (`Pipeline AR-SR_Lengkap.xlsx`)

| No | Nama Kolom | Deskripsi |
|---|---|---|
| 1 | `No` | Nomor urut data input (1 - 962) |
| 2 | `Nama Perusahaan` | Nama perusahaan asli dari file input |
| 3 | `Potensi Produk` | Target penawaran produk (`AR-SR`) |
| 4 | `Kode Emiten` | Ticker 4 huruf BEI (misal: `BUKA`, `GOTO`, `BMHS`) |
| 5 | `Email Perusahaan` | Email Corporate Secretary & Email Umum resmi |
| 6 | `No. Telepon` | Nomor telepon kantor pusat & Corsec |
| 7 | `Website` | URL website resmi perusahaan |
| 8 | `Alamat` | Alamat kantor pusat lengkap emiten |
| 9 | `Nama Corporate Secretary` | Nama PIC Corsec resmi dari database BEI |
| 10 | `Sosial Media` | Tautan akun LinkedIn, Instagram, Facebook, X/Twitter, dll. |
