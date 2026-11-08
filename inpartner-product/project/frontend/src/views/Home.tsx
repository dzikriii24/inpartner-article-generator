import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Briefcase,
  FileSpreadsheet,
  BookOpen,
  ArrowUpRight,
  Tag,
  Mail,
  CheckCircle2,
  TrendingUp,
  LineChart,
  Coins,
  Cpu,
  Activity,
  Zap,
  Globe,
  Users
} from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import { useLanguage } from '@/context/LanguageContext';
import ProductCard from '@/components/ProductCard';
import api from '@/services/api';

const DEFAULT_SECTOR_PILLS = [
  { id: 's-1', name: 'Makroekonomi & Fiskal', slug: 'business-economy', icon: LineChart },
  { id: 's-2', name: 'Fintech & Digital Banking', slug: 'market-finance', icon: Coins },
  { id: 's-3', name: 'AI & Inovasi Teknologi', slug: 'tech-ai', icon: Cpu },
  { id: 's-4', name: 'Kebijakan Publik & Regulasi', slug: 'policy', icon: ShieldCheck },
  { id: 's-5', name: 'Strategi Korporasi & Bisnis', slug: 'business', icon: Briefcase },
  { id: 's-6', name: 'Riset & Jurnal Akademik', slug: 'research', icon: BookOpen },
  { id: 's-7', name: 'Energi Terbarukan & ESG', slug: 'macro', icon: Zap },
  { id: 's-8', name: 'Pasar Modal & Emiten', slug: 'stock', icon: TrendingUp },
];

