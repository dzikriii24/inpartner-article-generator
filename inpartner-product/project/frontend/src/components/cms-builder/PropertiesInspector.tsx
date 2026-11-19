import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Layers,
  Lock,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Sliders,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Unlock,
} from 'lucide-react';
import { CMS_FEATURE_ICON_OPTIONS } from '@/components/cms-renderer/cmsIcons';
import {
  DEFAULT_THEME_CONFIG,
  SECTION_REGISTRY,
  generateCmsId,
} from '@/services/cms/componentRegistry';
import type {
  CmsBlockNode,
  CmsFooterConfig,
  CmsHeaderConfig,
  CmsLocale,
  CmsPageTree,
  CmsSectionNode,
  CmsSeoConfig,
  CmsThemeConfig,
  SelectionTarget,
  ViewportMode,
} from '@/types/cms/builder';

interface PropertiesInspectorProps {
  tree: CmsPageTree;
  selection: SelectionTarget | null;
  editingLocale: CmsLocale;
  categories: any[];
  onSelect: (t: SelectionTarget) => void;
  onUpdateSection: (sectionId: string, updater: (sec: CmsSectionNode) => CmsSectionNode) => void;
  onUpdateBlock: (sectionId: string, blockId: string, updater: (blk: CmsBlockNode) => CmsBlockNode) => void;
  onUpdateHeader: (updater: (h: CmsHeaderConfig) => CmsHeaderConfig) => void;
  onUpdateFooter: (updater: (f: CmsFooterConfig) => CmsFooterConfig) => void;
  onUpdateTheme: (updater: (t: CmsThemeConfig) => CmsThemeConfig) => void;
  onUpdateSeo: (updater: (s: CmsSeoConfig) => CmsSeoConfig) => void;
  onOpenMediaPicker: (onPicked: (url: string, alt?: string) => void) => void;
}

type InspectorTab = 'content' | 'style' | 'layout' | 'advanced';

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-[11px] font-bold text-slate-700 mb-1">{children}</label>
);

const TextInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder, disabled }) => (
  <input
    type="text"
    disabled={disabled}
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] disabled:bg-slate-50"
  />
);

const TextAreaInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, rows = 3, placeholder, disabled }) => (
  <textarea
    rows={rows}
    disabled={disabled}
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-[#1976D2] disabled:bg-slate-50"
  />
);

const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets?: string[];
}> = ({ label, value, onChange, presets }) => (
  <div className="space-y-1">
    <FieldLabel>{label}</FieldLabel>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value && value.startsWith('#') ? value : '#1976D2'}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#FFFFFF atau transparent"
        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
      />
    </div>
    {presets && presets.length > 0 && (
      <div className="flex items-center gap-1.5 pt-0.5">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{ backgroundColor: c === 'transparent' ? '#F8FAFC' : c }}
            className="w-5 h-5 rounded-md border border-slate-300 text-[9px] font-bold flex items-center justify-center"
            title={c}
          >
            {c === 'transparent' ? '×' : ''}
          </button>
        ))}
      </div>
    )}
  </div>
);

