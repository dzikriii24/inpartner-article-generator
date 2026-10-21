import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap } from 'lucide-react';
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

  const handleProcessOrder = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const productIds = items.map((i) => i.product_id);
      const res = await api.post('/checkout', { product_ids: productIds });
      await clearCart();
      navigate(`/orders/${res.data.order.order_number}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="border-b border-zinc-200/60 pb-4">
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Konfirmasi Checkout</h1>
        <p className="text-xs text-zinc-500 mt-1">Periksa pesanan artikel sebelum memproses pembayaran.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-7 space-y-4">
          <Card className="p-6 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">Daftar Produk ({items.length})</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                  <div className="w-12 aspect-[3/4] shrink-0 rounded overflow-hidden">
                    <BookCover product={item.product} compact rounded="rounded-none" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <h4 className="font-bold text-zinc-900 truncate">{item.product?.title}</h4>
                    <p className="text-[11px] text-zinc-400">{item.product?.type_label || 'Artikel'}</p>
                  </div>
                  <div className="text-xs font-bold text-zinc-900">
                    {formatRupiah(item.product?.final_price ?? item.product?.price)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="md:col-span-5 p-6 bg-white/80 backdrop-blur-lg border border-zinc-200/80 shadow-md rounded-2xl space-y-6">
          <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">Ringkasan Tagihan</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Total Harga</span>
              <span className="font-bold text-zinc-900">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Diskon</span>
              <span className="font-bold text-emerald-600">Rp 0</span>
            </div>
            <div className="border-t border-zinc-100 pt-3 flex justify-between text-base font-extrabold text-zinc-900">
              <span>Total Bayar</span>
              <span>{formatRupiah(subtotal)}</span>
            </div>
          </div>

          <Button
            size="lg"
            onClick={handleProcessOrder}
            disabled={submitting || items.length === 0}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs gap-2"
          >
            <Zap className="w-4 h-4" />
            {submitting ? 'Memproses Pesanan...' : 'Bayar Sekarang'}
          </Button>

          <p className="text-[11px] text-zinc-400 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Pembayaran Terenkripsi & Akses Langsung
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
