# Production Deployment Guide — Inpartner Article Generator

Dokumentasi teknis untuk proses deployment, konfigurasi server, manajemen dependency, dan pemeliharaan aplikasi **Inpartner Article Generator** di server hosting cPanel / CloudLinux (`1sLabs`).

---

## 1. Informasi Infrastruktur & Target Deployment

- **Domain Production:** `https://articlegenerator.1slabs.my.id`
- **Server SSH:** `u1zh8984@103.119.237.132`
- **Application Root (Document Root):** `/home/u1zh8984/public_html/articlegenerator.1slabs.my.id`
- **Python Version:** Python `3.11` (`/opt/alt/python311`)
- **Virtualenv Path:** `/home/u1zh8984/virtualenv/public_html/articlegenerator.1slabs.my.id/3.11`
- **Application Server / Gateway:** Phusion Passenger + `a2wsgi` (`ASGIMiddleware`) -> FastAPI (`api.main:app`)
- **Entry Point WSGI:** `passenger_wsgi.py` (`application`)
- **Database:** MySQL / MariaDB (`127.0.0.1:3306`, database `u1zh8984_article`)

---

## 2. Struktur Direktori Production

```text
/home/u1zh8984/public_html/articlegenerator.1slabs.my.id/
├── api/
│   ├── __init__.py
│   ├── main.py                # FastAPI application & core endpoints
│   ├── admin_routes.py        # Admin dashboard, SEO engine & automation API
│   ├── store_routes.py        # Inpartner Store pull/push integration API
│   ├── static/                # Static assets & uploaded images
│   └── templates/             # Jinja2 HTML templates (dashboard, article, admin, topic)
├── services/
│   ├── __init__.py
│   ├── llm_client.py          # Gemini API client (timeout, backoff, concurrency cap)
│   ├── research_engine.py     # Multi-query RSS/GNews discovery & batched fact extraction
│   ├── generator.py           # End-to-end article generation pipeline & job queue
│   ├── clustering.py          # Pure-Python semantic cosine similarity & clustering
│   ├── aggregator.py          # Bounded RSS & GNews headline aggregation
│   ├── seo_engine.py          # Deterministic Yoast SEO & readability auditing
│   ├── optimizer_service.py   # AI-assisted SEO revision generator
│   ├── export_service.py      # PDF, DOCX, HTML, Markdown exporter (with temp cleanup)
│   ├── wordpress_service.py   # WordPress REST API & Gutenberg publisher
│   ├── store_service.py       # Inpartner Digital Products Store connector
│   ├── scheduler_service.py   # APScheduler daily automation service
│   ├── analytics_service.py   # Internal & GA4/WP traffic analytics
│   ├── quota_service.py       # API quota & model telemetry tracker
│   ├── auth_service.py        # Admin session & password authentication
│   └── topic_service.py       # Automation topic preset management
├── tmp/
│   └── restart.txt            # Passenger restart trigger file
├── .env                       # Production environment variables (chmod 600)
├── .env.example               # Template variabel environment tanpa kredensial
├── .htaccess                  # Konfigurasi Passenger & proteksi file sensitif
├── database.py                # SQLAlchemy engine & connection pooling
├── models.py                  # ORM database schema
├── passenger_wsgi.py          # Entry point WSGI Passenger + thread limiter
└── requirements.txt           # Production Python dependencies
```

---

## 3. Konfigurasi cPanel Python Application Manager

Aplikasi dikelola melalui **cPanel → Setup Python App (`cloudlinux-selector`)** dengan parameter:

- **Python Version:** `3.11`
- **Application Root:** `public_html/articlegenerator.1slabs.my.id`
- **Application URL:** `articlegenerator.1slabs.my.id/`
- **Application Startup File:** `passenger_wsgi.py`
- **Application Entry Point:** `application`

### Perintah CLI Registrasi Aplikasi (Jika Membuat Ulang)
```bash
cloudlinux-selector create \
  --json \
  --interpreter python \
  --domain articlegenerator.1slabs.my.id \
  --app-root public_html/articlegenerator.1slabs.my.id \
  --app-uri / \
  --version 3.11 \
  --startup-file passenger_wsgi.py \
  --entry-point application
```

---

## 4. Instalasi & Update Dependency

