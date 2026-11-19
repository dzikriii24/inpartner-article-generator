import React, { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, LayoutGrid } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { CmsViewportProvider } from '@/components/cms-renderer/CmsViewportContext';
import { HomepageSectionRenderer } from '@/components/cms-renderer/HomepageSectionRenderer';
import { buildThemeCssVars } from '@/context/SiteConfigContext';
import type {
  CmsPageTree,
  CmsSectionNode,
  SelectionTarget,
  ViewportMode,
} from '@/types/cms/builder';

interface VisualCanvasProps {
  tree: CmsPageTree;
  catalog: {
    featured: any[];
    latest: any[];
    popular: any[];
    categories: any[];
    banners: any[];
  };
  viewport: ViewportMode;
  zoom: number | 'fit';
  showGuides: boolean;
  previewMode: boolean;
  selection: SelectionTarget | null;
  onSelect: (target: SelectionTarget) => void;
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

const SectionSlotDropZone: React.FC<{ index: number; isBuilder: boolean }> = ({
  index,
  isBuilder,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `canvas-slot:${index}`,
    data: { kind: 'canvas-slot', index },
    disabled: !isBuilder,
  });

  if (!isBuilder) return null;

  return (
    <div
      ref={setNodeRef}
      className={`transition-all rounded-xl flex items-center justify-center ${
        isOver
          ? 'h-12 border-2 border-dashed border-[#1976D2] bg-[#D1E4F6]/40 text-[#0C3B69] text-xs font-bold my-2'
          : 'h-3'
      }`}
    >
      {isOver && <span>Lepaskan di sini untuk menyisipkan section</span>}
    </div>
  );
};

export const VisualCanvas: React.FC<VisualCanvasProps> = ({
  tree,
  catalog,
  viewport,
  zoom,
  showGuides,
  previewMode,
  selection,
  onSelect,
  onMoveSection,
  onDuplicateSection,
  onToggleSectionVisible,
  onDeleteSection,
  onAddSectionAt,
  onSaveAsTemplate,
  onInlineUpdateSection,
  onDuplicateBlock,
  onDeleteBlock,
  onToggleBlockVisible,
  onInlineUpdateBlock,
  onResetSectionFallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1100);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll selected section into view when chosen from Layers Navigator
  useEffect(() => {
    if (!selection || !('sectionId' in selection)) return;
    const node = containerRef.current?.querySelector(`[data-cms-section-id="${selection.sectionId}"]`);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selection]);

  const targetFrameWidth = viewport === 'mobile' ? 390 : viewport === 'tablet' ? 768 : 1280;
  const availableWidth = Math.max(320, containerWidth - 48);
  const scale =
    zoom === 'fit'
      ? Math.min(1, Number((availableWidth / targetFrameWidth).toFixed(3)))
      : zoom;

  const isBuilder = !previewMode;
  const sectionIds = tree.sections.map((s) => `section:${s.id}`);
  const themeVars = buildThemeCssVars(tree.theme);

  const spacingCls =
    tree.theme?.layout?.section_spacing === 'compact'
      ? 'space-y-10'
      : tree.theme?.layout?.section_spacing === 'spacious'
      ? 'space-y-20'
      : 'space-y-14';

  const containerMaxCls = tree.theme?.layout?.container_width || 'max-w-7xl';

  return (
    <div
      ref={containerRef}
      onClick={() => {
        if (isBuilder) onSelect({ scope: 'theme' });
      }}
      className="flex-1 min-w-0 overflow-auto bg-[#F1F5F9] p-4 sm:p-6 flex flex-col items-center relative"
    >
      {/* Subtle Viewport Pill */}
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
        <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">
          {viewport === 'desktop' ? 'Desktop (1280px)' : viewport === 'tablet' ? 'Tablet (768px)' : 'Mobile (390px)'}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-400">
          Skala {Math.round(scale * 100)}%
        </span>
        {previewMode && (
          <span className="px-2.5 py-0.5 rounded-full bg-[#0F172A] text-white font-bold">
            Mode Pratinjau Aktif
          </span>
        )}
      </div>

      {/* Responsive Frame Wrapper with Scale */}
      <div
        style={{
          width: `${targetFrameWidth * scale}px`,
          minHeight: '720px',
        }}
        className="transition-all duration-200 relative shrink-0"
      >
        <div
          style={{
            width: `${targetFrameWidth}px`,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'top left',
            backgroundColor: tree.theme?.colors?.canvas || '#F8FAFC',
            color: tree.theme?.colors?.text_body || '#334155',
            ...themeVars,
          }}
          className={`rounded-2xl border border-slate-300/80 shadow-xl overflow-hidden flex flex-col min-h-[780px] relative ${
            showGuides ? 'bg-[linear-gradient(to_right,rgba(25,118,210,0.04)_1px,transparent_1px)] bg-[size:8.3333%_100%]' : ''
          }`}
        >
          <CmsViewportProvider viewport={viewport}>
            {/* Real Header / Navbar */}
            <div className="pt-4">
              <Navbar
                overrideHeader={tree.header}
                builderMode={isBuilder}
                builderSelected={selection?.scope === 'header'}
                onBuilderSelect={() => onSelect({ scope: 'header' })}
              />
            </div>

            {/* Main Sections Area */}
            <main className={`flex-1 ${containerMaxCls} w-full mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
              {tree.sections.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center">
                    <LayoutGrid className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Canvas Homepage Kosong</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Tambahkan section dari panel kiri atau sisipkan template untuk memulai.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSectionAt(0);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1976D2] text-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" /> Tambah Hero Section
                  </button>
                </div>
              ) : (
                <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                  <div className={spacingCls}>
                    <SectionSlotDropZone index={0} isBuilder={isBuilder} />
                    {tree.sections.map((sec, idx) => (
                      <React.Fragment key={sec.id}>
                        <HomepageSectionRenderer
                          section={sec}
                          catalog={catalog}
                          editor={{
                            isBuilder: true,
                            isPreviewOnly: previewMode,
                            selection,
                            sectionIndex: idx,
                            totalSections: tree.sections.length,
                            onSelectSection: (sectionId, subPart) =>
                              onSelect({ scope: 'section', sectionId, subPart }),
                            onSelectBlock: (sectionId, blockId) =>
                              onSelect({ scope: 'block', sectionId, blockId }),
                            onMoveSection,
                            onDuplicateSection,
                            onToggleSectionVisible,
                            onDeleteSection,
                            onAddSectionAt,
                            onSaveAsTemplate,
                            onInlineUpdateSection,
                            onDuplicateBlock,
                            onDeleteBlock,
                            onToggleBlockVisible,
                            onInlineUpdateBlock,
                            onResetSectionFallback,
                          }}
                        />
                        <SectionSlotDropZone index={idx + 1} isBuilder={isBuilder} />
                      </React.Fragment>
                    ))}
                  </div>
                </SortableContext>
              )}
            </main>

            {/* Real Footer */}
            <Footer
              overrideFooter={tree.footer}
              builderMode={isBuilder}
              builderSelected={selection?.scope === 'footer'}
              onBuilderSelect={() => onSelect({ scope: 'footer' })}
            />
          </CmsViewportProvider>
        </div>
      </div>
    </div>
  );
};

