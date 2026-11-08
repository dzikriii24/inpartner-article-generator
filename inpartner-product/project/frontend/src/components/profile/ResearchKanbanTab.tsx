import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Archive,
  Layers,
  ArrowRight,
  MoreVertical,
  Highlighter,
  MessageSquare,
  Calendar,
  AlertCircle,
  Sliders,
  Filter,
  Check,
  ChevronRight,
  ExternalLink,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import { toast } from 'sonner';
import api from '@/services/api';

interface KanbanCardItem {
  id: number; // entitlement_id
  product_id: number;
  slug: string;
  title: string;
  cover_url?: string;
  category_name?: string;
  progress: number;
  last_read_page: number;
  total_pages: number;
  highlights_count: number;
  notes_count: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  pipeline_notes?: string;
  order: number;
  last_accessed_at?: string;
  pipeline_status: 'to_read' | 'reading' | 'under_review' | 'completed' | 'archived';
}

const COLUMN_DEFS = [
  {
    id: 'to_read',
    title: '1. To Read',
    subtitle: 'Koleksi siap dibaca',
    color: 'border-slate-300 text-slate-700 bg-slate-50',
    badge: 'bg-slate-200 text-slate-700',
  },
  {
    id: 'reading',
    title: '2. Reading',
    subtitle: 'Sedang dalam proses',
    color: 'border-sky-300 text-[#1976D2] bg-sky-50/40',
    badge: 'bg-[#D1E4F6] text-[#0C3B69]',
  },
  {
    id: 'under_review',
    title: '3. Under Review',
    subtitle: 'Telaah & analisis mendalam',
    color: 'border-amber-300 text-amber-700 bg-amber-50/40',
    badge: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'completed',
    title: '4. Completed',
    subtitle: 'Riset telah selesai dibaca',
    color: 'border-emerald-300 text-emerald-700 bg-emerald-50/40',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  {
    id: 'archived',
    title: '5. Archived',
    subtitle: 'Arsip riwayat riset',
    color: 'border-slate-200 text-slate-400 bg-slate-50/30',
    badge: 'bg-slate-100 text-slate-500',
  },
];

const PRIORITY_BADGES: Record<string, { label: string; class: string }> = {
  low: { label: 'Rendah', class: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Sedang', class: 'bg-sky-50 text-sky-700 border-sky-200' },
  high: { label: 'Tinggi', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  urgent: { label: 'Mendesak', class: 'bg-red-50 text-red-700 border-red-200' },
};

export const ResearchKanbanTab: React.FC = () => {
  const [columns, setColumns] = useState<Record<string, KanbanCardItem[]>>({
    to_read: [],
    reading: [],
    under_review: [],
    completed: [],
    archived: [],
  });
  const [loading, setLoading] = useState(true);
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);

  // Edit Card Modal State
  const [editingCard, setEditingCard] = useState<KanbanCardItem | null>(null);
  const [modalPriority, setModalPriority] = useState<string>('medium');
  const [modalDeadline, setModalDeadline] = useState<string>('');
  const [modalNotes, setModalNotes] = useState<string>('');
  const [submittingCard, setSubmittingCard] = useState(false);

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const res = await api.get('/profile/pipeline');
      if (res.data?.columns) {
        setColumns(res.data.columns);
      }
    } catch (err) {
      console.error('Failed to fetch pipeline', err);
      toast.error('Gagal memuat pipeline riset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  // Move card API call
  const handleMoveCard = async (
    cardId: number,
    newStatus: string,
    additionalData: Partial<KanbanCardItem> = {}
  ) => {
    try {
      await api.post(`/profile/pipeline/${cardId}/move`, {
        pipeline_status: newStatus,
        pipeline_priority: additionalData.priority,
        pipeline_deadline: additionalData.deadline || null,
        pipeline_notes: additionalData.pipeline_notes || null,
      });

      // Optimistically update local state
      setColumns((prev) => {
        let foundCard: KanbanCardItem | null = null;
        const newCols: Record<string, KanbanCardItem[]> = { ...prev };

        // Remove from current column
        Object.keys(newCols).forEach((colKey) => {
          newCols[colKey] = newCols[colKey].filter((c) => {
            if (c.id === cardId) {
              foundCard = { ...c, pipeline_status: newStatus as any, ...additionalData };
              return false;
            }
            return true;
          });
        });

        // Add to new column
        if (foundCard && newCols[newStatus]) {
          newCols[newStatus] = [foundCard, ...newCols[newStatus]];
        }
        return newCols;
      });

      toast.success('Status pipeline berhasil diperbarui.');
    } catch (err) {
      console.error('Failed to move card', err);
      toast.error('Gagal memindahkan kartu.');
      fetchPipeline();
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: number) => {
    e.dataTransfer.setData('text/plain', String(cardId));
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const cardIdStr = e.dataTransfer.getData('text/plain');
    const cardId = parseInt(cardIdStr, 10);
    if (!isNaN(cardId)) {
      handleMoveCard(cardId, targetColumnId);
    }
    setDraggedCardId(null);
  };

  // Open Edit Card Modal
  const openEditModal = (card: KanbanCardItem) => {
    setEditingCard(card);
    setModalPriority(card.priority || 'medium');
    setModalDeadline(card.deadline || '');
    setModalNotes(card.pipeline_notes || '');
  };

  const handleSaveCardModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    setSubmittingCard(true);
    try {
      await api.post(`/profile/pipeline/${editingCard.id}/move`, {
        pipeline_status: editingCard.pipeline_status,
        pipeline_priority: modalPriority,
        pipeline_deadline: modalDeadline || null,
        pipeline_notes: modalNotes || null,
      });

      setColumns((prev) => {
        const newCols = { ...prev };
        const status = editingCard.pipeline_status;
        if (newCols[status]) {
          newCols[status] = newCols[status].map((c) =>
            c.id === editingCard.id
              ? {
                  ...c,
                  priority: modalPriority as any,
                  deadline: modalDeadline,
                  pipeline_notes: modalNotes,
                }
              : c
          );
        }
        return newCols;
      });

      toast.success('Pengaturan kartu berhasil disimpan.');
      setEditingCard(null);
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan kartu.');
    } finally {
      setSubmittingCard(false);
    }
  };

  const totalCards = Object.values(columns).reduce((acc, col) => acc + col.length, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* KANBAN HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">
            Personal Research Pipeline
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Kanban Board Manajemen Riset
          </h2>
          <p className="text-xs text-slate-500 font-supporting mt-1">
            Pantau dan kelola tahapan analisis seluruh publikasi digital yang Anda miliki. Geser kartu atau gunakan pemilih status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
            Total {totalCards} Dokumen di Pipeline
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {COLUMN_DEFS.map((col) => (
            <div key={col.id} className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : totalCards === 0 ? (
        <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#D1E4F6] text-[#1976D2] mx-auto flex items-center justify-center">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Belum Ada Dokumen di Library</h3>
            <p className="text-xs text-slate-500 font-supporting max-w-md mx-auto">
              Dokumen riset yang Anda peroleh melalui platform Inpartner akan otomatis masuk ke dalam papan riset personal ini.
            </p>
          </div>
          <Link to="/products">
            <Button
              size="sm"
              className="bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Jelajahi Katalog Riset
            </Button>
          </Link>
        </Card>
      ) : (
        /* KANBAN BOARD 5 COLUMNS */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start overflow-x-auto pb-4">
          {COLUMN_DEFS.map((col) => {
            const cardsInCol = columns[col.id] || [];
            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-3xl p-3.5 border min-h-[520px] transition-all ${col.color}`}
              >
                {/* COLUMN HEADER */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3 px-1">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                      <span>{col.title}</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 font-supporting mt-0.5">{col.subtitle}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                    {cardsInCol.length}
                  </span>
                </div>

                {/* CARDS LIST */}
                <div className="space-y-3 flex-1">
                  {cardsInCol.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200/80 rounded-2xl flex items-center justify-center text-[11px] text-slate-400 italic">
                      Tarik kartu ke sini
                    </div>
                  ) : (
                    cardsInCol.map((card) => {
                      const priorityConfig =
                        PRIORITY_BADGES[card.priority] || PRIORITY_BADGES.medium;

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#1976D2] transition-all space-y-2.5 cursor-grab active:cursor-grabbing group relative"
                        >
                          {/* Priority & Category Bar */}
                          <div className="flex items-center justify-between text-[10px] gap-2">
                            <span className="font-semibold text-slate-500 truncate max-w-[120px]">
                              {card.category_name}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded-md border font-bold text-[9px] uppercase tracking-wider ${priorityConfig.class}`}
                            >
                              {priorityConfig.label}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                            {card.title}
                          </h4>

                          {/* Progress bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>Progres</span>
                              <span className="font-bold text-[#1976D2]">{card.progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#1976D2] rounded-full"
                                style={{ width: `${Math.max(4, card.progress)}%` }}
                              />
                            </div>
                          </div>

                          {/* Badges: Highlights & Notes */}
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1">
                              <Highlighter className="w-3 h-3 text-amber-500" />
                              <span>{card.highlights_count}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-sky-500" />
                              <span>{card.notes_count}</span>
                            </span>
                            {card.deadline && (
                              <span className="flex items-center gap-1 text-slate-400 text-[9px] ml-auto">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(card.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              </span>
                            )}
                          </div>

                          {/* Card Footer: Quick Move Selector + Reader Button */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            {/* Column mover dropdown (mobile friendly) */}
                            <select
                              value={card.pipeline_status}
                              onChange={(e) => handleMoveCard(card.id, e.target.value)}
                              className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:border-[#1976D2]"
                              title="Pindah Kolom"
                            >
                              <option value="to_read">1. To Read</option>
                              <option value="reading">2. Reading</option>
                              <option value="under_review">3. Under Review</option>
                              <option value="completed">4. Completed</option>
                              <option value="archived">5. Archived</option>
                            </select>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(card)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title="Edit Prioritas & Catatan Tugas"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <Link
                                to={`/library/${card.slug}/read?page=${card.last_read_page}`}
                                className="p-1 rounded-md text-[#1976D2] hover:bg-[#D1E4F6] transition-colors"
                                title="Buka Workspace Membaca"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT CARD MODAL */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pengaturan Tugas Riset</h3>
                <p className="text-[11px] text-slate-500 font-supporting truncate max-w-xs">
                  {editingCard.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCardModal} className="space-y-4 text-xs">
              {/* Priority */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tingkat Prioritas</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'urgent'].map((p) => {
                    const cfg = PRIORITY_BADGES[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setModalPriority(p)}
                        className={`py-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                          modalPriority === p
                            ? 'bg-[#D1E4F6] border-[#1976D2] text-[#0C3B69]'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Tanggal Selesai (Deadline)</label>
                <input
                  type="date"
                  value={modalDeadline}
                  onChange={(e) => setModalDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                />
              </div>

              {/* Pipeline Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tugas & Fokus Riset</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Tambahkan catatan khusus, pertanyaan analisis, atau fokus riset..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingCard(null)}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingCard}
                  className="bg-[#1976D2] hover:bg-[#1562AF] text-white cursor-pointer"
                >
                  {submittingCard ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResearchKanbanTab;

