import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Lock,
  Sparkles,
  Trash2,
  Copy,
  EyeOff,
  GripVertical,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProductCard from '@/components/ProductCard';
import { SafeHtmlBlock } from './SafeHtmlBlock';
import { useCmsViewport, getResponsiveGridClass } from './CmsViewportContext';
import type { CmsBlockNode, SelectionTarget } from '@/types/cms/builder';

export interface BlockEditorCallbacks {
  isBuilder: boolean;
  isPreviewOnly?: boolean;
  selection: SelectionTarget | null;
  sectionId: string;
  onSelectBlock: (sectionId: string, blockId: string) => void;
  onDuplicateBlock: (sectionId: string, blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onToggleBlockVisible: (sectionId: string, blockId: string) => void;
  onInlineUpdateBlock?: (sectionId: string, blockId: string, patch: Record<string, any>) => void;
}

interface BlockRendererProps {
  block: CmsBlockNode;
  catalogProducts?: any[];
  editor?: BlockEditorCallbacks;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  catalogProducts = [],
  editor,
}) => {
  const { viewport } = useCmsViewport();
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [inlineEditing, setInlineEditing] = useState(false);

  const isBuilder = Boolean(editor?.isBuilder && !editor?.isPreviewOnly);
  const isSelected =
    editor?.selection?.scope === 'block' &&
    editor.selection.sectionId === editor.sectionId &&
    editor.selection.blockId === block.id;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `block:${editor?.sectionId || 's'}:${block.id}`,
    data: {
      kind: 'block',
      sectionId: editor?.sectionId,
      blockId: block.id,
    },
    disabled: !isBuilder || Boolean(block.locked),
  });

  if (!block.visible && !isBuilder) return null;

  // Responsive visibility in preview
  if (viewport && block.responsive?.[viewport]?.visible === false) {
    if (!isBuilder) return null;
  }

  const align = block.styles?.text_align || 'left';
  const alignClass =
    align === 'center' ? 'text-center items-center' : align === 'right' ? 'text-right items-end' : 'text-left items-start';

  const props = block.props || {};
  const textColor = block.styles?.text_color;

  const renderContent = () => {
    switch (block.type) {
      case 'heading': {
        const level = props.level || 'h3';
        const sizeClass =
          level === 'h1'
            ? 'text-3xl sm:text-4xl font-extrabold'
            : level === 'h2'
            ? 'text-2xl sm:text-3xl font-extrabold'
            : level === 'h4'
            ? 'text-base sm:text-lg font-bold'
            : 'text-xl sm:text-2xl font-bold';
        const TagName = (['h1', 'h2', 'h3', 'h4'].includes(level) ? level : 'h3') as 'h1' | 'h2' | 'h3' | 'h4';

        if (isBuilder && inlineEditing) {
          return (
            <input
              type="text"
              autoFocus
              value={props.text || ''}
              onChange={(e) => editor?.onInlineUpdateBlock?.(editor.sectionId, block.id, { text: e.target.value })}
              onBlur={() => setInlineEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setInlineEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full bg-[#D1E4F6]/30 border border-[#1976D2] rounded-lg px-2 py-1 text-slate-900 focus:outline-none ${sizeClass}`}
            />
          );
        }

        return (
          <TagName
            onDoubleClick={(e: React.MouseEvent) => {
              if (!isBuilder || block.locked) return;
              e.stopPropagation();
              setInlineEditing(true);
            }}
            style={textColor ? { color: textColor } : undefined}
            className={`${sizeClass} text-[#0F172A] tracking-tight leading-snug ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
          >
            {props.text || 'Heading'}
          </TagName>
        );
      }

      case 'text_block': {
        if (isBuilder && inlineEditing) {
          return (
            <textarea
              autoFocus
              rows={3}
              value={props.text || ''}
              onChange={(e) => editor?.onInlineUpdateBlock?.(editor.sectionId, block.id, { text: e.target.value })}
              onBlur={() => setInlineEditing(false)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-[#D1E4F6]/30 border border-[#1976D2] rounded-lg px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none"
            />
          );
        }

        return (
          <p
            onDoubleClick={(e) => {
              if (!isBuilder || block.locked) return;
              e.stopPropagation();
              setInlineEditing(true);
            }}
            style={textColor ? { color: textColor } : undefined}
            className={`text-sm text-[#64748B] leading-relaxed whitespace-pre-line ${
              props.font === 'supporting' ? 'font-supporting' : 'font-sans'
            } ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
          >
            {props.text || ''}
          </p>
        );
      }

      case 'badge': {
        const tone = props.tone || 'primary';
        const toneClass =
          tone === 'success'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : tone === 'neutral'
            ? 'bg-slate-100 text-slate-700 border-slate-200'
            : 'bg-[#D1E4F6] text-[#0C3B69] border-[#B2D1F0]';
        return (
          <div className={`flex ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold ${toneClass}`}>
              <Sparkles className="w-3 h-3" />
              <span>{props.text || 'Verified Badge'}</span>
            </span>
          </div>
        );
      }

      case 'button': {
        const variant = props.variant || 'primary';
        const size = props.size || 'md';
        const sizeCls = size === 'sm' ? 'px-3.5 py-2 text-xs' : size === 'lg' ? 'px-7 py-3.5 text-sm' : 'px-5 py-2.5 text-xs sm:text-sm';
        const varCls =
          variant === 'secondary'
            ? 'bg-white text-[#1976D2] border border-[#B2D1F0] hover:bg-[#F0F6FC]'
            : variant === 'outline'
            ? 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            : variant === 'ghost'
            ? 'bg-transparent text-[#1976D2] hover:bg-[#D1E4F6]/30'
            : 'bg-[#1976D2] hover:bg-[#1562AF] text-white shadow-xs';

        const btnEl = (
          <span className={`inline-flex items-center gap-2 rounded-xl font-bold transition-all cursor-pointer ${sizeCls} ${varCls}`}>
            <span>{props.label || 'Tombol CTA'}</span>
            <ArrowRight className="w-4 h-4" />
          </span>
        );

        return (
          <div className={`flex ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
            {isBuilder ? (
              btnEl
            ) : (
              <Link to={props.url || '/products'} onClick={(e) => { if (isBuilder) e.preventDefault(); }}>
                {btnEl}
              </Link>
            )}
          </div>
        );
      }

      case 'image': {
        const ratioMap: Record<string, string> = {
          '16/9': 'aspect-video',
          '4/3': 'aspect-[4/3]',
          '1/1': 'aspect-square',
          auto: '',
        };
        const ratioCls = ratioMap[props.aspect_ratio || '16/9'] ?? 'aspect-video';
        const fitCls = props.object_fit === 'contain' ? 'object-contain' : 'object-cover';

        return (
          <figure className="space-y-2 w-full">
            <div
              style={{ borderRadius: block.styles?.border_radius || '16px' }}
              className={`w-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center ${ratioCls}`}
            >
              {props.url ? (
                <img
                  src={props.url}
                  alt={props.alt || block.label}
                  loading="lazy"
                  className={`w-full h-full ${fitCls}`}
                />
              ) : (
                <div className="py-10 px-4 text-center text-slate-400 flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-slate-300" />
                  <span className="text-xs font-medium">Pilih gambar dari Media Library</span>
                </div>
              )}
            </div>
            {props.caption && (
              <figcaption className="text-[11px] text-slate-500 font-supporting">{props.caption}</figcaption>
            )}
          </figure>
        );
      }

      case 'image_gallery': {
        const imgs = Array.isArray(props.images) ? props.images : [];
        const cols = Number(props.columns || 2);
        const colCls = cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2';
        return (
          <div className={`grid gap-4 ${colCls}`}>
            {imgs.map((im: any, idx: number) => (
              <figure key={im.id || idx} className="space-y-1.5">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                  {im.url ? (
                    <img src={im.url} alt={im.alt || ''} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                {im.caption && <figcaption className="text-[11px] text-slate-500">{im.caption}</figcaption>}
              </figure>
            ))}
          </div>
        );
      }

      case 'spacer':
        return (
          <div
            style={{ height: `${Number(props.height || 24)}px` }}
            className={`w-full ${isBuilder ? 'border border-dashed border-slate-200/80 rounded-lg bg-slate-50/40 flex items-center justify-center text-[10px] text-slate-400' : ''}`}
          >
            {isBuilder && <span>Spacer ({props.height || 24}px)</span>}
          </div>
        );

      case 'divider':
        return (
          <hr
            style={{
              borderColor: props.color || '#E2E8F0',
              borderTopWidth: `${Number(props.thickness || 1)}px`,
            }}
            className="w-full my-2"
          />
        );

      case 'stats_row': {
        const items = Array.isArray(props.items) ? props.items : [];
        return (
          <div className={`grid gap-4 pt-2 ${items.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {items.map((st: any, idx: number) => (
              <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                <div className="text-xl font-extrabold text-[#1976D2] tracking-tight">{st.value}</div>
                <div className="text-[11px] text-slate-500 font-supporting mt-0.5">{st.label}</div>
              </div>
            ))}
          </div>
        );
      }

      case 'feature_list': {
        const items = Array.isArray(props.items) ? props.items : [];
        return (
          <ul className="space-y-2.5">
            {items.map((txt: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-[#1976D2] shrink-0 mt-0.5" />
                <span>{txt}</span>
              </li>
            ))}
          </ul>
        );
      }

      case 'faq_list': {
        const items = Array.isArray(props.items) ? props.items : [];
        return (
          <div className="space-y-2.5 w-full">
            {items.map((qa: any, idx: number) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={qa.id || idx} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFaqIdx(isOpen ? null : idx);
                    }}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs font-bold text-slate-900 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>{qa.question}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#1976D2]' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3 text-xs text-slate-600 leading-relaxed font-supporting border-t border-slate-100 pt-2">
                      {qa.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }

      case 'testimonial_list':
        return (
          <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-3">
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-supporting italic">
              "{props.quote || ''}"
            </p>
            <div className="pt-2 border-t border-slate-200/70">
              <div className="text-xs font-bold text-slate-900">{props.name || ''}</div>
              <div className="text-[11px] text-slate-500">{props.role || ''}</div>
            </div>
          </div>
        );

      case 'product_grid': {
        const limit = Number(props.max_items || 2);
        const list = catalogProducts.slice(0, limit);
        const cols = Number(props.columns || 2);
        const gridCls = getResponsiveGridClass(viewport, {
          desktop: { columns: cols },
          tablet: { columns: Math.min(cols, 2) },
          mobile: { columns: 1 },
        });
        return (
          <div className={`grid gap-4 w-full ${gridCls}`}>
            {list.map((prod) => (
              <ProductCard key={prod.id} product={prod} showPrice={Boolean(props.show_price)} />
            ))}
          </div>
        );
      }

      case 'safe_embed':
        return <SafeHtmlBlock html={props.html || ''} />;

      default:
        return null;
    }
  };

  if (!isBuilder) {
    return (
      <div className={`flex flex-col ${alignClass} ${block.advanced?.css_class || ''}`} id={block.advanced?.element_id || undefined}>
        {renderContent()}
      </div>
    );
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        editor?.onSelectBlock(editor.sectionId, block.id);
      }}
      className={`group/block relative rounded-xl transition-all ${
        !block.visible ? 'opacity-45' : ''
      } ${
        isDragging ? 'opacity-40 z-30' : ''
      } ${
        isSelected
          ? 'ring-2 ring-[#1976D2] ring-offset-2 bg-[#D1E4F6]/10'
          : 'hover:ring-1 hover:ring-[#B2D1F0]'
      }`}
    >
      {/* Compact Block Hover Toolbar */}
      <div
        className={`absolute -top-3 right-2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-[#0F172A] text-white text-[10px] shadow-md transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {!block.locked && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-0.5 hover:text-[#B2D1F0] cursor-grab active:cursor-grabbing"
            title="Geser Blok"
          >
            <GripVertical className="w-3 h-3" />
          </button>
        )}
        <span className="px-1 font-semibold truncate max-w-[90px]">{block.label}</span>
        {block.locked && <Lock className="w-2.5 h-2.5 text-amber-300" />}
        <button
          type="button"
          onClick={() => editor?.onToggleBlockVisible(editor.sectionId, block.id)}
          className="p-0.5 hover:text-[#B2D1F0]"
          title={block.visible ? 'Sembunyikan' : 'Tampilkan'}
        >
          <EyeOff className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => editor?.onDuplicateBlock(editor.sectionId, block.id)}
          className="p-0.5 hover:text-[#B2D1F0]"
          title="Duplikat Blok"
        >
          <Copy className="w-3 h-3" />
        </button>
        {!block.locked && (
          <button
            type="button"
            onClick={() => editor?.onDeleteBlock(editor.sectionId, block.id)}
            className="p-0.5 hover:text-rose-400"
            title="Hapus Blok"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className={`flex flex-col ${alignClass} p-1`}>{renderContent()}</div>
    </div>
  );
};