export const Home: React.FC = () => {
  const { popular, latest, featured, categories, loading: catalogLoading, fetchHome } = useCatalog();
  const { locale, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'cms' || searchParams.get('preview') === '1';

  const [cmsSections, setCmsSections] = useState<any[]>([]);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);

  // Fetch CMS sections based on current active language & preview mode
  useEffect(() => {
    let isMounted = true;
    const fetchCmsData = async () => {
      try {
        setCmsLoading(true);
        const res = await api.get('/cms/homepage', {
          params: {
            lang: locale,
            preview: isPreview ? 1 : 0
          }
        });
        if (isMounted && res.data?.sections) {
          setCmsSections(res.data.sections);
        }
      } catch (err) {
        console.error('Failed to load CMS homepage sections', err);
      } finally {
        if (isMounted) setCmsLoading(false);
      }
    };

    fetchCmsData();
    fetchHome();

    return () => {
      isMounted = false;
    };
  }, [locale, isPreview]);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterDone(true);
      setNewsletterEmail('');
    }
  };

  // Helper to find a section by key from CMS
  const getSection = (key: string) => {
    return cmsSections.find((s) => s.key === key && s.is_active);
  };

  // Default fallback sections if CMS is still loading or offline
  const heroSection = getSection('hero');
  const featuredSection = getSection('featured_products');
  const categoriesSection = getSection('categories');
  const whyUsSection = getSection('why_us');
  const latestSection = getSection('latest_products');
  const aboutSection = getSection('about');
  const ctaSection = getSection('cta');
  const newsletterSection = getSection('newsletter');

  // Sorted active sections if user reordered in CMS
  const sortedSections = [...cmsSections]
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Fallback product items for initial load
  const displayFeatured = (Array.isArray(featured) && featured.length > 0)
    ? featured.slice(0, 4)
    : (Array.isArray(popular) && popular.length > 0)
    ? popular.slice(0, 4)
    : [];

  const displayLatest = (Array.isArray(latest) && latest.length > 0)
    ? latest.slice(0, 6)
    : [];

  // Sector categories
  const displayCategories = (Array.isArray(categories) && categories.length > 0)
    ? categories.slice(0, 10)
    : DEFAULT_SECTOR_PILLS;

  return (
    <div className="space-y-16 sm:space-y-24 py-6 sm:py-10">
      {/* Draft Preview Indicator Banner */}
      {isPreview && (
        <div className="sticky top-20 z-30 max-w-4xl mx-auto bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Mode Pratinjau Draf CMS Aktif — Menampilkan perubahan draf yang belum dipublikasikan.</span>
          </div>
          <Link to="/" className="underline text-white hover:text-amber-100 text-[11px]">
            Tutup Pratinjau
          </Link>
        </div>
      )}

      {/* ================= 1. HERO SECTION ================= */}
      {(!cmsSections.length || heroSection) && (
        <section className="relative text-center max-w-4xl mx-auto pt-6 sm:pt-12 pb-6 space-y-6">
          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
            {heroSection?.title || t('home.hero_title', 'Wawasan Strategis & Riset Terverifikasi untuk Pemimpin Bisnis')}
          </h1>

          {/* Subtitle / Description */}
          <p className="text-sm sm:text-lg text-[#64748B] max-w-2xl mx-auto leading-relaxed font-supporting">
            {heroSection?.subtitle || t('home.hero_subtitle', 'Akses riset mendalam, analisis pasar, dan dokumen kebijakan ekonomi terkurasi oleh praktisi dan analis terkemuka.')}
          </p>

          {/* Call to Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to={heroSection?.content?.cta_primary_url || '/products'}
              className="px-6 py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-card transition-all flex items-center gap-2 group cursor-pointer"
            >
              <span>{heroSection?.content?.cta_primary_label || t('home.explore_catalog', 'Jelajahi Katalog Riset')}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to={heroSection?.content?.cta_secondary_url || '/products?custom=true'}
              className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#1976D2]" />
              <span>{heroSection?.content?.cta_secondary_label || t('home.custom_service', 'Layanan Analisis Kustom')}</span>
            </Link>
          </div>

          {/* Verified Quality Indicators */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-supporting border-t border-slate-200/60 max-w-xl mx-auto">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
              <span>{t('home.verified_edition', 'Edisi Terverifikasi 2026')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Termasuk Dataset Excel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#1976D2]" />
              <span>Reader Online Multi-Perangkat</span>
            </div>
          </div>
        </section>
      )}

      {/* ================= 2. FEATURED PUBLICATIONS SECTION (NO PRICES) ================= */}
      {(!cmsSections.length || featuredSection) && displayFeatured.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                {featuredSection?.title || t('home.featured_title', 'Publikasi Pilihan Dewan Editorial')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-supporting mt-1">
                {featuredSection?.subtitle || t('home.featured_subtitle', 'Dokumen dan paper riset strategis dengan relevansi analisis tertinggi minggu ini.')}
              </p>
            </div>
            <Link
              to="/products"
              className="text-xs font-bold text-[#1976D2] hover:text-[#1562AF] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>{t('catalog.filter_all', 'Semua Publikasi')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Product Cards without Price on Homepage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayFeatured.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                showPrice={false} // Clean editorial card with no prices
              />
            ))}
          </div>
        </section>
      )}

      {/* ================= 3. SECTOR & CATEGORY EXPLORATION ================= */}
      {(!cmsSections.length || categoriesSection) && (
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {categoriesSection?.title || t('home.categories_title', 'Eksplorasi Bidang & Industri')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-supporting">
              {categoriesSection?.subtitle || t('home.categories_subtitle', 'Jelajahi analisis mendalam menurut fokus sektor dan spesialisasi kajian ekonomi.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-5xl mx-auto">
            {displayCategories.map((cat: any) => {
              const IconComp = cat.icon || Tag;
              return (
                <Link
                  key={cat.id || cat.slug}
                  to={`/products?category=${cat.slug}`}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#D1E4F6]/50 border border-slate-200 hover:border-[#B2D1F0] text-xs font-semibold text-slate-700 hover:text-[#0C3B69] transition-all flex items-center gap-2 shadow-xs group cursor-pointer"
                >
                  <IconComp className="w-3.5 h-3.5 text-[#1976D2]" />
                  <span>{cat.name}</span>
                  {cat.products_count !== undefined && cat.products_count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 group-hover:bg-white font-medium">
                      {cat.products_count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= 4. WHY US / VALUE PROPOSITIONS ================= */}
      {(!cmsSections.length || whyUsSection) && (
        <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs">
          <div className="max-w-2xl mb-10">
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {whyUsSection?.title || t('home.why_title', 'Mengapa Para Pengambil Keputusan Mengandalkan Inpartner')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-supporting mt-2">
              {whyUsSection?.subtitle || t('home.why_subtitle', 'Kualitas analisis yang didasarkan pada data primer dan metodologi empiris yang teruji.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(whyUsSection?.content?.items || [
              {
                icon: 'ShieldCheck',
                title: 'Data Primer Terverifikasi',
                description: 'Setiap publikasi melalui validasi sumber primer, triangulasi data resmi BPS, BI, dan regulator terkait.'
              },
              {
                icon: 'Briefcase',
                title: 'Senior Partner Review',
                description: 'Ditelaah langsung oleh praktisi industri dengan pengalaman lebih dari 15 tahun di sektornya.'
              },
              {
                icon: 'FileSpreadsheet',
                title: 'Termasuk Model Data Excel',
                description: 'Unduh spreadsheet siap pakai untuk analisis mandiri dan pemodelan finansial instan.'
              },
              {
                icon: 'BookOpen',
                title: 'Reader Digital Multidevice',
                description: 'Baca langsung di desktop, tablet, maupun mobile dengan fitur bookmark dan resume posisi otomatis.'
              }
            ]).map((item: any, idx: number) => {
              const iconsMap: Record<string, any> = {
                ShieldCheck,
                Briefcase,
                FileSpreadsheet,
                BookOpen,
              };
              const Comp = iconsMap[item.icon] || ShieldCheck;

              return (
                <div key={idx} className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center">
                    <Comp className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">{item.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-supporting">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= 5. LATEST PUBLICATIONS (NO PRICES) ================= */}
      {(!cmsSections.length || latestSection) && displayLatest.length > 0 && (
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                {latestSection?.title || t('home.latest_title', 'Riset & Dokumen Terbaru')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-supporting mt-1">
                {latestSection?.subtitle || t('home.latest_subtitle', 'Publikasi terkini yang baru saja diterbitkan oleh tim editorial dan analis Inpartner.')}
              </p>
            </div>
            <Link
              to="/products?sort=newest"
              className="text-xs font-bold text-[#1976D2] hover:text-[#1562AF] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>{t('catalog.filter_all', 'Lihat Semua Dokumen')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayLatest.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                showPrice={false} // Clean editorial card with no prices
              />
            ))}
          </div>
        </section>
      )}

      {/* ================= 6. ABOUT INPARTNER PLATFORM ================= */}
      {(!cmsSections.length || aboutSection) && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs">
          <div className="lg:col-span-7 space-y-4">
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-tight">
              {aboutSection?.title || t('home.about_title', 'Membuka Akses Intelligence Bisnis Kelas Satu')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-supporting">
              {aboutSection?.content?.description || t('home.about_desc', 'Kami percaya keputusan strategis terbaik lahir dari data yang akurat dan sintesis analitis yang tajam. Platform kami dirancang untuk eksekutif, konsultan, analis investasi, dan praktisi bisnis yang membutuhkan wawasan berkualitas tanpa bias.')}
            </p>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              {(aboutSection?.content?.stats || [
                { label: 'Publikasi Terverifikasi', value: '150+' },
                { label: 'Pembaca Eksekutif', value: '12.000+' },
                { label: 'Kepuasan Riset', value: '98.4%' }
              ]).map((st: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="text-xl sm:text-2xl font-extrabold text-[#1976D2] tracking-tight">{st.value}</div>
                  <div className="text-[11px] text-slate-500 font-supporting">{st.label}</div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                to={aboutSection?.content?.cta_url || '/products'}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#1976D2] hover:underline cursor-pointer"
              >
                <span>{aboutSection?.content?.cta_label || 'Jelajahi Metodologi & Riset'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0C3B69]">
              <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
              <span>Komitmen Independensi Editorial</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-supporting">
              Semua analisis dan ringkasan riset di Inpartner diterbitkan tanpa sponsor terselubung. Kepercayaan pembaca profesional adalah aset utama kami.
            </p>
            <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-supporting">
              <span>Jakarta, Indonesia</span>
              <span>Inpartner Research Lab</span>
            </div>
          </div>
        </section>
      )}

      {/* ================= 7. CTA CUSTOM ANALYSIS SECTION ================= */}
      {(!cmsSections.length || ctaSection) && (
        <section className="rounded-3xl bg-[#0F172A] text-white p-8 sm:p-12 shadow-md relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-4">
            
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              {ctaSection?.title || t('home.cta_title', 'Butuh Riset Khusus untuk Kebutuhan Korporasi Anda?')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-supporting">
              {ctaSection?.subtitle || t('home.cta_subtitle', 'Tim analis senior Inpartner siap menyusun studi kelayakan pasar, due diligence ekonomi, dan kajian regulasi eksklusif.')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to={ctaSection?.content?.cta_primary_url || '/products?custom=true'}
                className="px-6 py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span>{ctaSection?.content?.cta_primary_label || t('home.cta_primary', 'Ajukan Custom Analysis')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={ctaSection?.content?.cta_secondary_url || '/products'}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                {ctaSection?.content?.cta_secondary_label || t('home.cta_secondary', 'Lihat Katalog Lengkap')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================= 8. NEWSLETTER / STRATEGIC BRIEFING ================= */}
      {(!cmsSections.length || newsletterSection) && (
        <section className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-xs">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              {newsletterSection?.title || t('home.newsletter_title', 'Dapatkan Briefing Intelijen Mingguan')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-supporting max-w-lg mx-auto">
              {newsletterSection?.subtitle || t('home.newsletter_subtitle', 'Bergabung bersama 10.000+ analis dan pimpinan korporasi yang menerima rangkuman strategis setiap Senin pagi.')}
            </p>

            {newsletterDone ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 max-w-md mx-auto">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Terima kasih! Email Anda telah terdaftar untuk executive brief kami.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto pt-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder={newsletterSection?.content?.placeholder || t('home.newsletter_placeholder', 'Masukkan alamat email korporasi Anda...')}
                  className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto shrink-0 px-5 py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {newsletterSection?.content?.button_label || t('home.newsletter_btn', 'Berlangganan Gratis')}
                </button>
              </form>
            )}

            <p className="text-[11px] text-slate-400 font-supporting">
              {newsletterSection?.content?.disclaimer || t('home.newsletter_disclaimer', 'Bebas spam. Anda dapat membatalkan langganan kapan saja.')}
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
