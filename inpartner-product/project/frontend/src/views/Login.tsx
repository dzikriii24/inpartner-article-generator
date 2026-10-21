import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/lightswind/button';
import { Input } from '@/components/lightswind/input';
import { Card } from '@/components/lightswind/card';
import { Lock, Mail, ArrowRight } from 'lucide-react';

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
      <Card className="w-full max-w-md p-8 bg-white/80 backdrop-blur-lg border border-zinc-200/80 shadow-md rounded-3xl space-y-6">
        <div className="text-center space-y-2">
          <span className="w-10 h-10 rounded-2xl bg-zinc-900 text-white inline-flex items-center justify-center text-sm font-serif font-black mb-2">
            IN
          </span>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Selamat Datang Kembali</h1>
          <p className="text-xs text-zinc-500">Masuk ke akun Inpartner untuk mengakses artikel & library Anda.</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
              className="bg-zinc-50 border-zinc-200 text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-zinc-700">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium">
                Lupa Password?
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-zinc-50 border-zinc-200 text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs py-2.5 shadow-xs gap-2"
          >
            {submitting ? 'Memproses...' : 'Masuk Sekarang'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100">
          Belum punya akun?{' '}
          <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="font-bold text-zinc-900 hover:underline">
            Daftar Akun Baru
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default Login;
