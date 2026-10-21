import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';

export const Library: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/library');
      setItems(res.data.items || res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-4">
      <div className="border-b border-zinc-200/60 pb-4">
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Library Pembaca Saya</h1>
        <p className="text-xs text-zinc-500 mt-1">Daftar artikel, jurnal, dan riset yang telah Anda miliki.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-zinc-400 space-y-2">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-zinc-800" />
          <p>Memuat koleksi library...</p>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-3xl space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">Belum Ada Artikel di Library</h3>
          <p className="text-xs text-zinc-500">Artikel yang Anda beli atau klaim secara gratis akan muncul di sini.</p>
          <Link to="/products">
            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl px-6">
              Jelajahi Katalog
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item: any) => {
            const product = item.product || item;
            return (
              <Card
                key={item.id}
                hoverable
                className="p-4 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-2xl flex flex-col justify-between"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden mb-3 border border-zinc-100">
                  <BookCover product={product} rounded="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-zinc-900 text-sm line-clamp-2 leading-snug">{product.title}</h4>
                  <Link to={`/library/${product.slug}/read`} className="block pt-2">
                    <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 rounded-lg">
                      <BookOpen className="w-3.5 h-3.5" /> Baca Sekarang
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Library;
