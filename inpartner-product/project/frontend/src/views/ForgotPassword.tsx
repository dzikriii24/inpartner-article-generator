import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/lightswind/button';
import { Input } from '@/components/lightswind/input';
import { Card } from '@/components/lightswind/card';
import api from '@/services/api';

export const ForgotPassword: React.FC = () => {
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
      <Card className="w-full max-w-md p-8 bg-white/80 backdrop-blur-lg border border-zinc-200/80 shadow-md rounded-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Lupa Password</h1>
          <p className="text-xs text-zinc-500">Masukkan email terdaftar untuk menerima petunjuk reset password.</p>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-zinc-100 text-zinc-800 text-xs text-center font-medium">
            {msg}
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

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs py-2.5 shadow-xs"
          >
            {submitting ? 'Memproses...' : 'Kirim Tautan Reset'}
          </Button>
        </form>

        <p className="text-center text-xs text-zinc-500 pt-2 border-t border-zinc-100">
          Kembali ke{' '}
          <Link to="/login" className="font-bold text-zinc-900 hover:underline">
            Halaman Masuk
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default ForgotPassword;
