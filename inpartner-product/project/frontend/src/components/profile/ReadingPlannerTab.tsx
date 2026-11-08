import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ArrowRight,
  Trash2,
  Edit2,
  AlertCircle,
  ExternalLink,
  Target,
  Flame,
  Check,
  X,
  Highlighter,
  MessageSquare,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import { toast } from 'sonner';
import api from '@/services/api';

interface ScheduleItem {
  id: number;
  product_id?: number;
  title: string;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  target_duration_minutes: number;
  target_pages?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
  notes?: string;
  completed_at?: string;
  product?: {
    id: number;
    title: string;
    slug: string;
    cover_url?: string;
  };
}

interface ActualActivityItem {
  id: number;
  product_id?: number;
  activity_type: string;
  description: string;
  duration_minutes: number;
  occurred_at: string;
  product?: {
    id: number;
    title: string;
    slug: string;
  };
}

interface BookReadItem {
  id: number;
  title: string;
  slug: string;
  cover_url?: string;
  category_name?: string;
  pages_read: number;
  total_pages: number;
  progress: number;
  last_read_time?: string;
  duration_minutes: number;
}

interface HighlightItem {
  id: string;
  book_title: string;
  book_slug: string;
  text: string;
  page: number;
  color?: string;
  created_at: string;
}

interface NoteItem {
  id: string;
  book_title: string;
  book_slug: string;
  title: string;
  content: string;
  page: number;
  created_at: string;
}

interface DayDetailData {
  date: string;
  total_duration_minutes: number;
  total_books: number;
  total_highlights: number;
  total_notes: number;
  books: BookReadItem[];
  schedules: ScheduleItem[];
  highlights: HighlightItem[];
  notes: NoteItem[];
}

