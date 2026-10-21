import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, BookOpen, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-zinc-200/60 bg-white/60 backdrop-blur-md pt-12 pb-8 mt-20 text-xs text-zinc-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2 text-zinc-900 font-bold text-base tracking-tight">
              <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xs font-serif font-black">
                IN
              </span>
              Inpartner Article Store
            </Link>
            <p className="text-zinc-500 leading-relaxed text-xs">
              Platform publikasi artikel riset, analisis industri, dan jurnal digital profesional terkurasi.
            </p>
          </div>

          {/* Nav Col 1 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-900 uppercase tracking-wider text-[11px]">Kategori Utama</h4>
            <ul className="space-y-1.5">
              <li><Link to="/products?type=article" className="hover:text-zinc-900 transition-colors">Artikel Riset</Link></li>
              <li><Link to="/products?type=ebook" className="hover:text-zinc-900 transition-colors">Ebook & Playbook</Link></li>
              <li><Link to="/products?type=journal" className="hover:text-zinc-900 transition-colors">Jurnal Ilmiah</Link></li>
              <li><Link to="/products?type=research_paper" className="hover:text-zinc-900 transition-colors">Paper Analisis</Link></li>
            </ul>
          </div>

          {/* Nav Col 2 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-900 uppercase tracking-wider text-[11px]">Akses Cepat</h4>
            <ul className="space-y-1.5">
              <li><Link to="/products" className="hover:text-zinc-900 transition-colors">Semua Artikel</Link></li>
              <li><Link to="/products?sort=popular" className="hover:text-zinc-900 transition-colors">Artikel Terpopuler</Link></li>
              <li><Link to="/products?price=free" className="hover:text-zinc-900 transition-colors">Riset Gratis</Link></li>
              <li><Link to="/library" className="hover:text-zinc-900 transition-colors">Library Pembaca</Link></li>
            </ul>
          </div>

          {/* Payment & Security */}
          <div className="space-y-2">
            <h4 className="font-semibold text-zinc-900 uppercase tracking-wider text-[11px]">Pembayaran & Keamanan</h4>
            <p className="text-zinc-500 leading-relaxed">
              Transaksi diproses dengan enkripsi tinggi secara instan via Midtrans Payment Gateway.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="px-2 py-1 rounded bg-zinc-100 text-[10px] font-medium text-zinc-600">Midtrans</span>
              <span className="px-2 py-1 rounded bg-zinc-100 text-[10px] font-medium text-zinc-600">QRIS / Bank</span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-200/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-400">
          <p>© {new Date().getFullYear()} Inpartner Editorial Group. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Dibuat dengan standar minimalis & presisi</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