export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  tree,
  selection,
  editingLocale,
  categories,
  onSelect,
  onUpdateSection,
  onUpdateBlock,
  onUpdateHeader,
  onUpdateFooter,
  onUpdateTheme,
  onUpdateSeo,
  onOpenMediaPicker,
}) => {
  const [activeTab, setActiveTab] = useState<InspectorTab>('content');
  const [respDevice, setRespDevice] = useState<ViewportMode>('desktop');

  const selectedSection =
    selection && 'sectionId' in selection
      ? tree.sections.find((s) => s.id === selection.sectionId) || null
      : null;

  const selectedBlock =
    selection?.scope === 'block' && selectedSection
      ? (selectedSection.children || []).find((b) => b.id === selection.blockId) || null
      : null;

  // Helpers to read/write localized section fields cleanly
  const readSecField = (sec: CmsSectionNode, field: 'title' | 'subtitle'): string => {
    if (editingLocale === 'id') return sec[field] || '';
    return sec.translations?.[editingLocale]?.[field] ?? '';
  };

  const writeSecField = (sec: CmsSectionNode, field: 'title' | 'subtitle', val: string) => {
    onUpdateSection(sec.id, (cur) => {
      if (editingLocale === 'id') {
        return { ...cur, [field]: val };
      }
      return {
        ...cur,
        translations: {
          ...cur.translations,
          [editingLocale]: {
            ...(cur.translations?.[editingLocale] || {}),
            [field]: val,
          },
        },
      };
    });
  };

  const readSecContent = (sec: CmsSectionNode, key: string, fallback: any = ''): any => {
    if (editingLocale === 'id') return sec.content?.[key] ?? fallback;
    const trVal = sec.translations?.[editingLocale]?.content?.[key];
    return trVal !== undefined ? trVal : sec.content?.[key] ?? fallback;
  };

  const writeSecContent = (sec: CmsSectionNode, key: string, val: any, sharedAcrossLocales = false) => {
    onUpdateSection(sec.id, (cur) => {
      if (editingLocale === 'id' || sharedAcrossLocales) {
        return { ...cur, content: { ...cur.content, [key]: val } };
      }
      return {
        ...cur,
        translations: {
          ...cur.translations,
          [editingLocale]: {
            ...(cur.translations?.[editingLocale] || {}),
            content: {
              ...(cur.translations?.[editingLocale]?.content || {}),
              [key]: val,
            },
          },
        },
      };
    });
  };

  const ImagePickerField: React.FC<{
    label: string;
    url: string;
    onChangeUrl: (url: string, alt?: string) => void;
    disabled?: boolean;
  }> = ({ label, url, onChangeUrl, disabled }) => (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      {url && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[16/9]">
          <img src={url} alt="" className="w-full h-full object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChangeUrl('')}
              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/90 text-rose-600 border border-slate-200 shadow-xs hover:bg-rose-50"
              title="Hapus gambar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      <div className="flex gap-1.5">
        <TextInput
          disabled={disabled}
          value={url}
          onChange={(v) => onChangeUrl(v)}
          placeholder="/storage/cms-media/... atau URL"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onOpenMediaPicker((pickedUrl, alt) => onChangeUrl(pickedUrl, alt))}
          className="px-3 py-1.5 rounded-xl bg-[#F0F6FC] hover:bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-xs font-bold shrink-0 flex items-center gap-1 disabled:opacity-50"
        >
          <ImageIcon className="w-3.5 h-3.5" /> Media
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // GLOBAL THEME INSPECTOR
  // =========================================================================
  if (!selection || selection.scope === 'theme') {
    const theme = tree.theme;
    const seo = tree.seo;

    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#1976D2]" />
            <div>
              <h3 className="text-xs font-bold text-slate-900">Global Style & Theme</h3>
              <p className="text-[10px] text-slate-400">Warna brand, tipografi, & layout website</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onUpdateTheme(() => JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG)))}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#1976D2]"
            title="Kembalikan Tema Default Inpartner"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-5 text-xs">
          <div className="space-y-3">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Palet Warna Brand</h4>
            <ColorField
              label="Primary Accent"
              value={theme.colors.primary}
              onChange={(v) => onUpdateTheme((t) => ({ ...t, colors: { ...t.colors, primary: v, accent: v } }))}
              presets={['#1976D2', '#0C3B69', '#2563EB', '#0284C7', '#0F172A']}
            />
            <ColorField
              label="Primary Surface (Highlight)"
              value={theme.colors.primary_surface}
              onChange={(v) => onUpdateTheme((t) => ({ ...t, colors: { ...t.colors, primary_surface: v } }))}
              presets={['#D1E4F6', '#E0F2FE', '#EFF6FF']}
            />
            <ColorField
              label="Canvas Background"
              value={theme.colors.canvas}
              onChange={(v) => onUpdateTheme((t) => ({ ...t, colors: { ...t.colors, canvas: v } }))}
              presets={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
            />
            <ColorField
              label="Surface / Card Background"
              value={theme.colors.surface}
              onChange={(v) => onUpdateTheme((t) => ({ ...t, colors: { ...t.colors, surface: v } }))}
              presets={['#FFFFFF', '#F8FAFC']}
            />
            <ColorField
              label="Heading Color"
              value={theme.colors.text_heading}
              onChange={(v) => onUpdateTheme((t) => ({ ...t, colors: { ...t.colors, text_heading: v } }))}
            />
            <ColorField
              label="Body Text Color"
              value={theme.colors.text_body}
              onChange={(v) => onUpdateTheme((t) => ({ ...t, colors: { ...t.colors, text_body: v } }))}
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Typography</h4>
            <div>
              <FieldLabel>Primary UI Font</FieldLabel>
              <select
                value={theme.typography.font_primary}
                onChange={(e) =>
                  onUpdateTheme((t) => ({ ...t, typography: { ...t.typography, font_primary: e.target.value } }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="Inter">Inter (Inpartner Standard)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="DM Sans">DM Sans</option>
                <option value="System">System Sans</option>
              </select>
            </div>
            <div>
              <FieldLabel>Supporting Editorial Font</FieldLabel>
              <select
                value={theme.typography.font_supporting}
                onChange={(e) =>
                  onUpdateTheme((t) => ({ ...t, typography: { ...t.typography, font_supporting: e.target.value } }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="PT Sans">PT Sans (Inpartner Standard)</option>
                <option value="Inter">Inter</option>
                <option value="Source Serif 4">Source Serif 4</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Body Size (px)</FieldLabel>
                <input
                  type="number"
                  min={13}
                  max={20}
                  value={theme.typography.body_size}
                  onChange={(e) =>
                    onUpdateTheme((t) => ({
                      ...t,
                      typography: { ...t.typography, body_size: Number(e.target.value) || 16 },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
              <div>
                <FieldLabel>Line Height</FieldLabel>
                <input
                  type="number"
                  step={0.1}
                  min={1.2}
                  max={2.0}
                  value={theme.typography.line_height}
                  onChange={(e) =>
                    onUpdateTheme((t) => ({
                      ...t,
                      typography: { ...t.typography, line_height: Number(e.target.value) || 1.6 },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Container & Spacing</h4>
            <div>
              <FieldLabel>Lebar Maksimal Container</FieldLabel>
              <select
                value={theme.layout.container_width}
                onChange={(e) =>
                  onUpdateTheme((t) => ({
                    ...t,
                    layout: { ...t.layout, container_width: e.target.value as any },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="max-w-6xl">Compact (1152px)</option>
                <option value="max-w-7xl">Standard Inpartner (1280px)</option>
                <option value="max-w-[1400px]">Wide Editorial (1400px)</option>
              </select>
            </div>
            <div>
              <FieldLabel>Jarak Antar Section</FieldLabel>
              <select
                value={theme.layout.section_spacing}
                onChange={(e) =>
                  onUpdateTheme((t) => ({
                    ...t,
                    layout: { ...t.layout, section_spacing: e.target.value as any },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="compact">Padat (Compact)</option>
                <option value="normal">Seimbang (Default)</option>
                <option value="spacious">Lega (Spacious)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Metadata SEO Homepage</h4>
            <div>
              <FieldLabel>Meta Title</FieldLabel>
              <TextInput
                value={seo.meta_title}
                onChange={(v) => onUpdateSeo((s) => ({ ...s, meta_title: v }))}
              />
            </div>
            <div>
              <FieldLabel>Meta Description</FieldLabel>
              <TextAreaInput
                rows={3}
                value={seo.meta_description}
                onChange={(v) => onUpdateSeo((s) => ({ ...s, meta_description: v }))}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // HEADER & NAVIGATION INSPECTOR
  // =========================================================================
  if (selection.scope === 'header') {
    const h = tree.header;
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Header & Navigation (Global)</h3>
            <p className="text-[10px] text-slate-400">Kelola logo, menu navigasi, search, & sticky bar</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect({ scope: 'theme' })}
            className="text-[11px] font-bold text-[#1976D2] hover:underline"
          >
            Tema
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          <ImagePickerField
            label="Logo Header"
            url={h.logo_url}
            onChangeUrl={(url) => onUpdateHeader((cur) => ({ ...cur, logo_url: url || '/inpartner_logo.jpeg' }))}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Brand Wordmark</FieldLabel>
              <TextInput
                value={h.brand_name}
                onChange={(v) => onUpdateHeader((cur) => ({ ...cur, brand_name: v }))}
              />
            </div>
            <div>
              <FieldLabel>Tagline Kecil</FieldLabel>
              <TextInput
                value={h.tagline}
                onChange={(v) => onUpdateHeader((cur) => ({ ...cur, tagline: v }))}
              />
            </div>
          </div>

          <ColorField
            label="Background Header"
            value={h.background_color}
            onChange={(v) => onUpdateHeader((cur) => ({ ...cur, background_color: v }))}
            presets={['#FFFFFF', '#F8FAFC', '#F0F6FC']}
          />

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Perilaku & Kontrol</h4>
            {[
              { key: 'sticky', label: 'Sticky Header saat scroll' },
              { key: 'blur', label: 'Efek Backdrop Blur' },
              { key: 'show_search', label: 'Tampilkan Search Autocomplete' },
              { key: 'show_language_switcher', label: 'Tampilkan Switcher Bahasa (ID/EN/KO)' },
              { key: 'show_wishlist', label: 'Tampilkan Ikon Wishlist' },
              { key: 'show_cart', label: 'Tampilkan Ikon Keranjang' },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-slate-700 font-medium">{opt.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean((h as any)[opt.key])}
                  onChange={(e) => onUpdateHeader((cur) => ({ ...cur, [opt.key]: e.target.checked }))}
                  className="rounded text-[#1976D2]"
                />
              </label>
            ))}

            {h.show_search && (
              <div>
                <FieldLabel>Placeholder Search Bar</FieldLabel>
                <TextInput
                  value={h.search_placeholder}
                  onChange={(v) => onUpdateHeader((cur) => ({ ...cur, search_placeholder: v }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Label Tombol Masuk</FieldLabel>
                <TextInput
                  value={h.login_label}
                  onChange={(v) => onUpdateHeader((cur) => ({ ...cur, login_label: v }))}
                />
              </div>
              <div>
                <FieldLabel>Label Tombol Daftar</FieldLabel>
                <TextInput
                  value={h.register_label}
                  onChange={(v) => onUpdateHeader((cur) => ({ ...cur, register_label: v }))}
                />
              </div>
            </div>
          </div>

          {/* Navigation Menu Items */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Item Menu Navigasi</h4>
              <button
                type="button"
                onClick={() =>
                  onUpdateHeader((cur) => ({
                    ...cur,
                    nav_items: [
                      ...(cur.nav_items || []),
                      { id: generateCmsId('nav'), label: 'Menu Baru', url: '/products', type: 'link', children: [] },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F0F6FC] text-[#1976D2] font-bold text-[10px]"
              >
                <Plus className="w-3 h-3" /> Tambah Menu
              </button>
            </div>

            {(h.nav_items || []).map((item, idx) => (
              <div key={item.id} className="p-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={item.type}
                    onChange={(e) =>
                      onUpdateHeader((cur) => ({
                        ...cur,
                        nav_items: cur.nav_items.map((n, i) =>
                          i === idx ? { ...n, type: e.target.value as 'link' | 'dropdown' } : n
                        ),
                      }))
                    }
                    className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold"
                  >
                    <option value="link">Link Biasa</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateHeader((cur) => ({
                        ...cur,
                        nav_items: cur.nav_items.filter((_, i) => i !== idx),
                      }))
                    }
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <TextInput
                  placeholder="Label Menu"
                  value={item.label}
                  onChange={(v) =>
                    onUpdateHeader((cur) => ({
                      ...cur,
                      nav_items: cur.nav_items.map((n, i) => (i === idx ? { ...n, label: v } : n)),
                    }))
                  }
                />
                {item.type === 'link' && (
                  <TextInput
                    placeholder="URL (/products)"
                    value={item.url}
                    onChange={(v) =>
                      onUpdateHeader((cur) => ({
                        ...cur,
                        nav_items: cur.nav_items.map((n, i) => (i === idx ? { ...n, url: v } : n)),
                      }))
                    }
                  />
                )}

                {item.type === 'dropdown' && (
                  <div className="pl-2 border-l-2 border-[#B2D1F0] space-y-1.5">
                    {(item.children || []).map((ch, cIdx) => (
                      <div key={ch.id} className="p-2 rounded-lg bg-white border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">Sub-item #{cIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateHeader((cur) => ({
                                ...cur,
                                nav_items: cur.nav_items.map((n, i) =>
                                  i === idx
                                    ? { ...n, children: (n.children || []).filter((_, ci) => ci !== cIdx) }
                                    : n
                                ),
                              }))
                            }
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <TextInput
                          placeholder="Label"
                          value={ch.label}
                          onChange={(v) =>
                            onUpdateHeader((cur) => ({
                              ...cur,
                              nav_items: cur.nav_items.map((n, i) =>
                                i === idx
                                  ? {
                                      ...n,
                                      children: (n.children || []).map((c, ci) =>
                                        ci === cIdx ? { ...c, label: v } : c
                                      ),
                                    }
                                  : n
                              ),
                            }))
                          }
                        />
                        <TextInput
                          placeholder="URL"
                          value={ch.url}
                          onChange={(v) =>
                            onUpdateHeader((cur) => ({
                              ...cur,
                              nav_items: cur.nav_items.map((n, i) =>
                                i === idx
                                  ? {
                                      ...n,
                                      children: (n.children || []).map((c, ci) =>
                                        ci === cIdx ? { ...c, url: v } : c
                                      ),
                                    }
                                  : n
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateHeader((cur) => ({
                          ...cur,
                          nav_items: cur.nav_items.map((n, i) =>
                            i === idx
                              ? {
                                  ...n,
                                  children: [
                                    ...(n.children || []),
                                    { id: generateCmsId('sub'), label: 'Submenu Baru', url: '/products', description: '' },
                                  ],
                                }
                              : n
                          ),
                        }))
                      }
                      className="text-[10px] font-bold text-[#1976D2] hover:underline"
                    >
                      + Tambah Submenu
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // FOOTER INSPECTOR
  // =========================================================================
  if (selection.scope === 'footer') {
    const f = tree.footer;
    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Footer Global</h3>
            <p className="text-[10px] text-slate-400">Kelola brand, grup link, kontak, sosial, & copyright</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect({ scope: 'theme' })}
            className="text-[11px] font-bold text-[#1976D2] hover:underline"
          >
            Tema
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          <ImagePickerField
            label="Logo Footer"
            url={f.logo_url}
            onChangeUrl={(url) => onUpdateFooter((cur) => ({ ...cur, logo_url: url || '/inpartner_logo.jpeg' }))}
          />
          <div>
            <FieldLabel>Nama Brand Footer</FieldLabel>
            <TextInput
              value={f.brand_name}
              onChange={(v) => onUpdateFooter((cur) => ({ ...cur, brand_name: v }))}
            />
          </div>
          <div>
            <FieldLabel>Deskripsi Brand</FieldLabel>
            <TextAreaInput
              rows={3}
              value={f.description}
              onChange={(v) => onUpdateFooter((cur) => ({ ...cur, description: v }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ColorField
              label="Background Footer"
              value={f.background_color}
              onChange={(v) => onUpdateFooter((cur) => ({ ...cur, background_color: v }))}
              presets={['#FFFFFF', '#F8FAFC', '#0F172A']}
            />
            <ColorField
              label="Warna Teks"
              value={f.text_color}
              onChange={(v) => onUpdateFooter((cur) => ({ ...cur, text_color: v }))}
              presets={['#64748B', '#334155', '#CBD5E1']}
            />
          </div>

          {/* Link Groups */}
          <div className="space-y-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Grup Kolom Navigasi</h4>
              <button
                type="button"
                onClick={() =>
                  onUpdateFooter((cur) => ({
                    ...cur,
                    link_groups: [
                      ...(cur.link_groups || []),
                      { id: generateCmsId('fg'), title: 'Kolom Baru', links: [{ id: generateCmsId('fl'), label: 'Tautan', url: '/products' }] },
                    ],
                  }))
                }
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F0F6FC] text-[#1976D2] font-bold text-[10px]"
              >
                <Plus className="w-3 h-3" /> Kolom
              </button>
            </div>

            {(f.link_groups || []).map((grp, gIdx) => (
              <div key={grp.id} className="p-2.5 rounded-xl border border-slate-200 bg-[#F8FAFC] space-y-2">
                <div className="flex items-center gap-2">
                  <TextInput
                    placeholder="Judul Kolom"
                    value={grp.title}
                    onChange={(v) =>
                      onUpdateFooter((cur) => ({
                        ...cur,
                        link_groups: cur.link_groups.map((g, i) => (i === gIdx ? { ...g, title: v } : g)),
                      }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateFooter((cur) => ({
                        ...cur,
                        link_groups: cur.link_groups.filter((_, i) => i !== gIdx),
                      }))
                    }
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(grp.links || []).map((lnk, lIdx) => (
                  <div key={lnk.id} className="grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-5">
                      <TextInput
                        placeholder="Label"
                        value={lnk.label}
                        onChange={(v) =>
                          onUpdateFooter((cur) => ({
                            ...cur,
                            link_groups: cur.link_groups.map((g, i) =>
                              i === gIdx
                                ? { ...g, links: g.links.map((l, li) => (li === lIdx ? { ...l, label: v } : l)) }
                                : g
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-6">
                      <TextInput
                        placeholder="URL"
                        value={lnk.url}
                        onChange={(v) =>
                          onUpdateFooter((cur) => ({
                            ...cur,
                            link_groups: cur.link_groups.map((g, i) =>
                              i === gIdx
                                ? { ...g, links: g.links.map((l, li) => (li === lIdx ? { ...l, url: v } : l)) }
                                : g
                            ),
                          }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateFooter((cur) => ({
                          ...cur,
                          link_groups: cur.link_groups.map((g, i) =>
                            i === gIdx ? { ...g, links: g.links.filter((_, li) => li !== lIdx) } : g
                          ),
                        }))
                      }
                      className="col-span-1 text-slate-400 hover:text-rose-600 flex justify-center"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    onUpdateFooter((cur) => ({
                      ...cur,
                      link_groups: cur.link_groups.map((g, i) =>
                        i === gIdx
                          ? { ...g, links: [...g.links, { id: generateCmsId('fl'), label: 'Link Baru', url: '/products' }] }
                          : g
                      ),
                    }))
                  }
                  className="text-[10px] font-bold text-[#1976D2] hover:underline"
                >
                  + Tambah Link
                </button>
              </div>
            ))}
          </div>

          {/* Contact & Socials */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-700">Tampilkan Info Kontak</span>
              <input
                type="checkbox"
                checked={Boolean(f.show_contact)}
                onChange={(e) => onUpdateFooter((cur) => ({ ...cur, show_contact: e.target.checked }))}
              />
            </label>
            {f.show_contact && (
              <div className="space-y-2">
                <TextInput placeholder="Email" value={f.contact_email} onChange={(v) => onUpdateFooter((cur) => ({ ...cur, contact_email: v }))} />
                <TextInput placeholder="Telepon" value={f.contact_phone} onChange={(v) => onUpdateFooter((cur) => ({ ...cur, contact_phone: v }))} />
                <TextInput placeholder="Alamat" value={f.office_address} onChange={(v) => onUpdateFooter((cur) => ({ ...cur, office_address: v }))} />
              </div>
            )}

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-700">Tampilkan Social Media</span>
              <input
                type="checkbox"
                checked={Boolean(f.show_socials)}
                onChange={(e) => onUpdateFooter((cur) => ({ ...cur, show_socials: e.target.checked }))}
              />
            </label>
            {f.show_socials && (
              <div className="space-y-2">
                <TextInput placeholder="LinkedIn URL" value={f.social_linkedin} onChange={(v) => onUpdateFooter((cur) => ({ ...cur, social_linkedin: v }))} />
                <TextInput placeholder="X/Twitter URL" value={f.social_twitter} onChange={(v) => onUpdateFooter((cur) => ({ ...cur, social_twitter: v }))} />
                <TextInput placeholder="Instagram URL" value={f.social_instagram} onChange={(v) => onUpdateFooter((cur) => ({ ...cur, social_instagram: v }))} />
              </div>
            )}

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-700">Blok Pembayaran & Keamanan</span>
              <input
                type="checkbox"
                checked={f.show_payment_block !== false}
                onChange={(e) => onUpdateFooter((cur) => ({ ...cur, show_payment_block: e.target.checked }))}
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-700">Form Newsletter di Footer</span>
              <input
                type="checkbox"
                checked={Boolean(f.show_newsletter)}
                onChange={(e) => onUpdateFooter((cur) => ({ ...cur, show_newsletter: e.target.checked }))}
              />
            </label>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            <FieldLabel>Teks Copyright</FieldLabel>
            <TextInput
              value={f.copyright}
              onChange={(v) => onUpdateFooter((cur) => ({ ...cur, copyright: v }))}
            />
            <FieldLabel>Keterangan Kanan Bawah</FieldLabel>
            <TextInput
              value={f.standard_text}
              onChange={(v) => onUpdateFooter((cur) => ({ ...cur, standard_text: v }))}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CHILD BLOCK INSPECTOR
  // =========================================================================
  if (selection.scope === 'block' && selectedSection && selectedBlock) {
    const blk = selectedBlock;
    const isLocked = Boolean(blk.locked);
    const props = blk.props || {};
    const updateProps = (patch: Record<string, any>) =>
      onUpdateBlock(selectedSection.id, blk.id, (cur) => ({
        ...cur,
        props: { ...(cur.props || {}), ...patch },
      }));

    return (
      <div className="flex flex-col h-full">
        <div className="p-3.5 border-b border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelect({ scope: 'section', sectionId: selectedSection.id })}
              className="text-[10px] font-bold text-[#1976D2] hover:underline"
            >
              &larr; {selectedSection.label}
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateBlock(selectedSection.id, blk.id, (cur) => ({ ...cur, locked: !cur.locked }))
              }
              className={`p-1 rounded-lg border ${
                isLocked ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-slate-200 text-slate-400'
              }`}
              title={isLocked ? 'Buka Kunci' : 'Kunci Blok'}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900 truncate">{blk.label}</h3>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-500">
              {blk.type}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          <div>
            <FieldLabel>Nama Layer Blok</FieldLabel>
            <TextInput
              disabled={isLocked}
              value={blk.label}
              onChange={(v) => onUpdateBlock(selectedSection.id, blk.id, (cur) => ({ ...cur, label: v }))}
            />
          </div>

          {blk.type === 'heading' && (
            <>
              <div>
                <FieldLabel>Teks Heading</FieldLabel>
                <TextInput disabled={isLocked} value={props.text} onChange={(v) => updateProps({ text: v })} />
              </div>
              <div>
                <FieldLabel>Level Heading</FieldLabel>
                <select
                  disabled={isLocked}
                  value={props.level || 'h3'}
                  onChange={(e) => updateProps({ level: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="h1">H1 (Utama)</option>
                  <option value="h2">H2 (Section)</option>
                  <option value="h3">H3 (Subjudul)</option>
                  <option value="h4">H4 (Kecil)</option>
                </select>
              </div>
            </>
          )}

          {blk.type === 'text_block' && (
            <>
              <div>
                <FieldLabel>Isi Paragraf</FieldLabel>
                <TextAreaInput disabled={isLocked} rows={4} value={props.text} onChange={(v) => updateProps({ text: v })} />
              </div>
              <div>
                <FieldLabel>Font Paragraf</FieldLabel>
                <select
                  disabled={isLocked}
                  value={props.font || 'supporting'}
                  onChange={(e) => updateProps({ font: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="supporting">PT Sans (Editorial)</option>
                  <option value="sans">Inter (UI Standard)</option>
                </select>
              </div>
            </>
          )}

          {blk.type === 'button' && (
            <>
              <div>
                <FieldLabel>Label Tombol</FieldLabel>
                <TextInput disabled={isLocked} value={props.label} onChange={(v) => updateProps({ label: v })} />
              </div>
              <div>
                <FieldLabel>URL Tujuan</FieldLabel>
                <TextInput disabled={isLocked} value={props.url} onChange={(v) => updateProps({ url: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Varian</FieldLabel>
                  <select
                    disabled={isLocked}
                    value={props.variant || 'primary'}
                    onChange={(e) => updateProps({ variant: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="primary">Primary Blue</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                    <option value="ghost">Ghost</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Ukuran</FieldLabel>
                  <select
                    disabled={isLocked}
                    value={props.size || 'md'}
                    onChange={(e) => updateProps({ size: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {blk.type === 'image' && (
            <>
              <ImagePickerField
                disabled={isLocked}
                label="Gambar"
                url={props.url || ''}
                onChangeUrl={(url, alt) => updateProps({ url, ...(alt && !props.alt ? { alt } : {}) })}
              />
              <div>
                <FieldLabel>Alt Text</FieldLabel>
                <TextInput disabled={isLocked} value={props.alt} onChange={(v) => updateProps({ alt: v })} />
              </div>
              <div>
                <FieldLabel>Caption</FieldLabel>
                <TextInput disabled={isLocked} value={props.caption} onChange={(v) => updateProps({ caption: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Aspect Ratio</FieldLabel>
                  <select
                    disabled={isLocked}
                    value={props.aspect_ratio || '16/9'}
                    onChange={(e) => updateProps({ aspect_ratio: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="16/9">16:9</option>
                    <option value="4/3">4:3</option>
                    <option value="1/1">1:1</option>
                    <option value="auto">Asli</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Object Fit</FieldLabel>
                  <select
                    disabled={isLocked}
                    value={props.object_fit || 'cover'}
                    onChange={(e) => updateProps({ object_fit: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {blk.type === 'badge' && (
            <>
              <div>
                <FieldLabel>Teks Badge</FieldLabel>
                <TextInput disabled={isLocked} value={props.text} onChange={(v) => updateProps({ text: v })} />
              </div>
              <div>
                <FieldLabel>Tone Warna</FieldLabel>
                <select
                  disabled={isLocked}
                  value={props.tone || 'primary'}
                  onChange={(e) => updateProps({ tone: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="primary">Biru Brand</option>
                  <option value="neutral">Netral Slate</option>
                  <option value="success">Emerald</option>
                </select>
              </div>
            </>
          )}

          {blk.type === 'spacer' && (
            <div>
              <FieldLabel>Tinggi Jarak (px): {props.height || 24}px</FieldLabel>
              <input
                type="range"
                min={8}
                max={120}
                value={Number(props.height || 24)}
                onChange={(e) => updateProps({ height: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          )}

          {blk.type === 'divider' && (
            <ColorField
              label="Warna Garis Pemisah"
              value={props.color || '#E2E8F0'}
              onChange={(v) => updateProps({ color: v })}
              presets={['#E2E8F0', '#B2D1F0', '#CBD5E1']}
            />
          )}

          {blk.type === 'feature_list' && (
            <div>
              <FieldLabel>Daftar Poin (1 per baris)</FieldLabel>
              <TextAreaInput
                rows={4}
                value={Array.isArray(props.items) ? props.items.join('\n') : ''}
                onChange={(v) => updateProps({ items: v.split('\n').filter((x) => x.trim() !== '') })}
              />
            </div>
          )}

          {blk.type === 'product_grid' && (
            <div className="space-y-3">
              <div>
                <FieldLabel>Sumber Produk</FieldLabel>
                <select
                  value={props.source || 'featured'}
                  onChange={(e) => updateProps({ source: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="featured">Unggulan (Featured)</option>
                  <option value="popular">Terpopuler</option>
                  <option value="latest">Terbaru</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel>Jumlah Produk</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={Number(props.max_items || 2)}
                    onChange={(e) => updateProps({ max_items: Number(e.target.value) || 2 })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <FieldLabel>Kolom</FieldLabel>
                  <select
                    value={Number(props.columns || 2)}
                    onChange={(e) => updateProps({ columns: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <option value={1}>1 Kolom</option>
                    <option value={2}>2 Kolom</option>
                    <option value={3}>3 Kolom</option>
                    <option value={4}>4 Kolom</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {blk.type === 'safe_embed' && (
            <div className="space-y-2">
              <FieldLabel>HTML Terkurasi (Disanitasi Aman)</FieldLabel>
              <TextAreaInput
                rows={6}
                value={props.html || ''}
                onChange={(v) => updateProps({ html: v })}
              />
              <p className="text-[10px] text-slate-400">
                Tag berbahaya seperti &lt;script&gt;, &lt;iframe&gt;, dan inline event otomatis dibersihkan.
              </p>
            </div>
          )}

          {/* Alignment & Colors for blocks */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div>
              <FieldLabel>Alignment</FieldLabel>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                {(['left', 'center', 'right'] as const).map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedSection.id, blk.id, (cur) => ({
                        ...cur,
                        styles: { ...(cur.styles || {}), text_align: al },
                      }))
                    }
                    className={`py-1 rounded-lg text-[11px] font-bold capitalize ${
                      (blk.styles?.text_align || 'left') === al
                        ? 'bg-white text-[#1976D2] shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    {al}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-700">Tampilkan Blok</span>
              <input
                type="checkbox"
                checked={blk.visible}
                onChange={(e) =>
                  onUpdateBlock(selectedSection.id, blk.id, (cur) => ({ ...cur, visible: e.target.checked }))
                }
              />
            </label>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SECTION INSPECTOR (CONTENT | STYLE | LAYOUT | ADVANCED)
  // =========================================================================
  if (!selectedSection) return null;

  const sec = selectedSection;
  const isLocked = Boolean(sec.locked);
  const def = SECTION_REGISTRY[sec.type];

  const renderSectionContentFields = () => {
    switch (sec.type) {
      case 'hero':
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Eyebrow Label</FieldLabel>
              <TextInput
                disabled={isLocked}
                value={readSecContent(sec, 'eyebrow')}
                onChange={(v) => writeSecContent(sec, 'eyebrow', v)}
              />
            </div>

            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold text-slate-700">Tampilkan Badge Pill</span>
                <input
                  type="checkbox"
                  disabled={isLocked}
                  checked={Boolean(sec.content?.show_badge)}
                  onChange={(e) => writeSecContent(sec, 'show_badge', e.target.checked, true)}
                />
              </label>
              {sec.content?.show_badge && (
                <TextInput
                  disabled={isLocked}
                  placeholder="Teks Badge (mis: Edisi 2026)"
                  value={readSecContent(sec, 'badge_text')}
                  onChange={(v) => writeSecContent(sec, 'badge_text', v)}
                />
              )}
            </div>

            <div>
              <FieldLabel>Heading Utama ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput
                disabled={isLocked}
                rows={2}
                value={readSecField(sec, 'title')}
                onChange={(v) => writeSecField(sec, 'title', v)}
              />
            </div>

            <div>
              <FieldLabel>Subjudul / Deskripsi ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput
                disabled={isLocked}
                rows={3}
                value={readSecField(sec, 'subtitle')}
                onChange={(v) => writeSecField(sec, 'subtitle', v)}
              />
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 space-y-2">
              <div className="text-[10px] font-extrabold uppercase text-slate-400">Primary CTA</div>
              <TextInput
                disabled={isLocked}
                placeholder="Label Tombol"
                value={readSecContent(sec, 'cta_primary_label')}
                onChange={(v) => writeSecContent(sec, 'cta_primary_label', v)}
              />
              <TextInput
                disabled={isLocked}
                placeholder="URL (/products)"
                value={sec.content?.cta_primary_url || ''}
                onChange={(v) => writeSecContent(sec, 'cta_primary_url', v, true)}
              />
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 space-y-2">
              <div className="text-[10px] font-extrabold uppercase text-slate-400">Secondary CTA</div>
              <TextInput
                disabled={isLocked}
                placeholder="Label Tombol Kedua"
                value={readSecContent(sec, 'cta_secondary_label')}
                onChange={(v) => writeSecContent(sec, 'cta_secondary_label', v)}
              />
              <TextInput
                disabled={isLocked}
                placeholder="URL (/products?custom=true)"
                value={sec.content?.cta_secondary_url || ''}
                onChange={(v) => writeSecContent(sec, 'cta_secondary_url', v, true)}
              />
            </div>

            <ImagePickerField
              disabled={isLocked}
              label="Hero Visual Image (untuk Split Layout)"
              url={sec.content?.image_url || ''}
              onChangeUrl={(url) => writeSecContent(sec, 'image_url', url, true)}
            />
          </div>
        );

      case 'featured_products':
      case 'latest_products':
      case 'product_carousel':
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Section ({editingLocale.toUpperCase()})</FieldLabel>
              <TextInput
                disabled={isLocked}
                value={readSecField(sec, 'title')}
                onChange={(v) => writeSecField(sec, 'title', v)}
              />
            </div>
            <div>
              <FieldLabel>Subjudul ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput
                disabled={isLocked}
                rows={2}
                value={readSecField(sec, 'subtitle')}
                onChange={(v) => writeSecField(sec, 'subtitle', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Sumber Produk</FieldLabel>
                <select
                  disabled={isLocked}
                  value={sec.settings?.source || (sec.type === 'latest_products' ? 'latest' : 'featured')}
                  onChange={(e) =>
                    onUpdateSection(sec.id, (cur) => ({
                      ...cur,
                      settings: { ...cur.settings, source: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="featured">Publikasi Pilihan</option>
                  <option value="latest">Publikasi Terbaru</option>
                  <option value="popular">Paling Populer</option>
                </select>
              </div>
              <div>
                <FieldLabel>Jumlah Maksimal</FieldLabel>
                <input
                  type="number"
                  min={2}
                  max={12}
                  disabled={isLocked}
                  value={Number(sec.settings?.max_items || 4)}
                  onChange={(e) =>
                    onUpdateSection(sec.id, (cur) => ({
                      ...cur,
                      settings: { ...cur.settings, max_items: Number(e.target.value) || 4 },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {categories.length > 0 && (
              <div>
                <FieldLabel>Filter Kategori Sektor (Opsional)</FieldLabel>
                <select
                  disabled={isLocked}
                  value={sec.settings?.category_slug || ''}
                  onChange={(e) =>
                    onUpdateSection(sec.id, (cur) => ({
                      ...cur,
                      settings: { ...cur.settings, category_slug: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="">Semua Sektor</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id || cat.slug} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center justify-between cursor-pointer pt-1">
              <span className="font-bold text-slate-700">Tampilkan Harga pada Kartu</span>
              <input
                type="checkbox"
                disabled={isLocked}
                checked={Boolean(sec.settings?.show_price)}
                onChange={(e) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    settings: { ...cur.settings, show_price: e.target.checked },
                  }))
                }
              />
            </label>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <div>
                <FieldLabel>Label Link &quot;Lihat Semua&quot;</FieldLabel>
                <TextInput
                  disabled={isLocked}
                  value={readSecContent(sec, 'view_all_label')}
                  onChange={(v) => writeSecContent(sec, 'view_all_label', v)}
                />
              </div>
              <div>
                <FieldLabel>URL Link</FieldLabel>
                <TextInput
                  disabled={isLocked}
                  value={sec.content?.view_all_url || '/products'}
                  onChange={(v) => writeSecContent(sec, 'view_all_url', v, true)}
                />
              </div>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Section ({editingLocale.toUpperCase()})</FieldLabel>
              <TextInput
                disabled={isLocked}
                value={readSecField(sec, 'title')}
                onChange={(v) => writeSecField(sec, 'title', v)}
              />
            </div>
            <div>
              <FieldLabel>Subjudul ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput
                disabled={isLocked}
                rows={2}
                value={readSecField(sec, 'subtitle')}
                onChange={(v) => writeSecField(sec, 'subtitle', v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Gaya Tampilan</FieldLabel>
                <select
                  disabled={isLocked}
                  value={sec.settings?.display_style || 'pills'}
                  onChange={(e) =>
                    onUpdateSection(sec.id, (cur) => ({
                      ...cur,
                      settings: { ...cur.settings, display_style: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="pills">Pills (Default)</option>
                  <option value="grid">Kartu Grid</option>
                </select>
              </div>
              <div>
                <FieldLabel>Maksimal Kategori</FieldLabel>
                <input
                  type="number"
                  min={2}
                  max={20}
                  disabled={isLocked}
                  value={Number(sec.settings?.max_items || 10)}
                  onChange={(e) =>
                    onUpdateSection(sec.id, (cur) => ({
                      ...cur,
                      settings: { ...cur.settings, max_items: Number(e.target.value) || 10 },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-700">Tampilkan Jumlah Publikasi</span>
              <input
                type="checkbox"
                disabled={isLocked}
                checked={sec.settings?.show_counts !== false}
                onChange={(e) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    settings: { ...cur.settings, show_counts: e.target.checked },
                  }))
                }
              />
            </label>
          </div>
        );

      case 'why_us': {
        const items: any[] = Array.isArray(readSecContent(sec, 'items', []))
          ? readSecContent(sec, 'items', [])
          : [];
        const updateItems = (next: any[]) => writeSecContent(sec, 'items', next);

        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Section ({editingLocale.toUpperCase()})</FieldLabel>
              <TextInput disabled={isLocked} value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput disabled={isLocked} rows={2} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div>
              <FieldLabel>Gaya Kartu</FieldLabel>
              <select
                disabled={isLocked}
                value={sec.settings?.card_style || 'surface'}
                onChange={(e) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    settings: { ...cur.settings, card_style: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="surface">Surface Neutral (#F8FAFC)</option>
                <option value="bordered">White Bordered</option>
                <option value="minimal">Minimalist</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Daftar Kartu Keunggulan ({items.length})</span>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() =>
                    updateItems([
                      ...items,
                      { id: generateCmsId('why'), icon: 'ShieldCheck', title: 'Poin Keunggulan Baru', description: 'Deskripsi singkat nilai tambah.' },
                    ])
                  }
                  className="text-[10px] font-bold text-[#1976D2] hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Kartu
                </button>
              </div>
              {items.map((item, idx) => (
                <div key={item.id || idx} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <select
                      disabled={isLocked}
                      value={item.icon || 'ShieldCheck'}
                      onChange={(e) =>
                        updateItems(items.map((it, i) => (i === idx ? { ...it, icon: e.target.value } : it)))
                      }
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold"
                    >
                      {CMS_FEATURE_ICON_OPTIONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={() => updateItems(items.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <TextInput
                    disabled={isLocked}
                    placeholder="Judul Kartu"
                    value={item.title}
                    onChange={(v) => updateItems(items.map((it, i) => (i === idx ? { ...it, title: v } : it)))}
                  />
                  <TextAreaInput
                    disabled={isLocked}
                    rows={2}
                    placeholder="Deskripsi"
                    value={item.description}
                    onChange={(v) => updateItems(items.map((it, i) => (i === idx ? { ...it, description: v } : it)))}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'about': {
        const stats: any[] = Array.isArray(readSecContent(sec, 'stats', []))
          ? readSecContent(sec, 'stats', [])
          : [];
        const updateStats = (next: any[]) => writeSecContent(sec, 'stats', next);

        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Section ({editingLocale.toUpperCase()})</FieldLabel>
              <TextInput disabled={isLocked} value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Deskripsi Narasi ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput
                disabled={isLocked}
                rows={4}
                value={readSecContent(sec, 'description')}
                onChange={(v) => writeSecContent(sec, 'description', v)}
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Metrik Statistik</span>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => updateStats([...stats, { id: generateCmsId('st'), value: '100+', label: 'Metrik Baru' }])}
                  className="text-[10px] font-bold text-[#1976D2] hover:underline"
                >
                  + Metrik
                </button>
              </div>
              {stats.map((st, idx) => (
                <div key={st.id || idx} className="grid grid-cols-12 gap-1.5 items-center">
                  <div className="col-span-4">
                    <TextInput
                      placeholder="150+"
                      value={st.value}
                      onChange={(v) => updateStats(stats.map((x, i) => (i === idx ? { ...x, value: v } : x)))}
                    />
                  </div>
                  <div className="col-span-7">
                    <TextInput
                      placeholder="Label"
                      value={st.label}
                      onChange={(v) => updateStats(stats.map((x, i) => (i === idx ? { ...x, label: v } : x)))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateStats(stats.filter((_, i) => i !== idx))}
                    className="col-span-1 text-slate-400 hover:text-rose-600 flex justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Label CTA</FieldLabel>
                <TextInput value={readSecContent(sec, 'cta_label')} onChange={(v) => writeSecContent(sec, 'cta_label', v)} />
              </div>
              <div>
                <FieldLabel>URL CTA</FieldLabel>
                <TextInput value={sec.content?.cta_url || ''} onChange={(v) => writeSecContent(sec, 'cta_url', v, true)} />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
              <div className="text-[10px] font-extrabold uppercase text-slate-400">Panel Sisi Kanan</div>
              <select
                value={sec.settings?.layout || 'split-card'}
                onChange={(e) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    settings: { ...cur.settings, layout: e.target.value },
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="split-card">Kartu Komitmen Editorial</option>
                <option value="split-image">Visual Gambar Media</option>
              </select>

              {sec.settings?.layout === 'split-image' ? (
                <ImagePickerField
                  label="Gambar About"
                  url={sec.content?.image_url || ''}
                  onChangeUrl={(url) => writeSecContent(sec, 'image_url', url, true)}
                />
              ) : (
                <>
                  <TextInput
                    placeholder="Judul Kartu"
                    value={readSecContent(sec, 'card_title')}
                    onChange={(v) => writeSecContent(sec, 'card_title', v)}
                  />
                  <TextAreaInput
                    rows={2}
                    placeholder="Deskripsi Kartu"
                    value={readSecContent(sec, 'card_desc')}
                    onChange={(v) => writeSecContent(sec, 'card_desc', v)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <TextInput
                      placeholder="Lokasi"
                      value={sec.content?.card_location || ''}
                      onChange={(v) => writeSecContent(sec, 'card_location', v, true)}
                    />
                    <TextInput
                      placeholder="Nama Lab"
                      value={sec.content?.card_lab_name || ''}
                      onChange={(v) => writeSecContent(sec, 'card_lab_name', v, true)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        );
      }

      case 'cta':
      case 'promo_banner':
        return (
          <div className="space-y-3.5">
            {sec.type === 'promo_banner' && (
              <div>
                <FieldLabel>Sumber Banner</FieldLabel>
                <select
                  value={sec.settings?.source || 'custom'}
                  onChange={(e) =>
                    onUpdateSection(sec.id, (cur) => ({
                      ...cur,
                      settings: { ...cur.settings, source: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="custom">Kustom di Editor</option>
                  <option value="database">Sinkron Promo Banners Aktif</option>
                </select>
              </div>
            )}
            <div>
              <FieldLabel>Tema Tampilan</FieldLabel>
              <select
                value={sec.settings?.theme || (sec.type === 'cta' ? 'dark' : 'primary')}
                onChange={(e) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    settings: { ...cur.settings, theme: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="dark">Gelap Eksekutif (#0F172A)</option>
                <option value="primary">Biru Brand (#1976D2)</option>
                <option value="surface">Biru Lembut (#D1E4F6)</option>
                <option value="light">Putih Bersih (#FFFFFF)</option>
              </select>
            </div>
            {sec.type === 'promo_banner' && (
              <div>
                <FieldLabel>Eyebrow Badge</FieldLabel>
                <TextInput value={readSecContent(sec, 'eyebrow')} onChange={(v) => writeSecContent(sec, 'eyebrow', v)} />
              </div>
            )}
            <div>
              <FieldLabel>Judul ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput rows={2} value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput rows={3} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div className="p-2.5 rounded-xl border border-slate-200 space-y-2">
              <div className="text-[10px] font-extrabold uppercase text-slate-400">Primary CTA</div>
              <TextInput
                placeholder="Label Tombol"
                value={readSecContent(sec, 'cta_primary_label')}
                onChange={(v) => writeSecContent(sec, 'cta_primary_label', v)}
              />
              <TextInput
                placeholder="URL"
                value={sec.content?.cta_primary_url || ''}
                onChange={(v) => writeSecContent(sec, 'cta_primary_url', v, true)}
              />
            </div>
            {sec.type === 'cta' && (
              <div className="p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="text-[10px] font-extrabold uppercase text-slate-400">Secondary CTA</div>
                <TextInput
                  placeholder="Label Tombol Kedua"
                  value={readSecContent(sec, 'cta_secondary_label')}
                  onChange={(v) => writeSecContent(sec, 'cta_secondary_label', v)}
                />
                <TextInput
                  placeholder="URL"
                  value={sec.content?.cta_secondary_url || ''}
                  onChange={(v) => writeSecContent(sec, 'cta_secondary_url', v, true)}
                />
              </div>
            )}
            {sec.type === 'promo_banner' && (
              <ImagePickerField
                label="Gambar Banner (Opsional)"
                url={sec.content?.image_url || ''}
                onChangeUrl={(url) => writeSecContent(sec, 'image_url', url, true)}
              />
            )}
          </div>
        );

      case 'newsletter':
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Newsletter ({editingLocale.toUpperCase()})</FieldLabel>
              <TextInput value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul ({editingLocale.toUpperCase()})</FieldLabel>
              <TextAreaInput rows={3} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div>
              <FieldLabel>Placeholder Input Email</FieldLabel>
              <TextInput value={readSecContent(sec, 'placeholder')} onChange={(v) => writeSecContent(sec, 'placeholder', v)} />
            </div>
            <div>
              <FieldLabel>Label Tombol Submit</FieldLabel>
              <TextInput value={readSecContent(sec, 'button_label')} onChange={(v) => writeSecContent(sec, 'button_label', v)} />
            </div>
            <div>
              <FieldLabel>Catatan Disclaimer</FieldLabel>
              <TextInput value={readSecContent(sec, 'disclaimer')} onChange={(v) => writeSecContent(sec, 'disclaimer', v)} />
            </div>
          </div>
        );

      case 'split_content': {
        const highlights: string[] = Array.isArray(sec.content?.highlights) ? sec.content.highlights : [];
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Posisi Gambar</FieldLabel>
              <select
                value={sec.settings?.image_position || 'right'}
                onChange={(e) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    settings: { ...cur.settings, image_position: e.target.value },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="right">Gambar di Kanan</option>
                <option value="left">Gambar di Kiri</option>
              </select>
            </div>
            <ImagePickerField
              label="Gambar Split Section"
              url={sec.content?.image_url || ''}
              onChangeUrl={(url, alt) => {
                writeSecContent(sec, 'image_url', url, true);
                if (alt && !sec.content?.image_alt) writeSecContent(sec, 'image_alt', alt, true);
              }}
            />
            <div>
              <FieldLabel>Eyebrow</FieldLabel>
              <TextInput value={readSecContent(sec, 'eyebrow')} onChange={(v) => writeSecContent(sec, 'eyebrow', v)} />
            </div>
            <div>
              <FieldLabel>Judul</FieldLabel>
              <TextInput value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul</FieldLabel>
              <TextAreaInput rows={2} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div>
              <FieldLabel>Paragraf Narasi</FieldLabel>
              <TextAreaInput rows={3} value={readSecContent(sec, 'body')} onChange={(v) => writeSecContent(sec, 'body', v)} />
            </div>
            <div>
              <FieldLabel>Poin Sorotan (1 per baris)</FieldLabel>
              <TextAreaInput
                rows={3}
                value={highlights.join('\n')}
                onChange={(v) => writeSecContent(sec, 'highlights', v.split('\n').filter((x) => x.trim()), true)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TextInput placeholder="Label CTA" value={readSecContent(sec, 'cta_label')} onChange={(v) => writeSecContent(sec, 'cta_label', v)} />
              <TextInput placeholder="URL CTA" value={sec.content?.cta_url || ''} onChange={(v) => writeSecContent(sec, 'cta_url', v, true)} />
            </div>
          </div>
        );
      }

      case 'testimonials': {
        const items: any[] = Array.isArray(sec.content?.items) ? sec.content.items : [];
        const updateItems = (next: any[]) => writeSecContent(sec, 'items', next, true);
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Section</FieldLabel>
              <TextInput value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul</FieldLabel>
              <TextAreaInput rows={2} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Daftar Testimoni</span>
                <button
                  type="button"
                  onClick={() =>
                    updateItems([
                      ...items,
                      { id: generateCmsId('tm'), quote: 'Kutipan baru...', name: 'Nama Pimpinan', role: 'Jabatan', organization: 'Perusahaan' },
                    ])
                  }
                  className="text-[10px] font-bold text-[#1976D2] hover:underline"
                >
                  + Testimoni
                </button>
              </div>
              {items.map((tm, idx) => (
                <div key={tm.id || idx} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400">Testimoni #{idx + 1}</span>
                    <button type="button" onClick={() => updateItems(items.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <TextAreaInput rows={2} placeholder="Kutipan" value={tm.quote} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, quote: v } : x)))} />
                  <TextInput placeholder="Nama" value={tm.name} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, name: v } : x)))} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <TextInput placeholder="Jabatan" value={tm.role} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, role: v } : x)))} />
                    <TextInput placeholder="Perusahaan" value={tm.organization} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, organization: v } : x)))} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'faq': {
        const items: any[] = Array.isArray(sec.content?.items) ? sec.content.items : [];
        const updateItems = (next: any[]) => writeSecContent(sec, 'items', next, true);
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul FAQ</FieldLabel>
              <TextInput value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul</FieldLabel>
              <TextAreaInput rows={2} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Item Pertanyaan</span>
                <button
                  type="button"
                  onClick={() => updateItems([...items, { id: generateCmsId('q'), question: 'Pertanyaan baru?', answer: 'Jawaban lengkap...' }])}
                  className="text-[10px] font-bold text-[#1976D2] hover:underline"
                >
                  + Pertanyaan
                </button>
              </div>
              {items.map((qa, idx) => (
                <div key={qa.id || idx} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400">FAQ #{idx + 1}</span>
                    <button type="button" onClick={() => updateItems(items.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <TextInput placeholder="Pertanyaan" value={qa.question} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, question: v } : x)))} />
                  <TextAreaInput rows={2} placeholder="Jawaban" value={qa.answer} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, answer: v } : x)))} />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'statistics': {
        const items: any[] = Array.isArray(sec.content?.items) ? sec.content.items : [];
        const updateItems = (next: any[]) => writeSecContent(sec, 'items', next, true);
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Statistik</FieldLabel>
              <TextInput value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul</FieldLabel>
              <TextAreaInput rows={2} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">KPI Cards</span>
                <button
                  type="button"
                  onClick={() => updateItems([...items, { id: generateCmsId('k'), value: '99%', label: 'Metrik', note: '' }])}
                  className="text-[10px] font-bold text-[#1976D2] hover:underline"
                >
                  + Metrik
                </button>
              </div>
              {items.map((st, idx) => (
                <div key={st.id || idx} className="p-2 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1.5">
                  <div className="flex justify-between gap-1.5">
                    <TextInput placeholder="150+" value={st.value} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, value: v } : x)))} />
                    <TextInput placeholder="Label" value={st.label} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, label: v } : x)))} />
                    <button type="button" onClick={() => updateItems(items.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <TextInput placeholder="Catatan kecil (opsional)" value={st.note || ''} onChange={(v) => updateItems(items.map((x, i) => (i === idx ? { ...x, note: v } : x)))} />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'image_gallery': {
        const images: any[] = Array.isArray(sec.content?.images) ? sec.content.images : [];
        const updateImages = (next: any[]) => writeSecContent(sec, 'images', next, true);
        return (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Judul Galeri</FieldLabel>
              <TextInput value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
            </div>
            <div>
              <FieldLabel>Subjudul</FieldLabel>
              <TextAreaInput rows={2} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
            </div>
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Item Gambar ({images.length})</span>
                <button
                  type="button"
                  onClick={() => updateImages([...images, { id: generateCmsId('im'), url: '', alt: '', caption: 'Keterangan gambar' }])}
                  className="text-[10px] font-bold text-[#1976D2] hover:underline"
                >
                  + Gambar
                </button>
              </div>
              {images.map((im, idx) => (
                <div key={im.id || idx} className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400">Gambar #{idx + 1}</span>
                    <button type="button" onClick={() => updateImages(images.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ImagePickerField
                    label="File Gambar"
                    url={im.url || ''}
                    onChangeUrl={(url, alt) =>
                      updateImages(images.map((x, i) => (i === idx ? { ...x, url, alt: alt || x.alt } : x)))
                    }
                  />
                  <TextInput placeholder="Caption" value={im.caption || ''} onChange={(v) => updateImages(images.map((x, i) => (i === idx ? { ...x, caption: v } : x)))} />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'custom_layout':
      default:
        return (
          <div className="space-y-3.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-bold text-slate-700">Tampilkan Header Container</span>
              <input
                type="checkbox"
                checked={sec.content?.show_header !== false}
                onChange={(e) => writeSecContent(sec, 'show_header', e.target.checked, true)}
              />
            </label>
            {sec.content?.show_header !== false && (
              <>
                <div>
                  <FieldLabel>Judul Container</FieldLabel>
                  <TextInput value={readSecField(sec, 'title')} onChange={(v) => writeSecField(sec, 'title', v)} />
                </div>
                <div>
                  <FieldLabel>Subjudul Container</FieldLabel>
                  <TextAreaInput rows={2} value={readSecField(sec, 'subtitle')} onChange={(v) => writeSecField(sec, 'subtitle', v)} />
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Inspector Header */}
      <div className="p-3.5 border-b border-slate-200 bg-white space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers className="w-4 h-4 text-[#1976D2] shrink-0" />
            <h3 className="text-xs font-bold text-slate-900 truncate">{sec.label}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateSection(sec.id, (cur) => ({ ...cur, locked: !cur.locked }))}
              className={`p-1 rounded-lg border ${
                isLocked ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-slate-200 text-slate-400 hover:text-slate-700'
              }`}
              title={isLocked ? 'Buka Kunci Section' : 'Kunci Section'}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onSelect({ scope: 'theme' })}
              className="px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:text-[#1976D2]"
            >
              Global Theme
            </button>
          </div>
        </div>

        {/* 4 Schema Tabs: Content | Style | Layout | Advanced */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl">
          {(
            [
              { id: 'content', label: 'Konten' },
              { id: 'style', label: 'Gaya' },
              { id: 'layout', label: 'Layout' },
              { id: 'advanced', label: 'Lanjut' },
            ] as { id: InspectorTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-1 rounded-lg text-[11px] font-bold transition-colors ${
                activeTab === t.id ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-3.5 text-xs">
        {isLocked && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Section terkunci. Klik ikon gembok untuk mengedit.</span>
          </div>
        )}

        {activeTab === 'content' && renderSectionContentFields()}

        {activeTab === 'style' && (
          <div className="space-y-4">
            <ColorField
              label="Warna Background Section"
              value={sec.styles?.background_color || 'transparent'}
              onChange={(v) =>
                onUpdateSection(sec.id, (cur) => ({
                  ...cur,
                  styles: { ...cur.styles, background_color: v },
                }))
              }
              presets={['transparent', '#FFFFFF', '#F8FAFC', '#D1E4F6', '#1976D2', '#0F172A']}
            />
            <ColorField
              label="Warna Teks Heading"
              value={sec.styles?.text_color || '#0F172A'}
              onChange={(v) =>
                onUpdateSection(sec.id, (cur) => ({
                  ...cur,
                  styles: { ...cur.styles, text_color: v },
                }))
              }
              presets={['#0F172A', '#FFFFFF', '#1976D2']}
            />
            <div>
              <FieldLabel>Padding Vertikal</FieldLabel>
              <select
                disabled={isLocked}
                value={sec.styles?.padding_y || 'normal'}
                onChange={(e) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    styles: { ...cur.styles, padding_y: e.target.value as any },
                  }))
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
              >
                <option value="none">Tanpa Padding Tambahan</option>
                <option value="sm">Kecil (16px)</option>
                <option value="normal">Normal</option>
                <option value="lg">Besar (48px)</option>
              </select>
            </div>
            <div>
              <FieldLabel>Alignment Teks</FieldLabel>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                {(['left', 'center', 'right'] as const).map((al) => (
                  <button
                    key={al}
                    type="button"
                    disabled={isLocked}
                    onClick={() =>
                      onUpdateSection(sec.id, (cur) => ({
                        ...cur,
                        styles: { ...cur.styles, text_align: al },
                      }))
                    }
                    className={`py-1 rounded-lg text-[11px] font-bold capitalize ${
                      (sec.styles?.text_align || 'left') === al
                        ? 'bg-white text-[#1976D2] shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    {al}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'layout' && (
          <div className="space-y-4">
            {sec.type === 'hero' && (
              <div>
                <FieldLabel>Varian Layout Hero</FieldLabel>
                <select
                  disabled={isLocked}
                  value={sec.settings?.layout || 'centered'}
                  onChange={(e) =>
                    onUpdateSection(sec.id, (cur) => ({
                      ...cur,
                      settings: { ...cur.settings, layout: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                >
                  <option value="centered">Centered Editorial (Default)</option>
                  <option value="split">Split 2 Kolom dengan Gambar</option>
                </select>
              </div>
            )}

            {/* Per-Breakpoint Responsive Controls */}
            <div className="space-y-3 pt-1">
              <FieldLabel>Pengaturan Responsif per Breakpoint</FieldLabel>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                {(
                  [
                    { id: 'desktop', label: 'Desktop', icon: Monitor },
                    { id: 'tablet', label: 'Tablet', icon: Tablet },
                    { id: 'mobile', label: 'Mobile', icon: Smartphone },
                  ] as const
                ).map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setRespDevice(d.id)}
                      className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 ${
                        respDevice === d.id ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <Icon className="w-3 h-3" /> {d.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-slate-700 capitalize">Tampil di {respDevice}</span>
                  <input
                    type="checkbox"
                    disabled={isLocked}
                    checked={sec.responsive?.[respDevice]?.visible !== false}
                    onChange={(e) =>
                      onUpdateSection(sec.id, (cur) => ({
                        ...cur,
                        responsive: {
                          ...cur.responsive,
                          [respDevice]: {
                            ...(cur.responsive?.[respDevice] || {}),
                            visible: e.target.checked,
                          },
                        },
                      }))
                    }
                  />
                </label>

                {['featured_products', 'latest_products', 'categories', 'why_us', 'testimonials', 'statistics', 'image_gallery', 'custom_layout', 'faq'].includes(sec.type) && (
                  <div>
                    <FieldLabel>Jumlah Kolom ({respDevice})</FieldLabel>
                    <select
                      disabled={isLocked}
                      value={
                        sec.responsive?.[respDevice]?.columns ||
                        (respDevice === 'desktop' ? def?.defaultColumns.desktop || 4 : respDevice === 'tablet' ? 2 : 1)
                      }
                      onChange={(e) =>
                        onUpdateSection(sec.id, (cur) => ({
                          ...cur,
                          responsive: {
                            ...cur.responsive,
                            [respDevice]: {
                              ...(cur.responsive?.[respDevice] || {}),
                              columns: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs"
                    >
                      <option value={1}>1 Kolom</option>
                      <option value={2}>2 Kolom</option>
                      <option value={3}>3 Kolom</option>
                      <option value={4}>4 Kolom</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-3.5">
            <div>
              <FieldLabel>Nama Layer di Navigator</FieldLabel>
              <TextInput
                disabled={isLocked}
                value={sec.label}
                onChange={(v) => onUpdateSection(sec.id, (cur) => ({ ...cur, label: v }))}
              />
            </div>
            <label className="flex items-center justify-between cursor-pointer pt-1">
              <span className="font-bold text-slate-700">Tampilkan Section di Homepage</span>
              <input
                type="checkbox"
                disabled={isLocked}
                checked={sec.visible}
                onChange={(e) => onUpdateSection(sec.id, (cur) => ({ ...cur, visible: e.target.checked }))}
              />
            </label>
            <div>
              <FieldLabel>Element Anchor ID</FieldLabel>
              <TextInput
                disabled={isLocked}
                placeholder="mis: featured-reports"
                value={sec.advanced?.element_id || ''}
                onChange={(v) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    advanced: { ...cur.advanced, element_id: v.replace(/[^a-zA-Z0-9_-]/g, '') },
                  }))
                }
              />
            </div>
            <div>
              <FieldLabel>CSS Utility Classes (Aman)</FieldLabel>
              <TextInput
                disabled={isLocked}
                placeholder="mis: my-custom-spacing"
                value={sec.advanced?.css_class || ''}
                onChange={(v) =>
                  onUpdateSection(sec.id, (cur) => ({
                    ...cur,
                    advanced: { ...cur.advanced, css_class: v },
                  }))
                }
              />
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-[10px] text-slate-500 space-y-1">
              <div>
                <strong>Component Type:</strong> <span className="font-mono">{sec.type}</span>
              </div>
              <div>
                <strong>Stable ID:</strong> <span className="font-mono">{sec.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

