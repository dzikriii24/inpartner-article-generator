import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import { ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(redirect);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email atau password salah.');
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Selamat Datang Kembali</h1>
          <p className="text-xs text-slate-500 font-supporting">Masuk ke akun Inpartner untuk mengakses dokumen riset & library Anda.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-[#1976D2] hover:underline">
                Lupa Password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white font-semibold rounded-xl text-xs py-2.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Memproses Masuk...' : 'Masuk Sekarang'}
          </Button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Belum memiliki akun?{' '}
          <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="text-[#1976D2] font-semibold hover:underline">
            Daftar Akun Baru &rarr;
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
