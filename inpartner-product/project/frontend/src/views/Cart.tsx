import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck, CreditCard, Sparkles, BookOpen, Clock, Award, FileCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';

export const Cart: React.FC = () => {
  const { items, itemCount, subtotal, removeFromCart, clearCart } = useCart();
  const { formatPrice, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-8 sm:py-12">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Keranjang Pembelian
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-supporting">
            {itemCount} dokumen riset & publikasi terpilih siap untuk diproses ke akun Anda.
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => clearCart()}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kosongkan Semua</span>
          </button>
        )}
      </div>

      {items.length === 0 ? (
        /* Empty State */
        <Card className="p-12 sm:p-16 text-center bg-white border border-slate-200 shadow-xs rounded-3xl space-y-5 max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center shadow-xs">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-slate-900">Keranjang Belanja Anda Kosong</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-supporting leading-relaxed">
              Belum ada publikasi riset yang ditambahkan. Jelajahi laporan analitik industri, datasets Excel, dan paper strategis kami untuk melengkapi keputusan bisnis Anda.
            </p>
          </div>
          <div className="pt-3 flex flex-wrap justify-center gap-3">
            <Link to="/products">
              <Button className="bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-bold text-xs rounded-xl px-6 py-3 shadow-md gap-2">
                <BookOpen className="w-4 h-4" /> Jelajahi Seluruh Katalog
              </Button>
            </Link>
            <Link to="/thematic-research">
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl px-5 py-3">
                Riset Tematik
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Cart Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Item List */}
          <div className="lg:col-span-8 space-y-4">
            <div className="space-y-3">
              {items.map((item) => {
                const prod = item.product || {};
                const targetDeleteId = item.product_id || prod.id || item.id;
                const price = prod.final_price ?? prod.price ?? 0;
                const originalPrice = prod.price ?? 0;
                const hasDiscount = prod.final_price && prod.sale_price && prod.final_price < originalPrice;

                return (
                  <Card
                    key={item.id}
                    className="p-4 sm:p-5 bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-[#B2D1F0] transition-colors group"
                  >
                    {/* Cover Thumbnail */}
                    <div className="w-20 aspect-[3/4] shrink-0 rounded-xl overflow-hidden border border-slate-100 shadow-2xs bg-slate-50">
                      <BookCover product={prod} compact rounded="rounded-xl" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#1562AF] border border-[#B2D1F0]">
                          {prod.type_label || prod.type || 'Riset'}
                        </span>
                        {prod.category && (
                          <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {prod.category.name || prod.category}
                          </span>
                        )}
                        {prod.reading_time && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-supporting">
                            <Clock className="w-3 h-3 text-[#1976D2]" /> {prod.reading_time} menit
                          </span>
                        )}
                      </div>

                      <Link
                        to={`/products/${prod.slug || ''}`}
                        className="font-bold text-slate-900 text-sm sm:text-base hover:text-[#1976D2] line-clamp-2 transition-colors block"
                      >
                        {prod.title || item.product_title || 'Publikasi Riset'}
                      </Link>

                      <p className="text-[11px] text-slate-500 font-supporting line-clamp-1">
                        Penerbit: <span className="font-semibold text-slate-700">{prod.publisher || 'Inpartner Publishing'}</span>
                        {prod.senior_partner && <span> &bull; Analis: {prod.senior_partner}</span>}
                      </p>
                    </div>

                    {/* Price & Delete */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 gap-2 shrink-0">
                      <div className="text-left sm:text-right">
                        {hasDiscount && (
                          <div className="text-[10px] text-slate-400 line-through">
                            {formatPrice(originalPrice)}
                          </div>
                        )}
                        <div className="text-sm sm:text-base font-black text-slate-900">
                          {formatPrice(price)}
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(targetDeleteId)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus dari keranjang"
                        aria-label="Hapus item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Bottom shopping navigation */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <Link
                to="/products"
                className="font-bold text-[#1976D2] hover:text-[#1562AF] hover:underline flex items-center gap-1.5"
              >
                <span>&larr; Lanjutkan Memilih Publikasi Lain</span>
              </Link>
              <span className="text-slate-400 text-[11px]">
                Seluruh produk berlisensi korporat dengan hak akses digital permanen.
              </span>
            </div>
          </div>

          {/* Checkout Summary Card */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-3xl space-y-6">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>Ringkasan Pesanan</span>
                <span className="text-xs font-semibold text-[#1976D2] bg-blue-50 px-2 py-0.5 rounded-full">
                  {itemCount} item
                </span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Riset</span>
                  <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Akses Platform</span>
                  <span className="font-bold text-emerald-600">Gratis (Rp 0)</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Faktur Pajak & PPN (11%)</span>
                  <span className="font-medium text-slate-500">Termasuk di harga</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-900 text-sm">Total Pembayaran</span>
                  <span className="text-xl font-black text-[#1976D2]">{formatPrice(subtotal)}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <Button
                  size="lg"
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-bold rounded-xl text-xs py-3.5 gap-2 shadow-md cursor-pointer transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>

                <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 font-medium pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Transaksi Aman & Akses Reader Instan</span>
                </p>
              </div>
            </Card>

            {/* Corporate Guarantee Card */}
            <Card className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200 rounded-3xl space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#1976D2]" />
                <span>Keuntungan Pembelian Resmi</span>
              </h4>
              <ul className="space-y-2 text-[11px] text-slate-600 font-supporting">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">&check;</span>
                  <span>Akses Digital Reader interaktif & file download PDF asli tanpa proteksi DRM berbelit.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">&check;</span>
                  <span>Termasuk lampiran dataset Excel mentah (khusus publikasi Data Series).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">&check;</span>
                  <span>Faktur dan bukti transaksi terkirim otomatis ke email korporat Anda.</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
