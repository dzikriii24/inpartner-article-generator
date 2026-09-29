
Tolong lanjutkan pengembangan AI Article Generator ini, khususnya pada bagian AI research, model selection, rate-limit handling, kualitas hasil research, dan validitas sumber.

Kondisi saat ini:

Gemini API yang digunakan mengalami rate limit. Dari Google AI Studio terlihat bahwa model utama saat ini sudah mencapai batas RPM, sehingga jangan membuat seluruh pipeline bergantung pada satu model Gemini saja.

Selain menyelesaikan masalah rate limit, saya ingin meningkatkan kualitas sistem secara signifikan.

TARGET UTAMA:

Saya ingin AI Article Generator ini benar-benar memiliki kemampuan research yang baik.

Jangan membuat sistem yang sekadar:

User Prompt → Gemini → Artikel

Tetapi jadikan sistem sebagai research-driven article generation system:

User Prompt
→ Topic & Intent Understanding
→ Research Planning
→ Web Research / News Discovery
→ Source Collection
→ Content Extraction
→ Source Validation
→ Semantic Similarity / Clustering
→ Fact Extraction
→ Cross-Source Verification
→ Research Synthesis
→ Story Planning
→ Article Composition
→ Editorial Review
→ Fact / Citation Validation
→ Final Article

==================================================

1. JANGAN TERGANTUNG PADA SATU MODEL
   =================================

Tolong audit seluruh penggunaan AI model yang sekarang.

Cari semua:

* Gemini API call
* model name
* service/provider
* prompt
* generation config
* rate-limit handling
* retry mechanism
* timeout
* research logic
* article generation logic

Jangan langsung mengganti model sebelum memahami arsitektur existing.

Buat arsitektur model yang memungkinkan setiap tahap menggunakan model yang paling sesuai.

Minimal pisahkan:

A. RESEARCH MODEL / RESEARCH AGENT
B. ANALYSIS / REASONING MODEL
C. ARTICLE COMPOSITION MODEL
D. LIGHTWEIGHT MODEL untuk task sederhana
E. EMBEDDING MODEL untuk semantic similarity

Jangan menggunakan model besar untuk task yang sebenarnya sederhana.

==================================================
2. PRIORITASKAN MODEL YANG MEMANG KUAT UNTUK RESEARCH
=====================================================

Untuk tahap research, evaluasi penggunaan model/agent yang memang memiliki kemampuan web research dan reasoning.

Jangan menganggap model text-generation biasa otomatis merupakan research agent.

Jika tersedia dan compatible dengan API/project saat ini, evaluasi:

* Gemini Deep Research Agent
* Gemini 3.1 Pro
* Gemini 3.8 Flash
* Gemini 3.1 Flash-Lite
* Gemini Embedding

Gunakan dokumentasi resmi Google sebagai acuan implementasi.

Deep Research sebaiknya dipertimbangkan untuk research yang membutuhkan:

* pencarian multi-step
* membaca banyak sumber
* membandingkan sumber
* menemukan informasi tambahan
* mengikuti konteks penelitian
* mencari informasi terbaru
* melakukan synthesis
* menghasilkan research findings yang grounded

Untuk task sederhana seperti:

* cleaning
* classification
* metadata extraction
* basic summarization
* formatting

gunakan model yang lebih ringan.

Untuk semantic similarity gunakan embedding model, bukan LLM biasa.

==================================================
3. RESEARCH HARUS BENAR-BENAR MELAKUKAN RESEARCH
================================================

Ini bagian paling penting.

Ketika user memasukkan:

"buat artikel tentang dampak kenaikan harga kopi terhadap UMKM di Indonesia"

sistem jangan hanya mencari berita dengan keyword:

"harga kopi"
"UMKM kopi"

Tetapi harus memahami:

Topic:

* kenaikan harga kopi

Context:

* dampaknya terhadap UMKM

Geography:

* Indonesia

Potential subtopics:

* harga bahan baku
* biaya produksi
* margin keuntungan
* harga jual
* daya beli konsumen
* supply chain
* petani kopi
* distributor
* coffee shop
* UMKM
* kebijakan pemerintah jika relevan

