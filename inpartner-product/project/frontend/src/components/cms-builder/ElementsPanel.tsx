import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Globe, PanelBottom, Plus, Search, GripVertical } from 'lucide-react';
import {
  BLOCK_REGISTRY,
  ELEMENT_CATEGORIES,
  SECTION_REGISTRY,
} from '@/services/cms/componentRegistry';
import { getCmsIcon } from '@/components/cms-renderer/cmsIcons';
import type { BlockType, SectionType } from '@/types/cms/builder';

interface ElementsPanelProps {
  onAddSection: (type: SectionType) => void;
  onAddBlock: (type: BlockType) => void;
  onSelectGlobal: (target: 'header' | 'footer') => void;
}

const DraggablePaletteCard: React.FC<{
  id: string;
  dragData: Record<string, any>;
  title: string;
  description: string;
  iconName: string;
  badge?: string;
  onClickAdd: () => void;
}> = ({ id, dragData, title, description, iconName, badge, onClickAdd }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: dragData,
  });

  const Icon = getCmsIcon(iconName);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#B2D1F0] hover:bg-[#F0F6FC]/40 transition-all cursor-grab active:cursor-grabbing flex items-start gap-2.5 ${
        isDragging ? 'opacity-40 ring-2 ring-[#1976D2]' : ''
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-[#D1E4F6]/60 text-[#1976D2] border border-[#B2D1F0]/70 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-bold text-slate-900 truncate">{title}</span>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClickAdd();
          }}
          className="p-1 rounded-lg bg-slate-100 hover:bg-[#1976D2] text-slate-600 hover:text-white transition-colors"
          title="Klik untuk langsung tambahkan"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-400" />
      </div>
    </div>
  );
};

export const ElementsPanel: React.FC<ElementsPanelProps> = ({
  onAddSection,
  onAddBlock,
  onSelectGlobal,
}) => {
  const [search, setSearch] = useState('');

  const sectionsList = useMemo(() => Object.values(SECTION_REGISTRY), []);
  const blocksList = useMemo(() => Object.values(BLOCK_REGISTRY), []);
  const q = search.trim().toLowerCase();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari section atau komponen..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-[#F8FAFC] text-xs focus:outline-none focus:bg-white focus:border-[#1976D2]"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Seret komponen ke canvas atau klik tombol <strong>+</strong> untuk menambahkan.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {ELEMENT_CATEGORIES.map((cat) => {
          if (cat.id === 'basic_blocks') {
            const matchedBlocks = blocksList.filter(
              (b) =>
                !q ||
                b.displayName.toLowerCase().includes(q) ||
                b.description.toLowerCase().includes(q)
            );
            if (matchedBlocks.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                  {cat.label}
                </h4>
                <div className="space-y-1.5">
                  {matchedBlocks.map((blk) => (
                    <DraggablePaletteCard
                      key={blk.type}
                      id={`palette-block:${blk.type}`}
                      dragData={{ kind: 'palette-block', blockType: blk.type }}
                      title={blk.displayName}
                      description={blk.description}
                      iconName={blk.icon}
                      badge="Blok"
                      onClickAdd={() => onAddBlock(blk.type)}
                    />
                  ))}
                </div>
              </div>
            );
          }

          const matchedSections = sectionsList.filter(
            (s) =>
              s.category === cat.id &&
              (!q ||
                s.displayName.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q))
          );
          if (matchedSections.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                {cat.label}
              </h4>
              <div className="space-y-1.5">
                {matchedSections.map((sec) => (
                  <DraggablePaletteCard
                    key={sec.type}
                    id={`palette-section:${sec.type}`}
                    dragData={{ kind: 'palette-section', sectionType: sec.type }}
                    title={sec.displayName}
                    description={sec.description}
                    iconName={sec.icon}
                    onClickAdd={() => onAddSection(sec.type)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Global Elements Quick Links */}
        {(!q || 'header navbar footer global'.includes(q)) && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
              Komponen Global Website
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectGlobal('header')}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#B2D1F0] hover:bg-[#F0F6FC] text-left space-y-1 transition-colors"
              >
                <Globe className="w-4 h-4 text-[#1976D2]" />
                <div className="text-[11px] font-bold text-slate-800">Header & Nav</div>
              </button>
              <button
                type="button"
                onClick={() => onSelectGlobal('footer')}
                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#B2D1F0] hover:bg-[#F0F6FC] text-left space-y-1 transition-colors"
              >
                <PanelBottom className="w-4 h-4 text-[#1976D2]" />
                <div className="text-[11px] font-bold text-slate-800">Footer Global</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

