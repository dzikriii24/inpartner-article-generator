<?php

namespace Database\Seeders;

use App\Models\CmsSection;
use App\Models\CmsSectionTranslation;
use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class CmsInitialSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Site Settings
        $settings = [
            'site_name' => 'INPARTNER',
            'site_tagline' => 'Digital Knowledge & Strategic Intelligence',
            'site_description' => 'Platform penerbitan riset strategis, analisis ekonomi, dan produk digital premium Indonesia.',
            'site_logo' => null,
            'contact_email' => 'editorial@inpartner.id',
            'contact_phone' => '+62 21 5088 0123',
            'social_linkedin' => 'https://linkedin.com/company/inpartner',
            'social_twitter' => 'https://x.com/inpartner_id',
            'social_instagram' => 'https://instagram.com/inpartner.id',
            'footer_copyright' => '© 2026 INPARTNER. Seluruh hak cipta dilindungi undang-undang.',
            'navbar_menu' => [
                ['label' => 'Katalog', 'url' => '/products'],
                ['label' => 'Riset Tematik', 'url' => '/products?type=thematic_research'],
                ['label' => 'Kajian Sektor', 'url' => '/products?type=insight'],
                ['label' => 'Custom Analysis', 'url' => '/products?custom=true'],
            ],
            'seo_meta_title' => 'INPARTNER — Digital Knowledge & Strategic Intelligence Platform',
            'seo_meta_description' => 'Akses ribuan paper penelitian, jurnal akademik, analisis pasar, dan ebook eksekutif untuk mempercepat pemahaman dan pengambilan keputusan strategis Anda.',
        ];

        foreach ($settings as $key => $val) {
            SiteSetting::set($key, $val, 'general', true);
        }

        // 2. CMS Sections
        $sections = [
            [
                'key' => 'hero',
                'type' => 'hero',
                'sort_order' => 1,
                'title' => 'Wawasan Strategis & Riset Terverifikasi untuk Pemimpin Bisnis',
                'subtitle' => 'Akses intelligence mendalam, riset ekonomi, dan dokumen analisis industri terkurasi oleh para praktisi dan analis terkemuka.',
                'content' => [
                    'eyebrow' => 'Evidence-Based Intelligence Platform',
                    'cta_primary_label' => 'Jelajahi Katalog Riset',
                    'cta_primary_url' => '/products',
                    'cta_secondary_label' => 'Layanan Analisis Kustom',
                    'cta_secondary_url' => '/products?custom=true',
                    'badge_text' => 'Edisi Terverifikasi 2026',
                ],
                'settings' => ['layout' => 'centered', 'background' => 'white'],
                'en' => [
                    'title' => 'Strategic Intelligence & Verified Research for Business Leaders',
                    'subtitle' => 'Access deep intelligence, economic research, and curated industry analysis by prominent practitioners and analysts.',
                    'content' => [
                        'eyebrow' => 'Evidence-Based Intelligence Platform',
                        'cta_primary_label' => 'Explore Research Catalog',
                        'cta_secondary_label' => 'Custom Analysis Services',
                        'badge_text' => '2026 Verified Editions',
                    ],
                ],
                'ko' => [
                    'title' => '비즈니스 리더를 위한 전략적 인텔리전스 및 검증된 연구 보고서',
                    'subtitle' => '업계 전문가와 수석 분석가가 큐레이션한 심층 경제 분석 및 산업 연구 문서를 확인하세요.',
                    'content' => [
                        'eyebrow' => '데이터 기반 인텔리전스 플랫폼',
                        'cta_primary_label' => '연구 카탈로그 둘러보기',
                        'cta_secondary_label' => '맞춤형 분석 서비스',
                        'badge_text' => '2026 검증 리포트',
                    ],
                ],
            ],
            [
                'key' => 'featured_products',
                'type' => 'featured_products',
                'sort_order' => 2,
                'title' => 'Publikasi Pilihan Dewan Editorial',
                'subtitle' => 'Dokumen dan paper riset strategis dengan relevansi analisis tertinggi minggu ini.',
                'content' => [],
                'settings' => ['max_items' => 4, 'style' => 'grid'],
                'en' => [
                    'title' => 'Editorial Board Highlights',
                    'subtitle' => 'Strategic documents and research papers with the highest analytical impact this week.',
                    'content' => [],
                ],
                'ko' => [
                    'title' => '편집위원회 추천 연구',
                    'subtitle' => '이번 주 가장 높은 분석적 가치를 지닌 전략적 연구 보고서입니다.',
                    'content' => [],
                ],
            ],
            [
                'key' => 'categories',
                'type' => 'categories',
                'sort_order' => 3,
                'title' => 'Eksplorasi Bidang & Industri',
                'subtitle' => 'Jelajahi analisis mendalam menurut fokus sektor dan spesialisasi kajian ekonomi.',
                'content' => [],
                'settings' => ['style' => 'pills'],
                'en' => [
                    'title' => 'Explore by Sector & Discipline',
                    'subtitle' => 'Explore rigorous deep-dives tailored to industry sectors and economic specializations.',
                    'content' => [],
                ],
                'ko' => [
                    'title' => '산업 및 분야별 탐색',
                    'subtitle' => '산업 부문 및 경제 전문 연구 주제별로 심층 분석을 탐색하세요.',
                    'content' => [],
                ],
            ],
            [
                'key' => 'why_us',
                'type' => 'why_us',
                'sort_order' => 4,
                'title' => 'Mengapa Para Pengambil Keputusan Mengandalkan Inpartner',
                'subtitle' => 'Kualitas analisis yang didasarkan pada data primer dan metodologi empiris yang teruji.',
                'content' => [
                    'items' => [
                        [
                            'icon' => 'ShieldCheck',
                            'title' => 'Data Primer Terverifikasi',
                            'description' => 'Setiap publikasi melalui validasi sumber primer, triangulasi data resmi BPS, BI, dan regulator terkait.'
                        ],
                        [
                            'icon' => 'Briefcase',
                            'title' => 'Senior Partner Review',
                            'description' => 'Ditelaah langsung oleh praktisi industri dengan pengalaman lebih dari 15 tahun di sektornya.'
                        ],
                        [
                            'icon' => 'FileSpreadsheet',
                            'title' => 'Termasuk Model Data Excel',
                            'description' => 'Unduh spreadsheet siap pakai untuk analisis mandiri dan pemodelan finansial instan.'
                        ],
                        [
                            'icon' => 'BookOpen',
                            'title' => 'Reader Digital Multidevice',
                            'description' => 'Baca langsung di desktop, tablet, maupun mobile dengan fitur bookmark dan resume posisi otomatis.'
                        ]
                    ]
                ],
                'settings' => [],
                'en' => [
                    'title' => 'Why Decision Makers Rely on Inpartner',
                    'subtitle' => 'Analytical precision grounded in empirical methodology and verified primary datasets.',
                    'content' => [
                        'items' => [
                            [
                                'icon' => 'ShieldCheck',
                                'title' => 'Verified Primary Data',
                                'description' => 'Each publication undergoes rigorous source triangulation with official central bank and statistical agencies.'
                            ],
                            [
                                'icon' => 'Briefcase',
                                'title' => 'Senior Partner Review',
                                'description' => 'Reviewed by seasoned industry practitioners with over 15 years of on-the-ground experience.'
                            ],
                            [
                                'icon' => 'FileSpreadsheet',
                                'title' => 'Includes Excel Datasets',
                                'description' => 'Download accompanying structured spreadsheets for your own proprietary modeling.'
                            ],
                            [
                                'icon' => 'BookOpen',
                                'title' => 'Cross-Platform Digital Reader',
                                'description' => 'Read seamlessly across desktop, tablet, and mobile with auto-saved reading progress.'
                            ]
                        ]
                    ],
                ],
                'ko' => [
                    'title' => '의사결정권자들이 Inpartner를 신뢰하는 이유',
                    'subtitle' => '실증적 연구 방법론과 신뢰할 수 있는 1차 데이터에 기반한 고품질 분석.',
                    'content' => [
                        'items' => [
                            [
                                'icon' => 'ShieldCheck',
                                'title' => '검증된 1차 데이터',
                                'description' => '모든 보고서는 중앙은행 및 공공 통계 기관 데이터와의 교차 검증을 거칩니다.'
                            ],
                            [
                                'icon' => 'Briefcase',
                                'title' => '수석 파트너 감수',
                                'description' => '업계 15년 이상의 경력을 가진 전문가들이 엄격하게 감수합니다.'
                            ],
                            [
                                'icon' => 'FileSpreadsheet',
                                'title' => 'Excel 데이터셋 포함',
                                'description' => '독립적인 재무 모델링을 위해 즉시 사용 가능한 스프레드시트를 제공합니다.'
                            ],
                            [
                                'icon' => 'BookOpen',
                                'title' => '멀티 디바이스 디지털 리더',
                                'description' => '북마크 및 진도 저장 기능으로 모든 기기에서 편안하게 읽을 수 있습니다.'
                            ]
                        ]
                    ],
                ],
            ],
            [
                'key' => 'latest_products',
                'type' => 'latest_products',
                'sort_order' => 5,
                'title' => 'Riset & Dokumen Terbaru',
                'subtitle' => 'Publikasi terkini yang baru saja diterbitkan oleh tim editorial dan analis Inpartner.',
                'content' => [],
                'settings' => ['max_items' => 6],
                'en' => [
                    'title' => 'Latest Publications & Research',
                    'subtitle' => 'Freshly published intelligence papers by the Inpartner editorial and research lab.',
                    'content' => [],
                ],
                'ko' => [
                    'title' => '최신 연구 및 출판물',
                    'subtitle' => 'Inpartner 연구팀이 최근 발표한 최신 분석 보고서입니다.',
                    'content' => [],
                ],
            ],
            [
                'key' => 'about',
                'type' => 'about',
                'sort_order' => 6,
                'title' => 'Membuka Akses Intelligence Bisnis Kelas Satu',
                'subtitle' => 'Inpartner hadir sebagai jembatan antara riset akademik tingkat tinggi dengan eksekusi strategi bisnis nyata.',
                'content' => [
                    'description' => 'Kami percaya keputusan strategis terbaik lahir dari data yang akurat dan sintesis analitis yang tajam. Platform kami dirancang untuk eksekutif, konsultan, analis investasi, dan praktisi bisnis yang membutuhkan wawasan berkualitas tanpa bias.',
                    'stats' => [
                        ['label' => 'Publikasi Terverifikasi', 'value' => '150+'],
                        ['label' => 'Pembaca Eksekutif', 'value' => '12.000+'],
                        ['label' => 'Tingkat Kepuasan Riset', 'value' => '98.4%'],
                    ],
                    'cta_label' => 'Jelajahi Metodologi & Riset',
                    'cta_url' => '/products',
                ],
                'settings' => [],
                'en' => [
                    'title' => 'Unlocking First-Class Business Intelligence',
                    'subtitle' => 'Inpartner bridges rigorous economic methodology with real-world corporate strategy.',
                    'content' => [
                        'description' => 'We believe the strongest business decisions stem from empirical clarity and rigorous analytical synthesis. Our platform empowers executives, investment managers, and analysts with unbiased actionable intelligence.',
                        'stats' => [
                            ['label' => 'Verified Publications', 'value' => '150+'],
                            ['label' => 'Executive Readers', 'value' => '12,000+'],
                            ['label' => 'Satisfaction Rate', 'value' => '98.4%'],
                        ],
                        'cta_label' => 'Explore Our Research',
                    ],
                ],
                'ko' => [
                    'title' => '최고 수준의 비즈니스 인텔리전스 제공',
                    'subtitle' => 'Inpartner는 학술적 엄밀성과 실제 기업 경영 전략을 연결합니다.',
                    'content' => [
                        'description' => '최고의 의사결정은 정확한 데이터와 명확한 분석에서 출발합니다. 편향 없는 신뢰할 수 있는 인사이트를 제공합니다.',
                        'stats' => [
                            ['label' => '검증된 보고서', 'value' => '150+'],
                            ['label' => '기업 리더 독자', 'value' => '12,000+'],
                            ['label' => '고객 만족도', 'value' => '98.4%'],
                        ],
                        'cta_label' => '연구 보고서 둘러보기',
                    ],
                ],
            ],
            [
                'key' => 'cta',
                'type' => 'cta',
                'sort_order' => 7,
                'title' => 'Butuh Riset Khusus untuk Kebutuhan Korporasi Anda?',
                'subtitle' => 'Tim analis senior Inpartner siap menyusun studi kelayakan pasar, due diligence ekonomi, dan kajian regulasi eksklusif.',
                'content' => [
                    'cta_primary_label' => 'Ajukan Custom Analysis',
                    'cta_primary_url' => '/products?custom=true',
                    'cta_secondary_label' => 'Lihat Katalog Lengkap',
                    'cta_secondary_url' => '/products',
                ],
                'settings' => [],
                'en' => [
                    'title' => 'Need Tailored Research for Your Organization?',
                    'subtitle' => 'Our senior partners provide bespoke market feasibility studies, policy assessments, and proprietary sector modeling.',
                    'content' => [
                        'cta_primary_label' => 'Request Custom Analysis',
                        'cta_secondary_label' => 'View Full Catalog',
                    ],
                ],
                'ko' => [
                    'title' => '기업 맞춤형 전문 연구가 필요하신가요?',
                    'subtitle' => 'Inpartner 수석 분석팀이 시장 타당성 조사 및 규제 정책 맞춤 연구를 수행합니다.',
                    'content' => [
                        'cta_primary_label' => '맞춤 분석 의뢰하기',
                        'cta_secondary_label' => '전체 카탈로그 보기',
                    ],
                ],
            ],
            [
                'key' => 'newsletter',
                'type' => 'newsletter',
                'sort_order' => 8,
                'title' => 'Dapatkan Briefing Intelijen Mingguan',
                'subtitle' => 'Bergabung bersama 10.000+ analis dan pimpinan korporasi yang menerima rangkuman strategis setiap Senin pagi.',
                'content' => [
                    'button_label' => 'Berlangganan Gratis',
                    'placeholder' => 'Masukkan alamat email korporasi Anda...',
                    'disclaimer' => 'Bebas spam. Anda dapat membatalkan langganan kapan saja.',
                ],
                'settings' => [],
                'en' => [
                    'title' => 'Receive Our Weekly Strategic Briefing',
                    'subtitle' => 'Join 10,000+ corporate leaders and analysts who start their Monday with our curated executive brief.',
                    'content' => [
                        'button_label' => 'Subscribe for Free',
                        'placeholder' => 'Enter your corporate email address...',
                        'disclaimer' => 'Zero spam. You can unsubscribe at any time.',
                    ],
                ],
                'ko' => [
                    'title' => '주간 전략 브리핑을 받아보세요',
                    'subtitle' => '매주 월요일 아침, 10,000명 이상의 비즈니스 리더들이 받아보는 핵심 요약 보고서입니다.',
                    'content' => [
                        'button_label' => '무료 구독하기',
                        'placeholder' => '회사 이메일 주소를 입력하세요...',
                        'disclaimer' => '스팸 없음. 언제든지 구독을 취소할 수 있습니다.',
                    ],
                ],
            ],
        ];

        foreach ($sections as $s) {
            $en = $s['en'] ?? null;
            $ko = $s['ko'] ?? null;
            unset($s['en'], $s['ko']);

            $section = CmsSection::updateOrCreate(
                ['key' => $s['key']],
                [
                    'type' => $s['type'],
                    'sort_order' => $s['sort_order'],
                    'title' => $s['title'],
                    'subtitle' => $s['subtitle'],
                    'content' => $s['content'],
                    'settings' => $s['settings'],
                    'is_active' => true,
                    'is_published' => true,
                ]
            );

            if ($en) {
                CmsSectionTranslation::updateOrCreate(
                    ['cms_section_id' => $section->id, 'locale' => 'en'],
                    [
                        'title' => $en['title'] ?? null,
                        'subtitle' => $en['subtitle'] ?? null,
                        'content' => $en['content'] ?? null,
                    ]
                );
            }

            if ($ko) {
                CmsSectionTranslation::updateOrCreate(
                    ['cms_section_id' => $section->id, 'locale' => 'ko'],
                    [
                        'title' => $ko['title'] ?? null,
                        'subtitle' => $ko['subtitle'] ?? null,
                        'content' => $ko['content'] ?? null,
                    ]
                );
            }
        }
    }
}

