import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  RefreshCw,
  Clock,
  Download,
  ArrowRight,
  Star,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  History,
  Layers,
  CheckCircle2,
  BookmarkCheck,
  Maximize2,
  FileText,
  FileSpreadsheet,
  Trash2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Eye,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import BookCover from '@/components/BookCover';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';

interface LibraryProduct {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  cover_url?: string | null;
  type?: string;
  type_label?: string;
  reading_time?: number;
  pages?: number;
  can_read?: boolean;
  can_download?: boolean;
  has_excel?: boolean;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  author?: {
    id: number;
    name: string;
    is_senior_partner?: boolean;
  } | null;
}

interface LibraryItem {
  id: number;
  granted_at: string;
  last_accessed_at?: string | null;
  progress: number;
  last_read_page: number;
  is_starred?: boolean;
  starred_at?: string | null;
  hidden_from_history?: boolean;
  bookmarks?: Array<{ page: number; title: string; created_at: string }>;
  notes?: Array<{ id: string; content: string; created_at: string }>;
  order_number?: string | null;
  product: LibraryProduct;
}

/** Format timestamp into friendly date and time relative to user timezone */
export function formatReadingTime(isoString?: string | null): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return `Hari ini, ${timeStr}`;
  }
  if (isYesterday) {
    return `Kemarin, ${timeStr}`;
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    const dayStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `${dayStr}, ${timeStr}`;
  }

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const Library: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useLanguage();

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'collection' (All books) vs 'history' (Reading History)
  const [mainView, setMainView] = useState<'collection' | 'history'>('collection');

  // Filter & Search States
  const [filterTab, setFilterTab] = useState<'all' | 'favorites' | 'reading' | 'unread' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'bookmarked_first' | 'recently_read' | 'recently_added' | 'most_progress' | 'title_asc' | 'title_desc'>('bookmarked_first');

  // Inline Quick Reader Modal State
  const [quickReaderItem, setQuickReaderItem] = useState<LibraryItem | null>(null);
  const [quickReaderLoading, setQuickReaderLoading] = useState(false);
  const [quickReaderData, setQuickReaderData] = useState<any>(null);
  const [quickReaderMode, setQuickReaderMode] = useState<'pdf' | 'text'>('pdf');

  useEffect(() => {
    if (!quickReaderItem) {
      setQuickReaderData(null);
      return;
    }
    const loadQuickReader = async () => {
      setQuickReaderLoading(true);
      try {
        const res = await api.get(`/library/${quickReaderItem.product.slug}/read`);
        setQuickReaderData(res.data);
        if (res.data?.has_pdf) {
          setQuickReaderMode('pdf');
        } else {
          setQuickReaderMode('text');
        }
        // Update local items state so library list immediately reflects updated access/progress
        setItems((prev) =>
          prev.map((i) =>
            i.id === quickReaderItem.id
              ? {
                  ...i,
                  progress: Math.max(i.progress, res.data.progress || 5),
                  last_read_page: res.data.last_read_page || 1,
                  last_accessed_at: new Date().toISOString(),
                }
              : i
          )
        );
      } catch (err) {
        console.error('Failed to load quick preview', err);
      } finally {
        setQuickReaderLoading(false);
      }
    };
    loadQuickReader();
  }, [quickReaderItem]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const res = await api.get('/library');
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.items)
        ? res.data.items
        : Array.isArray(res.data)
        ? res.data
        : [];
      setItems(list);
    } catch (err) {
      console.error('Failed to load library entitlements', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Toggle Product Bookmark (Star) in database
  const handleToggleStar = async (e: React.MouseEvent, item: LibraryItem) => {
    e.preventDefault();
    e.stopPropagation();

    const currentStarred = Boolean(item.is_starred);
    const newStarred = !currentStarred;

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, is_starred: newStarred, starred_at: newStarred ? new Date().toISOString() : null }
          : i
      )
    );

    try {
      const res = await api.post(`/library/${item.product.slug}/star`);
      if (res.data) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, is_starred: res.data.is_starred, starred_at: res.data.starred_at }
              : i
          )
        );
      }
      toast.success(newStarred ? 'Ditambahkan ke Favorit' : 'Dihapus dari Favorit');
    } catch (err) {
      console.error('Failed to toggle star on library product', err);
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_starred: currentStarred } : i))
      );
      toast.error('Gagal memperbarui status favorit.');
    }
  };

  // Remove single item from Reading History without wiping progress
  const handleRemoveFromHistory = async (e: React.MouseEvent, item: LibraryItem) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, hidden_from_history: true } : i))
    );

    try {
      await api.post(`/library/${item.product.slug}/history/remove`);
      toast.success('Dihapus dari riwayat membaca.');
    } catch (err) {
      console.error('Failed to remove item from history', err);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, hidden_from_history: false } : i))
      );
      toast.error('Gagal menghapus dari riwayat.');
    }
  };

  // Statistics Summary (Strictly Real User Data)
  const stats = useMemo(() => {
    const total = items.length;
    const inProgress = items.filter((i) => {
      const p = i.progress || 0;
      return (p > 0 && p < 100) || (Boolean(i.last_accessed_at) && p < 100);
    }).length;
    const completed = items.filter((i) => (i.progress || 0) >= 100).length;
    const unread = items.filter((i) => (i.progress || 0) === 0 && !i.last_accessed_at).length;
    const starred = items.filter((i) => Boolean(i.is_starred)).length;

    // Find latest accessed document
    const accessedItems = items
      .filter((i) => Boolean(i.last_accessed_at))
      .sort((a, b) => new Date(b.last_accessed_at!).getTime() - new Date(a.last_accessed_at!).getTime());
    const lastActive = accessedItems.length > 0 ? accessedItems[0] : null;

    return {
      total,
      inProgress,
      completed,
      unread,
      starred,
      lastActive,
    };
  }, [items]);

  // Continue Reading List: in-progress or recently accessed items sorted by last_accessed_at desc
  const continueReadingItems = useMemo(() => {
    return items
      .filter((i) => {
        const p = i.progress || 0;
        return (p > 0 && p < 100) || (Boolean(i.last_accessed_at) && p < 100);
      })
      .sort((a, b) => {
        const timeA = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
        const timeB = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [items]);

  // Starred / Favorites List
  const favoriteItems = useMemo(() => {
    return items.filter((i) => Boolean(i.is_starred));
  }, [items]);

  // Filtered and Sorted Collection
  const filteredAndSortedCollection = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((i) => {
        const p = i.product;
        return (
          p.title?.toLowerCase().includes(q) ||
          p.subtitle?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q) ||
          p.author?.name?.toLowerCase().includes(q)
        );
      });
    }

    // Status Tab filter
    if (filterTab === 'favorites') {
      result = result.filter((i) => Boolean(i.is_starred));
    } else if (filterTab === 'reading') {
      result = result.filter((i) => (i.progress || 0) > 0 && (i.progress || 0) < 100);
    } else if (filterTab === 'unread') {
      result = result.filter((i) => (i.progress || 0) === 0);
    } else if (filterTab === 'completed') {
      result = result.filter((i) => (i.progress || 0) >= 100);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'bookmarked_first') {
        const starA = a.is_starred ? 1 : 0;
        const starB = b.is_starred ? 1 : 0;
        if (starA !== starB) return starB - starA; // Starred on top
        // Secondary: recently read
        const timeA = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
        const timeB = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOption === 'recently_read') {
        const timeA = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
        const timeB = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOption === 'recently_added') {
        const timeA = a.granted_at ? new Date(a.granted_at).getTime() : 0;
        const timeB = b.granted_at ? new Date(b.granted_at).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOption === 'most_progress') {
        return (b.progress || 0) - (a.progress || 0);
      }
      if (sortOption === 'title_asc') {
        return (a.product.title || '').localeCompare(b.product.title || '');
      }
      if (sortOption === 'title_desc') {
        return (b.product.title || '').localeCompare(a.product.title || '');
      }
      return 0;
    });

    return result;
  }, [items, searchQuery, filterTab, sortOption]);

  // Reading History Grouped Chronologically
  const historyGroups = useMemo(() => {
    const validHistoryItems = items.filter(
      (i) => Boolean(i.last_accessed_at) && !i.hidden_from_history
    );

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOf7Days = startOfToday - 6 * 86400000;

    const groups: {
      today: LibraryItem[];
      yesterday: LibraryItem[];
      last7Days: LibraryItem[];
      earlier: LibraryItem[];
    } = {
      today: [],
      yesterday: [],
      last7Days: [],
      earlier: [],
    };

    validHistoryItems.forEach((item) => {
      const time = new Date(item.last_accessed_at!).getTime();
      if (time >= startOfToday) {
        groups.today.push(item);
      } else if (time >= startOfYesterday) {
        groups.yesterday.push(item);
      } else if (time >= startOf7Days) {
        groups.last7Days.push(item);
      } else {
        groups.earlier.push(item);
      }
    });

    // Sort each group descending
    const sorter = (a: LibraryItem, b: LibraryItem) =>
      new Date(b.last_accessed_at!).getTime() - new Date(a.last_accessed_at!).getTime();

    groups.today.sort(sorter);
    groups.yesterday.sort(sorter);
    groups.last7Days.sort(sorter);
    groups.earlier.sort(sorter);

    return groups;
  }, [items]);

  const totalHistoryCount =
    historyGroups.today.length +
    historyGroups.yesterday.length +
    historyGroups.last7Days.length +
    historyGroups.earlier.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8 font-sans text-slate-800">
      
      {/* 1. BREADCRUMBS & TOP NAVIGATION */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link to="/" className="hover:text-[#1976D2] transition-colors font-medium">
            Beranda
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold truncate">
            Library Pembaca Saya
          </span>
        </div>

        <Link
          to="/products"
          className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-[#1976D2] hover:text-[#0C3B69] hover:underline"
        >
          <span>Jelajahi Riset Baru</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      {/* 2. HEADER & MAIN VIEW SWITCHER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Library Pembaca Saya
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-supporting">
            Akses permanen, riwayat aktivitas, dan progres membaca publikasi riset terverifikasi Anda.
          </p>
        </div>

        {/* View Switcher: Koleksi vs Riwayat */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200 text-xs font-semibold self-start md:self-auto shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => setMainView('collection')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              mainView === 'collection'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-[#1976D2]" />
            <span>Koleksi Dokumen ({items.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMainView('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
              mainView === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-[#1976D2]" />
            <span>Riwayat Membaca ({totalHistoryCount})</span>
          </button>
        </div>
      </div>

      {loading ? (
        /* Loading Skeleton */
        <div className="py-24 text-center space-y-4">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-[#1976D2]" />
          <p className="text-xs font-semibold text-slate-500 font-supporting">
            Menyiapkan Workspace Library Personal...
          </p>
        </div>
      ) : items.length === 0 ? (
        /* Empty State when user owns 0 products */
        <Card className="p-10 sm:p-16 text-center bg-white border border-slate-200 shadow-xs rounded-3xl space-y-5 max-w-2xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[#D1E4F6]/50 text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Library Pembaca Anda Masih Kosong
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-supporting leading-relaxed">
              Seluruh laporan riset sektoral, publikasi tematik, dan berkas dataset yang Anda beli atau klaim gratis akan tersimpan permanen di sini.
            </p>
          </div>
          <div className="pt-3">
            <Link to="/products">
              <Button className="bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold text-xs sm:text-sm rounded-xl px-6 py-3 shadow-xs cursor-pointer gap-2">
                <span>Jelajahi Katalog Publikasi</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <>
          {/* 3. PERSONAL READING DASHBOARD OVERVIEW (Summary Cards from REAL Data) */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Documents */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Koleksi
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {stats.total}
              </div>
              <div className="text-[10px] text-slate-400 font-supporting">Dokumen Berhak Akses</div>
            </div>

            {/* Currently Reading */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-[#1976D2] uppercase tracking-wider">
                Sedang Dibaca
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-[#1976D2]">
                {stats.inProgress}
              </div>
              <div className="text-[10px] text-slate-400 font-supporting">Progres 1–99%</div>
            </div>

            {/* Completed */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Selesai Dibaca
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-600">
                {stats.completed}
              </div>
              <div className="text-[10px] text-slate-400 font-supporting">100% Selesai</div>
            </div>

            {/* Unread */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Belum Dibuka
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-700">
                {stats.unread}
              </div>
              <div className="text-[10px] text-slate-400 font-supporting">Koleksi Baru</div>
            </div>

            {/* Bookmarked / Starred */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                Favorit
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-600">
                {stats.starred}
              </div>
              <div className="text-[10px] text-slate-400 font-supporting">Dibintangi</div>
            </div>

            {/* Last Active Record */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#1976D2]" />
                <span>Terakhir Dibaca</span>
              </div>
              <div className="text-xs font-bold text-slate-900 truncate" title={stats.lastActive?.product?.title}>
                {stats.lastActive ? stats.lastActive.product.title : 'Belum ada aktivitas'}
              </div>
              <div className="text-[10px] text-slate-400 font-supporting truncate">
                {stats.lastActive ? formatReadingTime(stats.lastActive.last_accessed_at) : '-'}
              </div>
            </div>
          </section>

          {/* MAIN VIEW: COLLECTION TAB */}
          {mainView === 'collection' && (
            <div className="space-y-10">
              {/* 4. CONTINUE READING SECTION (Prominent for In-Progress reading) */}
              {continueReadingItems.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1976D2]" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                        Lanjutkan Membaca
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500 font-supporting">
                      {continueReadingItems.length} bacaan aktif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {continueReadingItems.slice(0, 3).map((item) => {
                      const p = item.product;
                      return (
                        <div
                          key={`cont-${item.id}`}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-[#B2D1F0] transition-all flex gap-4 items-center"
                        >
                          {/* Mini Cover */}
                          <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                            <BookCover product={p} rounded="rounded-lg" />
                          </div>

                          {/* Info & Progress */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="text-[#1976D2] font-bold uppercase truncate">
                                {p.category?.name || 'Riset'}
                              </span>
                              <span className="font-semibold text-slate-700">
                                {item.progress}%
                              </span>
                            </div>

                            <h3 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                              {p.title}
                            </h3>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-[#1976D2] transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(item.progress, 5))}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-slate-400 font-supporting">
                                Hlm. {item.last_read_page || 1} &bull; {formatReadingTime(item.last_accessed_at)}
                              </span>

                              <Link
                                to={`/library/${p.slug}/read?page=${item.last_read_page || 1}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1976D2] hover:text-[#0C3B69] hover:underline"
                              >
                                <span>Lanjut</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 5. TOOLBAR: SEARCH & STATUS FILTERS & SORTING */}
              <section className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
                  {/* Top Bar: Search & Sorting */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari dalam library (judul, sektor, penulis)..."
                        className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] transition-all"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Sorting Selector */}
                    <div className="relative flex items-center shrink-0">
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        className="bg-white text-xs text-slate-700 font-semibold py-2.5 pl-3 pr-8 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] cursor-pointer shadow-2xs appearance-none"
                      >
                        <option value="bookmarked_first">★ Favorit di Atas</option>
                        <option value="recently_read">Terakhir Dibaca</option>
                        <option value="recently_added">Terbaru Dimiliki</option>
                        <option value="most_progress">Progress Tertinggi</option>
                        <option value="title_asc">Judul A–Z</option>
                        <option value="title_desc">Judul Z–A</option>
                      </select>
                      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setFilterTab('all')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        filterTab === 'all'
                          ? 'bg-[#1976D2] text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Semua Koleksi ({items.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('favorites')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        filterTab === 'favorites'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${filterTab === 'favorites' ? 'fill-white' : 'text-amber-500'}`} />
                      <span>Favorit ({stats.starred})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('reading')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        filterTab === 'reading'
                          ? 'bg-[#1976D2] text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Sedang Dibaca ({stats.inProgress})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('unread')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        filterTab === 'unread'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Belum Dibuka ({stats.unread})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterTab('completed')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        filterTab === 'completed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Selesai ({stats.completed})
                    </button>

                    {(filterTab !== 'all' || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTab('all');
                          setSearchQuery('');
                        }}
                        className="ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Filter</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 6. CATALOG GRID OF ACCESSIBLE PRODUCTS */}
                {filteredAndSortedCollection.length === 0 ? (
                  <div className="py-16 text-center space-y-3 bg-white border border-dashed border-slate-200 rounded-3xl p-6">
                    <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Tidak Ada Dokumen yang Cocok
                    </h3>
                    <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
                      {searchQuery
                        ? `Tidak ada koleksi dengan kata kunci "${searchQuery}".`
                        : 'Tidak ada publikasi pada tab filter yang dipilih.'}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFilterTab('all');
                        setSearchQuery('');
                      }}
                      className="bg-[#1976D2] text-white text-xs rounded-xl cursor-pointer"
                    >
                      Tampilkan Semua Koleksi
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
                    {filteredAndSortedCollection.map((item) => {
                      const product = item.product;
                      const progress = item.progress || 0;
                      const isStarred = Boolean(item.is_starred);

                      return (
                        <Card
                          key={`lib-item-${item.id}`}
                          className={`p-4 bg-white border rounded-2xl shadow-xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between h-full relative group ${
                            isStarred ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/20 to-white' : 'border-slate-200'
                          }`}
                        >
                          <div>
                            {/* Cover Container */}
                            <div className="relative aspect-4/3 rounded-xl overflow-hidden mb-3 border border-slate-100 p-2.5 bg-[#F8FAFC] flex items-center justify-center group-hover:bg-[#D1E4F6]/20 transition-colors">
                              {/* Star / Bookmark Button */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleStar(e, item)}
                                className={`absolute top-2.5 right-2.5 z-20 p-2 rounded-xl backdrop-blur-md transition-all shadow-xs cursor-pointer ${
                                  isStarred
                                    ? 'bg-amber-50 text-amber-500 border border-amber-200 hover:bg-amber-100'
                                    : 'bg-white/90 text-slate-400 hover:text-amber-500 hover:bg-white border border-slate-200'
                                }`}
                                title={isStarred ? 'Hapus dari Favorit' : 'Tandai sebagai Favorit'}
                              >
                                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
                              </button>

                              {/* XLS Indicator if applicable */}
                              {product.has_excel && (
                                <div className="absolute top-2.5 left-2.5 z-10">
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                    <FileSpreadsheet className="w-2.5 h-2.5" /> XLS
                                  </span>
                                </div>
                              )}

                              {/* Book Cover */}
                              <div className="w-2/3 h-full max-h-[92%] shadow-xs rounded-md overflow-hidden group-hover:scale-105 transition-transform duration-200">
                                <BookCover product={product} rounded="rounded-md" />
                              </div>
                            </div>

                            {/* Meta & Category */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 font-medium">
                              <span className="text-[#1976D2] font-bold uppercase truncate">
                                {product.category?.name || 'Riset Strategis'}
                              </span>
                              <span className="text-slate-400 font-supporting shrink-0">
                                {product.reading_time ? `${product.reading_time} mnt baca` : 'Laporan Riset'}
                              </span>
                            </div>

                            {/* Title */}
                            <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug mb-1 group-hover:text-[#1976D2] transition-colors">
                              {product.title}
                            </h3>

                            {/* Author */}
                            <div className="text-[11px] text-slate-500 font-supporting truncate mb-3">
                              {product.author?.name || 'Inpartner Research'}
                            </div>

                            {/* Reading Progress Indicator */}
                            <div className="space-y-1.5 my-3 pt-2.5 border-t border-slate-100">
                              <div className="flex items-center justify-between text-[10px] text-slate-600 font-supporting">
                                <span className="font-semibold">
                                  {progress >= 100
                                    ? 'Selesai'
                                    : progress > 0
                                    ? `Sedang Dibaca (${progress}%)`
                                    : item.last_accessed_at
                                    ? 'Sedang Dibaca (5%)'
                                    : 'Belum Dibaca'}
                                </span>
                                <span className="text-slate-400">
                                  {progress > 0 || item.last_accessed_at
                                    ? `Hlm. ${item.last_read_page || 1}`
                                    : '0%'}
                                </span>
                              </div>

                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    progress >= 100
                                      ? 'bg-emerald-500'
                                      : progress > 0 || item.last_accessed_at
                                      ? 'bg-[#1976D2]'
                                      : 'bg-transparent'
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(progress, (progress > 0 || item.last_accessed_at) ? Math.max(progress, 6) : 0)
                                    )}%`,
                                  }}
                                />
                              </div>

                              <div className="text-[10px] text-slate-400 pt-0.5 font-supporting flex items-center justify-between">
                                <span>Akses: {formatReadingTime(item.last_accessed_at || item.granted_at)}</span>
                                {item.bookmarks && item.bookmarks.length > 0 && (
                                  <span className="text-rose-600 font-medium flex items-center gap-0.5">
                                    <BookmarkCheck className="w-3 h-3" /> {item.bookmarks.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                            {/* Read / Continue Reading Button */}
                            <Link
                              to={`/library/${product.slug}/read?page=${item.last_read_page || 1}`}
                              className="flex-1"
                            >
                              <Button
                                size="sm"
                                className="w-full bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white text-xs font-semibold gap-1.5 rounded-xl shadow-xs cursor-pointer"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>
                                  {progress > 0 && progress < 100
                                    ? 'Lanjut Baca'
                                    : progress >= 100
                                    ? 'Baca Ulang'
                                    : 'Mulai Baca'}
                                </span>
                              </Button>
                            </Link>

                            {/* Quick Modal Preview Reader Button */}
                            <button
                              type="button"
                              onClick={() => setQuickReaderItem(item)}
                              className="p-2 rounded-xl text-slate-400 hover:text-[#1976D2] hover:bg-[#D1E4F6]/40 transition-colors border border-slate-200"
                              title="Baca Cepat (Modal)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Detail Link */}
                            <Link
                              to={`/products/${product.slug}`}
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
                              title="Detail Riset"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* MAIN VIEW: READING HISTORY TAB */}
          {mainView === 'history' && (
            <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <History className="w-5 h-5 text-[#1976D2]" />
                    <span>Riwayat Aktivitas Membaca</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-supporting">
                    Kronologi sesi bacaan Anda yang tersinkronisasi otomatis dengan server.
                  </p>
                </div>

                <div className="text-xs text-slate-500">
                  Total <strong className="text-slate-900 font-bold">{totalHistoryCount}</strong> sesi tercatat
                </div>
              </div>

              {totalHistoryCount === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">Belum Ada Riwayat Membaca</h3>
                  <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
                    Mulai buka salah satu publikasi dari tab Koleksi untuk mencatat riwayat dan progres membaca Anda secara otomatis.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setMainView('collection')}
                    className="bg-[#1976D2] text-white text-xs rounded-xl cursor-pointer"
                  >
                    Buka Koleksi Dokumen
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Subgroup: Hari Ini */}
                  {historyGroups.today.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#1976D2] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#1976D2]" />
                        <span>Hari Ini</span>
                      </div>
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                        {historyGroups.today.map((item) => (
                          <HistoryRow
                            key={`hist-today-${item.id}`}
                            item={item}
                            onRemove={(e) => handleRemoveFromHistory(e, item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subgroup: Kemarin */}
                  {historyGroups.yesterday.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Kemarin</span>
                      </div>
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                        {historyGroups.yesterday.map((item) => (
                          <HistoryRow
                            key={`hist-yest-${item.id}`}
                            item={item}
                            onRemove={(e) => handleRemoveFromHistory(e, item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subgroup: 7 Hari Terakhir */}
                  {historyGroups.last7Days.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span>7 Hari Terakhir</span>
                      </div>
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                        {historyGroups.last7Days.map((item) => (
                          <HistoryRow
                            key={`hist-7d-${item.id}`}
                            item={item}
                            onRemove={(e) => handleRemoveFromHistory(e, item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subgroup: Sebelumnya */}
                  {historyGroups.earlier.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span>Sebelumnya</span>
                      </div>
                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                        {historyGroups.earlier.map((item) => (
                          <HistoryRow
                            key={`hist-earlier-${item.id}`}
                            item={item}
                            onRemove={(e) => handleRemoveFromHistory(e, item)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* 7. QUICK INLINE READER MODAL */}
      {quickReaderItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-5xl h-[90vh] bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#1976D2] uppercase tracking-wider">
                    {quickReaderItem.product.category?.name || 'Riset Dokumen'}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">
                    &bull; Halaman {quickReaderItem.last_read_page || 1} ({quickReaderItem.progress}%)
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xl">
                  {quickReaderItem.product.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Switcher if both PDF and Text exist */}
                {quickReaderData?.has_pdf && quickReaderData?.content_html && (
                  <div className="flex items-center p-0.5 rounded-xl bg-slate-200 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setQuickReaderMode('pdf')}
                      className={`px-2 py-1 rounded-lg text-xs cursor-pointer ${
                        quickReaderMode === 'pdf' ? 'bg-white shadow-2xs text-[#1976D2]' : 'text-slate-600'
                      }`}
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickReaderMode('text')}
                      className={`px-2 py-1 rounded-lg text-xs cursor-pointer ${
                        quickReaderMode === 'text' ? 'bg-white shadow-2xs text-[#1976D2]' : 'text-slate-600'
                      }`}
                    >
                      Teks
                    </button>
                  </div>
                )}

                <Link
                  to={`/library/${quickReaderItem.product.slug}/read?page=${quickReaderItem.last_read_page || 1}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-semibold shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Workspace Penuh</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setQuickReaderItem(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 w-full bg-slate-100 overflow-hidden relative">
              {quickReaderLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 font-supporting text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#1976D2]" />
                  <span>Memuat Dokumen Riset...</span>
                </div>
              ) : quickReaderMode === 'pdf' && quickReaderData?.has_pdf ? (
                <div className="w-full h-full relative">
                  <iframe
                    src={`/api/library/${quickReaderItem.product.slug}/stream-pdf?token=${encodeURIComponent(localStorage.getItem('token') || '')}#page=${quickReaderItem.last_read_page || 1}&toolbar=1&navpanes=0`}
                    title={quickReaderItem.product.title}
                    className="w-full h-full border-none"
                  />
                  {/* Floating switch to Text mode */}
                  <div className="absolute bottom-4 right-4 z-10">
                    <button
                      type="button"
                      onClick={() => setQuickReaderMode('text')}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-md shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#1976D2]" />
                      <span>Beralih ke Mode Teks</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full overflow-y-auto bg-white p-6 sm:p-10">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="text-center pb-4 border-b border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1976D2]">
                        {quickReaderItem.product.type_label || 'Dokumen Terverifikasi'}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                        {quickReaderItem.product.title}
                      </h2>
                      {quickReaderItem.product.author && (
                        <p className="text-xs text-slate-500 font-supporting">
                          Oleh {quickReaderItem.product.author.name}
                        </p>
                      )}
                    </div>
                    <article
                      className="article-prose font-supporting leading-relaxed text-sm text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html:
                          quickReaderData?.content_html ||
                          quickReaderItem.product.subtitle ||
                          '<p>Tidak ada teks pratinjau tersedia.</p>',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Row component for reading history */
const HistoryRow: React.FC<{
  item: LibraryItem;
  onRemove: (e: React.MouseEvent) => void;
}> = ({ item, onRemove }) => {
  const p = item.product;
  const progress = item.progress || 0;

  return (
    <div className="p-3 sm:p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
      {/* Left: Thumbnail & Info */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
          <BookCover product={p} rounded="rounded-lg" />
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
            <span className="text-[#1976D2] font-bold uppercase truncate">
              {p.category?.name || 'Kajian Sektor'}
            </span>
            <span>&bull;</span>
            <span className="text-slate-400">
              {formatReadingTime(item.last_accessed_at)}
            </span>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-md sm:max-w-xl">
            {p.title}
          </h4>

          {/* Progress bar info */}
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-supporting">
            <span className="font-semibold text-slate-700">
              {progress >= 100
                ? 'Selesai'
                : progress > 0
                ? `Hlm. ${item.last_read_page || 1} (${progress}%)`
                : item.last_accessed_at
                ? `Hlm. ${item.last_read_page || 1} (5%)`
                : 'Belum Dibaca'}
            </span>
            <div className="w-20 bg-slate-200 rounded-full h-1 overflow-hidden">
              <div
                className={`h-full ${
                  progress >= 100
                    ? 'bg-emerald-500'
                    : progress > 0 || item.last_accessed_at
                    ? 'bg-[#1976D2]'
                    : 'bg-transparent'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(progress, (progress > 0 || item.last_accessed_at) ? Math.max(progress, 6) : 0)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/library/${p.slug}/read?page=${item.last_read_page || 1}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-semibold shadow-xs"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lanjut Baca</span>
        </Link>

        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
          title="Hapus dari riwayat bacaan"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Library;
