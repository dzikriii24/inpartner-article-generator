import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import api from '@/services/api';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setMsg('Konfirmasi password tidak sesuai.');
      return;
    }
    setSubmitting(true);
    setMsg('');
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      setMsg('Password berhasil diubah. Mengalihkan ke halaman masuk...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Gagal mereset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-6">
        <div className="text-center space-y-2">
          <span className="w-10 h-10 rounded-xl bg-[#1976D2] text-white inline-flex items-center justify-center text-xs font-wordmark font-extrabold shadow-xs mb-1">
            IN
          </span>
          <span className="font-wordmark font-extrabold text-[#1976D2] text-sm block">INPARTNER</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Setel Password Baru</h1>
          <p className="text-xs text-slate-500 font-supporting">Masukkan password baru untuk mengamankan akun Anda.</p>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-xs text-center font-medium">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password Baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              required
              minLength={8}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Ulangi password"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold rounded-xl text-xs py-2.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Simpan Password Baru'}
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

export default ResetPassword;
