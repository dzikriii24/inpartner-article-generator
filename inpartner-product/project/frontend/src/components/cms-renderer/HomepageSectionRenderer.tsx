import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GripVertical,
  Image as ImageIcon,
  LineChart,
  Lock,
  Mail,
  Plus,
  Quote,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Zap,
  Cpu,
} from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProductCard from '@/components/ProductCard';
import { cmsApi } from '@/services/cms/cmsApi';
import { useLanguage } from '@/context/LanguageContext';
import { getCmsIcon } from './cmsIcons';
import { BlockRenderer, type BlockEditorCallbacks } from './BlockRenderer';
import { ComponentErrorBoundary } from './ComponentErrorBoundary';
import {
  getResponsiveGridClass,
  isSectionVisibleInViewport,
  useCmsViewport,
} from './CmsViewportContext';
import type { CmsSectionNode, SelectionTarget } from '@/types/cms/builder';

export const DEFAULT_SECTOR_PILLS = [
  { id: 's-1', name: 'Makroekonomi & Fiskal', slug: 'business-economy', icon: LineChart },
  { id: 's-2', name: 'Fintech & Digital Banking', slug: 'market-finance', icon: Coins },
  { id: 's-3', name: 'AI & Inovasi Teknologi', slug: 'tech-ai', icon: Cpu },
  { id: 's-4', name: 'Kebijakan Publik & Regulasi', slug: 'policy', icon: ShieldCheck },
  { id: 's-5', name: 'Strategi Korporasi & Bisnis', slug: 'business', icon: Briefcase },
  { id: 's-6', name: 'Riset & Jurnal Akademik', slug: 'research', icon: BookOpen },
  { id: 's-7', name: 'Energi Terbarukan & ESG', slug: 'macro', icon: Zap },
  { id: 's-8', name: 'Pasar Modal & Emiten', slug: 'stock', icon: TrendingUp },
];

