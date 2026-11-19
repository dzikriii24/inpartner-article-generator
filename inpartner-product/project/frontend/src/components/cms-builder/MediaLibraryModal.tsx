import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Copy,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { cmsApi } from '@/services/cms/cmsApi';
import type { CmsMediaItem } from '@/types/cms/builder';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: CmsMediaItem) => void;
  onToast?: (type: 'success' | 'error' | 'info', msg: string) => void;
}

const FOLDERS = [
  { id: 'all', label: 'Semua' },
  { id: 'general', label: 'Umum' },
  { id: 'hero', label: 'Hero & Split' },
  { id: 'banners', label: 'Banners' },
  { id: 'logos', label: 'Logo & Brand' },
];

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  onToast,
}) => {
  const [items, setItems] = useState<CmsMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('all');
  const [selected, setSelected] = useState<CmsMediaItem | null>(null);
  const [altDraft, setAltDraft] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cmsApi.getMedia({ q: search || undefined, folder });
      setItems(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      onToast?.('error', 'Gagal memuat Media Library.');
    } finally {
      setLoading(false);
    }
  }, [search, folder, onToast]);

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen, fetchItems]);

  useEffect(() => {
    if (selected) {
      setAltDraft(selected.alt_text || '');
      setCaptionDraft(selected.caption || '');
    }
  }, [selected]);

  if (!isOpen) return null;

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!ALLOWED_MIME.includes(file.type)) {
      onToast?.('error', 'Format file tidak didukung. Gunakan JPG, PNG, WebP, GIF, atau SVG.');
      return;
    }
    if (file.size > MAX_BYTES) {
      onToast?.('error', 'Ukuran file melebihi batas maksimal 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const targetFolder = folder === 'all' ? 'general' : folder;
      const res = await cmsApi.uploadMedia(file, { folder: targetFolder });
      const created = res.data.media;
      setItems((prev) => [created, ...prev]);
      setSelected(created);
      onToast?.('success', 'Gambar berhasil diunggah ke Media Library.');
    } catch (err: any) {
      onToast?.('error', err?.response?.data?.message || 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!selected) return;
    setSavingMeta(true);
    try {
      const res = await cmsApi.updateMedia(selected.id, {
        alt_text: altDraft,
        caption: captionDraft,
      });
      const updated = res.data.media;
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      setSelected(updated);
      onToast?.('success', 'Alt text & caption diperbarui.');
    } catch {
      onToast?.('error', 'Gagal menyimpan metadata media.');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDelete = async (media: CmsMediaItem) => {
    try {
      await cmsApi.deleteMedia(media.id, false);
      setItems((prev) => prev.filter((it) => it.id !== media.id));
      if (selected?.id === media.id) setSelected(null);
      onToast?.('success', 'Media berhasil dihapus.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Tidak dapat menghapus media.';
      onToast?.('error', msg);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard?.writeText(url);
    onToast?.('info', 'URL gambar disalin ke clipboard.');
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-5xl h-[82vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inpartner Media Library</h3>
              <p className="text-[11px] text-slate-500">
                Unggah, cari, kelola alt text, dan pilih aset visual untuk homepage (maks 5 MB).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold cursor-pointer shadow-xs">
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>{uploading ? 'Mengunggah...' : 'Unggah Gambar'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Filters */}
        <div className="px-6 py-3 border-b border-slate-100 bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {FOLDERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFolder(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  folder === f.id
                    ? 'bg-[#1976D2] text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama file atau alt text..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#1976D2]"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Grid Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#1976D2]" /> Memuat media...
              </div>
            ) : items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#D1E4F6]/50 text-[#1976D2] flex items-center justify-center">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Belum Ada Aset Media</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Klik tombol &quot;Unggah Gambar&quot; di kanan atas untuk menambahkan gambar JPG, PNG, WebP, atau SVG.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {items.map((item) => {
                  const isSel = selected?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelected(item)}
                      className={`group rounded-2xl border overflow-hidden cursor-pointer transition-all bg-white ${
                        isSel
                          ? 'border-[#1976D2] ring-2 ring-[#D1E4F6] shadow-md'
                          : 'border-slate-200 hover:border-[#B2D1F0]'
                      }`}
                    >
                      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                        <img
                          src={item.url}
                          alt={item.alt_text || item.original_name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {isSel && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#1976D2] text-white flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[11px] font-semibold text-slate-800 truncate">{item.original_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.width && item.height ? `${item.width}x${item.height} • ` : ''}
                          {formatBytes(item.size)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Detail Sidebar */}
          {selected && (
            <div className="w-72 border-l border-slate-200 bg-[#F8FAFC] p-4 flex flex-col justify-between overflow-y-auto shrink-0">
              <div className="space-y-4 text-xs">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white">
                  <img src={selected.url} alt={selected.alt_text || ''} className="w-full h-full object-contain" />
                </div>

                <div>
                  <p className="font-bold text-slate-900 truncate">{selected.original_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selected.mime_type} • {formatBytes(selected.size)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={selected.url}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(selected.url)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    title="Salin URL"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Alt Text (Aksesibilitas & SEO)</label>
                  <input
                    type="text"
                    value={altDraft}
                    onChange={(e) => setAltDraft(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#1976D2]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Caption</label>
                  <textarea
                    rows={2}
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#1976D2]"
                  />
                </div>

                <button
                  type="button"
                  disabled={savingMeta}
                  onClick={handleSaveMeta}
                  className="w-full py-1.5 rounded-xl border border-[#B2D1F0] bg-white hover:bg-[#F0F6FC] text-[#1976D2] font-semibold text-xs"
                >
                  {savingMeta ? 'Menyimpan...' : 'Simpan Metadata'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(selected);
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-xs"
                >
                  Gunakan Gambar Ini
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(selected)}
                  className="w-full py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Media
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

