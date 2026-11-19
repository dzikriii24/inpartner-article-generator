import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutGrid,
  Plus,
  RefreshCw,
  RotateCcw,
  Sliders,
  X,
} from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import { useCmsBuilder } from '@/hooks/cms/useCmsBuilder';
import {
  BLOCK_REGISTRY,
  SECTION_REGISTRY,
} from '@/services/cms/componentRegistry';
import { getCmsIcon } from '@/components/cms-renderer/cmsIcons';
import { BuilderToolbar } from './BuilderToolbar';
import { ElementsPanel } from './ElementsPanel';
import { LayersNavigator } from './LayersNavigator';
import { TemplateLibrary } from './TemplateLibrary';
import { VisualCanvas } from './VisualCanvas';
import { PropertiesInspector } from './PropertiesInspector';
import { MediaLibraryModal } from './MediaLibraryModal';
import { RevisionHistoryDrawer } from './RevisionHistoryDrawer';
import { PublishModal } from './PublishModal';
import { ConfirmModal } from './ConfirmModal';
import type {
  BlockType,
  CmsRevisionItem,
  CmsSectionNode,
  SectionType,
  ViewportMode,
} from '@/types/cms/builder';

interface HomepageVisualBuilderProps {
  onToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const HomepageVisualBuilder: React.FC<HomepageVisualBuilderProps> = ({ onToast }) => {
  const { featured, latest, popular, categories, banners, fetchHome } = useCatalog();

  const builder = useCmsBuilder(onToast);

  // Studio Workspace UI States
  const [leftTab, setLeftTab] = useState<'elements' | 'layers' | 'templates'>('elements');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [showGuides, setShowGuides] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Modals & Drawers
  const [historyOpen, setHistoryOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [mediaPickerCallback, setMediaPickerCallback] = useState<
    ((url: string, alt?: string) => void) | null
  >(null);
  const [insertAtModalIndex, setInsertAtModalIndex] = useState<number | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'published' | 'factory'>('factory');

  const [confirmState, setConfirmState] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const [activeDragInfo, setActiveDragInfo] = useState<{
    label: string;
    kind: string;
  } | null>(null);

  // Fetch public catalog items for live canvas rendering
  useEffect(() => {
    fetchHome();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        builder.saveDraftNow();
        return;
      }

      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          builder.redo();
        } else {
          builder.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        builder.redo();
      } else if (e.key === 'Escape' && previewMode) {
        setPreviewMode(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [builder.undo, builder.redo, builder.saveDraftNow, previewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current || {};
    if (data.kind === 'palette-section') {
      const def = SECTION_REGISTRY[data.sectionType as SectionType];
      setActiveDragInfo({ label: def?.displayName || 'Section', kind: 'palette' });
    } else if (data.kind === 'palette-block') {
      const def = BLOCK_REGISTRY[data.blockType as BlockType];
      setActiveDragInfo({ label: def?.displayName || 'Blok', kind: 'palette' });
    } else if (data.kind === 'section' || data.kind === 'layer-section') {
      const sec = builder.tree.sections.find((s) => s.id === data.sectionId);
      setActiveDragInfo({ label: sec?.label || 'Section', kind: 'section' });
    } else if (data.kind === 'block') {
      const sec = builder.tree.sections.find((s) => s.id === data.sectionId);
      const blk = sec?.children?.find((b) => b.id === data.blockId);
      setActiveDragInfo({ label: blk?.label || 'Blok', kind: 'block' });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragInfo(null);
    const { active, over } = event;
    if (!over) return;

    const aData = active.data.current || {};
    const oData = over.data.current || {};

    // 1. Adding a section from Left Sidebar palette
    if (aData.kind === 'palette-section') {
      const type = aData.sectionType as SectionType;
      if (oData.kind === 'canvas-slot') {
        builder.addSection(type, oData.index);
      } else if (oData.sectionId) {
        const idx = builder.tree.sections.findIndex((s) => s.id === oData.sectionId);
        builder.addSection(type, idx >= 0 ? idx + 1 : undefined);
      } else {
        builder.addSection(type);
      }
      return;
    }

    // 2. Adding a child block from Left Sidebar palette
    if (aData.kind === 'palette-block') {
      const bType = aData.blockType as BlockType;
      if (oData.sectionId) {
        builder.addBlockToSection(oData.sectionId, bType);
      } else if (oData.kind === 'canvas-slot') {
        const newContainer = builder.addSection('custom_layout', oData.index);
        if (newContainer) {
          builder.addBlockToSection(newContainer.id, bType);
        }
      } else {
        const selSecId =
          builder.selection && 'sectionId' in builder.selection ? builder.selection.sectionId : null;
        const targetSec =
          (selSecId ? builder.tree.sections.find((s) => s.id === selSecId) : null) ||
          builder.tree.sections[builder.tree.sections.length - 1];
        if (targetSec) {
          builder.addBlockToSection(targetSec.id, bType);
        } else {
          const c = builder.addSection('custom_layout');
          if (c) builder.addBlockToSection(c.id, bType);
        }
      }
      return;
    }

    // 3. Reordering sections (Canvas or Layers Navigator)
    if (
      (aData.kind === 'section' || aData.kind === 'layer-section') &&
      oData.sectionId
    ) {
      if (aData.sectionId !== oData.sectionId) {
        builder.reorderSectionsById(aData.sectionId, oData.sectionId);
      }
      return;
    }

    // 4. Reordering or moving child blocks across sections
    if (aData.kind === 'block' && aData.sectionId && aData.blockId) {
      const toSectionId = oData.sectionId;
      if (!toSectionId) return;
      builder.moveOrReorderBlock(
        aData.sectionId,
        aData.blockId,
        toSectionId,
        oData.kind === 'block' ? oData.blockId : undefined
      );
    }
  };

  const handleRequestDeleteSection = useCallback(
    (sectionId: string) => {
      const sec = builder.tree.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      if (sec.locked) {
        onToast('info', 'Section terkunci. Buka kunci terlebih dahulu untuk menghapus.');
        return;
      }
      setConfirmState({
        title: `Hapus Section "${sec.label}"?`,
        description:
          'Section ini beserta elemen di dalamnya akan dihapus dari draf Anda. Perubahan tidak memengaruhi halaman publik hingga Anda menekan Publish.',
        confirmLabel: 'Hapus Section',
        tone: 'danger',
        onConfirm: () => {
          builder.deleteSection(sectionId);
          setConfirmState(null);
        },
      });
    },
    [builder, onToast]
  );

  const handleRequestDeleteBlock = useCallback(
    (sectionId: string, blockId: string) => {
      const sec = builder.tree.sections.find((s) => s.id === sectionId);
      const blk = sec?.children?.find((b) => b.id === blockId);
      if (!blk) return;
      if (blk.locked) {
        onToast('info', 'Blok terkunci. Buka kunci terlebih dahulu untuk menghapus.');
        return;
      }
      setConfirmState({
        title: `Hapus Komponen "${blk.label}"?`,
        description: 'Komponen ini akan dihapus dari draf section.',
        confirmLabel: 'Hapus Komponen',
        tone: 'danger',
        onConfirm: () => {
          builder.deleteBlock(sectionId, blockId);
          setConfirmState(null);
        },
      });
    },
    [builder, onToast]
  );

  const handleRequestRestoreRevision = (rev: CmsRevisionItem) => {
    setConfirmState({
      title: `Pulihkan Revisi "${rev.label || `v${rev.version}`}"?`,
      description:
        'Draf aktif saat ini akan diganti dengan snapshot revisi ini (sistem otomatis membuat cadangan draf sebelum pemulihan).',
      confirmLabel: 'Pulihkan ke Draf',
      tone: 'warning',
      onConfirm: async () => {
        await builder.restoreRevision(rev.id);
        setConfirmState(null);
        setHistoryOpen(false);
      },
    });
  };

  const handleAddBlockQuick = (type: BlockType) => {
    const selSecId =
      builder.selection && 'sectionId' in builder.selection ? builder.selection.sectionId : null;
    const targetSection =
      (selSecId ? builder.tree.sections.find((s) => s.id === selSecId) : null) ||
      builder.tree.sections.find((s) => s.type === 'custom_layout');

    if (targetSection) {
      builder.addBlockToSection(targetSection.id, type);
      setRightCollapsed(false);
    } else {
      const created = builder.addSection('custom_layout');
      if (created) {
        builder.addBlockToSection(created.id, type);
        setRightCollapsed(false);
      }
    }
  };

  const handleInlineUpdateSection = (sectionId: string, patch: Partial<CmsSectionNode>) => {
    builder.updateSection(sectionId, (cur) => {
      if (builder.editingLocale === 'id') {
        return { ...cur, ...patch };
      }
      const loc = builder.editingLocale;
      return {
        ...cur,
        translations: {
          ...cur.translations,
          [loc]: {
            ...(cur.translations?.[loc] || {}),
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
          },
        },
      };
    });
  };

  const handleInlineUpdateBlock = (
    sectionId: string,
    blockId: string,
    patch: Record<string, any>
  ) => {
    builder.updateBlock(sectionId, blockId, (cur) => {
      if (builder.editingLocale === 'id') {
        return { ...cur, props: { ...(cur.props || {}), ...patch } };
      }
      const loc = builder.editingLocale;
      return {
        ...cur,
        translations: {
          ...cur.translations,
          [loc]: {
            ...(cur.translations?.[loc] || {}),
            ...patch,
          },
        },
      };
    });
  };

  const handleSaveSectionAsTemplateQuick = (sec: CmsSectionNode) => {
    setLeftTab('templates');
    setLeftCollapsed(false);
    builder.setSelection({ scope: 'section', sectionId: sec.id });
    onToast('info', 'Isi nama template pada panel kiri untuk menyimpannya.');
  };

  const selectedSectionId =
    builder.selection && 'sectionId' in builder.selection ? builder.selection.sectionId : null;
  const selectedSection = selectedSectionId
    ? builder.tree.sections.find((s) => s.id === selectedSectionId) || null
    : null;

  if (builder.loading) {
    return (
      <div className="h-[78vh] rounded-3xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-3 text-xs text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin text-[#1976D2]" />
        <span className="font-semibold">Memuat Visual Website Builder Inpartner...</span>
      </div>
    );
  }

  return (
    <div
      className={`${
        fullscreen
          ? 'fixed inset-0 z-50 bg-white'
          : 'h-[calc(100vh-112px)] min-h-[680px] rounded-2xl border border-slate-200 shadow-sm bg-white'
      } flex flex-col overflow-hidden`}
    >
      {/* Top Studio Toolbar */}
      <BuilderToolbar
        version={builder.pageMeta.version}
        hasUnpublishedChanges={builder.pageMeta.has_unpublished_changes}
        saveStatus={builder.saveStatus}
        lastSavedAt={builder.lastSavedAt}
        editingLocale={builder.editingLocale}
        onChangeLocale={builder.setEditingLocale}
        viewport={viewport}
        onChangeViewport={setViewport}
        zoom={zoom}
        onChangeZoom={setZoom}
        showGuides={showGuides}
        onToggleGuides={() => setShowGuides((v) => !v)}
        previewMode={previewMode}
        onTogglePreviewMode={() => setPreviewMode((v) => !v)}
        fullscreen={fullscreen}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
        canUndo={builder.canUndo}
        canRedo={builder.canRedo}
        onUndo={builder.undo}
        onRedo={builder.redo}
        onRefreshPreview={() => {
          fetchHome(true);
          onToast('info', 'Preview katalog & section disegarkan.');
        }}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenTheme={() => {
          builder.setSelection({ scope: 'theme' });
          setRightCollapsed(false);
        }}
        onSaveDraft={() => builder.saveDraftNow()}
        onOpenReset={() => setResetModalOpen(true)}
        onOpenPublish={() => setPublishOpen(true)}
      />

      {/* Local Offline Backup Recovery Banner */}
      {builder.recoveryBackup && (
        <div className="px-4 py-2 bg-[#D1E4F6]/60 border-b border-[#B2D1F0] flex items-center justify-between text-xs text-[#0C3B69]">
          <span className="font-semibold">
            Ditemukan cadangan draf lokal yang belum tersimpan ke server dari sesi sebelumnya.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={builder.dismissLocalRecovery}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold"
            >
              Abaikan
            </button>
            <button
              type="button"
              onClick={builder.restoreLocalRecovery}
              className="px-3 py-1 rounded-lg bg-[#1976D2] text-white font-bold"
            >
              Pulihkan Draf Lokal
            </button>
          </div>
        </div>
      )}

      {/* Main 3-Pane Workspace */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex min-h-0 min-w-0 relative overflow-hidden">
          {/* LEFT SIDEBAR: Elements | Layers | Templates */}
          {!previewMode && (
            <aside
              className={`border-r border-slate-200 bg-white flex flex-col shrink-0 transition-all duration-200 ${
                leftCollapsed ? 'w-11' : 'w-72 xl:w-80'
              }`}
            >
              {leftCollapsed ? (
                <div className="flex flex-col items-center py-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setLeftCollapsed(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    title="Buka Panel Kiri"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLeftTab('elements');
                      setLeftCollapsed(false);
                    }}
                    className={`p-2 rounded-lg ${leftTab === 'elements' ? 'bg-[#D1E4F6] text-[#1976D2]' : 'text-slate-400 hover:text-slate-700'}`}
                    title="Elements"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLeftTab('layers');
                      setLeftCollapsed(false);
                    }}
                    className={`p-2 rounded-lg ${leftTab === 'layers' ? 'bg-[#D1E4F6] text-[#1976D2]' : 'text-slate-400 hover:text-slate-700'}`}
                    title="Layers / Navigator"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLeftTab('templates');
                      setLeftCollapsed(false);
                    }}
                    className={`p-2 rounded-lg ${leftTab === 'templates' ? 'bg-[#D1E4F6] text-[#1976D2]' : 'text-slate-400 hover:text-slate-700'}`}
                    title="Templates"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-2.5 py-2 border-b border-slate-200 flex items-center justify-between gap-1 bg-[#F8FAFC]">
                    <div className="flex-1 grid grid-cols-3 gap-1 bg-slate-200/70 p-0.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setLeftTab('elements')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                          leftTab === 'elements' ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        <LayoutGrid className="w-3 h-3" /> Elemen
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftTab('layers')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                          leftTab === 'layers' ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        <Layers className="w-3 h-3" /> Layer
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeftTab('templates')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors ${
                          leftTab === 'templates' ? 'bg-white text-[#1976D2] shadow-2xs' : 'text-slate-600'
                        }`}
                      >
                        <Bookmark className="w-3 h-3" /> Templat
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeftCollapsed(true)}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                      title="Ciutkan Panel Kiri"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-h-0">
                    {leftTab === 'elements' && (
                      <ElementsPanel
                        onAddSection={(t) => {
                          builder.addSection(t);
                          setRightCollapsed(false);
                        }}
                        onAddBlock={handleAddBlockQuick}
                        onSelectGlobal={(scope) => {
                          builder.setSelection({ scope });
                          setRightCollapsed(false);
                        }}
                      />
                    )}
                    {leftTab === 'layers' && (
                      <LayersNavigator
                        tree={builder.displayTree}
                        selection={builder.selection}
                        onSelect={(target) => {
                          builder.setSelection(target);
                          setRightCollapsed(false);
                        }}
                        onRenameSection={(id, label) =>
                          builder.updateSection(id, (s) => ({ ...s, label }))
                        }
                        onDuplicateSection={builder.duplicateSection}
                        onDeleteSection={handleRequestDeleteSection}
                        onToggleSectionVisible={builder.toggleSectionVisibility}
                        onToggleSectionLock={builder.toggleSectionLock}
                        onDuplicateBlock={builder.duplicateBlock}
                        onDeleteBlock={handleRequestDeleteBlock}
                        onToggleBlockVisible={builder.toggleBlockVisibility}
                        onToggleBlockLock={builder.toggleBlockLock}
                      />
                    )}
                    {leftTab === 'templates' && (
                      <TemplateLibrary
                        templates={builder.templates}
                        selectedSection={selectedSection}
                        onInsertTemplate={(tpl) => {
                          builder.insertTemplate(tpl);
                          setRightCollapsed(false);
                        }}
                        onSaveSectionAsTemplate={builder.saveSectionAsTemplate}
                        onDeleteTemplate={builder.deleteTemplate}
                      />
                    )}
                  </div>
                </>
              )}
            </aside>
          )}

          {/* CENTER CANVAS: Live Visual Preview */}
          <VisualCanvas
            tree={builder.displayTree}
            catalog={{ featured, latest, popular, categories, banners }}
            viewport={viewport}
            zoom={zoom}
            showGuides={showGuides}
            previewMode={previewMode}
            selection={builder.selection}
            onSelect={(target) => {
              builder.setSelection(target);
              if (!previewMode) setRightCollapsed(false);
            }}
            onMoveSection={builder.moveSection}
            onDuplicateSection={builder.duplicateSection}
            onToggleSectionVisible={builder.toggleSectionVisibility}
            onDeleteSection={handleRequestDeleteSection}
            onAddSectionAt={(idx) => setInsertAtModalIndex(idx)}
            onSaveAsTemplate={handleSaveSectionAsTemplateQuick}
            onInlineUpdateSection={handleInlineUpdateSection}
            onDuplicateBlock={builder.duplicateBlock}
            onDeleteBlock={handleRequestDeleteBlock}
            onToggleBlockVisible={builder.toggleBlockVisibility}
            onInlineUpdateBlock={handleInlineUpdateBlock}
            onResetSectionFallback={(secId) => {
              const sec = builder.tree.sections.find((s) => s.id === secId);
              if (sec && SECTION_REGISTRY[sec.type]) {
                const fresh = SECTION_REGISTRY[sec.type].createDefault();
                builder.updateSection(secId, () => ({ ...fresh, id: sec.id, key: sec.key }));
              }
            }}
          />

          {/* RIGHT SIDEBAR: Properties & Settings Inspector */}
          {!previewMode && (
            <aside
              className={`border-l border-slate-200 bg-white flex flex-col shrink-0 transition-all duration-200 ${
                rightCollapsed ? 'w-11' : 'w-80 xl:w-[340px]'
              }`}
            >
              {rightCollapsed ? (
                <div className="flex flex-col items-center py-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRightCollapsed(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    title="Buka Properties Inspector"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightCollapsed(false)}
                    className="p-2 rounded-lg bg-[#D1E4F6] text-[#1976D2]"
                    title="Inspector"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative flex-1 flex flex-col min-h-0">
                  <button
                    type="button"
                    onClick={() => setRightCollapsed(true)}
                    className="absolute top-3 right-3 z-10 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 hidden"
                    title="Ciutkan Inspector"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <PropertiesInspector
                    tree={builder.tree}
                    selection={builder.selection}
                    editingLocale={builder.editingLocale}
                    categories={categories}
                    onSelect={builder.setSelection}
                    onUpdateSection={builder.updateSection}
                    onUpdateBlock={builder.updateBlock}
                    onUpdateHeader={builder.updateHeader}
                    onUpdateFooter={builder.updateFooter}
                    onUpdateTheme={builder.updateTheme}
                    onUpdateSeo={builder.updateSeo}
                    onOpenMediaPicker={(cb) => setMediaPickerCallback(() => cb)}
                  />
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Drag Overlay Feedback */}
        <DragOverlay>
          {activeDragInfo && (
            <div className="px-3.5 py-2 rounded-xl bg-[#1976D2] text-white text-xs font-bold shadow-xl border border-white/20 flex items-center gap-2">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{activeDragInfo.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Quick Insert Section Modal (when clicking + Before/After on Canvas) */}
      {insertAtModalIndex !== null && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pilih Section untuk Disisipkan</h3>
                <p className="text-[11px] text-slate-500">Disisipkan pada posisi #{insertAtModalIndex + 1}</p>
              </div>
              <button
                type="button"
                onClick={() => setInsertAtModalIndex(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(SECTION_REGISTRY).map((sec) => {
                const Icon = getCmsIcon(sec.icon);
                return (
                  <button
                    key={sec.type}
                    type="button"
                    onClick={() => {
                      builder.addSection(sec.type, insertAtModalIndex);
                      setInsertAtModalIndex(null);
                      setRightCollapsed(false);
                    }}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-[#1976D2] hover:bg-[#F0F6FC] text-left flex items-start gap-3 transition-all"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#D1E4F6] text-[#1976D2] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{sec.displayName}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{sec.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Options Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pulihkan Konfigurasi Draf</h3>
                  <p className="text-[11px] text-slate-500">Pilih target pemulihan draf Anda.</p>
                </div>
              </div>
              <button type="button" onClick={() => setResetModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label
                className={`block p-3 rounded-xl border cursor-pointer ${
                  resetMode === 'published' ? 'border-[#1976D2] bg-[#F0F6FC]' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === 'published'}
                    onChange={() => setResetMode('published')}
                  />
                  <span>Batalkan Perubahan & Samakan dengan Versi Live</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-5">
                  Membuang perubahan draf yang belum dipublikasikan dan kembali ke versi storefront saat ini.
                </p>
              </label>

              <label
                className={`block p-3 rounded-xl border cursor-pointer ${
                  resetMode === 'factory' ? 'border-[#1976D2] bg-[#F0F6FC]' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <input
                    type="radio"
                    name="resetMode"
                    checked={resetMode === 'factory'}
                    onChange={() => setResetMode('factory')}
                  />
                  <span>Kembalikan ke Konfigurasi Default Inpartner</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 pl-5">
                  Mengembalikan struktur 8 section standar, header, footer, dan tema asli Inpartner ke dalam draf.
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  await builder.resetDraft(resetMode);
                  setResetModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
              >
                Pulihkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={Boolean(mediaPickerCallback)}
        onClose={() => setMediaPickerCallback(null)}
        onSelect={(media) => {
          mediaPickerCallback?.(media.url, media.alt_text || undefined);
          setMediaPickerCallback(null);
        }}
        onToast={onToast}
      />

      {/* Revision History Drawer */}
      <RevisionHistoryDrawer
        isOpen={historyOpen}
        revisions={builder.revisions}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRequestRestoreRevision}
      />

      {/* Publish Validation & Confirmation Modal */}
      <PublishModal
        isOpen={publishOpen}
        tree={builder.tree}
        currentVersion={builder.pageMeta.version}
        publishing={builder.publishing}
        onClose={() => setPublishOpen(false)}
        onConfirmPublish={async (label) => {
          const ok = await builder.publishChanges(label);
          if (ok) setPublishOpen(false);
        }}
      />

      {/* Generic Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={true}
          title={confirmState.title}
          description={confirmState.description}
          confirmLabel={confirmState.confirmLabel}
          tone={confirmState.tone}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
