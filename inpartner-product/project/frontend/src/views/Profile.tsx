import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/lightswind/button';
import { Input } from '@/components/lightswind/input';
import { Card } from '@/components/lightswind/card';
import api from '@/services/api';

export const Profile: React.FC = () => {
  const { user, fetchMe } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await api.put('/profile', { name, email });
      await fetchMe();
      setMsg('Profil berhasil diperbarui!');
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Gagal mengupdate profil.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-4">
      <div className="border-b border-zinc-200/60 pb-4">
        <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Pengaturan Profil</h1>
        <p className="text-xs text-zinc-500 mt-1">Kelola data profil pengguna akun Inpartner Anda.</p>
      </div>

      <Card className="p-8 bg-white/80 backdrop-blur-md border border-zinc-200/70 shadow-xs rounded-3xl space-y-6">
        {msg && (
          <div className="p-3 rounded-xl bg-zinc-100 text-zinc-800 text-xs text-center font-semibold">
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Nama Lengkap</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-zinc-50 border-zinc-200 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-50 border-zinc-200 text-xs"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs py-2.5 shadow-xs"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
