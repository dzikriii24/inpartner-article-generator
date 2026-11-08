import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Clock, FileText, Link as LinkIcon, Lock, ShoppingCart, Zap, 
  BookOpen, ShieldCheck, ArrowRight, Star, Heart, FileSpreadsheet, 
  MessageSquare, CheckCircle2, Award, ExternalLink, Calendar, 
  Eye, Check, Users, Sparkles, Download, ArrowLeft, ChevronRight,
  TrendingUp, Globe, FileCode
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

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { t, formatPrice } = useLanguage();

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reviews state
  const [reviewsData, setReviewsData] = useState<{
    average_rating: number;
    total_reviews: number;
    distribution: Record<number, number>;
    reviews: any[];
  }>({
    average_rating: 5.0,
    total_reviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [],
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProduct = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await api.get(`/products/${slug}`);
      setProduct(res.data.product);
      setRelated(res.data.related || []);

      // Fetch reviews
      try {
        const revRes = await api.get(`/products/${slug}/reviews`);
        if (revRes.data) {
          setReviewsData(revRes.data);
        }
      } catch (_) {}
    } catch (err) {
      console.error(err);
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/products/${slug}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/checkout', { product_ids: [Number(product.id)] });
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

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/products/${slug}`);
      return;
    }
    try {
      await addToCart(product.id);
      toast.success(`${product.title} telah ditambahkan ke keranjang belanja.`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan ke keranjang');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) return;
    setSubmittingReview(true);
    setReviewMsg(null);
    try {
      await api.post(`/products/${slug}/reviews`, reviewForm);
      setReviewMsg({ type: 'success', text: 'Ulasan Anda berhasil dikirim dan tersimpan di database publik!' });
      setReviewForm({ rating: 5, title: '', comment: '' });
      // Refresh reviews
      const revRes = await api.get(`/products/${slug}/reviews`);
      if (revRes.data) setReviewsData(revRes.data);
      toast.success('Ulasan Anda berhasil dikirim.');
    } catch (err: any) {
      setReviewMsg({ type: 'error', text: err.response?.data?.message || 'Gagal mengirim ulasan.' });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center animate-pulse shadow-xs">
          <BookOpen className="w-7 h-7 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Memuat Dokumen Riset & Spesifikasi Data Intelijen...</p>
      </div>
    );
  }

  if (!product) return null;

  const wishlisted = isWishlisted(product.id);
  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-12 py-6 max-w-7xl mx-auto">
      {/* ================= 1. BREADCRUMBS & TOP BAR ================= */}
      <nav className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/" className="hover:text-[#1976D2] transition-colors font-medium">Beranda</Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link to="/products" className="hover:text-[#1976D2] transition-colors font-medium">Katalog</Link>
          {product.category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <Link
                to={`/products?category=${product.category.slug}`}
                className="hover:text-[#1976D2] transition-colors font-medium"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
            {product.title}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              wishlisted
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-rose-600' : ''}`} />
            <span>{wishlisted ? 'Tersimpan' : 'Simpan Riset'}</span>
          </button>
        </div>
      </nav>

      {/* ================= 2. HERO PRESENTATION GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Premium Publication Cover & Visual Showcase */}
        <div className="lg:col-span-5 space-y-5">
          <div className="relative group">
            {/* Publication 3:4 Frame */}
            <div className="relative aspect-[3/4] w-full rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden p-3 flex flex-col justify-between transition-all duration-300 group-hover:shadow-2xl">
              {/* Subtle Book Spine Shadow Overlay */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/15 to-transparent z-20 pointer-events-none" />

              {/* Cover Image or Procedural Cover */}
              {product.cover_url ? (
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={product.cover_url}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent z-10" />
                  
                  {/* Bottom title overlay on cover */}
                  <div className="absolute bottom-3 left-3 right-3 z-20 text-white">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-[#D1E4F6] block mb-1">
                      {product.type_label || 'Inpartner Intelligence'}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {product.title}
                    </h3>
                  </div>
                </div>
              ) : (
                /* Fallback Executive Report Cover */
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#0C3B69] via-[#104C89] to-[#1976D2] text-white p-6 flex flex-col justify-between relative overflow-hidden shadow-inner">
                  {/* Geometric accents */}
                  <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono tracking-widest uppercase text-[#D1E4F6] font-bold">
                        {product.category?.name || 'Economic Intelligence'}
                      </span>
                      <span className="text-[10px] font-wordmark font-extrabold text-white bg-white/20 px-2 py-0.5 rounded">
                        INPARTNER
                      </span>
                    </div>
                    <div className="w-8 h-1 bg-[#4292DC] rounded-full" />
                  </div>

                  <div className="relative z-10 space-y-2 my-auto">
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-white font-wordmark">
                      {product.title}
                    </h3>
                    {product.subtitle && (
                      <p className="text-xs text-slate-200 line-clamp-3 font-supporting leading-relaxed opacity-90">
                        {product.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 pt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-[#D1E4F6]">
                    <span>{product.author?.name || 'Inpartner Editorial Board'}</span>
                    <span className="font-mono text-[10px]">2026 EDITION</span>
                  </div>
                </div>
              )}

              {/* Floating Status Badges */}
              <div className="absolute top-5 left-5 z-30 flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/95 backdrop-blur-md text-[#0C3B69] border border-slate-200 shadow-xs flex items-center gap-1">
                  <FileText className="w-3 h-3 text-[#1976D2]" />
                  {product.type_label || 'Dokumen Riset'}
                </span>

                {product.has_excel && (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3" />
                    + XLS Data
                  </span>
                )}
              </div>
            </div>

            {product.cover_caption && (
              <p className="text-[11px] text-slate-400 text-center italic mt-2">
                {product.cover_caption}
              </p>
            )}
          </div>

          {/* Quick Specifications Grid Card */}
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-[#1976D2]" />
                Spesifikasi Format & Berkas
              </span>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Verifikasi 100% Asli
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Format Berkas</span>
                <strong className="text-slate-900 font-semibold block mt-0.5">
                  {product.has_excel ? 'PDF + Spreadsheet XLS' : 'Laporan PDF (.pdf)'}
                </strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Jumlah Halaman / Kata</span>
                <strong className="text-slate-900 font-semibold block mt-0.5">
                  {product.pages || Math.max(1, Math.ceil((product.word_count || 1200) / 300))} Hlm ({product.word_count?.toLocaleString() || '-'} kata)
                </strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Estimasi Baca</span>
                <strong className="text-slate-900 font-semibold block mt-0.5">
                  {product.reading_time || 8} Menit Baca Mendalam
                </strong>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium block">Bahasa Pengantar</span>
                <strong className="text-slate-900 font-semibold block mt-0.5">
                  {product.language === 'en' ? 'English (US)' : 'Bahasa Indonesia'}
                </strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tanggal Publikasi:</span>
              <span className="font-semibold text-slate-800">
                {formattedDate(product.published_at) || 'Terbit Resmi 2026'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Title, Authority, Purchasing Box & Delivery */}
        <div className="lg:col-span-7 space-y-6">
          {/* Metadata Badges Row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {product.category && (
              <Link
                to={`/products?category=${product.category.slug}`}
                className="px-3 py-1 bg-[#D1E4F6] hover:bg-[#D1E4F6]/80 text-[#0C3B69] border border-[#B2D1F0] rounded-xl font-bold transition-colors"
              >
                {product.category.name}
              </Link>
            )}

            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {product.type_label || 'Executive Brief'}
            </span>

            <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200 uppercase tracking-wider text-[10px]">
              Akses: {product.access_level || 'Professional'}
            </span>

            <div className="flex items-center gap-1.5 ml-auto bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span className="text-slate-900 font-bold text-xs">{reviewsData.average_rating.toFixed(1)}</span>
              <span className="text-slate-400 text-[11px]">({reviewsData.total_reviews} ulasan)</span>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
              {product.title}
            </h1>
            {product.subtitle && (
              <p className="text-slate-600 font-supporting text-base sm:text-lg leading-relaxed italic border-l-2 border-[#1976D2] pl-4">
                {product.subtitle}
              </p>
            )}
          </div>

          {/* Author / Senior Partner Card */}
          {product.author && (
            <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#1976D2] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs overflow-hidden">
                  {product.author.photo_url ? (
                    <img src={product.author.photo_url} alt={product.author.name} className="w-full h-full object-cover" />
                  ) : (
                    initials(product.author.name)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{product.author.name}</span>
                    {product.author.is_senior_partner && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0]">
                        <Award className="w-3 h-3 text-[#1976D2]" /> Senior Analyst
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {product.author.position || 'Head of Strategic Intelligence'} &bull; {product.author.affiliation || 'Inpartner Research'}
                  </p>
                </div>
              </div>

              {product.author.credentials && (
                <span className="text-[11px] font-mono text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto font-medium">
                  {product.author.credentials}
                </span>
              )}
            </div>
          )}

          {/* ================= PURCHASE / CONVERSION BOX ================= */}
          <Card className="p-6 sm:p-7 bg-white border border-slate-200 shadow-md rounded-2xl space-y-6">
            <div className="flex items-baseline justify-between gap-4 flex-wrap pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Investasi Lisensi & Hak Akses Dokumen
                </span>
                {product.is_free ? (
                  <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
                    OPEN ACCESS (GRATIS)
                  </span>
                ) : (
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                      {formatPrice(product.final_price ?? product.price)}
                    </span>
                    {product.discount_percent > 0 && (
                      <>
                        <span className="text-base font-medium text-slate-400 line-through">
                          {formatPrice(product.price)}
                        </span>
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          Hemat {product.discount_percent}%
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {product.is_owned && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Anda Memiliki Akses Penuh
                </span>
              )}
            </div>

            {/* Deliverables Checklist */}
            <div className="space-y-2 text-xs text-slate-700">
              <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
                Paket Hak Akses Termasuk:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Dokumen Lengkap PDF Resolusi Tinggi</span>
                </div>
                {product.has_excel ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-800">Dataset Mentah XLSX / CSV Siap Pakai</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Akses Reader Interaktif 24/7 Tanpa Batas</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Lisensi Korporasi & Hak Penggunaan Bisnis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Invoice Resmi & Faktur Pajak Otomatis</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              {product.is_owned ? (
                <Link to={`/library/${product.slug}/read`} className="flex-1">
                  <button className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer">
                    <BookOpen className="w-4 h-4" /> Buka Laporan Lengkap di Library &rarr;
                  </button>
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleBuyNow}
                    disabled={submitting}
                    className="flex-1 py-3.5 px-6 bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    {submitting ? 'Memproses Pesanan...' : 'Beli Akses Sekarang'}
                  </button>

                  <button
                    onClick={handleAddToCart}
                    disabled={submitting}
                    className="py-3.5 px-5 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold border border-slate-200 hover:border-[#B2D1F0] rounded-xl text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                  >
                    <ShoppingCart className="w-4 h-4 text-[#1976D2]" />
                    <span>+ Keranjang</span>
                  </button>
                </>
              )}
            </div>

            {/* Security Guarantee Strip */}
            <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500 gap-2">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#1976D2]" /> Pembayaran Terenkripsi 256-bit SSL via Midtrans
              </span>
              <span className="text-slate-400">QRIS, Virtual Account, & Kartu Kredit</span>
            </div>
          </Card>

          {/* Social Proof & Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Total Terjual
              </span>
              <strong className="text-sm font-extrabold text-slate-900 block mt-0.5">
                {product.sales_count || product.buyers_count || 0} Pembaca
              </strong>
            </div>
            <div className="border-x border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Popularitas
              </span>
              <strong className="text-sm font-extrabold text-slate-900 block mt-0.5">
                {product.view_count || 120} Penayangan
              </strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Terakhir Diperbarui
              </span>
              <strong className="text-xs font-semibold text-slate-800 block mt-1 truncate">
                {formattedDate(product.updated_at || product.published_at) || 'Terbaru 2026'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 3. STRATEGIC OVERVIEW & SYNOPSIS ================= */}
      <section className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
        <div>
         
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Gambaran Umum & Relevansi Strategis
          </h2>
        </div>

        <p className="text-slate-700 text-sm sm:text-base leading-relaxed font-supporting">
          {product.excerpt || product.subtitle || 'Dokumen ini menyajikan kajian empiris mendalam dan pemetaan dampak industri untuk memandu formulasi strategi bisnis serta mitigasi risiko korporasi.'}
        </p>

        {/* 3 Pillars of Strategic Value */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center font-bold text-xs mb-2">
              <Users className="w-4 h-4 text-[#1976D2]" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Target Audiens Relevan</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-supporting">
              C-Level Executives, Tim Strategic Planning, Analis Investasi & Pasar Modal, serta Pengambil Kebijakan Regulasi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center font-bold text-xs mb-2">
              <TrendingUp className="w-4 h-4 text-[#1976D2]" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Nilai Praktis & Insight</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-supporting">
              Proyeksi tren sektoral kuantitatif, analisis komparasi harga, dan rekomendasi mitigasi rantai pasok terverifikasi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center font-bold text-xs mb-2">
              <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Kredibilitas Data</h4>
            <p className="text-xs text-slate-600 leading-relaxed font-supporting">
              {product.sources_count > 0 ? `${product.sources_count} rujukan primer eksternal dipadukan dengan pemodelan analitis internal.` : 'Data primer internal dan metodologi analitis empiris tanpa bias komersial.'}
            </p>
          </div>
        </div>
      </section>

      {/* ================= 4. EXECUTIVE SUMMARY & FREE PREVIEW TEASER ================= */}
      <Card className="p-6 sm:p-10 bg-white border border-slate-200 shadow-xs rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5 flex-wrap gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1976D2]" /> Executive Summary & Teaser Riset
            </h2>
          </div>
          <span className="bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            FREE PREVIEW TEASER
          </span>
        </div>

        {/* Prose preview content */}
        <div
          className="article-prose max-w-none text-slate-700 text-sm sm:text-base leading-relaxed font-normal"
          dangerouslySetInnerHTML={{
            __html: product.preview_html || product.description || '<p>Ringkasan preview dokumen ini sedang disiapkan oleh tim editorial Inpartner.</p>'
          }}
        />

        {/* Lock Overlay for Non-Owners */}
        {!product.is_owned && (
          <div className="mt-10 pt-8 border-t border-dashed border-slate-200">
            <div className="max-w-xl mx-auto bg-slate-50 rounded-2xl p-8 text-center border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-white shadow-xs border border-[#B2D1F0] text-[#1976D2] flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                Laporan Lengkap, Matriks Analisis & Dataset Terproteksi
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-supporting max-w-md mx-auto">
                Dapatkan akses tak terbatas ke seluruh bab pembahasan, tabel data mentah XLSX, serta ringkasan rekomendasi strategis untuk keputusan bisnis Anda.
              </p>
              <button
                onClick={handleBuyNow}
                className="px-6 py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Buka Akses Penuh Sekarang <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ================= 5. REFERENCES & CITATIONS ================= */}
      <section className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-[#1976D2]" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Referensi & Sumber Data Primer
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {product.sources_count || (Array.isArray(product.sources) ? product.sources.length : 0)} Rujukan Terverifikasi
          </span>
        </div>

        {product.methodology && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900 font-bold block mb-1">Catatan Metodologi Penelitian:</strong>
            <span className="font-supporting">{product.methodology}</span>
          </div>
        )}

        {Array.isArray(product?.sources) && product.sources.length > 0 ? (
          <div className="space-y-2.5">
            {product.sources.map((src: any, idx: number) => {
              const title = typeof src === 'string' ? src : (src.title || src.publisher || src.url || 'Rujukan Data');
              const url = typeof src === 'object' && src.url ? src.url : null;
              const publisher = typeof src === 'object' && src.publisher ? src.publisher : null;
              const publishedAt = typeof src === 'object' && src.published_at ? src.published_at : null;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:bg-slate-100/70 transition-colors flex items-start gap-3 text-xs"
                >
                  <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-[#1976D2] font-mono font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 leading-snug">
                      {publisher && <strong className="text-[#0C3B69] font-bold mr-1.5">{publisher}.</strong>}
                      <span>&ldquo;{title}&rdquo;</span>
                      {publishedAt && (
                        <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                          ({formattedDate(publishedAt) || publishedAt})
                        </span>
                      )}
                    </p>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#1976D2] hover:underline font-medium text-[11px] mt-1 break-all"
                      >
                        <span>Akses Publikasi Sumber Asli</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 leading-relaxed font-supporting">
            Dokumen intelijen ini dikompilasi secara eksklusif berdasarkan data primer internal dan kajian empiris langsung oleh dewan editor Inpartner.
          </div>
        )}
      </section>

      {/* ================= 6. PURCHASED BY & SOCIAL PROOF ================= */}
      <section className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1976D2]" />
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Pembeli & Pengguna Terverifikasi
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {product.buyers_count || product.sales_count || 0} Pengguna Aktif
          </span>
        </div>

        {Array.isArray(product?.recent_buyers) && product.recent_buyers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {product.recent_buyers.map((buyer: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center font-bold text-xs shrink-0">
                  {buyer.initials || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{buyer.name}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-supporting block">
                    {formattedDate(buyer.purchased_at) || 'Pembeli Terverifikasi'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Jadilah profesional pertama yang mengamankan hak akses intelijen ini untuk organisasi Anda.
            </p>
            <span className="text-[11px] text-slate-400 block font-supporting">
              Privasi pembeli selalu dijaga sesuai standar kepatuhan enterprise.
            </span>
          </div>
        )}
      </section>

      {/* ================= 7. PROFESSIONAL REVIEWS & EVALUATION ================= */}
      <section className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Ulasan & Evaluasi Profesional</h3>
          <p className="text-xs text-slate-500 mt-0.5">Penilaian kredibilitas data dari para pembaca dan analis terverifikasi.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Rating Summary Breakdown (Left) */}
          <div className="lg:col-span-4 p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs space-y-5">
            <div className="text-center space-y-1">
              <span className="text-5xl font-extrabold text-slate-900">{reviewsData.average_rating.toFixed(1)}</span>
              <div className="flex justify-center gap-1 text-amber-400 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(reviewsData.average_rating) ? 'fill-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500">Berdasarkan {reviewsData.total_reviews} ulasan terdaftar</p>
            </div>

            {/* Distribution bars */}
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              {[5, 4, 3, 2, 1].map((st) => {
                const count = reviewsData.distribution?.[st] || 0;
                const pct = reviewsData.total_reviews > 0 ? (count / reviewsData.total_reviews) * 100 : 0;
                return (
                  <div key={st} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-6 text-right font-semibold">{st} ★</span>
                    <div className="flex-1 h-2 bg-slate-200/80 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right font-mono text-[11px]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews List & Write Form (Right) */}
          <div className="lg:col-span-8 space-y-6">
            {isAuthenticated ? (
              <form onSubmit={handleSubmitReview} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#1976D2]" /> Tulis Evaluasi atau Feedback
                  </h4>
                  {product.is_owned && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Pembeli Terverifikasi
                    </span>
                  )}
                </div>

                {reviewMsg && (
                  <div className={`p-3 rounded-xl text-xs font-medium ${
                    reviewMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {reviewMsg.text}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rating Penilaian</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((st) => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setReviewForm({ ...reviewForm, rating: st })}
                        className="p-1 hover:scale-110 transition cursor-pointer"
                      >
                        <Star className={`w-5 h-5 ${st <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-800 ml-2">{reviewForm.rating} dari 5 Bintang</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Ulasan (Opsional)</label>
                  <input
                    type="text"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    placeholder="Contoh: Analisis komprehensif dan sangat relevan untuk rapat direksi"
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ulasan Anda *</label>
                  <textarea
                    required
                    rows={3}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Bagikan pandangan Anda mengenai ketepatan data, kualitas metodologi, dan nilai praktis riset ini..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingReview ? 'Mengirimkan...' : 'Kirim Ulasan'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-slate-500">Ingin memberikan evaluasi pada riset ini?</span>
                <Link to={`/login?redirect=/products/${slug}`} className="text-[#1976D2] font-semibold hover:underline">
                  Masuk untuk Menulis Ulasan &rarr;
                </Link>
              </div>
            )}

            {/* List Reviews */}
            {!Array.isArray(reviewsData?.reviews) || reviewsData.reviews.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500">
                Belum ada ulasan publik untuk laporan ini. Jadilah yang pertama memberikan penilaian!
              </div>
            ) : (
              <div className="space-y-3">
                {reviewsData.reviews.map((rev: any) => (
                  <div key={rev.id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center font-bold text-[10px]">
                          {rev.user_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-bold text-xs text-slate-900">{rev.user_name}</span>
                        {rev.is_verified_buyer && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Verified Purchaser
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star key={st} className={`w-3 h-3 ${st <= rev.rating ? 'fill-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>

                    {rev.title && <h5 className="font-bold text-xs text-slate-900">{rev.title}</h5>}
                    <p className="text-xs text-slate-600 leading-relaxed font-supporting">{rev.comment}</p>
                    <span className="text-[10px] text-slate-400 block">
                      {formattedDate(rev.created_at) || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= 8. RELATED PUBLICATIONS ================= */}
      {Array.isArray(related) && related.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#1976D2] uppercase tracking-wider block mb-0.5">
                Rekomendasi Relevan
              </span>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                Dokumen Riset & Intelijen Terkait
              </h3>
            </div>
            <Link to="/products" className="text-xs font-semibold text-[#1976D2] hover:underline flex items-center gap-1">
              <span>Katalog Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((item: any) => (
              <ProductCard key={item.id} product={item} onAddToCart={handleAddToCart} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;