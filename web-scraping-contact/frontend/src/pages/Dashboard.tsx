import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  Search, 
  FileSpreadsheet, 
  Activity, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
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
    },
    {
      label: 'HR & Decision Makers',
      value: stats?.kpi?.total_professionals ?? 0,
      icon: Users,
    },
    {
      label: 'Active Leads',
      value: stats?.kpi?.active_leads ?? 0,
      icon: Users,
    },
    {
      label: 'Verified Contacts',
      value: stats?.kpi?.total_contacts ?? 0,
      icon: Activity,
    },
    {
      label: 'Manual Searches',
      value: stats?.kpi?.total_searches ?? 0,
      icon: Search,
    },
    {
      label: 'Excel Batches',
      value: stats?.kpi?.total_batches ?? 0,
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Action Panel */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
        <div className="max-w-3xl">
          <h2 className="text-xl font-semibold text-[#172033] tracking-tight">
            Company Contact Scraper
          </h2>
          <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
            Search, discover, and verify corporate contacts, official websites, and decision makers from official sources.
          </p>

          {/* Quick Search Form */}
          <form onSubmit={handleQuickSearchSubmit} className="mt-5 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Enter company name (e.g. PT Gudang Garam Tbk, Telkom Indonesia)..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            <button
              type="submit"
              className="btn-primary whitespace-nowrap text-sm cursor-pointer"
            >
              <span>Search</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Quick Links */}
        <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('search')}
            className="btn-secondary text-xs cursor-pointer py-1.5 px-3"
          >
            <Search className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Single Search</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="btn-secondary text-xs cursor-pointer py-1.5 px-3"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Upload Excel</span>
          </button>
          <button
            onClick={() => onNavigate('companies')}
            className="btn-secondary text-xs cursor-pointer py-1.5 px-3"
          >
            <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Companies Directory</span>
          </button>
          <button
            onClick={() => onNavigate('decision-makers')}
            className="btn-secondary text-xs cursor-pointer py-1.5 px-3"
          >
            <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>HR Decision Makers</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-[#64748B] mb-2">
                <span className="text-xs font-medium truncate">{kpi.label}</span>
                <Icon className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <div className="text-2xl font-bold text-[#172033]">
                {loading ? (
                  <span className="inline-block w-10 h-6 bg-[#F1F5F9] animate-pulse rounded" />
                ) : (
                  kpi.value.toLocaleString()
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Recent Batches & Recent Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Excel Batches */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="font-semibold text-[#172033] text-sm">Recent Import Batches</h3>
            </div>
            <button
              onClick={() => onNavigate('import-history')}
              className="text-xs font-medium text-[#3B82F6] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {stats?.recent_batches?.length === 0 ? (
              <div className="p-6 text-center bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <FileSpreadsheet className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5" />
                <p className="text-xs text-[#64748B]">No import batches yet</p>
              </div>
            ) : (
              stats?.recent_batches?.map((batch: any) => {
                const percent = batch.valid_rows > 0 ? Math.round((batch.processed_rows / batch.valid_rows) * 100) : 0;
                return (
                  <div key={batch.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-medium text-[#172033] truncate">{batch.original_filename}</div>
                      <div className="text-[#64748B] mt-0.5">
                        {batch.processed_rows} / {batch.valid_rows} processed ({percent}%)
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        batch.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        batch.status === 'PROCESSING' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {batch.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="font-semibold text-[#172033] text-sm">Recent Searches</h3>
            </div>
            <button
              onClick={() => onNavigate('search-history')}
              className="text-xs font-medium text-[#3B82F6] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {stats?.recent_searches?.length === 0 ? (
              <div className="p-6 text-center bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                <Search className="w-6 h-6 text-[#94A3B8] mx-auto mb-1.5" />
                <p className="text-xs text-[#64748B]">No recent searches</p>
              </div>
            ) : (
              stats?.recent_searches?.map((item: any) => (
                <div key={item.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-[#172033] truncate">{item.query}</div>
                    <div className="text-[#64748B] mt-0.5">
                      {item.contacts_found_count} contacts found
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      item.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
