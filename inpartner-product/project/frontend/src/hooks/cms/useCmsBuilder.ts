import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { cmsApi } from '@/services/cms/cmsApi';
import {
  BLOCK_REGISTRY,
  SECTION_REGISTRY,
  cloneSectionWithFreshIds,
  createDefaultPageTree,
  generateCmsId,
} from '@/services/cms/componentRegistry';
import type {
  BlockType,
  CmsBlockNode,
  CmsFooterConfig,
  CmsHeaderConfig,
  CmsLocale,
  CmsPageTree,
  CmsRevisionItem,
  CmsSectionNode,
  CmsSeoConfig,
  CmsTemplateItem,
  CmsThemeConfig,
  SectionType,
  SelectionTarget,
} from '@/types/cms/builder';

const LOCAL_RECOVERY_KEY = 'inpartner_cms_draft_recovery_v2';
const MAX_HISTORY = 45;

function cloneTree<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function resolveTreeForLocale(tree: CmsPageTree, locale: CmsLocale): CmsPageTree {
  if (locale === 'id') return tree;
  return {
    ...tree,
    sections: (tree.sections || []).map((sec) => {
      const tr = sec.translations?.[locale];
      const mergedContent = {
        ...(sec.content || {}),
        ...(tr?.content
          ? Object.fromEntries(Object.entries(tr.content).filter(([, v]) => v !== undefined && v !== ''))
          : {}),
      };
      return {
        ...sec,
        title: tr?.title || sec.title,
        subtitle: tr?.subtitle || sec.subtitle,
        content: mergedContent,
        children: (sec.children || []).map((blk) => {
          const bTr = blk.translations?.[locale];
          if (!bTr) return blk;
          return {
            ...blk,
            props: {
              ...(blk.props || {}),
              ...Object.fromEntries(Object.entries(bTr).filter(([, v]) => v !== undefined && v !== '')),
            },
          };
        }),
      };
    }),
  };
}

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export function useCmsBuilder(onToast?: (type: 'success' | 'error' | 'info', msg: string) => void) {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<CmsPageTree>(() => createDefaultPageTree());
  const [publishedTree, setPublishedTree] = useState<CmsPageTree | null>(null);
  const [pageMeta, setPageMeta] = useState<{
    version: number;
    has_unpublished_changes: boolean;
    draft_updated_at: string | null;
    published_at: string | null;
  }>({
    version: 1,
    has_unpublished_changes: false,
    draft_updated_at: null,
    published_at: null,
  });

  const [revisions, setRevisions] = useState<CmsRevisionItem[]>([]);
  const [templates, setTemplates] = useState<CmsTemplateItem[]>([]);
  const [mediaCount, setMediaCount] = useState(0);

  const [selection, setSelection] = useState<SelectionTarget | null>(null);
  const [editingLocale, setEditingLocale] = useState<CmsLocale>('id');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const [past, setPast] = useState<CmsPageTree[]>([]);
  const [future, setFuture] = useState<CmsPageTree[]>([]);
  const [recoveryBackup, setRecoveryBackup] = useState<{ tree: CmsPageTree; savedAt: number } | null>(null);

  const treeRef = useRef(tree);
  treeRef.current = tree;
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSeqRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  const loadBuilderState = useCallback(async () => {
    const reqId = ++loadSeqRef.current;
    setLoading(true);
    try {
      const res = await cmsApi.getBuilderState();
      if (reqId !== loadSeqRef.current) return;
      const data = res.data;
      const loadedDraft = data.draft || createDefaultPageTree();
      treeRef.current = loadedDraft;
      setTree(loadedDraft);
      setPublishedTree(data.published || null);
      setPageMeta({
        version: data.page?.version || 1,
        has_unpublished_changes: Boolean(data.page?.has_unpublished_changes),
        draft_updated_at: data.page?.draft_updated_at || null,
        published_at: data.page?.published_at || null,
      });
      setRevisions(Array.isArray(data.revisions) ? data.revisions : []);
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setMediaCount(data.media_count || 0);
      setPast([]);
      setFuture([]);
      setSaveStatus('idle');
      setLastSavedAt(data.page?.draft_updated_at || null);

      if (loadedDraft.sections?.length > 0 && !selection) {
        setSelection({ scope: 'section', sectionId: loadedDraft.sections[0].id });
      }

      // Check local recovery backup if newer than server draft
      try {
        const rawBackup = localStorage.getItem(LOCAL_RECOVERY_KEY);
        if (rawBackup) {
          const parsed = JSON.parse(rawBackup);
          const serverTime = data.page?.draft_updated_at ? new Date(data.page.draft_updated_at).getTime() : 0;
          if (parsed?.tree && parsed?.savedAt > serverTime + 2000 && JSON.stringify(parsed.tree) !== JSON.stringify(loadedDraft)) {
            setRecoveryBackup(parsed);
          } else {
            localStorage.removeItem(LOCAL_RECOVERY_KEY);
          }
        }
      } catch {
        // ignore storage errors
      }
    } catch (err: any) {
      if (reqId !== loadSeqRef.current) return;
      onToast?.('error', err?.response?.data?.message || 'Gagal memuat Visual Builder.');
    } finally {
      if (reqId !== loadSeqRef.current) return;
      setLoading(false);
      isInitialLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadBuilderState();
    return () => {
      loadSeqRef.current += 1;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [loadBuilderState]);

  const scheduleAutosave = useCallback((nextTree: CmsPageTree) => {
    try {
      localStorage.setItem(
        LOCAL_RECOVERY_KEY,
        JSON.stringify({ tree: nextTree, savedAt: Date.now() })
      );
    } catch {
      // ignore quota errors
    }

    setSaveStatus('dirty');
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await cmsApi.saveDraft(treeRef.current, false);
        setSaveStatus('saved');
        setLastSavedAt(res.data.draft_updated_at);
        setPageMeta((prev) => ({
          ...prev,
          has_unpublished_changes: res.data.has_unpublished_changes,
          draft_updated_at: res.data.draft_updated_at,
        }));
        try {
          localStorage.removeItem(LOCAL_RECOVERY_KEY);
        } catch {}
      } catch {
        setSaveStatus('error');
      }
    }, 1600);
  }, []);

  const commitTreeChange = useCallback(
    (updater: (current: CmsPageTree) => CmsPageTree, recordHistory = true) => {
      const current = treeRef.current;
      const next = updater(cloneTree(current));
      if (recordHistory) {
        setPast((prev) => [...prev.slice(-(MAX_HISTORY - 1)), cloneTree(current)]);
        setFuture([]);
      }
      treeRef.current = next;
      setTree(next);
      scheduleAutosave(next);
    },
    [scheduleAutosave]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const currentSnapshot = cloneTree(treeRef.current);
    setPast((prev) => prev.slice(0, -1));
    setFuture((f) => [currentSnapshot, ...f.slice(0, MAX_HISTORY - 1)]);
    treeRef.current = previous;
    setTree(previous);
    scheduleAutosave(previous);
  }, [past, scheduleAutosave]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const currentSnapshot = cloneTree(treeRef.current);
    setFuture((prev) => prev.slice(1));
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), currentSnapshot]);
    treeRef.current = next;
    setTree(next);
    scheduleAutosave(next);
  }, [future, scheduleAutosave]);

  const saveDraftNow = useCallback(
    async (label = 'Manual Save Checkpoint') => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      setSaveStatus('saving');
      try {
        const res = await cmsApi.saveDraft(treeRef.current, true, label);
        treeRef.current = res.data.draft;
        setTree(res.data.draft);
        setSaveStatus('saved');
        setLastSavedAt(res.data.draft_updated_at);
        setPageMeta((prev) => ({
          ...prev,
          has_unpublished_changes: res.data.has_unpublished_changes,
          draft_updated_at: res.data.draft_updated_at,
        }));
        localStorage.removeItem(LOCAL_RECOVERY_KEY);
        const revRes = await cmsApi.getRevisions();
        setRevisions(revRes.data.data || []);
        onToast?.('success', 'Draf & titik revisi berhasil disimpan.');
      } catch (err: any) {
        setSaveStatus('error');
        onToast?.('error', err?.response?.data?.message || 'Gagal menyimpan draf.');
      }
    },
    [onToast]
  );

  const publishChanges = useCallback(
    async (label?: string) => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      setPublishing(true);
      try {
        const res = await cmsApi.publish(treeRef.current, label);
        setPublishedTree(res.data.published);
        setPageMeta({
          version: res.data.version,
          has_unpublished_changes: false,
          draft_updated_at: res.data.published_at,
          published_at: res.data.published_at,
        });
        setSaveStatus('saved');
        localStorage.removeItem(LOCAL_RECOVERY_KEY);
        const revRes = await cmsApi.getRevisions();
        setRevisions(revRes.data.data || []);
        window.dispatchEvent(new CustomEvent('inpartner:cms-published'));
        onToast?.('success', res.data.message || 'Homepage berhasil dipublikasikan!');
        return true;
      } catch (err: any) {
        const errs = err?.response?.data?.errors;
        const msg = errs
          ? Object.values(errs).flat().join(' ')
          : err?.response?.data?.message || 'Gagal mempublikasikan halaman.';
        onToast?.('error', msg);
        return false;
      } finally {
        setPublishing(false);
      }
    },
    [onToast]
  );

  const resetDraft = useCallback(
    async (mode: 'published' | 'factory') => {
      try {
        const res = await cmsApi.resetDraft(mode);
        setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), cloneTree(treeRef.current)]);
        setFuture([]);
        treeRef.current = res.data.draft;
        setTree(res.data.draft);
        setPageMeta((prev) => ({ ...prev, has_unpublished_changes: res.data.has_unpublished_changes }));
        const revRes = await cmsApi.getRevisions();
        setRevisions(revRes.data.data || []);
        onToast?.('success', res.data.message);
      } catch (err: any) {
        onToast?.('error', err?.response?.data?.message || 'Gagal mereset konfigurasi.');
      }
    },
    [onToast]
  );

  const restoreRevision = useCallback(
    async (revisionId: number) => {
      try {
        const res = await cmsApi.restoreRevision(revisionId);
        setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), cloneTree(treeRef.current)]);
        setFuture([]);
        treeRef.current = res.data.draft;
        setTree(res.data.draft);
        setPageMeta((prev) => ({ ...prev, has_unpublished_changes: res.data.has_unpublished_changes }));
        const revRes = await cmsApi.getRevisions();
        setRevisions(revRes.data.data || []);
        onToast?.('success', res.data.message);
      } catch (err: any) {
        onToast?.('error', err?.response?.data?.message || 'Gagal memulihkan revisi.');
      }
    },
    [onToast]
  );

  // -------------------------------------------------------------
  // SECTION MUTATIONS
  // -------------------------------------------------------------
  const addSection = useCallback(
    (type: SectionType, insertAtIndex?: number) => {
      const def = SECTION_REGISTRY[type];
      if (!def) return null;
      const newSec = def.createDefault();
      commitTreeChange((prev) => {
        const sections = [...prev.sections];
        const idx = typeof insertAtIndex === 'number' ? Math.max(0, Math.min(insertAtIndex, sections.length)) : sections.length;
        sections.splice(idx, 0, newSec);
        return { ...prev, sections: sections.map((s, i) => ({ ...s, order: i + 1 })) };
      });
      setSelection({ scope: 'section', sectionId: newSec.id });
      return newSec;
    },
    [commitTreeChange]
  );

  const insertTemplate = useCallback(
    (tpl: CmsTemplateItem, insertAtIndex?: number) => {
      const newSec = cloneSectionWithFreshIds(tpl.section_data, tpl.name);
      commitTreeChange((prev) => {
        const sections = [...prev.sections];
        const idx = typeof insertAtIndex === 'number' ? Math.max(0, Math.min(insertAtIndex, sections.length)) : sections.length;
        sections.splice(idx, 0, newSec);
        return { ...prev, sections: sections.map((s, i) => ({ ...s, order: i + 1 })) };
      });
      setSelection({ scope: 'section', sectionId: newSec.id });
      onToast?.('info', `Template "${tpl.name}" ditambahkan ke homepage.`);
    },
    [commitTreeChange, onToast]
  );

  const updateSection = useCallback(
    (sectionId: string, updater: (sec: CmsSectionNode) => CmsSectionNode) => {
      commitTreeChange((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.id === sectionId ? updater(s) : s)),
      }));
    },
    [commitTreeChange]
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      commitTreeChange((prev) => {
        const target = prev.sections.find((s) => s.id === sectionId);
        if (target?.locked) return prev;
        const filtered = prev.sections.filter((s) => s.id !== sectionId);
        return { ...prev, sections: filtered.map((s, i) => ({ ...s, order: i + 1 })) };
      });
      setSelection((sel) => (sel && 'sectionId' in sel && sel.sectionId === sectionId ? null : sel));
    },
    [commitTreeChange]
  );

  const duplicateSection = useCallback(
    (sectionId: string) => {
      let createdId = '';
      commitTreeChange((prev) => {
        const idx = prev.sections.findIndex((s) => s.id === sectionId);
        if (idx === -1) return prev;
        const original = prev.sections[idx];
        const copy = cloneSectionWithFreshIds(original, `${original.label} (Salinan)`);
        copy.locked = false;
        createdId = copy.id;
        const sections = [...prev.sections];
        sections.splice(idx + 1, 0, copy);
        return { ...prev, sections: sections.map((s, i) => ({ ...s, order: i + 1 })) };
      });
      if (createdId) setSelection({ scope: 'section', sectionId: createdId });
    },
    [commitTreeChange]
  );

  const moveSection = useCallback(
    (sectionId: string, dir: 'up' | 'down') => {
      commitTreeChange((prev) => {
        const idx = prev.sections.findIndex((s) => s.id === sectionId);
        if (idx === -1) return prev;
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.sections.length) return prev;
        const moved = arrayMove(prev.sections, idx, targetIdx);
        return { ...prev, sections: moved.map((s, i) => ({ ...s, order: i + 1 })) };
      });
    },
    [commitTreeChange]
  );

  const reorderSectionsById = useCallback(
    (activeSectionId: string, overSectionId: string) => {
      commitTreeChange((prev) => {
        const oldIdx = prev.sections.findIndex((s) => s.id === activeSectionId);
        const newIdx = prev.sections.findIndex((s) => s.id === overSectionId);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        const moved = arrayMove(prev.sections, oldIdx, newIdx);
        return { ...prev, sections: moved.map((s, i) => ({ ...s, order: i + 1 })) };
      });
    },
    [commitTreeChange]
  );

  const toggleSectionVisibility = useCallback(
    (sectionId: string) => {
      updateSection(sectionId, (s) => ({ ...s, visible: !s.visible }));
    },
    [updateSection]
  );

  const toggleSectionLock = useCallback(
    (sectionId: string) => {
      updateSection(sectionId, (s) => ({ ...s, locked: !s.locked }));
    },
    [updateSection]
  );

  // -------------------------------------------------------------
  // BLOCK MUTATIONS (NESTED ELEMENTS)
  // -------------------------------------------------------------
  const addBlockToSection = useCallback(
    (sectionId: string, blockType: BlockType, index?: number) => {
      const def = BLOCK_REGISTRY[blockType];
      if (!def) return;
      const newBlock = def.createDefault();
      updateSection(sectionId, (sec) => {
        const children = [...(sec.children || [])];
        const idx = typeof index === 'number' ? Math.max(0, Math.min(index, children.length)) : children.length;
        children.splice(idx, 0, newBlock);
        return { ...sec, children };
      });
      setSelection({ scope: 'block', sectionId, blockId: newBlock.id });
    },
    [updateSection]
  );

  const updateBlock = useCallback(
    (sectionId: string, blockId: string, updater: (b: CmsBlockNode) => CmsBlockNode) => {
      updateSection(sectionId, (sec) => ({
        ...sec,
        children: (sec.children || []).map((b) => (b.id === blockId ? updater(b) : b)),
      }));
    },
    [updateSection]
  );

  const deleteBlock = useCallback(
    (sectionId: string, blockId: string) => {
      updateSection(sectionId, (sec) => ({
        ...sec,
        children: (sec.children || []).filter((b) => b.id !== blockId || b.locked),
      }));
      setSelection((sel) =>
        sel?.scope === 'block' && sel.sectionId === sectionId && sel.blockId === blockId
          ? { scope: 'section', sectionId }
          : sel
      );
    },
    [updateSection]
  );

  const duplicateBlock = useCallback(
    (sectionId: string, blockId: string) => {
      let newId = '';
      updateSection(sectionId, (sec) => {
        const children = [...(sec.children || [])];
        const idx = children.findIndex((b) => b.id === blockId);
        if (idx === -1) return sec;
        const copy: CmsBlockNode = JSON.parse(JSON.stringify(children[idx]));
        copy.id = generateCmsId(`blk_${copy.type}`);
        copy.label = `${copy.label} (Salinan)`;
        copy.locked = false;
        newId = copy.id;
        children.splice(idx + 1, 0, copy);
        return { ...sec, children };
      });
      if (newId) setSelection({ scope: 'block', sectionId, blockId: newId });
    },
    [updateSection]
  );

  const moveOrReorderBlock = useCallback(
    (fromSectionId: string, blockId: string, toSectionId: string, overBlockId?: string) => {
      commitTreeChange((prev) => {
        const fromSec = prev.sections.find((s) => s.id === fromSectionId);
        const toSec = prev.sections.find((s) => s.id === toSectionId);
        if (!fromSec || !toSec) return prev;

        const fromChildren = [...(fromSec.children || [])];
        const oldIdx = fromChildren.findIndex((b) => b.id === blockId);
        if (oldIdx === -1) return prev;

        if (fromSectionId === toSectionId) {
          const newIdx = overBlockId ? fromChildren.findIndex((b) => b.id === overBlockId) : fromChildren.length - 1;
          if (newIdx === -1 || oldIdx === newIdx) return prev;
          const reordered = arrayMove(fromChildren, oldIdx, newIdx);
          return {
            ...prev,
            sections: prev.sections.map((s) => (s.id === fromSectionId ? { ...s, children: reordered } : s)),
          };
        }

        const [movedBlock] = fromChildren.splice(oldIdx, 1);
        const toChildren = [...(toSec.children || [])];
        const destIdx = overBlockId ? toChildren.findIndex((b) => b.id === overBlockId) : toChildren.length;
        toChildren.splice(destIdx === -1 ? toChildren.length : destIdx, 0, movedBlock);

        return {
          ...prev,
          sections: prev.sections.map((s) => {
            if (s.id === fromSectionId) return { ...s, children: fromChildren };
            if (s.id === toSectionId) return { ...s, children: toChildren };
            return s;
          }),
        };
      });
    },
    [commitTreeChange]
  );

  const toggleBlockVisibility = useCallback(
    (sectionId: string, blockId: string) => {
      updateBlock(sectionId, blockId, (b) => ({ ...b, visible: !b.visible }));
    },
    [updateBlock]
  );

  const toggleBlockLock = useCallback(
    (sectionId: string, blockId: string) => {
      updateBlock(sectionId, blockId, (b) => ({ ...b, locked: !b.locked }));
    },
    [updateBlock]
  );

  // -------------------------------------------------------------
  // GLOBAL CONFIG MUTATIONS
  // -------------------------------------------------------------
  const updateHeader = useCallback(
    (updater: (h: CmsHeaderConfig) => CmsHeaderConfig) => {
      commitTreeChange((prev) => ({ ...prev, header: updater(prev.header) }));
    },
    [commitTreeChange]
  );

  const updateFooter = useCallback(
    (updater: (f: CmsFooterConfig) => CmsFooterConfig) => {
      commitTreeChange((prev) => ({ ...prev, footer: updater(prev.footer) }));
    },
    [commitTreeChange]
  );

  const updateTheme = useCallback(
    (updater: (t: CmsThemeConfig) => CmsThemeConfig) => {
      commitTreeChange((prev) => ({ ...prev, theme: updater(prev.theme) }));
    },
    [commitTreeChange]
  );

  const updateSeo = useCallback(
    (updater: (s: CmsSeoConfig) => CmsSeoConfig) => {
      commitTreeChange((prev) => ({ ...prev, seo: updater(prev.seo) }));
    },
    [commitTreeChange]
  );

  // Templates API
  const saveSectionAsTemplate = useCallback(
    async (section: CmsSectionNode, name: string, category: string, description?: string) => {
      try {
        const res = await cmsApi.saveTemplate({
          name,
          category,
          description,
          section_data: section,
        });
        setTemplates((prev) => [res.data.template, ...prev]);
        onToast?.('success', res.data.message || 'Template berhasil disimpan.');
      } catch (err: any) {
        onToast?.('error', err?.response?.data?.message || 'Gagal menyimpan template.');
      }
    },
    [onToast]
  );

  const deleteTemplate = useCallback(
    async (id: number) => {
      try {
        await cmsApi.deleteTemplate(id);
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        onToast?.('success', 'Template dihapus.');
      } catch (err: any) {
        onToast?.('error', err?.response?.data?.message || 'Gagal menghapus template.');
      }
    },
    [onToast]
  );

  const displayTree = useMemo(() => resolveTreeForLocale(tree, editingLocale), [tree, editingLocale]);

  const restoreLocalRecovery = useCallback(() => {
    if (!recoveryBackup) return;
    treeRef.current = recoveryBackup.tree;
    setTree(recoveryBackup.tree);
    scheduleAutosave(recoveryBackup.tree);
    setRecoveryBackup(null);
    onToast?.('info', 'Draf lokal terakhir dipulihkan.');
  }, [recoveryBackup, scheduleAutosave, onToast]);

  const dismissLocalRecovery = useCallback(() => {
    setRecoveryBackup(null);
    localStorage.removeItem(LOCAL_RECOVERY_KEY);
  }, []);

  return {
    loading,
    tree,
    displayTree,
    publishedTree,
    pageMeta,
    revisions,
    templates,
    mediaCount,
    selection,
    setSelection,
    editingLocale,
    setEditingLocale,
    saveStatus,
    lastSavedAt,
    publishing,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    recoveryBackup,
    restoreLocalRecovery,
    dismissLocalRecovery,
    loadBuilderState,
    undo,
    redo,
    saveDraftNow,
    publishChanges,
    resetDraft,
    restoreRevision,
    addSection,
    insertTemplate,
    updateSection,
    deleteSection,
    duplicateSection,
    moveSection,
    reorderSectionsById,
    toggleSectionVisibility,
    toggleSectionLock,
    addBlockToSection,
    updateBlock,
    deleteBlock,
    duplicateBlock,
    moveOrReorderBlock,
    toggleBlockVisibility,
    toggleBlockLock,
    updateHeader,
    updateFooter,
    updateTheme,
    updateSeo,
    saveSectionAsTemplate,
    deleteTemplate,
  };
}

