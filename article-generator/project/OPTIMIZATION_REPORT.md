# Optimization & Performance Audit Report — Inpartner Article Generator

Laporan teknis audit arsitektur, analisis akar masalah (*root-cause analysis*), optimasi penggunaan memori/CPU, optimasi pipeline AI Gemini, serta hasil benchmark produksi pada `https://articlegenerator.1slabs.my.id`.

---

## 1. Ringkasan Eksekutif

Sebelum optimasi, aplikasi mengalami kegagalan proses (*crash* `SIGSEGV`), *request timeout* (HTTP 500/504), serta terputusnya proses generate di tengah jalan pada lingkungan shared hosting cPanel / CloudLinux (`1sLabs`).

Melalui audit menyeluruh pada kode aplikasi dan log server (`stderr.log`), ditemukan **5 akar masalah kritis** dan seluruhnya telah diperbaiki secara permanen:

1. **Crash `SIGSEGV` & Exhaustion Thread (`RLIMIT_NPROC`) akibat `scikit-learn` / `scipy` / `OpenBLAS`:**
   - Import `from sklearn.metrics.pairwise import cosine_similarity` memicu inisialisasi `OpenBLAS` yang mencoba membuat **24 thread per worker** (`blas_thread_init: pthread_create failed for thread 12 of 24: Resource temporarily unavailable`), melampaui batas proses CloudLinux dan menyebabkan worker mati dengan `signal 11 (SIGSEGV)`.
   - **Solusi:** Menghapus ketergantungan `scikit-learn`, `scipy`, `torch`, dan `sentence-transformers` serta menggantinya dengan fungsi kalkulasi *cosine similarity* murni berbasis `math.sqrt` di Python (`services/clustering.py`), ditambah pembatasan `OPENBLAS_NUM_THREADS=1` dan `OMP_NUM_THREADS=1` di `passenger_wsgi.py` dan `job_runner.py`. Menghemat **>600 MB RAM** dan menurunkan jumlah thread per worker dari **24+ menjadi 3–4 thread**.
2. **Perilaku LiteSpeed `lswsgi` Prefork yang Menghentikan Thread Background:**
   - Pada lingkungan LiteSpeed WSGI (`lswsgi`), pembuatan `ASGIMiddleware` pada waktu import modul sebelum `os.fork()` menyebabkan thread event loop `asyncio` mati pada proses anak, dan thread `daemon=True` untuk generate artikel ikut dihentikan ketika respons HTTP selesai.
   - **Solusi:** Mengimplementasikan inisialisasi singleton `ASGIMiddleware` berbasis **per-worker PID** (`_wsgi_pid == os.getpid()`) di `passenger_wsgi.py`, serta mengeksekusi tugas generate artikel melalui **Detached Background Job Runner (`job_runner.py`)** yang dilindungi oleh *cross-process file lock* (`fcntl.flock`) dengan batas concurrency maksimal (`MAX_CONCURRENT_GENERATIONS=2`). Setelah proses generate selesai, proses `job_runner.py` langsung keluar (*exit*) sehingga **100% RAM proses generate dikembalikan ke OS (0.0 MB saat idle)**.
3. **Putusnya Koneksi MySQL (`OperationalError 2006: MySQL server has gone away`):**
   - Pipeline lama menahan transaksi database terbuka (`db.flush()`) sambil menjalankan *web scraping* puluhan halaman dan pemanggilan LLM Gemini selama puluhan detik, sehingga MySQL memutus koneksi yang dianggap idle.
   - **Solusi:** Mengatur `expire_on_commit=False`, melakukan seluruh operasi jaringan (RSS, scraping, embedding, dan LLM) di memori terlebih dahulu tanpa menahan transaksi database, serta menggunakan helper `safe_commit(db, release_conn=True)` yang langsung melepas koneksi ke pool setiap selesai menulis status.
4. **Bottleneck Latensi & Rate-Limit (429) pada Pipeline Riset & Ekstraksi Fakta:**
   - Pipeline lama melakukan **12 pemanggilan LLM secara sekuensial** (1 per sumber berita) dan melakukan *scraping* hingga 35 halaman web tanpa batas ukuran respons.
   - **Solusi:** Menggabungkan ekstraksi fakta menjadi **Batch LLM Extraction** (4 sumber per panggilan LLM, memangkas panggilan LLM sebesar ~75%), membatasi pencarian ke maksimal 3 kueri utama & 8 sumber berkualitas, menerapkan *connection pooling* (`requests.Session` + `HTTPAdapter`), membatasi ukuran unduhan HTML maksimal **512 KB** dengan timeout **6 detik**, dan menutup koneksi serta membersihkan DOM (`soup.decompose()`) di blok `finally`.
5. **Kebocoran File Sementara (*Temporary File Leak*) pada Ekspor PDF:**
   - Fungsi `export_pdf` di `services/export_service.py` menyimpan file gambar sementara (`pdf_img_<uuid>.jpg/png`) di `/tmp` tanpa pernah menghapusnya.
   - **Solusi:** Melacak seluruh file sementara yang dibuat selama pembuatan PDF dan menghapusnya secara otomatis di dalam blok `finally` setelah `doc.build()` selesai.

---

## 2. Daftar File yang Diubah & Ditambahkan

