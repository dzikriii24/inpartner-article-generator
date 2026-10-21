import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, FileText, Link as LinkIcon, Eye, CheckCircle2, Lock, ShoppingCart, Zap, BookOpen, ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/lightswind/button';
import { Badge } from '@/components/lightswind/badge';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';
import ProductCard from '@/components/ProductCard';
import { formatRupiah, initials } from '@/utils/format';

export const ProductDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchProduct = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await api.get(`/products/${slug}`);
      setProduct(res.data.product);
      setRelated(res.data.related || []);
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
      const res = await api.post('/checkout', { product_ids: [product.id] });
      navigate(`/orders/${res.data.order.order_number}`);
    } catch (err: any) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-24 text-center text-zinc-400 space-y-3">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin text-zinc-900" />
        <p className="text-sm font-medium">Memuat detail artikel...</p>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-12 py-4">
      {/* Top Hero / Grid Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Cover Preview Card */}
        <div className="md:col-span-4 space-y-4">
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-md border border-zinc-200/80 bg-white group">
            <BookCover product={product} rounded="rounded-2xl" />
            <div className="absolute top-3 left-3 z-10">
              <Badge variant="outline" className="bg-white/90 backdrop-blur-md border-white/60 text-[10px] font-semibold tracking-wide text-zinc-800 shadow-2xs">
                {product.type_label || 'Artikel'}
              </Badge>
            </div>
          </div>
          {product.cover_caption && (
            <p className="text-xs text-zinc-400 text-center italic font-serif px-2">
              {product.cover_caption}
            </p>
          )}
        </div>

        {/* Right Column: Title, Author, Purchase CTA Box */}
        <div className="md:col-span-8 space-y-6">
          {/* Metadata tags */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-zinc-500">
            {product.category && (
              <Link
                to={`/products?category=${product.category.slug}`}
                className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg transition-colors font-semibold"
              >
                {product.category.name}
              </Link>
            )}
            {product.reading_time && (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <Clock className="w-3.5 h-3.5 text-zinc-400" /> {product.reading_time} mnt baca
              </span>
            )}
            {product.word_count && (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <FileText className="w-3.5 h-3.5 text-zinc-400" /> {product.word_count} kata
              </span>
            )}
            {product.sources_count && (
              <span className="flex items-center gap-1.5 text-zinc-500">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-400" /> {product.sources_count} referensi
              </span>
            )}
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-900 tracking-tight leading-[1.15]">
              {product.title}
            </h1>
            {product.subtitle && (
              <p className="text-zinc-600 font-serif text-base sm:text-lg leading-relaxed italic border-l-2 border-zinc-300 pl-4">
                {product.subtitle}
              </p>
            )}
          </div>

          {/* Author Card */}
          {product.author && (
            <Link
              to={`/products?author=${product.author.slug}`}
              className="inline-flex items-center gap-3.5 p-3 rounded-2xl border border-zinc-200/80 bg-white/80 hover:bg-zinc-100 transition-all text-xs"
            >
              <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {product.author.photo_url ? (
                  <img src={product.author.photo_url} alt={product.author.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  initials(product.author.name)
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Penulis & Analyst</div>
                <div className="text-sm font-bold text-zinc-900">{product.author.name}</div>
              </div>
            </Link>
          )}

          {/* Purchasing Box */}
          <Card className="p-6 bg-white/80 backdrop-blur-lg border border-zinc-200/80 shadow-md rounded-2xl space-y-6">
            <div className="flex items-baseline gap-3">
              {product.is_free ? (
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">GRATIS</span>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
                    {formatRupiah(product.final_price ?? product.price)}
                  </span>
                  {product.discount_percent > 0 && (
                    <>
                      <span className="text-sm font-medium text-zinc-400 line-through">
                        {formatRupiah(product.price)}
                      </span>
                      <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs font-semibold px-2 py-0.5">
                        Hemat {product.discount_percent}%
                      </Badge>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {product.is_owned ? (
                <Link to={`/library/${product.slug}/read`} className="flex-1">
                  <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm gap-2">
                    <BookOpen className="w-4 h-4" /> Baca di Library
                  </Button>
                </Link>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={handleBuyNow}
                    disabled={submitting}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-sm gap-2 shadow-xs"
                  >
                    <Zap className="w-4 h-4" />
                    {submitting ? 'Memproses...' : 'Beli Sekarang'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={submitting}
                    className="bg-white hover:bg-zinc-100 text-zinc-800 font-semibold border-zinc-200 rounded-xl text-sm gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" /> Keranjang
                  </Button>
                </>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" /> Transaksi aman via Midtrans · Langsung tersedia setelah pembayaran
            </p>
          </Card>

          {/* Value proposition bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-medium text-zinc-600 pt-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Akses Reader Online 24/7
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Hak Akses Selamanya
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Responsif Seluler & Desktop
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Bebas Unduh PDF Jika Tersedia
            </div>
          </div>
        </div>
      </div>

      {/* Article Preview / HTML Section */}
      <Card className="p-8 sm:p-12 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-3xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200/60 pb-5">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-800" /> Ringkasan & Teaser Artikel
          </h2>
          <Badge variant="outline" className="bg-zinc-100 text-zinc-800 border-zinc-300 font-bold text-[10px] tracking-wider">
            FREE PREVIEW
          </Badge>
        </div>

        {/* Prose preview content */}
        <div
          className="prose prose-zinc max-w-none text-zinc-700 text-base leading-relaxed font-normal"
          dangerouslySetInnerHTML={{
            __html: product.preview_html || product.description || '<p>Tidak ada ringkasan preview tersedia.</p>'
          }}
        />

        {/* Lock Overlay for Non-Owners */}
        {!product.is_owned && (
          <div className="mt-10 pt-8 border-t border-dashed border-zinc-200">
            <div className="max-w-md mx-auto bg-zinc-50/80 rounded-2xl p-6 text-center border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="w-12 h-12 mx-auto rounded-xl bg-white shadow-xs border border-zinc-200 text-zinc-800 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-zinc-900">Konten Eksklusif Terkunci</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Sisa analisis data, pembahasan riset, dan rekomendasi publikasi dilindungi. Beli artikel ini untuk membuka akses penuh tanpa batas waktu.
              </p>
              <Button onClick={handleBuyNow} className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs px-6 py-2 rounded-xl">
                Buka Akses Lengkap <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="space-y-6 pt-6 border-t border-zinc-200/60">
          <h3 className="text-xl font-bold text-zinc-900 tracking-tight">Artikel & Publikasi Terkait</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
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
