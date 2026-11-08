<?php

namespace Database\Seeders;

use App\Models\Author;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ThematicProductSeeder extends Seeder
{
    public function run(): void
    {
        $macroCat = Category::where('slug', 'macro')->first() ?? Category::first();
        $researchAuthor = Author::where('slug', 'inpartner-research-lab')->first() ?? Author::first();

        $previewHtml = '
        <p><em>Kajian makroekonomi terstruktur multi-sektor yang menelaah dinamika suku bunga, kebijakan moneter, transmisi likuiditas perbankan, dan skenario geopolitik jangka panjang untuk memandu keputusan strategis pemimpin bisnis dan pengelola dana investasi.</em></p>
        
        <h3>Key Takeaways & Temuan Utama</h3>
        <ul>
            <li><strong>Ruang Pelonggaran Moneter Terukur:</strong> Normalisasi inflasi global membuka peluang penyesuaian suku bunga acuan BI-Rate sebesar 25-50 bps secara bertahap dengan tetap memprioritaskan stabilitas nilai tukar Rupiah.</li>
            <li><strong>Transmisi Likuiditas Perbankan:</strong> Rasio AL/NCD dan LDR perbankan domestik berada pada level memadai (&gt;118%), namun intermediasi kredit ke sektor riil menunjukkan divergensi tajam antara korporasi besar dan segmen ritel/UMKM.</li>
            <li><strong>Sensitivitas Biaya Dana (Cost of Funds):</strong> Tingginya penyerapan likuiditas oleh instrumen moneter SRBI mendorong kompetisi dana pihak ketiga (DPK) antar bank papan atas, menahan penurunan suku bunga kredit modal kerja.</li>
            <li><strong>Dinamika Geopolitik & Rantai Pasok:</strong> Polarisasi jalur dagang global dan eskalasi tarif impor menuntut korporasi mendiversifikasi sumber pasokan serta mengamankan lindung nilai (hedging) devisa secara disiplin.</li>
        </ul>

        <h2>1. Macroeconomic Overview: Menavigasi Disparitas Pertumbuhan</h2>
        <p>Pertumbuhan ekonomi domestik diproyeksikan bertahan di kisaran 5,05% - 5,20%, ditopang oleh konsumsi rumah tangga yang resilien dan berlanjutnya investasi infrastruktur strategis nasional. Meski demikian, tekanan defisit transaksi berjalan serta pergeseran selera investor global terhadap aset berkembang (emerging markets) menuntut kehati-hatian dalam alokasi aset.</p>

        <h2>2. Monetary Policy Outlook & Proyeksi Suku Bunga</h2>
        <p>Kebijakan suku bunga Bank Indonesia berfokus pada pro-stability untuk nilai tukar dan pro-growth untuk pertumbuhan domestik. Penurunan Fed Funds Rate (FFR) oleh The Federal Reserve memberikan ruang pelonggaran likuiditas, tetapi volatilitas imbal hasil US Treasury bertenor 10 tahun tetap menjadi jangkar utama pergerakan yield obligasi negara.</p>

        <h2>3. Transmisi Likuiditas Perbankan ke Sektor Riil</h2>
        <p>Pertumbuhan kredit perbankan diproyeksikan berada pada rentang 10,0% - 11,5% YoY. Kategori korporasi energi terbarukan, pertambangan hilir, dan logistik mencatatkan permintaan ekspansi tertinggi, sementara segmen konsumsi rumah tangga menghadapi normalisasi daya beli di kalangan kelas menengah.</p>
        ';

        $sources = [
            [
                'publisher' => 'Bank Indonesia',
                'title' => 'Laporan Kebijakan Moneter & Laporan Perekonomian Indonesia: Dinamika Inflasi dan Transmisi BI-Rate',
                'url' => 'https://www.bi.go.id',
                'year' => '2026',
                'category' => 'Central Bank Publications'
            ],
            [
                'publisher' => 'Badan Pusat Statistik (BPS)',
                'title' => 'Statistik Produk Domestik Bruto (PDB) & Indeks Harga Konsumen (IHK) Menurut Komponen',
                'url' => 'https://www.bps.go.id',
                'year' => '2026',
                'category' => 'Government & Statistical Institutions'
            ],
            [
                'publisher' => 'Otoritas Jasa Keuangan (OJK)',
                'title' => 'Statistik Perbankan Indonesia: Analisis Likuiditas, Rasio Kredit Modal Kerja & Kualitas Aset (NPL)',
                'url' => 'https://www.ojk.go.id',
                'year' => '2026',
                'category' => 'Government & Statistical Institutions'
            ],
            [
                'publisher' => 'International Monetary Fund (IMF)',
                'title' => 'World Economic Outlook (WEO): Navigating Policy Divergence and Global Trade Fragmentation',
                'url' => 'https://www.imf.org',
                'year' => '2026',
                'category' => 'International Financial Institutions'
            ],
            [
                'publisher' => 'Bank for International Settlements (BIS)',
                'title' => 'Quarterly Review: Cross-Border Liquidity Transmission and Banking System Resilience',
                'url' => 'https://www.bis.org',
                'year' => '2026',
                'category' => 'International Financial Institutions'
            ],
            [
                'publisher' => 'Asian Development Bank (ADB)',
                'title' => 'Asian Development Outlook: Growth Momentum in Southeast Asia Amid External Shocks',
                'url' => 'https://www.adb.org',
                'year' => '2026',
                'category' => 'International Financial Institutions'
            ]
        ];

        Product::updateOrCreate(
            ['slug' => 'thematic-research-macro-outlook'],
            [
                'type' => 'thematic_research',
                'title' => 'Thematic Research & Macro Outlook 2026: Suku Bunga, Likuiditas Perbankan, dan Skenario Geopolitik',
                'subtitle' => 'Kajian makroekonomi terstruktur multi-sektor yang menelaah dinamika suku bunga, kebijakan moneter, transmisi likuiditas perbankan, dan skenario geopolitik jangka panjang.',
                'excerpt' => 'Laporan riset makroekonomi komprehensif mengkaji arah kebijakan BI-Rate, transmisi likuiditas kredit perbankan, resiliensi konsumsi domestik, serta 3 skenario geopolitik global.',
                'description' => 'Kajian makroekonomi terstruktur multi-sektor yang menelaah dinamika suku bunga, kebijakan moneter, transmisi likuiditas perbankan, dan skenario geopolitik jangka panjang.',
                'content_html' => $previewHtml,
                'preview_html' => $previewHtml,
                'category_id' => $macroCat?->id,
                'author_id' => $researchAuthor?->id,
                'senior_partner' => null,
                'price' => 175000,
                'sale_price' => 125000,
                'status' => 'published',
                'access_type' => 'read_download',
                'access_level' => 'enterprise',
                'reading_time' => 35,
                'word_count' => 14500,
                'pages' => 48,
                'language' => 'id',
                'is_featured' => true,
                'sales_count' => 0,
                'view_count' => 0,
                'excel_file_path' => 'files/Dataset_Transmisi_Moneter_Likuiditas_Perbankan_2026.xlsx',
                'excel_file_name' => 'Dataset_Transmisi_Moneter_Likuiditas_Perbankan_2026.xlsx',
                'methodology' => 'Analisis ekonometrika transmisi moneter menggunakan Vector Autoregression (VAR) dan Stress-Testing transmisi likuiditas kredit berbasis data Bank Indonesia, BPS, dan BIS.',
                'sources' => $sources,
                'tags' => ['Macroeconomic Research', 'Monetary Policy', 'Banking Liquidity', 'Interest Rate', 'Geopolitical Risk', 'Economic Outlook 2026'],
                'published_at' => '2026-10-15 08:30:00',
            ]
        );

        // 2. Thematic: Energy Transition & Green Industrialization
        Product::updateOrCreate(
            ['slug' => 'thematic-energy-transition-green-economy'],
            [
                'type' => 'thematic_research',
                'title' => 'Thematic Research: Transisi Energi, Hilirisasi Mineral Kritis & Dekarbonisasi Industri 2026',
                'subtitle' => 'Analisis mendalam dampak pajak karbon, implementasi Taksonomi Hijau Indonesia 2.0, dan peluang investasi hilirisasi ekosistem baterai kendaraan listrik.',
                'excerpt' => 'Kajian menyeluruh mengenai roadmap dekarbonisasi korporasi manufaktur, keekonomian smelter HPAL, serta instrumen pembiayaan hijau (Green Bonds) di Indonesia.',
                'description' => 'Analisis mendalam dampak pajak karbon, implementasi Taksonomi Hijau Indonesia 2.0, dan peluang investasi hilirisasi ekosistem baterai kendaraan listrik.',
                'content_html' => $previewHtml,
                'preview_html' => $previewHtml,
                'category_id' => $macroCat?->id,
                'author_id' => $researchAuthor?->id,
                'senior_partner' => null,
                'price' => 160000,
                'sale_price' => 110000,
                'status' => 'published',
                'access_type' => 'read_download',
                'access_level' => 'professional',
                'reading_time' => 30,
                'word_count' => 12800,
                'pages' => 42,
                'language' => 'id',
                'is_featured' => true,
                'sales_count' => 0,
                'view_count' => 0,
                'excel_file_path' => 'files/Dataset_Pemodelan_Keekonomian_Hilirisasi_Energi_2026.xlsx',
                'excel_file_name' => 'Dataset_Pemodelan_Keekonomian_Hilirisasi_Energi_2026.xlsx',
                'methodology' => 'Discounted Cash Flow (DCF) Capex smelter nikel dan Levelized Cost of Electricity (LCOE) energi terbarukan terintegrasi.',
                'sources' => $sources,
                'tags' => ['Energy Transition', 'Critical Minerals', 'Green Taxonomy', 'Carbon Tax', 'EV Battery Ecosystem'],
                'published_at' => '2026-10-20 09:15:00',
            ]
        );

        // 3. Thematic: Digital Economy & AI Banking
        Product::updateOrCreate(
            ['slug' => 'thematic-digital-economy-fintech-landscape'],
            [
                'type' => 'thematic_research',
                'title' => 'Thematic Research: Ekonomi Digital, AI Banking & Lanskap Sistem Pembayaran 2026',
                'subtitle' => 'Pemetaan komprehensif adopsi Generative AI pada perbankan nasional, penetrasi cross-border QRIS, dan disrupsi embedded finance bagi model bisnis ritel.',
                'excerpt' => 'Riset strategis mengevaluasi profitabilitas ekosistem fintech, regulasi perlindungan data pribadi perbankan digital, dan valuasi merger-akuisisi sektor teknologi.',
                'description' => 'Pemetaan komprehensif adopsi Generative AI pada perbankan nasional, penetrasi cross-border QRIS, dan disrupsi embedded finance bagi model bisnis ritel.',
                'content_html' => $previewHtml,
                'preview_html' => $previewHtml,
                'category_id' => $macroCat?->id,
                'author_id' => $researchAuthor?->id,
                'senior_partner' => null,
                'price' => 140000,
                'sale_price' => 95000,
                'status' => 'published',
                'access_type' => 'read_download',
                'access_level' => 'professional',
                'reading_time' => 28,
                'word_count' => 11200,
                'pages' => 38,
                'language' => 'id',
                'is_featured' => true,
                'sales_count' => 0,
                'view_count' => 0,
                'excel_file_path' => 'files/Dataset_Penetrasi_Fintech_AI_Banking_2026.xlsx',
                'excel_file_name' => 'Dataset_Penetrasi_Fintech_AI_Banking_2026.xlsx',
                'methodology' => 'Survei kuantitatif 45 institusi perbankan & fintech terdaftar OJK serta benchmarking efisiensi operasional berbasis AI.',
                'sources' => $sources,
                'tags' => ['Digital Economy', 'Fintech', 'AI Banking', 'QRIS Cross-Border', 'Embedded Finance'],
                'published_at' => '2026-10-28 10:00:00',
            ]
        );

        // 4. Thematic: Supply Chain Resilience & Trade Corridors
        Product::updateOrCreate(
            ['slug' => 'thematic-asean-supply-chain-geopolitics'],
            [
                'type' => 'thematic_research',
                'title' => 'Thematic Research: Rekonfigurasi Rantai Pasok ASEAN & Resiliensi Perdagangan Maritim 2026',
                'subtitle' => 'Studi geopolitik dan logistik strategis menelaah pergeseran rantai pasok global (China+1), tarif impor proteksionis, dan utilisasi koridor pelabuhan hub maritim.',
                'excerpt' => 'Analisis mendalam biaya logistik inter-island, utilisasi mata uang lokal (LCT) untuk mitigasi risiko valas, dan strategi mitigasi gangguan rute dagang Indo-Pasifik.',
                'description' => 'Studi geopolitik dan logistik strategis menelaah pergeseran rantai pasok global (China+1), tarif impor proteksionis, dan utilisasi koridor pelabuhan hub maritim.',
                'content_html' => $previewHtml,
                'preview_html' => $previewHtml,
                'category_id' => $macroCat?->id,
                'author_id' => $researchAuthor?->id,
                'senior_partner' => null,
                'price' => 165000,
                'sale_price' => 120000,
                'status' => 'published',
                'access_type' => 'read_download',
                'access_level' => 'enterprise',
                'reading_time' => 32,
                'word_count' => 13500,
                'pages' => 46,
                'language' => 'id',
                'is_featured' => false,
                'sales_count' => 0,
                'view_count' => 0,
                'excel_file_path' => 'files/Dataset_Logistik_Maritim_Rantai_Pasok_ASEAN_2026.xlsx',
                'excel_file_name' => 'Dataset_Logistik_Maritim_Rantai_Pasok_ASEAN_2026.xlsx',
                'methodology' => 'Gravity model perdagangan bilateral internasional dan simulasi biaya kontainer freight rate berbasis rute Selat Malaka.',
                'sources' => $sources,
                'tags' => ['Supply Chain', 'Geopolitics', 'Maritime Trade', 'ASEAN Logistics', 'China+1 Strategy'],
                'published_at' => '2026-11-02 11:30:00',
            ]
        );
    }
}