| File | Perubahan & Optimasi |
| :--- | :--- |
| `passenger_wsgi.py` | Pembatasan thread BLAS/OpenMP (`=1`), per-PID singleton `ASGIMiddleware` (fork-safe untuk LiteSpeed `lswsgi`), dan one-time startup marker. |
| `job_runner.py` | **[Baru]** Detached background worker untuk eksekusi job generate artikel & agregasi RSS dengan *cross-process file lock* (`ConcurrencySlotLock`) dan *zero idle memory footprint*. |
| `database.py` | Konfigurasi SQLAlchemy connection pool (`pool_size=3`, `max_overflow=5`, `pool_recycle=60`, `pool_pre_ping=True`, `expire_on_commit=False`) dan fungsi `safe_commit()`. |
| `services/llm_client.py` | Timeout HTTP terkontrol (`55000 ms`), semaphore concurrency (`MAX_CONCURRENT_LLM_CALLS=3`), *exponential backoff with jitter* untuk 429/5xx, *auto-reset* client saat `SSLError`/`EOF`, pembatasan panjang prompt (`36.000` karakter), dan sanitasi API key pada log error. |
| `services/research_engine.py` | Penghapusan `scikit-learn`/`numpy`, *connection pooling* `requests.Session`, batas ukuran HTML `512 KB` (`timeout=6s`), *batched fact extraction* (4 sumber/panggilan), *single-call batch embedding*, dan pemisahan transaksi DB dari operasi jaringan. |
| `services/clustering.py` | Penggantian `sklearn.metrics.pairwise.cosine_similarity` dan `numpy` dengan fungsi `cosine_sim()` murni berbasis Python `math.sqrt` serta pembatasan batch `.limit(120)`. |
| `services/generator.py` | Integrasi `safe_commit()`, pencegahan eksekusi ulang ekstraksi fakta pada sumber lama, *timeout guard* per tahapan (`MAX_GENERATION_SECONDS=240`), dan `gc.collect()` eksplisit. |
| `services/aggregator.py` | Penggunaan `requests.Session` ber-timeout untuk RSS, penurunan `ThreadPoolExecutor(max_workers=2)`, pembatasan item per batch, dan pembersihan memori (`gc.collect()`). |
| `services/export_service.py` | Penutupan handle `Image.open` secara eksplisit dan penghapusan otomatis file gambar sementara (`temp_files_to_clean`) di blok `finally` setelah ekspor PDF. |
| `api/main.py` | Penambahan endpoint `GET /health` & `GET /api/health`, validasi panjang prompt (`3–2000` karakter), deduplikasi job yang sedang berjalan, integrasi `_spawn_detached_job()`, dan mount `/inpartner/static`. |
| `requirements.txt` | Penghapusan library berat yang tidak terpakai (`torch`, `sentence-transformers`, `scikit-learn`, `psycopg2-binary`, `pgvector`) dan penetapan versi dependency produksi yang ringan. |

---

## 3. Hasil Benchmark Produksi (`articlegenerator.1slabs.my.id`)

Pengujian dilakukan secara langsung pada server produksi (`103.119.237.132` / `https://articlegenerator.1slabs.my.id`) menggunakan Python 3.11:

| Metrik Pengujian | Sebelum Optimasi | Sesudah Optimasi |
| :--- | :--- | :--- |
| **Status Worker Saat Startup** | Sering crash (`SIGSEGV` / `pthread_create failed` 24 threads) | **Stabil (`HTTP 200 OK`, 3–4 threads per worker)** |
| **RAM Worker WSGI (Baseline / Idle)** | > 450 MB – 750+ MB (akibat `sklearn`/`scipy`/leak) | **125.5 MB – 131.9 MB** |
| **RAM Saat Proses Generate Berjalan** | Tidak terkontrol / OOM | **WSGI: 131.9 MB \| Job Runner: 35.5 MB – 110.3 MB** |
| **RAM Setelah Generate Selesai** | Bertahan tinggi di memori worker | **WSGI: 131.9 MB \| Job Runner: 0.0 MB (100% dibebaskan)** |
| **Waktu Respons `GET /health` (Warm)** | N/A | **~0.08s – 0.15s (`HTTP 200 OK`)** |
| **Waktu Respons `GET /` (Dashboard)** | Sering timeout (`>300s`) | **0.64 detik (`HTTP 200 OK`)** |
| **Waktu Respons `GET /api/usage/status`** | Lambat / gagal koneksi DB | **0.068 detik (`HTTP 200 OK`)** |
| **Validasi Input Prompt Kosong/Pendek** | Tidak divalidasi di awal | **HTTP 400 (`Prompt must be at least 3 characters.`)** |
| **Pencegahan Duplikasi Job Bersamaan** | Membuat job & thread duplikat tanpa batas | **Aktif (`{"deduplicated": true, "article_id": 72}`)** |
| **End-to-End Generate Artikel Riset (#72)** | Gagal / Timeout (`MySQL server has gone away`) | **Berhasil (`status=READY`, 136.8 detik, lengkap dengan fakta & audit SEO)** |
| **Render Halaman Artikel (`GET /article/72`)** | - | **HTTP 200 OK (263.650 bytes)** |
| **Ekspor PDF (`GET /api/article/72/export/pdf`)** | Meninggalkan file sampah di `/tmp` | **HTTP 200 OK (20.124 bytes, file `/tmp` bersih)** |

---

## 4. Rekomendasi Lanjutan

1. **Monitoring Kuota Gemini API:** Gunakan panel status kuota di dashboard utama untuk memantau RPM/RPD. Jika trafik meningkat drastis, variabel `MAX_CONCURRENT_GENERATIONS` pada `.env` tetap disarankan pada angka `2` untuk menjaga batas memori CloudLinux.
2. **Pembersihan Log Berkala:** File `stderr.log` dapat dirotasi atau dikosongkan secara berkala jika ukurannya melampaui 10 MB.
3. **Penjadwalan Otomatis (Automation):** Apabila fitur *Daily Article Automation* diaktifkan melalui `/admin`, pertimbangkan juga opsi pemicu via *cPanel Cron Job* (`curl -s https://articlegenerator.1slabs.my.id/...`) pada jam terjadwal agar tidak bergantung pada worker WSGI yang sedang tidur (*idle*).

