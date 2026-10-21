import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingBag, User as UserIcon, BookOpen, LogOut, Shield, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/lightswind/button';
import { Badge } from '@/components/lightswind/badge';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const activeLinkClass = (path: string) =>
    location.pathname === path
      ? 'text-zinc-900 font-semibold bg-zinc-200/50 px-3 py-1.5 rounded-full'
      : 'text-zinc-600 hover:text-zinc-900 px-3 py-1.5 rounded-full hover:bg-zinc-100/50 transition-colors font-medium';

  return (
    <div className="sticky top-4 z-50 w-full px-4 sm:px-6">
      <header className="max-w-5xl mx-auto rounded-full bg-white/70 backdrop-blur-xl border border-white/80 shadow-md shadow-zinc-900/5 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 transition-all">
        {/* Left: Brand Logo */}
        <Link to="/" className="flex items-center gap-2 text-zinc-900 font-extrabold tracking-tight text-base sm:text-lg">
          <span className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-serif font-black shadow-xs">
            IN
          </span>
          <span className="font-serif italic font-bold text-zinc-900 text-lg sm:text-xl tracking-tight">Inpartner</span>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs">
          <Link to="/" className={activeLinkClass('/')}>
            Beranda
          </Link>
          <Link to="/products" className={activeLinkClass('/products')}>
            Katalog Artikel
          </Link>
          <Link to="/products?price=free" className={activeLinkClass('/products?price=free')}>
            Riset Gratis
          </Link>
          {isAuthenticated && (
            <Link to="/library" className={activeLinkClass('/library')}>
              Library Saya
            </Link>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Cart button */}
          <Link to="/cart" className="relative p-2 rounded-full text-zinc-700 hover:bg-zinc-100/80 transition-colors">
            <ShoppingBag className="w-4 h-4" />
            {itemCount > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-zinc-900 text-white border-white text-[9px] w-4 h-4 p-0 flex items-center justify-center rounded-full">
                {itemCount}
              </Badge>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-zinc-200/80 bg-white/90 hover:bg-zinc-50 transition-colors text-xs font-medium text-zinc-800 shadow-2xs"
              >
                <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[9px] font-bold">
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline max-w-[90px] truncate">{user?.name}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-zinc-200/80 py-2 z-50 text-xs font-medium text-zinc-700 animate-in fade-in slide-in-from-top-1">
                  <div className="px-4 py-2 border-b border-zinc-100">
                    <p className="font-bold text-zinc-900 truncate">{user?.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-50 text-brand-600 font-semibold"
                    >
                      <Shield className="w-3.5 h-3.5" /> Portal Admin
                    </Link>
                  )}

                  <Link
                    to="/library"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-50"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-zinc-400" /> Library Saya
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-zinc-50"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-zinc-400" /> Pengaturan Profil
                  </Link>

                  <div className="border-t border-zinc-100 my-1"></div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-xs text-zinc-600 hover:text-zinc-900 font-medium px-3 rounded-full">
                  Masuk
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-full px-4 py-1.5 shadow-xs">
                  Mulai
                </Button>
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-full text-zinc-600 hover:bg-zinc-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 max-w-5xl mx-auto rounded-2xl bg-white/95 backdrop-blur-xl border border-zinc-200/80 p-4 space-y-2 shadow-lg">
          <nav className="flex flex-col gap-1 text-sm font-medium">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-zinc-50">
              Beranda
            </Link>
            <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-zinc-50">
              Katalog Artikel
            </Link>
            <Link to="/products?price=free" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2 rounded-xl hover:bg-zinc-50">
              Riset Gratis
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Navbar;
