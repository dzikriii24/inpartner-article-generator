import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  User as UserIcon,
  Shield,
  BookOpen,
  ShoppingBag,
  Sparkles,
  Layers,
  Calendar,
  BarChart2,
  Settings,
  Highlighter,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download,
  AlertCircle,
  Building2,
  Briefcase,
  Flame,
  Clock,
  Compass,
  ArrowRight,
  CheckCircle2,
  Bookmark,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import api from '@/services/api';

// Tab Subcomponents
import { ProfileOverviewTab } from '@/components/profile/ProfileOverviewTab';
import { ResearchKanbanTab } from '@/components/profile/ResearchKanbanTab';
import { ResearchNotebookTab } from '@/components/profile/ResearchNotebookTab';
import { ReadingPlannerTab } from '@/components/profile/ReadingPlannerTab';
import { ActivityAnalyticsTab } from '@/components/profile/ActivityAnalyticsTab';
import { ProfileSettingsTab } from '@/components/profile/ProfileSettingsTab';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | null;
}

interface MenuCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  items: MenuItem[];
}

export const Profile: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { formatPrice } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab: 'overview' | 'pipeline' | 'notebook' | 'calendar' | 'analytics' | 'settings' | 'orders' | 'requests'
  const rawTab = searchParams.get('tab') || 'overview';
  // Map legacy 'profile' to 'overview'
  const activeTab = rawTab === 'profile' ? 'overview' : rawTab;

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Orders State (for orders tab)
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Custom Requests State (for requests tab)
  const [customRequests, setCustomRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Toggle state to collapse/expand menu hub for maximum reading workspace
  const [isMenuHubExpanded, setIsMenuHubExpanded] = useState(true);

  // Ref to active viewport to scroll smoothly when tab changes
  const activeViewportRef = useRef<HTMLDivElement>(null);

  // Fetch Dashboard Summary Data
  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const res = await api.get('/profile/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.get('/orders');
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setOrders(list);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch Custom Requests
  const fetchCustomRequests = async () => {
    setRequestsLoading(true);
    try {
      const res = await api.get('/custom-requests/my');
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setCustomRequests(list);
    } catch (err) {
      console.error('Failed to fetch custom requests', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'requests') {
      fetchCustomRequests();
    }
  }, [activeTab]);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    // Smooth scroll down to active viewport
    if (activeViewportRef.current) {
      const yOffset = -80;
      const element = activeViewportRef.current;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Categorized Menu Hub Configuration
  const menuCategories: MenuCategory[] = [
    {
      id: 'research',
      title: 'Ruang Riset & Dokumen',
      subtitle: 'Modul eksplorasi, pipeline & anotasi laporan',
      icon: Layers,
      badge: `${dashboardData?.metrics?.total_documents || 0} Dokumen`,
      items: [
        {
          id: 'overview',
          title: 'Dashboard Overview',
          subtitle: 'Ringkasan metrik & aktivitas baca',
          icon: BarChart2,
        },
        {
          id: 'pipeline',
          title: 'Kanban Riset',
          subtitle: 'Pipeline & status bacaan publikasi',
          icon: Layers,
          badge: dashboardData?.metrics?.total_documents || null,
        },
        {
          id: 'notebook',
          title: 'Research Notebook',
          subtitle: 'Highlight, catatan & kutipan riset',
          icon: Highlighter,
          badge: dashboardData?.metrics?.total_highlights || null,
        },
      ],
    },
    {
      id: 'productivity',
      title: 'Perencanaan & Produktivitas',
      subtitle: 'Jadwal riset, target harian & analitik',
      icon: Calendar,
      badge: `${dashboardData?.metrics?.current_streak || 0} Hari Streak`,
      items: [
        {
          id: 'calendar',
          title: 'Kalender & Agenda',
          subtitle: 'Target waktu & pengingat riset',
          icon: Calendar,
        },
        {
          id: 'analytics',
          title: 'Statistik & Heatmap',
          subtitle: 'Grafik konsistensi & jam produktif',
          icon: Sparkles,
        },
      ],
    },
    {
      id: 'account',
      title: 'Akun & Layanan Resmi',
      subtitle: 'Administrasi peneliti, pesanan & kustomisasi',
      icon: Settings,
      badge: 'Layanan Terverifikasi',
      items: [
        {
          id: 'settings',
          title: 'Pengaturan Akun',
          subtitle: 'Profil, keahlian & keamanan sandi',
          icon: Settings,
        },
        {
          id: 'orders',
          title: 'Transaksi & Faktur',
          subtitle: 'Riwayat pembelian & unduh invoice',
          icon: ShoppingBag,
          badge: orders.length > 0 ? orders.length : null,
        },
        {
          id: 'requests',
          title: 'Custom Analysis',
          subtitle: 'Pengajuan kajian analisis khusus',
          icon: Sparkles,
          badge: customRequests.length > 0 ? customRequests.length : null,
        },
      ],
    },
  ];

  // Helper to find active tab title & category
  const findActiveItem = () => {
    for (const cat of menuCategories) {
      for (const item of cat.items) {
        if (item.id === activeTab) {
          return { item, category: cat };
        }
      }
    }
    return {
      item: {
        id: 'overview',
        title: 'Dashboard Overview',
        subtitle: 'Ringkasan metrik & aktivitas baca',
        icon: BarChart2,
      },
      category: menuCategories[0],
    };
  };

  const activeMeta = findActiveItem();

  return (
    <div className="space-y-8 py-6 sm:py-10 max-w-7xl mx-auto px-4 sm:px-6">
      {/* 1. MASTER EXECUTIVE PROFILE BANNER */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* User Identity Details */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#1976D2] to-sky-400 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md border-2 border-white shrink-0 overflow-hidden">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {user?.name || 'Rekan Peneliti Inpartner'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0]">
                  {isAdmin ? (
                    <>
                      <Shield className="w-3 h-3 text-[#1976D2]" /> Administrator
                    </>
                  ) : (
                    'Corporate License'
                  )}
                </span>
              </div>

              {/* Job Title & Organization */}
              {(user?.job_title || user?.organization) && (
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate">
                  {user.job_title && <span>{user.job_title}</span>}
                  {user.job_title && user.organization && <span>•</span>}
                  {user.organization && (
                    <span className="text-[#1976D2]">{user.organization}</span>
                  )}
                </p>
              )}

              <p className="text-xs text-slate-500 font-supporting flex flex-wrap items-center gap-2">
                <span>{user?.email}</span>
                {user?.phone && <span>• {user.phone}</span>}
              </p>

              {user?.bio && (
                <p className="text-[11px] text-slate-500 font-supporting line-clamp-1 italic pt-0.5">
                  "{user.bio}"
                </p>
              )}
            </div>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto shrink-0">
            <Link to="/products">
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-bold rounded-xl border-[#B2D1F0] text-[#1976D2] hover:bg-[#D1E4F6]/40 flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Katalog Publikasi</span>
              </Button>
            </Link>

            <Link to="/custom-analysis">
              <Button
                size="sm"
                className="text-xs bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Layanan Kustom</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Executive Summary Metrics Strip (Clean, Uncramped, High-Value) */}
        <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1E4F6]/60 text-[#1976D2] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Koleksi Riset
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {dashboardData?.metrics?.total_documents || 0}{' '}
                <span className="text-xs font-normal text-slate-500">Publikasi</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Highlighter className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Sorotan Riset
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {dashboardData?.metrics?.total_highlights || 0}{' '}
                <span className="text-xs font-normal text-slate-500">Highlight</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Waktu Membaca
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {dashboardData?.metrics?.total_reading_hours || 0}{' '}
                <span className="text-xs font-normal text-slate-500">Jam Riset</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                Streak Konsisten
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                {dashboardData?.metrics?.current_streak || 0}{' '}
                <span className="text-xs font-normal text-slate-500">Hari Beruntun</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EXECUTIVE WORKSPACE NAVIGATION HUB (Categorized, Zero Horizontal Scrolling, Anti-Gepeng) */}
      <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
        {/* Hub Header & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Pusat Kendali Riset & Navigasi Workspace
              </h2>
              <p className="text-xs text-slate-500 font-supporting">
                Pilih modul riset, produktivitas harian, atau administrasi akun Anda.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#1976D2] animate-pulse" />
              <span>Aktif: {activeMeta.item.title}</span>
            </span>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsMenuHubExpanded(!isMenuHubExpanded)}
              className="text-xs font-bold rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer py-1.5 px-3"
            >
              {isMenuHubExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Sembunyikan Menu</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Buka Semua Menu</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Categorized Menu Columns (Visible Simultaneously, No Horizontal Scroll) */}
        {isMenuHubExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 animate-in fade-in duration-200">
            {menuCategories.map((cat) => {
              const CatIcon = cat.icon || Layers;
              return (
                <div
                  key={cat.id}
                  className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col justify-between space-y-3.5"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                      <CatIcon className="w-3.5 h-3.5 text-[#1976D2]" />
                      <span>{cat.title}</span>
                    </span>
                    {cat.badge && (
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        {cat.badge}
                      </span>
                    )}
                  </div>

                  {/* Category Menu Items */}
                  <div className="space-y-2">
                    {cat.items.map((item) => {
                      const isActive = activeTab === item.id;
                      const ItemIcon = item.icon || BarChart2;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full text-left p-3 rounded-xl transition-all duration-150 flex items-center justify-between gap-3 group border cursor-pointer ${
                            isActive
                              ? 'bg-[#1976D2] text-white border-[#1976D2] shadow-sm ring-2 ring-[#1976D2]/20'
                              : 'bg-white hover:bg-slate-100/70 text-slate-800 border-slate-200/90 hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-[#D1E4F6]/60 text-[#1976D2] group-hover:bg-[#1976D2] group-hover:text-white'
                              }`}
                            >
                              <ItemIcon className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <span
                                className={`text-xs sm:text-sm font-bold tracking-tight block truncate ${
                                  isActive
                                    ? 'text-white'
                                    : 'text-slate-900 group-hover:text-[#1976D2]'
                                }`}
                              >
                                {item.title}
                              </span>
                              <span
                                className={`text-[11px] font-supporting block truncate mt-0.5 ${
                                  isActive ? 'text-white/80' : 'text-slate-500'
                                }`}
                              >
                                {item.subtitle}
                              </span>
                            </div>
                          </div>

                          {/* Badge / Indicator */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.badge !== null && item.badge !== undefined && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  isActive
                                    ? 'bg-white text-[#1976D2]'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            <ChevronRight
                              className={`w-3.5 h-3.5 transition-transform ${
                                isActive
                                  ? 'text-white translate-x-0.5'
                                  : 'text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5'
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. ACTIVE WORKSPACE VIEWPORT */}
      <div ref={activeViewportRef} className="space-y-6 scroll-mt-24">
        {/* ACTIVE TAB CONTENT VIEW */}
        {activeTab === 'overview' && (
          <ProfileOverviewTab
            data={dashboardData}
            loading={dashboardLoading}
            onTabChange={setActiveTab}
          />
        )}

        {activeTab === 'pipeline' && <ResearchKanbanTab />}

        {activeTab === 'notebook' && <ResearchNotebookTab />}

        {activeTab === 'calendar' && <ReadingPlannerTab />}

        {activeTab === 'analytics' && <ActivityAnalyticsTab />}

        {activeTab === 'settings' && <ProfileSettingsTab />}

        {/* Tab: Order History */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-black text-slate-900">Riwayat Transaksi & Faktur</h2>
              <p className="text-xs text-slate-500 font-supporting mt-0.5">
                Catatan lengkap transaksi pembelian laporan riset dan unduhan faktur perpajakan resmi.
              </p>
            </div>

            {ordersLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <span className="w-6 h-6 border-2 border-[#1976D2] border-t-transparent rounded-full animate-spin" />
                <span>Memuat data transaksi...</span>
              </div>
            ) : orders.length === 0 ? (
              <Card className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 space-y-4">
                <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto" />
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">Belum Ada Riwayat Transaksi</h3>
                  <p className="text-xs text-slate-500 font-supporting">
                    Seluruh transaksi yang Anda selesaikan akan otomatis tercatat dan dapat diunduh faktur pajaknya di sini.
                  </p>
                </div>
                <Link to="/products">
                  <Button className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold rounded-xl">
                    Mulai Jelajahi Produk
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isPaid = order.payment_status === 'paid';
                  const isPending = order.payment_status === 'pending';

                  return (
                    <Card
                      key={order.id || order.order_number}
                      className="p-5 sm:p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {order.order_number}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isPending
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {order.payment_status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-supporting mt-0.5">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Transaksi Baru'}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 block font-supporting">
                            Nilai Transaksi
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {formatPrice(order.total_amount || order.amount || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Order items preview */}
                      <div className="space-y-2">
                        {order.items?.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs py-1"
                          >
                            <span className="font-semibold text-slate-800 truncate pr-4">
                              {item.product_title || item.title || 'Laporan Riset Inpartner'}
                            </span>
                            <span className="font-bold text-slate-600 shrink-0">
                              {formatPrice(item.price || 0)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Order action */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-400 font-supporting">
                          {order.corporate_name
                            ? `Faktur Korporasi: ${order.corporate_name}`
                            : 'Akun Pribadi'}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending && (
                            <Link to={`/payment/simulator/${order.order_number}`}>
                              <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                              >
                                Bayar Sekarang
                              </Button>
                            </Link>
                          )}
                          <Link to={`/orders/${order.order_number}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer"
                            >
                              <span>Detail & Invoice</span>
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Custom Analysis Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Permintaan Riset Kustom (Custom Requests)
                </h2>
                <p className="text-xs text-slate-500 font-supporting mt-0.5">
                  Pantau status kajian khusus, penelaahan data primer, dan pendampingan komite
                  investasi Anda.
                </p>
              </div>
              <Link to="/custom-analysis">
                <Button
                  size="sm"
                  className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ajukan Riset Baru</span>
                </Button>
              </Link>
            </div>

            {requestsLoading ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <span className="w-6 h-6 border-2 border-[#1976D2] border-t-transparent rounded-full animate-spin" />
                <span>Memuat data permintaan...</span>
              </div>
            ) : customRequests.length === 0 ? (
              <Card className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8 space-y-4">
                <Sparkles className="w-12 h-12 text-[#1976D2] mx-auto opacity-70" />
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Belum Ada Permintaan Riset Khusus
                  </h3>
                  <p className="text-xs text-slate-500 font-supporting">
                    Butuh kajian mendalam mengenai merger akuisisi, restrukturisasi perbankan, atau
                    skenario moneter tertutup? Ajukan konsultasi analisis kustom bersama analis senior
                    kami.
                  </p>
                </div>
                <Link to="/custom-analysis">
                  <Button className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold rounded-xl">
                    Ajukan Permintaan Analisis Kustom
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {customRequests.map((req) => (
                  <Card
                    key={req.id}
                    className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#1562AF] bg-[#D1E4F6]/60 px-2 py-0.5 rounded border border-[#B2D1F0]">
                          {req.sector || 'Sektor Finansial'}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5">{req.topic}</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-[#1976D2] border border-[#B2D1F0]">
                        {req.status || 'Dalam Penelaahan'}
                      </span>
                    </div>

                    {req.scope && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-supporting whitespace-pre-line">
                        {req.scope}
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-supporting border-t border-slate-100">
                      <span>Rentang Anggaran: {req.budget_range || 'Berdasarkan Lingkup'}</span>
                      <span>
                        Diajukan: {new Date(req.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
