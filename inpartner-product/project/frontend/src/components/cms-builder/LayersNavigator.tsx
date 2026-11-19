import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Globe,
  GripVertical,
  Layout,
  Lock,
  PanelBottom,
  Trash2,
  Unlock,
} from 'lucide-react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BLOCK_REGISTRY, SECTION_REGISTRY } from '@/services/cms/componentRegistry';
import { getCmsIcon } from '@/components/cms-renderer/cmsIcons';
import type { CmsBlockNode, CmsPageTree, CmsSectionNode, SelectionTarget } from '@/types/cms/builder';

interface LayersNavigatorProps {
  tree: CmsPageTree;
  selection: SelectionTarget | null;
  onSelect: (target: SelectionTarget) => void;
  onRenameSection: (sectionId: string, label: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onToggleSectionVisible: (sectionId: string) => void;
  onToggleSectionLock: (sectionId: string) => void;
  onDuplicateBlock: (sectionId: string, blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onToggleBlockVisible: (sectionId: string, blockId: string) => void;
  onToggleBlockLock: (sectionId: string, blockId: string) => void;
}

const getBuiltInSubParts = (sec: CmsSectionNode): { id: string; label: string }[] => {
  switch (sec.type) {
    case 'hero':
      return [
        { id: 'badge', label: 'Badge / Eyebrow' },
        { id: 'heading', label: 'Heading Utama' },
        { id: 'subtitle', label: 'Deskripsi Subjudul' },
        { id: 'cta_primary', label: 'Primary CTA' },
        { id: 'cta_secondary', label: 'Secondary CTA' },
        ...(sec.settings?.layout === 'split' ? [{ id: 'image', label: 'Hero Image' }] : []),
      ];
    case 'about':
      return [
        { id: 'heading', label: 'Judul About' },
        { id: 'image', label: 'Visual / Editorial Card' },
      ];
    case 'split_content':
      return [
        { id: 'heading', label: 'Judul Split' },
        { id: 'image', label: 'Gambar Split' },
      ];
    default:
      return [];
  }
};

const LayerSectionRow: React.FC<{
  sec: CmsSectionNode;
  selection: SelectionTarget | null;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: (target: SelectionTarget) => void;
  onRename: (label: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  onToggleLock: () => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onToggleBlockVisible: (blockId: string) => void;
  onToggleBlockLock: (blockId: string) => void;
}> = ({
  sec,
  selection,
  expanded,
  onToggleExpand,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
  onToggleVisible,
  onToggleLock,
  onDuplicateBlock,
  onDeleteBlock,
  onToggleBlockVisible,
  onToggleBlockLock,
}) => {
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(sec.label);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `layer-section:${sec.id}`,
    data: { kind: 'layer-section', sectionId: sec.id },
    disabled: Boolean(sec.locked),
  });

  const isSelected = selection?.scope === 'section' && selection.sectionId === sec.id && !selection.subPart;
  const subParts = getBuiltInSubParts(sec);
  const childBlocks = sec.children || [];
  const hasChildren = subParts.length > 0 || childBlocks.length > 0;
  const def = SECTION_REGISTRY[sec.type];
  const Icon = getCmsIcon(def?.icon, Layout);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const commitRename = () => {
    setRenaming(false);
    const trimmed = draftLabel.trim();
    if (trimmed && trimmed !== sec.label) {
      onRename(trimmed);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : ''}>
      <div
        onClick={() => onSelect({ scope: 'section', sectionId: sec.id })}
        className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
          isSelected
            ? 'bg-[#D1E4F6]/70 text-[#0C3B69] font-bold'
            : 'hover:bg-slate-100 text-slate-700 font-medium'
        } ${!sec.visible ? 'opacity-50' : ''}`}
      >
        {!sec.locked ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
            title="Seret urutan section"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-0.5 rounded hover:bg-white text-slate-400 shrink-0"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#1976D2]' : 'text-slate-400'}`} />

