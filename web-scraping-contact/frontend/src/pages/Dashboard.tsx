import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  Search, 
  FileSpreadsheet, 
  Activity, 
  Sparkles, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  Download,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

interface DashboardProps {
  onNavigate: (tab: string, state?: any) => void;
  onOpenUpload: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenUpload }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quickQuery, setQuickQuery] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      onNavigate('search', { query: quickQuery.trim() });
    }
  };

  const kpis = [
    {
      label: 'Total Companies',
      value: stats?.kpi?.total_companies ?? 0,
      icon: Building2,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20'
    },
    {
      label: 'Verified Contacts',
      value: stats?.kpi?.total_contacts ?? 0,
      icon: Users,
      color: 'from-fuchsia-500 to-pink-600',
      shadow: 'shadow-fuchsia-500/20'
    },
    {
      label: 'Manual Searches',
      value: stats?.kpi?.total_searches ?? 0,
      icon: Search,
      color: 'from-amber-400 to-orange-500',
      shadow: 'shadow-orange-500/20'
    },
    {
      label: 'Excel Batches',
      value: stats?.kpi?.total_batches ?? 0,
      icon: FileSpreadsheet,
      color: 'from-emerald-400 to-teal-600',
      shadow: 'shadow-emerald-500/20'
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Hero Glass Banner with Quick Search */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden border border-white/60">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-fuchsia-400/20 via-indigo-400/20 to-transparent rounded-full blur-3xl -z-10" />
        
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-50 border border-fuchsia-200/80 text-xs font-semibold text-fuchsia-700 mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
            <span>AI-Powered Contact Discovery & Scraping</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Company Contact Intelligence Platform
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Discover verified corporate contacts, official emails, telephone lines, and executives using web scraping, structured directories, and grounded Gemini AI.
          </p>

          {/* Quick Search Form */}
          <form onSubmit={handleQuickSearchSubmit} className="mt-6 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Enter company name (e.g. Triniti Dinamik Tbk, PT Telkom Indonesia)..."
                className="w-full pl-12 pr-4 py-3 bg-white/90 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 focus:border-fuchsia-500 shadow-sm transition-all text-slate-800 placeholder-slate-400 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl text-sm font-semibold text-white btn-primary-gradient flex items-center gap-2 shadow-md shadow-fuchsia-500/25 cursor-pointer whitespace-nowrap"
            >
              <span>Search & Enrich</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Quick action cards on the side */}
        <div className="mt-6 pt-6 border-t border-slate-200/60 flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('search')}
            className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all hover:border-fuchsia-300 shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-fuchsia-600" />
            <span>Single Company Search</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all hover:border-emerald-300 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Upload Excel Pipeline</span>
          </button>
          <button
            onClick={() => onNavigate('companies')}
            className="flex items-center gap-2 px-4 py-2 bg-white/70 hover:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all hover:border-blue-300 shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>View Companies Database</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card rounded-2xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2">
                    {loading ? (
                      <span className="inline-block w-12 h-8 bg-slate-200 animate-pulse rounded-md" />
                    ) : (
                      kpi.value.toLocaleString()
                    )}
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-lg ${kpi.shadow}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Recent Batches & Recent Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Excel Batches */}
        <div className="glass-panel rounded-3xl p-6 border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">Recent Import Batches</h3>
            </div>
            <button
              onClick={() => onNavigate('import-history')}
              className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recent_batches?.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No import batches uploaded yet</p>
                <button
                  onClick={onOpenUpload}
                  className="mt-3 text-xs font-semibold text-fuchsia-600 hover:underline"
                >
                  Upload your first Excel file
                </button>
              </div>
            ) : (
              stats?.recent_batches?.map((b: any) => (
                <div
                  key={b.id}
                  onClick={() => onNavigate('import', { batchId: b.id })}
                  className="p-4 bg-white/70 hover:bg-white border border-slate-200/80 rounded-2xl cursor-pointer transition-all hover:shadow-xs hover:border-slate-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800 line-clamp-1">
                      {b.original_filename}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      b.status === 'PROCESSING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' :
                      b.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{b.processed_rows} / {b.valid_rows} companies processed</span>
                    <span>{b.created_at ? new Date(b.created_at).toLocaleDateString() : ''}</span>
                  </div>

                  {b.valid_rows > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((b.processed_rows / b.valid_rows) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Manual Searches */}
        <div className="glass-panel rounded-3xl p-6 border border-white/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Recent Searches</h3>
            </div>
            <button
              onClick={() => onNavigate('search-history')}
              className="text-xs font-semibold text-fuchsia-600 hover:text-fuchsia-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats?.recent_searches?.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">No recent searches yet</p>
                <button
                  onClick={() => onNavigate('search')}
                  className="mt-3 text-xs font-semibold text-fuchsia-600 hover:underline"
                >
                  Try searching a company
                </button>
              </div>
            ) : (
              stats?.recent_searches?.map((s: any) => (
                <div
                  key={s.id}
                  onClick={() => onNavigate('search', { query: s.query })}
                  className="p-3.5 bg-white/70 hover:bg-white border border-slate-200/80 rounded-2xl cursor-pointer transition-all hover:shadow-xs hover:border-slate-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{s.query}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {s.contacts_found_count} contacts found • {s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    s.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
