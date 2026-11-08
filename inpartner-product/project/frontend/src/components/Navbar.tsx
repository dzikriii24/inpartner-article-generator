import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  User as UserIcon,
  BookOpen,
  LogOut,
  Shield,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  Search,
  Globe,
  Tag,
  ArrowRight,
  FileText,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useLanguage } from '@/context/LanguageContext';
import { Locale } from '@/i18n/translations';
import { Button } from '@/components/lightswind/button';
import { Badge } from '@/components/lightswind/badge';
import CustomAnalysisModal from '@/components/CustomAnalysisModal';
import api from '@/services/api';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { locale, setLocale, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  // Menus and dialogs
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [researchDropdownOpen, setResearchDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<{
    products: any[];
    categories: any[];
    authors: any[];
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const langContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const researchNavRef = useRef<HTMLDivElement>(null);

  // Debounced search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchSuggestions(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/search/suggestions', {
          params: { q: searchQuery.trim() }
        });
        setSearchSuggestions(res.data);
      } catch (err) {
        console.error('Failed to fetch search suggestions', err);
        setSearchSuggestions(null);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (langContainerRef.current && !langContainerRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (researchNavRef.current && !researchNavRef.current.contains(e.target as Node)) {
        setResearchDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setResearchDropdownOpen(false);
    setMobileMenuOpen(false);
    setDropdownOpen(false);
    setLangMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    setMobileSearchOpen(false);
    navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSelectProduct = (slug: string) => {
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery('');
    navigate(`/products/${slug}`);
  };

  const handleSelectCategory = (slug: string) => {
    setSearchOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery('');
    navigate(`/products?category=${slug}`);
  };

  const languages: { code: Locale; label: string; flag: string }[] = [
    { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' }
  ];

  const activeLinkClass = (path: string) =>
    location.pathname === path
      ? 'text-[#1976D2] font-semibold bg-[#D1E4F6]/40 px-3 py-1.5 rounded-xl border border-[#B2D1F0]'
      : 'text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100/70 transition-colors font-medium';

  const isResearchActive =
    location.pathname === '/thematic-research' || location.pathname === '/sector-insights';

  return (
    <>
      <div className="sticky top-4 z-40 w-full px-4 sm:px-6">
        <header className="max-w-7xl mx-auto rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-xs px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-4 transition-all">
          
          {/* Left Section: Brand Logo & Primary Navigation */}
          <div className="flex items-center gap-3 xl:gap-6 shrink-0">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <img
                src="/logo.png"
                alt="Inpartner"
                className="w-8 h-8 rounded-lg object-contain shadow-2xs group-hover:scale-105 transition-transform"
              />
              <div className="leading-none">
                <span className="font-wordmark font-extrabold text-[#1976D2] text-lg sm:text-xl tracking-tight block">
                  INPARTNER
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block font-supporting mt-0.5">
                  {t('nav.tagline', 'Digital Products')}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-xs">
              {/* Katalog */}
              <Link to="/products" className={activeLinkClass('/products')}>
                {t('nav.catalog', 'Katalog')}
              </Link>

              {/* Riset & Insight Dropdown */}
              <div ref={researchNavRef} className="relative">
                <button
                  type="button"
                  onClick={() => setResearchDropdownOpen(!researchDropdownOpen)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl transition-colors cursor-pointer text-xs ${
                    isResearchActive
                      ? 'text-[#1976D2] font-semibold bg-[#D1E4F6]/40 border border-[#B2D1F0]'
                      : researchDropdownOpen
                      ? 'text-slate-900 bg-slate-100/80 font-medium'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                  }`}
                >
                  <span>{t('nav.research_insights', 'Riset & Insight')}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      researchDropdownOpen ? 'rotate-180 text-[#1976D2]' : ''
                    }`}
                  />
                </button>

                {researchDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      {t('nav.research_insights', 'Koleksi Publikasi')}
                    </div>
                    <Link
                      to="/thematic-research"
                      onClick={() => setResearchDropdownOpen(false)}
                      className={`flex items-start gap-2.5 px-3.5 py-2.5 transition-colors ${
                        location.pathname === '/thematic-research'
                          ? 'bg-[#D1E4F6]/40 text-[#0C3B69]'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-[#1976D2] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {t('nav.thematic', 'Riset Tematik')}
                        </div>
                        <div className="text-[11px] text-slate-500 font-supporting leading-snug">
                          {t('nav.thematic_desc', 'Tren industri & isu makro masa depan')}
                        </div>
                      </div>
                    </Link>

                    <Link
                      to="/sector-insights"
                      onClick={() => setResearchDropdownOpen(false)}
                      className={`flex items-start gap-2.5 px-3.5 py-2.5 transition-colors ${
                        location.pathname === '/sector-insights'
                          ? 'bg-[#D1E4F6]/40 text-[#0C3B69]'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 text-[#1976D2] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {t('nav.insight', 'Kajian Sektor')}
                        </div>
                        <div className="text-[11px] text-slate-500 font-supporting leading-snug">
                          {t('nav.sector_desc', 'Analisis mendalam performa sektor riil')}
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

              {/* Custom Analysis */}
              <Link
                to="/custom-analysis"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-xs ${
                  location.pathname === '/custom-analysis'
                    ? 'text-[#1976D2] font-semibold bg-[#D1E4F6]/40 border border-[#B2D1F0]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                }`}
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${
                    location.pathname === '/custom-analysis' ? 'text-[#1976D2]' : 'text-slate-400'
                  }`}
                />
                <span>{t('nav.custom_analysis', 'Custom Analysis')}</span>
              </Link>

              {/* Library (for authenticated users) */}
              {isAuthenticated && (
                <Link to="/library" className={activeLinkClass('/library')}>
                  {t('nav.library', 'Library')}
                </Link>
              )}
            </nav>
          </div>

          {/* Right Section: Compact Search Bar & Utility Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Desktop Search Bar in Navbar */}
            <div
              ref={searchContainerRef}
              className="hidden lg:block relative w-48 xl:w-60 2xl:w-72 shrink-0 transition-all duration-200 focus-within:w-64 xl:focus-within:w-80"
            >
              <form onSubmit={handleSearchSubmit} className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors text-slate-400 group-focus-within:text-[#1976D2]">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder={t('nav.search_placeholder', 'Cari riset atau produk...')}
                  className="w-full bg-slate-50/90 hover:bg-slate-100/90 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 pl-10 pr-11 py-2 rounded-xl border border-slate-200/90 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]/50 shadow-2xs transition-all duration-200"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchSuggestions(null);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden xl:flex items-center pointer-events-none">
                    <span className="text-[9px] text-slate-400 font-mono bg-slate-200/60 border border-slate-300/60 px-1 py-0.5 rounded">
                      ⌘K
                    </span>
                  </div>
                )}
              </form>

              {/* Desktop Autocomplete Dropdown */}
              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute right-0 top-full mt-2 w-80 xl:w-96 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 py-3 px-2 z-50 animate-in fade-in slide-in-from-top-2 max-h-[420px] overflow-y-auto">
                  {searchLoading ? (
                    <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 font-supporting">
                      <span className="w-5 h-5 border-2 border-[#1976D2] border-t-transparent rounded-full animate-spin" />
                      <span>Mencari dokumen & publikasi strategis...</span>
                    </div>
                  ) : searchSuggestions ? (
                    <div className="space-y-3">
                      {/* Products matches */}
                      {searchSuggestions.products?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-1.5 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <FileText className="w-3 h-3 text-[#1976D2]" />
                              <span>{t('search.products', 'Publikasi & Dokumen')}</span>
                            </span>
                            <span className="text-[9px] text-slate-400 font-normal">
                              {searchSuggestions.products.length} ditemukan
                            </span>
                          </div>
                          <div className="space-y-1">
                            {searchSuggestions.products.map((prod) => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => handleSelectProduct(prod.slug)}
                                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2.5 group cursor-pointer border border-transparent hover:border-slate-100"
                              >
                                <div className="w-7 h-9 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-[10px]">
                                  {prod.cover_url ? (
                                    <img src={prod.cover_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#1976D2] truncate transition-colors">
                                    {prod.title}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-supporting mt-0.5">
                                    <span className="px-1.5 py-0.2 rounded bg-[#D1E4F6]/50 text-[#0C3B69] font-semibold border border-[#B2D1F0]/60">
                                      {prod.type_label || prod.type}
                                    </span>
                                    {prod.category && <span className="truncate">{prod.category}</span>}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category matches */}
                      {searchSuggestions.categories?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-[#1976D2]" />
                            <span>{t('search.categories', 'Kategori Sektor')}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 px-3 py-1">
                            {searchSuggestions.categories.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleSelectCategory(cat.slug)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#D1E4F6] text-slate-700 hover:text-[#0C3B69] text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-[#B2D1F0]"
                              >
                                {cat.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Authors matches */}
                      {searchSuggestions.authors?.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-[#1976D2]" />
                            <span>{t('search.authors', 'Analis & Penulis')}</span>
                          </div>
                          <div className="space-y-0.5">
                            {searchSuggestions.authors.map((auth) => (
                              <button
                                key={auth.id}
                                type="button"
                                onClick={() => {
                                  setSearchOpen(false);
                                  navigate(`/products?author=${auth.slug}`);
                                }}
                                className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                              >
                                <div className="w-5 h-5 rounded-full bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center text-[9px] font-bold">
                                  {auth.name[0]}
                                </div>
                                <span>{auth.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Empty state */}
                      {!searchSuggestions.products?.length &&
                        !searchSuggestions.categories?.length &&
                        !searchSuggestions.authors?.length && (
                          <div className="py-6 text-center text-xs text-slate-400 font-supporting">
                            {t('search.no_results', 'Tidak ada hasil yang cocok dengan kata kunci Anda.')}
                          </div>
                        )}

                      {/* View all results button */}
                      <div className="pt-2 border-t border-slate-100 px-1">
                        <button
                          type="button"
                          onClick={() => handleSearchSubmit()}
                          className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-[#D1E4F6]/50 text-[#1976D2] text-xs font-bold transition-colors flex items-center justify-between cursor-pointer border border-slate-200/80 hover:border-[#B2D1F0]"
                        >
                          <span>{t('search.view_all', 'Lihat semua hasil untuk')} "{searchQuery}"</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-[#1976D2] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Cari Dokumen"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Language Switcher Dropdown */}
            <div ref={langContainerRef} className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
                title="Ganti Bahasa / Switch Language"
              >
                <Globe className="w-3.5 h-3.5 text-[#1976D2]" />
                <span className="uppercase text-[11px] font-bold">{locale}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium text-slate-700 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Pilih Bahasa / Language
                  </div>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLocale(l.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                        locale === l.code
                          ? 'bg-[#D1E4F6]/50 text-[#0C3B69] font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                      </span>
                      {locale === l.code && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1976D2]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wishlist button */}
            <Link
              to="/wishlist"
              className="relative p-2 rounded-xl text-slate-600 hover:text-[#1976D2] hover:bg-[#D1E4F6]/30 transition-colors"
              title={t('nav.wishlist', 'Wishlist')}
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-[9px] font-bold w-4 h-4 p-0 flex items-center justify-center rounded-full border border-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart button */}
            <Link
              to="/cart"
              className="relative p-2 rounded-xl text-slate-600 hover:text-[#1976D2] hover:bg-[#D1E4F6]/30 transition-colors"
              title={t('nav.cart', 'Keranjang')}
            >
              <ShoppingBag className="w-4 h-4" />
              {itemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-[#1976D2] text-white border-white text-[9px] w-4 h-4 p-0 flex items-center justify-center rounded-full font-bold">
                  {itemCount}
                </Badge>
              )}
            </Link>

            {/* User Profile / Auth buttons */}
            {isAuthenticated ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-xs font-medium text-slate-800 shadow-2xs cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#1976D2] text-white flex items-center justify-center text-[10px] font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[90px] truncate font-semibold text-slate-900">
                    {user?.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-xs font-medium text-slate-700 animate-in fade-in slide-in-from-top-1">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="font-bold text-slate-900 truncate">{user?.name}</p>
                      <p className="text-[11px] text-slate-500 truncate font-supporting">{user?.email}</p>
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] capitalize">
                        {user?.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 text-[#1976D2]" /> Administrator
                          </>
                        ) : (
                          'Akun Pengguna'
                        )}
                      </span>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 hover:bg-[#D1E4F6]/30 text-[#1976D2] font-semibold"
                      >
                        <Shield className="w-4 h-4 text-[#1976D2]" /> {t('nav.admin', 'Admin Portal')}
                      </Link>
                    )}

                    <Link
                      to="/library"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      <BookOpen className="w-4 h-4 text-slate-400" /> {t('nav.library', 'Library Saya')}
                    </Link>

                    <Link
                      to="/wishlist"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      <Heart className="w-4 h-4 text-rose-500" /> {t('nav.wishlist', 'Wishlist')} ({wishlistCount})
                    </Link>

                    <Link
                      to="/custom-analysis"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700 hover:text-[#1976D2] text-left font-medium cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#1976D2]" /> {t('nav.custom_analysis', 'Custom Analysis')}
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 hover:bg-slate-50 text-slate-700"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" /> {t('nav.profile', 'Profil')}
                    </Link>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50 text-left font-medium cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> {t('nav.logout', 'Keluar')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-700 hover:text-slate-900 font-semibold px-2.5 sm:px-3 rounded-xl hover:bg-slate-100"
                  >
                    {t('nav.login', 'Masuk')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    size="sm"
                    className="text-xs bg-[#1976D2] hover:bg-[#1562AF] text-white font-semibold rounded-xl px-3 sm:px-4 py-1.5 shadow-2xs"
                  >
                    {t('nav.register', 'Daftar')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Search Overlay Drawer */}
        {mobileSearchOpen && (
          <div className="lg:hidden mt-2 max-w-7xl mx-auto rounded-2xl bg-white border border-slate-200 p-3 shadow-lg animate-in fade-in slide-from-top-1">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search.input_placeholder', 'Ketik kata kunci riset, topik, atau penulis...')}
                className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 pl-9.5 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Mobile Autocomplete Results */}
            {searchQuery.trim().length >= 2 && searchSuggestions && (
              <div className="mt-2 pt-2 border-t border-slate-100 max-h-60 overflow-y-auto space-y-2">
                {searchSuggestions.products?.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectProduct(prod.slug)}
                    className="w-full text-left p-2 rounded-xl hover:bg-slate-50 flex items-center gap-2 text-xs"
                  >
                    <FileText className="w-4 h-4 text-[#1976D2] shrink-0" />
                    <span className="truncate font-semibold text-slate-900">{prod.title}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleSearchSubmit()}
                  className="w-full py-2 px-3 text-center text-xs font-bold text-[#1976D2] bg-[#D1E4F6]/40 rounded-xl"
                >
                  {t('search.view_all', 'Lihat semua hasil')} &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 max-w-7xl mx-auto rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-lg">
            <nav className="flex flex-col gap-1 text-sm font-medium">
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  location.pathname === '/products'
                    ? 'bg-[#D1E4F6]/40 text-[#1976D2] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t('nav.catalog', 'Katalog')}
              </Link>

              {/* Research group */}
              <div className="pt-2 pb-1 border-t border-slate-100">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  {t('nav.research_insights', 'Riset & Insight')}
                </span>
                <Link
                  to="/thematic-research"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                    location.pathname === '/thematic-research'
                      ? 'bg-[#D1E4F6]/40 text-[#1976D2] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-[#1976D2]" />
                  <span>{t('nav.thematic', 'Riset Tematik')}</span>
                </Link>
                <Link
                  to="/sector-insights"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                    location.pathname === '/sector-insights'
                      ? 'bg-[#D1E4F6]/40 text-[#1976D2] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 text-[#1976D2]" />
                  <span>{t('nav.insight', 'Kajian Sektor')}</span>
                </Link>
              </div>

              {/* Custom Analysis */}
              <Link
                to="/custom-analysis"
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                  location.pathname === '/custom-analysis'
                    ? 'bg-[#D1E4F6]/40 text-[#1976D2] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#1976D2]" />
                <span>{t('nav.custom_analysis', 'Custom Analysis')}</span>
              </Link>

              {/* Wishlist */}
              <Link
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-700 flex items-center justify-between"
              >
                <span>{t('nav.wishlist', 'Wishlist')}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-semibold">
                  {wishlistCount}
                </span>
              </Link>

              {/* Library if auth */}
              {isAuthenticated && (
                <Link
                  to="/library"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-xl transition-colors ${
                    location.pathname === '/library'
                      ? 'bg-[#D1E4F6]/40 text-[#1976D2] font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t('nav.library', 'Library Saya')}
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>

      <CustomAnalysisModal isOpen={customModalOpen} onClose={() => setCustomModalOpen(false)} />
    </>
  );
};

export default Navbar;