        {renaming ? (
          <input
            type="text"
            autoFocus
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraftLabel(sec.label);
                setRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 px-1.5 py-0.5 rounded border border-[#1976D2] bg-white text-[11px] text-slate-900 focus:outline-none"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              setDraftLabel(sec.label);
              setRenaming(true);
            }}
            className="flex-1 truncate text-[11px]"
          >
            {sec.label}
          </span>
        )}

        {/* Quick hover/active actions */}
        <div
          className={`flex items-center gap-0.5 shrink-0 ${
            isSelected || sec.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setDraftLabel(sec.label);
              setRenaming(true);
            }}
            className="p-0.5 rounded hover:bg-white text-slate-400 hover:text-slate-700"
            title="Ubah Nama"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onToggleLock}
            className={`p-0.5 rounded hover:bg-white ${sec.locked ? 'text-amber-600' : 'text-slate-400 hover:text-slate-700'}`}
            title={sec.locked ? 'Buka Kunci' : 'Kunci Elemen'}
          >
            {sec.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={onToggleVisible}
            className="p-0.5 rounded hover:bg-white text-slate-400 hover:text-slate-700"
            title={sec.visible ? 'Sembunyikan' : 'Tampilkan'}
          >
            {sec.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="p-0.5 rounded hover:bg-white text-slate-400 hover:text-slate-700"
            title="Duplikat"
          >
            <Copy className="w-3 h-3" />
          </button>
          {!sec.locked && (
            <button
              type="button"
              onClick={onDelete}
              className="p-0.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
              title="Hapus"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Sub-elements & Child Blocks */}
      {expanded && hasChildren && (
        <div className="ml-6 pl-2.5 border-l border-slate-200 space-y-0.5 my-0.5">
          {subParts.map((sp) => {
            const subSel =
              selection?.scope === 'section' &&
              selection.sectionId === sec.id &&
              selection.subPart === sp.id;
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => onSelect({ scope: 'section', sectionId: sec.id, subPart: sp.id })}
                className={`w-full text-left px-2 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1.5 ${
                  subSel
                    ? 'bg-[#D1E4F6]/60 text-[#0C3B69] font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1976D2]/60 shrink-0" />
                <span className="truncate">{sp.label}</span>
              </button>
            );
          })}

          {childBlocks.map((blk: CmsBlockNode) => {
            const blkSel =
              selection?.scope === 'block' &&
              selection.sectionId === sec.id &&
              selection.blockId === blk.id;
            const BlkIcon = getCmsIcon(BLOCK_REGISTRY[blk.type]?.icon);
            return (
              <div
                key={blk.id}
                onClick={() => onSelect({ scope: 'block', sectionId: sec.id, blockId: blk.id })}
                className={`group/blk flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] cursor-pointer transition-colors ${
                  blkSel
                    ? 'bg-[#D1E4F6]/70 text-[#0C3B69] font-bold'
                    : 'text-slate-600 hover:bg-slate-100'
                } ${!blk.visible ? 'opacity-50' : ''}`}
              >
                <BlkIcon className="w-3 h-3 text-[#1976D2] shrink-0" />
                <span className="flex-1 truncate">{blk.label}</span>
                <div
                  className="flex items-center gap-0.5 opacity-0 group-hover/blk:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onToggleBlockLock(blk.id)}
                    className="p-0.5 text-slate-400 hover:text-slate-700"
                    title={blk.locked ? 'Buka Kunci' : 'Kunci'}
                  >
                    {blk.locked ? <Lock className="w-2.5 h-2.5 text-amber-600" /> : <Unlock className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleBlockVisible(blk.id)}
                    className="p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    {blk.visible ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateBlock(blk.id)}
                    className="p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                  {!blk.locked && (
                    <button
                      type="button"
                      onClick={() => onDeleteBlock(blk.id)}
                      className="p-0.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const LayersNavigator: React.FC<LayersNavigatorProps> = ({
  tree,
  selection,
  onSelect,
  onRenameSection,
  onDuplicateSection,
  onDeleteSection,
  onToggleSectionVisible,
  onToggleSectionLock,
  onDuplicateBlock,
  onDeleteBlock,
  onToggleBlockVisible,
  onToggleBlockLock,
}) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({
    header: false,
    main: true,
    footer: false,
  });

  const toggleExpand = (id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const layerIds = tree.sections.map((s) => `layer-section:${s.id}`);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700">Hierarki Halaman (Navigator)</span>
        <span className="text-[10px] text-slate-400">{tree.sections.length} section</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {/* Header Global Node */}
        <div className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-1">
          <div
            onClick={() => onSelect({ scope: 'header' })}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
              selection?.scope === 'header'
                ? 'bg-[#D1E4F6]/80 text-[#0C3B69] font-bold'
                : 'text-slate-700 hover:bg-white font-semibold'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand('header');
              }}
              className="p-0.5 text-slate-400"
            >
              {expandedMap.header ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            <Globe className="w-3.5 h-3.5 text-[#1976D2]" />
            <span className="flex-1 truncate text-[11px]">Header & Navigation</span>
          </div>

          {expandedMap.header && (
            <div className="ml-6 pl-2.5 border-l border-slate-200 space-y-0.5 py-1 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => onSelect({ scope: 'header', subPart: 'brand' })}
                className="w-full text-left px-2 py-1 rounded hover:bg-white hover:text-slate-900"
              >
                Logo & Brand Wordmark
              </button>
              <button
                type="button"
                onClick={() => onSelect({ scope: 'header', subPart: 'menu' })}
                className="w-full text-left px-2 py-1 rounded hover:bg-white hover:text-slate-900"
              >
                Navigation Menu ({tree.header.nav_items?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => onSelect({ scope: 'header', subPart: 'actions' })}
                className="w-full text-left px-2 py-1 rounded hover:bg-white hover:text-slate-900"
              >
                Search & Action Buttons
              </button>
            </div>
          )}
        </div>

        {/* Main Content Tree */}
        <div className="space-y-1">
          <div className="px-2 py-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Main Content
            </span>
            <span className="text-[10px] text-slate-400">Seret untuk urutkan</span>
          </div>

          <SortableContext items={layerIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {tree.sections.map((sec) => (
                <LayerSectionRow
                  key={sec.id}
                  sec={sec}
                  selection={selection}
                  expanded={Boolean(expandedMap[sec.id])}
                  onToggleExpand={() => toggleExpand(sec.id)}
                  onSelect={onSelect}
                  onRename={(label) => onRenameSection(sec.id, label)}
                  onDuplicate={() => onDuplicateSection(sec.id)}
                  onDelete={() => onDeleteSection(sec.id)}
                  onToggleVisible={() => onToggleSectionVisible(sec.id)}
                  onToggleLock={() => onToggleSectionLock(sec.id)}
                  onDuplicateBlock={(blkId) => onDuplicateBlock(sec.id, blkId)}
                  onDeleteBlock={(blkId) => onDeleteBlock(sec.id, blkId)}
                  onToggleBlockVisible={(blkId) => onToggleBlockVisible(sec.id, blkId)}
                  onToggleBlockLock={(blkId) => onToggleBlockLock(sec.id, blkId)}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        {/* Footer Global Node */}
        <div className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-1">
          <div
            onClick={() => onSelect({ scope: 'footer' })}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer ${
              selection?.scope === 'footer'
                ? 'bg-[#D1E4F6]/80 text-[#0C3B69] font-bold'
                : 'text-slate-700 hover:bg-white font-semibold'
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand('footer');
              }}
              className="p-0.5 text-slate-400"
            >
              {expandedMap.footer ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            <PanelBottom className="w-3.5 h-3.5 text-[#1976D2]" />
            <span className="flex-1 truncate text-[11px]">Footer Global</span>
          </div>

          {expandedMap.footer && (
            <div className="ml-6 pl-2.5 border-l border-slate-200 space-y-0.5 py-1 text-[11px] text-slate-500">
              <button
                type="button"
                onClick={() => onSelect({ scope: 'footer', subPart: 'brand' })}
                className="w-full text-left px-2 py-1 rounded hover:bg-white hover:text-slate-900"
              >
                Brand Information
              </button>
              <button
                type="button"
                onClick={() => onSelect({ scope: 'footer', subPart: 'links' })}
                className="w-full text-left px-2 py-1 rounded hover:bg-white hover:text-slate-900"
              >
                Link Columns ({tree.footer.link_groups?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => onSelect({ scope: 'footer', subPart: 'contact' })}
                className="w-full text-left px-2 py-1 rounded hover:bg-white hover:text-slate-900"
              >
                Contact & Socials
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

