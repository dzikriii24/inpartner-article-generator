import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  TrendingUp,
  Tag,
  Star,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  Mail,
  CheckCircle2,
  FolderOpen,
  BookOpen,
  Layers,
  Flame,
  Filter,
  RotateCcw,
  ShieldCheck,
  Clock,
  ArrowUpDown,
  Check,
  ChevronDown
} from 'lucide-react';
import api from '@/services/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/context/CatalogContext';
import { Button } from '@/components/lightswind/button';
import ProductCard from '@/components/ProductCard';
import { toast } from 'sonner';

// Fallback recommendations if API returns few items
const FALLBACK_RECOMMENDATIONS = [
  {
    id: 991,
    slug: 'jurnal-ekonomi-digital-indonesia-vol-1',
    type: 'journal',
    type_label: 'Journal',
    title: 'Jurnal Ekonomi Digital Indonesia — Vol. 1',
    subtitle: 'Adopsi pembayaran digital dan dampaknya terhadap UMKM',
    excerpt: 'Kumpulan studi empiris mengenai QRIS, dompet digital, dan inklusi keuangan UMKM.',
    cover_url: null,
    category: { name: 'Research & Journal', slug: 'research' },
    author: { name: 'Inpartner Research Lab' },
    price: 45000,
    final_price: 45000,
    discount_percent: 0,
    is_free: false,
    reading_time: 1
  },
  {
    id: 992,
    slug: 'panduan-investasi-untuk-profesional-muda',
    type: 'ebook',
    type_label: 'Ebook',
    title: 'Panduan Investasi untuk Profesional Muda',
    subtitle: 'Membangun portofolio yang tahan krisis dari gaji pertama',
    excerpt: 'Ebook praktis tentang alokasi aset, dana darurat, dan instrumen investasi.',
    cover_url: null,
    category: { name: 'Business Strategy', slug: 'business' },
    author: { name: 'Inpartner Editorial Board' },
    price: 89000,
    final_price: 59000,
    discount_percent: 34,
    is_free: false,
    reading_time: 1
  },
  {
    id: 993,
    slug: 'outlook-ekonomi-asia-tenggara-ringkasan-riset',
    type: 'research_paper',
    type_label: 'Research Paper',
    title: 'Outlook Ekonomi Asia Tenggara — Ringkasan Riset',
    subtitle: 'Ringkasan gratis untuk pembaca baru Inpartner',
    excerpt: 'Ringkasan riset gratis tentang prospek pertumbuhan dan investasi di ASEAN.',
    cover_url: null,
    category: { name: 'Macro Economy', slug: 'macro' },
    author: { name: 'Inpartner Research Lab' },
    price: 0,
    final_price: 0,
    discount_percent: 0,
    is_free: true,
    reading_time: 1
  }
];

