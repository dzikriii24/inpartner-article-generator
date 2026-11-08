import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Zap, AlertCircle, BookOpen, Building2, CreditCard, ArrowLeft } from 'lucide-react';
import api from '@/services/api';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';
import { formatRupiah } from '@/utils/format';

export const Checkout: React.FC = () => {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [alreadyOwned, setAlreadyOwned] = useState(false);

  // Optional corporate invoice info
  const [corporateName, setCorporateName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');

  const handleProcessOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    setErrorMessage(null);
    setAlreadyOwned(false);

    try {
      // Safely extract product IDs
      const productIds = items
        .map((i: any) => Number(i.product_id || i.product?.id || (typeof i.id === 'number' && i.product ? i.product.id : i.id)))
        .filter((id: number) => !isNaN(id) && id > 0);

      const payload: any = {
        phone: phone || undefined,
        corporate_name: corporateName || undefined,
        tax_id: taxId || undefined
      };

      if (productIds.length > 0) {
        payload.product_ids = productIds;
      }

      const res = await api.post('/checkout', payload);
      await clearCart();

      const orderNumber = res.data.order?.order_number;
      const paymentStatus = res.data.order?.payment_status || res.data.order?.status;

      if (paymentStatus === 'paid') {
        navigate(`/orders/${orderNumber}`);
      } else {
        // Direct redirect to payment simulator
        navigate(`/payment/simulator/${orderNumber}`);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const isOwned = err.response?.data?.already_owned || false;
      setAlreadyOwned(isOwned);

      const msg = err.response?.data?.message ||
                  err.response?.data?.errors?.products?.[0] ||
                  err.response?.data?.errors?.['product_ids.0']?.[0] ||
                  err.response?.data?.errors?.product_ids?.[0] ||
                  'Gagal memproses pembayaran. Silakan periksa kembali daftar belanja Anda.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center border border-[#B2D1F0]">
          <CreditCard className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Tidak Ada Dokumen untuk Di-checkout</h2>
          <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
            Keranjang belanja Anda kosong. Silakan pilih publikasi riset atau analisis sektor dari katalog Inpartner.
          </p>
        </div>
        <Link to="/products">
          <Button className="bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs rounded-xl px-6 py-2.5 shadow-xs">
            Jelajahi Katalog Riset
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 sm:py-12">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Konfirmasi Checkout</h1>
          <p className="text-xs text-slate-500 mt-1 font-supporting">Periksa pesanan dokumen riset Anda sebelum memproses pembayaran resmi.</p>
        </div>
        <Link to="/cart" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1976D2] hover:text-[#1562AF]">
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Keranjang</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="font-bold text-rose-900">{errorMessage}</p>
            {alreadyOwned && (
              <div>
                <Link to="/library">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Buka Koleksi Library Saya</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Items & Invoicing Details */}
        <div className="md:col-span-7 space-y-6">
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>Daftar Riset Terpilih</span>
              <span className="text-xs text-[#1976D2] font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                {items.length} item
              </span>
            </h3>
            <div className="space-y-3">
              {items.map((item) => {
                const prod = item.product || {};
                const price = prod.final_price ?? prod.price ?? 0;

                return (
                  <div key={item.id} className="flex items-center gap-3.5 py-2.5 border-b border-slate-100 last:border-0">
                    <div className="w-12 aspect-[3/4] shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center text-[10px]">
                      {prod.cover_url ? (
                        <img src={prod.cover_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <BookCover product={prod} compact rounded="rounded-xl" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <h4 className="font-bold text-slate-900 truncate">{prod.title || 'Laporan Riset Inpartner'}</h4>
                      <p className="text-[11px] text-slate-400 font-supporting mt-0.5">
                        {prod.type_label || prod.type || 'Research'} &bull; {prod.publisher || 'Inpartner Publishing'}
                      </p>
                    </div>
                    <div className="text-xs font-black text-slate-900 shrink-0">
                      {formatRupiah(price)}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Optional Invoicing info */}
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-3xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#1976D2]" />
              <span>Detail Faktur Pajak Korporasi (Opsional)</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nama Perusahaan / Institusi</label>
                <input
                  type="text"
                  value={corporateName}
                  onChange={(e) => setCorporateName(e.target.value)}
                  placeholder="PT Inovasi Finansial Nusantara"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor Pokok Wajib Pajak (NPWP)</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="01.234.567.8-901.000"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nomor Kontak WhatsApp / HP</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-supporting">
                Faktur resmi dan bukti pembayaran terkirim otomatis ke email akun Anda setelah transaksi selesai.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Billing summary & Proceed */}
        <div className="md:col-span-5 space-y-4">
          <Card className="p-6 bg-white border border-slate-200 shadow-xs rounded-3xl space-y-6">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Ringkasan Tagihan</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Harga</span>
                <span className="font-bold text-slate-900">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biaya Transaksi</span>
                <span className="font-bold text-emerald-600">Rp 0 (Gratis)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>PPN 11% (Termasuk)</span>
                <span className="font-semibold text-slate-500">Rp {Math.round(subtotal * 0.11 / 1.11).toLocaleString('id-ID')}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-extrabold text-slate-900">Total Pembayaran</span>
                <span className="text-xl font-black text-[#1976D2]">{formatRupiah(subtotal)}</span>
              </div>
            </div>

            <Button
              size="lg"
              onClick={handleProcessOrder}
              disabled={submitting || items.length === 0}
              className="w-full bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-bold rounded-xl text-xs py-3.5 gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all"
            >
              <Zap className="w-4 h-4" />
              {submitting ? 'Memproses Pesanan...' : 'Bayar Sekarang'}
            </Button>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Transaksi Terenkripsi & Akses Reader Instan
              </p>
              <p className="text-[10px] text-slate-400 text-center font-supporting">
                Setelah pembayaran selesai, dokumen otomatis masuk ke Library Anda dan siap dibaca online maupun diunduh format aslinya.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;