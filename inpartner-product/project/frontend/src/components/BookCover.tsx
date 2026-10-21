import React, { useState } from 'react';

interface BookCoverProps {
  product: any;
  compact?: boolean;
  rounded?: string;
}

const LIGHT_PALETTES = [
  'from-blue-50/90 via-indigo-50/80 to-blue-100/70 border-blue-200/60',
  'from-emerald-50/90 via-teal-50/80 to-emerald-100/70 border-emerald-200/60',
  'from-sky-50/90 via-cyan-50/80 to-sky-100/70 border-sky-200/60',
  'from-amber-50/90 via-orange-50/80 to-amber-100/70 border-amber-200/60',
  'from-zinc-100/90 via-stone-50/80 to-slate-200/70 border-zinc-200/80',
  'from-violet-50/90 via-purple-50/80 to-indigo-100/70 border-violet-200/60',
  'from-slate-100/90 via-zinc-100/80 to-slate-200/70 border-slate-200/80',
  'from-rose-50/90 via-pink-50/80 to-rose-100/70 border-rose-200/60'
];

export const BookCover: React.FC<BookCoverProps> = ({
  product,
  compact = false,
  rounded = 'rounded-2xl'
}) => {
  const [failed, setFailed] = useState(false);

  const seed = Number(product?.id) || String(product?.title || '').length;
  const palette = LIGHT_PALETTES[seed % LIGHT_PALETTES.length];

  if (product?.cover_url && !failed) {
    return (
      <div className={`relative w-full h-full overflow-hidden ${rounded}`}>
        <img
          src={product.cover_url}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden border ${rounded}`}>
      <div
        className={`w-full h-full flex flex-col justify-between bg-gradient-to-br text-zinc-900 relative ${palette} ${
          compact ? 'p-3' : 'p-5'
        }`}
      >
        {/* Soft subtle light highlights */}
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/60 backdrop-blur-xs pointer-events-none"></div>
        <div className="absolute -left-8 bottom-6 w-32 h-32 rounded-full bg-white/40 backdrop-blur-xs pointer-events-none"></div>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-900/10"></div>

        <span
          className={`relative font-semibold uppercase tracking-widest text-zinc-500 ${
            compact ? 'text-[8px]' : 'text-[10px]'
          }`}
        >
          {product?.type_label || 'Artikel'}
        </span>
        <h4
          className={`relative font-bold leading-tight line-clamp-3 text-zinc-900 tracking-tight ${
            compact ? 'text-xs' : 'text-base sm:text-lg'
          }`}
        >
          {product?.title || 'Judul Artikel'}
        </h4>
        <span
          className={`relative font-medium text-zinc-500 truncate ${
            compact ? 'text-[8px]' : 'text-[11px]'
          }`}
        >
          {product?.author?.name || 'Inpartner Editorial'}
        </span>
      </div>
    </div>
  );
};

export default BookCover;
