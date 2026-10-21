import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/lightswind/button';
import { Input } from '@/components/lightswind/input';
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
      <Card className="w-full max-w-md p-8 bg-white/80 backdrop-blur-lg border border-zinc-200/80 shadow-md rounded-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Setel Password Baru</h1>
          <p className="text-xs text-zinc-500">Masukkan password baru untuk akun Anda.</p>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-zinc-100 text-zinc-800 text-xs text-center font-medium">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Password Baru</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              required
              className="bg-zinc-50 border-zinc-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Konfirmasi Password Baru</label>
            <Input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Ulangi password"
              required
              className="bg-zinc-50 border-zinc-200 text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs py-2.5 shadow-xs"
          >
            {submitting ? 'Memproses...' : 'Simpan Password Baru'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