export const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { authors } = useCatalog();

  const [products, setProducts] = useState<any[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

  // Mobile filter drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Newsletter state
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Recommendation slider scroll state
  const [recIndex, setRecIndex] = useState(0);

  const qParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || '';
  const categoryParam = searchParams.get('category') || '';
  const authorParam = searchParams.get('author') || '';
  const priceParam = searchParams.get('price') || '';
  const sortParam = searchParams.get('sort') || 'newest';
  const pageParam = Number(searchParams.get('page')) || 1;

  const [searchInput, setSearchInput] = useState(qParam);

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  const updateFilters = (newFilters: Record<string, any>) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(newFilters).forEach(([key, val]) => {
      if (
        val === '' ||
        val === null ||
        val === undefined ||
        (key === 'page' && val === 1) ||
        (key === 'sort' && val === 'newest')
      ) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, String(val));
      }
    });
    setSearchParams(nextParams);
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (qParam) params.q = qParam;
      if (typeParam) params.type = typeParam;
      if (categoryParam) params.category = categoryParam;
      if (authorParam) params.author = authorParam;
      if (priceParam) params.price = priceParam;
      if (sortParam) params.sort = sortParam;
      if (pageParam) params.page = pageParam;

      const res = await api.get('/products', { params });
      setProducts(res.data.data || []);
      setMeta(res.data.meta || { current_page: 1, last_page: 1, total: (res.data.data || []).length });
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const recRes = await api.get('/products', { params: { sort: 'popular', limit: 6 } });
      const recData = recRes.data.data || [];
      if (recData.length >= 3) {
        setRecommendedProducts(recData);
      } else {
        setRecommendedProducts([...recData, ...FALLBACK_RECOMMENDATIONS].slice(0, 6));
      }
    } catch {
      setRecommendedProducts(FALLBACK_RECOMMENDATIONS);
    }
  };

  const fetchMeta = async () => {
    try {
      const [catRes, typeRes] = await Promise.all([api.get('/categories'), api.get('/types')]);
      setCategories(catRes.data.data || []);
      setTypes(typeRes.data.data || []);
    } catch (e) {
      console.error('Fetch meta error', e);
    }
  };

  useEffect(() => {
    fetchMeta();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [qParam, typeParam, categoryParam, authorParam, priceParam, sortParam, pageParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim(), page: 1 });
  };

  const handleQuickTagSearch = (keyword: string) => {
    setSearchInput(keyword);
    updateFilters({ q: keyword, page: 1 });
  };

  const handleAddToCart = async (product: any) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/products/${product.slug}`);
      return;
    }
    try {
      await addToCart(product.id);
      toast.success(`${product.title} ditambahkan ke keranjang!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan ke keranjang');
    }
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
    setMobileFilterOpen(false);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      toast.success('Terima kasih! Email Anda telah terdaftar.');
      setEmailInput('');
    }
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (qParam) count++;
    if (categoryParam) count++;
    if (typeParam) count++;
    if (priceParam) count++;
    if (sortParam && sortParam !== 'newest') count++;
    return count;
  }, [qParam, categoryParam, typeParam, priceParam, sortParam]);

  // Combined recommendations display list
  const displayRecList = recommendedProducts.length > 0 ? recommendedProducts : FALLBACK_RECOMMENDATIONS;
  const maxRecSlides = Math.max(1, displayRecList.length - 2);

  // Filter component shared between desktop sidebar & mobile drawer
  const renderFilterContent = () => (
    <div className="space-y-6">
      {/* Header with Title and Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-900" />
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Filter Katalog</h2>
        </div>
        {activeFiltersCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Quick Discovery Presets */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
          Eksplorasi Cepat
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {/* All items */}
          <button
            onClick={() => updateFilters({ sort: 'newest', price: '', page: 1 })}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              !priceParam && sortParam === 'newest'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-50/80 hover:bg-zinc-100 text-zinc-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Semua Publikasi
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                !priceParam && sortParam === 'newest'
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-200/70 text-zinc-600'
              }`}
            >
              {meta.total || products.length || 32}
            </span>
          </button>

          {/* New Arrival */}
          <button
            onClick={() => updateFilters({ sort: 'newest', page: 1 })}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              sortParam === 'newest' && !priceParam
                ? 'text-zinc-900 font-bold bg-amber-50/80 border border-amber-200/60'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Terbaru (New Arrival)
            </span>
          </button>

          {/* Best Seller / Popular */}
          <button
            onClick={() => updateFilters({ sort: 'popular', page: 1 })}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              sortParam === 'popular'
                ? 'text-zinc-900 font-bold bg-rose-50/80 border border-rose-200/60'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              Paling Populer (Best Seller)
            </span>
          </button>

          {/* On Discount / Free */}
          <button
            onClick={() => updateFilters({ price: priceParam === 'free' ? '' : 'free', page: 1 })}
            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              priceParam === 'free'
                ? 'text-emerald-900 font-bold bg-emerald-50 border border-emerald-200'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <span className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              Akses Gratis (Free)
            </span>
            {priceParam === 'free' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
        </div>
      </div>

      <hr className="border-zinc-100" />

      {/* Categories Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Kategori Bidang
          </label>
          {categoryParam && (
            <button
              onClick={() => updateFilters({ category: '', page: 1 })}
              className="text-[10px] text-zinc-500 hover:text-zinc-900 underline"
            >
              Hapus
            </button>
          )}
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {categories.map((cat: any) => {
            const isActive = categoryParam === cat.slug;
            return (
              <button
                key={cat.id || cat.slug}
                onClick={() => updateFilters({ category: isActive ? '' : cat.slug, page: 1 })}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-white' : 'bg-zinc-300'
                    }`}
                  />
                  {cat.name}
                </span>
                {cat.products_count !== undefined && cat.products_count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {cat.products_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-zinc-100" />

      {/* Publication Types */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Format Dokumen
          </label>
          {typeParam && (
            <button
              onClick={() => updateFilters({ type: '', page: 1 })}
              className="text-[10px] text-zinc-500 hover:text-zinc-900 underline"
            >
              Hapus
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => updateFilters({ type: '', page: 1 })}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              !typeParam
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
            }`}
          >
            Semua
          </button>
          {types.map((t: any) => {
            const isActive = typeParam === t.key;
            return (
              <button
                key={t.key}
                onClick={() => updateFilters({ type: isActive ? '' : t.key, page: 1 })}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-zinc-100" />

      {/* Price Filter */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Rentang Harga
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => updateFilters({ price: '', page: 1 })}
            className={`py-2 px-3 rounded-xl text-xs font-medium text-center transition-all ${
              !priceParam
                ? 'bg-zinc-900 text-white shadow-2xs font-bold'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Semua Harga
          </button>
          <button
            onClick={() => updateFilters({ price: 'free', page: 1 })}
            className={`py-2 px-3 rounded-xl text-xs font-medium text-center transition-all ${
              priceParam === 'free'
                ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Gratis (Rp 0)
          </button>
        </div>
      </div>

      <hr className="border-zinc-100" />

      {/* Sort Section */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
          Urutan Publikasi
        </label>
        <div className="relative">
          <select
            value={sortParam}
            onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
            className="w-full text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-zinc-800 appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all cursor-pointer pr-8"
          >
            <option value="newest">Terbaru (Default)</option>
            <option value="popular">Paling Populer</option>
            <option value="price_asc">Harga: Rendah ke Tinggi</option>
            <option value="price_desc">Harga: Tinggi ke Rendah</option>
            <option value="title">Judul Dokumen (A-Z)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 py-6">
      {/* ================= HERO HEADER BANNER ================= */}
      <section className="relative rounded-[32px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-7 sm:p-12 md:p-16 overflow-hidden shadow-2xl border border-zinc-800/80">
        {/* Ambient lighting glows */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 rounded-full bg-white/[0.03] blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wider text-zinc-300 uppercase bg-white/10 backdrop-blur-md border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>KATALOG PUBLIKASI & RISET INDEPENDEN</span>
          </div>

          {/* Heading with Editorial Accent */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Jelajahi Wawasan & Publikasi{' '}
            <span className="font-serif italic font-normal text-zinc-400">Terkurasi</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed max-w-2xl font-normal">
            Akses ribuan paper penelitian, jurnal akademik, analisis pasar, dan ebook eksekutif untuk mempercepat pemahaman dan pengambilan keputusan strategis Anda.
          </p>

          {/* Floating Search Bar */}
          <div className="pt-2 max-w-2xl">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-white p-1.5 pl-4 sm:pl-5 rounded-full shadow-2xl border border-white/20 transition-all focus-within:ring-4 focus-within:ring-white/20"
            >
              <Search className="w-4 h-4 text-zinc-400 shrink-0 mr-3" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari judul artikel, topik riset, atau kata kunci..."
                className="w-full bg-transparent border-none text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-0"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateFilters({ q: '', page: 1 });
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-full transition-colors mr-1"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="bg-zinc-900 hover:bg-black text-white text-xs font-bold px-5 sm:px-6 py-2.5 rounded-full transition-all shadow-md shrink-0 flex items-center gap-1.5"
              >
                <span>Cari</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Popular Search Tags Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-3 text-[11px] text-zinc-400">
              <span className="font-medium text-zinc-400">Topik Tren:</span>
              {[
                'Makroekonomi',
                'Fintech & AI',
                'Investasi',
                'Jurnal Ilmiah',
                'Digital',
                'Gratis'
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (tag === 'Gratis') {
                      updateFilters({ price: 'free', page: 1 });
                    } else {
                      handleQuickTagSearch(tag);
                    }
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 font-medium transition-colors border border-white/10"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Indicators */}
          <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-zinc-400 border-t border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-zinc-200">
                {meta.total || products.length || 32}+ Publikasi Tersedia
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span className="font-semibold text-zinc-200">Riset Terverifikasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-200">Akses Reader Instan 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= MAIN CATALOG SECTION (Sidebar + Product Grid) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Left Sidebar Filter */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="bg-white/90 backdrop-blur-md border border-zinc-200/80 rounded-[28px] p-6 shadow-2xs sticky top-24">
            {renderFilterContent()}
          </div>
        </aside>

        {/* Mobile Filter Drawer Modal */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileFilterOpen(false)}
            />
            {/* Slide-over panel */}
            <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4">
                <span className="font-bold text-base text-zinc-900">Filter & Kategori</span>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1">
                {renderFilterContent()}
              </div>

              <div className="pt-6 border-t border-zinc-100 mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex-1 rounded-full text-xs"
                >
                  Reset
                </Button>
                <Button
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 rounded-full bg-zinc-900 text-white text-xs font-bold"
                >
                  Terapkan ({products.length})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Right Product Grid Column */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Bar: Active Filters, Counts, Mobile Trigger */}
          <div className="bg-white/90 backdrop-blur-md border border-zinc-200/80 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Count & Search info */}
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <span>Menampilkan:</span>
                <span className="font-bold text-zinc-900">
                  {products.length} dari {meta.total || products.length} Publikasi
                </span>
                {qParam && (
                  <span className="text-zinc-500">
                    untuk kata kunci <strong className="text-zinc-900">&ldquo;{qParam}&rdquo;</strong>
                  </span>
                )}
              </div>

              {/* Action Buttons: Mobile Filter Trigger + Sort dropdown on right */}
              <div className="flex items-center gap-2">
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden px-3.5 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shadow-2xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Filter</span>
                  {activeFiltersCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {/* Quick Sort Dropdown on Desktop */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <select
                    value={sortParam}
                    onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
                    className="bg-transparent border-none text-xs font-semibold text-zinc-800 focus:outline-none cursor-pointer py-1"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="popular">Terpopuler</option>
                    <option value="price_asc">Harga Terendah</option>
                    <option value="price_desc">Harga Tertinggi</option>
                    <option value="title">Judul (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filter Chips Bar */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
                <span className="text-[11px] font-semibold text-zinc-400">Filter Aktif:</span>

                {/* Search Query Chip */}
                {qParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200/80">
                    <span>Cari: &ldquo;{qParam}&rdquo;</span>
                    <button
                      onClick={() => {
                        setSearchInput('');
                        updateFilters({ q: '', page: 1 });
                      }}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Category Chip */}
                {categoryParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200/80">
                    <span>
                      Kategori:{' '}
                      {categories.find((c: any) => c.slug === categoryParam)?.name || categoryParam}
                    </span>
                    <button
                      onClick={() => updateFilters({ category: '', page: 1 })}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Type Chip */}
                {typeParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200/80">
                    <span>
                      Format: {types.find((t: any) => t.key === typeParam)?.label || typeParam}
                    </span>
                    <button
                      onClick={() => updateFilters({ type: '', page: 1 })}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Price Free Chip */}
                {priceParam === 'free' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                    <span>Gratis (Rp 0)</span>
                    <button
                      onClick={() => updateFilters({ price: '', page: 1 })}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Sort Chip if not default */}
                {sortParam && sortParam !== 'newest' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200/80">
                    <span>
                      Urutan:{' '}
                      {sortParam === 'popular'
                        ? 'Terpopuler'
                        : sortParam === 'price_asc'
                        ? 'Harga Terendah'
                        : sortParam === 'price_desc'
                        ? 'Harga Tertinggi'
                        : sortParam}
                    </span>
                    <button
                      onClick={() => updateFilters({ sort: 'newest', page: 1 })}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {/* Reset all button */}
                <button
                  onClick={resetFilters}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 ml-auto transition-colors"
                >
                  Hapus Semua Filter
                </button>
              </div>
            )}
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="rounded-[24px] bg-white border border-zinc-200/70 p-3.5 space-y-3.5 animate-pulse shadow-2xs"
                >
                  <div className="aspect-square rounded-[18px] bg-zinc-100 w-full" />
                  <div className="h-4 bg-zinc-100 rounded-md w-3/4" />
                  <div className="h-3 bg-zinc-100 rounded-md w-1/2" />
                  <div className="h-8 bg-zinc-100 rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 rounded-[32px] border border-dashed border-zinc-300 bg-white/70 p-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                  Tidak ada publikasi ditemukan
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Coba setel ulang pencarian Anda atau gunakan kata kunci yang lebih umum untuk menemukan artikel dan riset.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-2">
                <Button
                  onClick={resetFilters}
                  className="rounded-full bg-zinc-900 hover:bg-black text-white text-xs font-semibold px-6 py-2 shadow-xs"
                >
                  Reset Semua Filter
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((item) => (
                <ProductCard key={item.id} product={item} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              <button
                disabled={meta.current_page === 1}
                onClick={() => updateFilters({ page: meta.current_page - 1 })}
                className="px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 flex items-center gap-1.5 hover:bg-zinc-50 disabled:opacity-40 shadow-2xs transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1.5 px-2">
                {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateFilters({ page: p })}
                    className={`w-9 h-9 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                      p === meta.current_page
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                disabled={meta.current_page === meta.last_page}
                onClick={() => updateFilters({ page: meta.current_page + 1 })}
                className="px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 flex items-center gap-1.5 hover:bg-zinc-50 disabled:opacity-40 shadow-2xs transition-all"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ================= EDITORS' RECOMMENDATIONS SECTION ================= */}
      <section className="pt-12 border-t border-zinc-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase tracking-wider border border-zinc-200/60">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>KURASI REDAKSI</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
              Eksplorasi Rekomendasi Pilihan
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500">
              Riset dan publikasi terpopuler yang paling banyak dikaji oleh akademisi dan praktisi minggu ini.
            </p>
          </div>

          {/* Slider Navigation Controls */}
          {displayRecList.length > 3 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecIndex(Math.max(0, recIndex - 1))}
                disabled={recIndex === 0}
                className="w-9 h-9 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 flex items-center justify-center disabled:opacity-30 transition-all shadow-2xs"
                aria-label="Rekomendasi Sebelumnya"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRecIndex(Math.min(maxRecSlides, recIndex + 1))}
                disabled={recIndex >= maxRecSlides}
                className="w-9 h-9 rounded-full border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 flex items-center justify-center disabled:opacity-30 transition-all shadow-2xs"
                aria-label="Rekomendasi Berikutnya"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayRecList.slice(recIndex, recIndex + 3).map((item) => (
            <ProductCard key={`rec-${item.id}`} product={item} onAddToCart={handleAddToCart} />
          ))}
        </div>
      </section>

      {/* ================= NEWSLETTER / CTA BANNER SECTION ================= */}
      <section className="relative rounded-[36px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8 sm:p-14 overflow-hidden shadow-2xl border border-zinc-800">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-7 space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800/60">
              <Mail className="w-3.5 h-3.5" />
              NEWSLETTER RISET BULANAN
            </span>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              Dapatkan Notifikasi <br className="hidden sm:inline" />
              Riset & Publikasi Terbaru
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-lg font-normal">
              Bergabunglah bersama ribuan analis industri, peneliti, dan pengambil keputusan yang menerima ringkasan riset independen Inpartner langsung di kotak masuk.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold bg-emerald-950/80 border border-emerald-700/80 px-4 py-3 rounded-full max-w-md">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Terima kasih! Email Anda telah terdaftar untuk pemberitahuan artikel terbaru.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="pt-2 flex items-center max-w-md">
                <div className="relative w-full flex items-center bg-white p-1.5 pl-4 rounded-full shadow-lg">
                  <Mail className="w-4 h-4 text-zinc-400 shrink-0 mr-2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Masukkan alamat email Anda..."
                    className="w-full bg-transparent border-none text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-zinc-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shrink-0 flex items-center gap-1 shadow-xs"
                  >
                    <span>Daftar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-4 text-[11px] text-zinc-400 pt-1">
              <span>🔒 100% Privasi Terjaga</span>
              <span>•</span>
              <span>Bebas Spam</span>
              <span>•</span>
              <span>Batal Kapan Saja</span>
            </div>
          </div>

          <div className="lg:col-span-5 lg:text-right">
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-3 max-w-sm lg:ml-auto text-left">
              <span className="font-bold text-white text-sm block">
                Inpartner Research & Intelligence
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                Kami mendengarkan kebutuhan riset Anda, menyaring data mentah, dan memproduksi publikasi berkualitas tinggi yang langsung dapat diimplementasikan.
              </p>
              <div className="pt-2 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terpercaya di berbagai sektor industri</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Products;

