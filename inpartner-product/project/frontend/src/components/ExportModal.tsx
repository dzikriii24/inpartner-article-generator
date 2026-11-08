import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Printer,
  Download,
  FileText,
  Highlighter,
  MessageSquare,
  Sparkles,
  Bookmark,
  Check,
  CheckCircle2,
  Sliders,
  Eye,
  Layers,
  Settings2,
  Calendar,
  User,
  ShieldCheck,
  Building,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Button } from '@/components/lightswind/button';
import { toast } from 'sonner';
import { applyHighlightsSafely, exportVectorPdf } from '@/utils/pdfGenerator';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  contentHtml: string;
  totalPages: number;
  highlights: any[];
  notes: any[];
  bookmarks: any[];
  aiMessages: any[];
  pageSummaries: Record<number, any>;
  initialMode?: 'download' | 'print';
}

export type ExportPreset = 'original' | 'annotated' | 'report' | 'notes_only';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  product,
  contentHtml,
  totalPages,
  highlights = [],
  notes = [],
  bookmarks = [],
  aiMessages = [],
  pageSummaries = {},
  initialMode = 'download',
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');
  const [selectedPreset, setSelectedPreset] = useState<ExportPreset>('annotated');

  // 1. Content Options
  const [includeMainDoc, setIncludeMainDoc] = useState(true);
  const [pageRangeType, setPageRangeType] = useState<'all' | 'custom'>('all');
  const [customPageRange, setCustomPageRange] = useState('1-' + totalPages);

  // 2. Highlights & Bookmarks
  const [includeHighlights, setIncludeHighlights] = useState(true);
  const [preserveHighlightColors, setPreserveHighlightColors] = useState(true);
  const [highlightPlacement, setHighlightPlacement] = useState<'inline' | 'collection' | 'both'>('inline');
  const [includeBookmarks, setIncludeBookmarks] = useState(true);

  // 3. Notes & Annotations
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeNoteDates, setIncludeNoteDates] = useState(true);
  const [includeNotePages, setIncludeNotePages] = useState(true);
  const [includeNoteQuotes, setIncludeNoteQuotes] = useState(true);

  // 4. Summaries & AI Insights
  const [includeSummaries, setIncludeSummaries] = useState(false);
  const [includeAiInsights, setIncludeAiInsights] = useState(false);
  const [selectedAiMessageIds, setSelectedAiMessageIds] = useState<string[]>([]);
  const [aiSelectAccordionOpen, setAiSelectAccordionOpen] = useState(false);

  // 5. Cover & Metadata
  const [includeCover, setIncludeCover] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  // 6. Paper Setup
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Progress state
  const [isExporting, setIsExporting] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Available AI Q&As (only assistant messages that answer a user prompt)
  const availableAiPairs = useMemo(() => {
    const pairs: Array<{ id: string; question: string; answer: string; model?: string }> = [];
    for (let i = 0; i < aiMessages.length; i++) {
      if (aiMessages[i].role === 'user' && aiMessages[i + 1]?.role === 'assistant') {
        pairs.push({
          id: aiMessages[i + 1].id || `pair-${i}`,
          question: aiMessages[i].text,
          answer: aiMessages[i + 1].text,
          model: aiMessages[i + 1].model,
        });
      }
    }
    return pairs;
  }, [aiMessages]);

  // Apply Preset
  const handleApplyPreset = (preset: ExportPreset) => {
    setSelectedPreset(preset);
    if (preset === 'original') {
      setIncludeCover(false);
      setIncludeMainDoc(true);
      setPageRangeType('all');
      setIncludeHighlights(false);
      setHighlightPlacement('inline');
      setIncludeBookmarks(false);
      setIncludeNotes(false);
      setIncludeSummaries(false);
      setIncludeAiInsights(false);
      setIncludeMetadata(false);
    } else if (preset === 'annotated') {
      setIncludeCover(true);
      setIncludeMainDoc(true);
      setPageRangeType('all');
      setIncludeHighlights(true);
      setHighlightPlacement('inline');
      setIncludeBookmarks(true);
      setIncludeNotes(true);
      setIncludeNoteDates(true);
      setIncludeNotePages(true);
      setIncludeNoteQuotes(true);
      setIncludeSummaries(false);
      setIncludeAiInsights(false);
      setIncludeMetadata(true);
    } else if (preset === 'report') {
      setIncludeCover(true);
      setIncludeMainDoc(true);
      setPageRangeType('all');
      setIncludeHighlights(true);
      setHighlightPlacement('both');
      setIncludeBookmarks(true);
      setIncludeNotes(true);
      setIncludeNoteDates(true);
      setIncludeNotePages(true);
      setIncludeNoteQuotes(true);
      setIncludeSummaries(true);
      setIncludeAiInsights(availableAiPairs.length > 0);
      if (availableAiPairs.length > 0 && selectedAiMessageIds.length === 0) {
        setSelectedAiMessageIds(availableAiPairs.map((p) => p.id));
      }
      setIncludeMetadata(true);
    } else if (preset === 'notes_only') {
      setIncludeCover(true);
      setIncludeMainDoc(false);
      setIncludeHighlights(true);
      setHighlightPlacement('collection');
      setIncludeBookmarks(true);
      setIncludeNotes(true);
      setIncludeNoteDates(true);
      setIncludeNotePages(true);
      setIncludeNoteQuotes(true);
      setIncludeSummaries(true);
      setIncludeAiInsights(availableAiPairs.length > 0);
      setIncludeMetadata(true);
    }
  };

  // Parse page range
  const filteredPages = useMemo(() => {
    if (pageRangeType === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = new Set<number>();
    const parts = customPageRange.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
            pages.add(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          pages.add(p);
        }
      }
    }
    return pages.size > 0
      ? Array.from(pages).sort((a, b) => a - b)
      : Array.from({ length: totalPages }, (_, i) => i + 1);
  }, [pageRangeType, customPageRange, totalPages]);

  // Prepared HTML with inline highlights (safely targeting text nodes only, never HTML attributes/tags)
  const preparedMainDocHtml = useMemo(() => {
    if (!contentHtml) return '';
    if (!includeHighlights || highlightPlacement === 'collection' || !highlights.length) {
      return contentHtml;
    }
    return applyHighlightsSafely(contentHtml, highlights, preserveHighlightColors);
  }, [contentHtml, includeHighlights, highlightPlacement, preserveHighlightColors, highlights]);

  // Generated Filename
  const exportFilename = useMemo(() => {
    const rawSlug = product?.slug || 'inpartner-research';
    const dateStr = new Date().toISOString().split('T')[0];
    return `${rawSlug}-${selectedPreset}-${dateStr}`;
  }, [product?.slug, selectedPreset]);

  // Execute Browser Print Dialog (Native Vector Output with Total Layout Isolation)
  const handlePrint = () => {
    if (!previewContainerRef.current) return;
    document.body.classList.add('inpartner-exporting-print');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('inpartner-exporting-print');
    }, 1000);
  };

  // Execute Pure Vector PDF Download (True Selectable Text, Copas, & Ctrl+F Support)
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    const toastId = toast.loading('Menyusun dokumen PDF teks vektor (selectable & copyable)...');

    try {
      await exportVectorPdf({
        product,
        contentHtml,
        highlights,
        notes,
        aiPairs: availableAiPairs,
        includeCover,
        includeMainDoc,
        includeHighlights,
        highlightPlacement,
        includeNotes,
        includeNoteDates,
        includeNotePages,
        includeNoteQuotes,
        includeAiInsights,
        selectedAiMessageIds,
        includeMetadata,
        paperSize,
        paperOrientation,
        exportFilename,
      });

      toast.success(`PDF berhasil diunduh: ${exportFilename}.pdf (Teks vektor dapat dicopas)`, { id: toastId });
      onClose();
    } catch (err) {
      console.error('Vector PDF export failed', err);
      toast.error('Gagal menyusun PDF vektor otomatis. Mengalihkan ke dialog cetak browser sebagai alternatif teks vektor.', { id: toastId });
      handlePrint();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-6xl max-h-[94vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* MODAL HEADER */}
        <header className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center font-bold">
              <Printer className="w-5 h-5 text-[#1976D2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Cetak & Ekspor Dokumen Riset
              </h2>
              <p className="text-xs text-slate-500 font-supporting">
                Sesuaikan kelengkapan konten, kumpulan sorotan, catatan, dan ringkasan eksekutif.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Config vs Live Preview */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'config'
                    ? 'bg-white text-[#1976D2] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Konfigurasi</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#1976D2] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* MODAL BODY (SPLIT OR SWITCHABLE VIEW) */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDE: CONFIGURATION CONTROLS */}
          <div
            className={`w-full lg:w-[48%] overflow-y-auto p-5 sm:p-6 space-y-6 border-r border-slate-200 bg-white ${
              activeTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* VECTOR PDF GUARANTEE NOTICE */}
            <div className="p-3.5 bg-sky-50/80 border border-sky-200 rounded-2xl flex items-start gap-2.5 text-xs text-sky-900">
              <ShieldCheck className="w-4 h-4 text-[#1976D2] shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-bold text-slate-900 block">Dokumen PDF Teks Vektor (Dapat Dicopas)</span>
                <span className="text-slate-600 font-supporting text-[11px] block">
                  Hasil unduh & cetak menggunakan format teks vektor murni (bukan gambar raster). Seluruh teks tajam, dapat dicari (Ctrl+F), dan dapat disalin langsung.
                </span>
              </div>
            </div>

            {/* 1. EXPORT PRESETS */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Pilih Preset Ekspor
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('original')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    selectedPreset === 'original'
                      ? 'bg-[#D1E4F6]/50 border-[#1976D2] ring-2 ring-[#1976D2]/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">1. Original Document</div>
                  <div className="text-[11px] text-slate-500 font-supporting">Dokumen asli bersih tanpa anotasi</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('annotated')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    selectedPreset === 'annotated'
                      ? 'bg-[#D1E4F6]/50 border-[#1976D2] ring-2 ring-[#1976D2]/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-[#1976D2]">2. Annotated Document</div>
                  <div className="text-[11px] text-slate-500 font-supporting">Dokumen + highlight kuning & catatan</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('report')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    selectedPreset === 'report'
                      ? 'bg-[#D1E4F6]/50 border-[#1976D2] ring-2 ring-[#1976D2]/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">3. Research Report</div>
                  <div className="text-[11px] text-slate-500 font-supporting">Lengkap: cover, teks, rekap, ringkasan</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset('notes_only')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                    selectedPreset === 'notes_only'
                      ? 'bg-[#D1E4F6]/50 border-[#1976D2] ring-2 ring-[#1976D2]/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900">4. Research Notes Only</div>
                  <div className="text-[11px] text-slate-500 font-supporting">Hanya rekap anotasi & insight AI</div>
                </button>
              </div>
            </div>

            {/* 2. DOKUMEN UTAMA & HALAMAN */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  1. Konten Dokumen Utama
                </label>
                <input
                  type="checkbox"
                  id="incMainDoc"
                  checked={includeMainDoc}
                  onChange={(e) => setIncludeMainDoc(e.target.checked)}
                  className="rounded text-[#1976D2] focus:ring-[#1976D2] cursor-pointer"
                />
              </div>

              {includeMainDoc && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="pageRange"
                        checked={pageRangeType === 'all'}
                        onChange={() => setPageRangeType('all')}
                        className="text-[#1976D2] focus:ring-[#1976D2]"
                      />
                      <span>Seluruh Halaman (1 – {totalPages})</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                      <input
                        type="radio"
                        name="pageRange"
                        checked={pageRangeType === 'custom'}
                        onChange={() => setPageRangeType('custom')}
                        className="text-[#1976D2] focus:ring-[#1976D2]"
                      />
                      <span>Halaman Tertentu</span>
                    </label>
                  </div>

                  {pageRangeType === 'custom' && (
                    <div className="space-y-1 pt-1">
                      <input
                        type="text"
                        value={customPageRange}
                        onChange={(e) => setCustomPageRange(e.target.value)}
                        placeholder="contoh: 1-2 atau 1, 3, 4"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-[#1976D2]"
                      />
                      <span className="text-[10px] text-slate-400">
                        Halaman terpilih: {filteredPages.join(', ')} (Total {filteredPages.length} halaman)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. HIGHLIGHT & PENANDA */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  2. Sorotan Teks (Highlights)
                </label>
                <span className="text-[11px] font-bold text-[#1976D2] bg-[#D1E4F6] px-2 py-0.5 rounded-full">
                  {highlights.length} Sorotan Tersedia
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeHighlights}
                    onChange={(e) => setIncludeHighlights(e.target.checked)}
                    className="rounded text-[#1976D2] focus:ring-[#1976D2]"
                  />
                  <span>Sertakan Teks yang Disorot ({highlights.length})</span>
                </label>

                {includeHighlights && (
                  <div className="pl-6 space-y-2 text-[11px] text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveHighlightColors}
                        onChange={(e) => setPreserveHighlightColors(e.target.checked)}
                        className="rounded text-[#1976D2] focus:ring-[#1976D2]"
                      />
                      <span>Pertahankan Warna Sorotan (Kuning & Kategori Warna)</span>
                    </label>

                    <div className="pt-1 space-y-1">
                      <div className="font-semibold text-slate-700">Penempatan Sorotan:</div>
                      <select
                        value={highlightPlacement}
                        onChange={(e: any) => setHighlightPlacement(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                      >
                        <option value="inline">Ditampilkan Langsung pada Dokumen (Inline)</option>
                        <option value="collection">Kumpulkan di Bagian Research Highlights Collection</option>
                        <option value="both">Keduanya (Inline Dokumen & Rekap Collection)</option>
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={includeBookmarks}
                        onChange={(e) => setIncludeBookmarks(e.target.checked)}
                        className="rounded text-[#1976D2] focus:ring-[#1976D2]"
                      />
                      <span>Sertakan Bookmark Halaman ({bookmarks.length})</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 4. CATATAN & ANOTASI RISET */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  3. Catatan & Anotasi Riset
                </label>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  {notes.length} Catatan Tersedia
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className="rounded text-[#1976D2] focus:ring-[#1976D2]"
                  />
                  <span>Sertakan Catatan Pribadi ({notes.length})</span>
                </label>

                {includeNotes && (
                  <div className="pl-6 space-y-1.5 text-[11px] text-slate-600">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNotePages}
                        onChange={(e) => setIncludeNotePages(e.target.checked)}
                        className="rounded text-[#1976D2]"
                      />
                      <span>Sertakan Nomor Halaman Sumber</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNoteQuotes}
                        onChange={(e) => setIncludeNoteQuotes(e.target.checked)}
                        className="rounded text-[#1976D2]"
                      />
                      <span>Sertakan Kutipan Teks Terkait</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeNoteDates}
                        onChange={(e) => setIncludeNoteDates(e.target.checked)}
                        className="rounded text-[#1976D2]"
                      />
                      <span>Sertakan Tanggal Pembuatan Catatan</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 5. RINGKASAN & AI INSIGHTS */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Ringkasan & AI Insights
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeSummaries}
                    onChange={(e) => setIncludeSummaries(e.target.checked)}
                    className="rounded text-[#1976D2]"
                  />
                  <span>Sertakan Ringkasan Eksekutif & Poin Kunci Halaman</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeAiInsights}
                    onChange={(e) => {
                      setIncludeAiInsights(e.target.checked);
                      if (e.target.checked && selectedAiMessageIds.length === 0) {
                        setSelectedAiMessageIds(availableAiPairs.map((p) => p.id));
                      }
                    }}
                    className="rounded text-[#1976D2]"
                  />
                  <span>Sertakan Analisis AI Terpilih ({availableAiPairs.length} Tanya Jawab)</span>
                </label>

                {includeAiInsights && availableAiPairs.length > 0 && (
                  <div className="pl-6 pt-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => setAiSelectAccordionOpen(!aiSelectAccordionOpen)}
                      className="text-[11px] font-bold text-[#1976D2] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        Pilih Tanya Jawab AI ({selectedAiMessageIds.length} dari {availableAiPairs.length} terpilih)
                      </span>
                      {aiSelectAccordionOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {aiSelectAccordionOpen && (
                      <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                        {availableAiPairs.map((pair) => {
                          const isChecked = selectedAiMessageIds.includes(pair.id);
                          return (
                            <label
                              key={pair.id}
                              className="flex items-start gap-2 p-1.5 hover:bg-white rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAiMessageIds((prev) => [...prev, pair.id]);
                                  } else {
                                    setSelectedAiMessageIds((prev) => prev.filter((id) => id !== pair.id));
                                  }
                                }}
                                className="mt-0.5 rounded text-[#1976D2]"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-800 line-clamp-1">{pair.question}</div>
                                <div className="text-[10px] text-slate-400 line-clamp-1 font-supporting">
                                  {pair.answer}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 6. COVER & METADATA */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                5. Lembar Cover & Metadata
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="rounded text-[#1976D2]"
                  />
                  <span>Sertakan Halaman Cover Institusional Inpartner</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeMetadata}
                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                    className="rounded text-[#1976D2]"
                  />
                  <span>Sertakan Halaman Metadata, Metodologi, & Referensi Dokumen</span>
                </label>
              </div>
            </div>

            {/* 7. FORMAT KERTAS */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                6. Ukuran & Orientasi Kertas
              </label>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-slate-600 font-semibold mb-1">Ukuran Kertas:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperSize('A4')}
                      className={`flex-1 py-1.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        paperSize === 'A4'
                          ? 'bg-[#D1E4F6] border-[#1976D2] text-[#0C3B69]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      A4 (Standar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize('Letter')}
                      className={`flex-1 py-1.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        paperSize === 'Letter'
                          ? 'bg-[#D1E4F6] border-[#1976D2] text-[#0C3B69]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Letter
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-slate-600 font-semibold mb-1">Orientasi:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPaperOrientation('portrait')}
                      className={`flex-1 py-1.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        paperOrientation === 'portrait'
                          ? 'bg-[#D1E4F6] border-[#1976D2] text-[#0C3B69]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperOrientation('landscape')}
                      className={`flex-1 py-1.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        paperOrientation === 'landscape'
                          ? 'bg-[#D1E4F6] border-[#1976D2] text-[#0C3B69]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: LIVE INTERACTIVE PREVIEW */}
          <div
            className={`w-full lg:w-[52%] overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col items-center ${
              activeTab === 'config' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Live Preview Container (Used for both visual preview and PDF generation) */}
            <div
              ref={previewContainerRef}
              id="inpartner-export-container"
              style={{
                width: paperOrientation === 'landscape' ? '297mm' : '210mm',
                minHeight: paperOrientation === 'landscape' ? '210mm' : '297mm',
              }}
              className="bg-white text-slate-900 shadow-xl border border-slate-300 rounded-lg p-8 sm:p-12 space-y-10 my-2 text-xs leading-relaxed max-w-full font-sans"
            >
              {/* PAGE 1: INSTITUTIONAL COVER PAGE */}
              {includeCover && (
                <section className="print-page-break border-b border-slate-200 pb-16 space-y-8 flex flex-col justify-between min-h-[750px]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="font-wordmark text-lg tracking-tight text-[#1976D2]">
                        INPARTNER
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Institutional Research Publication
                      </span>
                    </div>

                    <div className="pt-8 space-y-3">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] font-bold text-[10px] uppercase tracking-wider">
                        {product?.category?.name || 'Riset Tematik & Analisis Sektoral'}
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                        {product?.title}
                      </h1>
                      {product?.subtitle && (
                        <p className="text-sm text-slate-600 font-supporting">{product.subtitle}</p>
                      )}
                    </div>
                  </div>

                  {/* Cover Metadata Box */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Penulis</span>
                        <span className="font-bold text-slate-800">
                          {product?.author?.name || 'Inpartner Research Board'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Penerbit</span>
                        <span className="font-bold text-slate-800">
                          {product?.publisher || 'Inpartner Intelligence'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Tanggal Ekspor</span>
                        <span className="font-semibold text-slate-700">
                          {new Date().toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Mode Ekspor</span>
                        <span className="font-semibold text-[#1976D2] uppercase">{selectedPreset}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span>Inpartner Reading Workspace • Dokumen Riset Terverifikasi</span>
                    <span>Hak Cipta Dilindungi Undang-Undang</span>
                  </div>
                </section>
              )}

              {/* PAGE 2+: MAIN DOCUMENT BODY */}
              {includeMainDoc && (
                <section className="print-page-break space-y-6 pt-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-[10px] text-slate-400 uppercase tracking-wider">
                    <span>{product?.title}</span>
                    <span>Bagian Dokumen Utama</span>
                  </div>

                  <div
                    dangerouslySetInnerHTML={{ __html: preparedMainDocHtml }}
                    className="article-prose space-y-4 font-supporting text-slate-800 leading-relaxed text-sm [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-4 [&_img]:mx-auto [&_img]:block [&_figure]:my-4 [&_figure]:mx-auto"
                  />
                </section>
              )}

              {/* SECTION: RESEARCH HIGHLIGHTS COLLECTION */}
              {includeHighlights &&
                (highlightPlacement === 'collection' || highlightPlacement === 'both') &&
                highlights.length > 0 && (
                  <section className="print-page-break border-t-2 border-slate-200 pt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#1976D2] flex items-center gap-2">
                        <Highlighter className="w-4 h-4" />
                        <span>Kumpulan Sorotan Riset (Research Highlights)</span>
                      </h3>
                      <span className="text-xs text-slate-400 font-semibold">{highlights.length} Item</span>
                    </div>

                    <div className="space-y-2.5">
                      {highlights.map((h, idx) => (
                        <div
                          key={h.id || idx}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              <span>Halaman {h.page}</span>
                            </span>
                            {h.created_at && (
                              <span className="text-slate-400 text-[10px]">
                                {new Date(h.created_at).toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-supporting italic text-slate-800 bg-yellow-50 p-2 rounded border-l-2 border-yellow-400">
                            "{h.text}"
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              {/* SECTION: RESEARCH NOTES NOTEBOOK */}
              {includeNotes && notes.length > 0 && (
                <section className="print-page-break border-t-2 border-slate-200 pt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1976D2] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Catatan & Analisis Riset Pribadi (Research Notes)</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold">{notes.length} Catatan</span>
                  </div>

                  <div className="space-y-3">
                    {notes.map((n, idx) => (
                      <div
                        key={n.id || idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          {includeNotePages && (
                            <span className="font-bold text-[#1976D2]">Halaman {n.page}</span>
                          )}
                          {includeNoteDates && n.created_at && (
                            <span className="text-slate-400 text-[10px]">
                              {new Date(n.created_at).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-slate-900">{n.title}</h4>
                        <p className="text-slate-700 font-supporting whitespace-pre-wrap leading-relaxed">
                          {n.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SECTION: SELECTED AI RESEARCH INSIGHTS */}
              {includeAiInsights && availableAiPairs.length > 0 && (
                <section className="print-page-break border-t-2 border-slate-200 pt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1976D2] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Analisis & Penjelasan Asisten AI Riset (Terpilih)</span>
                    </h3>
                    <span className="text-[10px] text-slate-400">Bantuan AI Inpartner</span>
                  </div>

                  <div className="space-y-3">
                    {availableAiPairs
                      .filter((p) => selectedAiMessageIds.includes(p.id))
                      .map((pair, idx) => (
                        <div
                          key={pair.id || idx}
                          className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/40 space-y-2 text-xs"
                        >
                          <div className="font-bold text-[#0C3B69] flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-[#1976D2] text-white flex items-center justify-center text-[10px]">
                              Q
                            </span>
                            <span>{pair.question}</span>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-sky-100 text-slate-700 font-supporting whitespace-pre-wrap leading-relaxed">
                            {pair.answer}
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              )}

              {/* SECTION: DOCUMENT METADATA & SOURCES */}
              {includeMetadata && (
                <section className="print-avoid-break border-t-2 border-slate-200 pt-8 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Bibliografi & Informasi Sumber Riset
                  </h3>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>
                        <strong>Judul Laporan:</strong> {product?.title}
                      </div>
                      <div>
                        <strong>Total Halaman Sumber:</strong> {totalPages} Halaman
                      </div>
                      <div>
                        <strong>Kategori:</strong> {product?.category?.name || 'Kajian Riset'}
                      </div>
                      <div>
                        <strong>Penerbit Resmi:</strong> {product?.publisher || 'Inpartner'}
                      </div>
                    </div>

                    {product?.sources && Array.isArray(product.sources) && product.sources.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1">
                        <strong className="block text-slate-700">Daftar Sumber Resmi:</strong>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                          {product.sources.map((src: string, i: number) => (
                            <li key={i}>{src}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* DOCUMENT FOOTER */}
              <footer className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-400">
                <span>Inpartner Professional Research Document</span>
                <span>
                  Diekspor pada {new Date().toLocaleDateString('id-ID')}
                </span>
              </footer>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <footer className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="text-xs text-slate-500 font-mono truncate max-w-sm">
            Berkas: <span className="font-bold text-slate-700">{exportFilename}.pdf</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isExporting}
              className="cursor-pointer"
            >
              Batal
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isExporting}
              className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#1976D2]" />
              <span>Cetak (Print)</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="gap-1.5 cursor-pointer shadow-sm"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </>
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ExportModal;