Kemudian buat research plan berdasarkan topic tersebut.

==================================================
4. USER PROMPT HARUS MENJADI RESEARCH CONSTRAINT
================================================

User prompt harus memengaruhi:

* search query
* research scope
* source selection
* geographic scope
* timeframe
* semantic relevance
* clustering
* fact extraction
* article angle
* article structure
* final composition

Jangan hanya memasukkan user prompt ke prompt Gemini terakhir.

Prompt harus menjadi bagian dari keseluruhan pipeline.

Contoh:

User:

"buat artikel mengenai dampak kenaikan harga beras terhadap UMKM kuliner di Indonesia"

Research engine harus mencari informasi mengenai:

* kenaikan harga beras
* data harga
* periode kenaikan
* penyebab
* dampak terhadap biaya produksi
* UMKM kuliner
* perubahan harga jual
* margin
* daya beli
* kebijakan pemerintah
* data/statistik relevan
* pernyataan pihak terkait

Bukan sekadar mencari artikel yang memiliki kata "beras" dan "UMKM".

==================================================
5. SUMBER HARUS VALID DAN DAPAT DIVERIFIKASI
============================================

Jangan hanya mengambil source berdasarkan popularitas atau ranking search engine.

Buat sistem source evaluation.

Pertimbangkan:

* official government website
* government statistics
* official institution
* research institution
* academic paper
* reputable news organization
* company/organization official statement
* primary source
* secondary source

Untuk setiap source simpan minimal:

* title
* publisher
* author jika tersedia
* URL
* published_at
* accessed_at
* source_type
* source_domain
* extracted_content
* summary
* relevance_score
* credibility metadata jika tersedia

Prioritaskan primary source ketika tersedia.

Contoh:

Data statistik:
BPS > artikel yang mengutip BPS

Pernyataan pemerintah:
website resmi kementerian > artikel yang hanya mengutip pernyataan tersebut

Research:
paper/original study > artikel yang hanya membahas paper tersebut

==================================================
6. JANGAN MENGANGGAP SEMUA HASIL SEARCH BENAR
=============================================

Research engine harus memperlakukan search result sebagai kandidat source, bukan fakta otomatis.

Setiap fakta penting harus memiliki provenance.

Contoh:

FACT:

"Harga beras meningkat X%."

Sistem harus mengetahui:

Source:
BPS

URL:
...

Published:
...

Evidence:
...

Confidence:
...

Jika tidak ada source yang cukup kuat:

jangan membuat fakta tersebut.

==================================================
7. CROSS-SOURCE VERIFICATION
============================

Untuk klaim penting, lakukan cross-check jika memungkinkan.

Contoh:

Source A:
Harga meningkat 10%.

Source B:
Harga meningkat 9.8%.

Source C:
Data resmi menunjukkan 9.7%.

Jangan langsung memilih angka pertama.

Sistem harus:

* membandingkan
* mencari tanggal data
* memahami perbedaan periode
* memahami definisi indikator
* memilih data yang paling relevan
* menyimpan source pendukung

Jika sumber berbeda karena periode/metodologi berbeda, jangan menyamakan angka tersebut.

==================================================
8. CITATION / REFERENCE HARUS MENJADI BAGIAN DARI DATA ARTIKEL
==============================================================

Jangan hanya menampilkan daftar link di bagian akhir.

Sistem harus mengetahui hubungan:

Article Claim
→ Fact
→ Source
→ URL
→ Evidence

Contoh struktur internal:

{
"claim": "...",
"fact_id": "...",
"sources": [
{
"title": "...",
"publisher": "...",
"url": "...",
"published_at": "...",
"evidence": "..."
}
]
}

Dengan demikian setiap bagian artikel dapat ditelusuri kembali ke source.

==================================================
9. ARTICLE TIDAK BOLEH HALLUCINATE
==================================

Ini wajib.

AI tidak boleh membuat:

* angka
* statistik
* kutipan
* nama orang
* tanggal
* lokasi
* peristiwa
* hasil penelitian
* pernyataan institusi
* prediksi
* sebab-akibat

