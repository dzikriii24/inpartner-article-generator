import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight, ShieldCheck, BookOpen } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';
import { formatRupiah } from '@/utils/format';

export const Cart: React.FC = () => {
  const { items, itemCount, subtotal, removeFromCart, clearCart, loading } = useCart();
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      <div className="border-b border-zinc-200/60 pb-4">
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Keranjang Pembelian</h1>
        <p className="text-xs text-zinc-500 mt-1">{itemCount} artikel & publikasi dipilih.</p>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-3xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">Keranjang Anda Masih Kosong</h3>
          <p className="text-xs text-zinc-500">Jelajahi riset dan artikel berkualitas kami untuk ditambahkan ke keranjang.</p>
          <Link to="/products">
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl px-6">
              Jelajahi Artikel
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Item list */}
          <div className="lg:col-span-8 space-y-4">
            {items.map((item) => (
              <Card
                key={item.id}
                className="p-4 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-2xl flex items-center gap-4"
              >
                <div className="w-16 aspect-[3/4] shrink-0 rounded-lg overflow-hidden border border-zinc-200">
                  <BookCover product={item.product} compact rounded="rounded-none" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product?.slug}`} className="font-bold text-zinc-900 text-sm hover:text-zinc-600 line-clamp-1">
                    {item.product?.title}
                  </Link>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.product?.type_label || 'Artikel'}</p>
                  <div className="text-xs font-bold text-zinc-900 mt-2">
                    {formatRupiah(item.product?.final_price ?? item.product?.price)}
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  aria-label="Hapus item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => clearCart()} className="text-xs font-medium text-rose-600 hover:underline">
                Kosongkan Keranjang
              </button>
              <Link to="/products" className="text-xs font-semibold text-zinc-600 hover:text-zinc-900">
                + Tambah Artikel Lain
              </Link>
            </div>
          </div>

          {/* Checkout Summary */}
          <Card className="lg:col-span-4 p-6 bg-white/80 backdrop-blur-lg border border-zinc-200/80 shadow-md rounded-2xl space-y-6">
            <h3 className="text-base font-bold text-zinc-900 border-b border-zinc-100 pb-3">Ringkasan Pembayaran</h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal ({itemCount} produk)</span>
                <span className="font-semibold text-zinc-900">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Biaya Layanan</span>
                <span className="font-semibold text-emerald-600">Gratis</span>
              </div>
              <div className="border-t border-zinc-100 pt-3 flex justify-between text-sm font-extrabold text-zinc-900">
                <span>Total Pembayaran</span>
                <span className="text-base">{formatRupiah(subtotal)}</span>
              </div>
            </div>

            <Link to="/checkout" className="block">
              <Button size="lg" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs gap-2">
                Lanjut ke Checkout <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <p className="text-[11px] text-zinc-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Pembayaran Aman & Instan
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Cart;
