# QUESTION

jadii saya mau bikin sistem untuk otomasi pembuatan artikel (artikel generator gituu).

nah coba dong disini kita review hasil brainstorming saya, nah tapii jugaa kamu harus ngasih saran yaa untuk ngasih teknologi teknologi apaa yang sopport gituu, pakai streamlit atau apaa gituu, truss ngambil api apaa yang free dan jugaa unlimited terkait artikel artikel inii, bisaa gaa?

batasannyaa inii

### 1. Definisi & Batasan Lingkup Konten

- **Lingkup Kategori "Business & Investment" :** makroekonomi, pasar saham, crypto, komoditas, IPO/M&A, kebijakan moneter/fiskal, Perkembangan Geopolitik.  
- **Lingkup Kewilayahan : Global dan Lokal (Indonesia)**
- **Bahasa : Inggris**
- **Target audiens**: Owner Bisnis, Decision Making Party (CEO, CFO, Etc)

### 2. Sumber Data & Deteksi "Happening Topics"

- Sumber: RSS feed media finansial, API berita (NewsAPI, GNews, Google Trends), API data pasar (Yahoo Finance, Alpha Vantage), monitoring media sosial/X untuk topik yang sedang viral.
- Mekanisme deteksi "trending": berdasarkan volume mention, lonjakan pencarian, atau kurasi manual dari daftar sumber terpercaya.
- Filter duplikasi/freshness: memastikan topik yang sama tidak diproses berulang kali.

### 3. Arsitektur Pipeline Automasi

Alur dasar biasanya:
 Trigger (topik baru terdeteksi) → Riset/agregasi data → Generasi draft (LLM) → Verifikasi fakta → Review/editing → Optimasi SEO → Publish ke CMS → Distribusi.
Perlu diputuskan: pakai tool orchestration apa (n8n, Make.com, Zapier, atau script custom Python + API), dan di mana titik "human-in-the-loop" ditempatkan (full otomatis vs review manual sebelum publish).

### 4. Proses Generasi Konten dengan AI

- **Prompt/template**: struktur artikel standar (judul, lead, body dengan data pendukung, kesimpulan/insight).
- **Grounding**: LLM harus berbasis data riil (dari sumber di poin 2), bukan hanya pengetahuan internal model, untuk menghindari halusinasi angka/fakta finansial.
- **Gaya bahasa Inggris**: tone (formal/semi-formal, jurnalistik), panjang artikel, level teknikal bahasa.
- **Orisinalitas**: mekanisme agar tidak menjiplak/parafrase terlalu mirip dari sumber asli (penting untuk SEO dan hukum hak cipta).

### 5. Kualitas, Akurasi & Kepatuhan (Compliance)

- **Fact-checking**: khusus konten investasi, kesalahan data (harga saham, angka ekonomi) berisiko tinggi — perlu lapisan verifikasi otomatis atau manual.
- **Disclaimer hukum**: konten investasi biasanya wajib mencantumkan disclaimer "not financial advice", mengikuti regulasi (misal OJK di Indonesia jika target lokal).
- **Attribusi sumber**: mencantumkan sumber data/berita asli untuk kredibilitas dan menghindari isu hak cipta.

### 6. SEO & Optimasi Publikasi

- Riset keyword otomatis per topik.
- Struktur heading, meta title/description otomatis.
- Internal linking ke artikel lain di website.

### 7. Integrasi Publishing

- CMS yang digunakan (WordPress via REST API, headless CMS, dsb).
- Format output (HTML terformat, gambar featured otomatis atau manual).
- Penjadwalan publish (real-time saat topik viral, atau batch harian).

### 8. Monitoring & Iterasi

- Tracking performa artikel (traffic, engagement) untuk menilai topik mana yang efektif.
- Logging error/halusinasi AI untuk perbaikan prompt berkelanjutan.
- Review berkala terhadap akurasi konten yang sudah tayang.

### 9. Tech Stack Ringkas yang Perlu Diputuskan