yang tidak ditemukan dalam research data.

Jika informasi tidak ditemukan:

* jangan mengarang
* jangan mengisi dengan asumsi
* jangan membuat kutipan sintetis
* jangan membuat statistik palsu

Lebih baik artikel lebih pendek daripada memiliki fakta yang tidak dapat diverifikasi.

==================================================
10. RESEARCH HASILNYA HARUS BERKUALITAS
=======================================

Jangan menganggap research selesai hanya karena sudah mendapatkan 5-10 artikel.

Research harus memiliki:

* topic understanding
* research questions
* source discovery
* source filtering
* source reading
* fact extraction
* source comparison
* evidence gathering
* contradiction detection
* synthesis
* research summary

Buat internal research result seperti:

RESEARCH SUMMARY

Topic:
...

Research Questions:

1. ...
2. ...
3. ...

Key Findings:

1. ...
2. ...
3. ...

Important Facts:
...

Important Statistics:
...

Relevant Quotes:
...

Contradictions:
...

Source Quality:
...

Knowledge Gaps:
...

Recommended Article Angle:
...

==================================================
11. SOURCE DISCOVERY HARUS MEMBACA KONTEN
=========================================

Jangan berhenti di:

title + URL + snippet.

Jika source digunakan untuk artikel, sebisa mungkin baca konten sebenarnya.

Gunakan:

* URL context
* HTML extraction
* RSS
* API
* content extraction
* search grounding
* research agent

sesuai kemampuan source.

Clean:

* navigation
* ads
* footer
* cookie banner
* unrelated content
* duplicated content

Ambil:

* headline
* author
* date
* body
* relevant metadata

Jika sebuah source tidak dapat dibaca dengan baik, jangan memberikan bobot tinggi hanya karena title-nya relevan.

==================================================
12. SEMANTIC SEARCH & CLUSTERING
================================

Tetap gunakan embedding untuk semantic similarity.

Jangan hanya keyword matching.

Contoh:

"harga kopi global melonjak"

dan:

"biaya bahan baku coffee shop meningkat"

bisa memiliki hubungan semantic walaupun wording berbeda.

Gunakan embedding untuk:

* news similarity
* clustering
* duplicate detection
* related news
* source grouping

Pertimbangkan Gemini Embedding atau embedding model yang sudah tersedia di project.

Jangan menggunakan LLM generation untuk pekerjaan embedding jika embedding model tersedia.

==================================================
13. MODEL FALLBACK & RATE LIMIT
===============================

Implementasikan model fallback yang proper.

Contoh:

Research:
Primary Research Agent
→ fallback research-capable model
→ fallback search + extraction pipeline

Article reasoning:
Primary reasoning model
→ fallback model

Lightweight:
Primary lightweight model
→ fallback lightweight model

Jika API mengembalikan:

429
RESOURCE_EXHAUSTED
rate limit
timeout
temporary unavailable

jangan langsung gagal.

Implementasikan:

* retry with exponential backoff
* retry limit
* model fallback
* provider fallback jika architecture mendukung
* request throttling
* queue jika diperlukan
* logging

Jangan melakukan infinite retry.

==================================================
14. JANGAN MEMAKAI MODEL YANG SAMA UNTUK SEMUA TASK
===================================================

Buat model routing berdasarkan task.

Contoh konsep:

RESEARCH
→ Deep Research / research-capable model

COMPLEX REASONING
→ Gemini 3.1 Pro atau model reasoning yang sesuai

FAST ANALYSIS
→ Gemini 3.8 Flash

HIGH VOLUME SIMPLE TASK
→ Gemini 3.1 Flash-Lite

SEMANTIC SEARCH
→ Gemini Embedding

EDITORIAL CORRECTION
→ lightweight/appropriate model

Tetapi jangan hardcode asumsi tersebut sebelum memeriksa model yang benar-benar tersedia pada API key/project saat ini.

Buat konfigurasi model melalui environment/config sehingga mudah diganti.

Contoh:

