import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Clock,
  Calendar,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Target,
  Sparkles,
  Highlighter,
  MessageSquare,
  BookOpen,
  Filter,
  Edit2,
} from 'lucide-react';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import { toast } from 'sonner';
import api from '@/services/api';

const HEATMAP_COLORS = [
  'bg-slate-100', // level 0
  'bg-[#D1E4F6]', // level 1
  'bg-sky-400', // level 2
  'bg-[#1976D2]', // level 3
  'bg-[#0C3B69]', // level 4
];

export const ActivityAnalyticsTab: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivityType, setSelectedActivityType] = useState('all');
  const [loading, setLoading] = useState(true);

  // Goals Modal State
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [goalDailyMinutes, setGoalDailyMinutes] = useState(30);
  const [goalWeeklyHours, setGoalWeeklyHours] = useState(5);
  const [goalMonthlyDocs, setGoalMonthlyDocs] = useState(3);
  const [submittingGoals, setSubmittingGoals] = useState(false);

  // Tooltip state for heatmap
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    minutes: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, activitiesRes] = await Promise.all([
        api.get('/profile/analytics'),
        api.get('/profile/activities'),
      ]);

      setAnalyticsData(analyticsRes.data);
      const acts = activitiesRes.data?.data || activitiesRes.data || [];
      setActivities(Array.isArray(acts) ? acts : []);

      if (analyticsRes.data?.goals) {
        setGoalDailyMinutes(analyticsRes.data.goals.daily_minutes || 30);
        setGoalWeeklyHours(analyticsRes.data.goals.weekly_hours || 5);
        setGoalMonthlyDocs(analyticsRes.data.goals.monthly_docs || 3);
      }
    } catch (err) {
      console.error('Failed to load analytics', err);
      toast.error('Gagal memuat analitik aktivitas membaca.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (selectedActivityType === 'all') return activities;
    return activities.filter((a) => a.activity_type === selectedActivityType);
  }, [activities, selectedActivityType]);

  // Group activities into Today, Yesterday, This Week, Older
  const groupedActivities = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const groups: {
      today: any[];
      yesterday: any[];
      this_week: any[];
      older: any[];
    } = {
      today: [],
      yesterday: [],
      this_week: [],
      older: [],
    };

    filteredActivities.forEach((act) => {
      const d = act.occurred_at ? act.occurred_at.split('T')[0] : '';
      if (d === today) {
        groups.today.push(act);
      } else if (d === yesterday) {
        groups.yesterday.push(act);
      } else {
        const actDate = new Date(act.occurred_at);
        const diffDays = (new Date().getTime() - actDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays <= 7) {
          groups.this_week.push(act);
        } else {
          groups.older.push(act);
        }
      }
    });

    return groups;
  }, [filteredActivities]);

  // Heatmap 52 weeks grid generator
  const heatmapEntries = useMemo(() => {
    if (!analyticsData?.heatmap) return [];
    return Object.entries(analyticsData.heatmap).map(([date, info]: any) => ({
      date,
      minutes: info.minutes || 0,
      count: info.count || 0,
      level: info.level || 0,
    }));
  }, [analyticsData]);

  // Handle Save Goals
  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingGoals(true);
    try {
      await api.put('/profile/goals', {
        daily_minutes: goalDailyMinutes,
        weekly_hours: goalWeeklyHours,
        monthly_docs: goalMonthlyDocs,
      });
      toast.success('Target membaca berhasil diperbarui!');
      setGoalsModalOpen(false);
      fetchAnalytics();
    } catch (err) {
      toast.error('Gagal memperbarui target.');
    } finally {
      setSubmittingGoals(false);
    }
  };

  const streak = analyticsData?.streak || 0;
  const weeklyDist = analyticsData?.weekly_distribution || {};
  const maxWeeklyMinutes = Math.max(1, ...Object.values(weeklyDist).map((v: any) => Number(v) || 0));

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">
            Reading Analytics & Activity Timeline
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Statistik & Riwayat Aktivitas Riset
          </h2>
          <p className="text-xs text-slate-500 font-supporting mt-1">
            Visualisasi intensitas membaca, reading streak, pencapaian target, dan catatan riwayat aktivitas autentik Anda.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setGoalsModalOpen(true)}
          className="text-xs font-bold rounded-xl border-[#B2D1F0] text-[#1976D2] hover:bg-[#D1E4F6]/40 cursor-pointer flex items-center gap-1.5"
        >
          <Target className="w-3.5 h-3.5" />
          <span>Atur Target Membaca</span>
        </Button>
      </div>

      {/* TOP ROW: STREAK + INSIGHTS + WEEKLY BAR */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Streak & Key Metric Card */}
        <Card className="md:col-span-4 p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Reading Streak
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Flame className="w-4 h-4 fill-orange-500" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
                <span>{streak}</span>
                <span className="text-base font-bold text-slate-500">Hari Berturut-turut</span>
              </div>
              <p className="text-xs text-slate-500 font-supporting">
                {streak > 0
                  ? 'Pertahankan kebiasaan membaca riset setiap hari untuk menjaga streak aktif.'
                  : 'Mulai baca dokumen hari ini untuk menyalakan reading streak Anda.'}
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total Waktu Membaca</span>
              <span className="font-bold text-slate-900">
                {analyticsData?.total_minutes || 0} Menit
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total Sesi Membaca</span>
              <span className="font-bold text-slate-900">
                {analyticsData?.total_sessions || 0} Sesi
              </span>
            </div>
            {analyticsData?.most_active_document && (
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-slate-500">Dokumen Terbanyak</span>
                <span className="font-bold text-[#1976D2] truncate max-w-[140px]">
                  {analyticsData.most_active_document.title}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Weekly Reading Distribution Bars */}
        <Card className="md:col-span-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribusi Membaca Mingguan</h3>
              <p className="text-[11px] text-slate-500 font-supporting">
                Durasi waktu membaca (menit) berdasarkan hari dalam seminggu
              </p>
            </div>
            <BarChart2 className="w-4 h-4 text-[#1976D2]" />
          </div>

          <div className="grid grid-cols-7 gap-3 items-end h-40 pt-4">
            {Object.entries(weeklyDist).map(([dayName, minutes]: any) => {
              const heightPercent = Math.max(8, Math.round((minutes / maxWeeklyMinutes) * 100));
              return (
                <div key={dayName} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-500">{minutes}m</span>
                  <div className="w-full bg-slate-100 rounded-xl h-24 overflow-hidden flex items-end">
                    <div
                      className="w-full bg-[#1976D2] hover:bg-[#1562AF] transition-all rounded-xl"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{dayName.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* READING CONTRIBUTION HEATMAP (365 DAYS) */}
      <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4 relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1976D2]" />
              <span>Peta Intensitas Membaca (Annual Reading Heatmap)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-supporting mt-0.5">
              Rekaman intensitas aktivitas membaca riset Anda selama 365 hari terakhir.
            </p>
          </div>

          {/* Scale Legend */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Kurang</span>
            {HEATMAP_COLORS.map((cls, idx) => (
              <span key={idx} className={`w-3 h-3 rounded-xs ${cls} border border-slate-200/50`} />
            ))}
            <span>Padat</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-grid grid-rows-7 grid-flow-col gap-1 min-w-[700px] p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
            {heatmapEntries.map((item, idx) => {
              const bgClass = HEATMAP_COLORS[item.level] || HEATMAP_COLORS[0];
              return (
                <div
                  key={idx}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredDay({
                      date: item.date,
                      minutes: item.minutes,
                      count: item.count,
                      x: rect.left,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-3.5 h-3.5 rounded-xs transition-all cursor-pointer hover:ring-2 hover:ring-[#1976D2] ${bgClass}`}
                />
              );
            })}
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredDay && (
          <div className="p-2.5 rounded-xl bg-slate-900 text-white text-[11px] shadow-lg space-y-0.5 pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-12"
               style={{ left: hoveredDay.x + 8, top: hoveredDay.y }}>
            <div className="font-bold">
              {new Date(hoveredDay.date).toLocaleDateString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <div className="text-slate-300 font-supporting">
              {hoveredDay.minutes > 0 ? `${hoveredDay.minutes} menit membaca` : 'Tidak ada sesi membaca'}
              {hoveredDay.count > 0 && ` • ${hoveredDay.count} aktivitas`}
            </div>
          </div>
        )}
      </Card>

      {/* READING ACTIVITY TIMELINE */}
      <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Timeline Riwayat Aktivitas Riset</h3>
            <p className="text-xs text-slate-500 font-supporting mt-0.5">
              Seluruh rekam jejak membaca, penambahan sorotan, catatan, dan agenda riset Anda.
            </p>
          </div>

          {/* Activity Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedActivityType}
              onChange={(e) => setSelectedActivityType(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:border-[#1976D2]"
            >
              <option value="all">Semua Tipe Aktivitas</option>
              <option value="reading_started">Sesi Membaca</option>
              <option value="document_completed">Dokumen Selesai</option>
              <option value="highlight_created">Sorotan Dibuat</option>
              <option value="note_created">Catatan Dibuat</option>
              <option value="schedule_created">Agenda Dijadwalkan</option>
            </select>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-slate-400 italic text-xs">
            Belum ada rekaman aktivitas yang sesuai dengan filter.
          </div>
        ) : (
          <div className="space-y-6">
            {/* TODAY */}
            {groupedActivities.today.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#1976D2] uppercase tracking-wider block">
                  Hari Ini
                </span>
                <div className="space-y-2.5">
                  {groupedActivities.today.map((act) => (
                    <ActivityRow key={act.id} activity={act} />
                  ))}
                </div>
              </div>
            )}

            {/* YESTERDAY */}
            {groupedActivities.yesterday.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Kemarin
                </span>
                <div className="space-y-2.5">
                  {groupedActivities.yesterday.map((act) => (
                    <ActivityRow key={act.id} activity={act} />
                  ))}
                </div>
              </div>
            )}

            {/* THIS WEEK */}
            {groupedActivities.this_week.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Minggu Ini
                </span>
                <div className="space-y-2.5">
                  {groupedActivities.this_week.map((act) => (
                    <ActivityRow key={act.id} activity={act} />
                  ))}
                </div>
              </div>
            )}

            {/* OLDER */}
            {groupedActivities.older.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Sebelumnya
                </span>
                <div className="space-y-2.5">
                  {groupedActivities.older.map((act) => (
                    <ActivityRow key={act.id} activity={act} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* EDIT GOALS MODAL */}
      {goalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Atur Target Membaca Pribadi</h3>
                <p className="text-[11px] text-slate-500 font-supporting">
                  Tentukan target harian, mingguan, dan bulanan untuk meningkatkan produktivitas riset Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGoalsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoals} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Waktu Harian (Menit)
                </label>
                <input
                  type="number"
                  min={5}
                  max={720}
                  value={goalDailyMinutes}
                  onChange={(e) => setGoalDailyMinutes(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Waktu Mingguan (Jam)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={goalWeeklyHours}
                  onChange={(e) => setGoalWeeklyHours(parseFloat(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Dokumen Selesai per Bulan
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={goalMonthlyDocs}
                  onChange={(e) => setGoalMonthlyDocs(parseInt(e.target.value, 10) || 3)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGoalsModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submittingGoals}
                  className="bg-[#1976D2] hover:bg-[#1562AF] text-white"
                >
                  {submittingGoals ? 'Menyimpan...' : 'Simpan Target'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Activity Row Helper Component
const ActivityRow: React.FC<{ activity: any }> = ({ activity }) => {
  const getIcon = () => {
    switch (activity.activity_type) {
      case 'highlight_created':
        return <Highlighter className="w-3.5 h-3.5 text-amber-500" />;
      case 'note_created':
        return <MessageSquare className="w-3.5 h-3.5 text-sky-500" />;
      case 'document_completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'schedule_created':
        return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-[#1976D2]" />;
    }
  };

  const timeStr = activity.occurred_at
    ? new Date(activity.occurred_at).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/60 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-800 truncate">{activity.description}</div>
          <div className="text-[10px] text-slate-400 font-supporting">
            {timeStr && `${timeStr} `}
            {activity.duration_minutes ? `• Durasi ${activity.duration_minutes} menit` : ''}
          </div>
        </div>
      </div>

      {activity.product?.slug && (
        <Link
          to={`/library/${activity.product.slug}/read`}
          className="text-[11px] font-bold text-[#1976D2] hover:underline shrink-0"
        >
          Lihat Riset
        </Link>
      )}
    </div>
  );
};

export default ActivityAnalyticsTab;

