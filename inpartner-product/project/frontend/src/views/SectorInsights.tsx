import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  ChevronRight,
  BarChart3,
  BookOpen,
  ArrowUpDown,
  RotateCcw,
  FileSpreadsheet,
  ShieldCheck,
  ChevronLeft,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import api from '@/services/api';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/lightswind/button';
import { useLanguage } from '@/context/LanguageContext';

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  products_count?: number;
}

interface ProductItem {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  type: string;
  price: number;
  sale_price?: number | null;
  final_price?: number;
  is_free: boolean;
  cover_url?: string | null;
  has_excel?: boolean;
  published_at?: string | null;
  author?: {
    id: number;
    name: string;
    is_senior_partner?: boolean;
  } | null;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

export const SectorInsights: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Catalog State
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search States (synced with URL)
  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('q') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentPrice = searchParams.get('price') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // Pagination Metadata
  const [meta, setMeta] = useState({
    currentPage: 1,
    lastPage: 1,
    perPage: 12,
    total: 0
  });

  // Local search input state (debounced sync to URL)
  const [searchInput, setSearchInput] = useState(currentSearch);
  const catalogRef = useRef<HTMLDivElement>(null);

  // Keep local search input in sync if URL changes externally
  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // 1. Fetch available categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        const list = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setCategories(list);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  // 2. Fetch products based on active filters
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          page: currentPage,
          per_page: 12
        };

        if (currentCategory) params.category = currentCategory;
        if (currentSearch.trim()) params.q = currentSearch.trim();
        if (currentSort) params.sort = currentSort;
        if (currentPrice === 'free' || currentPrice === 'paid') {
          params.price = currentPrice;
        }

        const res = await api.get('/products', { params });
        const items = Array.isArray(res.data?.data) ? res.data.data : [];
        setProducts(items);

        if (res.data?.meta) {
          setMeta({
            currentPage: res.data.meta.current_page || 1,
            lastPage: res.data.meta.last_page || 1,
            perPage: res.data.meta.per_page || 12,
            total: res.data.meta.total || items.length
          });
        } else {
          setMeta({
            currentPage: 1,
            lastPage: 1,
            perPage: 12,
            total: items.length
          });
        }
      } catch (err) {
        console.error('Failed to load sector products', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentCategory, currentSearch, currentSort, currentPrice, currentPage]);

  // Update query params helper
  const updateFilter = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all' || (key === 'page' && val === '1')) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    });
    setSearchParams(next);
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateFilter({ q: searchInput.trim() || null, page: '1' });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    updateFilter({ q: null, page: '1' });
  };

  const handleCategorySelect = (slug: string) => {
    updateFilter({ category: slug || null, page: '1' });
  };

  const handleSortChange = (newSort: string) => {
    updateFilter({ sort: newSort, page: '1' });
  };

  const handlePriceChange = (newPrice: string) => {
    updateFilter({ price: newPrice, page: '1' });
  };

  const handleResetAll = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (page: number) => {
    updateFilter({ page: page.toString() });
    if (catalogRef.current) {
      catalogRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Only display categories that actually have publications (strictly real categories)
  const activeCategories = useMemo(() => {
    return categories.filter((c) => (c.products_count ?? 0) > 0);
  }, [categories]);

  // Active filter count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (currentCategory) count++;
    if (currentSearch) count++;
    if (currentPrice !== 'all') count++;
    if (currentSort !== 'newest') count++;
    return count;
  }, [currentCategory, currentSearch, currentPrice, currentSort]);

  // Total products across all active categories
  const totalCategoryProducts = useMemo(() => {
    return activeCategories.reduce((acc, c) => acc + (c.products_count || 0), 0);
  }, [activeCategories]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 font-sans">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-[#1976D2] transition-colors font-medium">
          Beranda
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-500 font-medium">Riset & Insight</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-semibold truncate">
          Sector Insights & Industry Analysis
        </span>
      </nav>

      {/* 2. Header & Introduction Section (Clean, Professional & Follows guideline.md) */}
      <section className="relative rounded-3xl bg-white border border-slate-200 p-6 sm:p-10 shadow-xs overflow-hidden">
        {/* Subtle Brand Accent Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#D1E4F6]/30 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-slate-50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#0C3B69] text-xs font-semibold">
            <BarChart3 className="w-3.5 h-3.5 text-[#1976D2]" />
            <span>Kajian Sektor & Intelijen Industri</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Sector Insights & Industry Analysis
          </h1>

          {/* Description specified by user */}
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-supporting">
            In-depth sectoral research and industry analysis providing strategic insights into market
            dynamics, competitive landscapes, industry trends, and emerging business opportunities.
          </p>

          {/* Real Metrics Row from actual database values */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 sm:gap-10 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#1976D2]" />
              <span>
                <strong className="text-slate-900 font-bold">{meta.total}</strong> Publikasi Tersedia
              </span>
            </div>
            {activeCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  <strong className="text-slate-900 font-bold">{activeCategories.length}</strong> Sektor Industri
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1976D2]" />
              <span className="font-medium text-slate-700">Riset Terverifikasi & Dataset XLS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sector Classification & Filtering (Pills based ONLY on real database categories) */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#1976D2]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Klasifikasi Sektor Industri
            </h2>
          </div>
          {currentCategory && (
            <button
              type="button"
              onClick={() => handleCategorySelect('')}
              className="text-xs font-bold text-[#1976D2] hover:text-[#0C3B69] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Tampilkan Semua Sektor</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* All Sectors Pill */}
          <button
            type="button"
            onClick={() => handleCategorySelect('')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              !currentCategory
                ? 'bg-[#1976D2] text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <span>Semua Sektor</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                !currentCategory ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalCategoryProducts || meta.total}
            </span>
          </button>

          {/* Real Categories from DB */}
          {activeCategories.map((cat) => {
            const isSelected = currentCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#1976D2] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{cat.name}</span>
                {typeof cat.products_count === 'number' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.products_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Search & Discovery Toolbar */}
      <section ref={catalogRef} className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari riset sektor, judul publikasi, emiten, atau topik industri..."
                className="w-full bg-slate-50/80 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 pl-10 pr-20 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]/50 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/50 cursor-pointer transition-colors"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs px-3 py-1.5 rounded-lg h-auto shadow-2xs font-semibold cursor-pointer"
                >
                  Cari
                </Button>
              </div>
            </form>

            {/* Filter & Sorting Controls */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              {/* Price Filter Selector */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => handlePriceChange('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentPrice === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => handlePriceChange('paid')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentPrice === 'paid'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Berbayar
                </button>
                <button
                  type="button"
                  onClick={() => handlePriceChange('free')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    currentPrice === 'free'
                      ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gratis
                </button>
              </div>

              {/* Sorting Selector */}
              <div className="relative flex items-center">
                <select
                  value={currentSort}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="bg-white text-xs text-slate-700 font-medium py-2.5 pl-3 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] cursor-pointer shadow-2xs appearance-none"
                >
                  <option value="newest">Terbaru</option>
                  <option value="popular">Paling Populer</option>
                  <option value="price_asc">Harga: Rendah ke Tinggi</option>
                  <option value="price_desc">Harga: Tinggi ke Rendah</option>
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Reset All Filters Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                  title="Reset filter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Filter Indicators & Results Count */}
          <div className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 flex-wrap text-xs">
            <div className="text-slate-600">
              Menampilkan <span className="font-bold text-slate-900">{products.length}</span> dari{' '}
              <span className="font-bold text-slate-900">{meta.total}</span> publikasi riset sektor
            </div>

            {/* Active filters tag pills */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 text-[11px] font-medium">Filter aktif:</span>
                {currentCategory && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#D1E4F6]/60 text-[#0C3B69] border border-[#B2D1F0] text-[11px] font-semibold">
                    <span>
                      Sektor: {activeCategories.find((c) => c.slug === currentCategory)?.name || currentCategory}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCategorySelect('')}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {currentSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                    <span>"{currentSearch}"</span>
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {currentPrice !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                    <span>{currentPrice === 'free' ? 'Hanya Gratis' : 'Hanya Berbayar'}</span>
                    <button
                      type="button"
                      onClick={() => handlePriceChange('all')}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {currentSort !== 'newest' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-[11px] font-medium">
                    <span>
                      Urutkan:{' '}
                      {currentSort === 'popular'
                        ? 'Populer'
                        : currentSort === 'price_asc'
                        ? 'Harga Termurah'
                        : 'Harga Tertinggi'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSortChange('newest')}
                      className="hover:text-rose-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 5. Research Catalog Grid (Equal Visual Priority for Every Publication) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 animate-pulse shadow-xs"
              >
                <div className="aspect-[4/3] rounded-xl bg-slate-100" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-slate-100 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 sm:py-20 bg-white border border-dashed border-slate-200 rounded-3xl p-8 space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#D1E4F6]/50 border border-[#B2D1F0] flex items-center justify-center mx-auto text-[#1976D2]">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Tidak ada riset sektoral yang ditemukan
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-supporting leading-relaxed">
                {currentSearch
                  ? `Tidak ada dokumen riset yang cocok dengan kata kunci "${currentSearch}".`
                  : currentCategory
                  ? 'Belum ada publikasi terbit untuk kategori sektor yang dipilih.'
                  : 'Saat ini belum ada publikasi yang memenuhi filter ini.'}
              </p>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleResetAll}
                className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer font-semibold"
              >
                Reset Semua Filter
              </Button>
            </div>
          </div>
        ) : (
          /* Professional Catalog Grid: All products render with equal proportions */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} showPrice={true} />
            ))}
          </div>
        )}

        {/* 6. Pagination Controls */}
        {meta.lastPage > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 pb-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.currentPage <= 1}
              onClick={() => handlePageChange(meta.currentPage - 1)}
              className="rounded-xl text-xs gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: meta.lastPage }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    meta.currentPage === pageNum
                      ? 'bg-[#1976D2] text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={meta.currentPage >= meta.lastPage}
              onClick={() => handlePageChange(meta.currentPage + 1)}
              className="rounded-xl text-xs gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </section>

      {/* 7. Footer Quality Guarantee & Methodology Note (Institutional Trust) */}
      <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
            <span>Standar Integritas & Riset Institusional</span>
          </div>
          <p className="text-slate-500 font-supporting leading-relaxed">
            Seluruh analisis industri dan data pasar didasarkan pada metodologi riset primer, laporan
            keuangan emiten terverifikasi, dan data regulasi resmi. Setiap publikasi dilengkapi dengan
            executive summary dan dataset pendukung.
          </p>
        </div>
        <Link
          to="/custom-analysis"
          className="shrink-0 text-xs font-bold text-[#1976D2] hover:text-[#0C3B69] hover:underline flex items-center gap-1"
        >
          <span>Butuh Riset Kustom?</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </section>
    </div>
  );
};

export default SectorInsights;