const PRIORITY_CFG: Record<string, { label: string; class: string }> = {
  low: { label: 'Rendah', class: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Sedang', class: 'bg-sky-50 text-sky-700' },
  high: { label: 'Tinggi', class: 'bg-amber-50 text-amber-700' },
  urgent: { label: 'Mendesak', class: 'bg-rose-50 text-rose-700' },
};

const STATUS_CFG: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'Terjadwal', class: 'bg-[#D1E4F6] text-[#0C3B69] border-[#B2D1F0]' },
  in_progress: { label: 'Berjalan', class: 'bg-amber-100 text-amber-800 border-amber-300' },
  completed: { label: 'Selesai', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  missed: { label: 'Terlewat', class: 'bg-rose-100 text-rose-800 border-rose-300' },
  cancelled: { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-500 border-slate-300' },
};

export const ReadingPlannerTab: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [actualActivities, setActualActivities] = useState<ActualActivityItem[]>([]);
  const [dailyDetails, setDailyDetails] = useState<Record<string, DayDetailData>>({});
  const [loading, setLoading] = useState(true);

  // Day Detail Modal State
  const [selectedDateForDetail, setSelectedDateForDetail] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Library options for dropdown
  const [libraryDocs, setLibraryDocs] = useState<Array<{ id: number; title: string; slug: string }>>([]);

  // Create/Edit Schedule Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalProductId, setModalProductId] = useState<number | ''>('');
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  const [modalStartTime, setModalStartTime] = useState('09:00');
  const [modalEndTime, setModalEndTime] = useState('10:00');
  const [modalDuration, setModalDuration] = useState(60);
  const [modalPages, setModalPages] = useState('');
  const [modalPriority, setModalPriority] = useState<string>('medium');
  const [modalNotes, setModalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Current Month String (YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [currentDate]);

  const monthName = useMemo(() => {
    return currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [currentDate]);

  const fetchSchedulesAndActivities = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/profile/schedules?month=${currentMonthStr}`);
      setSchedules(res.data?.schedules || []);
      setActualActivities(res.data?.actual_activities || []);
      setDailyDetails(res.data?.daily_details || {});
    } catch (err) {
      console.error('Failed to load schedules', err);
      toast.error('Gagal memuat jadwal & aktivitas membaca.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLibraryDocs = async () => {
    try {
      const res = await api.get('/library');
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setLibraryDocs(
        items.map((it: any) => ({
          id: it.product?.id || it.id,
          title: it.product?.title || it.title,
          slug: it.product?.slug || it.slug,
        }))
      );
    } catch (err) {
      console.error('Failed to load library docs', err);
    }
  };

  useEffect(() => {
    fetchSchedulesAndActivities();
  }, [currentMonthStr]);

  useEffect(() => {
    fetchLibraryDocs();
  }, []);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Grid Days Calculation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    // Adjust so Monday is 0
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalSlots = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const days = [];
    for (let i = 0; i < totalSlots; i++) {
      const dayNum = i - startOffset + 1;
      if (dayNum > 0 && dayNum <= daysInMonth) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        days.push({
          dayNum,
          dateStr,
          isCurrentMonth: true,
          isToday: dateStr === new Date().toISOString().split('T')[0],
        });
      } else {
        days.push({
          dayNum: null,
          dateStr: '',
          isCurrentMonth: false,
          isToday: false,
        });
      }
    }
    return days;
  }, [currentDate]);

  // Click on a calendar day to open day detail
  const handleDayClick = (dateStr: string) => {
    setSelectedDateForDetail(dateStr);
    setDetailModalOpen(true);
  };

  // Open Create Modal
  const openCreateModal = (defaultDate?: string) => {
    setEditingScheduleId(null);
    setModalTitle('');
    setModalProductId(libraryDocs[0]?.id || '');
    setModalDate(defaultDate || new Date().toISOString().split('T')[0]);
    setModalStartTime('09:00');
    setModalEndTime('10:00');
    setModalDuration(60);
    setModalPages('');
    setModalPriority('medium');
    setModalNotes('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (sch: ScheduleItem) => {
    setEditingScheduleId(sch.id);
    setModalTitle(sch.title);
    setModalProductId(sch.product_id || '');
    setModalDate(sch.scheduled_date ? sch.scheduled_date.split('T')[0] : '');
    setModalStartTime(sch.start_time || '09:00');
    setModalEndTime(sch.end_time || '10:00');
    setModalDuration(sch.target_duration_minutes || 60);
    setModalPages(sch.target_pages || '');
    setModalPriority(sch.priority || 'medium');
    setModalNotes(sch.notes || '');
    setModalOpen(true);
  };

  // Submit Schedule Handler
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      toast.error('Masukkan judul agenda membaca.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: modalTitle,
        product_id: modalProductId || null,
        scheduled_date: modalDate,
        start_time: modalStartTime || null,
        end_time: modalEndTime || null,
        target_duration_minutes: modalDuration,
        target_pages: modalPages || null,
        priority: modalPriority,
        notes: modalNotes || null,
      };

      if (editingScheduleId) {
        await api.put(`/profile/schedules/${editingScheduleId}`, payload);
        toast.success('Agenda membaca berhasil diperbarui.');
      } else {
        await api.post('/profile/schedules', payload);
        toast.success('Agenda membaca berhasil dijadwalkan.');
      }

      setModalOpen(false);
      fetchSchedulesAndActivities();
    } catch (err) {
      toast.error('Gagal menyimpan jadwal membaca.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Complete Status
  const handleToggleComplete = async (schedule: ScheduleItem) => {
    const newStatus = schedule.status === 'completed' ? 'scheduled' : 'completed';
    try {
      await api.put(`/profile/schedules/${schedule.id}`, { status: newStatus });
      toast.success(newStatus === 'completed' ? 'Agenda ditandai selesai!' : 'Status agenda dikembalikan.');
      setSchedules((prev) =>
        prev.map((s) => (s.id === schedule.id ? { ...s, status: newStatus } : s))
      );
      // Refresh to update dailyDetails
      fetchSchedulesAndActivities();
    } catch (err) {
      toast.error('Gagal memperbarui status agenda.');
    }
  };

  // Delete Schedule Handler
  const handleDeleteSchedule = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus agenda membaca ini?')) return;
    try {
      await api.delete(`/profile/schedules/${id}`);
      toast.success('Agenda berhasil dihapus.');
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      fetchSchedulesAndActivities();
    } catch (err) {
      toast.error('Gagal menghapus agenda.');
    }
  };

  // Selected Day Detail helpers
  const selectedDayData: DayDetailData | null = selectedDateForDetail
    ? dailyDetails[selectedDateForDetail] || {
        date: selectedDateForDetail,
        total_duration_minutes: 0,
        total_books: 0,
        total_highlights: 0,
        total_notes: 0,
        books: [],
        schedules: schedules.filter(
          (s) => s.scheduled_date && s.scheduled_date.startsWith(selectedDateForDetail)
        ),
        highlights: [],
        notes: [],
      }
    : null;

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateForDetail) return '';
    try {
      const parts = selectedDateForDetail.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return selectedDateForDetail;
    }
  }, [selectedDateForDetail]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">
            Reading Planner & Activity Calendar
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Kalender Riset & Deteksi Aktivitas Membaca
          </h2>
          <p className="text-xs text-slate-500 font-supporting mt-1">
            Lihat buku yang Anda baca secara otomatis per hari, cek catatan & highlight, atau jadwalkan agenda riset mendatang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-[#1976D2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kalender Bulanan
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'agenda' ? 'bg-[#1976D2] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Agenda
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => openCreateModal()}
            className="bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </Button>
        </div>
      </div>

      {/* MONTH NAVIGATION BAR */}
      <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <h3 className="text-sm sm:text-base font-black text-slate-900 capitalize px-2">
            {monthName}
          </h3>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="text-[11px] font-bold rounded-xl ml-2 cursor-pointer"
          >
            Hari Ini
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            <span>Terdeteksi Dibaca (Aktual)</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-200" />
            <span>Highlight & Catatan</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#0C3B69]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1976D2] ring-2 ring-blue-200" />
            <span>Agenda Terjadwal</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="h-96 bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1976D2] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">Memuat kalender & aktivitas membaca...</span>
        </div>
      ) : viewMode === 'month' ? (
        /* MONTHLY CALENDAR GRID */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold text-slate-600 py-3">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
            <span>Min</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
            {calendarDays.map((day, idx) => {
              if (!day.isCurrentMonth) {
                return (
                  <div key={idx} className="min-h-[125px] bg-slate-50/40 p-2 text-slate-300 text-xs">
                    &nbsp;
                  </div>
                );
              }

              const dayDetail = dailyDetails[day.dateStr];
              const daySchedules = schedules.filter(
                (s) => s.scheduled_date && s.scheduled_date.startsWith(day.dateStr)
              );
              const booksRead = dayDetail?.books || [];
              const totalHighlights = dayDetail?.total_highlights || 0;
              const hasActivity = booksRead.length > 0 || totalHighlights > 0 || daySchedules.length > 0;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={`min-h-[125px] p-2 flex flex-col justify-between hover:bg-slate-50/90 transition-colors cursor-pointer group relative ${
                    day.isToday ? 'bg-sky-50/40 ring-2 ring-inset ring-[#1976D2]' : hasActivity ? 'bg-white' : 'bg-slate-50/20'
                  }`}
                >
                  {/* Date number & Quick Add button */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        day.isToday
                          ? 'bg-[#1976D2] text-white font-black shadow-xs'
                          : booksRead.length > 0
                          ? 'bg-emerald-100 text-emerald-800 font-black'
                          : 'text-slate-700'
                      }`}
                    >
                      {day.dayNum}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateModal(day.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md bg-slate-200 hover:bg-[#1976D2] hover:text-white text-slate-700 text-xs font-bold transition-all flex items-center justify-center"
                      title="Jadwalkan Sesi Membaca"
                    >
                      +
                    </button>
                  </div>

                  {/* Badges & Content */}
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-24 no-scrollbar">
                    {/* AUTOMATICALLY DETECTED BOOKS READ */}
                    {booksRead.length > 0 && (
                      <div className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 truncate shadow-2xs">
                        <BookOpen className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{booksRead.length} Riset Dibaca</span>
                      </div>
                    )}

                    {/* Book Titles Chips */}
                    {booksRead.slice(0, 2).map((b) => (
                      <p
                        key={b.id}
                        className="text-[9px] font-semibold text-slate-700 truncate pl-1 hover:text-[#1976D2]"
                        title={b.title}
                      >
                        • {b.title}
                      </p>
                    ))}

                    {/* Highlights Made */}
                    {totalHighlights > 0 && (
                      <div className="px-1.5 py-0.2 rounded-md text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 truncate">
                        <Highlighter className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                        <span>{totalHighlights} Highlight</span>
                      </div>
                    )}

                    {/* Planned Schedules */}
                    {daySchedules.map((sch) => {
                      const isDone = sch.status === 'completed';
                      return (
                        <div
                          key={sch.id}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border truncate transition-all ${
                            isDone
                              ? 'bg-slate-100 text-slate-500 border-slate-200 line-through'
                              : 'bg-[#D1E4F6] text-[#0C3B69] border-[#B2D1F0]'
                          }`}
                          title={`Agenda: ${sch.title}`}
                        >
                          ⏰ {sch.start_time ? `${sch.start_time} ` : ''}
                          {sch.title}
                        </div>
                      );
                    })}
                  </div>

                  {/* Subtle click cue on hover */}
                  <div className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-[#1976D2] pt-1 text-right transition-opacity">
                    Lihat Detail →
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* AGENDA / LIST VIEW */
        schedules.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#1976D2] mx-auto flex items-center justify-center">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Belum Ada Agenda Membaca di Bulan Ini</h3>
              <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
                Tetapkan jadwal teratur untuk membaca riset agar pemahaman dan target Anda tercapai secara konsisten.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => openCreateModal()}
              className="bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl"
            >
              Jadwalkan Sesi Pertama
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((sch) => {
              const priorityCfg = PRIORITY_CFG[sch.priority] || PRIORITY_CFG.medium;
              const statusCfg = STATUS_CFG[sch.status] || STATUS_CFG.scheduled;
              const isDone = sch.status === 'completed';

              return (
                <div
                  key={sch.id}
                  className={`p-4 bg-white rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isDone ? 'border-slate-200 bg-slate-50/50 opacity-80' : 'border-slate-200 hover:border-[#1976D2] shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(sch)}
                      className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 text-transparent hover:border-[#1976D2]'
                      }`}
                      title={isDone ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-bold text-slate-700">
                          {new Date(sch.scheduled_date).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {sch.start_time && (
                          <span className="text-slate-500">
                            • {sch.start_time} - {sch.end_time || `${sch.target_duration_minutes}m`}
                          </span>
                        )}
                        <span className={`px-2 py-0.2 rounded-full border text-[10px] font-bold ${statusCfg.class}`}>
                          {statusCfg.label}
                        </span>
                        <span className={`px-2 py-0.2 rounded-md font-semibold text-[10px] ${priorityCfg.class}`}>
                          {priorityCfg.label}
                        </span>
                      </div>

                      <h4
                        className={`text-sm font-bold text-slate-900 ${
                          isDone ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {sch.title}
                      </h4>

                      {sch.product && (
                        <p className="text-xs text-slate-500 font-supporting truncate flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#1976D2]" />
                          <span>{sch.product.title}</span>
                          {sch.target_pages && <span>({sch.target_pages})</span>}
                        </p>
                      )}

                      {sch.notes && (
                        <p className="text-xs text-slate-600 font-supporting italic pt-1">
                          "{sch.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {sch.product?.slug && (
                      <Link
                        to={`/library/${sch.product.slug}/read`}
                        className="px-3 py-1.5 bg-[#D1E4F6] text-[#0C3B69] hover:bg-[#1976D2] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <span>Buka Riset</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(sch)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Agenda"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSchedule(sch.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Agenda"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ======================================================== */}
      {/* 1. INTERACTIVE DAY DETAIL MODAL (AUTOMATIC READING DETECTION) */}
      {/* ======================================================== */}
      {detailModalOpen && selectedDateForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      Aktivitas & Agenda Riset
                    </h3>
                    {selectedDateForDetail === new Date().toISOString().split('T')[0] && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1976D2] text-white">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-supporting mt-0.5">
                    {formattedSelectedDate}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Daily KPI Badges Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      Riset Dibaca
                    </span>
                    <span className="text-xs font-black text-emerald-950">
                      {selectedDayData?.books?.length || 0} Dokumen
                    </span>
                  </div>
                </div>

                <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-sky-800 uppercase block">
                      Waktu Membaca
                    </span>
                    <span className="text-xs font-black text-sky-950">
                      {selectedDayData?.total_duration_minutes || 0} Menit
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 flex items-center gap-2.5">
                  <Highlighter className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      Sorotan
                    </span>
                    <span className="text-xs font-black text-amber-950">
                      {selectedDayData?.highlights?.length || 0} Highlight
                    </span>
                  </div>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3 flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-indigo-800 uppercase block">
                      Catatan
                    </span>
                    <span className="text-xs font-black text-indigo-950">
                      {selectedDayData?.notes?.length || 0} Catatan
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 1: AUTOMATICALLY DETECTED BOOKS READ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Publikasi yang Dibaca pada Tanggal Ini (Terdeteksi Otomatis)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Otomatis
                  </span>
                </div>

                {(!selectedDayData?.books || selectedDayData.books.length === 0) ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      Belum Ada Dokumen yang Dibaca pada Hari Ini
                    </p>
                    <p className="text-[11px] text-slate-400 font-supporting max-w-sm mx-auto">
                      Buka dokumen laporan riset dari Library untuk membaca, dan sistem akan langsung mencatatnya di kalender ini secara otomatis.
                    </p>
                    <Link to="/library">
                      <Button size="sm" variant="outline" className="mt-2 text-xs font-bold rounded-xl border-[#B2D1F0] text-[#1976D2]">
                        Buka Library Saya
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDayData.books.map((b) => (
                      <Card
                        key={b.id}
                        className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-[#1976D2] transition-colors space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {b.cover_url ? (
                              <img
                                src={b.cover_url}
                                alt={b.title}
                                className="w-12 h-16 object-cover rounded-lg border border-slate-200 shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-12 h-16 bg-[#D1E4F6] text-[#1976D2] rounded-lg flex items-center justify-center shrink-0">
                                <BookOpen className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0 space-y-1">
                              <span className="text-[10px] font-black uppercase text-[#1976D2] bg-[#D1E4F6]/50 px-2 py-0.5 rounded border border-[#B2D1F0]">
                                {b.category_name || 'Laporan Riset'}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2">
                                {b.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-supporting">
                                <span>Terakhir dibaca pukul {b.last_read_time || 'Hari ini'} WIB</span>
                                <span>•</span>
                                <span>Halaman {b.pages_read} dari {b.total_pages}</span>
                                <span>•</span>
                                <span className="font-bold text-emerald-600">{b.progress}% Selesai</span>
                              </div>
                            </div>
                          </div>

                          <Link
                            to={`/library/${b.slug}/read`}
                            className="px-3 py-1.5 bg-[#1976D2] hover:bg-[#1562AF] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
                          >
                            <span>Lanjut Membaca</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {/* Reading Progress Bar */}
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#1976D2] h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(5, b.progress))}%` }}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: HIGHLIGHTS CREATED ON THIS DAY */}
              {selectedDayData?.highlights && selectedDayData.highlights.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Highlighter className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sorotan Teks / Kutipan yang Dibuat ({selectedDayData.highlights.length})</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedDayData.highlights.map((h) => (
                      <div
                        key={h.id}
                        className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1 text-xs"
                      >
                        <p className="font-medium text-slate-800 italic">
                          "{h.text}"
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span className="font-bold text-slate-700">{h.book_title} (Hal. {h.page})</span>
                          <span className="capitalize">{h.color}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: NOTES CREATED ON THIS DAY */}
              {selectedDayData?.notes && selectedDayData.notes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Catatan Riset Pribadi ({selectedDayData.notes.length})</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedDayData.notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1 text-xs"
                      >
                        <h5 className="font-bold text-slate-900">{n.title}</h5>
                        <p className="text-slate-700 whitespace-pre-line font-supporting">
                          {n.content}
                        </p>
                        <span className="text-[10px] text-slate-400 block pt-0.5">
                          {n.book_title} • Hal. {n.page}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: PLANNED READING SCHEDULES */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#1976D2]" />
                    <span>Agenda & Jadwal Riset ({selectedDayData?.schedules?.length || 0})</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setDetailModalOpen(false);
                      openCreateModal(selectedDateForDetail);
                    }}
                    className="text-xs font-bold text-[#1976D2] hover:text-[#1562AF] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Jadwal</span>
                  </button>
                </div>

                {(!selectedDayData?.schedules || selectedDayData.schedules.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                    <p className="text-xs text-slate-500 font-supporting">
                      Tidak ada agenda yang dijadwalkan khusus untuk tanggal ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayData.schedules.map((sch) => {
                      const isDone = sch.status === 'completed';
                      return (
                        <div
                          key={sch.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleComplete(sch)}
                              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 cursor-pointer ${
                                isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 text-transparent hover:border-[#1976D2]'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <div className="min-w-0">
                              <span className={`font-bold block truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                {sch.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {sch.start_time ? `Pukul ${sch.start_time}` : 'Waktu Fleksibel'} • {sch.target_duration_minutes} Menit
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailModalOpen(false);
                                openEditModal(sch);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(sch.id)}
                              className="p-1 text-rose-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs font-bold rounded-xl"
              >
                Tutup
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setDetailModalOpen(false);
                  openCreateModal(selectedDateForDetail);
                }}
                className="bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Jadwalkan Sesi di Tanggal Ini</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CREATE / EDIT SCHEDULE MODAL */}
      {/* ======================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingScheduleId ? 'Edit Agenda Membaca' : 'Buat Agenda Membaca Baru'}
                </h3>
                <p className="text-[11px] text-slate-500 font-supporting">
                  Tentukan tanggal, target durasi, dan dokumen yang ingin Anda telaah.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Agenda</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="misal: Telaah Laporan Sektoral Perbankan Bab 1-3..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Dokumen Riset (Opsional)</label>
                <select
                  value={modalProductId}
                  onChange={(e) =>
                    setModalProductId(e.target.value ? parseInt(e.target.value, 10) : '')
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] font-medium"
                >
                  <option value="">-- Umum / Tanpa Dokumen Tertentu --</option>
                  {libraryDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={modalDate}
                    onChange={(e) => setModalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Durasi</label>
                  <select
                    value={modalDuration}
                    onChange={(e) => setModalDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  >
                    <option value={15}>15 Menit (Ringan)</option>
                    <option value={30}>30 Menit (Standar)</option>
                    <option value={45}>45 Menit</option>
                    <option value={60}>1 Jam (Mendalam)</option>
                    <option value={90}>1.5 Jam</option>
                    <option value={120}>2 Jam (Komprehensif)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Waktu Mulai</label>
                  <input
                    type="time"
                    value={modalStartTime}
                    onChange={(e) => setModalStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Waktu Selesai</label>
                  <input
                    type="time"
                    value={modalEndTime}
                    onChange={(e) => setModalEndTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Halaman</label>
                  <input
                    type="text"
                    value={modalPages}
                    onChange={(e) => setModalPages(e.target.value)}
                    placeholder="misal: 1-15"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tingkat Prioritas</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'urgent'].map((p) => {
                    const cfg = PRIORITY_CFG[p];
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Catatan persiapan, fokus pertanyaan riset..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-[#1976D2] hover:bg-[#1562AF] text-white cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Agenda'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingPlannerTab;
