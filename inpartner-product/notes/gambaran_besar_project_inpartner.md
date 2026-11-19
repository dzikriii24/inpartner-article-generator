# Gambaran Besar Project: Inpartner Digital Product Platform

> **Ringkasan Singkat:** Dokumen ini berisi gambaran umum mengenai konsep, alur kerja, serta keseluruhan fitur yang tersedia di platform **Inpartner Digital Product Store** (`https://digitalproductinpartner.1slabs.my.id/profile?tab=overview`), baik dari sisi pengunjung, pengguna/pembeli, maupun pengelola (admin), beserta arah pengembangan ke depan.

---

## 1. Konsep Utama Platform

**Inpartner Digital Product Platform** adalah website e-commerce dan ruang kerja riset digital yang dikelola langsung oleh satu institusi/perusahaan (bukan *marketplace* dengan banyak penjual seperti Tokopedia atau Shopee). Seluruh publikasi, laporan analisis, hingga layanan riset di dalamnya diterbitkan dan dikelola secara terpusat oleh pihak Inpartner.

Hal yang membedakan platform ini dengan toko file digital biasa adalah konsep **Hak Akses & Ruang Riset Terintegrasi**:

```text
Katalog Publikasi & Riset (Teks, PDF, Dataset Excel)
   ↓
Pengguna Memilih Produk → Checkout & Pembayaran (atau Klaim Gratis)
   ↓
Akses Terbuka Permanen di Akun Pengguna (My Library)
   ↓
Pengguna Membaca, Memberi Anotasi, Bertanya ke AI, Mengelola Progres Riset, hingga Menyusun Ringkasan
```

Artinya, pengguna tidak sekadar membeli lalu mengunduh file lepas, melainkan mendapatkan **hak akses resmi** ke dalam ekosistem baca dan manajemen riset pribadi yang langsung tersimpan di akun mereka.

### Jenis Produk Digital yang Didukung
Platform dirancang fleksibel untuk menampung berbagai format produk pengetahuan dan riset, antara lain:
- **Produk Riset & Intelijen Utama:** *Thematic Research* (Riset Tematik), *Sector Insights* (Kajian Sektor Industri), *Data Series & Stats* (Rangkaian Data Statistik), dan *Custom Analysis* (Layanan Riset Kustom).
- **Publikasi Digital Lainnya:** Artikel, *Ebook*, Jurnal, *Research Paper*, Majalah Digital, dan berkas dokumen pendukung lainnya.
- **Pengaturan Bahasa & Mata Uang:** Tampilan platform sudah mendukung 3 pilihan bahasa (Bahasa Indonesia, English, dan Bahasa Korea) dengan format harga dalam Rupiah (IDR).

---

## 2. Fitur Halaman Pengguna (Pengunjung & Pelanggan)

### A. Eksplorasi & Halaman Publik (Sebelum Login)

1. **Beranda (*Homepage*)**
   - Menampilkan bagian pembuka (*hero*), daftar laporan terbaru dan unggulan (dengan tampilan kartu editorial yang bersih), daftar kategori sektor industri, keunggulan layanan Inpartner (verifikasi data primer, telaah *senior partner*, lampiran data Excel, dan ruang baca lintas perangkat), serta formulir berlangganan *newsletter*.
2. **Katalog Publikasi & Pencarian Cepat**
   - Kolom pencarian cepat di bagian atas website yang langsung memunculkan saran judul laporan, kategori sektor, hingga nama penulis/analis saat mengetik.
   - Halaman katalog lengkap dengan filter kategori, tipe publikasi, penulis, pilihan harga (semua, berbayar, atau gratis), serta pengurutan (terbaru, terpopuler, termurah, termahal).
3. **Thematic Research Hub (Pusat Riset Tematik)**
   - Halaman khusus untuk menelusuri laporan-laporan riset tematik makroekonomi dan lintas sektor.
   - Pengguna dapat mencari topik, memfilter kategori, berpindah antar laporan dengan cepat, membaca ringkasan eksekutif, meninjau **metodologi penelitian**, melihat daftar bab, mengecek **sumber data primer resmi** (seperti BPS, Bank Indonesia, OJK, IMF, BIS, ADB), serta melihat status lampiran **dataset spreadsheet (Excel)** sebelum membeli.
4. **Sector Insights (Kajian Sektor Industri)**
   - Halaman khusus untuk mengeksplorasi analisis mendalam per sektor industri (seperti perbankan, energi, manufaktur, teknologi, ritel, logistik, dan lainnya) lengkap dengan filter sektor, filter harga, dan pencarian.
