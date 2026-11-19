# Laporan Aktivitas Bulanan - Oktober

## 1. Aktivitas yang Dikerjakan dan Perkembangannya

Di bulan Oktober ini, saya melanjutkan pengembangan proyek dari bulan September serta mulai membangun produk baru untuk kebutuhan Inpartner:

1. Inpartner Article Generator (Status: Selesai / Siap Rilis)
Website pembuat artikel otomatis berbasis AI ini sudah selesai 100%. Fitur pengumpulan berita, penulisan artikel, hingga ekspor ke dokumen PDF sudah berfungsi dengan baik. Saat ini sistem sudah finish, tinggal menunggu proses migrasi ke server produksi dan persiapan untuk peluncuran (launching).

2. Website Scraper & Database Kontak Perusahaan IDX (Status: Progres 75%)
Website ini dibuat untuk mengumpulkan dan menyimpan data perusahaan IDX beserta kontak para decision maker (seperti HRD atau pimpinan perusahaan) guna mempermudah alur reach-out bisnis B2B. Saat ini progresnya sekitar 75% dan sudah bisa diakses di https://contactscraper.1slabs.my.id/. Fokus saat ini tinggal mengoptimalkan engine scraper agar lebih stabil dan merapikan tampilan halaman web.

3. Platform Penjualan Produk Digital (Inpartner Product) (Status: Progres 60%)
Website ini dibangun agar Inpartner dapat menjual produk digital ke khalayak umum, seperti hasil riset tematik dan analisis bisnis. Saat ini progresnya sekitar 60%. Fitur yang sedang dikembangkan meliputi panel admin untuk mengelola produk secara penuh, integrasi payment gateway, fitur baca langsung di web (in-app reader), serta fitur AI untuk membantu menjelaskan bagian artikel yang belum dipahami pembaca. Selain itu, saya juga membuat grafik analitik pembaca yang ditanamkan ke website utama Inpartner agar tersinkronisasi ke admin artikel generator. Website ini bisa diakses di https://digitalproductinpartner.1slabs.my.id/.

---

## 2. Tantangan yang Dihadapi

Beberapa kendala yang saya hadapi selama pengerjaan proyek pada bulan ini:

1. Keterbatasan Server untuk Go-Live:
Proyek AI Article Generator sebenarnya sudah selesai, tetapi belum bisa go-live penuh karena belum tersedianya server produksi yang memadai. Untuk saat ini sistem masih memakai server lokal yang tidak bisa menyala 24 jam non-stop, sehingga di waktu-waktu tertentu sistem bisa off.

2. Masa Aktif dan Batasan Hosting Gratis:
Untuk pengujian beberapa website (seperti scraper dan produk digital), saya masih mengandalkan layanan hosting gratis. Kendalanya ada masa aktif yang bisa hangus sewaktu-waktu dan limit sumber daya, sehingga saya harus rutin memindahkan sistem ke provider gratis alternatif agar web tetap bisa diakses tim.

3. Optimalisasi Scraper dan Integrasi Fitur:
Pada web scraper, tantangannya adalah menjaga kestabilan penarikan data kontak perusahaan agar tidak terkena limit atau galat. Sedangkan pada web produk digital, tantangannya ada pada integrasi alur pembayaran (payment gateway), fitur asisten AI, dan sinkronisasi data grafik analitik antar-website agar minim bug.

---

## 3. Pengembangan Kompetensi yang Didapat

Selama pengerjaan aktivitas di bulan Oktober ini, banyak kompetensi baru yang saya dapatkan:

1. Dasar Digital Marketing & Alur B2B:
Saya belajar bagaimana alur reach-out ke perusahaan berjalan, bagaimana data kontak decision maker dimanfaatkan untuk pemasaran layanan B2B, serta alur penjualan produk digital berbasis riset.

2. Peningkatan Skill Web Development:
Kemampuan teknis saya semakin terasah, terutama dalam menangani alur payment gateway, integrasi fitur AI interaktif untuk pembaca, pengamanan dokumen digital di browser, serta sinkronisasi data analitik lintas website.

3. Pengalaman Server & Deployment:
Saya belajar banyak hal praktis tentang deployment web, konfigurasi domain/subdomain, serta bagaimana menyiasati keterbatasan infrastruktur server.

4. Adaptabilitas dan Eksplorasi Tools Baru:
Banyaknya studi kasus baru selama magang di bulan ini melatih saya untuk lebih cepat mempelajari tools dan teknologi baru, serta lebih terbiasa mencari solusi teknis secara mandiri.
