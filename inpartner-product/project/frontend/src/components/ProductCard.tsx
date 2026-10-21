import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, BookOpen, ArrowRight, Eye, Check } from 'lucide-react';
import { Badge } from '@/components/lightswind/badge';
import BookCover from './BookCover';
import { formatRupiah, formatDate } from '@/utils/format';

interface ProductCardProps {
  product: any;
  onAddToCart?: (product: any) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const navigate = useNavigate();
  if (!product) return null;

  // Rating based on product data or fallback
  const rating = product.rating || (4.5 + ((Number(product.id || 1) * 3) % 6) / 10).toFixed(1);
  const reviewsCount = product.reviews_count || (12 + (Number(product.id || 1) * 17) % 88);

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

  return (
    <div className="group relative flex flex-col rounded-[24px] bg-white border border-zinc-200/80 p-3.5 shadow-2xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 h-full">
      {/* Product Image / Cover Container */}
      <Link
        to={`/products/${product.slug}`}
        className="block relative aspect-square w-full rounded-[18px] bg-zinc-100/80 overflow-hidden p-4 flex items-center justify-center group-hover:bg-zinc-200/60 transition-colors"
      >
        {/* Category / Type Tag top right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="bg-white/95 backdrop-blur-md text-zinc-700 text-[10px] font-semibold tracking-tight px-2.5 py-0.5 rounded-full border border-zinc-200/80 shadow-2xs">
            {product.category?.name || product.type_label || 'Artikel'}
          </span>
        </div>

        {/* Free / Discount tag top left */}
        {product.is_free ? (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
              Gratis
            </span>
          </div>
        ) : product.discount_percent > 0 ? (
          <div className="absolute top-2.5 left-2.5 z-10">
            <span className="bg-rose-600 text-white font-bold text-[10px] tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
              -{product.discount_percent}%
            </span>
          </div>
        ) : null}

        {/* Book Cover Container centered in soft box */}
        <div className="w-2/3 h-full max-h-[85%] shadow-md rounded-lg overflow-hidden group-hover:scale-105 transition-transform duration-300">
          <BookCover product={product} rounded="rounded-lg" />
        </div>
      </Link>

      {/* Product Details Section */}
      <div className="flex flex-col flex-1 pt-3.5 px-1 pb-1">
        {/* Title */}
        <Link to={`/products/${product.slug}`} className="block mb-1">
          <h3 className="text-sm font-bold text-zinc-900 leading-snug line-clamp-2 tracking-tight group-hover:text-zinc-700 transition-colors">
            {product.title}
          </h3>
        </Link>

        {/* Author / Publisher */}
        {product.author && (
          <p className="text-[11px] text-zinc-400 mb-2 truncate">
            {product.author.name}
          </p>
        )}

        {/* Rating & Price Row */}
        <div className="flex items-center justify-between text-xs mb-3.5 mt-auto pt-1 border-t border-zinc-100">
          {/* Rating */}
          <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-zinc-800">{rating}</span>
            <span className="text-zinc-400 text-[10px]">({reviewsCount})</span>
          </div>

          {/* Price */}
          <div className="text-right">
            {product.is_free ? (
              <span className="text-xs font-black text-emerald-600 tracking-tight">Gratis</span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-black text-zinc-900 tracking-tight">
                  {formatRupiah(product.final_price ?? product.price)}
                </span>
                {product.discount_percent > 0 && (
                  <span className="text-[9px] text-zinc-400 line-through">
                    {formatRupiah(product.price)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          {product.is_owned ? (
            <Link
              to={`/library/${product.slug}/read`}
              className="w-full py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Baca Sekarang</span>
            </Link>
          ) : product.is_free ? (
            <button
              type="button"
              onClick={handleBuyNow}
              className="w-full py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-full transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Akses Gratis</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-2 px-2.5 text-[11px] font-semibold border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 hover:border-zinc-300 rounded-full transition-all flex items-center justify-center gap-1 text-center"
              >
                <ShoppingCart className="w-3 h-3 text-zinc-500" />
                <span>+ Keranjang</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="flex-1 py-2 px-2.5 text-[11px] font-bold text-white bg-zinc-900 hover:bg-black rounded-full transition-all flex items-center justify-center gap-1 shadow-2xs text-center"
              >
                <span>Beli Sekarang</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;