5. **Halaman Detail Produk**
   - Menampilkan sampul publikasi, spesifikasi lengkap (format file PDF/Excel, jumlah halaman dan kata, estimasi waktu baca), profil penulis atau *senior analyst*, serta tombol simpan ke *wishlist* dan keranjang.
   - **Free Preview (Pratinjau Gratis):** Pengunjung dapat membaca ringkasan eksekutif atau cuplikan awal isi laporan terlebih dahulu sebelum memutuskan membeli akses penuh.
   - **Bukti Kredibilitas:** Menampilkan daftar rujukan sumber data, jumlah pembeli terverifikasi, serta ulasan dan rating dari pembaca yang sudah memiliki laporan tersebut.
6. **Research With Us / Custom Analysis (Layanan Riset Kustom)**
   - Halaman khusus untuk klien korporasi atau institusi yang membutuhkan kajian eksklusif sesuai kebutuhan bisnis mereka (seperti studi kelayakan pasar, kajian regulasi, pemodelan finansial, dan *strategic due diligence*).
   - Dilengkapi informasi jaminan kerahasiaan (NDA & pemisahan akses data), estimasi luaran (*deliverables*), FAQ interaktif yang bisa dicari, serta formulir pengajuan mandat riset yang riwayat statusnya dapat dipantau melalui akun pengguna.

---

### B. Keranjang, Transaksi & Pembayaran

- **Wishlist & Keranjang Belanja:** Pengguna bisa menandai produk yang diminati ke daftar *Wishlist*, atau memasukkan beberapa produk sekaligus ke keranjang belanja (*Quick Cart Drawer* maupun halaman keranjang penuh).
- **Checkout & Pembayaran Online:** Mendukung berbagai metode pembayaran digital (Virtual Account, QRIS, E-Wallet, Kartu Kredit — serta mode simulasi pembayaran untuk keperluan uji coba). Untuk produk bertanda gratis (*Open Access*), pengguna cukup klik klaim dan akses langsung aktif tanpa proses transfer.
- **Detail Pesanan & Faktur:** Setiap transaksi tercatat lengkap beserta status pembayarannya dan menghasilkan rincian faktur resmi yang bisa dilihat kembali kapan saja.

---

### C. Library & Ruang Baca Interaktif (*Interactive Reader*)

Begitu transaksi selesai atau produk gratis diklaim, publikasi otomatis masuk ke **Library Pembaca Saya**:

1. **Halaman Library Pribadi**
   - **Ringkasan Koleksi:** Menampilkan jumlah total dokumen yang dimiliki, yang sedang dibaca, selesai dibaca, belum dibuka, favorit, dan dokumen terakhir yang diakses.
   - **Lanjutkan Membaca (*Continue Reading*):** Kartu akses cepat untuk langsung melanjutkan bacaan dari halaman terakhir beserta persentase progresnya.
   - **Filter & Favorit:** Pencarian dokumen di dalam library, filter berdasarkan status baca, pengurutan (*Favorit di Atas*, *Terakhir Dibaca*, *Progres Tertinggi*, dll.), tombol bintang untuk menandai laporan favorit, serta fitur pratinjau cepat.
   - **Riwayat Membaca:** Tab terpisah yang mengelompokkan aktivitas membaca secara kronologis (*Hari Ini*, *Kemarin*, *7 Hari Terakhir*, *Lebih Lama*), dan pengguna bisa menyembunyikan item dari riwayat tanpa menghapus progres bacanya.

