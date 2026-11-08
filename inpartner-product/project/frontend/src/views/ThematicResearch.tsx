import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, ShieldCheck, ArrowRight, FileText, CheckCircle2, Award, 
  Download, ExternalLink, Lock, ShoppingCart, Zap, Heart, Star, 
  FileSpreadsheet, Layers, Calendar, ChevronRight, Check, Users, 
  Clock, Sparkles, Shield, Search, Filter, Compass, 
  AlertCircle, ChevronDown, CheckCircle
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import ProductCard from '@/components/ProductCard';
import { initials } from '@/utils/format';
import { toast } from 'sonner';

export const ThematicResearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { t, formatPrice } = useLanguage();

  const [thematicProducts, setThematicProducts] = useState<any[]>([]);
  const [product, setProduct] = useState<any>(null);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'methodology' | 'dataset' | 'chapters' | 'sources'>('content');
  
  // Real Search & Category filter states
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const detailSectionRef = useRef<HTMLDivElement>(null);

  // Active slug from URL or fallback
  const currentSlug = searchParams.get('slug') || 'thematic-research-macro-outlook';

  // 1. Fetch all thematic research products from database
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const res = await api.get('/products', {
          params: { type: 'thematic_research', per_page: 30 }
        });
        const items = Array.isArray(res.data?.data) ? res.data.data : [];
        setThematicProducts(items);

        // Fetch related catalog items
        const relRes = await api.get('/products', {
          params: { per_page: 4, sort: 'popular' }
        });
        const allProds = Array.isArray(relRes.data?.data) ? relRes.data.data : [];
        setRelatedProducts(allProds.filter((p: any) => p.type !== 'thematic_research').slice(0, 4));
      } catch (err) {
        console.error('Failed to load thematic catalog from API', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  // 2. Fetch full detail for the currently selected product
  useEffect(() => {
    const fetchSelectedProduct = async () => {
      setDetailLoading(true);
      try {
        const prodRes = await api.get(`/products/${currentSlug}`);
        if (prodRes.data?.product) {
          setProduct(prodRes.data.product);
        } else if (thematicProducts.length > 0) {
          setProduct(thematicProducts[0]);
        }
      } catch (err) {
        console.error('Failed to load product detail from API', err);
      } finally {
        setDetailLoading(false);
      }
    };

    if (currentSlug) {
      fetchSelectedProduct();
    }
  }, [currentSlug, thematicProducts.length]);

  // Extract distinct categories present in the real products
  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    thematicProducts.forEach((p) => {
      if (p.category?.slug && p.category?.name) {
        map.set(p.category.slug, p.category.name);
      }
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [thematicProducts]);

  // Filtered list based on real database attributes
  const filteredCatalog = useMemo(() => {
    return thematicProducts.filter((p) => {
      const q = catalogSearch.toLowerCase().trim();
      const matchSearch = !q || 
        p.title?.toLowerCase().includes(q) || 
        p.subtitle?.toLowerCase().includes(q) ||
        p.excerpt?.toLowerCase().includes(q) ||
        p.author?.name?.toLowerCase().includes(q) ||
        (Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase().includes(q)));

      const matchCat = selectedCategory === 'all' || p.category?.slug === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [thematicProducts, catalogSearch, selectedCategory]);

  const handleSelectProduct = (slug: string) => {
    setSearchParams({ slug });
    setTimeout(() => {
      if (detailSectionRef.current) {
        detailSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleBuyNow = async (targetProduct?: any) => {
    const prod = targetProduct || product;
    if (!prod) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/thematic-research?slug=${prod.slug}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/checkout', { product_ids: [Number(prod.id)] });
      const orderNumber = res.data.order?.order_number;
      const isPaid = res.data.order?.payment_status === 'paid' || res.data.order?.status === 'paid';

      if (isPaid) {
        navigate(`/orders/${orderNumber}`);
      } else {
        navigate(`/payment/simulator/${orderNumber}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Gagal memproses pesanan riset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToCart = async (targetProduct?: any) => {
    const prod = targetProduct || product;
    if (!prod) return;
    if (!isAuthenticated) {
      navigate(`/login?redirect=/thematic-research?slug=${prod.slug}`);
      return;
    }
    try {
      await addToCart(prod.id);
      toast.success(`${prod.title} telah ditambahkan ke keranjang belanja.`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan ke keranjang');
    }
  };

  const wishlisted = product ? isWishlisted(product.id) : false;

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const scrollToSection = (id: string, tab: any) => {
    setActiveTab(tab);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  if (loading && thematicProducts.length === 0) {
    return (
      <div className="py-24 text-center space-y-4 max-w-7xl mx-auto">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center animate-pulse shadow-xs">
          <BookOpen className="w-7 h-7 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          Memuat data riset tematik terverifikasi...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-6 max-w-7xl mx-auto">
      {/* ================= 1. BREADCRUMBS ================= */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-[#1976D2] transition-colors font-medium">Beranda</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/products" className="hover:text-[#1976D2] transition-colors font-medium">Katalog Riset</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Thematic Research Hub</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D1E4F6]/60 text-[#0C3B69] border border-[#B2D1F0] font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1976D2]" /> Verified Research Data
          </span>
        </div>
      </nav>

      {/* ================= 2. THEMATIC RESEARCH HUB HERO ================= */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#D1E4F6]/30 to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 max-w-3xl space-y-4">
          
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Katalog Riset Tematik & Intelijen Makroekonomi
          </h1>

          <p className="text-slate-600 text-sm sm:text-base font-supporting leading-relaxed">
            Publikasi riset tematik dan analisis multi-sektor yang disusun berdasarkan metodologi empiris dan sumber data resmi terakreditasi. Seluruh informasi disajikan langsung dari database publikasi Inpartner.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sumber Data Primer Resmi</span>
            </span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#1976D2]" />
              <span>Format Dokumen & Dataset (.xlsx)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#0C3B69]" />
              <span>Integritas Analisis Terverifikasi</span>
            </span>
          </div>
        </div>
      </section>

      {/* ================= 3. THEMATIC RESEARCH CATALOG GRID ================= */}
      <section className="space-y-6">
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#1976D2]" />
              <span>Daftar Publikasi Riset Tematik</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 ml-1">
                {filteredCatalog.length} Laporan
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-supporting mt-0.5">
              Pilih laporan untuk membaca ringkasan eksekutif dan dokumen riset lengkap di bawah.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Cari kata kunci riset atau topik..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#1976D2] focus:ring-1 focus:ring-[#D1E4F6]"
              />
            </div>
          </div>
        </div>

        {/* Real Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#1976D2] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua Kategori ({thematicProducts.length})
          </button>
          {availableCategories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat.slug
                  ? 'bg-[#1976D2] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        {filteredCatalog.length === 0 ? (
          <div className="py-12 text-center bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Tidak ada publikasi yang cocok</h3>
            <p className="text-xs text-slate-500 font-supporting">
              Coba sesuaikan kata kunci pencarian atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map((item) => {
              const isSelected = item.slug === currentSlug;
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                    isSelected
                      ? 'border-2 border-[#1976D2] ring-4 ring-[#D1E4F6]/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-[#D1E4F6]/60 text-[#0C3B69] text-[10px] font-bold uppercase tracking-wider border border-[#B2D1F0]">
                        {item.category?.name || 'Macro Economy'}
                      </span>

                      {isSelected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <Check className="w-3 h-3" /> Sedang Dipilih
                        </span>
                      )}
                    </div>

                    {/* Title & Excerpt */}
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug hover:text-[#1976D2] transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-supporting mt-2 line-clamp-3 leading-relaxed">
                        {item.subtitle || item.excerpt || 'Deskripsi singkat belum tersedia.'}
                      </p>
                    </div>

                    {/* Verified Specs */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                      {item.pages > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.pages} Halaman</span>
                        </span>
                      )}
                      {item.has_excel && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Dataset Excel</span>
                        </span>
                      )}
                      {item.reading_time > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.reading_time} mnt telaah</span>
                        </span>
                      )}
                    </div>

                    {/* Author & Date */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <span className="font-medium text-slate-800 truncate">
                        {item.senior_partner || item.author?.name || 'Inpartner Research'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDate(item.published_at)}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-medium">Biaya Akses Dokumen</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-slate-900">
                            {formatPrice(item.final_price || item.price)}
                          </span>
                          {item.sale_price && (
                            <span className="text-[11px] text-slate-400 line-through">
                              {formatPrice(item.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-[11px]">
                        {item.reviews_count > 0 && item.rating ? (
                          <div className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{Number(item.rating).toFixed(1)} ({item.reviews_count})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Belum ada ulasan</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSelectProduct(item.slug)}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#0C3B69] text-white shadow-xs'
                            : 'bg-white border border-[#1976D2] text-[#1976D2] hover:bg-[#D1E4F6]/30'
                        }`}
                      >
                        <span>{isSelected ? 'Sedang Ditelaah' : 'Pilih & Telaah'}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleBuyNow(item)}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-[#1976D2] hover:bg-[#1562AF] text-white transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>Beli Dokumen</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= 4. ACTIVE SELECTION ANCHOR ================= */}
      <div ref={detailSectionRef} id="active-detail-section" className="pt-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#D1E4F6]/50 via-blue-50/40 to-white border border-[#B2D1F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1976D2] text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {product?.title || 'Memuat dokumen...'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Beralih laporan:</span>
            <select
              value={currentSlug}
              onChange={(e) => handleSelectProduct(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1976D2]"
            >
              {thematicProducts.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.title.length > 50 ? p.title.substring(0, 50) + '...' : p.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ================= 5. PRODUCT HERO & EDITORIAL COVER ================= */}
      {product && (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start relative z-10">
            
            {/* Left Column: Authentic Publication Cover (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative aspect-[3/4] w-full rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden p-5 flex flex-col justify-between group">
                <div className="space-y-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-brand font-black text-[#0C3B69] text-xs tracking-wider">
                      INPARTNER
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {product.type_label || 'Thematic Research'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ID: #{product.id}
                  </div>
                </div>

                {/* Center Typography */}
                <div className="py-6 border-l-4 border-[#1976D2] bg-gradient-to-r from-blue-50/40 to-transparent pl-4 my-auto">
                  <span className="text-[10px] font-bold text-[#1976D2] uppercase tracking-wider block mb-1">
                    {product.category?.name || 'Macroeconomic Research'}
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                    {product.title}
                  </h2>
                  <div className="h-0.5 w-12 bg-[#1976D2] my-3" />
                  <p className="text-xs text-slate-600 font-supporting leading-relaxed line-clamp-4">
                    {product.subtitle || product.excerpt || 'Laporan riset terstruktur berbasis data primer.'}
                  </p>
                </div>

                {/* Cover Bottom */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Penerbit / Kontributor</div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {product.senior_partner || product.author?.name || product.publisher || 'Inpartner Research Lab'}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    <div>{formatDate(product.published_at)}</div>
                  </div>
                </div>
              </div>

              {/* Real Specs Grid */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-medium">Format</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {product.has_excel ? 'PDF + Excel' : 'PDF Dokumen'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-medium">Halaman</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {product.pages ? `${product.pages} Hal` : '-'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-medium">Waktu Baca</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {product.reading_time ? `${product.reading_time} Menit` : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Title, Metadata, Commercial Card (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#D1E4F6]/60 text-[#0C3B69] text-xs font-bold border border-[#B2D1F0]">
                    {product.category?.name || 'Macroeconomic Research'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium uppercase">
                    Akses: {product.access_level || 'Enterprise'}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {product.title}
                </h1>

                <p className="text-sm sm:text-base text-slate-600 font-supporting leading-relaxed">
                  {product.subtitle || product.excerpt || 'Dokumen kajian empiris multi-sektor Inpartner.'}
                </p>
              </div>

              {/* Real Metadata Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tanggal Terbit</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(product.published_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Terakhir Diperbarui</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(product.updated_at)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Bahasa Dokumen</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {product.language === 'en' ? 'English (EN)' : 'Bahasa Indonesia (ID)'}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Penulis / Kontributor</span>
                    <span className="font-bold text-slate-900 text-xs mt-0.5">
                      {product.senior_partner || product.author?.name || product.publisher || 'Inpartner Research Lab'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Tipe Hak Akses</span>
                    <span className="font-semibold text-[#1976D2] text-xs">
                      {product.access_type === 'read_download' ? 'Baca Online & Unduh File' : product.access_type === 'download' ? 'Unduh Dokumen' : 'Baca Online'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real Commercial Card */}
              <div className="p-6 rounded-2xl bg-white border-2 border-[#1976D2]/30 shadow-md space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                      Biaya Akses Laporan
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-slate-900">
                        {formatPrice(product.final_price || product.price)}
                      </span>
                      {product.sale_price && (
                        <span className="text-sm font-semibold text-slate-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                      )}
                      {product.discount_percent > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-100">
                          Hemat {product.discount_percent}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-500">
                    {product.reviews_count > 0 && product.rating ? (
                      <div className="flex items-center gap-1 text-amber-500 font-bold justify-end">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{Number(product.rating).toFixed(1)} / 5.0</span>
                        <span className="text-slate-400 font-normal">({product.reviews_count} ulasan)</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Belum ada ulasan</span>
                    )}

                    {product.buyers_count > 0 || product.sales_count > 0 ? (
                      <div className="text-slate-600 font-medium mt-0.5">
                        {product.buyers_count || product.sales_count} Pembeli Terverifikasi
                      </div>
                    ) : (
                      <div className="text-slate-400 mt-0.5">Publikasi Baru</div>
                    )}
                  </div>
                </div>

                {/* What is Included Checklist (Derived only from real data) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Laporan Riset PDF Lengkap {product.pages ? `(${product.pages} Hal)` : ''}</span>
                  </div>
                  {product.has_excel ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-900">
                        Dataset Spreadsheet ({product.excel_file_name || '.xlsx'})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">•</span>
                      <span>Tidak melampirkan dataset eksternal</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hak Akses Digital: {product.access_type === 'read_download' ? 'Baca Online & Unduh Dokumen' : product.access_type === 'download' ? 'Unduh Dokumen' : 'Baca Online'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Tersimpan Permanen di Library Pengguna</span>
                  </div>
                </div>

                {/* Purchase Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button
                    onClick={() => handleBuyNow()}
                    disabled={submitting}
                    className="w-full sm:w-2/3 py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{submitting ? 'Memproses Transaksi...' : 'Beli Laporan Riset Sekarang'}</span>
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-1/3">
                    <Button
                      onClick={() => handleAddToCart()}
                      variant="outline"
                      className="flex-1 py-3 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4 text-slate-500" />
                      <span>Keranjang</span>
                    </Button>

                    <button
                      onClick={() => toggleWishlist(product.id)}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                        wishlisted
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                      title="Simpan ke Wishlist"
                    >
                      <Heart className={`w-4 h-4 ${wishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= 6. IN-PAGE NAVIGATION TABS ================= */}
      {product && (
        <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => scrollToSection('content-section', 'content')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'content'
                ? 'bg-[#1976D2] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Ringkasan Eksekutif & Isi
          </button>

          {product.methodology && (
            <button
              onClick={() => scrollToSection('methodology-section', 'methodology')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'methodology'
                  ? 'bg-[#1976D2] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Metodologi Penelitian
            </button>
          )}

          {product.has_excel && (
            <button
              onClick={() => scrollToSection('dataset-section', 'dataset')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'dataset'
                  ? 'bg-[#1976D2] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Dataset Spreadsheet
            </button>
          )}

          {Array.isArray(product.chapters) && product.chapters.length > 0 && (
            <button
              onClick={() => scrollToSection('chapters-section', 'chapters')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'chapters'
                  ? 'bg-[#1976D2] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Struktur Bab ({product.chapters.length})
            </button>
          )}

          {Array.isArray(product.sources) && product.sources.length > 0 && (
            <button
              onClick={() => scrollToSection('sources-section', 'sources')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'sources'
                  ? 'bg-[#1976D2] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Referensi & Sumber ({product.sources.length})
            </button>
          )}
        </div>
      )}

      {/* ================= 7. CONTENT & EXECUTIVE SUMMARY SECTION ================= */}
      {product && (
        <section id="content-section" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Ringkasan Eksekutif & Pembahasan Utama
            </h2>
          </div>

          {/* Render Real Content from Database */}
          {product.preview_html || product.content_html ? (
            <div 
              className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed font-supporting
                prose-headings:font-bold prose-headings:text-slate-900 prose-headings:tracking-tight
                prose-h2:text-lg prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-h2:mt-6
                prose-h3:text-base prose-h3:mt-4
                prose-p:my-3 prose-p:leading-relaxed
                prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
                prose-li:my-1
                prose-strong:text-slate-900"
              dangerouslySetInnerHTML={{ __html: product.preview_html || product.content_html }}
            />
          ) : product.description || product.excerpt ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-700 font-supporting leading-relaxed whitespace-pre-line">
                {product.description || product.excerpt}
              </p>
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl p-6">
              <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-supporting">
                Ringkasan eksekutif publik belum dilampirkan untuk dokumen ini. Isi lengkap tersedia di dalam file PDF setelah pembelian.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ================= 8. METHODOLOGY SECTION ================= */}
      {product?.methodology && (
        <section id="methodology-section" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Metodologi Penelitian & Validitas Data
            </h2>
          </div>

          <div className="p-5 rounded-2xl bg-blue-50/40 border border-[#B2D1F0] flex items-start gap-3">
            <Layers className="w-5 h-5 text-[#1976D2] mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs sm:text-sm text-slate-700 font-supporting leading-relaxed">
                {product.methodology}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ================= 9. DATASET SPREADSHEET SECTION ================= */}
      {product?.has_excel && (
        <section id="dataset-section" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Dataset Spreadsheet Terbuka (.xlsx)
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {product.excel_file_name || 'Dataset Penelitian (.xlsx)'}
                </h3>
                <p className="text-xs text-slate-500 font-supporting mt-0.5">
                  Format Spreadsheet Excel • Tabel data mentah, rumus, dan visualisasi kuantitatif
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Terbuka otomatis setelah pembelian</span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ================= 10. CHAPTERS STRUCTURE SECTION ================= */}
      {product && Array.isArray(product.chapters) && product.chapters.length > 0 && (
        <section id="chapters-section" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-[#1976D2] uppercase tracking-wider block mb-1">
              Struktur Dokumen
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Daftar Bab & Pembahasan
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {product.chapters.map((ch: any, idx: number) => {
              const title = typeof ch === 'string' ? ch : ch.title || `Bab ${idx + 1}`;
              const page = typeof ch === 'object' && ch.page ? ch.page : null;
              return (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{title}</span>
                  {page && <span className="text-slate-400 font-mono text-[11px]">Hal. {page}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ================= 11. REFERENCES & CITATIONS SECTION ================= */}
      {product && (
        <section id="sources-section" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Referensi & Sumber Data Primer Resmi
            </h2>
          </div>

          {Array.isArray(product.sources) && product.sources.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-supporting">
              {product.sources.map((src: any, idx: number) => {
                const publisher = src.publisher || src.org || 'Institusi Resmi';
                const title = src.title || 'Dokumen Publikasi';
                const year = src.year || '';
                const url = src.url || '';
                const cat = src.category || 'Sumber Resmi';

                return (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <span className="font-mono font-bold text-slate-400 text-xs mt-0.5">[{idx + 1}]</span>
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1976D2] block">
                        {cat}
                      </span>
                      <p className="font-semibold text-slate-900 leading-snug">
                        <strong className="text-[#0C3B69] mr-1.5">{publisher}.</strong>
                        <span>&ldquo;{title}&rdquo;</span>
                        {year && <span className="text-slate-400 font-mono text-[11px] ml-1.5">({year})</span>}
                      </p>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#1976D2] hover:underline font-medium text-[11px] mt-1"
                        >
                          <span>Portal Resmi Sumber Data</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <p className="text-xs text-slate-500 font-supporting">
                Belum ada daftar referensi eksternal yang dicantumkan untuk dokumen ini.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ================= 12. REAL RECENT BUYERS / ACCESS LOG ================= */}
      {product && Array.isArray(product.recent_buyers) && product.recent_buyers.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#1976D2] uppercase tracking-wider block mb-0.5">
                Verifikasi Pembelian
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Riwayat Pembeli Terverifikasi
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              {product.buyers_count || product.recent_buyers.length} transaksi berstatus lunas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {product.recent_buyers.map((b: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#D1E4F6] text-[#0C3B69] font-bold text-xs flex items-center justify-center shrink-0">
                  {b.initials || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1">
                    <span>{b.name}</span>
                    <CheckCircle className="w-3 h-3 text-emerald-600 inline shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {formatDate(b.purchased_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= 13. RELATED RESEARCH PUBLICATIONS ================= */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Publikasi Riset Sektoral Terkait
              </h2>
            </div>
            <Link to="/products" className="text-xs font-bold text-[#1976D2] hover:underline flex items-center gap-1">
              <span>Buka Seluruh Katalog Riset</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ThematicResearch;
