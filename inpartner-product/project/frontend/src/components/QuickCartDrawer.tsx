import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, X, Trash2, ArrowRight, ShieldCheck, CreditCard, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';

export const QuickCartDrawer: React.FC = () => {
  const { items, itemCount, subtotal, removeFromCart } = useCart();
  const { formatPrice, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Don't show on checkout, cart, or payment pages
  const isHiddenPage = location.pathname.startsWith('/checkout') || 
                       location.pathname.startsWith('/cart') || 
                       location.pathname.startsWith('/payment');

  if (isHiddenPage) return null;

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Buka Keranjang Belanja"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 group cursor-pointer border-2 border-white"
      >
        <div className="relative">
          <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {itemCount > 0 && (
            <span className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-white animate-in zoom-in-50">
              {itemCount}
            </span>
          )}
        </div>
        <span className="text-xs font-bold hidden sm:inline-block">
          {itemCount > 0 ? `${itemCount} Riset di Keranjang` : 'Keranjang'}
        </span>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Drawer Panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-[#1976D2]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Keranjang Belanja
              </h2>
              <p className="text-[11px] text-slate-500 font-supporting">
                {itemCount} dokumen riset dipilih
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#1976D2] flex items-center justify-center">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <div className="max-w-xs mx-auto">
                <h3 className="font-bold text-slate-900 text-sm">Keranjang Anda Masih Kosong</h3>
                <p className="text-xs text-slate-500 mt-1 font-supporting">
                  Pilih riset tematik, data series, atau kajian sektor dari katalog kami untuk melengkapi analisis Anda.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/products');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span>Jelajahi Katalog Riset</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            items.map((item) => {
              const p = item.product || {};
              const price = p.final_price || p.price || 0;
              const targetDeleteId = item.product_id || p.id || item.id;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#B2D1F0] transition-colors flex gap-3 group relative shadow-xs"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-18 rounded-xl bg-[#D1E4F6]/30 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-[10px]">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-[#1976D2]">PDF</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          to={`/products/${p.slug || ''}`}
                          onClick={() => setIsOpen(false)}
                          className="font-bold text-xs text-slate-900 hover:text-[#1976D2] line-clamp-2 transition-colors"
                        >
                          {p.title || item.product_title || 'Publikasi Riset'}
                        </Link>
                        <button
                          onClick={() => removeFromCart(targetDeleteId)}
                          className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer shrink-0"
                          title="Hapus dari keranjang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-supporting mt-0.5">
                        {p.publisher || 'Inpartner Publishing'}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#1562AF] bg-blue-50 px-1.5 py-0.2 rounded border border-[#B2D1F0]">
                        {p.type_label || p.type || 'Research'}
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatPrice(price)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Subtotal Pembelian</span>
              <span className="text-base font-black text-slate-900">{formatPrice(subtotal)}</span>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/checkout');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Lanjut ke Pembayaran</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/cart');
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors flex items-center justify-center cursor-pointer"
              >
                <span>Lihat Keranjang Lengkap</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-supporting pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Akses Reader Instan & Invoice Pajak Resmi</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default QuickCartDrawer;

