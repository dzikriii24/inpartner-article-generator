import React, { useState, useEffect } from 'react';
import { FileDown, Download, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { api, ExportItem } from '../services/api';

export const ExportHistory: React.FC = () => {
  const [exportsList, setExportsList] = useState<ExportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadExports();
  }, [page]);

  const loadExports = async () => {
    try {
      setIsLoading(true);
      const res = await api.getExports({ page, limit: 15 });
      setExportsList(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      console.error('Failed to load exports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-white/60 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Export History & Downloads</h2>
          <p className="text-xs text-slate-500 mt-1">
            Access and re-download generated multi-sheet Excel files containing company overviews and contact directories.
          </p>
        </div>

        <button
          onClick={loadExports}
          disabled={isLoading}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 shadow-xs"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-fuchsia-600' : ''}`} />
        </button>
      </div>

      {/* Exports Table */}
      <div className="glass-panel rounded-3xl border border-white/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-800 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Filename</th>
                <th className="p-4 text-center">Format</th>
                <th className="p-4 text-center">Companies</th>
                <th className="p-4 text-center">Contacts</th>
                <th className="p-4">File Size</th>
                <th className="p-4">Created Date</th>
                <th className="p-4 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white/70">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-fuchsia-600" />
                    <span>Loading exports...</span>
                  </td>
                </tr>
              ) : exportsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <FileDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No export files generated yet</p>
                  </td>
                </tr>
              ) : (
                exportsList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>{exp.filename}</span>
                      </div>
                      {exp.batch_id && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          From Batch #{exp.batch_id}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold uppercase text-[10px] border border-emerald-200">
                        {exp.export_format}
                      </span>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-800">
                      {exp.total_companies}
                    </td>
                    <td className="p-4 text-center font-bold text-fuchsia-700">
                      {exp.total_contacts}
                    </td>
                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {formatFileSize(exp.file_size)}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {exp.created_at ? new Date(exp.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="p-4 text-right">
                      <a
                        href={api.getDownloadUrl(exp.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white btn-primary-gradient inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-white/40 flex items-center justify-between text-xs text-slate-500">
          <span>Total: {total} files</span>
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
