# PROJECT CONTEXT

## 1. Project Overview
Platform otomasi pembuatan artikel berita berbasis AI yang difokuskan pada niche **Business & Investment** (Makroekonomi, Pasar Saham, Crypto, Komoditas, IPO/M&A, Kebijakan Moneter/Fiskal, dan Perkembangan Geopolitik). Fokus kewilayahan mencakup **Global dan Lokal (Indonesia)** dengan bahasa pengantar **Bahasa Inggris**. Sistem ini dirancang menggunakan arsitektur *Evidence-based* (Data → Evidence → Analysis → Generation → Verification) untuk memastikan artikel yang dihasilkan akurat, faktual, dan terhindar dari halusinasi data.

## 2. Project Goals
- Mengotomatisasi riset dan pembuatan artikel berita finansial secara komprehensif tanpa mengorbankan akurasi.
- Mencegah halusinasi AI dalam menyajikan angka investasi atau fakta ekonomi melalui penggunaan *Evidence Store* dan agen verifikasi otomatis.
- Menjaga standar kualitas dan orisinalitas konten untuk kebutuhan SEO, serta menghindari isu pelanggaran hak cipta hukum.

## 3. Target Audiences & Users
Sistem dirancang untuk menyajikan konten berbobot bagi target audiens spesifik berikut:
- **Decision Makers** (CEO, CFO, CSO, Board): Audiens yang *time-poor*, mencari kredibilitas, bukti/fakta, dan profil institusi terpercaya. (*Call to Action* utama: "Talk to a partner").
- **Champions / Influencers** (VP/Head of Strategy, Transformation, Digital, Ops): Target *lead-gen* utama yang aktif melakukan riset. (*Call to Action* utama: "Download the report").
- **Evaluators** (Procurement, Chief of Staff, Analysts): Audiens yang mencari kejelasan lingkup (*scope*) dan kredibilitas teknikal. (*Call to Action* utama: "Download company profile").
- **Secondary Audience**: Investor (PE/VC), talent, media.
- **Admin**: *User* internal yang memiliki kontrol penuh atas platform (mengatur mode Auto/Manual, menentukan topik, menyalakan/mematikan *scheduler*).

