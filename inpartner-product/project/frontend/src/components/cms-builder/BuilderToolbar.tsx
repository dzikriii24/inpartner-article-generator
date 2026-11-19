import React from 'react';
import {
  Check,
  Cloud,
  CloudOff,
  ExternalLink,
  Eye,
  EyeOff,
  Grid,
  History,
  Maximize2,
  Minimize2,
  Monitor,
  Palette,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { CmsLocale, ViewportMode } from '@/types/cms/builder';
import type { SaveStatus } from '@/hooks/cms/useCmsBuilder';

interface BuilderToolbarProps {
  version: number;
  hasUnpublishedChanges: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  editingLocale: CmsLocale;
  onChangeLocale: (loc: CmsLocale) => void;
  viewport: ViewportMode;
  onChangeViewport: (v: ViewportMode) => void;
  zoom: number | 'fit';
  onChangeZoom: (z: number | 'fit') => void;
  showGuides: boolean;
  onToggleGuides: () => void;
  previewMode: boolean;
  onTogglePreviewMode: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRefreshPreview: () => void;
  onOpenHistory: () => void;
  onOpenTheme: () => void;
  onSaveDraft: () => void;
  onOpenReset: () => void;
  onOpenPublish: () => void;
}

export const BuilderToolbar: React.FC<BuilderToolbarProps> = ({
  version,
  hasUnpublishedChanges,
  saveStatus,
  lastSavedAt,
  editingLocale,
  onChangeLocale,
  viewport,
  onChangeViewport,
  zoom,
  onChangeZoom,
  showGuides,
  onToggleGuides,
  previewMode,
  onTogglePreviewMode,
  fullscreen,
  onToggleFullscreen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRefreshPreview,
  onOpenHistory,
  onOpenTheme,
  onSaveDraft,
  onOpenReset,
  onOpenPublish,
}) => {
  const zoomLabel = zoom === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`;

  const stepZoom = (delta: number) => {
    const current = zoom === 'fit' ? 1 : zoom;
    const next = Math.max(0.5, Math.min(1.25, Number((current + delta).toFixed(2))));
    onChangeZoom(next);
  };

  return (
    <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
      {/* Left: Page Badge, Status & Language */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg bg-[#D1E4F6] text-[#0C3B69] text-[11px] font-bold border border-[#B2D1F0]">
            Homepage v{version}
          </span>
          {hasUnpublishedChanges ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
              Draf Belum Dipublikasikan
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Live Sinkron
            </span>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        {/* Autosave Status */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          {saveStatus === 'saving' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1976D2]" />
              <span>Menyimpan draf...</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <CloudOff className="w-3.5 h-3.5 text-rose-600" />
              <span className="text-rose-600 font-semibold">Gagal autosave</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {saveStatus === 'dirty'
                  ? 'Perubahan belum tersimpan'
                  : lastSavedAt
                  ? `Tersimpan ${new Date(lastSavedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Draf siap'}
              </span>
            </>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200 hidden md:block" />

        {/* Locale Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          {(['id', 'en', 'ko'] as CmsLocale[]).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => onChangeLocale(loc)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition-colors ${
                editingLocale === loc
                  ? 'bg-white text-[#1976D2] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={`Edit Bahasa ${loc.toUpperCase()}`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Center: Responsive Breakpoints & Canvas Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => onChangeViewport('desktop')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewport === 'desktop' ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Desktop Preview (1280px)"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeViewport('tablet')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewport === 'tablet' ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Tablet Preview (768px)"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeViewport('mobile')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewport === 'mobile' ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Mobile Preview (390px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden xl:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => stepZoom(-0.15)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
            title="Perkecil Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChangeZoom(zoom === 'fit' ? 1 : 'fit')}
            className="px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:text-[#1976D2] min-w-[42px] text-center"
            title="Klik untuk toggle Fit to Screen / 100%"
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            onClick={() => stepZoom(0.15)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900"
            title="Perbesar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid Guides & Refresh */}
        <button
          type="button"
          onClick={onToggleGuides}
          className={`p-1.5 rounded-xl border text-xs transition-colors ${
            showGuides
              ? 'bg-[#D1E4F6]/60 border-[#B2D1F0] text-[#1976D2]'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="Garis Bantu Grid & Container"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onRefreshPreview}
          className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#1976D2]"
          title="Muat Ulang Preview & Katalog"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center gap-1 ml-1">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-35"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-35"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={onOpenTheme}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          title="Pengaturan Global Theme & Typography"
        >
          <Palette className="w-3.5 h-3.5 text-[#1976D2]" />
          <span className="hidden lg:inline">Tema</span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          title="Riwayat Revisi"
        >
          <History className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden xl:inline">Revisi</span>
        </button>

        <button
          type="button"
          onClick={onTogglePreviewMode}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
            previewMode
              ? 'bg-[#0F172A] text-white border-[#0F172A]'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Mode Pratinjau Bersih di Editor"
        >
          {previewMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{previewMode ? 'Keluar Preview' : 'Preview'}</span>
        </button>

        <a
          href="/?preview=cms"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          title="Buka Pratinjau Halaman Penuh (Tab Baru)"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#1976D2]" />
        </a>

        <button
          type="button"
          onClick={onOpenReset}
          className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600"
          title="Kembalikan Konfigurasi Default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          title={fullscreen ? 'Keluar Mode Studio Penuh' : 'Mode Studio Penuh'}
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <button
          type="button"
          onClick={onSaveDraft}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#B2D1F0] bg-[#F0F6FC] hover:bg-[#D1E4F6] text-[#0C3B69] text-xs font-bold"
          title="Simpan Draf & Checkpoint (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Simpan Draf</span>
        </button>

        <button
          type="button"
          onClick={onOpenPublish}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white text-xs font-bold shadow-xs transition-all"
        >
          <span>Publish</span>
        </button>
      </div>
    </div>
  );
};