Gunakan `pip` dari dalam virtual environment Python 3.11 milik aplikasi:

```bash
source /home/u1zh8984/virtualenv/public_html/articlegenerator.1slabs.my.id/3.11/bin/activate
cd /home/u1zh8984/public_html/articlegenerator.1slabs.my.id
pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt
```

---

## 5. Konfigurasi Environment (`.env`)

File `.env` diletakkan di `/home/u1zh8984/public_html/articlegenerator.1slabs.my.id/.env` dengan permission `600` (`chmod 600 .env`):

```ini
DATABASE_URL=mysql+pymysql://<DB_USER>:<DB_PASSWORD>@127.0.0.1:3306/<DB_NAME>?charset=utf8mb4
GEMINI_API_KEY=<REDACTED_GEMINI_API_KEY>
GNEWS_API_KEY=<REDACTED_GNEWS_API_KEY>
NEWSAPI_KEY=<REDACTED_NEWSAPI_KEY>

GENERATOR_PUBLIC_URL=https://articlegenerator.1slabs.my.id
STORE_INTEGRATION_KEY=<REDACTED_STORE_INTEGRATION_KEY>
STORE_API_URL=https://digitalproductinpartner.1slabs.my.id/api
STORE_FRONTEND_URL=https://digitalproductinpartner.1slabs.my.id

# Batas Concurrency & Timeout untuk Shared Hosting
MAX_CONCURRENT_GENERATIONS=2
MAX_CONCURRENT_LLM_CALLS=3
MAX_GENERATION_SECONDS=240
LLM_HTTP_TIMEOUT_MS=55000
MAX_PROMPT_CHARS=36000
ENABLE_AUTO_FETCH_LOOP=false
ENABLE_SCHEDULER=true
AUTO_OPTIMIZE_ON_GENERATE=false
```

---

## 6. Cara Restart Aplikasi

Setiap kali melakukan perubahan kode Python atau variabel `.env`, jalankan salah satu perintah berikut melalui SSH:

### Opsi 1 — Touch `tmp/restart.txt` (Standar Passenger)
```bash
mkdir -p /home/u1zh8984/public_html/articlegenerator.1slabs.my.id/tmp
touch /home/u1zh8984/public_html/articlegenerator.1slabs.my.id/tmp/restart.txt
```

### Opsi 2 — Menggunakan `cloudlinux-selector`
```bash
cloudlinux-selector restart --json --interpreter python --app-root public_html/articlegenerator.1slabs.my.id
```

---

## 7. Health Check & Monitoring

### Cek Status Kesehatan Aplikasi
```bash
curl -s https://articlegenerator.1slabs.my.id/health
```
Contoh respons sehat:
```json
{
  "status": "ok",
  "service": "inpartner-article-generator",
  "database": "connected",
  "generation_queue": {
    "active_jobs": 0,
    "max_concurrent": 2
  }
}
```

### Cek Log Error Passenger
```bash
tail -n 100 /home/u1zh8984/public_html/articlegenerator.1slabs.my.id/stderr.log
```

---

## 8. Troubleshooting

1. **Error `500 Internal Server Error` atau `503 Service Unavailable` saat Startup:**
   - Periksa `stderr.log` di direktori aplikasi.
   - Pastikan `OPENBLAS_NUM_THREADS=1` dan `OMP_NUM_THREADS=1` tetap berada di baris paling atas `passenger_wsgi.py` sebelum import modul lain agar tidak melanggar batas `RLIMIT_NPROC` CloudLinux.
2. **Database `OperationalError (2003, Can't connect to MySQL server)`:**
   - Pastikan host pada `DATABASE_URL` di server menggunakan `127.0.0.1:3306`.
   - Verifikasi status koneksi melalui endpoint `/health`.
3. **Proses Generate Artikel Mengalami Timeout / Gagal:**
   - Cek status artikel melalui `GET /api/article/{id}/status`.
   - Pastikan `GEMINI_API_KEY` aktif dan kuota RPM mencukupi. Sistem otomatis melakukan retry dengan exponential backoff dan fallback ke model kandidat berikutnya (`gemini-3.5-flash-lite` -> `gemini-3.5-flash` -> `gemini-3.6-flash` -> `gemini-3.1-flash-lite`).

