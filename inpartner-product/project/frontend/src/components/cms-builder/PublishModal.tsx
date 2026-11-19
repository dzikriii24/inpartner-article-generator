import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Globe, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { cmsApi } from '@/services/cms/cmsApi';
import type { CmsPageTree, CmsPublishValidation } from '@/types/cms/builder';

interface PublishModalProps {
  isOpen: boolean;
  tree: CmsPageTree;
  currentVersion: number;
  publishing: boolean;
  onClose: () => void;
  onConfirmPublish: (label?: string) => void;
}

export const PublishModal: React.FC<PublishModalProps> = ({
  isOpen,
  tree,
  currentVersion,
  publishing,
  onClose,
  onConfirmPublish,
}) => {
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<CmsPublishValidation | null>(null);
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLabel(`Pembaruan Homepage v${currentVersion + 1}`);
    setValidating(true);
    cmsApi
      .validateDraft(tree)
      .then((res) => setValidation(res.data))
      .catch(() => setValidation(null))
      .finally(() => setValidating(false));
  }, [isOpen, tree, currentVersion]);

  if (!isOpen) return null;

  const hasErrors = Boolean(validation && !validation.valid);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Publikasikan Perubahan ke Storefront</h3>
              <p className="text-[11px] text-slate-500">
                Sistem memvalidasi seluruh komponen, tautan, dan gambar sebelum menggantikan halaman live.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {validating ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-[#1976D2]" /> Memeriksa validitas konfigurasi...
          </div>
        ) : validation ? (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Section Aktif</span>
                <p className="text-base font-extrabold text-slate-900 mt-0.5">
                  {validation.active_sections} / {validation.total_sections}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400">Versi Berikutnya</span>
                <p className="text-base font-extrabold text-[#1976D2] mt-0.5">v{currentVersion + 1}</p>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                <div className="font-bold text-rose-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Ditemukan Error Validasi ({validation.errors.length})
                </div>
                <ul className="list-disc pl-5 text-rose-700 space-y-0.5 text-[11px]">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                <div className="font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> Catatan Pemeriksaan ({validation.warnings.length})
                </div>
                <ul className="list-disc pl-5 text-amber-700 space-y-0.5 text-[11px]">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.valid && validation.warnings.length === 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Seluruh section, media, dan tautan lolos pemeriksaan pra-publikasi.</span>
              </div>
            )}
          </div>
        ) : null}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Versi Publikasi</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Contoh: Pembaruan Hero & Banner Riset Q4"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={publishing || validating || hasErrors}
            onClick={() => onConfirmPublish(label)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{publishing ? 'Mempublikasikan...' : 'Konfirmasi & Publikasikan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

