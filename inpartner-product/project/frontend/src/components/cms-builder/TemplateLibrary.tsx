import React, { useState } from 'react';
import { BookmarkPlus, Layers, Plus, Trash2, Sparkles } from 'lucide-react';
import { getCmsIcon } from '@/components/cms-renderer/cmsIcons';
import type { CmsSectionNode, CmsTemplateItem } from '@/types/cms/builder';

interface TemplateLibraryProps {
  templates: CmsTemplateItem[];
  selectedSection: CmsSectionNode | null;
  onInsertTemplate: (tpl: CmsTemplateItem) => void;
  onSaveSectionAsTemplate: (section: CmsSectionNode, name: string, category: string, description?: string) => void;
  onDeleteTemplate: (id: number) => void;
}

export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  templates,
  selectedSection,
  onInsertTemplate,
  onSaveSectionAsTemplate,
  onDeleteTemplate,
}) => {
  const [catFilter, setCatFilter] = useState('all');
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplDesc, setTplDesc] = useState('');

  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'hero', label: 'Hero' },
    { id: 'products', label: 'Produk' },
    { id: 'features', label: 'Fitur' },
    { id: 'social_proof', label: 'Sosial' },
    { id: 'content', label: 'Konten' },
    { id: 'conversion', label: 'Konversi' },
    { id: 'custom', label: 'Tersimpan' },
  ];

  const filtered = templates.filter((t) => catFilter === 'all' || t.category === catFilter);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection || !tplName.trim()) return;
    onSaveSectionAsTemplate(selectedSection, tplName.trim(), 'custom', tplDesc.trim());
    setTplName('');
    setTplDesc('');
    setSaveOpen(false);
    setCatFilter('custom');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Save Selected Section CTA */}
      <div className="p-3 border-b border-slate-100 space-y-2">
        {selectedSection ? (
          saveOpen ? (
            <form onSubmit={handleSave} className="p-2.5 rounded-xl bg-[#F0F6FC] border border-[#B2D1F0] space-y-2 text-xs">
              <div className="font-bold text-[#0C3B69] text-[11px]">Simpan &quot;{selectedSection.label}&quot;</div>
              <input
                type="text"
                required
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="Nama template..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#1976D2]"
              />
              <input
                type="text"
                value={tplDesc}
                onChange={(e) => setTplDesc(e.target.value)}
                placeholder="Deskripsi singkat (opsional)"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#1976D2]"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setSaveOpen(false)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-lg bg-[#1976D2] text-white font-bold text-[11px]"
                >
                  Simpan
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTplName(`${selectedSection.label} Template`);
                setSaveOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl border border-[#B2D1F0] bg-[#F0F6FC] hover:bg-[#D1E4F6] text-[#0C3B69] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Simpan Section Terpilih ke Library</span>
            </button>
          )
        ) : (
          <p className="text-[11px] text-slate-400">
            Pilih section pada canvas untuk menyimpannya sebagai template yang dapat digunakan ulang.
          </p>
        )}

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCatFilter(c.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors ${
                catFilter === c.id
                  ? 'bg-[#1976D2] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Belum ada template pada kategori ini.
          </div>
        ) : (
          filtered.map((tpl) => {
            const Icon = getCmsIcon(tpl.thumbnail_type || undefined, Layers);
            return (
              <div
                key={tpl.id}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#B2D1F0] transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#D1E4F6]/60 text-[#1976D2] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{tpl.name}</div>
                      {tpl.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{tpl.description}</p>
                      )}
                    </div>
                  </div>
                  {tpl.is_system ? (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold shrink-0">
                      Bawaan
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tpl.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Hapus Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onInsertTemplate(tpl)}
                  className="w-full py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#1976D2] text-slate-700 hover:text-white border border-slate-200 hover:border-transparent text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Sisipkan ke Homepage
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