2. **Ruang Baca Interaktif**
   - **Panel Navigasi Kiri (3 Tab):**
     - *Halaman:* Daftar halaman dokumen beserta penanda *bookmark*, jumlah sorotan/catatan di halaman tersebut, dan tombol **Ringkasan AI per Halaman** untuk memahami inti bahasan halaman secara cepat.
     - *Daftar Isi:* Struktur bab otomatis agar pembaca bisa langsung melompat ke bagian tertentu.
     - *Anotasi:* Kumpulan seluruh teks yang disorot dan catatan pribadi pada dokumen tersebut (klik item untuk langsung melompat ke posisi kutipan di dalam bacaan).
   - **Pengaturan Kenyamanan Baca:** Pilihan tema layar (**Terang** atau **Sepia**), pengaturan perbesaran teks (**Zoom** 60%–180%), mode layar penuh (*Fullscreen*), penanda halaman (**Bookmark**), serta penyimpanan progres baca secara otomatis.
   - **Toolbar Seleksi Teks:** Ketika pengguna memblok kalimat tertentu di dalam laporan, muncul menu cepat untuk:
     - **Memberi Sorotan (*Highlight*) 5 Warna:** Kuning (*Poin Kunci*), Biru (*Data & Fakta*), Hijau (*Peluang/Positif*), Merah (*Risiko/Perhatian*), dan Ungu (*Kajian Lanjutan*).
     - **Membuat Catatan Riset:** Otomatis menyalin kutipan kalimat dan nomor halamannya ke dalam formulir catatan.
     - **Tanya AI:** Mengirimkan kalimat yang baru saja diblok agar langsung dijelaskan oleh Asisten AI.
     - **Salin Teks:** Menyalin kutipan ke clipboard.
   - **Asisten Riset AI:** Fitur chat pendamping di dalam ruang baca untuk menanyakan isi laporan, istilah teknis, maupun implikasi bisnis. Jawabannya berpatokan pada isi dokumen (tidak mengarang angka di luar laporan) dan menyertakan penanda halaman sumber yang bisa diklik untuk langsung menuju halaman terkait. Riwayat tanya-jawab ini tersimpan per dokumen.
   - **Cetak & Ekspor PDF Kustom:** Pengguna bisa mengatur sendiri isi PDF yang ingin diunduh atau dicetak menggunakan 4 pilihan preset (*Dokumen Asli*, *Dengan Sorotan & Catatan*, *Laporan Lengkap beserta Ringkasan & Diskusi AI*, atau *Hanya Kumpulan Catatan*). Pengaturan mencakup halaman sampul, metadata, ukuran dan orientasi kertas, dengan hasil PDF yang teksnya tetap rapi dan bisa di-*copy* maupun dicari (`Ctrl+F`).
   - **Unduh Berkas Asli:** Pemilik akses dapat mengunduh file PDF utama maupun lampiran **dataset Excel (`.xlsx`)** yang menyertai laporan (bila produk memiliki opsi unduhan).

---

### D. Dashboard Manajemen Riset Pribadi (`/profile`)

Halaman profil pengguna dirancang bukan sekadar halaman biodata, melainkan **pusat kendali aktivitas riset pribadi** yang terdiri dari 8 tab:

1. **Dashboard Overview:** Menampilkan sapaan personal, 8 kartu ringkasan aktivitas (*Koleksi Dokumen, Waktu Membaca, Sorotan Riset, Catatan Pribadi, Penanda Halaman, Reading Streak, Riset Selesai, Agenda Riset*), kartu *Lanjutkan Bacaan Terakhir*, ringkasan aktivitas hari ini, progres target baca mingguan, serta jadwal riset mendatang.
2. **Kanban Riset:** Papan kerja 5 kolom (*1. To Read → 2. Reading → 3. Under Review → 4. Completed → 5. Archived*) untuk mengatur alur baca dan telaah seluruh laporan yang dimiliki. Pengguna bisa menggeser kartu antar kolom (*drag & drop*) atau memindahkannya lewat menu pilihan, serta menambahkan tingkat prioritas (*Rendah, Sedang, Tinggi, Mendesak*), tenggat waktu (*deadline*), dan catatan pribadi.
3. **Research Notebook:** Pusat penyimpanan seluruh *highlight*, catatan riset (bisa tambah, edit, hapus), dan *bookmark* dari **semua dokumen** di Library dalam satu halaman. Dilengkapi pencarian kata kunci serta filter berdasarkan dokumen dan warna sorotan.
4. **Kalender & Agenda:** Perencana jadwal membaca (tampilan kalender bulanan & daftar agenda) yang juga otomatis mendeteksi sesi membaca harian pengguna. Jika salah satu tanggal diklik, akan muncul rincian laporan apa saja yang dibaca hari itu, durasinya, serta sorotan dan catatan yang dibuat.
5. **Statistik & Heatmap:** Menampilkan rekor konsistensi baca harian (*Reading Streak*), total waktu dan sesi membaca, grafik distribusi baca mingguan, peta intensitas membaca selama setahun penuh (*Annual Reading Heatmap*), lini masa riwayat aktivitas lengkap, serta pengaturan target membaca (target menit per hari, jam per minggu, dan dokumen per bulan).
6. **Pengaturan Akun:** Mengubah foto profil, nama, nomor telepon, jabatan, nama perusahaan/organisasi, departemen, negara, zona waktu, bio singkat, serta mengganti kata sandi.
7. **Transaksi & Faktur:** Melihat riwayat pembelian laporan, status pembayaran, tombol bayar untuk transaksi yang masih menunggu, serta halaman detail faktur.
8. **Custom Analysis:** Memantau daftar dan status pengajuan riset kustom yang pernah dikirimkan.

---

### E. Studio Penyusunan & Penggabungan Dokumen (*Report Studio / Dossier Workspace*)