RESEARCH_MODEL=
REASONING_MODEL=
COMPOSITION_MODEL=
LIGHTWEIGHT_MODEL=
EMBEDDING_MODEL=

Jangan hardcode model ID di banyak file.

==================================================
15. RESEARCH CACHE
==================

Tambahkan caching jika architecture memungkinkan.

Jika topic/source yang sama sudah pernah diteliti:

jangan selalu melakukan full research dari awal.

Cache:

* source
* extracted content
* embedding
* facts
* research result
* source metadata

Dengan begitu:

* mengurangi API usage
* mengurangi rate limit
* mempercepat generation
* meningkatkan konsistensi

Tetap perhatikan freshness.

Research lama harus dapat dianggap stale setelah periode tertentu.

==================================================
16. RESEARCH HARUS PUNYA TIMEFRAME
==================================

Untuk topic yang sifatnya current/news:

prioritaskan source terbaru.

Untuk topic historical/evergreen:

boleh menggunakan source lama yang authoritative.

Sistem harus menentukan timeframe berdasarkan user prompt.

Contoh:

"berita terbaru tentang..."
→ recent sources

"sejarah..."
→ historical sources

"perkembangan 5 tahun terakhir..."
→ explicit timeframe

Jangan mencampur timeframe tanpa konteks.

==================================================
17. ARTICLE COMPOSITION
=======================

Setelah research selesai, jangan langsung meminta model:

"write an article".

Buat Story Plan terlebih dahulu.

Contoh:

{
"angle": "...",
"headline": "...",
"dek": "...",
"lead": "...",
"sections": [
"...",
"...",
"..."
],
"facts": [...],
"sources": [...]
}

Baru setelah itu composition.

Artikel harus terasa seperti artikel digital profesional.

Minimal dapat memiliki:

* headline
* dek/subtitle
* lead
* main story
* supporting facts
* context
* background
* impact
* relevant developments
* quotes jika tersedia
* statistics jika tersedia
* conclusion
* sources
* related news

Struktur harus adaptive terhadap topic.

Jangan menggunakan template yang sama untuk semua artikel.

==================================================
18. ARTIKEL JANGAN TERLALU PENDEK
=================================

Saat ini hasil artikel masih terlalu sedikit.

Audit terlebih dahulu kenapa output pendek.

Jangan sekadar menaikkan max output token.

Cari apakah masalahnya berasal dari:

* research terlalu sedikit
* source terlalu sedikit
* prompt composition terlalu pendek
* story plan terlalu sederhana
* context yang dikirim ke model terlalu sedikit
* output token terlalu kecil
* model terlalu cepat menyimpulkan
* content blocks belum mendukung artikel panjang

Untuk standard article, targetkan artikel long-form yang proporsional dengan jumlah informasi yang tersedia.

Contoh target awal:

Standard:
800–1200 words

Information-rich:
1200–2000+ words

Tetapi JANGAN padding.

Jika source memang hanya menyediakan sedikit informasi, artikel boleh lebih pendek.

==================================================
19. GEMINI BUKAN SATU-SATUNYA SUMBER INFORMASI
==============================================

Model bukan source of truth.

Source of truth:

Research result + verified sources + extracted facts.

Model bertugas:

* memahami
* reasoning
* synthesis
* composition
* editorial correction

bukan menciptakan fakta baru.

==================================================
20. EDITORIAL CORRECTION
========================

Jika Gemini digunakan untuk editorial correction, pertahankan role tersebut.

Gemini boleh memperbaiki:

* grammar
* spelling
* punctuation
* sentence structure
* readability
* flow
* consistency
* ambiguity

Tetapi tidak boleh:

* menambahkan fakta baru
* menambahkan angka baru
* membuat quote
* mengubah fakta
* membuat source baru
* mengubah makna evidence

Setelah editorial correction, lakukan fact validation ulang.

==================================================
21. ARTICLE SOURCE DISPLAY
==========================

Di Article Overview, tampilkan source secara profesional.

Contoh:

Sources

1. BPS
   Judul sumber
   Published date
   [Read source]
2. Kompas
   Judul sumber
   Published date
   [Read source]
