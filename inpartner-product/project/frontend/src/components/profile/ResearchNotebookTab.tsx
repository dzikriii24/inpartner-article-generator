import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Highlighter,
  MessageSquare,
  Bookmark,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ExternalLink,
  Edit3,
  Trash2,
  Calendar,
  Layers,
  BookOpen,
  FolderPlus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import { toast } from 'sonner';
import api from '@/services/api';

interface HighlightItem {
  id: string;
  entitlement_id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  category_name: string;
  cover_url?: string;
  text: string;
  page: number;
  color: string;
  created_at?: string;
}

interface NoteItem {
  id: string;
  entitlement_id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  category_name: string;
  cover_url?: string;
  title: string;
  content: string;
  page: number;
  created_at?: string;
}

interface BookmarkItem {
  id: string;
  entitlement_id: number;
  product_id: number;
  product_title: string;
  product_slug: string;
  category_name: string;
  page: number;
  title: string;
  created_at?: string;
}

const COLOR_MAP: Record<string, { bg: string; dot: string; label: string }> = {
  yellow: { bg: 'bg-yellow-50 text-yellow-900 border-yellow-200', dot: 'bg-amber-400', label: 'Kuning' },
  blue: { bg: 'bg-sky-50 text-sky-900 border-sky-200', dot: 'bg-sky-400', label: 'Biru' },
  green: { bg: 'bg-emerald-50 text-emerald-900 border-emerald-200', dot: 'bg-emerald-400', label: 'Hijau' },
  red: { bg: 'bg-rose-50 text-rose-900 border-rose-200', dot: 'bg-rose-400', label: 'Merah' },
  purple: { bg: 'bg-purple-50 text-purple-900 border-purple-200', dot: 'bg-purple-400', label: 'Ungu' },
};

