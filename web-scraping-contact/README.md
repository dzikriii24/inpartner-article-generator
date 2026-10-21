# Inpartner Company Contact Intelligence & Data Enrichment Platform

Platform *Company Contact Intelligence* end-to-end untuk mencari, mengumpulkan, memvalidasi, memperkaya, menyimpan, dan mengekspor informasi kontak perusahaan (email, nomor telepon, WhatsApp, profil media sosial, dan alamat) berbasis nama perusahaan.

---

## 1. Arsitektur Sistem

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4.
  - UI/UX bergaya **Modern Glassmorphism SaaS**.
  - Dropzone upload file dengan ikon dokumen warna-warni dan tombol aksi gradien sesuai referensi desain.
  - Kompatibel dan siap di-deploy secara mandiri ke **Vercel**.
- **Backend API:** FastAPI (Python 3.11/3.14) + Uvicorn + SQLAlchemy ORM.
  - Arsitektur modular dan terpisah: Routers, Services, Providers, Database Models, Background Worker.
- **Database:** MySQL 8.0 (Remote Cloud Database `u1zh8984_article`) menggunakan driver `PyMySQL` dengan connection pool pre-ping dan auto-recycle.
- **Search & Scraping Engine (Multi-Tier):**
  - **Tier 1 (Official Structured):** Wikipedia REST API untuk mengekstrak infobox resmi (nama resmi, situs web resmi, alamat kantor pusat, industri, dan pimpinan).
  - **Tier 2 (Web Discovery):** Bing Web Search Scraper dengan decoding redirect URL untuk menemukan halaman `Contact Us`, `About`, dan `Investor Relations`.
  - **Tier 3 (Deep Web Scraping):** Scraper berbasis `BeautifulSoup` & `Requests` yang merayapi domain resmi perusahaan, mengekstrak tautan `mailto:`, `tel:`, tautan WhatsApp (`wa.me`), tautan LinkedIn, Instagram, Facebook, dan YouTube.
  - **Tier 4 (Grounded AI Synthesis):** Google Gemini AI (`gemini-3.5-flash-lite` dengan fallback `gemini-3.8-flash`) untuk merekonsiliasi entitas, mengklasifikasikan departemen kontak (Sales, Procurement, PR, General), dan menilai tingkat keyakinan (confidence score) berdasarkan bukti aktual tanpa halusinasi data.
- **Excel Pipeline & Background Jobs:**
  - Pemrosesan berkas Excel (`.xlsx`, `.xls`) menggunakan `openpyxl`.
  - Auto-detection kolom nama perusahaan (misal: "Nama Perusahaan" pada `Pipeline AR-SR.xlsx`).
  - Worker asynchronous berbasis thread manager dengan kontrol jeda/batal (*pause/cancel*), pelacakan progres real-time, isolasi kegagalan per baris, dan retry baris gagal.
  - Generator ekspor Excel multi-sheet profesional:
    - **Sheet 1:** *Company Overview* (Ringkasan identitas perusahaan, situs web, industri, alamat, kontak primer, confidence score).
    - **Sheet 2:** *Contact Details* (Daftar seluruh kontak terstruktur per baris dengan tipe, nilai, URL sumber, jenis sumber, dan status verifikasi).
    - Dilengkapi autofilter, freeze panes baris judul, styling warna header Inpartner, zebra striping, hyperlink aktif, dan format nomor telepon sebagai teks agar digit `0` dan `+62` tidak terpotong.

---

## 2. Struktur Direktori

