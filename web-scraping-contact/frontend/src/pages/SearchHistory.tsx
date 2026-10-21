import React, { useState, useEffect } from 'react';
import { History, Search, ArrowRight, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, SearchHistoryItem } from '../services/api';

interface SearchHistoryProps {
  onRerunSearch: (query: string) => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({ onRerunSearch }) => {
  const [historyItems, setHistoryItems] = useState<SearchHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [page]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const res = await api.getSearchHistory({ page, limit: 15 });
      setHistoryItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to load search history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Manual Search History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track all previously executed company searches, status, and contact yields.
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={isLoading}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-fuchsia-600' : ''}`} />
        </button>
      </div>

      {/* History Table */}
      <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Search Query</th>
                <th className="p-4">Type</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Contacts Found</th>
                <th className="p-4">Timestamp</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fuchsia-600" />
                    <span>Loading search records...</span>
                  </td>
                </tr>
              ) : historyItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No search records yet</p>
                  </td>
                </tr>
              ) : (
                historyItems.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <span>{h.query}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-600 uppercase text-[10px]">
                        {h.search_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        h.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-800">
                      {h.contacts_found_count}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {h.created_at ? new Date(h.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onRerunSearch(h.query)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50 hover:border-fuchsia-200 transition-colors shadow-xs inline-flex items-center gap-1"
                      >
                        <span>Re-search</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-white/40 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} searches</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
