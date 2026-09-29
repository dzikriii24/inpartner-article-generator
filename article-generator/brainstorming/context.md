# 1. Definisi & Batasan Lingkup Konten

- **Kategori Konten**: Business & Investment (Makroekonomi, Pasar Saham, Crypto, Komoditas, IPO/M&A, Kebijakan Moneter/Fiskal, Geopolitik).
- **Kewilayahan**: Global dan Lokal (Indonesia).
- **Bahasa**: Bahasa Inggris (Tone formal/semi-formal, jurnalistik).
- **Aturan Batasan (Business Rules)**: Maksimal 5 artikel per hari (hard limit). Maksimal 1 artikel per topik/kategori per hari untuk menghindari repetisi berita. Sistem menggunakan zona waktu WIB.
- **Target Audiens & CTA**:
  - *Decision makers* (CEO, CFO, CSO, board) — time-poor, want credibility, proof, partner profiles. CTA: "Talk to a partner".
  - *Champions/influencers* (VP/Head of Strategy, Transformation, Digital, Ops) — main lead-gen target, actively research. CTA: "Download the report".
  - *Evaluators* (procurement, chief of staff, analysts) — want credentials & scope clarity. CTA: "Download company profile".
  - *Secondary*: investors (PE/VC), talent, media.

# 2. Sumber Data & Deteksi "Happening Topics"

- Sumber Prioritas: RSS feed media finansial (gratis & diutamakan).
- Sumber Sekunder & Sinyal: API berita (GNews, NewsAPI, Google Trends), API data pasar (Yahoo Finance, Alpha Vantage), monitoring media sosial/X untuk mendeteksi lonjakan diskusi.
- Mekanisme Agregasi: Sistem menormalisasi dan mendeduplikasi ribuan berita yang masuk secara lokal agar tidak membakar limit API dari LLM.
- Topic Clustering & Scoring: Mengelompokkan berita menjadi satu klaster, kemudian diberikan *Trend Score* berdasarkan volume, freshness, dan relevansi. Hanya Top 5 topik teratas yang akan diolah AI.

# 3. Arsitektur Pipeline Automasi

- Mode Operasi: Sistem dirancang dengan 2 mode yang dikontrol Admin: *Auto Schedule* (Otomatis) dan *Manual Generation* (Topik dipilih admin).
- Timeline Automasi Harian (Batch):
  - 01:00-04:00: Data Collection (Tarik RSS/API)
  - 04:00-05:00: Topic Clustering, Scoring & AI Research
  - 05:00-07:30: AI Generation (Drafting) & Fact-Checking
  - 08:00 WIB: Otomatis publish ke CMS.
- Orkestrasi: Memanfaatkan n8n sebagai pengatur alur, dipadukan dengan *custom script* berbasis Python (FastAPI).

# 4. Proses Generasi Konten dengan AI (Multi-Agent)

- Evidence-Based Grounding (Anti-Halusinasi): LLM dilarang keras mengarang data investasi. Ekstraksi fakta disimpan dalam satu Evidence Store. AI Writer diinstruksikan untuk menyusun artikel hanya bersumber dari *Evidence Store* tersebut.
- Prompt/Template Structure: Artikel distrukturisasi secara konsisten: Judul, Lead, Body (dengan sisipan data/angka riil pendukung), dan Kesimpulan/Insight.
- Orisinalitas & Gaya Bahasa: Terdapat prompt anti-plagiasi untuk memastikan AI tidak menjiplak sumber asli (demi SEO & Hak Cipta). Panjang artikel dan *tone* disesuaikan untuk level eksekutif.

# 5. Kualitas, Akurasi & Kepatuhan (Compliance)

- Automated Fact-Checking: Lapisan wajib tempat AI dan validator deterministik memverifikasi keakuratan angka-angka krusial (harga saham, suku bunga) sebelum draf lolos.
- Failure Handling: Jika sebuah draf gagal saat diuji *Fact-Check*, draf akan berstatus FAILED/Dibatalkan. Kualitas diutamakan: sistem tidak memaksakan tayang 5 artikel jika faktanya tidak solid.
- Disclaimer Hukum: Setiap akhir artikel wajib disuntikkan disclaimer "*not financial advice*" demi mematuhi standar OJK/SEC.
- Atribusi Sumber: Pencantuman referensi dan asal data ke situs publisher aslinya untuk menjaga tingkat kredibilitas.

# 6. SEO & Optimasi Publikasi

- Proses ini ditangani oleh modul spesifik di dalam pipeline.
- Riset *keyword* spesifik secara otomatis untuk setiap klaster topik.
- Men-generate struktur heading, *meta title*, dan *meta description* secara otomatis.
- Memasukkan *internal linking* ke artikel relevan yang sudah ada di dalam website kita.

# 7. Integrasi Publishing

- CMS Tujuan: WordPress (terintegrasi via REST API) atau Headless CMS pilihan.
- Format Output: HTML terformat, sudah beserta gambar pendukung (*featured image*).
- Penjadwalan Publish: Jika mode *Auto*, artikel yang berstatus *Ready* akan ditahan (*scheduled*) untuk dipublikasikan serentak pukul 08:00 WIB. Jika *Manual*, bisa diterbitkan seketika (*real-time*).

# 8. Monitoring & Iterasi

- Tracking Performa: Memantau *traffic* dan *engagement* artikel untuk mengidentifikasi kategori/topik mana yang paling sukses mengundang audiens.
- Error & Hallucination Logging: Sistem akan mencatat riwayat log kapan pun LLM melakukan kesalahan fakta atau gagal di tahap *Fact-Check*. Hal ini sangat penting untuk iterasi *prompt* di kemudian hari.
- Review Berkala: Memastikan akurasi konten yang telah tayang tidak menyesatkan pasar.

# 9. Tech Stack Keseluruhan (Arsitektur Akhir)

- Orchestrator: n8n dibantu dengan *cron job*.
- Backend API: Python dipadukan dengan framework FastAPI.
- Database: PostgreSQL menggunakan ekstensi `pgvector` (sangat krusial untuk *Topic Clustering* dan *similarity search*).
- Frontend / Admin UI: Menggunakan Streamlit (sebagai versi MVP/Prototype awal), dengan rencana migrasi ke Next.js / React (untuk versi skalabel produksi).
- Model AI: Gemini API (sebagai mesin generasi teks utama), dibantu modul *Sentence Transformers* (untuk embedding berita secara lokal tanpa biaya API LLM ekstra).
