import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/services/api';

export const ForgotPassword: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMsg('Tautan reset password telah dikirim ke email Anda.');
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Gagal mengirim email reset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/inpartner_logo.jpeg"
            alt="Inpartner"
            className="w-12 h-12 rounded-xl object-contain mx-auto mb-1 border border-slate-100 shadow-2xs"
          />
          <span className="font-wordmark font-extrabold text-[#1976D2] text-sm block">INPARTNER</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('auth.reset_password_title', 'Lupa Password')}</h1>
          <p className="text-xs text-slate-500 font-supporting">{t('auth.reset_password_desc', 'Masukkan email terdaftar untuk menerima petunjuk pemulihan password.')}</p>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-xs text-center font-medium">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold rounded-xl text-xs py-2.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Kirim Tautan Reset'}
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          <Link to="/login" className="text-[#1976D2] font-semibold hover:underline">
            &larr; Kembali ke Halaman Masuk
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
