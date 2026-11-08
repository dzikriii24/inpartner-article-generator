import React, { useState } from 'react';

interface BookCoverProps {
  product: any;
  compact?: boolean;
  rounded?: string;
}

const BRAND_PALETTES = [
  'from-[#F0F6FC] via-[#D1E4F6]/50 to-white border-[#B2D1F0]',
  'from-slate-50 via-slate-100/70 to-white border-slate-200',
  'from-sky-50/80 via-[#D1E4F6]/40 to-white border-sky-200',
  'from-emerald-50/70 via-teal-50/40 to-white border-emerald-200',
  'from-[#D1E4F6]/40 via-[#F0F6FC] to-white border-[#B2D1F0]',
];

export const BookCover: React.FC<BookCoverProps> = ({
  product,
  compact = false,
  rounded = 'rounded-2xl'
}) => {
  const [failed, setFailed] = useState(false);

  const seed = Number(product?.id) || String(product?.title || '').length;
  const palette = BRAND_PALETTES[seed % BRAND_PALETTES.length];

  if (product?.cover_url && !failed) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${rounded}`}>
        <img
          src={product.cover_url}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden border ${rounded}`}>
      <div
        className={`w-full h-full flex flex-col justify-between bg-gradient-to-br text-slate-900 relative ${palette} ${
          compact ? 'p-3' : 'p-5'
        }`}
      >
        {/* Soft subtle light highlights */}
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/70 pointer-events-none"></div>
        <div className="absolute -left-8 bottom-6 w-32 h-32 rounded-full bg-white/50 pointer-events-none"></div>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1976D2]/20"></div>

        <span
          className={`relative font-semibold uppercase tracking-wider text-[#1976D2] ${
            compact ? 'text-[8px]' : 'text-[10px]'
          }`}
        >
          {product?.type_label || 'Executive Brief'}
        </span>
        <h4
          className={`relative font-bold leading-snug line-clamp-3 text-slate-900 tracking-tight ${
            compact ? 'text-xs' : 'text-base sm:text-lg'
          }`}
        >
          {product?.title || 'Judul Dokumen Riset'}
        </h4>
        <div className="relative flex items-center justify-between text-slate-500 font-medium pt-1 border-t border-slate-200/60">
          <span className={`truncate ${compact ? 'text-[8px]' : 'text-[11px]'}`}>
            {product?.author?.name || 'Inpartner Research'}
          </span>
          <span className="font-wordmark font-extrabold text-[9px] text-[#1976D2]">IN</span>
        </div>
      </div>
    </div>
  );
};

export default BookCover;
