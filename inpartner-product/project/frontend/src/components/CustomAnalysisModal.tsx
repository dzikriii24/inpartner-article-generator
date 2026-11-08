import React, { useState } from 'react';
import { X, Send, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface CustomAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomAnalysisModal: React.FC<CustomAnalysisModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: '',
    phone: '',
    sector: 'Makroekonomi & Kebijakan',
    topic: '',
    scope: '',
    budget_range: 'standard',
    timeline: '2_weeks',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/custom-requests', form);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengirimkan permintaan riset. Silakan lengkapi data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-16 h-16 bg-[#D1E4F6] text-[#1976D2] rounded-2xl flex items-center justify-center mx-auto border border-[#B2D1F0]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Permintaan Riset Diterima</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Tim Research Lab & Senior Partner Inpartner akan meninjau lingkup studi Anda dan menghubungi dalam 1x24 jam kerja melalui email <strong>{form.email}</strong>.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setSuccess(false);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="space-y-1 mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-[11px] font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#1976D2]" /> Bespoke Research & Custom Data Request
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Ajukan Riset Kustom B2B</h2>
              <p className="text-xs text-slate-600">
                Analisis sektoral mendalam, validasi fakta lapangan domestik, dan sintesis regulasi khusus untuk kebutuhan Corporate Strategy, Corsec, dan Direksi.
              </p>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nama Anda"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Korporat / Profesional *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="nama@perusahaan.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Perusahaan / Organisasi</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="PT / Instansi"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor WhatsApp / Kontak</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sektor Industri *</label>
                  <select
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                  >
                    <option value="Makroekonomi & Kebijakan">Makroekonomi & Kebijakan Fiskal</option>
                    <option value="Perbankan & Fintech">Perbankan, Fintech & Keuangan</option>
                    <option value="Energi, Tambang & ESG">Energi Terbarukan, Tambang & ESG</option>
                    <option value="Konsumen & Ritel">Pasar Konsumen, FMCG & Ritel</option>
                    <option value="Teknologi & AI">Teknologi, AI & Transformasi Digital</option>
                    <option value="Infrastruktur & Properti">Infrastruktur, Logistik & Properti</option>
                    <option value="Kesehatan & Farmasi">Kesehatan & Industri Farmasi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Timeline</label>
                  <select
                    value={form.timeline}
                    onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                  >
                    <option value="urgent">Express (&lt; 1 Minggu)</option>
                    <option value="2_weeks">Standar (1 - 2 Minggu)</option>
                    <option value="1_month">Komprehensif (1 Bulan)</option>
                    <option value="quarterly">Kemitraan Berkala (Quarterly)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul / Topik Studi Khusus *</label>
                <input
                  type="text"
                  required
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="Contoh: Pemetaan Dampak Regulasi Devisa Hasil Ekspor Terhadap Likuiditas Bank"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lingkup & Spesifikasi Kebutuhan Data *</label>
                <textarea
                  required
                  rows={4}
                  value={form.scope}
                  onChange={(e) => setForm({ ...form, scope: e.target.value })}
                  placeholder="Jelaskan pertanyaan strategis yang ingin dijawab, parameter data historis yang dibutuhkan, atau deliverable yang diharapkan (misal: Ringkasan Eksekutif 2 Halaman + Dataset XLS)..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D1E4F6] focus:border-[#1976D2]"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#D1E4F6]/30 border border-[#B2D1F0] flex items-start gap-3 text-xs text-[#0C3B69]">
                <ShieldCheck className="w-5 h-5 text-[#1976D2] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Semua permintaan dilindungi oleh Non-Disclosure Agreement (NDA) standar Inpartner Intelligence. Data perusahaan Anda tidak akan dipublikasikan ke publik.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Mengirimkan...' : 'Kirim Permintaan'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomAnalysisModal;
