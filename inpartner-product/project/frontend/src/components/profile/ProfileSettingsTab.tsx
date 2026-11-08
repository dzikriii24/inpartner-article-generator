import React, { useState, useRef } from 'react';
import {
  User as UserIcon,
  Shield,
  Lock,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Briefcase,
  Globe,
  Clock,
  Sparkles,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/lightswind/button';
import { Card } from '@/components/lightswind/card';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

export const ProfileSettingsTab: React.FC = () => {
  const { user, fetchMe, isAdmin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Identity Form State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [country, setCountry] = useState(user?.country || 'Indonesia');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Jakarta');
  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferred_language || 'id');
  const [bio, setBio] = useState(user?.bio || '');
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Update Profile Details
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    try {
      await api.put('/profile/details', {
        name,
        phone,
        job_title: jobTitle,
        organization,
        department,
        country,
        timezone,
        preferred_language: preferredLanguage,
        bio,
      });
      await fetchMe();
      toast.success('Informasi profil berhasil diperbarui!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil.');
    } finally {
      setSubmittingProfile(false);
    }
  };

  // Avatar Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 4MB.');
      return;
    }

    // Local Preview
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchMe();
      setAvatarPreview(res.data?.avatar_url || null);
      toast.success('Foto profil berhasil diunggah!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah foto profil.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Delete Avatar Handler
  const handleDeleteAvatar = async () => {
    if (!window.confirm('Yakin ingin menghapus foto profil?')) return;
    try {
      await api.delete('/profile/avatar');
      await fetchMe();
      setAvatarPreview(null);
      toast.success('Foto profil berhasil dihapus.');
    } catch (err) {
      toast.error('Gagal menghapus foto profil.');
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok.');
      return;
    }

    setSubmittingPassword(true);
    try {
      await api.put('/auth/password', {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      toast.success('Password akun Anda berhasil diubah!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah password. Periksa password lama Anda.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">
          Account & Preferences
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
          Pengaturan Akun & Keamanan
        </h2>
        <p className="text-xs text-slate-500 font-supporting mt-1">
          Kelola informasi identitas institusional, foto profil, preferensi zona waktu, dan keamanan akun Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: IDENTITY & AVATAR (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* PROFILE PHOTO CARD */}
          <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#1976D2]" />
              <span>Foto Profil Akun</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#1976D2] to-sky-400 text-white flex items-center justify-center text-3xl font-black overflow-hidden border-2 border-white shadow-md">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt={user?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-slate-900/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                  title="Ganti Foto"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 block">Pilih Berkas Foto</span>
                  <span className="text-[11px] text-slate-500 font-supporting block">
                    Format JPG, PNG, atau WebP. Maksimal ukuran 4MB.
                  </span>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="text-xs font-bold rounded-xl border-[#B2D1F0] text-[#1976D2] hover:bg-[#D1E4F6]/40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingAvatar ? 'Mengunggah...' : 'Ganti Foto'}</span>
                  </Button>

                  {avatarPreview && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleDeleteAvatar}
                      className="text-xs font-bold rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* PERSONAL DETAILS FORM */}
          <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-[#1976D2]" />
              <span>Informasi Personal & Institusi</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alamat Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Email terhubung dengan lisensi akun.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="misal: 081234567890"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jabatan / Profesi</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="misal: Chief Investment Officer / Analyst"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Institusi / Perusahaan</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="misal: Bank Mandiri / Astra International"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Divisi / Departemen</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="misal: Corporate Strategy / Research"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Negara</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Zona Waktu</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  >
                    <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                    <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                    <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                    <option value="UTC">UTC (Universal)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bahasa Tampilan</label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  >
                    <option value="id">Bahasa Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Bio Singkat</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan latar belakang profesional atau fokus minat riset Anda..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingProfile}
                  className="bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold rounded-xl cursor-pointer"
                >
                  {submittingProfile ? 'Menyimpan...' : 'Simpan Informasi Profil'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: SECURITY & TIER (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* ACCOUNT TIER CARD */}
          <Card className="p-6 bg-gradient-to-br from-slate-900 to-[#0C3B69] text-white rounded-3xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 bg-sky-500/20 px-2.5 py-0.5 rounded-full border border-sky-400/30">
                {isAdmin ? 'Administrator' : 'Corporate Research License'}
              </span>
              <Shield className="w-5 h-5 text-sky-300" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold tracking-tight">Lisensi Intelijen Bisnis</h4>
              <p className="text-xs text-slate-300 font-supporting leading-relaxed">
                Akses terverifikasi untuk membaca publikasi makroekonomi, unduh dokumen beranotasi, dan pemanfaatan AI Reading Assistant.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span>Status Akun:</span>
              <span className="font-bold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aktif Terproteksi</span>
              </span>
            </div>
          </Card>

          {/* CHANGE PASSWORD CARD */}
          <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#1976D2]" />
              <span>Keamanan Kata Sandi</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Saat Ini</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password lama"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingPassword}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  {submittingPassword ? 'Memperbarui...' : 'Perbarui Password Akun'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
export default ProfileSettingsTab;

