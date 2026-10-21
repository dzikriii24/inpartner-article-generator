import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RotateCcw, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api, BatchItem } from '../services/api';

interface ImportHistoryProps {
  onOpenBatch: (batchId: number) => void;
}

export const ImportHistory: React.FC<ImportHistoryProps> = ({ onOpenBatch }) => {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadBatches();
  }, [page]);

  const loadBatches = async () => {
    try {
      setIsLoading(true);
      const res = await api.getImportBatches({ page, limit: 15 });
      setBatches(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (batchId: number) => {
    try {
      const res = await api.createExport({ batch_id: batchId });
      window.open(api.getDownloadUrl(res.export_id), '_blank');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Import Batch History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Review status, progress, and download exports from all previously uploaded Excel spreadsheets.
          </p>
        </div>

        <button
          onClick={loadBatches}
          disabled={isLoading}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-fuchsia-600' : ''}`} />
        </button>
      </div>

      {/* Batches Table */}
      <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Batch ID & File</th>
                <th className="p-4">Sheet / Column</th>
                <th className="p-4">Status</th>
                <th className="p-4">Progress</th>
                <th className="p-4 text-center">Success / Partial / Fail</th>
                <th className="p-4">Uploaded</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fuchsia-600" />
                    <span>Loading batches...</span>
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No import batches uploaded yet</p>
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>{b.original_filename}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        ID: #{b.id}
                      </div>
                    </td>
                    <td className="p-4 text-slate-700">
                      <div>{b.selected_sheet}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Col: {b.selected_company_column}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        b.status === 'PROCESSING' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' :
                        b.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        b.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4 min-w-[120px]">
                      <div className="text-[11px] font-semibold text-slate-700 mb-1">
                        {b.processed_rows} / {b.valid_rows} ({b.progress_percent}%)
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${b.progress_percent}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-emerald-600 font-semibold">{b.success_rows || 0}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-amber-600 font-semibold">{b.partial_rows || 0}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-rose-600 font-semibold">{b.failed_rows || 0}</span>
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onOpenBatch(b.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-white hover:border-fuchsia-300 shadow-xs transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDownload(b.id)}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 shadow-xs transition-colors"
                          title="Download Excel"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-white/40 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} batches</span>
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
