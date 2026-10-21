import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, BookOpen, CreditCard, ArrowRight } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/lightswind/button';
import { Badge } from '@/components/lightswind/badge';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';
import { formatRupiah, formatDate } from '@/utils/format';

export const OrderDetail: React.FC = () => {
  const { number } = useParams<{ number: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!number) return;
    setLoading(true);
    try {
      const res = await api.get(`/orders/${number}`);
      setOrder(res.data.order);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [number]);

  if (loading) return <div className="text-center py-20 text-xs text-zinc-400">Memuat detail pesanan...</div>;
  if (!order) return <div className="text-center py-20 text-xs text-zinc-400">Pesanan tidak ditemukan.</div>;

  const isPaid = order.status === 'paid' || order.status === 'completed';

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <Card className="p-8 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-3xl space-y-6 text-center">
        <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {isPaid ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900">
            {isPaid ? 'Pembayaran Berhasil!' : 'Menunggu Pembayaran'}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Nomor Pesanan: <span className="font-mono font-bold text-zinc-800">{order.order_number}</span></p>
        </div>

        {!isPaid && (
          <div className="pt-2">
            <Link to={`/payment/simulator/${order.order_number}`}>
              <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl px-6 py-2.5 gap-2">
                <CreditCard className="w-4 h-4" /> Buka Simulator Pembayaran
              </Button>
            </Link>
          </div>
        )}

        {isPaid && (
          <div className="pt-2">
            <Link to="/library">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl px-6 py-2.5 gap-2">
                <BookOpen className="w-4 h-4" /> Buka Library Saya
              </Button>
            </Link>
          </div>
        )}
      </Card>

      <Card className="p-6 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-3">Item Pesanan</h3>
        <div className="space-y-3">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 py-2 border-b border-zinc-50 last:border-0">
              <div className="w-12 aspect-[3/4] shrink-0 rounded overflow-hidden">
                <BookCover product={item.product} compact rounded="rounded-none" />
              </div>
              <div className="flex-1 min-w-0 text-xs">
                <h4 className="font-bold text-zinc-900 truncate">{item.product?.title}</h4>
                <p className="text-[11px] text-zinc-400">{item.product?.type_label || 'Artikel'}</p>
              </div>
              <div className="text-xs font-bold text-zinc-900">
                {formatRupiah(item.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-zinc-100 pt-3 flex justify-between text-xs font-extrabold text-zinc-900">
          <span>Total Bayar</span>
          <span>{formatRupiah(order.total_amount)}</span>
        </div>
      </Card>
    </div>
  );
};

export default OrderDetail;