3. Ministry / Institution
   Judul sumber
   Published date
   [Read source]

Jika memungkinkan, tampilkan juga:

* source type
* publication date
* accessed date
* source count
* related news

Jangan membuat source palsu hanya agar artikel terlihat lengkap.

==================================================
22. RESEARCH QUALITY SCORE INTERNAL
===================================

Buat internal evaluation untuk research.

Jangan hanya melihat jumlah source.

Evaluasi:

* relevance
* source diversity
* source authority
* freshness
* evidence coverage
* cross-source agreement
* contradiction count
* factual completeness

Jika research quality terlalu rendah:

jangan langsung generate final article.

Lakukan additional research.

Contoh:

Research Quality < threshold
→ search more sources
→ verify claims
→ improve research

Research Quality >= threshold
→ continue to story planning

==================================================
23. OBSERVABILITY / DEBUGGING
=============================

Tambahkan logging yang jelas untuk setiap generation.

Contoh:

[RESEARCH]
User prompt received

[RESEARCH]
Research plan generated

[SEARCH]
Found 27 candidate sources

[FILTER]
12 sources considered relevant

[EXTRACTION]
Successfully extracted 9 sources

[CLUSTER]
3 related news clusters detected

[FACT]
42 facts extracted

[VERIFICATION]
31 facts verified

[STORY]
Story plan generated

[COMPOSITION]
Article generated

[VALIDATION]
No unsupported claims detected

[EDITORIAL]
Editorial correction completed

[FINAL]
Article completed

Ini akan memudahkan debugging ketika hasil research buruk.

==================================================
24. AUDIT EXISTING CODEBASE TERLEBIH DAHULU
===========================================

Sebelum mengubah kode:

1. baca seluruh brainstorming/context `.md`
2. baca template yang tersedia
3. inspect API
4. inspect services
5. inspect models
6. inspect migrations
7. inspect database
8. inspect frontend
9. inspect existing article generation flow
10. inspect news discovery
11. inspect AI integrations
12. inspect environment configuration

Jangan menghapus functionality existing.

Reuse architecture yang masih baik.

Jika architecture existing memang tidak cukup untuk research pipeline ini, refactor secara terukur.

==================================================
25. IMPLEMENTASI LANGSUNG
=========================

Jangan hanya memberikan rekomendasi.

Jika membutuhkan:

* migration → buat migration dan jalankan
* model → buat/update
* service → implementasikan
* API endpoint → implementasikan
* queue/job → implementasikan
* scheduler → implementasikan
* caching → implementasikan
* frontend → implementasikan
* config → implementasikan
* dependency → install jika memungkinkan
* env variable → tambahkan contoh konfigurasi

Jangan berhenti pada TODO.

==================================================
26. TESTING
===========

Setelah implementasi:

* jalankan backend
* jalankan frontend
* test generation
* test research
* test source extraction
* test citation
* test rate-limit fallback
* test model fallback
* test article generation
* test empty result
* test invalid source
* test API failure
* test timeout
* test duplicate generation

Jika ada error, perbaiki langsung.

==================================================
27. ACCEPTANCE CRITERIA
=======================

Implementasi dianggap selesai jika:

[ ] Sistem tidak bergantung pada satu Gemini model.

[ ] Research menggunakan model/agent yang memang cocok untuk research.

[ ] User prompt benar-benar memengaruhi research.

[ ] Sistem dapat melakukan web/news discovery.

[ ] Source dibaca, bukan hanya title/snippet.

[ ] Source metadata tersimpan.

[ ] Source dapat ditelusuri dari artikel.

[ ] Fakta memiliki provenance.

[ ] Fakta penting dapat diverifikasi.

[ ] Sistem mampu membandingkan beberapa source.

[ ] Semantic similarity digunakan.

[ ] Related news dapat ditemukan.

[ ] Duplicate information dapat dikurangi.

[ ] Tidak ada fabricated facts.

[ ] Tidak ada fabricated citations.

[ ] Research result memiliki quality evaluation.

[ ] Jika research kurang, sistem dapat melakukan additional research.