export interface SectionEditorCallbacks {
  isBuilder: boolean;
  isPreviewOnly?: boolean;
  selection: SelectionTarget | null;
  sectionIndex: number;
  totalSections: number;
  onSelectSection: (sectionId: string, subPart?: string) => void;
  onSelectBlock: (sectionId: string, blockId: string) => void;
  onMoveSection: (sectionId: string, dir: 'up' | 'down') => void;
  onDuplicateSection: (sectionId: string) => void;
  onToggleSectionVisible: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onAddSectionAt: (index: number) => void;
  onSaveAsTemplate: (section: CmsSectionNode) => void;
  onInlineUpdateSection: (sectionId: string, patch: Partial<CmsSectionNode>) => void;
  onDuplicateBlock: (sectionId: string, blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onToggleBlockVisible: (sectionId: string, blockId: string) => void;
  onInlineUpdateBlock: (sectionId: string, blockId: string, patch: Record<string, any>) => void;
  onResetSectionFallback?: (sectionId: string) => void;
}

interface HomepageSectionRendererProps {
  section: CmsSectionNode;
  catalog: {
    featured: any[];
    latest: any[];
    popular: any[];
    categories: any[];
    banners: any[];
  };
  editor?: SectionEditorCallbacks;
}

export const HomepageSectionRenderer: React.FC<HomepageSectionRendererProps> = ({
  section,
  catalog,
  editor,
}) => {
  const { locale, t } = useLanguage();
  const { viewport } = useCmsViewport();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]);
  const [inlineField, setInlineField] = useState<'title' | 'subtitle' | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const isBuilder = Boolean(editor?.isBuilder && !editor?.isPreviewOnly);
  const isSelectedSection =
    editor?.selection?.scope === 'section' && editor.selection.sectionId === section.id;
  const selectedSubPart =
    editor?.selection?.scope === 'section' && editor.selection.sectionId === section.id
      ? editor.selection.subPart
      : undefined;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `section:${section.id}`,
    data: {
      kind: 'section',
      sectionId: section.id,
    },
    disabled: !isBuilder || Boolean(section.locked),
  });

  const { setNodeRef: setChildDropRef, isOver: isOverChildZone } = useDroppable({
    id: `section-drop:${section.id}`,
    data: {
      kind: 'section-drop',
      sectionId: section.id,
    },
    disabled: !isBuilder,
  });

  const visibleInViewport = isSectionVisibleInViewport(viewport, section.responsive);
  if ((!section.visible || !visibleInViewport) && !isBuilder) {
    return null;
  }

  const pickProducts = (defaultSource: 'featured' | 'latest' | 'popular') => {
    const source = section.settings?.source || defaultSource;
    const categorySlug = section.settings?.category_slug || '';
    const maxItems = Number(section.settings?.max_items || (defaultSource === 'featured' ? 4 : 6));
    let pool =
      source === 'popular'
        ? catalog.popular
        : source === 'latest'
        ? catalog.latest
        : catalog.featured?.length > 0
        ? catalog.featured
        : catalog.popular;

    if (!pool || pool.length === 0) {
      pool = [...(catalog.featured || []), ...(catalog.latest || []), ...(catalog.popular || [])];
    }

    if (categorySlug) {
      const filtered = pool.filter((p) => p.category?.slug === categorySlug);
      if (filtered.length > 0) pool = filtered;
    }

    return (pool || []).slice(0, maxItems);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBuilder) return;
    if (!newsletterEmail.trim()) return;
    setNewsletterSubmitting(true);
    setNewsletterError('');
    try {
      await cmsApi.subscribeNewsletter(newsletterEmail.trim(), locale, 'homepage');
      setNewsletterDone(true);
      setNewsletterEmail('');
    } catch (err: any) {
      setNewsletterError(err?.response?.data?.message || 'Gagal mendaftarkan email.');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  };

  const subSelectProps = (part: string) =>
    isBuilder
      ? {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            editor?.onSelectSection(section.id, part);
          },
          className: `cursor-pointer transition-all rounded-lg ${
            selectedSubPart === part ? 'outline outline-2 outline-[#1976D2] outline-offset-2' : 'hover:outline hover:outline-1 hover:outline-[#B2D1F0] hover:outline-offset-2'
          }`,
        }
      : {};

  const renderEditableTitle = (className: string, Tag: 'h1' | 'h2' = 'h2') => {
    const text = section.title || '';
    if (isBuilder && inlineField === 'title' && !section.locked) {
      return (
        <input
          type="text"
          autoFocus
          value={text}
          onChange={(e) => editor?.onInlineUpdateSection(section.id, { title: e.target.value })}
          onBlur={() => setInlineField(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setInlineField(null);
          }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full bg-[#D1E4F6]/30 border border-[#1976D2] rounded-xl px-3 py-1 text-slate-900 focus:outline-none ${className}`}
        />
      );
    }
    return (
      <Tag
        onClick={(e) => {
          if (!isBuilder) return;
          e.stopPropagation();
          editor?.onSelectSection(section.id, 'heading');
        }}
        onDoubleClick={(e) => {
          if (!isBuilder || section.locked) return;
          e.stopPropagation();
          setInlineField('title');
        }}
        style={section.styles?.text_color && section.styles.text_color !== 'transparent' ? { color: section.styles.text_color } : undefined}
        className={`${className} ${
          isBuilder
            ? selectedSubPart === 'heading'
              ? 'outline outline-2 outline-[#1976D2] outline-offset-4 rounded-lg'
              : 'hover:outline hover:outline-1 hover:outline-[#B2D1F0] hover:outline-offset-4 rounded-lg'
            : ''
        }`}
      >
        {text}
      </Tag>
    );
  };

  const renderEditableSubtitle = (className: string, fallback = '') => {
    const text = section.subtitle || fallback;
    if (!text && !isBuilder) return null;
    if (isBuilder && inlineField === 'subtitle' && !section.locked) {
      return (
        <textarea
          autoFocus
          rows={2}
          value={section.subtitle || ''}
          onChange={(e) => editor?.onInlineUpdateSection(section.id, { subtitle: e.target.value })}
          onBlur={() => setInlineField(null)}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-[#D1E4F6]/30 border border-[#1976D2] rounded-xl px-3 py-1.5 text-slate-800 text-sm focus:outline-none"
        />
      );
    }
    return (
      <p
        onClick={(e) => {
          if (!isBuilder) return;
          e.stopPropagation();
          editor?.onSelectSection(section.id, 'subtitle');
        }}
        onDoubleClick={(e) => {
          if (!isBuilder || section.locked) return;
          e.stopPropagation();
          setInlineField('subtitle');
        }}
        className={`${className} ${
          isBuilder
            ? selectedSubPart === 'subtitle'
              ? 'outline outline-2 outline-[#1976D2] outline-offset-4 rounded-lg'
              : 'hover:outline hover:outline-1 hover:outline-[#B2D1F0] hover:outline-offset-4 rounded-lg'
            : ''
        }`}
      >
        {text || (isBuilder ? 'Klik dua kali untuk menambahkan subjudul...' : '')}
      </p>
    );
  };

  const blockEditorCallbacks: BlockEditorCallbacks | undefined = editor
    ? {
        isBuilder,
        isPreviewOnly: editor.isPreviewOnly,
        selection: editor.selection,
        sectionId: section.id,
        onSelectBlock: editor.onSelectBlock,
        onDuplicateBlock: editor.onDuplicateBlock,
        onDeleteBlock: editor.onDeleteBlock,
        onToggleBlockVisible: editor.onToggleBlockVisible,
        onInlineUpdateBlock: editor.onInlineUpdateBlock,
      }
    : undefined;

  const renderChildrenZone = () => {
    const children = section.children || [];
    if (!children.length && !isBuilder) return null;

    const childIds = children.map((b) => `block:${section.id}:${b.id}`);
    const cols =
      viewport === 'mobile'
        ? section.responsive?.mobile?.columns || 1
        : viewport === 'tablet'
        ? section.responsive?.tablet?.columns || 2
        : section.responsive?.desktop?.columns || (section.type === 'custom_layout' ? 2 : 1);

    const gridCls =
      section.type === 'custom_layout'
        ? getResponsiveGridClass(viewport, section.responsive, { desktop: cols, tablet: 2, mobile: 1 })
        : 'grid-cols-1';

    return (
      <div
        ref={setChildDropRef}
        className={`${children.length > 0 ? 'mt-6' : isBuilder ? 'mt-4' : ''} ${
          isBuilder && isOverChildZone
            ? 'rounded-2xl border-2 border-dashed border-[#1976D2] bg-[#D1E4F6]/20 p-3'
            : ''
        }`}
      >
        {children.length > 0 && (
          <SortableContext items={childIds} strategy={rectSortingStrategy}>
            <div className={`grid gap-4 ${gridCls}`}>
              {children.map((blk) => (
                <BlockRenderer
                  key={blk.id}
                  block={blk}
                  catalogProducts={[...(catalog.featured || []), ...(catalog.latest || [])]}
                  editor={blockEditorCallbacks}
                />
              ))}
            </div>
          </SortableContext>
        )}
        {isBuilder && children.length === 0 && (section.type === 'custom_layout' || isOverChildZone) && (
          <div className="py-6 rounded-2xl border-2 border-dashed border-slate-200 text-center text-xs text-slate-400">
            Seret blok elemen dari panel kiri ke sini
          </div>
        )}
      </div>
    );
  };

  const sectionBg =
    section.styles?.background_color && section.styles.background_color !== 'transparent'
      ? section.styles.background_color
      : undefined;

  const paddingYClass =
    section.styles?.padding_y === 'none'
      ? ''
      : section.styles?.padding_y === 'sm'
      ? 'py-4'
      : section.styles?.padding_y === 'lg'
      ? 'py-12'
      : '';

  const renderSectionBody = () => {
    const content = section.content || {};
    const settings = section.settings || {};

    switch (section.type) {
      // ================================================================
      // 1. HERO SECTION
      // ================================================================
      case 'hero': {
        const isSplit = settings.layout === 'split';
        const showBadge = Boolean(content.show_badge && content.badge_text);
        const alignCenter = !isSplit && (section.styles?.text_align || 'center') === 'center';

        const heroTextCol = (
          <div className={`space-y-6 ${alignCenter ? 'text-center' : 'text-left'}`}>
            {showBadge && (
              <div
                {...subSelectProps('badge')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-[11px] font-bold ${
                  subSelectProps('badge').className || ''
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#1976D2]" />
                <span>{content.badge_text}</span>
              </div>
            )}

            {renderEditableTitle(
              `${viewport === 'mobile' ? 'text-3xl' : viewport === 'tablet' ? 'text-4xl' : 'text-3xl sm:text-5xl lg:text-6xl'} font-extrabold text-[#0F172A] tracking-tight leading-[1.15]`,
              'h1'
            )}

            {renderEditableSubtitle(
              `${viewport === 'mobile' ? 'text-sm' : 'text-sm sm:text-lg'} text-[#64748B] ${alignCenter ? 'max-w-2xl mx-auto' : 'max-w-xl'} leading-relaxed font-supporting`
            )}

            <div className={`flex flex-wrap items-center gap-3 pt-2 ${alignCenter ? 'justify-center' : 'justify-start'}`}>
              {(content.cta_primary_label || isBuilder) && (
                <Link
                  to={content.cta_primary_url || '/products'}
                  onClick={(e) => {
                    if (isBuilder) {
                      e.preventDefault();
                      e.stopPropagation();
                      editor?.onSelectSection(section.id, 'cta_primary');
                    }
                  }}
                  className={`px-6 py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] active:bg-[#0C3B69] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-card transition-all flex items-center gap-2 group cursor-pointer ${
                    selectedSubPart === 'cta_primary' ? 'ring-2 ring-offset-2 ring-[#1976D2]' : ''
                  }`}
                >
                  <span>{content.cta_primary_label || t('home.explore_catalog', 'Jelajahi Katalog Riset')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}

              {(content.cta_secondary_label || isBuilder) && (
                <Link
                  to={content.cta_secondary_url || '/products?custom=true'}
                  onClick={(e) => {
                    if (isBuilder) {
                      e.preventDefault();
                      e.stopPropagation();
                      editor?.onSelectSection(section.id, 'cta_secondary');
                    }
                  }}
                  className={`px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                    selectedSubPart === 'cta_secondary' ? 'ring-2 ring-offset-2 ring-[#1976D2]' : ''
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#1976D2]" />
                  <span>{content.cta_secondary_label || t('home.custom_service', 'Layanan Analisis Kustom')}</span>
                </Link>
              )}
            </div>
          </div>
        );

        if (isSplit) {
          const splitGrid = viewport === 'mobile' || viewport === 'tablet' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12';
          return (
            <section
              style={sectionBg ? { backgroundColor: sectionBg } : undefined}
              className={`relative pt-4 sm:pt-8 pb-6 ${paddingYClass} ${section.advanced?.css_class || ''}`}
              id={section.advanced?.element_id || undefined}
            >
              <div className={`grid ${splitGrid} gap-8 items-center`}>
                <div className={viewport === 'mobile' || viewport === 'tablet' ? '' : 'lg:col-span-7'}>
                  {heroTextCol}
                </div>
                <div
                  onClick={(e) => {
                    if (!isBuilder) return;
                    e.stopPropagation();
                    editor?.onSelectSection(section.id, 'image');
                  }}
                  className={`${viewport === 'mobile' || viewport === 'tablet' ? '' : 'lg:col-span-5'} rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs aspect-[4/3] flex items-center justify-center ${
                    selectedSubPart === 'image' ? 'ring-2 ring-[#1976D2] ring-offset-2' : ''
                  }`}
                >
                  {content.image_url ? (
                    <img
                      src={content.image_url}
                      alt={content.image_alt || section.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-8 text-center text-slate-400 space-y-2">
                      <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">Pilih Hero Image di Inspector</p>
                    </div>
                  )}
                </div>
              </div>
              {renderChildrenZone()}
            </section>
          );
        }

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`relative text-center max-w-4xl mx-auto pt-6 sm:pt-12 pb-6 ${paddingYClass} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            {heroTextCol}
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 2 & 5. FEATURED / LATEST PRODUCT GRID
      // ================================================================
      case 'featured_products':
      case 'latest_products': {
        const isLatest = section.type === 'latest_products';
        const items = pickProducts(isLatest ? 'latest' : 'featured');
        const gridCols = getResponsiveGridClass(viewport, section.responsive, {
          desktop: isLatest ? 3 : 4,
          tablet: 2,
          mobile: 1,
        });
        const viewAllUrl = content.view_all_url || (isLatest ? '/products?sort=newest' : '/products');
        const viewAllLabel = content.view_all_label || (isLatest ? t('catalog.filter_all', 'Lihat Semua Dokumen') : t('catalog.filter_all', 'Semua Publikasi'));

        if (!items.length && !isBuilder) return null;

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`space-y-8 ${paddingYClass} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
                {section.subtitle &&
                  renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting mt-1')}
              </div>
              <Link
                to={viewAllUrl}
                onClick={(e) => {
                  if (isBuilder) e.preventDefault();
                }}
                className="text-xs font-bold text-[#1976D2] hover:text-[#1562AF] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>{viewAllLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {items.length > 0 ? (
              <div className={`grid ${gridCols} gap-6`}>
                {items.map((item) => (
                  <ProductCard
                    key={item.id}
                    product={item}
                    showPrice={Boolean(settings.show_price)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
                Belum ada publikasi yang dimuat. Data publikasi live dari katalog akan tampil di sini.
              </div>
            )}
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 3. CATEGORIES / SECTOR EXPLORATION
      // ================================================================
      case 'categories': {
        const maxCats = Number(settings.max_items || 10);
        const displayCats =
          Array.isArray(catalog.categories) && catalog.categories.length > 0
            ? catalog.categories.slice(0, maxCats)
            : DEFAULT_SECTOR_PILLS.slice(0, maxCats);
        const isGrid = settings.display_style === 'grid';
        const showCounts = settings.show_counts !== false;

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`space-y-6 ${paddingYClass} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="text-center max-w-2xl mx-auto space-y-2">
              {renderEditableTitle('text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight')}
              {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting')}
            </div>

            {isGrid ? (
              <div
                className={`grid gap-4 ${getResponsiveGridClass(viewport, section.responsive, {
                  desktop: 4,
                  tablet: 2,
                  mobile: 1,
                })}`}
              >
                {displayCats.map((cat: any) => {
                  const IconComp = typeof cat.icon === 'function' ? cat.icon : getCmsIcon(cat.icon, Tag);
                  return (
                    <Link
                      key={cat.id || cat.slug}
                      to={`/products?category=${cat.slug}`}
                      onClick={(e) => {
                        if (isBuilder) e.preventDefault();
                      }}
                      className="p-4 rounded-2xl bg-white hover:bg-[#D1E4F6]/30 border border-slate-200 hover:border-[#B2D1F0] transition-all flex items-start gap-3 shadow-xs"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center shrink-0">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{cat.name}</div>
                        {cat.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{cat.description}</p>
                        )}
                        {showCounts && cat.products_count !== undefined && (
                          <span className="inline-block mt-1.5 text-[10px] font-semibold text-[#1976D2]">
                            {cat.products_count} publikasi
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-5xl mx-auto">
                {displayCats.map((cat: any) => {
                  const IconComp = typeof cat.icon === 'function' ? cat.icon : getCmsIcon(cat.icon, Tag);
                  return (
                    <Link
                      key={cat.id || cat.slug}
                      to={`/products?category=${cat.slug}`}
                      onClick={(e) => {
                        if (isBuilder) e.preventDefault();
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#D1E4F6]/50 border border-slate-200 hover:border-[#B2D1F0] text-xs font-semibold text-slate-700 hover:text-[#0C3B69] transition-all flex items-center gap-2 shadow-xs group cursor-pointer"
                    >
                      <IconComp className="w-3.5 h-3.5 text-[#1976D2]" />
                      <span>{cat.name}</span>
                      {showCounts && cat.products_count !== undefined && cat.products_count > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-white font-medium">
                          {cat.products_count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 4. WHY US / FEATURE CARDS
      // ================================================================
      case 'why_us': {
        const items = Array.isArray(content.items) ? content.items : [];
        const gridCols = getResponsiveGridClass(viewport, section.responsive, {
          desktop: 4,
          tablet: 2,
          mobile: 1,
        });
        const cardStyle = settings.card_style || 'surface';

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="max-w-2xl mb-10">
              {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
              {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting mt-2')}
            </div>

            <div className={`grid ${gridCols} gap-6`}>
              {items.map((item: any, idx: number) => {
                const Comp = getCmsIcon(item.icon, ShieldCheck);
                const cardCls =
                  cardStyle === 'minimal'
                    ? 'p-4 space-y-3'
                    : cardStyle === 'bordered'
                    ? 'p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs'
                    : 'p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-3';
                return (
                  <div key={item.id || idx} className={cardCls}>
                    <div className="w-10 h-10 rounded-xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center">
                      <Comp className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">{item.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-supporting">{item.description}</p>
                  </div>
                );
              })}
            </div>
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 6. ABOUT INPARTNER PLATFORM
      // ================================================================
      case 'about': {
        const stats = Array.isArray(content.stats) ? content.stats : [];
        const isMobileOrTablet = viewport === 'mobile' || viewport === 'tablet';
        const gridCls = isMobileOrTablet ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12';

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`grid ${gridCls} gap-8 items-center bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className={`${isMobileOrTablet ? '' : 'lg:col-span-7'} space-y-4`}>
              {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-tight')}
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-supporting">
                {content.description || ''}
              </p>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                {stats.map((st: any, i: number) => (
                  <div key={st.id || i} className="space-y-1">
                    <div className="text-xl sm:text-2xl font-extrabold text-[#1976D2] tracking-tight">{st.value}</div>
                    <div className="text-[11px] text-slate-500 font-supporting">{st.label}</div>
                  </div>
                ))}
              </div>

              {content.cta_label && (
                <div className="pt-2">
                  <Link
                    to={content.cta_url || '/products'}
                    onClick={(e) => {
                      if (isBuilder) e.preventDefault();
                    }}
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#1976D2] hover:underline cursor-pointer"
                  >
                    <span>{content.cta_label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {settings.layout === 'split-image' && content.image_url ? (
              <div
                {...subSelectProps('image')}
                className={`${isMobileOrTablet ? '' : 'lg:col-span-5'} rounded-2xl overflow-hidden border border-slate-200 aspect-[4/3] ${
                  subSelectProps('image').className || ''
                }`}
              >
                <img src={content.image_url} alt={section.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`${isMobileOrTablet ? '' : 'lg:col-span-5'} bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6 space-y-4`}>
                <div className="flex items-center gap-2 text-xs font-bold text-[#0C3B69]">
                  <ShieldCheck className="w-4 h-4 text-[#1976D2]" />
                  <span>{content.card_title || t('home.about_card_title', 'Komitmen Independensi Editorial')}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-supporting">
                  {content.card_desc ||
                    t(
                      'home.about_card_desc',
                      'Semua analisis dan ringkasan riset di Inpartner diterbitkan tanpa sponsor terselubung. Kepercayaan pembaca profesional adalah aset utama kami.'
                    )}
                </p>
                <div className="border-t border-slate-200/60 pt-3 flex items-center justify-between text-[11px] text-slate-400 font-supporting">
                  <span>{content.card_location || t('home.location', 'Jakarta, Indonesia')}</span>
                  <span>{content.card_lab_name || t('home.lab_name', 'Inpartner Research Lab')}</span>
                </div>
              </div>
            )}
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 7. CTA SECTION
      // ================================================================
      case 'cta': {
        const themeVariant = settings.theme || 'dark';
        const isDark = themeVariant === 'dark' || themeVariant === 'primary';
        const bgCls =
          themeVariant === 'primary'
            ? 'bg-[#1976D2] text-white'
            : themeVariant === 'surface'
            ? 'bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0]'
            : themeVariant === 'light'
            ? 'bg-white text-slate-900 border border-slate-200'
            : 'bg-[#0F172A] text-white';

        const alignCenter = settings.alignment === 'center';

        return (
          <section
            style={sectionBg && sectionBg !== '#0F172A' ? { backgroundColor: sectionBg } : undefined}
            className={`rounded-3xl p-8 sm:p-12 shadow-md relative overflow-hidden ${bgCls} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className={`max-w-2xl relative z-10 space-y-4 ${alignCenter ? 'mx-auto text-center' : ''}`}>
              {renderEditableTitle(
                `text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight ${isDark ? 'text-white' : 'text-[#0F172A]'}`
              )}
              {renderEditableSubtitle(
                `text-xs sm:text-sm leading-relaxed font-supporting ${isDark ? 'text-slate-200' : 'text-slate-600'}`
              )}
              <div className={`flex flex-wrap items-center gap-3 pt-2 ${alignCenter ? 'justify-center' : ''}`}>
                {content.cta_primary_label && (
                  <Link
                    to={content.cta_primary_url || '/products?custom=true'}
                    onClick={(e) => {
                      if (isBuilder) e.preventDefault();
                    }}
                    className={`px-6 py-3 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer ${
                      themeVariant === 'primary'
                        ? 'bg-white text-[#1976D2] hover:bg-slate-50'
                        : 'bg-[#1976D2] hover:bg-[#1562AF] text-white'
                    }`}
                  >
                    <span>{content.cta_primary_label}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {content.cta_secondary_label && (
                  <Link
                    to={content.cta_secondary_url || '/products'}
                    onClick={(e) => {
                      if (isBuilder) e.preventDefault();
                    }}
                    className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {content.cta_secondary_label}
                  </Link>
                )}
              </div>
            </div>
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 8. NEWSLETTER SECTION
      // ================================================================
      case 'newsletter': {
        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-xs ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#D1E4F6] text-[#1976D2] border border-[#B2D1F0] flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6" />
              </div>
              {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
              {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting max-w-lg mx-auto')}

              {newsletterDone ? (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 max-w-md mx-auto">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{content.success_message || t('home.newsletter_success', 'Terima kasih! Email Anda telah terdaftar.')}</span>
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto pt-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={content.placeholder || t('home.newsletter_placeholder', 'Masukkan alamat email korporasi Anda...')}
                    className="w-full bg-slate-50 text-xs text-slate-900 placeholder-slate-400 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#1976D2] focus:ring-2 focus:ring-[#D1E4F6]"
                  />
                  <button
                    type="submit"
                    disabled={newsletterSubmitting}
                    className="w-full sm:w-auto shrink-0 px-5 py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {newsletterSubmitting ? 'Mengirim...' : content.button_label || t('home.newsletter_btn', 'Berlangganan Gratis')}
                  </button>
                </form>
              )}

              {newsletterError && <p className="text-xs text-rose-600 font-medium">{newsletterError}</p>}

              <p className="text-[11px] text-slate-400 font-supporting">
                {content.disclaimer || t('home.newsletter_disclaimer', 'Bebas spam. Anda dapat membatalkan langganan kapan saja.')}
              </p>
            </div>
          </section>
        );
      }

      // ================================================================
      // 9. PROMOTIONAL BANNER (DATABASE OR CUSTOM)
      // ================================================================
      case 'promo_banner': {
        const useDbBanners = settings.source === 'database' && catalog.banners?.length > 0;
        const activeBanner = useDbBanners ? catalog.banners[0] : null;
        const eyebrow = activeBanner?.eyebrow || content.eyebrow;
        const title = activeBanner?.title || section.title;
        const subtitle = activeBanner?.subtitle || section.subtitle;
        const ctaLabel = activeBanner?.cta_label || content.cta_primary_label;
        const ctaUrl = activeBanner?.cta_url || content.cta_primary_url || '/products';
        const imgUrl = activeBanner?.image_url || content.image_url;
        const themeChoice = activeBanner?.theme || settings.theme || 'primary';

        const themeCls =
          themeChoice === 'ink' || themeChoice === 'dark'
            ? 'bg-[#0F172A] text-white'
            : themeChoice === 'light'
            ? 'bg-white text-slate-900 border border-[#B2D1F0]'
            : 'bg-[#1976D2] text-white';

        return (
          <section
            className={`rounded-3xl p-8 sm:p-10 shadow-sm overflow-hidden ${themeCls} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className={`${imgUrl ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
                {eyebrow && (
                  <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/15 border border-white/20">
                    {eyebrow}
                  </span>
                )}
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">{title}</h2>
                {subtitle && <p className="text-xs sm:text-sm opacity-90 font-supporting max-w-2xl">{subtitle}</p>}
                {ctaLabel && (
                  <div className="pt-2">
                    <Link
                      to={ctaUrl}
                      onClick={(e) => {
                        if (isBuilder) e.preventDefault();
                      }}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all ${
                        themeChoice === 'light'
                          ? 'bg-[#1976D2] text-white hover:bg-[#1562AF]'
                          : 'bg-white text-[#0F172A] hover:bg-slate-100'
                      }`}
                    >
                      <span>{ctaLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
              {imgUrl && (
                <div className="lg:col-span-5 aspect-[16/9] rounded-2xl overflow-hidden border border-white/20">
                  <img src={imgUrl} alt={title} loading="lazy" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 10. PRODUCT CAROUSEL
      // ================================================================
      case 'product_carousel': {
        const items = pickProducts('popular');
        const scrollCarousel = (dir: -1 | 1) => {
          if (!carouselRef.current) return;
          carouselRef.current.scrollBy({ left: dir * 340, behavior: 'smooth' });
        };

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`space-y-6 ${paddingYClass} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
                {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting mt-1')}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => scrollCarousel(-1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                  aria-label="Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel(1)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
                  aria-label="Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {content.view_all_label && (
                  <Link
                    to={content.view_all_url || '/products'}
                    onClick={(e) => {
                      if (isBuilder) e.preventDefault();
                    }}
                    className="ml-2 text-xs font-bold text-[#1976D2] hover:text-[#1562AF] flex items-center gap-1"
                  >
                    <span>{content.view_all_label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>

            <div
              ref={carouselRef}
              className="flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth no-scrollbar"
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`shrink-0 snap-start ${
                    viewport === 'mobile' ? 'w-[85%]' : viewport === 'tablet' ? 'w-[48%]' : 'w-[280px] sm:w-[300px]'
                  }`}
                >
                  <ProductCard product={item} showPrice={Boolean(settings.show_price)} />
                </div>
              ))}
            </div>
          </section>
        );
      }

      // ================================================================
      // 11. TESTIMONIALS
      // ================================================================
      case 'testimonials': {
        const items = Array.isArray(content.items) ? content.items : [];
        const gridCols = getResponsiveGridClass(viewport, section.responsive, {
          desktop: 3,
          tablet: 2,
          mobile: 1,
        });

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`space-y-8 ${paddingYClass} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="max-w-2xl space-y-2">
              {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
              {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting')}
            </div>

            <div className={`grid ${gridCols} gap-6`}>
              {items.map((tm: any, idx: number) => (
                <div key={tm.id || idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="w-8 h-8 rounded-xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center">
                      <Quote className="w-4 h-4" />
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-supporting">"{tm.quote}"</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-900">{tm.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {tm.role}
                      {tm.organization ? ` • ${tm.organization}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      }

      // ================================================================
      // 12. FAQ ACCORDION
      // ================================================================
      case 'faq': {
        const items = Array.isArray(content.items) ? content.items : [];
        const gridCols = getResponsiveGridClass(viewport, section.responsive, {
          desktop: 1,
          tablet: 1,
          mobile: 1,
        });

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs space-y-8 ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="max-w-2xl space-y-2">
              {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
              {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting')}
            </div>

            <div className={`grid ${gridCols} gap-3`}>
              {items.map((qa: any, idx: number) => {
                const isOpen = openFaqIndices.includes(idx);
                return (
                  <div key={qa.id || idx} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFaq(idx);
                      }}
                      className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-100/70 transition-colors cursor-pointer"
                    >
                      <span>{qa.question}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#1976D2]' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-2 border-t border-slate-200/70 bg-white text-xs sm:text-sm text-slate-600 leading-relaxed font-supporting">
                        {qa.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      }

      // ================================================================
      // 13. STATISTICS / KPI BAR
      // ================================================================
      case 'statistics': {
        const items = Array.isArray(content.items) ? content.items : [];
        const gridCols = getResponsiveGridClass(viewport, section.responsive, {
          desktop: 4,
          tablet: 2,
          mobile: 2,
        });

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xs space-y-6 ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="text-center max-w-2xl mx-auto space-y-2">
              {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
              {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting')}
            </div>

            <div className={`grid ${gridCols} gap-5 pt-2`}>
              {items.map((st: any, idx: number) => (
                <div key={st.id || idx} className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 text-center space-y-1">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#1976D2] tracking-tight">{st.value}</div>
                  <div className="text-xs font-bold text-slate-800">{st.label}</div>
                  {st.note && <div className="text-[11px] text-slate-400 font-supporting">{st.note}</div>}
                </div>
              ))}
            </div>
          </section>
        );
      }

      // ================================================================
      // 14. IMAGE GALLERY
      // ================================================================
      case 'image_gallery': {
        const images = Array.isArray(content.images) ? content.images : [];
        const gridCols = getResponsiveGridClass(viewport, section.responsive, {
          desktop: 3,
          tablet: 2,
          mobile: 1,
        });

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`space-y-6 ${paddingYClass} ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className="max-w-2xl space-y-2">
              {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight')}
              {renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting')}
            </div>

            <div className={`grid ${gridCols} gap-5`}>
              {images.map((im: any, idx: number) => (
                <figure key={im.id || idx} className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center overflow-hidden">
                    {im.url ? (
                      <img src={im.url} alt={im.alt || ''} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-1.5">
                        <ImageIcon className="w-7 h-7 text-slate-300" />
                        <span className="text-[11px]">Pilih dari Media Library</span>
                      </div>
                    )}
                  </div>
                  {im.caption && (
                    <figcaption className="px-4 py-3 text-xs font-medium text-slate-700 border-t border-slate-100">
                      {im.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        );
      }

      // ================================================================
      // 15. SPLIT CONTENT (IMAGE + TEXT)
      // ================================================================
      case 'split_content': {
        const imageLeft = settings.image_position === 'left';
        const highlights = Array.isArray(content.highlights) ? content.highlights : [];
        const isMobile = viewport === 'mobile';
        const gridCls = isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12';

        const textCol = (
          <div className={`${isMobile ? '' : 'lg:col-span-6'} space-y-4`}>
            {content.eyebrow && (
              <span className="inline-block px-3 py-1 rounded-full bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-[11px] font-bold">
                {content.eyebrow}
              </span>
            )}
            {renderEditableTitle('text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight leading-tight')}
            {renderEditableSubtitle('text-xs sm:text-sm text-slate-600 font-supporting leading-relaxed')}
            {content.body && <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-supporting">{content.body}</p>}
            {highlights.length > 0 && (
              <ul className="space-y-2 pt-1">
                {highlights.map((h: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#1976D2] shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
            {content.cta_label && (
              <div className="pt-2">
                <Link
                  to={content.cta_url || '/products'}
                  onClick={(e) => {
                    if (isBuilder) e.preventDefault();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <span>{content.cta_label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        );

        const imageCol = (
          <div
            {...subSelectProps('image')}
            className={`${isMobile ? '' : 'lg:col-span-6'} rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3] flex items-center justify-center ${
              subSelectProps('image').className || ''
            }`}
          >
            {content.image_url ? (
              <img src={content.image_url} alt={content.image_alt || section.title} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Pilih gambar untuk split layout</p>
              </div>
            )}
          </div>
        );

        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-xs ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            <div className={`grid ${gridCls} gap-8 items-center`}>
              {imageLeft ? (
                <>
                  {imageCol}
                  {textCol}
                </>
              ) : (
                <>
                  {textCol}
                  {imageCol}
                </>
              )}
            </div>
            {renderChildrenZone()}
          </section>
        );
      }

      // ================================================================
      // 16. CUSTOM LAYOUT CONTAINER
      // ================================================================
      case 'custom_layout':
      default: {
        const showHeader = content.show_header !== false && (section.title || section.subtitle);
        return (
          <section
            style={sectionBg ? { backgroundColor: sectionBg } : undefined}
            className={`bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xs ${section.advanced?.css_class || ''}`}
            id={section.advanced?.element_id || undefined}
          >
            {showHeader && (
              <div className="mb-6 space-y-1.5">
                {section.title && renderEditableTitle('text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight')}
                {section.subtitle && renderEditableSubtitle('text-xs sm:text-sm text-slate-500 font-supporting')}
              </div>
            )}
            {renderChildrenZone()}
          </section>
        );
      }
    }
  };

  const wrappedBody = (
    <ComponentErrorBoundary
      label={section.label}
      onReset={editor?.onResetSectionFallback ? () => editor.onResetSectionFallback?.(section.id) : undefined}
    >
      {renderSectionBody()}
    </ComponentErrorBoundary>
  );

  if (!isBuilder) {
    return wrappedBody;
  }

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setSortableRef}
      style={sortableStyle}
      data-cms-section-id={section.id}
      onClick={(e) => {
        e.stopPropagation();
        editor?.onSelectSection(section.id);
      }}
      className={`group/sec relative rounded-3xl transition-all ${
        !section.visible || !visibleInViewport ? 'opacity-45' : ''
      } ${
        isDragging ? 'opacity-40 z-30' : ''
      } ${
        isSelectedSection
          ? 'ring-2 ring-[#1976D2] ring-offset-4 ring-offset-[#F8FAFC]'
          : 'hover:ring-1 hover:ring-[#B2D1F0] hover:ring-offset-4 hover:ring-offset-[#F8FAFC]'
      }`}
    >
      {/* Hidden-in-viewport indicator */}
      {(!section.visible || !visibleInViewport) && (
        <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">
          <EyeOff className="w-3 h-3" />
          <span>{!section.visible ? 'Section Disembunyikan' : `Disembunyikan pada tampilan ${viewport}`}</span>
        </div>
      )}

      {/* Compact Section Floating Label & Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute -top-3.5 left-4 right-4 z-20 flex items-center justify-between pointer-events-none transition-opacity ${
          isSelectedSection ? 'opacity-100' : 'opacity-0 group-hover/sec:opacity-100'
        }`}
      >
        <div className="pointer-events-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1976D2] text-white text-[10px] font-bold shadow-md">
          {!section.locked && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing hover:text-[#D1E4F6]"
              title="Seret untuk mengubah urutan section"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          <span>{section.label}</span>
          {section.locked && <Lock className="w-3 h-3 text-amber-200" />}
        </div>

        <div className="pointer-events-auto inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 shadow-md">
          <button
            type="button"
            onClick={() => editor?.onSelectSection(section.id)}
            className="p-1 rounded hover:bg-[#D1E4F6]/50 hover:text-[#1976D2]"
            title="Edit Pengaturan Section"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={editor!.sectionIndex === 0 || Boolean(section.locked)}
            onClick={() => editor?.onMoveSection(section.id, 'up')}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
            title="Naikkan"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={editor!.sectionIndex >= editor!.totalSections - 1 || Boolean(section.locked)}
            onClick={() => editor?.onMoveSection(section.id, 'down')}
            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
            title="Turunkan"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.onDuplicateSection(section.id)}
            className="p-1 rounded hover:bg-slate-100"
            title="Duplikat Section"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.onSaveAsTemplate(section)}
            className="p-1 rounded hover:bg-slate-100"
            title="Simpan sebagai Template"
          >
            <Save className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor?.onToggleSectionVisible(section.id)}
            className="p-1 rounded hover:bg-slate-100"
            title={section.visible ? 'Sembunyikan' : 'Tampilkan'}
          >
            {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => editor?.onAddSectionAt(editor!.sectionIndex)}
            className="p-1 rounded hover:bg-[#D1E4F6]/50 hover:text-[#1976D2]"
            title="Tambah Section Sebelumnya"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          {!section.locked && (
            <button
              type="button"
              onClick={() => editor?.onDeleteSection(section.id)}
              className="p-1 rounded hover:bg-rose-50 hover:text-rose-600"
              title="Hapus Section"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {wrappedBody}

      {/* Add Section After quick button on selected/hover */}
      <div className="flex justify-center -mb-3 mt-2 opacity-0 group-hover/sec:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            editor?.onAddSectionAt(editor!.sectionIndex + 1);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[#B2D1F0] text-[#1976D2] hover:bg-[#1976D2] hover:text-white text-[10px] font-bold shadow-xs transition-colors"
        >
          <Plus className="w-3 h-3" /> Tambah Section di Bawah
        </button>
      </div>
    </div>
  );
};
