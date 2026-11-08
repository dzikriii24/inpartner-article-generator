import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  FileText, Edit3, Eye, Plus, Trash2, ArrowUp, ArrowDown, 
  Download, Printer, Sparkles, Layers, CheckCircle2, BookOpen, 
  Share2, Save, MoveVertical, Quote, ListFilter, AlertCircle
} from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';

interface SectionBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'callout' | 'takeaway' | 'sources';
  title?: string;
  content: string;
  sourceDoc?: string;
}

export const DocumentWorkspace: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const initialSlug = searchParams.get('slug');

  const [isEditMode, setIsEditMode] = useState(true);
  const [libraryDocs, setLibraryDocs] = useState<any[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);
  const [mergeDrawerOpen, setMergeDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dossier metadata
  const [dossierTitle, setDossierTitle] = useState('Executive Strategic Briefing Dossier');
  const [dossierSubtitle, setDossierSubtitle] = useState('Kompilasi dan Sintesis Laporan Riset Strategis Korporasi');
  const [dossierAuthor, setDossierAuthor] = useState(user?.name ? `${user.name} (Corporate Analyst)` : 'Inpartner Senior Fellow Editorial');
  
  // Editorial Blocks
  const [blocks, setBlocks] = useState<SectionBlock[]>([
    {
      id: 'b1',
      type: 'takeaway',
      title: 'Ringkasan Eksekutif & Key Takeaways',
      content: 'Dokumen ini mengintegrasikan temuan makroekonomi, proyeksi suku bunga, dan analisis risiko likuiditas perbankan untuk mendukung pengambilan keputusan komite investasi.',
      sourceDoc: 'Executive Overview'
    },
    {
      id: 'b2',
      type: 'heading',
      content: '1. Tinjauan Likuiditas & Stabilitas Sektor Finansial 2026',
      sourceDoc: 'Indonesia Macro Outlook'
    },
    {
      id: 'b3',
      type: 'paragraph',
      content: 'Berdasarkan data primer Bank Indonesia dan Otoritas Jasa Keuangan, rasio Alat Likuid terhadap Non-Core Deposit (AL/NCD) perbankan nasional berada pada level memadai. Namun, tekanan biaya dana (Cost of Funds) tetap menjadi variabel utama yang membatasi akselerasi margin bunga bersih.',
      sourceDoc: 'Indonesia Macro Outlook'
    },
    {
      id: 'b4',
      type: 'callout',
      title: 'Sorotan Kebijakan Moneter & Valas',
      content: 'Intervensi pasar valas dan instrumen Sekuritas Rupiah Bank Indonesia (SRBI) diproyeksikan terus menjaga stabilitas nilai tukar Rupiah di tengah volatilitas yield US Treasury.',
      sourceDoc: 'Central Bank Policy Assessment'
    },
    {
      id: 'b5',
      type: 'sources',
      title: 'Rujukan & Sumber Data Resmi',
      content: '1. Bank Indonesia — Laporan Kebijakan Moneter Q3 2026\n2. Badan Pusat Statistik — Pertumbuhan PDB dan Inflasi IHK\n3. Otoritas Jasa Keuangan — Statistik Perbankan Indonesia',
      sourceDoc: 'Triangulasi Data'
    }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch user library docs
  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      try {
        const res = await api.get('/library');
        const list = Array.isArray(res.data?.entitlements)
          ? res.data.entitlements.map((e: any) => e.product).filter(Boolean)
          : Array.isArray(res.data?.data)
          ? res.data.data.map((e: any) => e.product || e)
          : [];
        setLibraryDocs(list);

        // If slug provided in query, load initial doc
        if (initialSlug && list.length > 0) {
          const match = list.find((d: any) => d.slug === initialSlug);
          if (match) {
            setDossierTitle(`Custom Brief: ${match.title}`);
            setDossierSubtitle(match.subtitle || 'Dossier Analisis Mandiri');
          }
        }
      } catch (err) {
        console.error('Failed to load library for workspace', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchLibrary();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, initialSlug]);

  // Block Manipulation Handlers
  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    setBlocks(newBlocks);
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleAddBlock = (type: SectionBlock['type']) => {
    const newBlock: SectionBlock = {
      id: 'b_' + Date.now(),
      type,
      title: type === 'callout' ? 'Catatan Strategis' : type === 'takeaway' ? 'Poin Kunci' : undefined,
      content: type === 'heading' ? 'Judul Bab / Analisis Baru' : 'Ketikkan uraian analisis riset atau catatan korporat di sini...',
      sourceDoc: 'Catatan Analis Mandiri'
    };
    setBlocks([...blocks, newBlock]);
    showToast('Blok analisis baru ditambahkan.');
  };

  // Merge selected library docs into blocks
  const handleMergeDocs = () => {
    const selected = libraryDocs.filter((d) => selectedDocIds.includes(d.id));
    if (selected.length === 0) return;

    const mergedBlocks: SectionBlock[] = [...blocks];
    selected.forEach((doc) => {
      mergedBlocks.push({
        id: 'merged_h_' + doc.id + '_' + Date.now(),
        type: 'heading',
        content: `Bab Terintegrasi: ${doc.title}`,
        sourceDoc: doc.title
      });
      mergedBlocks.push({
        id: 'merged_p_' + doc.id + '_' + Date.now(),
        type: 'paragraph',
        content: doc.excerpt || doc.subtitle || 'Dokumen analisis industri terkurasi oleh Inpartner Intelligence.',
        sourceDoc: doc.title
      });
      if (doc.methodology) {
        mergedBlocks.push({
          id: 'merged_c_' + doc.id + '_' + Date.now(),
          type: 'callout',
          title: `Metodologi: ${doc.title}`,
          content: doc.methodology,
          sourceDoc: doc.title
        });
      }
    });

    setBlocks(mergedBlocks);
    setMergeDrawerOpen(false);
    setSelectedDocIds([]);
    showToast(`${selected.length} publikasi berhasil digabungkan ke dalam workspace dossier!`);
  };

  return (
    <div className="min-h-screen py-6 sm:py-10 space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-[#0C3B69] text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in flex items-center gap-2 border border-[#B2D1F0]/40">
          <Sparkles className="w-4 h-4 text-[#B2D1F0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Workspace Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-20 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center font-bold">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              Inpartner Digital Report Studio & Dossier Workspace
            </h1>
            <p className="text-[11px] text-slate-500 font-supporting">
              Editor dokumen digital interaktif: gabungkan, sunting teks, dan susun laporan riset kustom Anda.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Mode toggle */}
          <div className="p-1 bg-slate-100 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setIsEditMode(true)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditMode ? 'bg-white text-[#1976D2] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Mode Edit</span>
            </button>
            <button
              onClick={() => setIsEditMode(false)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                !isEditMode ? 'bg-white text-[#1976D2] shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Baca</span>
            </button>
          </div>

          {/* Merge button */}
          <button
            onClick={() => setMergeDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold text-xs transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gabungkan Dokumen</span>
          </button>

          {/* Print/Download */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Editorial Canvas */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-14 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Dossier Header */}
        <header className="border-b border-slate-200 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#1976D2] bg-blue-50 px-2.5 py-1 rounded-md border border-[#B2D1F0]">
              CONFIDENTIAL STRATEGIC DOSSIER
            </span>
            <span className="text-xs font-mono text-slate-400">
              {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* Editable Title */}
          <div
            contentEditable={isEditMode}
            suppressContentEditableWarning
            onBlur={(e) => setDossierTitle(e.currentTarget.textContent || dossierTitle)}
            className={`text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight ${
              isEditMode ? 'hover:bg-blue-50/40 p-2 rounded-xl outline-none focus:ring-2 focus:ring-[#1976D2]/20' : ''
            }`}
          >
            {dossierTitle}
          </div>

          {/* Editable Subtitle */}
          <div
            contentEditable={isEditMode}
            suppressContentEditableWarning
            onBlur={(e) => setDossierSubtitle(e.currentTarget.textContent || dossierSubtitle)}
            className={`text-sm sm:text-lg text-slate-600 font-supporting italic border-l-2 border-[#1976D2] pl-4 ${
              isEditMode ? 'hover:bg-blue-50/40 p-2 rounded-xl outline-none focus:ring-2 focus:ring-[#1976D2]/20' : ''
            }`}
          >
            {dossierSubtitle}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2 pt-2">
            <span>Disusun & Dianalisis oleh:</span>
            <span
              contentEditable={isEditMode}
              suppressContentEditableWarning
              onBlur={(e) => setDossierAuthor(e.currentTarget.textContent || dossierAuthor)}
              className="font-bold text-slate-800"
            >
              {dossierAuthor}
            </span>
          </div>
        </header>

        {/* Editorial Blocks */}
        <div className="space-y-6">
          {blocks.map((block, idx) => (
            <div
              key={block.id}
              className={`group relative rounded-2xl transition-all ${
                isEditMode ? 'hover:bg-slate-50/80 p-4 border border-dashed border-transparent hover:border-slate-300' : ''
              }`}
            >
              {/* Block Action Controls in Edit Mode */}
              {isEditMode && (
                <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                  <span className="text-[9px] font-mono font-bold text-slate-400 px-1.5 uppercase">
                    {block.sourceDoc || block.type}
                  </span>
                  <button
                    disabled={idx === 0}
                    onClick={() => handleMoveBlock(idx, 'up')}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 cursor-pointer"
                    title="Pindahkan ke atas"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === blocks.length - 1}
                    onClick={() => handleMoveBlock(idx, 'down')}
                    className="p-1 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 cursor-pointer"
                    title="Pindahkan ke bawah"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="p-1 rounded hover:bg-rose-50 text-rose-600 cursor-pointer"
                    title="Hapus blok"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Block Content Renderers */}
              {block.type === 'heading' && (
                <h3
                  contentEditable={isEditMode}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newBlocks = [...blocks];
                    newBlocks[idx].content = e.currentTarget.textContent || '';
                    setBlocks(newBlocks);
                  }}
                  className="text-lg sm:text-xl font-black text-slate-900 tracking-tight outline-none"
                >
                  {block.content}
                </h3>
              )}

              {block.type === 'paragraph' && (
                <p
                  contentEditable={isEditMode}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const newBlocks = [...blocks];
                    newBlocks[idx].content = e.currentTarget.textContent || '';
                    setBlocks(newBlocks);
                  }}
                  className="text-sm sm:text-base text-slate-700 leading-relaxed font-normal outline-none"
                >
                  {block.content}
                </p>
              )}

              {block.type === 'takeaway' && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 to-[#D1E4F6]/40 border border-[#B2D1F0] space-y-2">
                  <div className="flex items-center gap-2 text-[#0C3B69] font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#1976D2]" />
                    <span
                      contentEditable={isEditMode}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const newBlocks = [...blocks];
                        newBlocks[idx].title = e.currentTarget.textContent || '';
                        setBlocks(newBlocks);
                      }}
                      className="outline-none"
                    >
                      {block.title || 'Key Strategic Takeaways'}
                    </span>
                  </div>
                  <p
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[idx].content = e.currentTarget.textContent || '';
                      setBlocks(newBlocks);
                    }}
                    className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium outline-none"
                  >
                    {block.content}
                  </p>
                </div>
              )}

              {block.type === 'callout' && (
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1.5">
                  <div
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[idx].title = e.currentTarget.textContent || '';
                      setBlocks(newBlocks);
                    }}
                    className="font-bold text-xs outline-none"
                  >
                    {block.title || 'Catatan Penting'}
                  </div>
                  <p
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[idx].content = e.currentTarget.textContent || '';
                      setBlocks(newBlocks);
                    }}
                    className="text-xs sm:text-sm leading-relaxed outline-none"
                  >
                    {block.content}
                  </p>
                </div>
              )}

              {block.type === 'sources' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                    {block.title || 'Rujukan Data Primer'}
                  </span>
                  <div
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newBlocks = [...blocks];
                      newBlocks[idx].content = e.currentTarget.textContent || '';
                      setBlocks(newBlocks);
                    }}
                    className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed outline-none"
                  >
                    {block.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Block Toolbar (Only in Edit Mode) */}
        {isEditMode && (
          <div className="pt-8 border-t border-slate-200 text-center space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              + Tambahkan Blok Analisis Baru
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock('heading')}
                className="rounded-xl text-xs gap-1.5 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" /> Judul Bab
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock('paragraph')}
                className="rounded-xl text-xs gap-1.5 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" /> Paragraf Analisis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock('takeaway')}
                className="rounded-xl text-xs gap-1.5 hover:bg-blue-50 text-[#1976D2] border-[#B2D1F0]"
              >
                <Sparkles className="w-3.5 h-3.5" /> Key Takeaway Box
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock('callout')}
                className="rounded-xl text-xs gap-1.5 hover:bg-amber-50 text-amber-800 border-amber-200"
              >
                <Quote className="w-3.5 h-3.5" /> Callout Sorotan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddBlock('sources')}
                className="rounded-xl text-xs gap-1.5 hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" /> Daftar Sumber
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Merge Publications Drawer */}
      {mergeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMergeDrawerOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Pilih Riset untuk Digabungkan</h3>
                  <p className="text-[11px] text-slate-500 font-supporting">
                    Publikasi yang Anda miliki dari library Inpartner
                  </p>
                </div>
                <button
                  onClick={() => setMergeDrawerOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
                >
                  &times;
                </button>
              </div>

              {libraryDocs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-supporting space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Anda belum memiliki publikasi di library.</p>
                  <Link to="/products" className="text-[#1976D2] font-bold underline block">
                    Beli riset di katalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                  {libraryDocs.map((doc) => {
                    const isChecked = selectedDocIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-50/60 border-[#1976D2]' : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocIds([...selectedDocIds, doc.id]);
                            } else {
                              setSelectedDocIds(selectedDocIds.filter((id) => id !== doc.id));
                            }
                          }}
                          className="rounded text-[#1976D2] mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-2">{doc.title}</h4>
                          <span className="text-[10px] text-[#1976D2] font-bold uppercase block mt-1">
                            {doc.type_label || doc.type}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMergeDrawerOpen(false)}
                className="rounded-xl text-xs"
              >
                Batal
              </Button>
              <Button
                disabled={selectedDocIds.length === 0}
                size="sm"
                onClick={handleMergeDocs}
                className="rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gabungkan ({selectedDocIds.length}) Riset</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentWorkspace;