[ ] Model fallback tersedia ketika rate limit terjadi.

[ ] Retry menggunakan exponential backoff.

[ ] API error ditangani dengan baik.

[ ] Article composition menggunakan research result.

[ ] Artikel tidak lagi hanya berupa beberapa paragraf pendek.

[ ] Article length adaptive terhadap information density.

[ ] Article Overview menampilkan artikel seperti professional digital publication.

[ ] Sources tampil di article overview.

[ ] Related news tampil jika tersedia.

[ ] Gemini editorial correction tidak boleh menambahkan fakta baru.

[ ] Final article melewati fact validation.

[ ] Existing functionality tetap berjalan.

[ ] Frontend responsive.

[ ] Loading state generation berjalan dengan benar.

[ ] Tidak ada duplicate generation ketika user menekan Generate berkali-kali.

==================================================
HASIL AKHIR YANG SAYA INGINKAN
==============================

Saya ingin project ini berkembang dari:

"AI yang membuat artikel"

menjadi:

"AI research-driven article generation system"

yang dapat:

1. memahami topik dari user,
2. menentukan apa yang perlu diteliti,
3. mencari sumber yang relevan,
4. membaca sumber,
5. membandingkan sumber,
6. menemukan fakta,
7. memverifikasi fakta,
8. menghubungkan berita yang berkaitan,
9. menyusun research result,
10. membuat story plan,
11. menulis artikel berdasarkan evidence,
12. melakukan editorial correction,
13. melakukan final fact validation,
14. menampilkan referensi yang valid dan dapat dibuka.

Yang paling penting:

JANGAN mengejar jumlah artikel.

Prioritaskan:

Research Quality
Source Quality
Fact Accuracy
Traceability
Relevance
Article Quality

daripada sekadar menghasilkan artikel sebanyak mungkin.

Jika ada pilihan antara artikel panjang tetapi banyak klaim tidak terverifikasi vs artikel sedikit lebih pendek tetapi seluruh faktanya memiliki evidence, pilih yang kedua.

Silakan implementasikan seluruh perubahan yang diperlukan setelah melakukan audit codebase.

Gemini API Rate Limit
Free tier
Project
Default Gemini Project
Time Range
28 Days
error
You have reached a rate limit. Set up billing to increase your limits and unblock your work.
Rate limits by model
Peak usage per model compared to its limit over the last 28 days
Model
Category
RPM
TPM
RPD
Charts
Gemini 3.8 Flash
Text-out models
7 / 5
9.85K / 250K
12 / 20
Antigravity
Agents
0 / 60
0 / 100K
0 / 100
Deep Research Pro Preview
Agents
0 / 0
0 / 0
0 / 0
Gemini 2 Flash
Text-out models
0 / 0
0 / 0
0 / 0
Gemini 2 Flash Lite
Text-out models
0 / 0
0 / 0
0 / 0
Computer Use Preview
Other models
0 / 0
0 / 0
0 / 0
Gemini 2.5 Flash
Text-out models
0 / 5
0 / 250K
0 / 20
Nano Banana (Gemini 2.5 Flash Preview Image)
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Gemini 2.5 Flash Lite
Text-out models
0 / 10
0 / 250K
0 / 20
Gemini 2.5 Flash TTS
Multi-modal generative models
0 / 3
0 / 10K
0 / 10
Gemini 2.5 Pro
Text-out models
0 / 0
0 / 0
0 / 0
Gemini 2.5 Pro TTS
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Gemini 3 Flash
Text-out models
0 / 5
0 / 250K
0 / 20
Nano Banana Pro (Gemini 3 Pro Image)
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Gemini 3.1 Pro
Text-out models
0 / 0
0 / 0
0 / 0
Nano Banana 2 (Gemini 3.1 Flash Image)
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Gemini 3.1 Flash Lite
Text-out models
0 / 15
0 / 250K
0 / 500
Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Gemini 3.1 Flash TTS
Multi-modal generative models
0 / 3
0 / 10K
0 / 10
Gemini 3.5 Flash
Text-out models
0 / 5
0 / 250K
0 / 20
Gemini 3.5 Flash Lite
Text-out models
0 / 15
0 / 250K
0 / 500
Gemini 3.5 Transcribe
Live API
0 / 3
0 / 10K
0 / 25
Gemini 3.6 Flash
Text-out models
0 / 5
0 / 250K
0 / 20
Gemini 3.7 Flash
Text-out models
0 / 5
0 / 250K
0 / 20
Gemini 3.8 Flash Lite TTS
Multi-modal generative models
0 / 3
0 / 10K
0 / 10
Gemini 3.8 Flash TTS
Multi-modal generative models
0 / 3
0 / 10K
0 / 10
Gemini Embedding 1
Other models
0 / 100
0 / 30K
0 / 1K
Gemini Embedding 2
Other models
0 / 100
0 / 30K
0 / 1K
Gemini Omni 1.1 Flash
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Gemini Omni Flash
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Gemini Robotics ER 2 Preview
Other models
0 / 5
0 / 250K
0 / 20
Gemma 4 26B
Other models
0 / 30
0 / 16K
0 / 14.4K
Gemma 4 31B
Other models
0 / 30
0 / 16K
0 / 14.4K
Lyria 3 Clip
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Lyria 3 Pro
Multi-modal generative models
0 / 0
0 / 0
0 / 0
Veo 3 Fast Generate
Multi-modal generative models
0 / 0
-----

