import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation
      });
      navigate(redirect);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mendaftar. Periksa data Anda.');
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Buat Akun Inpartner</h1>
          <p className="text-xs text-slate-500 font-supporting">Dapatkan akses penuh ke publikasi riset industri dan library pribadi Anda.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama Lengkap"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Profesional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Konfirmasi Password</label>
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
            {submitting ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Sudah memiliki akun?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-[#1976D2] font-semibold hover:underline">
            Masuk di sini &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