## 4. Core Features
- **News Aggregation Layer**: Mengumpulkan berita dari berbagai sumber tanpa membebani biaya API (memprioritaskan RSS Feeds media finansial, GNews, NewsAPI, Google Trends, API data pasar seperti Yahoo Finance/Alpha Vantage, dan Monitoring Social Media/X untuk topik viral).
- **Topic Clustering & Scoring**: Mengelompokkan berita serupa, mendeteksi topik *trending* berdasarkan volume, serta memfilter duplikasi/*freshness* agar topik yang sama tidak diproses berulang.
- **AI Article Generation**: Menggunakan AI untuk Riset, Penulisan draf berbasis template, *Fact-Checker*, dan Optimasi SEO.
- **Automated Fact-Checking & Compliance**: Validasi fakta otomatis, pencantuman atribusi sumber, dan penyematan *disclaimer* hukum.
- **Scheduler & Dashboard**: Panel kendali penjadwalan dan metrik (untuk *publish* ke CMS).

## 5. Business Rules
- **Limit Publikasi**: Maksimal generate 5 artikel per hari (*hard limit*).
- **Distribusi Topik**: Maksimal 1 artikel per topik/kategori di hari yang sama untuk menghindari repetisi konten.
- **Penjadwalan**: *Auto-generate* menyiapkan artikel untuk siap dirilis secara *batch* pada jam 08.00 WIB.
- **Wewenang Admin**: Admin dapat menghentikan *scheduler* kapan saja, mengubah sistem menjadi manual (bebas pilih topik).

## 6. System Flow (Pipeline Automasi)
1. **Trigger & Data Collection**: Topik baru (viral/trending) terdeteksi via RSS/API.
2. **Normalization & Deduplication**: Pembersihan duplikasi data dan pengelompokan (*Topic Clustering*).
3. **Trend Scoring**: Penilaian skor topik dan memilih *Top 5* harian.
4. **AI Research (Agregasi Data)**: Mengekstrak fakta riil dan menyusun *Evidence Store*.
5. **AI Generation (Drafting)**: Menyusun draf berdasarkan *Evidence Store*.
6. **Fact-Checking & Review**: Verifikasi otomatis dan *human-in-the-loop review* (opsional/sesuai preferensi) sebelum *publish*.
7. **SEO Optimization**: Optimasi struktur dan metadata.
8. **Publishing / Distribusi**: Artikel tayang ke CMS (WordPress via REST API/Headless CMS) dalam format HTML terformat.

## 7. Proses Generasi Konten dengan AI (AI Behavior)
Proses generasi tidak mengandalkan satu *prompt* raksasa. Fokus utamanya mencakup elemen berikut:
- **Prompt / Template Structure**: AI diinstruksikan menulis menggunakan struktur artikel standar: Judul, *Lead*, *Body* (dilengkapi dengan data pendukung finansial), dan Kesimpulan / *Insight*.
- **Grounding (Anti-Halusinasi)**: LLM dipaksa untuk berbasis **hanya pada data riil** yang dikumpulkan di *Evidence Store*, bukan mengandalkan pengetahuan internal model. Ini mutlak untuk keakuratan angka saham/makroekonomi.
- **Gaya Bahasa**: Artikel dikonstruksi dalam **Bahasa Inggris** dengan *tone* formal/semi-formal bergaya jurnalistik. Penyesuaian dilakukan pada panjang artikel dan tingkat kedalaman teknikal untuk para *decision makers*.
- **Orisinalitas (Anti-Plagiasi)**: Terdapat mekanisme instruksi kuat agar AI mensintesis dan memformulasikan ulasan yang orisinal, **tidak** menjiplak atau memparafrase secara persis dari sumber berita asli. Ini krusial demi lolos parameter SEO dan hukum hak cipta.

## 8. Kualitas, Akurasi & Kepatuhan (Compliance)
- **Automated Fact-Checking**: Memiliki lapisan pemeriksaan untuk mendeteksi deviasi/kesalahan data (misal harga saham atau suku bunga) yang sangat berisiko dalam konten investasi.
- **Disclaimer Hukum**: AI dan sistem wajib menyisipkan *disclaimer* hukum berupa peringatan "*not financial advice*", mengikuti regulasi badan otoritas.
- **Atribusi Sumber**: Sistem senantiasa mencantumkan asal data (kredit sumber) untuk mempertahankan kredibilitas artikel serta memitigasi isu pelacakan properti intelektual.

## 9. Architecture & Database
- **Frontend / Admin UI**: Streamlit (MVP), Next.js / React (Produksi).
- **Backend**: Python dengan FastAPI.
- **Database**: PostgreSQL dengan `pgvector` (menyimpan *topics*, *sources*, *claims*, *evidence*, *generated_articles*).
- **AI**: Model AI (misal Gemini API) dipadukan *Sentence Transformers*.
- **Orchestrator**: Tool orkestrasi seperti n8n, Make.com, atau Script Custom Python.

## 10. Scheduler (Publishing & Retry)
- **Automatic Generation**: Rutinitas sistem mengumpulkan bahan dari dini hari untuk mengejar *batch publishing* harian pada 08:00 WIB, ataupun adaptif secara *real-time* saat terjadi topik sangat viral.
- **Manual Generation**: Admin dapat me-*request* publikasi dari *Dashboard*.
- **Failure Handling**: Jika *fact-check* gagal, artikel batal diterbitkan dan tidak akan dipaksakan rilis hanya demi memenuhi kuota 5/hari.

## 11. SEO & Optimasi Publikasi
- Melakukan riset *keyword* otomatis per topik tulisan.
- Menata struktur *heading*, *meta title*, dan *meta description* secara otomatis.
- Menautkan (*internal linking*) otomatis ke artikel investasi relevan lainnya di dalam situs.

## 12. Monitoring & Iterasi
- Melakukan pemantauan (*tracking*) performa artikel terkait tingkat kunjungan dan *engagement* guna memetakan tren audiens.
- Tersedia sistem logging pencatat *error* atau insiden halusinasi AI, berguna demi perbaikan kualitas *prompt* lanjutan.
- Mengevaluasi akurasi hasil rilis materi yang sudah tayang secara berkala.

## 13. Important Constraints
- **HALUSINASI SANGAT DILARANG**: Data dan angka wajib riil dan merujuk *Evidence Store*.
- **Hak Cipta Terjaga**: Wajib orisinal dan bukan duplikasi (plagiasi), menggunakan atribusi yang sah.
- **Batas Hard-Limit (5 Artikel/Hari)**: Fitur pelindung kuota yang tak boleh di-*bypass*.

## 14. Current & Future Development
- **Status Saat Ini**: Penyusunan fondasi arsitektur, *pipeline* AI (dari klastering hingga *fact-check*), integrasi sasaran audiens (C-Level), dan desain MVP orkestrasi.
- **Pengembangan Lanjut**: Implementasi utuh kode API FastAPI, perakitan node orkestrasi via n8n/Make, migrasi antar muka UI ke Next.js, peluncuran monitoring log untuk peningkatan mandiri AI.