0 / 0
Veo 3 Generate
Multi-modal generative models
0 / 0
-----

0 / 0
Veo 3 Lite Generate
Multi-modal generative models
0 / 0
-----

0 / 0
Gemini 2.5 Flash Native Audio Dialog
Live API
0 / Unlimited
0 / 1M
0 / Unlimited
Gemini 3 Flash Live
Live API
0 / Unlimited
0 / 65K
0 / Unlimited
Gemini 3.5 Live Translate
Live API
0 / Unlimited
0 / 20K
0 / Unlimited
Gemini 3.5 Transcribe Live
Live API
0 / Unlimited
0 / 20K
0 / Unlimited
Gemini 3.8 Live
Live API
0 / Unlimited
0 / 65K
0 / Unlimited
Gemini 3.8 Live Extended Thinking
Live API
0 / Unlimited
0 / 65K
0 / Unlimited
Tools
Deep Research Pro Preview
Map grounding	-	-
0 / 500
Gemini 2 Flash
Map grounding	-	-
0 / 500
Computer Use Preview
Map grounding	-	-
0 / 500
Gemini 2.5 Flash
Map grounding	-	-
0 / 500
Gemini 2.5 Flash Lite
Map grounding	-	-
0 / 500
Gemini 2.5 Pro
Map grounding	-	-
0 / 0
Gemini 3 Flash
Map grounding	-	-
0 / 0
Gemini 3.1 Pro
Map grounding	-	-
0 / 0
Gemini 3.1 Flash Lite
Map grounding	-	-
0 / 500
Gemini 3.1 Flash TTS
Map grounding	-	-
0 / 500
Gemini 3.5 Flash
Map grounding	-	-
0 / 0
Gemini 3.5 Flash Lite
Map grounding	-	-
0 / 500
Gemini 3.5 Transcribe
Map grounding	-	-
0 / 500
Gemini 3.6 Flash
Map grounding	-	-
0 / 0
Gemini 3.7 Flash
Map grounding	-	-
0 / 0
Gemini 3.8 Flash
Map grounding	-	-
0 / 0
Gemini Robotics ER 2 Preview
Map grounding	-	-
0 / 500
Gemini 2
Search grounding	-	-
0 / 1.5K
Gemini 2.5
Search grounding	-	-
0 / 1.5K
Gemini 3
Search grounding	-	-
0 / 0
Default
Search grounding	-	-
0 / 1.5K
Peak usage trends
Model
Gemini 3.8 Flash
Peak requests per minute (RPM)

Peak input tokens per minute (TPM)

Peak requests per day (RPD)

Tools
Search grounding
Peak requests per day (RPD)
Gemini 2

Map grounding
Peak requests per day (RPD)
Deep Research Pro Preview