```
web-scraping-contact/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── companies.py        # CRUD perusahaan, kontak manual, re-enrichment
│   │   │   ├── search.py           # Pencarian manual single/batch & riwayat pencarian
│   │   │   ├── imports.py          # Upload Excel, preview kolom, batch processing & retry
│   │   │   ├── exports.py          # Ekspor Excel multi-sheet & unduhan file
│   │   │   ├── stats.py            # KPI dashboard & ringkasan aktivitas
│   │   │   └── settings.py         # Status koneksi MySQL, Gemini AI, & provider pencarian
│   │   ├── core/
│   │   │   ├── config.py           # Konfigurasi aplikasi dari environment variable
│   │   │   └── database.py         # SQLAlchemy engine, session maker, & init_db
│   │   ├── models/
│   │   │   └── schema.py           # Model ORM: Company, CompanyContact, SearchHistory,
│   │   │                           # ImportBatch, ImportBatchItem, ContactExport
│   │   ├── services/
│   │   │   ├── providers/
│   │   │   │   ├── base.py         # Interface provider pencarian
│   │   │   │   ├── bing_provider.py# Scraper pencarian web Bing & URL decoder
│   │   │   │   ├── wikipedia_provider.py # Ekstraktor infobox terstruktur Wikipedia
│   │   │   │   ├── web_scraper.py  # Crawler homepage & subpage kontak perusahaan
│   │   │   │   └── gemini_ai.py    # Grounded entity synthesis via Google GenAI SDK
│   │   │   ├── contact_extractor.py# Ekstraksi regex nomor telepon, email, WA, sosmed
│   │   │   ├── search_engine.py    # Master orchestrator multi-tier enrichment pipeline
│   │   │   ├── excel_processor.py  # Inspeksi file, auto-detect kolom, & sheet preview
│   │   │   └── export_service.py   # Generator workbook Excel 2-sheet terformat rapi
│   │   ├── workers/
│   │   │   └── batch_worker.py     # Background worker thread & queue manager
│   │   └── main.py                 # FastAPI application, CORS middleware, & routes
│   ├── uploads/                    # Direktori penyimpanan berkas Excel upload
│   ├── exports/                    # Direktori penyimpanan berkas Excel hasil ekspor
│   ├── requirements.txt            # Dependensi Python backend
│   └── run.py                      # Skrip peluncur uvicorn server
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Navigasi sidebar glassmorphism
│   │   │   ├── Topbar.tsx          # Topbar breadcrumb & status backend
│   │   │   └── UploadModal.tsx     # Modal upload dokumen dengan styling referensi
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # KPI cards, quick search, recent feeds
│   │   │   ├── CompanySearch.tsx   # Form pencarian manual single & batch, contact cards
│   │   │   ├── ExcelImport.tsx     # Wizard import Excel, column mapping, live monitor
│   │   │   ├── CompaniesDatabase.tsx # Tabel direktori seluruh perusahaan & modal detail
│   │   │   ├── SearchHistory.tsx   # Riwayat pencarian manual & re-search action
│   │   │   ├── ImportHistory.tsx   # Riwayat batch upload Excel & progres
│   │   │   ├── ExportHistory.tsx   # Riwayat berkas ekspor Excel & tautan unduh
│   │   │   └── Settings.tsx        # Status sistem, database latency, AI provider
│   │   ├── services/
│   │   │   └── api.ts              # Typed API client untuk semua endpoint
│   │   ├── App.tsx                 # Routing & state controller utama
│   │   ├── index.css               # Design tokens glassmorphism & Tailwind styles
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts              # Konfigurasi Vite & proxy dev server
│   ├── vercel.json                 # Konfigurasi SPA routing untuk deployment Vercel
│   └── .env.example
├── .env                            # Kredensial backend (MySQL & Gemini API Key)
├── Pipeline AR-SR.xlsx             # File referensi dataset (962 perusahaan)
└── README.md
```

---

## 3. Konfigurasi Environment Variable

### Backend (`.env` di root direktori)

```env
DATABASE_URL=mysql+pymysql://<user_db>:<password>@194.233.65.45:3306/u1zh8984_article?charset=utf8mb4
GEMINI_API_KEY=<gemini_api_key_anda>
PORT=8002
HOST=127.0.0.1
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://*.vercel.app
```

> **Catatan Keamanan:** Nilai kredensial database dan API key tidak disimpan pada frontend dan tidak dicetak pada log.

### Frontend (`frontend/.env`)

```env
# Biarkan kosong saat pengembangan lokal (otomatis menggunakan proxy Vite ke backend port 8002)
# Isi dengan domain API backend publik saat deploy frontend ke Vercel:
VITE_API_URL=https://api-contact.inpartner.id
```

---

## 4. Cara Menjalankan Secara Lokal

### Menjalankan Backend API

1. Masuk ke environment python:
   ```bash
   cd C:\Users\dzikri\Downloads\Inpartner\web-scraping-contact\backend
   & "C:\Users\dzikri\Downloads\Inpartner\article-generator\project\venv\Scripts\python.exe" run.py
   ```
2. Backend akan aktif di `http://127.0.0.1:8002`.
3. Dokumentasi interaktif Swagger API dapat diakses di `http://127.0.0.1:8002/docs`.

### Menjalankan Frontend Web

1. Masuk ke direktori `frontend`:
   ```bash
   cd C:\Users\dzikri\Downloads\Inpartner\web-scraping-contact\frontend
   npm run dev
   ```
2. Frontend akan aktif di `http://127.0.0.1:5173/`.

---

## 5. Panduan Deployment

### Deployment Frontend ke Vercel

Frontend dikonfigurasi secara mandiri dan siap dideploy langsung ke Vercel:
1. Hubungkan repository ke Vercel.
2. Atur **Root Directory** ke `frontend`.
3. Framework Preset: **Vite**.
4. Build Command: `npm run build` (output directory: `dist`).
5. Tambahkan Environment Variable di dashboard Vercel:
   - `VITE_API_URL`: URL backend API publik Anda (contoh: `https://api.inpartner.id`).
6. Deploy! Berkas `vercel.json` sudah menyediakan konfigurasi rewrite untuk SPA routing.

### Deployment Backend ke Server / Cloud VM

1. Salin folder proyek dan berkas `.env` ke server.
2. Pasang dependensi: `pip install -r backend/requirements.txt`.
3. Jalankan server menggunakan supervisor, systemd, atau Docker:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8002 --workers 4
   ```
4. Hubungkan domain backend ke port 8002 melalui Nginx reverse proxy dengan HTTPS.
