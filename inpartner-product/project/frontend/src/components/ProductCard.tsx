import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, BookOpen, Heart, FileSpreadsheet, ShieldCheck, ArrowRight } from 'lucide-react';
import BookCover from './BookCover';
import { useWishlist } from '@/context/WishlistContext';
import { useLanguage } from '@/context/LanguageContext';

interface ProductCardProps {
  product: any;
  onAddToCart?: (product: any) => void;
  showPrice?: boolean; // When false (e.g. on homepage), hide price tags completely
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, showPrice = true }) => {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { t, formatPrice } = useLanguage();

  if (!product) return null;

  const wishlisted = isWishlisted(product.id);
  const hasRealRating = Boolean(product.rating && product.reviews_count > 0);
  const rating = hasRealRating ? Number(product.rating).toFixed(1) : null;
  const reviewsCount = product.reviews_count || 0;

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(product.id);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.is_owned) {
      navigate(`/library/${product.slug}/read`);
    } else {
      if (onAddToCart) onAddToCart(product);
      navigate('/cart');
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) onAddToCart(product);
  };

  const typeLabels: Record<string, string> = {
    thematic_research: 'Thematic Research',
    insight: 'Sector Insight',
    data: 'Data Series',
    custom_analysis: 'Custom Analysis',
    article: 'Research Brief',
    ebook: 'Executive Report',
    journal: 'Journal Publication',
    research_paper: 'Whitepaper',
  };
  const displayType = typeLabels[product.type] || product.type_label || 'Executive Brief';

  return (
    <div className="group relative flex flex-col rounded-2xl bg-white border border-slate-200 p-4 shadow-xs hover:shadow-card hover:border-[#B2D1F0] hover:-translate-y-0.5 transition-all duration-200 h-full">
      {/* Cover Container */}
      <Link
        to={`/products/${product.slug}`}
        className="block relative aspect-4/3 w-full rounded-xl bg-[#F8FAFC] border border-slate-100 overflow-hidden p-3 flex items-center justify-center group-hover:bg-[#D1E4F6]/20 transition-colors"
      >
        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap max-w-[80%]">
          {product.is_free ? (
            <span className="bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
              {t('catalog.free_badge', 'Gratis')}
            </span>
          ) : showPrice && product.discount_percent > 0 ? (
            <span className="bg-[#DC2626] text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow-xs">
              -{product.discount_percent}%
            </span>
          ) : (
            <span className="bg-[#1976D2] text-white font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
              {product.access_level === 'enterprise' ? 'Enterprise' : product.access_level === 'professional' ? 'Pro' : 'Verified'}
            </span>
          )}

          {product.has_excel && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <FileSpreadsheet className="w-2.5 h-2.5" /> XLS
            </span>
          )}
        </div>

        {/* Wishlist Button top right */}
        <button
          type="button"
          onClick={handleWishlistToggle}
          className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-xl backdrop-blur-md transition-all shadow-xs cursor-pointer ${
            wishlisted
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-white/90 text-slate-400 hover:text-rose-600 hover:bg-white border border-slate-200'
          }`}
          title={wishlisted ? 'Hapus dari Wishlist' : 'Simpan ke Wishlist'}
        >
          <Heart className={`w-3.5 h-3.5 ${wishlisted ? 'fill-rose-600' : ''}`} />
        </button>

        {/* Book / Report Cover */}
        <div className="w-2/3 h-full max-h-[90%] shadow-xs rounded-lg overflow-hidden group-hover:scale-105 transition-transform duration-200">
          <BookCover product={product} rounded="rounded-lg" />
        </div>
      </Link>

      {/* Details Section */}
      <div className="flex flex-col flex-1 pt-3.5 px-0.5 pb-0.5">
        {/* Category & Type meta */}
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mb-1.5 font-medium">
          <span className="text-[#1976D2] font-semibold tracking-tight uppercase truncate">
            {product.category?.name || 'Cross-Sector'}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#F8FAFC] border border-slate-200 text-slate-600 shrink-0 font-medium text-[10px]">
            {displayType}
          </span>
        </div>

        {/* Title */}
        <Link to={`/products/${product.slug}`} className="block mb-1.5">
          <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 tracking-tight group-hover:text-[#1976D2] transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Author / Senior Partner */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2 truncate font-supporting">
          <span>{product.author?.name || 'Inpartner Research Lab'}</span>
          {(product.author?.is_senior_partner || product.senior_partner) && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0]">
              <ShieldCheck className="w-2.5 h-2.5 text-[#1976D2]" /> Partner
            </span>
          )}
        </div>

        {/* Rating & Meta / Price Row */}
        <div className="flex items-center justify-between text-xs mb-3 mt-auto pt-2.5 border-t border-slate-100">
          {/* Rating or Trust Metric */}
          {hasRealRating ? (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-bold text-slate-800">{rating}</span>
              <span className="text-[10px] text-slate-400 font-supporting">({reviewsCount})</span>
            </div>
          ) : product.sales_count > 0 ? (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-supporting">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{product.sales_count} Pembaca</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
              <ShieldCheck className="w-3 h-3 text-[#1976D2]" />
              <span>Terverifikasi</span>
            </div>
          )}

          {/* If showPrice is true: Display Price. If false (homepage): Display reading time badge instead! */}
          {showPrice ? (
            <div className="text-right">
              {product.is_free ? (
                <span className="text-xs font-bold text-emerald-600">{t('catalog.free_badge', 'Gratis')}</span>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                    {formatPrice(product.final_price ?? product.price)}
                  </span>
                  {product.discount_percent > 0 && (
                    <span className="text-[10px] text-slate-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-supporting">
                {product.reading_time || 5} {t('home.reading_time', 'menit')}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* When on Homepage (showPrice === false): provide clean Detail CTA without commercial price buttons */}
          {!showPrice ? (
            <Link
              to={`/products/${product.slug}`}
              className="w-full py-2 px-3 text-xs font-semibold text-[#1976D2] hover:text-white bg-[#D1E4F6]/50 hover:bg-[#1976D2] border border-[#B2D1F0] hover:border-transparent rounded-xl transition-all flex items-center justify-center gap-1.5 group/btn cursor-pointer"
            >
              <span>{t('home.view_detail', 'Lihat Dokumen')}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          ) : product.is_owned ? (
            <Link
              to={`/library/${product.slug}/read`}
              className="w-full py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('home.read_now', 'Buka di Library')}</span>
            </Link>
          ) : product.is_free ? (
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{t('catalog.free_badge', 'Akses Gratis')}</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-2 px-2.5 text-[11px] font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-[#B2D1F0] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-slate-400" />
                <span>+ {t('nav.cart', 'Keranjang')}</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 py-2 px-2.5 text-[11px] font-semibold text-white bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] rounded-xl transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <span>{t('detail.buy_now', 'Beli Akses')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
