import React from 'react';
import { Clock, RotateCcw, CheckCircle2, FileEdit, X, History } from 'lucide-react';
import type { CmsRevisionItem } from '@/types/cms/builder';

interface RevisionHistoryDrawerProps {
  isOpen: boolean;
  revisions: CmsRevisionItem[];
  onClose: () => void;
  onRestore: (revision: CmsRevisionItem) => void;
}

export const RevisionHistoryDrawer: React.FC<RevisionHistoryDrawerProps> = ({
  isOpen,
  revisions,
  onClose,
  onRestore,
}) => {
  if (!isOpen) return null;

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Riwayat Revisi & Versi</h3>
              <p className="text-[11px] text-slate-500">Pulihkan draf ke versi sebelumnya dengan aman.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {revisions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Belum ada riwayat revisi tersimpan.</div>
          ) : (
            revisions.map((rev) => {
              const isPub = rev.status === 'published';
              return (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-[#F8FAFC] hover:border-[#B2D1F0] transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isPub ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <FileEdit className="w-4 h-4 text-[#1976D2] shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {rev.label || (isPub ? `Published v${rev.version}` : 'Draft Snapshot')}
                        </p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {formatTime(rev.created_at)}
                          {rev.created_by_name ? ` • ${rev.created_by_name}` : ''}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isPub
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      v{rev.version}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">{rev.sections_count} section</span>
                    <button
                      type="button"
                      onClick={() => onRestore(rev)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-[#B2D1F0] text-[#1976D2] hover:bg-[#D1E4F6]/40 text-[11px] font-bold"
                    >
                      <RotateCcw className="w-3 h-3" /> Pulihkan ke Draf
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