Selain membaca laporan yang sudah ada, platform juga menyediakan ruang kerja penyusunan dokumen:
- Pengguna dapat memilih beberapa publikasi yang sudah dimiliki di Library melalui fitur **Gabungkan Dokumen**, lalu menyatukannya ke dalam satu draf ringkasan (*dossier*).
- Pengguna bisa mengedit judul, subjudul, dan isi blok secara langsung (*Judul Bab*, *Paragraf Analisis*, *Kotak Key Takeaway*, *Callout Sorotan*, dan *Daftar Sumber*), mengatur urutan blok naik-turun, beralih antara **Mode Edit** dan **Pratinjau Baca**, serta mencetak atau menyimpannya sebagai PDF.
- *(Catatan kondisi saat ini: Ruang kerja ini masih berjalan di level browser untuk penyusunan dan cetak PDF, belum dilengkapi penyimpanan draf di akun maupun penyisipan grafik/tabel data dinamis).*

---

## 3. Fitur Pengelola Platform (Halaman Admin)

Untuk mendukung operasional bisnis satu perusahaan secara mandiri, panel Admin mencakup pengelolaan menyeluruh:

1. **Ringkasan Dashboard & Analitik Penjualan:** Memantau total pendapatan, grafik tren penjualan, jumlah pesanan (lunas maupun tertunda), jumlah pelanggan, dan produk terlaris.
2. **Pengelolaan Tampilan Beranda & Pengaturan Situs (CMS):** Mengubah teks, urutan bagian beranda, banner promosi, deskripsi situs, kontak resmi, tautan media sosial, hingga isi dalam 3 bahasa (ID, EN, KO) dengan fitur pratinjau draf sebelum dipublikasikan.
3. **Manajemen Produk Digital & Katalog:** Membuat, mengedit, mengatur status (*Draft, Published, Unpublished, Archived*), menetapkan harga dan diskon, mengatur jenis hak akses (baca saja, unduh saja, atau keduanya), mengisi daftar bab/metodologi/sumber, mengunggah gambar sampul, file PDF, dan lampiran dataset Excel, serta mengelola kategori dan profil penulis/*senior partner*.
4. **Moderasi Ulasan & Permintaan Riset Kustom:** Menyetujui atau meninjau ulasan produk dari pembeli serta memproses permintaan konsultasi *Custom Analysis* yang masuk.
5. **Manajemen Transaksi & Pelanggan:** Memantau seluruh pesanan, mengekspor laporan transaksi ke file CSV, memperbarui status pembayaran (termasuk konfirmasi pembayaran atau *refund*), serta mengelola akun pengguna termasuk memberikan atau mencabut hak akses produk secara manual.
6. **Hub Sinkronisasi Konten (*Generator Sync*):** Terhubung dengan sistem pembuat artikel internal agar draf artikel baru dapat ditarik ke katalog store, ditinjau, diberi harga, lalu diterbitkan oleh admin.
7. **Simulasi Pembayaran:** Pengaturan mode simulasi transaksi selama masa pengembangan sebelum terhubung penuh ke pembayaran live.

---

## 4. Arah Pengembangan ke Depan (Menuju Konten & Data Interaktif)

Melihat keseluruhan fondasi yang sudah terbangun saat ini, alur jual-beli hingga manajemen riset pribadi sudah berjalan lengkap. Tantangan dan peluang pengembangan berikutnya terletak pada **bagaimana konten dan data di dalam produk disajikan serta dibuat**:

1. **Dari Dokumen Statis ke Eksplorasi Data Dinamis:**
   - Saat ini, isi laporan masih dominan berupa narasi bacaan/PDF dengan file Excel yang terpisah sebagai lampiran unduhan.
   - Ke depannya, pengalaman membaca di detail produk maupun ruang baca dapat ditingkatkan agar pembaca bisa langsung berinteraksi dengan grafik dan tabel data di dalam halaman — misalnya menarik visualisasi ke panel dasbor pendamping, memfilter data berdasarkan wilayah atau rentang tahun, memeriksa sumber serta rumus perhitungan di balik setiap angka, hingga mengekspor potongan data yang sudah difilter ke Excel/CSV secara instan.
2. **Dari Upload File ke Pembuatan Produk Digital Langsung di Platform:**
   - Untuk menghadirkan penyajian data yang interaktif seperti di atas, platform tidak bisa hanya mengandalkan proses unggah file PDF atau Word yang sifatnya statis.
   - Arah pengembangan selanjutnya adalah membangun sistem pembuatan produk digital langsung di dalam website — mulai dari pengisian konten, pengolahan data, hingga penyajian visualisasinya — sehingga baik tim internal maupun pengguna nantinya tidak hanya menjadi pembaca/pembeli, tetapi juga dapat menyusun dan menerbitkan produk digital (seperti *paper*, *thematic research*, atau bentuk riset lainnya) langsung dari platform.
