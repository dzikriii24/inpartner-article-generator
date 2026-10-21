import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, ArrowUpRight, TrendingUp, ChevronLeft, ChevronRight, BookOpen, Users, 
  FileText, Tag, Sparkles, Compass, ShieldCheck, Cpu, ArrowRight, Bookmark, Clock, 
  Globe, Award, BarChart3, LineChart, Coins, Activity, PieChart, Briefcase, Zap, 
  Building2, Layers, Database, Radio, Newspaper, CheckCircle2, SlidersHorizontal, ArrowUpCircle 
} from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/lightswind/button';
import { Badge } from '@/components/lightswind/badge';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';
import ProductCard from '@/components/ProductCard';
import CountUp from '@/components/lightswind/count-up';
import { formatRupiah } from '@/utils/format';

const DEFAULT_SECTOR_PILLS = [
  { id: 's-1', name: 'Makroekonomi & Fiskal', slug: 'makroekonomi', icon: LineChart, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 's-2', name: 'Fintech & Digital Banking', slug: 'fintech', icon: Coins, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 's-3', name: 'AI & Inovasi Teknologi', slug: 'ai-teknologi', icon: Cpu, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 's-4', name: 'Kesehatan & Biotech', slug: 'kesehatan-biotech', icon: Activity, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { id: 's-5', name: 'Laporan Keuangan SEC/OJK', slug: 'laporan-keuangan', icon: FileText, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 's-6', name: 'Analisis Sentimen Pasar', slug: 'sentimen-pasar', icon: PieChart, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 's-7', name: 'E-Commerce & Retail Feed', slug: 'ecommerce-retail', icon: Briefcase, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { id: 's-8', name: 'Energi Terbarukan & ESG', slug: 'energi-esg', icon: Zap, color: 'text-lime-600 bg-lime-50 border-lime-200' },
  { id: 's-9', name: 'Properti & Real Estate', slug: 'properti', icon: Building2, color: 'text-stone-600 bg-stone-100 border-stone-200' },
  { id: 's-10', name: 'Startup & Venture Capital', slug: 'startup-vc', icon: TrendingUp, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 's-11', name: 'Regulasi & Kebijakan Publik', slug: 'regulasi-kebijakan', icon: ShieldCheck, color: 'text-sky-600 bg-sky-50 border-sky-200' },
  { id: 's-12', name: 'Riset Konsumen & Demografi', slug: 'riset-konsumen', icon: Users, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 's-13', name: 'Supply Chain & Logistik', slug: 'supply-chain', icon: Layers, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  { id: 's-14', name: 'Crypto & Web3 Markets', slug: 'crypto-web3', icon: Database, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 's-15', name: 'Sektor Media & Telekomunikasi', slug: 'media-telekomunikasi', icon: Radio, color: 'text-pink-600 bg-pink-50 border-pink-200' },
  { id: 's-16', name: 'Isu Sosial & Ekosistem', slug: 'isu-sosial', icon: Globe, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { id: 's-17', name: 'Pendidikan & EdTech', slug: 'edtech', icon: BookOpen, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 's-18', name: 'Publikasi Industri & Jurnal', slug: 'publikasi-jurnal', icon: Newspaper, color: 'text-zinc-600 bg-zinc-100 border-zinc-200' },
];

export const Home: React.FC = () => {
  const { popular, latest, featured, categories, stats, loading, fetchHome } = useCatalog();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [collectionPage, setCollectionPage] = useState(0);

  useEffect(() => {
    fetchHome();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleTagClick = (tag: string) => {
    navigate(`/products?q=${encodeURIComponent(tag)}`);
  };

  // Fallback items to ensure at least 3 cards are ALWAYS displayed
  const DEMO_FALLBACKS = [
    {
      id: 'demo-1',
      title: 'Jurnal Ekonomi Digital Indonesia — Vol. 1',
      slug: 'jurnal-ekonomi-digital-indonesia-vol-1',
      type_label: 'Journal',
      type: 'journal',
      price: 45000,
      final_price: 45000,
      reading_time: 1,
      author: { name: 'Inpartner Research Lab' },
      category: { name: 'Research & Journal', slug: 'journal' }
    },
    {
      id: 'demo-2',
      title: 'Panduan Investasi untuk Profesional Muda',
      slug: 'panduan-investasi-profesional-muda',
      type_label: 'Ebook',
      type: 'ebook',
      price: 59000,
      final_price: 59000,
      reading_time: 1,
      author: { name: 'Inpartner Editorial Board' },
      category: { name: 'Business Strategy', slug: 'strategy' }
    },
    {
      id: 'demo-3',
      title: 'Outlook Ekonomi Asia Tenggara — Ringkasan Riset',
      slug: 'outlook-ekonomi-asia-tenggara',
      type_label: 'Research Paper',
      type: 'research_paper',
      price: 0,
      is_free: true,
      reading_time: 1,
      author: { name: 'Inpartner Research Lab' },
      category: { name: 'Macro Economy', slug: 'macro' }
    }
  ];

  const rawCollection = Array.from(
    new Map([...featured, ...popular, ...latest].map((x) => [x.id, x])).values()
  );

  const collectionItems = rawCollection.length >= 3
    ? rawCollection
    : [...rawCollection, ...DEMO_FALLBACKS].slice(0, 6);
  
  // Calculate collection items to display (3 cards per view)
  const pageSize = 3;
  const maxPages = Math.ceil(collectionItems.length / pageSize) || 1;
  const displayCollectionItems = collectionItems.slice(
    (collectionPage % maxPages) * pageSize,
    ((collectionPage % maxPages) + 1) * pageSize
  );

  const scrollCollection = (dir: number) => {
    setCollectionPage((prev) => {
      const next = prev + dir;
      if (next < 0) return maxPages - 1;
      return next % maxPages;
    });
  };

  const popularItems = popular.length > 0 ? popular : latest;

  const handleAddToCart = async (product: any) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/products/${product.slug}`);
      return;
    }
    try {
      await addToCart(product.id);
    } catch (e) {
      console.error(e);
    }
  };

  const productStatValue = Number(stats.products) || popularItems.length || 3;
  const authorStatValue = Number(stats.authors) || categories.length || 3;
  const articleStatValue = Number(stats.articles) || 100;

  // Memoized pills for Orbt-style Category Section
  const displayCategoryPills = useMemo(() => {
    if (categories && categories.length > 0) {
      const apiItems = categories.map((cat: any, idx: number) => ({
        id: cat.id || `api-${idx}`,
        name: cat.name,
        slug: cat.slug,
        products_count: cat.products_count,
        icon: [LineChart, Coins, Cpu, Activity, FileText, PieChart, Briefcase, Zap, Building2, TrendingUp][idx % 10],
        color: [
          'text-blue-600 bg-blue-50 border-blue-200',
          'text-emerald-600 bg-emerald-50 border-emerald-200',
          'text-purple-600 bg-purple-50 border-purple-200',
          'text-rose-600 bg-rose-50 border-rose-200',
          'text-amber-600 bg-amber-50 border-amber-200',
          'text-cyan-600 bg-cyan-50 border-cyan-200',
        ][idx % 6]
      }));

      const existingSlugs = new Set(apiItems.map((item: any) => item.slug));
      const filteredDefaults = DEFAULT_SECTOR_PILLS.filter((item) => !existingSlugs.has(item.slug));
      return [...apiItems, ...filteredDefaults];
    }
    return DEFAULT_SECTOR_PILLS;
  }, [categories]);

  return (
    <div className="space-y-24 py-6">
      {/* ================= HERO SECTION (Clean Plain Background + Prompt Input Bar) ================= */}
      <section className="relative py-10 sm:py-14 flex flex-col items-center justify-center text-center space-y-8 max-w-4xl mx-auto px-4">
        {/* Main Title & Subtitle */}
        <div className="space-y-4">
          <h1 className="font-serif italic text-5xl sm:text-6xl md:text-7xl font-normal text-zinc-900 tracking-tight leading-none">
            Inpartner
          </h1>

          <p className="text-zinc-600 text-sm sm:text-base font-normal max-w-xl mx-auto leading-relaxed">
            Akses publikasi riset terkurasi, analisis data komprehensif, dan jurnal teknis langsung dalam satu platform modern.
          </p>
        </div>

        {/* Floating Prompt Search Bar */}
        <div className="w-full max-w-2xl mx-auto">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white/90 backdrop-blur-xl border border-zinc-200/80 rounded-2xl shadow-xl shadow-zinc-900/5 p-4 sm:p-5 flex flex-col justify-between gap-4 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/10 transition-all text-left"
          >
            <div className="w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Apa artikel, topik riset, atau tren pasar yang sedang kamu cari?"
                className="w-full bg-transparent border-none outline-none text-sm text-zinc-900 placeholder:text-zinc-400 font-normal py-1"
              />
            </div>

            {/* Bottom Bar: Tags + Action Button */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-100">
              <div className="hidden sm:flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="font-medium">Populer:</span>
                {['Kecerdasan Buatan', 'Makro Ekonomi', 'Tech Trends'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagClick(tag)}
                    className="px-2.5 py-1 rounded-full bg-zinc-100/80 hover:bg-zinc-200 text-zinc-600 font-medium transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="sm:hidden text-[11px] text-zinc-400 font-medium">
                Pencarian artikel & riset
              </div>

              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center transition-all shadow-sm shrink-0"
                aria-label="Cari Artikel"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ================= STATS HIGHLIGHTS (Matching User Reference Screenshot 5!) ================= */}
      <section className="space-y-8 max-w-7xl mx-auto px-4">
        {/* Header: Title Left + Description Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end border-b border-zinc-200/60 pb-6">
          <div className="md:col-span-7 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200/60">
              <BarChart3 className="w-3.5 h-3.5 text-zinc-900" />
              <span>STATISTIK PLATFORM</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight leading-tight">
              Akselerasi Wawasan <span className="font-serif italic font-normal text-zinc-500">Berbasis Data</span> & Riset Teruji
            </h2>
          </div>

          <div className="md:col-span-5 text-xs sm:text-sm text-zinc-500 leading-relaxed font-normal">
            Inpartner menghadirkan ribuan artikel riset, laporan bisnis, dan jurnal independen untuk membantu profesional mengambil keputusan strategis lebih cepat.
          </div>
        </div>

        {/* 3 Asymmetric Custom Stats Cards (Matching User's Reference Screenshot 5!) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stat Card 1 */}
          <div className="group relative p-8 bg-zinc-100/90 border border-zinc-200/80 rounded-3xl rounded-bl-[3rem] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="w-12 h-12 rounded-2xl bg-white/90 shadow-2xs border border-zinc-200/60 flex items-center justify-center text-zinc-900 mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 text-zinc-900" />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <CountUp
                  value={productStatValue}
                  duration={2}
                  animationStyle="spring"
                  className="text-5xl sm:text-6xl font-extrabold text-zinc-900 tracking-tighter"
                  numberClassName="text-zinc-900"
                />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
                Produk & Artikel Digital
              </h3>
            </div>

            <div className="pt-6 text-[11px] text-zinc-500 text-right font-medium border-t border-zinc-200/60">
              Koleksi riset terverifikasi & terstruktur
            </div>
          </div>

          {/* Stat Card 2 */}
          <div className="group relative p-8 bg-zinc-100/90 border border-zinc-200/80 rounded-3xl rounded-bl-[3rem] shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="w-12 h-12 rounded-2xl bg-white/90 shadow-2xs border border-zinc-200/60 flex items-center justify-center text-zinc-900 mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-zinc-900" />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <CountUp
                  value={authorStatValue}
                  duration={2}
                  animationStyle="spring"
                  className="text-5xl sm:text-6xl font-extrabold text-zinc-900 tracking-tighter"
                  numberClassName="text-zinc-900"
                />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">
                Penulis & Analyst Terkurasi
              </h3>
            </div>

            <div className="pt-6 text-[11px] text-zinc-500 text-right font-medium border-t border-zinc-200/60">
              Dikaji oleh praktisi berpengalaman
            </div>
          </div>

          {/* Stat Card 3 (Highlighted Dark / Solid Theme Card matching Screenshot 5!) */}
          <div className="group relative p-8 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 text-white rounded-3xl rounded-bl-[3rem] shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[280px]">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-white" />
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <CountUp
                  value={articleStatValue}
                  duration={2.5}
                  suffix="+"
                  animationStyle="spring"
                  className="text-5xl sm:text-6xl font-extrabold text-white tracking-tighter"
                  numberClassName="text-white"
                />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Publikasi Riset & Paper
              </h3>
            </div>

            <div className="pt-6 text-[11px] text-zinc-400 text-right font-medium border-t border-white/10">
              Akses Reader instan 24/7 & PDF
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRENDING / FEATURED CARDS SECTION (Matching Reference Image 2) ================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-7xl mx-auto px-4">
        {/* Left Column: Heading + Description + CTA Buttons */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100/90 text-zinc-700 text-xs font-semibold border border-zinc-200/60">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
            <span>POPULER & TRENDING</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.15]">
            Membangun Wawasan <span className="text-zinc-500 font-serif italic font-normal">Mendalam</span>, Lebih Cepat & Teruji.
          </h2>

          <p className="text-zinc-600 text-sm sm:text-base leading-relaxed font-normal">
            Melalui riset berbasis data terverifikasi, analisis kuantitatif, dan kajian industri komprehensif, kami menghadirkan publikasi independen untuk mempercepat pengambilan keputusan strategis Anda.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link to="/products">
              <Button size="lg" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs px-6 py-3 shadow-xs gap-2">
                Lihat Semua Riset <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link to="/products?price=free">
              <Button variant="outline" size="lg" className="rounded-full bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-800 font-semibold text-xs px-5 py-3">
                Riset Gratis
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Column: 3 Vertical Featured Cards (Tall Light Glass Cards) */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1 */}
          <Link
            to="/products?type=article"
            className="group relative aspect-[9/13] rounded-3xl bg-gradient-to-b from-blue-50/90 via-indigo-50/60 to-zinc-100/80 border border-zinc-200/80 p-6 flex flex-col justify-end shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              01 / RISET
            </div>
            <div className="w-12 h-12 rounded-full bg-white shadow-md border border-zinc-100 flex items-center justify-center text-zinc-900 mb-4 group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5 text-zinc-900" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight leading-snug mb-1">
              Kecerdasan Buatan & Otomasi
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
              Kajian dampak AI generatif pada efisiensi operasional dan lanskap bisnis modern.
            </p>
          </Link>

          {/* Card 2 */}
          <Link
            to="/products?type=research_paper"
            className="group relative aspect-[9/13] rounded-3xl bg-gradient-to-b from-emerald-50/90 via-teal-50/60 to-zinc-100/80 border border-zinc-200/80 p-6 flex flex-col justify-end shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              02 / TRENDS
            </div>
            <div className="w-12 h-12 rounded-full bg-white shadow-md border border-zinc-100 flex items-center justify-center text-zinc-900 mb-4 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5 text-zinc-900" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight leading-snug mb-1">
              Analisis Pasar & Industri
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
              Pemetaan tren konsumen, proyeksi pertumbuhan, dan dinamika kompetisi sektor digital.
            </p>
          </Link>

          {/* Card 3 */}
          <Link
            to="/products?type=journal"
            className="group relative aspect-[9/13] rounded-3xl bg-gradient-to-b from-amber-50/90 via-orange-50/60 to-zinc-100/80 border border-zinc-200/80 p-6 flex flex-col justify-end shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-4 right-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              03 / JURNAL
            </div>
            <div className="w-12 h-12 rounded-full bg-white shadow-md border border-zinc-100 flex items-center justify-center text-zinc-900 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5 text-zinc-900" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 tracking-tight leading-snug mb-1">
              Strategi Makro Ekonomi
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
              Panduan navigasi ketahanan finansial, manajemen risiko, dan investasi berkelanjutan.
            </p>
          </Link>
        </div>
      </section>

      {/* ================= KOLEKSI ARTIKEL PILIHAN (Clean Light Cards Layout!) ================= */}
      <section className="space-y-8 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200/60 pb-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200/60 text-xs font-semibold">
              <Bookmark className="w-3.5 h-3.5 text-zinc-900" />
              <span>KOLEKSI ARTIKEL</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
              Eksplorasi Publikasi & Riset Terpopuler
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/products">
              <Button size="lg" className="rounded-full bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-900 font-semibold text-xs px-5 py-2.5 shadow-2xs">
                Lihat Semua Katalog
              </Button>
            </Link>
            <Link to="/products">
              <button className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105" aria-label="Lihat Semua">
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* 3 Clean Light-Mode Cards */}
        {loading && !collectionItems.length ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="aspect-[3/4] rounded-3xl bg-zinc-200/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {displayCollectionItems.map((item: any) => (
              <Link
                key={item.id}
                to={`/products/${item.slug}`}
                className="group relative aspect-[3/4] rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 border border-zinc-200/80 bg-white flex flex-col justify-between p-6"
              >
                {/* Background Soft Pastel Gradient & Abstract Highlights */}
                <div className={`absolute inset-0 bg-gradient-to-br transition-all ${
                  item.type === 'ebook'
                    ? 'from-blue-50/90 via-indigo-50/50 to-zinc-100/80'
                    : item.type === 'journal'
                    ? 'from-emerald-50/90 via-teal-50/50 to-zinc-100/80'
                    : 'from-amber-50/90 via-orange-50/50 to-zinc-100/80'
                }`} />

                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/70 backdrop-blur-xs pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-white/50 backdrop-blur-xs pointer-events-none" />

                {/* Top Row: Type Pill Badge + Circular Action Arrow Button */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="bg-white/95 backdrop-blur-md text-zinc-900 border border-zinc-200/60 text-[10px] font-bold px-3 py-1 rounded-full shadow-2xs tracking-wider uppercase">
                    {item.type_label || 'Artikel'}
                  </span>

                  <div className="w-10 h-10 rounded-full bg-white shadow-md border border-zinc-100 flex items-center justify-center text-zinc-900 group-hover:scale-110 transition-transform">
                    <ArrowUpRight className="w-5 h-5 text-zinc-900" />
                  </div>
                </div>

                {/* Middle Graphic / Author & Category Icon */}
                <div className="relative z-10 my-auto py-4 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-white/90 shadow-2xs border border-zinc-200/60 flex items-center justify-center text-zinc-900 font-serif font-black text-sm">
                    IN
                  </div>
                  {item.category && (
                    <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 block">
                      {item.category.name}
                    </span>
                  )}
                </div>

                {/* Bottom Content Area */}
                <div className="relative z-10 space-y-3 pt-4 border-t border-zinc-200/60">
                  <h3 className="text-xl font-extrabold text-zinc-900 tracking-tight leading-snug line-clamp-2 group-hover:text-zinc-700 transition-colors">
                    {item.title}
                  </h3>

                  {item.author && (
                    <p className="text-xs text-zinc-500 font-medium truncate">
                      {item.author.name}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="font-extrabold text-zinc-900 text-base">
                      {item.is_free ? (
                        <span className="text-emerald-600">Gratis</span>
                      ) : (
                        formatRupiah(item.final_price ?? item.price)
                      )}
                    </span>

                    {item.reading_time ? (
                      <span className="flex items-center gap-1 text-zinc-400 font-medium">
                        <Clock className="w-3.5 h-3.5" /> {item.reading_time} mnt baca
                      </span>
                    ) : (
                      <span className="text-zinc-400 font-medium">Riset Terverifikasi</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Centered Scroll Controls Underneath */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => scrollCollection(-1)}
            className="w-10 h-10 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-700 shadow-2xs transition-colors"
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scrollCollection(1)}
            className="w-10 h-10 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-700 shadow-2xs transition-colors"
            aria-label="Berikutnya"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ================= CATEGORIES & SECTOR COVERAGE (Orbt-style Cloud & Features) ================= */}
      <section className="space-y-12 max-w-7xl mx-auto px-4 py-6">
        {/* Header Title & Subtitle */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight leading-tight">
            Inpartner melacak setiap sudut pasar & industri
          </h2>
          <p className="text-sm sm:text-base text-zinc-500 leading-relaxed font-normal max-w-2xl mx-auto">
            Dari tren makroekonomi dan sentimen pasar hingga laporan keuangan, regulasi, dan proyeksi sektor — Inpartner membaca dan mendistilasi seluruh riset ke dalam wawasan strategis.
          </p>
        </div>

        {/* Dense Pill Cloud Layout (Matching Reference Screenshot) */}
        <div className="flex flex-wrap justify-center items-center gap-2.5 sm:gap-3 max-w-6xl mx-auto">
          {displayCategoryPills.map((item: any) => {
            const IconComp = item.icon || Tag;
            return (
              <Link
                key={item.id}
                to={item.slug ? `/products?category=${item.slug}` : `/products?q=${encodeURIComponent(item.name)}`}
                className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5 transition-all duration-200 text-xs sm:text-sm font-semibold text-zinc-800"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${item.color || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                  <IconComp className="w-3.5 h-3.5" />
                </div>
                <span>{item.name}</span>
                {item.products_count !== undefined && item.products_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-[10px] text-zinc-500 font-bold group-hover:bg-zinc-200/80 transition-colors">
                    {item.products_count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom 3 Feature Highlights (Matching Bottom Row of Image) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-zinc-200/60 max-w-5xl mx-auto">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-zinc-800 leading-snug">
              Seluruh sumber riset terverifikasi, ganda diperiksa, dan dirujuk secara presisi
            </p>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-zinc-800 leading-snug">
              Disesuaikan dengan spesialisasi brand, sektor, atau niche bisnis Anda
            </p>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-sky-100 border border-sky-200 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowUpCircle className="w-4.5 h-4.5" />
            </div>
            <p className="text-xs sm:text-sm font-bold text-zinc-800 leading-snug">
              Terus berkembang secara berkala berdasarkan analitik dan umpan balik pasar
            </p>
          </div>
        </div>
      </section>

      {/* ================= PRE-FOOTER SHOWCASE & COMMUNITY CTA (Matching Reference Image 3) ================= */}
      <section className="space-y-12 pt-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto px-4">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">KOMUNITAS & EKSPLORASI</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 tracking-tight leading-tight">
              Bergabunglah dalam <span className="font-serif italic font-normal text-zinc-600">komunitas</span> pembaca & peneliti riset.
            </h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Kami menyajikan artikel analisis terstruktur, pemikiran mendalam, dan panduan industri berbasis fakta untuk mengedukasi publik.
            </p>
          </div>

          <div>
            <Link to="/products">
              <Button size="lg" className="rounded-full bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-900 font-semibold text-xs px-6 py-3 shadow-2xs gap-1.5">
                Jelajahi Katalog <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento Grid Showcase Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-7xl mx-auto px-4">
          {/* Card 1: Logo Icon Box */}
          <div className="aspect-square rounded-3xl bg-zinc-100 border border-zinc-200/80 p-6 flex items-center justify-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-white font-serif font-black text-2xl flex items-center justify-center shadow-md">
              IN
            </div>
          </div>

          {/* Card 2: Stacked Stats */}
          <div className="space-y-3 flex flex-col justify-between">
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs space-y-1">
              <div className="text-xl font-extrabold text-zinc-900 tracking-tight">+10.000 Pembaca</div>
              <p className="text-[11px] text-zinc-500 leading-tight">Pengguna terverifikasi mengakses artikel riset kami tiap bulan.</p>
            </div>
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-xs space-y-1">
              <div className="text-xl font-extrabold text-emerald-900 tracking-tight">500+ Riset & Paper</div>
              <p className="text-[11px] text-emerald-700 leading-tight">Dikembangkan & diawasi langsung oleh spesialis industri.</p>
            </div>
          </div>

          {/* Card 3: Vertical Feature Box with Action Pill */}
          <div className="aspect-[3/4] rounded-3xl bg-gradient-to-b from-blue-50/90 to-zinc-100/90 border border-zinc-200/80 p-6 flex flex-col justify-between shadow-xs">
            <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-zinc-100 flex items-center justify-center text-zinc-900">
              <Bookmark className="w-4 h-4 text-zinc-900" />
            </div>
            <div className="space-y-3">
              <h4 className="font-bold text-zinc-900 text-base leading-snug">Reader Interactive Mode</h4>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-zinc-900 border border-zinc-200 text-xs font-bold shadow-2xs">
                Akses Langsung ↗
              </span>
            </div>
          </div>

          {/* Card 4: Soft Pastel Feature Card */}
          <div className="aspect-[3/4] rounded-3xl bg-gradient-to-b from-emerald-50/90 to-zinc-100/90 border border-zinc-200/80 p-6 flex flex-col justify-between shadow-xs">
            <div className="flex gap-1.5">
              <Badge variant="outline" className="bg-white/80 text-zinc-700 border-zinc-200 text-[10px]">Eksklusif</Badge>
              <Badge variant="outline" className="bg-white/80 text-zinc-700 border-zinc-200 text-[10px]">PDF</Badge>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-zinc-900 text-base leading-snug">Unduh Dokumen & Pembaca 24/7</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">Hak akses milik akun Anda selamanya.</p>
            </div>
          </div>

          {/* Card 5: Circular Ripple Graphic Box */}
          <div className="aspect-square rounded-3xl bg-emerald-100/50 border border-emerald-200/80 p-6 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-2xs mb-3 text-emerald-800">
              <Globe className="w-6 h-6" />
            </div>
            <span className="font-bold text-zinc-900 text-xs">Standar Publikasi & Riset Internasional</span>
          </div>
        </div>

        {/* Pre-Footer Action Statement */}
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 text-xs text-zinc-500 leading-relaxed">
            Inpartner menghadirkan publikasi riset terpercaya dan independen untuk mendukung pengambilan keputusan strategis berbasis data komprehensif.
          </div>

          <div className="md:col-span-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h3 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight leading-snug">
              Kami berkomitmen menyajikan wawasan terdepan untuk generasi mendatang.
            </h3>

            <div className="flex items-center gap-2 shrink-0">
              <Link to="/products">
                <Button size="sm" className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-5 py-2">
                  Jelajahi Riset &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
