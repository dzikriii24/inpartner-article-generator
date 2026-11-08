import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Tag,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  Mail,
  CheckCircle2,
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
import { useLanguage } from '@/context/LanguageContext';
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
    reading_time: 12
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
    reading_time: 18
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
    reading_time: 8
  }
];

export const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { authors } = useCatalog();
  const { t, formatPrice } = useLanguage();

  const [products, setProducts] = useState<any[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });

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

  const fetchMeta = async () => {
    try {
      const [catRes, typeRes] = await Promise.all([
        api.get('/categories'),
        api.get('/types')
      ]);
      const catData = Array.isArray(catRes.data?.data)
        ? catRes.data.data
        : Array.isArray(catRes.data?.categories)
        ? catRes.data.categories
        : Array.isArray(catRes.data)
        ? catRes.data
        : [];
      const typeData = Array.isArray(typeRes.data?.data)
        ? typeRes.data.data
        : Array.isArray(typeRes.data?.types)
        ? typeRes.data.types
        : Array.isArray(typeRes.data)
        ? typeRes.data
        : [];
      setCategories(catData);
      setTypes(typeData);
    } catch (err) {
      console.error(err);
      setCategories([]);
      setTypes([]);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: pageParam,
        per_page: 12
      };
      if (qParam) params.q = qParam;
      if (typeParam) params.type = typeParam;
      if (categoryParam) params.category = categoryParam;
      if (authorParam) params.author = authorParam;
      if (priceParam) params.price = priceParam;
      if (sortParam) params.sort = sortParam;

      const res = await api.get('/products', { params });
      const productList = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setProducts(productList);
      setMeta({
        current_page: res.data?.meta?.current_page || 1,
        last_page: res.data?.meta?.last_page || 1,
        total: res.data?.meta?.total || productList.length
      });

      if (Array.isArray(res.data?.recommended)) {
        setRecommendedProducts(res.data.recommended);
      }
    } catch (err) {
      console.error(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newParams: Record<string, any>) => {
    const updated = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === '' || val === null) {
        updated.delete(key);
      } else {
        updated.set(key, String(val));
      }
    });
    setSearchParams(updated);
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    setSearchInput(qParam);
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
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      toast.success('Terima kasih! Email Anda telah terdaftar.');
      setEmailInput('');
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (qParam) count++;
    if (categoryParam) count++;
    if (typeParam) count++;
    if (priceParam) count++;
    if (sortParam && sortParam !== 'newest') count++;
    return count;
  }, [qParam, categoryParam, typeParam, priceParam, sortParam]);

  const displayRecList = Array.isArray(recommendedProducts) && recommendedProducts.length > 0 ? recommendedProducts : FALLBACK_RECOMMENDATIONS;
  const maxRecSlides = Math.max(1, displayRecList.length - 2);



  return (
    <div className="space-y-10 py-6">
      {/* ================= HERO HEADER BANNER ================= */}
      <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-xs">
        <div className="relative z-10 max-w-3xl space-y-4">

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Jelajahi Wawasan & Publikasi <span className="text-[#1976D2]">Terkurasi</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl font-normal font-supporting">
            Akses ribuan paper penelitian, jurnal akademik, analisis pasar, dan ebook eksekutif untuk mempercepat pemahaman dan pengambilan keputusan strategis Anda.
          </p>

          {/* Search Bar */}
          <div className="pt-2 max-w-2xl">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-white p-1.5 pl-4 sm:pl-5 rounded-xl shadow-xs border border-slate-200 transition-all focus-within:ring-2 focus-within:ring-[#D1E4F6] focus-within:border-[#1976D2]"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari judul artikel, topik riset, atau kata kunci..."
                className="w-full bg-transparent border-none text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateFilters({ q: '', page: 1 });
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors mr-1 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white text-xs font-semibold px-5 sm:px-6 py-2.5 rounded-lg transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Cari</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Popular Search Tags Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-3 text-[11px] text-slate-400">
              <span className="font-medium text-slate-500">Topik Tren:</span>
              {[
                'Makroekonomi',
                'Fintech & AI',
                'Investasi',
                'Jurnal Ilmiah',
                'Digital Banking',
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
                  className="px-2.5 py-0.5 rounded-lg bg-slate-50 hover:bg-[#D1E4F6]/40 hover:text-[#1976D2] text-slate-600 font-medium transition-colors border border-slate-200 cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Indicators */}
          <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#1976D2]" />
              <span className="font-semibold text-slate-800">
                {meta.total || products.length} Publikasi Tersedia
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
              <span className="font-semibold text-slate-800">Riset Terverifikasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#1976D2]" />
              <span className="font-semibold text-slate-800">Akses Reader Instan 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TOP HORIZONTAL FILTER TOOLBAR ================= */}
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          {/* Row 1: Format / Type Filter + Quick Price & Sort */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
            {/* Format Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#1976D2]" />
                Format:
              </span>
              {[
                { key: '', label: 'Semua Format' },
                { key: 'thematic_research', label: 'Riset Tematik' },
                { key: 'insight', label: 'Kajian Sektor' },
                { key: 'data_series', label: 'Data Series (Excel)' },
                { key: 'article', label: 'Executive Brief' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => updateFilters({ type: t.key, page: 1 })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    typeParam === t.key || (!typeParam && t.key === '')
                      ? 'bg-[#1976D2] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Right: Quick Price Toggles & Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto flex-wrap">
              {/* Quick Price Buttons */}
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => updateFilters({ price: priceParam === 'free' ? '' : 'free', page: 1 })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    priceParam === 'free'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                  }`}
                >
                  Gratis (Rp 0)
                </button>
                <button
                  onClick={() => updateFilters({ price: priceParam === 'sale' ? '' : 'sale', page: 1 })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    priceParam === 'sale'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-700 hover:bg-white'
                  }`}
                >
                  Promo Diskon
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortParam}
                  onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
                  aria-label="Urutkan publikasi"
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6] transition-all cursor-pointer appearance-none"
                >
                  <option value="newest">Terbaru (New Arrival)</option>
                  <option value="popular">Terpopuler</option>
                  <option value="price_asc">Harga Terendah</option>
                  <option value="price_desc">Harga Tertinggi</option>
                  <option value="title">Judul (A-Z)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Sector Category Pills */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#1976D2]" />
                Pilih Sektor Industri
              </span>
              {categoryParam && (
                <button
                  onClick={() => updateFilters({ category: '', page: 1 })}
                  className="text-[11px] text-[#1976D2] hover:underline font-semibold cursor-pointer"
                >
                  Tampilkan Semua Sektor
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => updateFilters({ category: '', page: 1 })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  !categoryParam
                    ? 'bg-[#0C3B69] text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}
              >
                Semua Sektor
              </button>
              {(Array.isArray(categories) ? categories : []).map((cat: any) => {
                const isActive = categoryParam === cat.slug;
                return (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => updateFilters({ category: isActive ? '' : cat.slug, page: 1 })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#1976D2] text-white font-semibold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.products_count !== undefined && cat.products_count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? 'bg-[#0C3B69] text-white' : 'bg-slate-200 text-slate-600'
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

          {/* Row 3: Active Filters Summary (If any active) */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-semibold text-slate-400">Filter Aktif:</span>

              {qParam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-[11px] font-medium border border-slate-200">
                  <span>Cari: &ldquo;{qParam}&rdquo;</span>
                  <button
                    onClick={() => {
                      setSearchInput('');
                      updateFilters({ q: '', page: 1 });
                    }}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {categoryParam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D1E4F6] text-[#0C3B69] text-[11px] font-medium border border-[#B2D1F0]">
                  <span>
                    Kategori: {(Array.isArray(categories) ? categories : []).find((c: any) => c.slug === categoryParam)?.name || categoryParam}
                  </span>
                  <button
                    onClick={() => updateFilters({ category: '', page: 1 })}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {typeParam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D1E4F6] text-[#0C3B69] text-[11px] font-medium border border-[#B2D1F0]">
                  <span>Format: {(Array.isArray(types) ? types : []).find((t: any) => t.key === typeParam)?.label || typeParam}</span>
                  <button
                    onClick={() => updateFilters({ type: '', page: 1 })}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {priceParam && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                  <span>{priceParam === 'free' ? 'Gratis (Rp 0)' : 'Promo Diskon'}</span>
                  <button
                    onClick={() => updateFilters({ price: '', page: 1 })}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 ml-auto transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Semua Filter ({activeFiltersCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Menampilkan <strong className="text-slate-900 font-bold">{products.length}</strong> dari{' '}
            <strong className="text-slate-900 font-bold">{meta.total ?? products.length}</strong> publikasi riset
            {qParam && <span> untuk &ldquo;{qParam}&rdquo;</span>}
          </div>
        </div>

        {/* Product Cards Grid (Full Width) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 animate-pulse shadow-xs"
              >
                <div className="aspect-[4/3] rounded-xl bg-slate-100 w-full" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-slate-100 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-slate-300 bg-white p-8 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Tidak ada publikasi ditemukan
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Coba setel ulang pencarian Anda atau pilih sektor lain untuk menemukan artikel dan riset.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap justify-center gap-2">
              <Button
                onClick={resetFilters}
                className="rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-semibold px-5 py-2 shadow-xs"
              >
                Reset Semua Filter
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Array.isArray(products) ? products : []).map((item) => (
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
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40 shadow-xs transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => updateFilters({ page: p })}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                    p === meta.current_page
                      ? 'bg-[#1976D2] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              disabled={meta.current_page === meta.last_page}
              onClick={() => updateFilters({ page: meta.current_page + 1 })}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-40 shadow-xs transition-all cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ================= EDITORS' RECOMMENDATIONS SECTION ================= */}
      <section className="pt-10 border-t border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Eksplorasi Rekomendasi Pilihan
            </h2>
            <p className="text-xs text-slate-500 font-supporting">
              Riset dan publikasi terpopuler yang paling banyak dikaji oleh analis dan praktisi minggu ini.
            </p>
          </div>

          {displayRecList.length > 3 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecIndex(Math.max(0, recIndex - 1))}
                disabled={recIndex === 0}
                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center disabled:opacity-30 transition-all shadow-xs cursor-pointer"
                aria-label="Rekomendasi Sebelumnya"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRecIndex(Math.min(maxRecSlides, recIndex + 1))}
                disabled={recIndex >= maxRecSlides}
                className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center disabled:opacity-30 transition-all shadow-xs cursor-pointer"
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
      <section className="relative rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Dapatkan Notifikasi Riset & Publikasi Terbaru
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg font-supporting">
              Bergabunglah bersama ribuan analis industri, peneliti, dan pengambil keputusan yang menerima ringkasan riset independen Inpartner langsung di kotak masuk.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl max-w-md">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Terima kasih! Email Anda telah terdaftar untuk pemberitahuan artikel terbaru.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="pt-2 flex items-center max-w-md">
                <div className="relative w-full flex items-center bg-[#F8FAFC] border border-slate-200 p-1 pl-3.5 rounded-xl">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Masukkan alamat email Anda..."
                    className="w-full bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>Daftar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-medium">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#1976D2]" /> Privasi Terjaga</span>
              <span>•</span>
              <span>Bebas Spam</span>
              <span>•</span>
              <span>Batal Kapan Saja</span>
            </div>
          </div>

          <div className="lg:col-span-5 lg:text-right">
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 space-y-2 max-w-sm lg:ml-auto text-left">
              <span className="font-bold text-slate-900 text-sm block">
                Inpartner Research & Intelligence
              </span>
              <p className="text-xs text-slate-600 leading-relaxed font-supporting">
                Kami menyaring data mentah, memvalidasi bukti lapangan, dan memproduksi publikasi berkualitas tinggi yang langsung dapat diimplementasikan.
              </p>
              <div className="pt-1 text-[11px] text-[#1976D2] font-semibold flex items-center gap-1.5">
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
