import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Loader2, Filter } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/ProductCard';

export const Wishlist: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { wishlistIds } = useWishlist();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const fetchWishlistItems = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        const res = await api.get('/wishlist');
        setItems(res.data?.data || []);
      } else {
        const stored = localStorage.getItem('local_wishlist');
        const ids: number[] = stored ? JSON.parse(stored) : [];
        if (ids.length > 0) {
          const res = await api.get(`/products?per_page=48`);
          const allProds = res.data?.data || [];
          setItems(allProds.filter((p: any) => ids.includes(p.id)));
        } else {
          setItems([]);
        }
      }
    } catch (e) {
      console.error('Failed to load wishlist items', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistItems();
  }, [isAuthenticated, wishlistIds.length]);

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div className="py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-rose-600 text-rose-600" /> Disimpan untuk Analisis Lanjutan
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Wishlist Riset & Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl font-supporting">
            Koleksi dokumen riset, whitepaper, dan dataset sektoral yang Anda simpan untuk dievaluasi sebelum pembelian.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-slate-500">
            Total Tersimpan: <strong className="text-slate-900">{items.length} Laporan</strong>
          </span>
        </div>
      </div>

      {/* Filter Pills */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-semibold text-slate-500 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Tipe:
          </span>
          {[
            { key: 'all', label: 'Semua Tipe' },
            { key: 'thematic_research', label: 'Thematic Research' },
            { key: 'insight', label: 'Sector Insight' },
            { key: 'data', label: 'Data Series' },
            { key: 'article', label: 'Research Brief' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 ${
                filterType === tab.key
                  ? 'bg-[#1976D2] text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-[#1976D2] animate-spin" />
          <p className="text-xs text-slate-500">Memuat daftar riset tersimpan...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 px-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 border border-rose-200 flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {items.length === 0 ? 'Belum Ada Riset yang Disimpan' : 'Tidak Ada Dokumen yang Sesuai Filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-supporting">
            Jelajahi katalog intelligence kami dan klik ikon hati untuk menyimpan laporan strategis yang ingin Anda teliti lebih lanjut.
          </p>
          <div className="pt-2">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold text-xs transition shadow-xs"
            >
              Jelajahi Katalog Riset
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