export const ResearchNotebookTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'highlights' | 'notes' | 'bookmarks'>('highlights');
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [libraryOptions, setLibraryOptions] = useState<Array<{ id: number; title: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('all');
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('all');

  // Note Modal State (Create / Edit)
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteEntitlementId, setNoteEntitlementId] = useState<number>(0);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notePage, setNotePage] = useState<number>(1);
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchNotebook = async () => {
    setLoading(true);
    try {
      const res = await api.get('/profile/notebook');
      const data = res.data || {};
      setHighlights(data.highlights || []);
      setNotes(data.notes || []);
      setBookmarks(data.bookmarks || []);

      // Extract unique library documents for filter dropdown
      const docsMap = new Map<number, { id: number; title: string; slug: string }>();
      [...(data.highlights || []), ...(data.notes || []), ...(data.bookmarks || [])].forEach((item) => {
        if (item.entitlement_id && item.product_title) {
          docsMap.set(item.entitlement_id, {
            id: item.entitlement_id,
            title: item.product_title,
            slug: item.product_slug,
          });
        }
      });
      setLibraryOptions(Array.from(docsMap.values()));
    } catch (err) {
      console.error('Failed to load notebook', err);
      toast.error('Gagal memuat catatan riset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotebook();
  }, []);

  // Filtered Highlights
  const filteredHighlights = useMemo(() => {
    return highlights.filter((h) => {
      const matchesSearch =
        searchQuery === '' ||
        h.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.product_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDoc = selectedDocFilter === 'all' || String(h.entitlement_id) === selectedDocFilter;
      const matchesColor = selectedColorFilter === 'all' || h.color === selectedColorFilter;
      return matchesSearch && matchesDoc && matchesColor;
    });
  }, [highlights, searchQuery, selectedDocFilter, selectedColorFilter]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        searchQuery === '' ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.product_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDoc = selectedDocFilter === 'all' || String(n.entitlement_id) === selectedDocFilter;
      return matchesSearch && matchesDoc;
    });
  }, [notes, searchQuery, selectedDocFilter]);

  // Filtered Bookmarks
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((b) => {
      const matchesSearch =
        searchQuery === '' ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.product_title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDoc = selectedDocFilter === 'all' || String(b.entitlement_id) === selectedDocFilter;
      return matchesSearch && matchesDoc;
    });
  }, [bookmarks, searchQuery, selectedDocFilter]);

  // Open Create Note Modal
  const openCreateNoteModal = () => {
    setEditingNoteId(null);
    setNoteEntitlementId(libraryOptions[0]?.id || 0);
    setNoteTitle('');
    setNoteContent('');
    setNotePage(1);
    setNoteModalOpen(true);
  };

  // Open Edit Note Modal
  const openEditNoteModal = (note: NoteItem) => {
    setEditingNoteId(note.id);
    setNoteEntitlementId(note.entitlement_id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNotePage(note.page || 1);
    setNoteModalOpen(true);
  };

  // Save Note Handler
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteEntitlementId || !noteTitle.trim()) {
      toast.error('Pilih dokumen dan masukkan judul catatan.');
      return;
    }

    setSubmittingNote(true);
    try {
      await api.post('/profile/notebook/notes', {
        id: editingNoteId,
        entitlement_id: noteEntitlementId,
        title: noteTitle,
        content: noteContent,
        page: notePage,
      });

      toast.success(editingNoteId ? 'Catatan berhasil diperbarui!' : 'Catatan berhasil dibuat!');
      setNoteModalOpen(false);
      fetchNotebook();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan catatan.');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Delete Note Handler
  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Yakin ingin menghapus catatan riset ini?')) return;
    try {
      await api.delete(`/profile/notebook/notes/${noteId}`);
      toast.success('Catatan berhasil dihapus.');
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      toast.error('Gagal menghapus catatan.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">
            Personal Knowledge Base
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Research Notebook & Anotasi
          </h2>
          <p className="text-xs text-slate-500 font-supporting mt-1">
            Pusat penyimpanan seluruh sorotan teks, catatan pribadi, dan bookmark dari berbagai publikasi riset Anda.
          </p>
        </div>

        <Button
          size="sm"
          onClick={openCreateNoteModal}
          disabled={libraryOptions.length === 0}
          className="bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Catatan Baru</span>
        </Button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Global Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kutipan, catatan, judul riset, atau kata kunci..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#1976D2] font-medium"
            />
          </div>

          {/* Document Filter */}
          <div className="w-full md:w-64">
            <select
              value={selectedDocFilter}
              onChange={(e) => setSelectedDocFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#1976D2]"
            >
              <option value="all">Semua Dokumen Riset ({libraryOptions.length})</option>
              {libraryOptions.map((doc) => (
                <option key={doc.id} value={String(doc.id)}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>

          {/* Color Filter (only on highlights subtab) */}
          {activeSubTab === 'highlights' && (
            <div className="w-full md:w-44">
              <select
                value={selectedColorFilter}
                onChange={(e) => setSelectedColorFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#1976D2]"
              >
                <option value="all">Semua Warna</option>
                <option value="yellow">Kuning (Poin Kunci)</option>
                <option value="blue">Biru (Data & Fakta)</option>
                <option value="green">Hijau (Metodologi)</option>
                <option value="red">Merah (Risiko/Kritikal)</option>
                <option value="purple">Ungu (Proyeksi)</option>
              </select>
            </div>
          )}
        </div>

        {/* SUB-TABS SELECTOR */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('highlights')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'highlights'
                ? 'bg-[#1976D2] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Kumpulan Sorotan (Highlights)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeSubTab === 'highlights' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {highlights.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('notes')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'notes'
                ? 'bg-[#1976D2] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Catatan Riset (Notes)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeSubTab === 'notes' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bookmarks')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'bookmarks'
                ? 'bg-[#1976D2] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Penanda Halaman (Bookmarks)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeSubTab === 'bookmarks' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {bookmarks.length}
            </span>
          </button>
        </div>
      </div>

      {/* CONTENT LIST */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activeSubTab === 'highlights' ? (
        /* HIGHLIGHTS TAB */
        filteredHighlights.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
              <Highlighter className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Belum Ada Sorotan Teks</h3>
              <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
                Sorot teks penting saat membaca laporan riset di Reading Workspace. Semua kutipan akan terkumpul otomatis di sini.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHighlights.map((hl) => {
              const colorCfg = COLOR_MAP[hl.color] || COLOR_MAP.yellow;
              return (
                <div
                  key={hl.id}
                  className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#1976D2] transition-all space-y-3"
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorCfg.dot}`} />
                      <span className="font-bold text-slate-900 truncate">{hl.product_title}</span>
                      <span className="text-slate-400 font-medium shrink-0">• Halaman {hl.page}</span>
                    </div>

                    <Link
                      to={`/library/${hl.product_slug}/read?page=${hl.page}&hl=${hl.id}`}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#1976D2] hover:bg-[#D1E4F6] text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>Buka di Halaman</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Quoted Highlight Text */}
                  <blockquote
                    className={`p-3 rounded-xl border text-xs font-supporting italic leading-relaxed ${colorCfg.bg}`}
                  >
                    "{hl.text}"
                  </blockquote>

                  {hl.created_at && (
                    <div className="text-[10px] text-slate-400">
                      Disorot pada{' '}
                      {new Date(hl.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : activeSubTab === 'notes' ? (
        /* NOTES TAB */
        filteredNotes.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Belum Ada Catatan Riset</h3>
              <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
                Tulis analisis, sintesis pemikiran, dan catatan penting dari riset yang sedang Anda pelajari.
              </p>
            </div>
            <Button
              size="sm"
              onClick={openCreateNoteModal}
              disabled={libraryOptions.length === 0}
              className="bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl"
            >
              Tulis Catatan Pertama
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="p-5 bg-white rounded-3xl border border-slate-200 shadow-2xs hover:shadow-xs hover:border-[#1976D2] transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1976D2] truncate max-w-[200px]">
                      {note.product_title}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Hal. {note.page || 1}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{note.title}</h4>
                  <p className="text-xs text-slate-600 font-supporting whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {note.content}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {note.created_at
                      ? new Date(note.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Baru saja'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditNoteModal(note)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Edit Catatan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Hapus Catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      to={`/library/${note.product_slug}/read?page=${note.page || 1}`}
                      className="p-1.5 rounded-lg text-[#1976D2] hover:bg-[#D1E4F6] transition-colors"
                      title="Buka Dokumen"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* BOOKMARKS TAB */
        filteredBookmarks.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 mx-auto flex items-center justify-center">
              <Bookmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Belum Ada Bookmark Halaman</h3>
              <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
                Tandai halaman penting saat membaca dokumen untuk kembali ke bagian tersebut kapan saja.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {filteredBookmarks.map((bm) => (
              <div
                key={bm.id}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-[#1976D2] transition-all space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                      Halaman {bm.page}
                    </span>
                    <Bookmark className="w-3.5 h-3.5 text-teal-600 fill-teal-600" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-800 line-clamp-1">{bm.title}</h4>
                  <p className="text-[11px] text-slate-500 font-supporting truncate">{bm.product_title}</p>
                </div>

                <Link
                  to={`/library/${bm.product_slug}/read?page=${bm.page}`}
                  className="pt-2 border-t border-slate-100 text-xs font-bold text-[#1976D2] hover:underline flex items-center justify-between"
                >
                  <span>Buka Halaman Ini</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {/* CREATE / EDIT NOTE MODAL */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingNoteId ? 'Edit Catatan Riset' : 'Tulis Catatan Riset Baru'}
                </h3>
                <p className="text-[11px] text-slate-500 font-supporting">
                  Tersimpan langsung dan terhubung dengan dokumen di Library Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Dokumen Riset</label>
                <select
                  value={noteEntitlementId}
                  onChange={(e) => setNoteEntitlementId(parseInt(e.target.value, 10))}
                  disabled={Boolean(editingNoteId)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] font-medium"
                >
                  {libraryOptions.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Judul Catatan</label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="misal: Sintesis Kebijakan Moneter BI..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Halaman</label>
                  <input
                    type="number"
                    min={1}
                    value={notePage}
                    onChange={(e) => setNotePage(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Isi Catatan & Sintesis Pemikiran</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Tuliskan analisis, catatan penting, atau implikasi strategis..."
                  rows={5}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNoteModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingNote}
                  className="bg-[#1976D2] hover:bg-[#1562AF] text-white"
                >
                  {submittingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResearchNotebookTab;

