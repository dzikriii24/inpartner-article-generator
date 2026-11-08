import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Highlighter,
  MessageSquare,
  Bookmark,
  Flame,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Target,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';

interface ProfileOverviewTabProps {
  data: any;
  loading: boolean;
  onTabChange: (tab: string) => void;
}

export const ProfileOverviewTab: React.FC<ProfileOverviewTabProps> = ({
  data,
  loading,
  onTabChange,
}) => {
  const metrics = data?.metrics || {};
  const today = data?.today || {};
  const continueReading = data?.continue_reading;
  const upcomingSchedules = data?.upcoming_schedules || [];
  const goals = data?.goals || {};

  // Dynamic time greeting in Indonesian
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  const metricCards = [
    {
      id: 'docs',
      label: 'Koleksi Dokumen',
      value: metrics.total_documents || 0,
      unit: 'Publikasi',
      icon: BookOpen,
      color: 'text-[#1976D2]',
      bg: 'bg-[#D1E4F6]',
      tab: 'pipeline',
    },
    {
      id: 'hours',
      label: 'Waktu Membaca',
      value: metrics.total_reading_hours || 0,
      unit: 'Jam Riset',
      icon: Clock,
      color: 'text-sky-600',
      bg: 'bg-sky-100',
      tab: 'analytics',
    },
    {
      id: 'highlights',
      label: 'Sorotan Riset',
      value: metrics.total_highlights || 0,
      unit: 'Kutipan',
      icon: Highlighter,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
      tab: 'notebook',
    },
    {
      id: 'notes',
      label: 'Catatan Pribadi',
      value: metrics.total_notes || 0,
      unit: 'Catatan',
      icon: MessageSquare,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      tab: 'notebook',
    },
    {
      id: 'bookmarks',
      label: 'Penanda Halaman',
      value: metrics.total_bookmarks || 0,
      unit: 'Bookmark',
      icon: Bookmark,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
      tab: 'notebook',
    },
    {
      id: 'streak',
      label: 'Reading Streak',
      value: metrics.reading_streak_days || 0,
      unit: 'Hari Aktif',
      icon: Flame,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      tab: 'analytics',
    },
    {
      id: 'completed',
      label: 'Riset Selesai',
      value: metrics.completed_documents || 0,
      unit: 'Laporan',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      tab: 'pipeline',
    },
    {
      id: 'schedules',
      label: 'Agenda Riset',
      value: metrics.scheduled_sessions || 0,
      unit: 'Terjadwal',
      icon: Calendar,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      tab: 'calendar',
    },
  ];

  if (loading) {
    return (
      <div className="py-12 space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-2xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. GREETING & SUMMARY HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2] font-sans">
            Personal Research Dashboard
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {getGreeting()}, {data?.user?.name || 'Rekan Peneliti'}
          </h2>
          <p className="text-xs text-slate-500 font-supporting mt-1">
            Ringkasan menyeluruh aktivitas membaca, pipeline riset, dan produktivitas intelijen bisnis Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTabChange('calendar')}
            className="text-xs font-bold rounded-xl border-[#B2D1F0] text-[#1976D2] hover:bg-[#D1E4F6]/40 cursor-pointer flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Jadwal Riset</span>
          </Button>

          <Button
            size="sm"
            onClick={() => onTabChange('pipeline')}
            className="text-xs bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Buka Pipeline</span>
          </Button>
        </div>
      </div>

      {/* 2. 8 AUTHENTIC METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {metricCards.map((m) => {
          const IconComp = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onTabChange(m.tab)}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-[#1976D2] hover:shadow-xs transition-all text-left flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
                  {m.label}
                </span>
                <div className={`w-8 h-8 rounded-xl ${m.bg} ${m.color} flex items-center justify-center`}>
                  <IconComp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {m.value}
                </div>
                <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {m.unit}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. MIDDLE SECTION: TODAY'S READING + CONTINUE READING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT (7 cols): CONTINUE READING BANNER */}
        <div className="lg:col-span-7 flex flex-col">
          <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs flex-1 flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#1976D2]" />
                <span>Lanjutkan Bacaan Terakhir</span>
              </span>
              {continueReading && (
                <span className="text-[11px] font-bold text-[#1976D2] bg-[#D1E4F6] px-2.5 py-0.5 rounded-full">
                  Halaman {continueReading.last_read_page} dari {continueReading.total_pages}
                </span>
              )}
            </div>

            {continueReading ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0C3B69] bg-[#D1E4F6] px-2 py-0.5 rounded-md inline-block">
                    {continueReading.category_name || 'Riset Tematik'}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-2">
                    {continueReading.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-supporting">
                    Terakhir diakses{' '}
                    {continueReading.last_accessed_at
                      ? new Date(continueReading.last_accessed_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Baru saja'}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Progres Bacaan</span>
                    <span className="font-bold text-[#1976D2]">{continueReading.progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1976D2] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, continueReading.progress)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Link to={`/library/${continueReading.slug}/read?page=${continueReading.last_read_page}`}>
                    <Button
                      size="sm"
                      className="w-full sm:w-auto bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Buka Workspace Membaca</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">Belum Ada Sesi Membaca Aktif</h4>
                  <p className="text-xs text-slate-500 font-supporting max-w-sm mx-auto">
                    Mulai membaca publikasi digital dari koleksi Anda untuk merekam progres dan catatan.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTabChange('pipeline')}
                  className="rounded-xl border-[#B2D1F0] text-[#1976D2] cursor-pointer"
                >
                  Pilih dari Pipeline
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT (5 cols): TODAY'S STATS & GOALS */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {/* Today's Reading Box */}
          <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Aktivitas Hari Ini</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-bold text-slate-900">{today.duration_minutes || 0}m</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Waktu Baca</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-bold text-amber-600">{today.highlights_count || 0}</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Sorotan Baru</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-lg font-bold text-[#1976D2]">{today.notes_count || 0}</div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">Catatan Baru</div>
              </div>
            </div>

            {/* Weekly Target Progress */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#1976D2]" />
                  <span>Target Mingguan: {goals?.targets?.weekly_hours || 5} Jam</span>
                </span>
                <span className="font-bold text-[#1976D2]">
                  {goals?.progress?.weekly_hours_actual || 0} / {goals?.targets?.weekly_hours || 5} Jam
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, goals?.progress?.weekly_percent || 0)}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Quick Upcoming Agenda */}
          <Card className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1976D2]" />
                <span>Agenda Riset Mendatang</span>
              </span>
              <button
                type="button"
                onClick={() => onTabChange('calendar')}
                className="text-[11px] font-bold text-[#1976D2] hover:underline cursor-pointer"
              >
                Lihat Kalender
              </button>
            </div>

            {upcomingSchedules.length > 0 ? (
              <div className="space-y-2">
                {upcomingSchedules.slice(0, 2).map((s: any) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{s.title}</div>
                      <div className="text-[10px] text-slate-500 font-supporting">
                        {new Date(s.scheduled_date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        {s.start_time && `• ${s.start_time}`}
                      </div>
                    </div>
                    {s.product?.slug && (
                      <Link
                        to={`/library/${s.product.slug}/read`}
                        className="p-1 rounded-lg text-[#1976D2] hover:bg-white transition-colors"
                        title="Buka Dokumen"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                Belum ada jadwal riset mendatang. Buat agenda di Kalender.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
export default ProfileOverviewTab;