- Orchestrator otomasi (n8n/Make/custom code)
- Sumber data & API key yang dibutuhkan
- Model AI untuk generasi (dan biaya/rate limit-nya)
- CMS/hosting website
- Tool monitoring (analytics, error logging)


# **ANSWER**



Bisa banget. Bahkan dari brainstorming kamu, menurut saya konsepnya sudah **cukup matang untuk dijadikan sebuah AI Content Research & Article Generation System**. Tapi ada satu hal penting: jangan membangun sistem yang sekadar `topic → LLM → article`. Untuk niche **Business & Investment**, arsitekturnya sebaiknya `data → evidence → analysis → generation → verification → human review → publish`.

Dan soal **API gratis + unlimited**, ini perlu diluruskan: **API komersial yang benar-benar gratis dan unlimited hampir tidak ada**. Yang realistis adalah kombinasi **RSS/open data + free-tier API + caching + request scheduling**, sehingga dari sisi penggunaan aplikasi bisa terasa hampir unlimited.

Saya sudah cek kondisi API yang relevan saat ini.

---

# 1. Saya revisi dulu konsep besarnya

Menurut saya sistemnya lebih bagus kalau dibagi menjadi **7 engine**:

```text
                    ┌──────────────────────┐
                    │   TOPIC DISCOVERY    │
                    │ News / RSS / Trends  │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │   TOPIC SCORING      │
                    │ Freshness             │
                    │ Volume               │
                    │ Relevance            │
                    │ Business Impact      │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │   RESEARCH ENGINE    │
                    │ News + Finance Data  │
                    │ Official Sources     │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │   EVIDENCE STORE     │
                    │ Facts + Sources      │
                    │ Numbers + Timestamp  │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │   ARTICLE ENGINE     │
                    │ Outline → Draft      │
                    │ SEO → Editorial      │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │  FACT CHECK ENGINE   │
                    │ Claim verification   │
                    │ Number verification  │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ HUMAN REVIEW         │
                    │ Approve / Edit       │
                    └──────────┬───────────┘
                               ↓
                    ┌──────────────────────┐
                    │ CMS / WORDPRESS      │
                    └──────────────────────┘
```

Ini jauh lebih aman daripada langsung menyuruh AI menulis berdasarkan hasil pencarian.

---

# 2. Tech stack yang saya sarankan

Kalau kamu sendiri yang develop, saya justru **tidak menyarankan Streamlit sebagai backend utama**.

Saya akan pakai:

### Backend

**Python + FastAPI**

Karena nantinya kamu punya banyak service:

```text
FastAPI
├── /topics
├── /research
├── /generate
├── /fact-check
├── /seo
├── /publish
└── /analytics
```

### Frontend/Admin Dashboard

Untuk MVP:

**Streamlit**

Ini cocok banget untuk tahap awal.

Misalnya:

```text
ARTICLE GENERATOR

[ Dashboard ]

Trending Topics
─────────────────────────────────────

1. Fed signals possible rate cut
   Score: 92
   Sources: 17
   Freshness: 96%

   [Research] [Generate]

2. Bitcoin ETF inflows rise
   Score: 87

   [Research] [Generate]
```

Kemudian ketika sistem sudah stabil, baru frontend dipindahkan ke:

**Next.js / React**

Jadi:

```text
                 ┌───────────────┐
                 │ Streamlit     │
                 │ Admin UI      │
                 └───────┬───────┘
                         │
                         ↓
                 ┌───────────────┐
                 │ FastAPI       │
                 │ Backend       │
                 └───────┬───────┘
                         │
             ┌───────────┼───────────┐
             ↓           ↓           ↓
          Research     LLM        Database
```

---

# 3. Jangan langsung pakai n8n sebagai otak utama

Kamu tadi mempertimbangkan:

* n8n
* Make
* Zapier
* Python custom

Saya lebih condong ke:

### MVP

**Python + FastAPI + scheduler**

### Production automation

**Python + n8n**

Jadi n8n hanya menjadi **orchestrator**, bukan tempat semua logic ditulis.

Contohnya:

```text
n8n
 │
 ├── Every 30 minutes
 │
 ↓
FastAPI
 │
 ├── Fetch RSS
 ├── Fetch News API
 ├── Fetch financial data
 ├── Detect topics
 ├── Score topics
 └── Save database
```

Kemudian:

```text
n8n
 │
 ├── Topic score > 80
 │
 ↓
Research Engine
 │
 ↓
Article Generator
 │
 ↓
Fact Checker
 │
 ↓
Human Review
 │
 ↓
WordPress
```

---

# 4. Untuk sumber berita, jangan bergantung kepada NewsAPI

Ini bagian yang cukup penting.

[NewsAPI Pricing](https://newsapi.org/pricing?utm_source=chatgpt.com)

Free Developer plan NewsAPI saat ini memang gratis, tetapi hanya **100 request/day** dan artikelnya memiliki **delay 24 jam**. Jadi kurang cocok jika sistem kamu ingin mendeteksi breaking financial news secara real-time. ([News API][1])

GNews juga memiliki free tier **100 request/day**, maksimal 10 artikel/request, tetapi ada **12-hour delay**. ([GNews API][2])

Jadi saya akan membuat **multi-source ingestion**:

```text
                NEWS SOURCES

       ┌────────────┬─────────────┐
       ↓            ↓             ↓
      RSS         GNews        NewsAPI
       │            │             │
       └────────────┼─────────────┘
                    ↓
              Normalization
                    ↓
              Deduplication
                    ↓
              Topic Detection
```

Dan RSS menjadi sumber yang sangat penting.

---

# 5. RSS justru bisa jadi senjata utama

Daripada setiap 5 menit:

```text
API → 100 requests/day habis
```

lebih baik:

```text
RSS feeds
   ↓
fetch
   ↓
hash URL/title
   ↓
database
   ↓
deduplicate
```

Misalnya kamu punya whitelist sumber:

```text
Financial Times
Reuters
CNBC
BBC Business
Yahoo Finance
MarketWatch
The Guardian Business
Bloomberg
Investing
CoinDesk
Cointelegraph
official government sources
central banks
```

**Catatan:** penggunaan RSS tetap harus mengikuti terms/licensing masing-masing publisher. Jangan otomatis mengambil full article lalu mengubahnya menjadi artikel baru tanpa memperhatikan hak penggunaan konten.

---

# 6. Untuk financial data, saya malah suka Alpha Vantage

[Alpha Vantage](https://www.alphavantage.co/?utm_source=chatgpt.com)

Menariknya, dokumentasi Alpha Vantage saat ini menyatakan free stock API mencakup sebagian besar dataset dengan **25 API requests/day**, tetapi mereka juga menyebut **unlimited API requests untuk verified open-source atau educational projects**. ([Alpha Vantage][3])

Ini bisa sangat menarik untuk project kamu **kalau proyeknya memang memenuhi syarat mereka**.

Misalnya:

```text
AAPL
MSFT
NVDA
TSLA
BTC
ETH
USD/IDR
gold
oil
```

Data tersebut jangan dimasukkan langsung ke prompt sebagai teks biasa.

Lebih bagus:

```json
{
  "ticker": "NVDA",
  "price": 178.21,
  "change_pct": 2.41,
  "timestamp": "2026-09-23T09:30:00Z",
  "source": "Alpha Vantage"
}
```

Kemudian AI hanya boleh menggunakan angka tersebut.

---

# 7. Google Trends: bagus, tetapi jangan dijadikan dependency utama

Google sekarang memang sudah menyediakan **Google Trends API**, tetapi statusnya masih **alpha dan aksesnya terbatas kepada tester**. ([Google for Developers][4])

Jadi untuk production architecture:

```text
Google Trends API
        ↓
   optional source
```

bukan:

```text
Google Trends API
        ↓
mandatory dependency
```

Google sendiri juga menyebut Trends sebagai data **search interest**, bukan absolute search volume. ([Google for Developers][5])

Jadi scoring kamu jangan:

```text
search volume = 100
```

tetapi:

```text
trend_growth = +180%
```

atau:

```text
trend_velocity = 0.87
```

---

# 8. Saya ingin menambahkan "Topic Scoring Engine"

Ini menurut saya **belum cukup kuat di brainstorming kamu**.

Jangan cuma:

> "Trending → tulis artikel"

Buat score:

```text
TOPIC SCORE

Freshness           25%
News Volume         20%
Search Trend        15%
Financial Impact    20%
Audience Relevance  15%
Source Reliability   5%
```

Contoh:

```text
Topic:
"Fed signals possible rate cut"

Freshness          95
News volume        91
Search trend       87
Financial impact   96
Audience relevance 94
Source reliability 98

FINAL SCORE = 94.1
```

Kemudian:

```text
score >= 85
→ high priority

70–84
→ normal

< 70
→ ignore / monitor
```

Bukan berarti score itu "kebenaran", hanya mekanisme prioritas internal.

---

# 9. Tambahkan Topic Clustering

Ini **penting banget**.

Misalnya dalam 1 jam ada:

```text
Fed may cut rates
Fed signals rate cut
Markets price Fed cut
Powell hints rate cut
Investors expect rate cut
```

AI jangan membuat:

```text
5 artikel
```

Tetapi:

```text
               ┌── Fed may cut rates
               ├── Fed signals rate cut
               ├── Powell hints rate cut
               ├── Markets price Fed cut
               └── Investors expect rate cut
                         ↓
                   SAME EVENT
                         ↓
               "Federal Reserve Rate
                Cut Expectations"
```

Teknologinya bisa sederhana:

**sentence embeddings + cosine similarity**

Misalnya:

```text
sentence-transformers
        +
FAISS / pgvector
```

Kalau similarity > threshold:

```text
same topic cluster
```

---

# 10. Database

Saya akan menggunakan:

### PostgreSQL

dengan:

**pgvector**

Karena nantinya kamu membutuhkan:

```text
articles
sources
topics
topic_clusters
claims
evidence
generated_articles
fact_checks
keywords
publishing_logs
```

Struktur sederhananya:

```text
topics
 ├── id
 ├── title
 ├── category
 ├── score
 ├── detected_at
 └── status

sources
 ├── id
 ├── url
 ├── publisher
 ├── published_at
 └── reliability

claims
 ├── id
 ├── article_id
 ├── claim
 ├── evidence
 ├── verified
 └── confidence
```

---

# 11. Bagian paling penting: Evidence Store

Ini yang menurut saya harus menjadi pembeda sistem kamu.

Jangan:

```text
News
 ↓
LLM
 ↓
Article
```

Tetapi:

```text
News
  ↓
Research
  ↓
Evidence Store
  ↓
LLM
```

Contoh evidence:

```json
{
  "claim": "The Federal Reserve kept rates unchanged",
  "value": "unchanged",
  "source": "Federal Reserve",
  "source_url": "...",
  "published_at": "...",
  "retrieved_at": "...",
  "confidence": 0.99
}
```

Kemudian prompt ke LLM:

> Write the article using ONLY the provided evidence.

---

# 12. Fact checker-nya jangan cuma LLM

Ini juga penting.

Misalnya AI menghasilkan:

> Bitcoin rose 12.4% following the announcement.

System harus mengambil:

```text
AI claim
   ↓
"Bitcoin rose 12.4%"
   ↓
search evidence
   ↓
market API
   ↓
actual = 8.7%
   ↓
❌ FLAG
```

Jadi ada:

### Deterministic checker

Untuk:

* angka
* tanggal
* ticker
* harga
* percentage
* financial metrics

Dan:

### LLM checker

Untuk:

* apakah kesimpulannya sesuai sumber
* apakah ada unsupported claim
* apakah artikel misleading
* apakah sumber benar-benar mendukung pernyataan

---

# 13. Arsitektur AI-nya sebaiknya multi-agent / multi-stage

Bukan satu prompt besar.

Saya sarankan:

```text
Research Agent
      ↓
Outline Agent
      ↓
Writer Agent
      ↓
Fact Checker
      ↓
SEO Agent
      ↓
Editor Agent
```

Contohnya:

### Research Agent

Output:

```json
{
  "topic": "...",
  "key_facts": [],
  "sources": [],
  "market_data": [],
  "counterpoints": []
}
```

↓

### Writer

```json
{
  "title": "...",
  "summary": "...",
  "sections": []
}
```

↓

### Fact checker

```json
{
  "claims": [
    {
      "claim": "...",
      "verified": true,
      "source": "..."
    }
  ]
}
```

↓

### SEO

```json
{
  "primary_keyword": "...",
  "secondary_keywords": [],
  "meta_title": "...",
  "meta_description": "..."
}
```

---

# 14. Model AI gratis yang bisa dipakai?

Di sini ada beberapa opsi.

### Option A — Gemini API

Untuk prototype sangat menarik karena Google menyediakan free usage tier untuk API tertentu, tetapi **tetap ada RPM/TPM/RPD limits**, jadi bukan unlimited. ([Google AI for Developers][6])

Saya akan menjadikan Gemini salah satu kandidat utama untuk:

```text
research summarization
article generation
fact checking
SEO
```

---

### Option B — OpenRouter

OpenRouter saat ini menyediakan free models, dan halaman pricing mereka mencantumkan **25+ free models**, tetapi free plan memiliki **50 requests/day**. ([OpenRouter][7])

Menarik untuk development/testing, tetapi saya **tidak akan menjadikannya satu-satunya production LLM**.

---

### Option C — Local LLM

Kalau kamu punya mesin yang cukup kuat:

```text
Ollama
   ↓
Qwen / Llama / Mistral family
```

Keuntungan:

```text
$0 API
tidak ada API quota
data tidak keluar
```

Tetapi konsekuensinya:

```text
butuh RAM
butuh CPU/GPU
lebih lambat
```

Jadi untuk project kamu, saya lebih suka:

```text
Cloud LLM
+
local fallback
```

---

# 15. Jadi apakah bisa "gratis"?

**Bisa untuk MVP.**

Tapi bukan:

> 100% free unlimited API.

Lebih realistis:

| Komponen       | Pilihan                       |
| -------------- | ----------------------------- |
| News           | RSS                           |
| News backup    | GNews                         |
| Financial data | Alpha Vantage                 |
| Search trend   | Google Trends / manual        |
| LLM            | Gemini Free / OpenRouter Free |
| Embedding      | local sentence-transformers   |
| Vector DB      | pgvector                      |
| Database       | PostgreSQL                    |
| Backend        | FastAPI                       |
| UI             | Streamlit                     |
| Scheduler      | APScheduler / cron            |
| Automation     | n8n                           |
| CMS            | WordPress                     |
| Analytics      | GA4/Search Console            |
| Logging        | self-hosted                   |

Jadi **biaya API bisa ditekan sangat rendah untuk MVP**.

---

# 16. SEO engine

SEO jangan dilakukan setelah artikel selesai saja.

Saya malah buat:

```text
Topic
 ↓
Keyword Research
 ↓
Article Outline
 ↓
Writing
 ↓
SEO Optimization
```

Output:

```text
Primary Keyword
Secondary Keywords
Search Intent
Suggested Title
H1
H2
Meta Title
Meta Description
Slug
FAQ
Internal Links
External References
```

Tapi jangan membuat keyword stuffing.

---

# 17. Internal linking bisa dibuat otomatis

Misalnya database kamu sudah punya:

```text
Article A:
Federal Reserve Interest Rates

Article B:
US Inflation

Article C:
US Treasury Yields

Article D:
Bitcoin ETF
```

Artikel baru:

> Fed Signals Possible Rate Cut

engine mencari semantic similarity:

```text
Fed → Interest Rates
Fed → Inflation
Fed → Treasury Yields
```

kemudian:

```html
<a href="/federal-reserve-interest-rates">
   Federal Reserve interest rates
</a>
```

Ini bisa dilakukan dengan embedding.

---

# 18. Human-in-the-loop menurut saya WAJIB

Untuk niche ini saya **tidak menyarankan full auto publish di awal**.

Flow:

```text
                    ARTICLE GENERATED
                           ↓
                    FACT CHECK
                           ↓
                ┌──────────┴──────────┐
                ↓                     ↓
           HIGH CONFIDENCE       LOW CONFIDENCE
                ↓                     ↓
         READY FOR REVIEW         NEEDS REVIEW
                ↓                     ↓
             HUMAN
                ↓
        ┌───────┴────────┐
        ↓                ↓
      APPROVE           EDIT
        ↓                ↓
      PUBLISH          PUBLISH
```

Jadi AI bukan "publisher".

AI adalah **researcher + writer + assistant**.

---

# 19. Dashboard Streamlit yang saya bayangkan

Kurang lebih:

```text
┌─────────────────────────────────────────────────┐
│          AI BUSINESS ARTICLE ENGINE             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Trending Topics                                │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Fed rate cut expectations                │  │
│  │ Score: 94                                │  │
│  │ Sources: 21                              │  │
│  │                                           │  │
│  │ [ Research ] [ Generate Article ]        │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Bitcoin ETF inflows                      │  │
│  │ Score: 87                                │  │
│  │ Sources: 14                              │  │
│  │                                           │  │
│  │ [ Research ] [ Generate Article ]        │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

Klik Research:

```text
TOPIC RESEARCH

Topic
Fed rate cut expectations

Sources
─────────────────────────────
Reuters
Federal Reserve
CNBC
Bloomberg
Yahoo Finance

Market Data
─────────────────────────────
S&P 500       +1.21%
NASDAQ        +1.74%
10Y Yield     -0.12%

Key Facts
─────────────────────────────
✓ Fact 1
✓ Fact 2
✓ Fact 3

[ Generate Article ]
```

Lalu:

```text
ARTICLE REVIEW

Title
[____________________________]

Meta Description
[____________________________]

Article
─────────────────────────────

...

─────────────────────────────

Fact Check: 96%
Sources: 14
Unsupported claims: 1

[ Edit ] [ Save Draft ] [ Publish ]
```

---

# 20. Struktur project

Saya bahkan akan membuat struktur seperti ini:

```text
article-generator/
│
├── app/
│   ├── api/
│   │   ├── topics.py
│   │   ├── research.py
│   │   ├── articles.py
│   │   ├── factcheck.py
│   │   └── publishing.py
│   │
│   ├── services/
│   │   ├── news/
│   │   ├── finance/
│   │   ├── trends/
│   │   ├── llm/
│   │   ├── embeddings/
│   │   ├── factcheck/
│   │   └── seo/
│   │
│   ├── models/
│   ├── schemas/
│   ├── prompts/
│   └── core/
│
├── dashboard/
│   └── streamlit_app.py
│
├── workers/
│   ├── topic_detector.py
│   ├── research_worker.py
│   ├── article_worker.py
│   └── factcheck_worker.py
│
├── migrations/
│
├── tests/
│
├── docker-compose.yml
├── requirements.txt
└── .env
```

---

# 21. CMS WordPress cocok banget

Kalau target akhirnya website artikel sendiri, WordPress sebenarnya sudah sangat enak.

WordPress menyediakan REST API resmi untuk posts, media, categories, tags, dll. Endpoint post-nya misalnya `/wp/v2/posts`, dan post bisa dibuat melalui `POST`. ([WordPress Developer Resources][8])

Jadi:

```text
AI Generator
      ↓
POST /wp-json/wp/v2/posts
      ↓
WordPress
```

Bahkan featured image juga bisa diintegrasikan lewat `/wp/v2/media`.

---

# 22. Saya akan mengubah pipeline kamu menjadi seperti ini

Versi finalnya:

```text
                  ┌───────────────┐
                  │ RSS SOURCES   │
                  ├───────────────┤
                  │ News API      │
                  │ GNews         │
                  │ Finance API   │
                  │ Trends        │
                  └───────┬───────┘
                          ↓
                ┌──────────────────┐
                │ INGESTION ENGINE │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ DEDUPLICATION    │
                │ URL + semantic   │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ TOPIC CLUSTERING │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ TOPIC SCORING    │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ RESEARCH ENGINE  │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ EVIDENCE STORE   │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ ARTICLE WRITER   │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ FACT CHECKER     │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ SEO ENGINE       │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ HUMAN REVIEW     │
                └────────┬─────────┘
                         ↓
                ┌──────────────────┐
                │ WORDPRESS        │
                └──────────────────┘
```

---

# 23. Dan saya akan tambahkan 3 fitur yang belum ada di brainstorming kamu

### A. Claim-level citation

Setiap klaim penting disimpan:

```text
CLAIM
↓
EVIDENCE
↓
SOURCE
↓
TIMESTAMP
```

Jadi kalau ada kesalahan, kita tahu **AI mengambil informasi dari mana**.

---

### B. Article freshness monitoring

Artikel financial bisa cepat basi.

Misalnya:

```text
Article published
    ↓
24 hours
    ↓
Check new data
    ↓
Important change?
    ↓
YES
    ↓
FLAG ARTICLE
```

Dashboard:

```text
⚠ 12 articles need update
✓ 48 articles current
```

Ini menurut saya fitur yang sangat valuable.

---

### C. Source reliability

Jangan semua sumber dianggap sama.

Misalnya sistem punya:

```text
SOURCE TYPE

Tier A
Official government
Central bank
Exchange
Company filing

Tier B
Major financial media

Tier C
Industry media

Tier D
Social media
```

Social media bisa digunakan untuk **detection**, tetapi bukan otomatis menjadi **evidence utama**.

---

# 24. Kesimpulan stack yang saya rekomendasikan

Kalau saya yang membangun MVP-nya:

```text
Frontend
    Streamlit

Backend
    FastAPI

Language
    Python

Database
    PostgreSQL

Vector
    pgvector

Scheduler
    APScheduler / Cron

Automation
    n8n

News
    RSS + GNews

Financial Data
    Alpha Vantage

Trend
    Google Trends
    + API jika mendapat akses

LLM
    Gemini API
    + OpenRouter/local fallback

Embedding
    sentence-transformers

Fact Check
    Python rules
    + LLM verification

SEO
    custom Python + LLM

CMS
    WordPress REST API

Deployment
    Docker
```

Dan **jangan mengejar "unlimited API" sebagai requirement**. Lebih bagus desain sistemnya supaya **rate-limit aware**:

```text
API quota
    ↓
Cache
    ↓
Deduplicate
    ↓
Batch request
    ↓
Scheduled crawling
    ↓
Database
```

Dengan begitu 100 request/day pun bisa menghasilkan data yang jauh lebih banyak daripada 100 request mentah.

Untuk tahap awal, saya akan membuat **MVP tanpa n8n dulu**: `Streamlit + FastAPI + PostgreSQL + RSS + GNews + Alpha Vantage + Gemini`, lalu setelah pipeline artikelnya benar-benar stabil baru n8n dimasukkan untuk scheduling dan automation. Ini akan jauh lebih gampang di-debug dan kamu juga bisa melihat kualitas setiap tahap secara langsung. ([News API][1])


[1]: https://newsapi.org/pricing?utm_source=chatgpt.com
[2]: https://gnews.io/pricing?utm_source=chatgpt.com
[3]: https://www.alphavantage.co/support/?utm_source=chatgpt.com
[4]: https://developers.google.com/search/apis/trends?utm_source=chatgpt.com
[5]: https://developers.google.com/search/blog/2025/07/trends-api?utm_source=chatgpt.com
[6]: https://ai.google.dev/gemini-api/docs/rate-limits?utm_source=chatgpt.com
[7]: https://openrouter.ai/pricing?utm_source=chatgpt.com
[8]: https://developer.wordpress.org/rest-api/reference/posts/?utm_source=chatgpt.com
