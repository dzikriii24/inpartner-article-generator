<?php

namespace Database\Seeders;

use App\Models\Author;
use App\Models\Banner;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Support\Html;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Idempotent: safe to run more than once (php artisan db:seed).
     */
    public function run(): void
    {
        // ---------------------------------------------------------------- admin
        User::updateOrCreate(
            ['email' => config('services.admin.email')],
            ['name' => config('services.admin.name'), 'password' => config('services.admin.password'), 'role' => 'admin', 'status' => 'active']
        );

        // ---------------------------------------------------------------- categories
        $categories = [
            ['Macro Economy', 'macro', 'globe', '#6366f1', 'Inflasi, suku bunga, kebijakan moneter & ekonomi global.'],
            ['Stock Market', 'stock', 'trending-up', '#10b981', 'Analisis saham, emiten, dan pergerakan indeks.'],
            ['Crypto & Digital Assets', 'crypto', 'bitcoin', '#f59e0b', 'Bitcoin, aset digital, dan regulasi kripto.'],
            ['Banking & Finance', 'banking', 'landmark', '#0ea5e9', 'Perbankan, fintech, dan industri keuangan.'],
            ['Business Strategy', 'business', 'briefcase', '#ec4899', 'Strategi bisnis, korporasi, dan kepemimpinan.'],
            ['Technology', 'technology', 'cpu', '#8b5cf6', 'AI, transformasi digital, dan industri teknologi.'],
            ['Research & Journal', 'research', 'book-open', '#14b8a6', 'Jurnal, paper riset, dan publikasi ilmiah.'],
        ];
        foreach ($categories as $i => [$name, $slug, $icon, $color, $desc]) {
            Category::updateOrCreate(['slug' => $slug], [
                'name' => $name, 'icon' => $icon, 'color' => $color, 'description' => $desc, 'sort_order' => $i,
            ]);
        }

        // ---------------------------------------------------------------- banners
        if (Banner::count() === 0) {
            Banner::insert([
                [
                    'eyebrow' => 'Evidence-based insight',
                    'title' => 'Riset bisnis & investasi, siap dibaca hari ini',
                    'subtitle' => 'Artikel premium yang diriset dan diverifikasi tim editorial Inpartner — dari makro ekonomi hingga pasar modal.',
                    'cta_label' => 'Jelajahi artikel', 'cta_url' => '/products?type=article',
                    'theme' => 'indigo', 'sort_order' => 0, 'is_active' => true, 'image_url' => null,
                    'created_at' => now(), 'updated_at' => now(),
                ],
                [
                    'eyebrow' => 'Library pribadi',
                    'title' => 'Beli sekali, akses selamanya',
                    'subtitle' => 'Semua pembelian tersimpan di Library kamu. Baca online kapan saja atau unduh versi PDF.',
                    'cta_label' => 'Lihat koleksi terbaru', 'cta_url' => '/products?sort=newest',
                    'theme' => 'amber', 'sort_order' => 1, 'is_active' => true, 'image_url' => null,
                    'created_at' => now(), 'updated_at' => now(),
                ],
            ]);
        }

        // ---------------------------------------------------------------- showcase manual products
        $editorial = Author::updateOrCreate(['slug' => 'inpartner-editorial-board'], [
            'name' => 'Inpartner Editorial Board',
            'bio' => 'Tim editorial Inpartner yang mengkurasi riset bisnis, ekonomi, dan investasi berbasis data.',
        ]);
        $research = Author::updateOrCreate(['slug' => 'inpartner-research-lab'], [
            'name' => 'Inpartner Research Lab',
            'bio' => 'Unit riset Inpartner yang menerbitkan jurnal dan paper tentang ekonomi digital Indonesia.',
        ]);

        $showcase = [
            [
                'slug' => 'panduan-investasi-untuk-profesional-muda',
                'type' => 'ebook',
                'title' => 'Panduan Investasi untuk Profesional Muda',
                'subtitle' => 'Membangun portofolio yang tahan krisis dari gaji pertama',
                'excerpt' => 'Ebook praktis tentang alokasi aset, dana darurat, reksa dana, saham, dan obligasi untuk profesional berusia 20–35 tahun.',
                'description' => '<p>Ebook ini membahas langkah demi langkah membangun kebiasaan investasi yang disiplin: mulai dari menyusun dana darurat, memahami profil risiko, hingga merancang alokasi aset jangka panjang.</p><ul><li>12 bab, studi kasus Indonesia</li><li>Template perencanaan keuangan</li><li>Checklist memilih instrumen investasi</li></ul>',
                'category' => 'business', 'author' => $editorial, 'price' => 89000, 'sale_price' => 59000,
                'access_type' => 'read', 'pages' => 120, 'language' => 'id', 'is_featured' => true,
                'content' => '<h2>Bab 1 — Mengapa Mulai Sekarang</h2><p>Waktu adalah aset terbesar investor muda. Dengan efek bunga majemuk, investasi kecil yang dilakukan secara konsisten sejak usia 25 tahun dapat tumbuh jauh lebih besar dibanding investasi besar yang baru dimulai di usia 40 tahun.</p><p>Namun sebelum membeli instrumen apa pun, fondasi keuangan harus kuat: arus kas positif, utang konsumtif terkendali, dan dana darurat yang memadai.</p><h2>Bab 2 — Dana Darurat</h2><p>Dana darurat idealnya setara 3–6 kali pengeluaran bulanan untuk karyawan lajang, dan 6–12 kali untuk yang sudah berkeluarga. Simpan di instrumen yang likuid dan berisiko rendah seperti tabungan terpisah atau reksa dana pasar uang.</p><h2>Bab 3 — Mengenal Profil Risiko</h2><p>Profil risiko ditentukan oleh horizon waktu, kebutuhan likuiditas, dan toleransi psikologis terhadap fluktuasi. Investor konservatif lebih nyaman dengan obligasi dan pasar uang, sedangkan investor agresif siap menghadapi volatilitas saham demi potensi imbal hasil yang lebih tinggi.</p><h2>Bab 4 — Alokasi Aset</h2><p>Aturan praktis “100 dikurangi usia” dapat menjadi titik awal porsi saham dalam portofolio. Lakukan rebalancing setidaknya setahun sekali agar komposisi tetap sesuai rencana.</p><blockquote>Investasi terbaik adalah yang bisa kamu jalankan secara konsisten, bukan yang paling menjanjikan di atas kertas.</blockquote><h2>Bab 5 — Disiplin dan Evaluasi</h2><p>Otomatiskan investasi bulanan, hindari keputusan emosional saat pasar bergejolak, dan evaluasi kinerja portofolio terhadap tujuan keuangan — bukan terhadap berita harian.</p>',
            ],
            [
                'slug' => 'jurnal-ekonomi-digital-indonesia-vol-1',
                'type' => 'journal',
                'title' => 'Jurnal Ekonomi Digital Indonesia — Vol. 1',
                'subtitle' => 'Adopsi pembayaran digital dan dampaknya terhadap UMKM',
                'excerpt' => 'Kumpulan studi empiris mengenai QRIS, dompet digital, dan inklusi keuangan UMKM di 10 provinsi.',
                'description' => '<p>Edisi perdana jurnal Inpartner Research Lab. Berisi 4 artikel riset peer-reviewed tentang transformasi pembayaran digital di Indonesia.</p>',
                'category' => 'research', 'author' => $research, 'price' => 45000, 'sale_price' => null,
                'access_type' => 'read', 'pages' => 64, 'language' => 'id', 'is_featured' => true,
                'content' => '<h2>Abstrak</h2><p>Penelitian ini menganalisis adopsi QRIS pada 1.240 pelaku UMKM di 10 provinsi selama periode 2022–2024. Hasil menunjukkan bahwa adopsi pembayaran digital berkorelasi positif dengan peningkatan omzet rata-rata sebesar 18% dan perbaikan pencatatan keuangan.</p><h2>1. Pendahuluan</h2><p>Bank Indonesia meluncurkan QRIS sebagai standar nasional kode QR pembayaran untuk mempercepat inklusi keuangan. Pertumbuhan merchant QRIS yang pesat membuka pertanyaan penting mengenai dampak riilnya terhadap kinerja usaha kecil.</p><h2>2. Metodologi</h2><p>Studi menggunakan metode campuran: survei terstruktur dan wawancara mendalam. Data dianalisis menggunakan regresi panel dengan kontrol sektor usaha, lokasi, dan skala usaha.</p><h2>3. Hasil</h2><p>UMKM yang mengadopsi QRIS lebih dari 12 bulan mencatat peningkatan frekuensi transaksi dan akses yang lebih baik ke pembiayaan formal, karena riwayat transaksi digital dapat digunakan sebagai dasar penilaian kredit.</p><h2>4. Kesimpulan</h2><p>Pembayaran digital bukan hanya alat transaksi, tetapi juga pintu masuk menuju ekosistem keuangan formal bagi UMKM.</p>',
            ],
            [
                'slug' => 'outlook-ekonomi-asia-tenggara-ringkasan-riset',
                'type' => 'research_paper',
                'title' => 'Outlook Ekonomi Asia Tenggara — Ringkasan Riset',
                'subtitle' => 'Ringkasan gratis untuk pembaca baru Inpartner',
                'excerpt' => 'Ringkasan riset gratis tentang prospek pertumbuhan, inflasi, dan arus investasi di kawasan ASEAN.',
                'description' => '<p>Paper ringkas yang dapat langsung kamu klaim gratis dan simpan di Library.</p>',
                'category' => 'macro', 'author' => $research, 'price' => 0, 'sale_price' => null,
                'access_type' => 'read', 'pages' => 12, 'language' => 'id', 'is_featured' => false,
                'content' => '<h2>Ringkasan Eksekutif</h2><p>Kawasan Asia Tenggara diperkirakan tetap menjadi salah satu kawasan dengan pertumbuhan tercepat di dunia, ditopang oleh konsumsi domestik, relokasi rantai pasok, dan percepatan ekonomi digital.</p><h2>Pertumbuhan</h2><p>Indonesia, Vietnam, dan Filipina menjadi motor utama pertumbuhan, dengan bonus demografi dan peningkatan investasi infrastruktur.</p><h2>Inflasi dan Suku Bunga</h2><p>Tekanan inflasi mereda seiring normalisasi harga komoditas, membuka ruang bagi bank sentral untuk menyesuaikan kebijakan moneter secara bertahap.</p><h2>Risiko</h2><p>Risiko utama meliputi perlambatan ekonomi Tiongkok, volatilitas nilai tukar, dan ketegangan geopolitik yang dapat memengaruhi arus perdagangan.</p>',
            ],
        ];

        foreach ($showcase as $s) {
            $content = Html::sanitize($s['content']);
            Product::updateOrCreate(['slug' => $s['slug']], [
                'type' => $s['type'],
                'title' => $s['title'],
                'subtitle' => $s['subtitle'],
                'excerpt' => $s['excerpt'],
                'description' => $s['description'],
                'content_html' => $content,
                'preview_html' => Html::preview($content, 90),
                'word_count' => Html::wordCount($content),
                'reading_time' => max(1, (int) ceil(Html::wordCount($content) / 220)),
                'category_id' => Category::where('slug', $s['category'])->value('id'),
                'author_id' => $s['author']->id,
                'price' => $s['price'],
                'sale_price' => $s['sale_price'],
                'access_type' => $s['access_type'],
                'pages' => $s['pages'],
                'language' => $s['language'],
                'is_featured' => $s['is_featured'],
                'status' => 'published',
                'published_at' => now()->subDays(rand(1, 20)),
                'source' => Product::SOURCE_MANUAL,
            ]);
        }

        $this->command?->info('Admin: '.config('services.admin.email').' / '.config('services.admin.password'));
    }
}
