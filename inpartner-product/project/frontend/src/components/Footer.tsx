import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 bg-white pt-12 pb-8 mt-20 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img
                src="/logo.png"
                alt="Inpartner"
                className="w-7 h-7 object-contain rounded-lg shadow-2xs group-hover:scale-105 transition-transform"
              />
              <span className="font-wordmark font-extrabold text-[#1976D2] text-base tracking-tight">
                INPARTNER
              </span>
            </Link>
            <p className="text-slate-500 leading-relaxed text-xs">
              Platform publikasi artikel riset, analisis industri, dan jurnal digital profesional terkurasi untuk keputusan bisnis strategis.
            </p>
          </div>

          {/* Nav Col 1 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">Kategori Utama</h4>
            <ul className="space-y-1.5">
              <li><Link to="/products?type=article" className="hover:text-[#1976D2] transition-colors">Artikel Riset</Link></li>
              <li><Link to="/products?type=ebook" className="hover:text-[#1976D2] transition-colors">Ebook & Playbook</Link></li>
              <li><Link to="/products?type=journal" className="hover:text-[#1976D2] transition-colors">Jurnal Ilmiah</Link></li>
              <li><Link to="/products?type=research_paper" className="hover:text-[#1976D2] transition-colors">Paper Analisis</Link></li>
            </ul>
          </div>

          {/* Nav Col 2 */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">Akses Cepat</h4>
            <ul className="space-y-1.5">
              <li><Link to="/products" className="hover:text-[#1976D2] transition-colors">Semua Artikel</Link></li>
              <li><Link to="/products?sort=popular" className="hover:text-[#1976D2] transition-colors">Artikel Terpopuler</Link></li>
              <li><Link to="/products?price=free" className="hover:text-[#1976D2] transition-colors">Riset Gratis</Link></li>
              <li><Link to="/library" className="hover:text-[#1976D2] transition-colors">Library Pembaca</Link></li>
            </ul>
          </div>

          {/* Payment & Security */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 uppercase tracking-wider text-[11px]">Pembayaran & Keamanan</h4>
            <p className="text-slate-500 leading-relaxed">
              Transaksi diproses secara instan dan terenkripsi aman via Midtrans Payment Gateway.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200">Midtrans Verified</span>
              <span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700 border border-slate-200">QRIS / Bank Transfer</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>© {new Date().getFullYear()} Inpartner Editorial Group. All rights reserved.</p>
          <div className="flex items-center gap-1 font-medium text-slate-500">
            <span>Standar Desain & Analisis Profesional</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
