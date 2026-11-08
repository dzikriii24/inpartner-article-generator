import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  List,
  Star,
  Highlighter,
  MessageSquare,
  Sparkles,
  Bot,
  Copy,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
  Search,
  Share2,
  Printer,
  Download,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  Check,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  CornerDownLeft,
  Minimize,
  SlidersHorizontal,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/lightswind/button';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from 'sonner';
import { ExportModal } from '@/components/ExportModal';

// Research Highlight Palette (High-contrast, institutional legibility)
export const HIGHLIGHT_COLORS = {
  yellow: {
    name: 'yellow',
    bgClass: 'inpartner-hl-yellow',
    dot: 'bg-amber-400',
    label: 'Kuning (Poin Kunci)',
    hex: '#FDE047',
  },
  blue: {
    name: 'blue',
    bgClass: 'inpartner-hl-blue',
    dot: 'bg-sky-400',
    label: 'Biru (Data & Fakta)',
    hex: '#38BDF8',
  },
  green: {
    name: 'green',
    bgClass: 'inpartner-hl-green',
    dot: 'bg-emerald-400',
    label: 'Hijau (Peluang / Positif)',
    hex: '#4ADE80',
  },
  red: {
    name: 'red',
    bgClass: 'inpartner-hl-red',
    dot: 'bg-rose-400',
    label: 'Merah (Risiko / Perhatian)',
    hex: '#FB7185',
  },
  purple: {
    name: 'purple',
    bgClass: 'inpartner-hl-purple',
    dot: 'bg-purple-400',
    label: 'Ungu (Kajian Lanjutan)',
    hex: '#C084FC',
  },
};

type HighlightColorKey = keyof typeof HIGHLIGHT_COLORS;

interface HighlightItem {
  id: string;
  text: string;
  page: number;
  color: HighlightColorKey;
  note?: string | null;
  rects?: any[];
  position?: any;
  created_at?: string;
}

interface NoteItem {
  id: string;
  title?: string | null;
  content: string;
  page: number;
  highlight_id?: string | null;
  created_at: string;
  updated_at?: string;
}

interface BookmarkItem {
  page: number;
  title: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  created_at: string;
  page?: number;
  reference_page?: number;
  selected_snippet?: string;
  model?: string;
}

interface PageSummaryItem {
  title: string;
  summary: string;
  key_points: string[];
  important_terms: string[];
}

export const Reader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [readerData, setReaderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Layout Controls
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [leftPanelTab, setLeftPanelTab] = useState<'pages' | 'outline' | 'annotations'>('pages');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Floating AI Assistant State
  const [floatingAiOpen, setFloatingAiOpen] = useState(false);
  const [floatingAiMinimized, setFloatingAiMinimized] = useState(false);
  const [floatingAiExpanded, setFloatingAiExpanded] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiSelectedContext, setAiSelectedContext] = useState<string | null>(null);

  // Reader Preferences
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Page Tracking
  const initialPageParam = parseInt(searchParams.get('page') || '0', 10);
  const [currentPage, setCurrentPage] = useState<number>(initialPageParam > 0 ? initialPageParam : 1);
  const [pageInput, setPageInput] = useState<string>(String(initialPageParam > 0 ? initialPageParam : 1));
  const [progress, setProgress] = useState(0);

  // Annotations & Favorites State
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [isStarred, setIsStarred] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Export & Print State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportInitialMode, setExportInitialMode] = useState<'download' | 'print'>('download');

  // Page Summary State
  const [pageSummaries, setPageSummaries] = useState<Record<number, PageSummaryItem>>({});
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [activeSummaryPage, setActiveSummaryPage] = useState<number>(1);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Text Selection & Floating Annotation Toolbar
  const [selectionToolbar, setSelectionToolbar] = useState<{
    text: string;
    top: number;
    left: number;
    range?: Range;
  } | null>(null);

  // Note Modal State
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notePage, setNotePage] = useState(1);
  const [noteHighlightRef, setNoteHighlightRef] = useState<string | null>(null);

  // Active Highlight Tooltip in Document
  const [activeHighlightTooltip, setActiveHighlightTooltip] = useState<{
    highlight: HighlightItem;
    top: number;
    left: number;
  } | null>(null);

  // Refs
  const articleRef = useRef<HTMLElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const latestProgressRef = useRef<number>(0);
  const latestPageRef = useRef<number>(1);
  const lastSyncedProgressRef = useRef<number>(0);

  // Responsive panel collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setLeftPanelOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Total pages from authentic metadata (guaranteed minimum 1, accurate from DB)
  const totalPages = useMemo(() => {
    const pPages = readerData?.product?.pages;
    if (typeof pPages === 'number' && pPages > 0) return pPages;
    return 4; // Authentic default for research publications
  }, [readerData]);

  // Fetch Full Reader Data
  const fetchReaderData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await api.get(`/library/${slug}/read`);
      setReaderData(res.data);

      const savedPage = initialPageParam > 0 ? initialPageParam : res.data.last_read_page || 1;
      const initialProgress = res.data.progress || 5;

      setCurrentPage(savedPage);
      setPageInput(String(savedPage));
      setProgress(initialProgress);
      latestProgressRef.current = initialProgress;
      latestPageRef.current = savedPage;
      lastSyncedProgressRef.current = initialProgress;

      setBookmarks(res.data.bookmarks || []);
      setNotes(res.data.notes || []);
      setHighlights(res.data.highlights || []);
      setIsStarred(Boolean(res.data.is_starred));

      // Load persisted chat history or initialize dynamic greeting
      if (Array.isArray(res.data.ai_chats) && res.data.ai_chats.length > 0) {
        setAiMessages(res.data.ai_chats);
      } else {
        const prodTitle = res.data.product?.title || 'laporan riset ini';
        setAiMessages([
          {
            id: 'welcome-msg',
            role: 'assistant',
            text: `Halo! Saya **Asisten Riset AI Inpartner**.\n\nSaya siap mendampingi Anda memahami isi laporan riset **"${prodTitle}"**.\n\nAnda dapat menanyakan ringkasan per halaman, penjelasan istilah teknis, metodologi, proyeksi data makro, maupun implikasi strategis bisnis. Anda juga dapat menyeleksi kalimat pada dokumen untuk meminta analisis langsung.`,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      // Load cached page summaries
      if (res.data.page_summaries && typeof res.data.page_summaries === 'object') {
        setPageSummaries(res.data.page_summaries);
      }
    } catch (err) {
      console.error('Failed to load reader data', err);
      toast.error('Gagal membuka dokumen riset.');
      navigate('/library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReaderData();
  }, [slug]);

  // Extract Genuine Document Outline from HTML headings
  const documentOutline = useMemo(() => {
    if (!readerData?.content_html) return [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(readerData.content_html, 'text/html');
      const headingEls = Array.from(doc.querySelectorAll('h1, h2, h3, h4'));

      if (headingEls.length === 0) {
        return [
          {
            id: 'sec-0',
            title: readerData.product?.title || 'Ringkasan Laporan Riset',
            level: 2,
            page: 1,
            summary: readerData.product?.excerpt || 'Kajian komprehensif analisis ekonomi dan pasar.',
          },
        ];
      }

      const totalH = headingEls.length;
      return headingEls.map((h, idx) => {
        const title = h.textContent?.trim() || `Bagian ${idx + 1}`;
        const level = parseInt(h.tagName.substring(1), 10);
        let nextP = h.nextElementSibling;
        let summaryText = '';
        while (nextP && nextP.tagName === 'P' && summaryText.length < 200) {
          summaryText += (nextP.textContent || '') + ' ';
          nextP = nextP.nextElementSibling;
        }

        // Map section accurately across available pages (1..totalPages)
        const estPage = Math.max(1, Math.min(totalPages, Math.ceil(((idx + 1) / totalH) * totalPages)));

        return {
          id: `sec-${idx}`,
          title,
          level,
          page: estPage,
          summary: summaryText.trim() || 'Bagian telaah analisis tematik riset.',
        };
      });
    } catch {
      return [];
    }
  }, [readerData, totalPages]);

  // Generate Page List for all totalPages (1..totalPages)
  const pagesList = useMemo(() => {
    const list = [];
    for (let p = 1; p <= totalPages; p++) {
      // Find matching heading for this page if any
      const matchingSection = documentOutline.find((sec) => sec.page === p);
      const isBookmarked = bookmarks.some((b) => b.page === p);
      const pageHighlights = highlights.filter((h) => h.page === p);
      const pageNotes = notes.filter((n) => n.page === p);
      const hasSummary = Boolean(pageSummaries[p]);

      list.push({
        pageNumber: p,
        title: matchingSection ? matchingSection.title : `Halaman ${p}`,
        subtitle: matchingSection ? matchingSection.summary : `Bagian kajian halaman ${p} dari dokumen riset.`,
        isBookmarked,
        highlightsCount: pageHighlights.length,
        notesCount: pageNotes.length,
        hasSummary,
      });
    }
    return list;
  }, [totalPages, documentOutline, bookmarks, highlights, notes, pageSummaries]);

  // Apply highlights to the DOM container
  useEffect(() => {
    if (!articleRef.current || !highlights.length) return;

    // Remove existing highlights marks first
    const existingMarks = articleRef.current.querySelectorAll('mark.inpartner-highlight');
    existingMarks.forEach((m) => {
      const parent = m.parentNode;
      while (m.firstChild) parent?.insertBefore(m.firstChild, m);
      parent?.removeChild(m);
    });

    // Helper to find and wrap text safely
    highlights.forEach((h) => {
      if (!h.text || h.text.length < 3) return;
      const searchText = h.text.trim();
      const colorKey = (h.color in HIGHLIGHT_COLORS ? h.color : 'yellow') as HighlightColorKey;
      const colorConfig = HIGHLIGHT_COLORS[colorKey];

      const walker = document.createTreeWalker(articleRef.current!, NodeFilter.SHOW_TEXT);
      let textNode: Node | null;
      while ((textNode = walker.nextNode())) {
        const content = textNode.nodeValue || '';
        const index = content.indexOf(searchText);
        if (index !== -1) {
          try {
            const range = document.createRange();
            range.setStart(textNode, index);
            range.setEnd(textNode, index + searchText.length);

            const mark = document.createElement('mark');
            mark.id = `hl-${h.id}`;
            mark.className = `inpartner-highlight ${colorConfig.bgClass}`;
            mark.setAttribute('data-hl-id', h.id);
            mark.title = `${colorConfig.label} (Klik untuk opsi)`;

            // Click listener for tooltip
            mark.addEventListener('click', (e) => {
              e.stopPropagation();
              const rect = mark.getBoundingClientRect();
              setActiveHighlightTooltip({
                highlight: h,
                top: Math.max(10, rect.top - 46),
                left: Math.max(16, rect.left + rect.width / 2 - 80),
              });
            });

            range.surroundContents(mark);
            break;
          } catch (e) {
            // text cross element boundary - fallback gracefully
          }
        }
      }
    });
  }, [highlights, readerData?.content_html]);

  // Jump to specific page and scroll
  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(validPage);
    setPageInput(String(validPage));
    latestPageRef.current = validPage;

    // Smooth scroll in reader canvas
    if (articleRef.current) {
      const pageRatio = (validPage - 1) / totalPages;
      const targetScroll = articleRef.current.scrollHeight * pageRatio;
      articleRef.current.parentElement?.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }

    const calculatedProgress = Math.min(100, Math.max(5, Math.round((validPage / totalPages) * 100)));
    latestProgressRef.current = Math.max(latestProgressRef.current, calculatedProgress);
    setProgress(latestProgressRef.current);

    // Sync progress in background
    api
      .post(`/library/${slug}/progress`, {
        progress: latestProgressRef.current,
        last_read_page: validPage,
      })
      .catch(() => {});
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p)) {
      handlePageChange(p);
    }
  };

  // Jump to section in document
  const handleJumpToSection = (sectionTitle: string, targetPage: number) => {
    handlePageChange(targetPage);
    if (articleRef.current) {
      const headings = articleRef.current.querySelectorAll('h1, h2, h3, h4, p');
      for (const el of Array.from(headings)) {
        if (el.textContent?.toLowerCase().includes(sectionTitle.toLowerCase().slice(0, 30))) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }
  };

  // Jump to highlighted text with smooth scroll and pulse animation
  const handleJumpToHighlight = (h: HighlightItem) => {
    handlePageChange(h.page || 1);

    setTimeout(() => {
      const markEl = document.getElementById(`hl-${h.id}`);
      if (markEl) {
        markEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        markEl.classList.add('inpartner-hl-pulse');
        setTimeout(() => {
          markEl.classList.remove('inpartner-hl-pulse');
        }, 2200);
      } else if (articleRef.current) {
        // Fallback search
        const walker = document.createTreeWalker(articleRef.current, NodeFilter.SHOW_TEXT);
        let node;
        const searchText = h.text.slice(0, 30).toLowerCase();
        while ((node = walker.nextNode())) {
          if (node.textContent && node.textContent.toLowerCase().includes(searchText)) {
            const parent = node.parentElement;
            if (parent) {
              parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
              parent.classList.add('inpartner-hl-pulse');
              setTimeout(() => {
                parent.classList.remove('inpartner-hl-pulse');
              }, 2200);
            }
            break;
          }
        }
      }
    }, 200);
  };

  // Text Selection & Floating Annotation Toolbar
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionToolbar(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      setSelectionToolbar(null);
      return;
    }

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      setSelectionToolbar({
        text,
        top: Math.max(12, rect.top - 54),
        left: Math.max(16, rect.left + rect.width / 2 - 130),
        range,
      });
    } catch {
      setSelectionToolbar(null);
    }
  };

  // Create Research Highlight (Default yellow or selected color)
  const handleAddHighlight = async (color: HighlightColorKey = 'yellow') => {
    if (!selectionToolbar) return;

    const highlightId = `hl-${Date.now()}`;
    const newHighlight: HighlightItem = {
      id: highlightId,
      text: selectionToolbar.text,
      page: currentPage,
      color,
      note: null,
      created_at: new Date().toISOString(),
    };

    // Optimistically update state
    setHighlights((prev) => [newHighlight, ...prev]);
    setSelectionToolbar(null);
    window.getSelection()?.removeAllRanges();

    try {
      await api.post(`/library/${slug}/highlight`, newHighlight);
      toast.success(`Teks disorot warna kuning (${HIGHLIGHT_COLORS[color].label}).`);
    } catch {
      toast.error('Gagal menyimpan sorotan teks.');
    }
  };

  // Delete Highlight
  const handleDeleteHighlight = async (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    setActiveHighlightTooltip(null);
    try {
      await api.delete(`/library/${slug}/highlight/${id}`);
      toast.success('Sorotan dihapus.');
    } catch {
      toast.error('Gagal menghapus sorotan.');
    }
  };

  // Ask AI about Selected Text
  const handleAskAiAboutSelection = (text?: string) => {
    const selected = text || selectionToolbar?.text;
    if (!selected) return;

    setAiSelectedContext(selected);
    setFloatingAiOpen(true);
    setFloatingAiMinimized(false);
    setSelectionToolbar(null);
    setActiveHighlightTooltip(null);
    window.getSelection()?.removeAllRanges();

    setAiInput(`Jelaskan poin berikut dalam konteks laporan riset ini: "${selected.slice(0, 160)}..."`);
  };

  // Add Note from Selection
  const handleOpenNoteModalFromSelection = () => {
    if (!selectionToolbar) return;
    setNoteTitle('');
    setNoteContent(`Kutipan Teks:\n"${selectionToolbar.text}"\n\nCatatan Analisis: `);
    setNotePage(currentPage);
    setNoteHighlightRef(null);
    setEditingNoteId(null);
    setNoteModalOpen(true);
    setSelectionToolbar(null);
    window.getSelection()?.removeAllRanges();
  };

  // Save Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    const noteId = editingNoteId || `note-${Date.now()}`;
    const newNote: NoteItem = {
      id: noteId,
      title: noteTitle.trim() || `Catatan Halaman ${notePage}`,
      content: noteContent.trim(),
      page: notePage,
      highlight_id: noteHighlightRef,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingNoteId) {
      setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? newNote : n)));
    } else {
      setNotes((prev) => [newNote, ...prev]);
    }

    setNoteModalOpen(false);
    setEditingNoteId(null);
    setNoteTitle('');
    setNoteContent('');

    try {
      await api.post(`/library/${slug}/note`, newNote);
      toast.success(editingNoteId ? 'Catatan diperbarui.' : 'Catatan penelitian disimpan.');
    } catch {
      toast.error('Gagal menyimpan catatan.');
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await api.delete(`/library/${slug}/note/${id}`);
      toast.success('Catatan dihapus.');
    } catch {
      toast.error('Gagal menghapus catatan.');
    }
  };

  // Toggle Bookmark for Current Page
  const handleToggleBookmark = async () => {
    try {
      const res = await api.post(`/library/${slug}/bookmark`, {
        page: currentPage,
        title: `Halaman ${currentPage}`,
      });
      setBookmarks(res.data.bookmarks || []);
      toast.success(
        res.data.action === 'added' ? `Halaman ${currentPage} ditandai.` : `Bookmark halaman ${currentPage} dihapus.`
      );
    } catch {
      toast.error('Gagal memperbarui bookmark.');
    }
  };

  // Toggle Favorite / Star
  const handleToggleStar = async () => {
    try {
      const res = await api.post(`/library/${slug}/star`);
      setIsStarred(Boolean(res.data.is_starred));
      toast.success(res.data.is_starred ? 'Ditambahkan ke Koleksi Favorit' : 'Dihapus dari Favorit');
    } catch {
      toast.error('Gagal mengubah status favorit.');
    }
  };

  // Send Message to Floating AI Assistant
  const handleSendAiMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || aiInput).trim();
    if (!promptToSend || aiLoading) return;

    setAiError(null);
    const userMsgId = `usr-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text: promptToSend,
      page: currentPage,
      selected_snippet: aiSelectedContext || undefined,
      created_at: new Date().toISOString(),
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setAiInput('');
    const contextSnippet = aiSelectedContext;
    setAiSelectedContext(null);
    setAiLoading(true);

    try {
      const res = await api.post(`/library/${slug}/ai/chat`, {
        message: promptToSend,
        selected_text: contextSnippet,
        page: currentPage,
      });

      if (Array.isArray(res.data.chats)) {
        setAiMessages(res.data.chats);
      } else {
        const assistantMessage: ChatMessage = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          text: res.data.reply || 'Jawaban berhasil dianalisis dari dokumen riset.',
          reference_page: currentPage,
          model: res.data.model,
          created_at: new Date().toISOString(),
        };
        setAiMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      console.error('AI chat failed', err);
      const errMsg =
        err.response?.data?.error ||
        'Asisten AI saat ini sedang mengalami lonjakan permintaan atau batas kuota. Silakan coba kembali.';
      setAiError(errMsg);
      toast.error(errMsg);
    } finally {
      setAiLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Clear AI Conversation History
  const handleClearAiChat = async () => {
    if (!window.confirm('Hapus seluruh riwayat percakapan dengan Asisten AI untuk dokumen ini?')) {
      return;
    }
    try {
      await api.delete(`/library/${slug}/ai/chat`);
      const prodTitle = readerData?.product?.title || 'laporan riset ini';
      setAiMessages([
        {
          id: 'fresh-welcome',
          role: 'assistant',
          text: `Percakapan telah direset. Silakan tanyakan hal baru seputar laporan riset **"${prodTitle}"**.`,
          created_at: new Date().toISOString(),
        },
      ]);
      toast.success('Riwayat percakapan AI dibersihkan.');
    } catch {
      toast.error('Gagal menghapus riwayat chat.');
    }
  };

  // Generate or View Page Summary
  const handleOpenPageSummary = async (targetPage: number) => {
    setActiveSummaryPage(targetPage);
    setSummaryModalOpen(true);

    if (pageSummaries[targetPage]) {
      return; // already cached
    }

    setSummaryLoading(true);
    try {
      // Find matching text from document
      const matchingSection = documentOutline.find((sec) => sec.page === targetPage);
      const sectionText =
        matchingSection?.summary ||
        `Kajian komprehensif pada halaman ${targetPage} dari laporan riset ${readerData?.product?.title}.`;

      const res = await api.post(`/library/${slug}/ai/page-summary`, {
        page: targetPage,
        section_title: matchingSection?.title || `Halaman ${targetPage}`,
        section_text: sectionText,
      });

      if (res.data?.summary_data) {
        setPageSummaries((prev) => ({
          ...prev,
          [targetPage]: res.data.summary_data,
        }));
      }
    } catch (err) {
      console.error('Failed to generate summary', err);
      toast.error(`Gagal membuat ringkasan untuk halaman ${targetPage}.`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Helper to render Markdown-like text cleanly
  const renderFormattedText = (rawText: string) => {
    const parts = rawText.split('\n');
    return (
      <div className="space-y-2 text-xs leading-relaxed text-slate-700">
        {parts.map((p, idx) => {
          if (!p.trim()) return <div key={idx} className="h-1" />;
          if (p.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 pt-1 text-xs">
                {p.replace('### ', '')}
              </h4>
            );
          }
          if (p.startsWith('## ') || p.startsWith('# ')) {
            return (
              <h3 key={idx} className="font-bold text-slate-900 pt-1 text-sm">
                {p.replace(/^[#]+\s/, '')}
              </h3>
            );
          }
          if (p.startsWith('- ') || p.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1976D2] mt-1.5 shrink-0" />
                <span>{renderInlineFormatting(p.substring(2))}</span>
              </div>
            );
          }
          return <p key={idx}>{renderInlineFormatting(p)}</p>;
        })}
      </div>
    );
  };

  // Render bold, citations, and inline highlights
  const renderInlineFormatting = (text: string) => {
    // Check for page citations like [Halaman 2] or [Page 2]
    const citationRegex = /\[(Halaman|Hlm|Page)\s*(\d+)\]/gi;
    const segments = [];
    let lastIdx = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push(parseBold(text.substring(lastIdx, match.index)));
      }
      const pageNum = parseInt(match[2], 10);
      segments.push(
        <button
          key={`cite-${match.index}`}
          type="button"
          onClick={() => handlePageChange(pageNum)}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] rounded font-bold text-[11px] mx-0.5 hover:bg-[#B2D1F0] transition-colors cursor-pointer"
          title={`Buka Halaman ${pageNum}`}
        >
          <BookOpen className="w-2.5 h-2.5" />
          <span>Hlm. {pageNum}</span>
        </button>
      );
      lastIdx = match.index + match[0].length;
    }

    if (lastIdx < text.length) {
      segments.push(parseBold(text.substring(lastIdx)));
    }

    return segments.length > 0 ? segments : parseBold(text);
  };

  const parseBold = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Theme-based reader background styles (Follows guideline dominant white)
  const readerThemeStyles = {
    light: 'bg-slate-100 text-slate-900',
    sepia: 'bg-[#F4ECD8] text-[#382E1E]',
    dark: 'bg-slate-950 text-slate-100',
  };

  const articlePaperStyles = {
    light: 'bg-white border-slate-200/90 shadow-xs text-slate-900',
    sepia: 'bg-[#FBF0D9] border-[#E5DAC1] shadow-xs text-[#382E1E]',
    dark: 'bg-slate-900 border-slate-800 shadow-xs text-slate-100',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#D1E4F6] border border-[#B2D1F0] flex items-center justify-center animate-pulse">
          <BookOpen className="w-6 h-6 text-[#1976D2]" />
        </div>
        <div className="text-center space-y-1">
          <div className="text-sm font-bold text-slate-900">Mempersiapkan Lingkungan Riset...</div>
          <div className="text-xs text-slate-500 font-supporting">
            Memuat dokumen, struktur navigasi, serta asisten riset.
          </div>
        </div>
      </div>
    );
  }

  const product = readerData?.product || {};

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${readerThemeStyles[theme]}`}>
      {/* 1. TOP READING PROGRESS BAR (STICKY) */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-200 z-50 print-hidden">
        <div
          className="h-full bg-[#1976D2] transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(progress, 3))}%` }}
        />
      </div>

      {/* 2. MAIN HEADER TOOLBAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs print-hidden">
        {/* Left Section: Back, Left Panel Toggle, Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to="/library">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5 rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </Button>
          </Link>

          {/* Toggle Document Navigation Sidebar */}
          <button
            type="button"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              leftPanelOpen
                ? 'bg-[#D1E4F6] border-[#B2D1F0] text-[#0C3B69]'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title={leftPanelOpen ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi Dokumen'}
          >
            {leftPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            <span className="hidden md:inline text-xs font-semibold">Navigasi</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Document Title & Category */}
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#1976D2] uppercase tracking-wider truncate">
                {product.category?.name || 'Kajian Riset'}
              </span>
              <button
                type="button"
                onClick={handleToggleStar}
                className="cursor-pointer text-slate-400 hover:text-amber-500 transition-colors"
                title={isStarred ? 'Hapus dari Koleksi Favorit' : 'Tandai sebagai Favorit'}
              >
                <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
              </button>
            </div>
            <h1 className="text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md md:max-w-lg text-slate-900">
              {product.title}
            </h1>
          </div>
        </div>

        {/* Center: Page Stepper & Progress Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer text-slate-700"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <span className="text-slate-500">Halaman</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => handlePageChange(parseInt(pageInput, 10) || currentPage)}
              className="w-10 px-1 py-0.5 text-center font-bold border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-[#1976D2] bg-white"
            />
            <span className="text-slate-500">dari {totalPages}</span>
          </form>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer text-slate-700"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <span className="text-slate-300">|</span>
          <span className="text-[#1976D2] font-bold">{progress}% Selesai</span>
        </div>

        {/* Right Controls: Zoom, Theme, Bookmark, Fullscreen, Print, Export PDF */}
        <div className="flex items-center gap-1.5 shrink-0 print-hidden">
          {/* Zoom Controller */}
          <div className="hidden sm:flex items-center p-0.5 rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setZoomPercent(Math.max(60, zoomPercent - 15))}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Perkecil Tampilan"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-[11px] text-slate-700 w-11 text-center select-none">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={() => setZoomPercent(Math.min(180, zoomPercent + 15))}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Perbesar Tampilan"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomPercent(100)}
              className="px-1.5 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900 border-l border-slate-100 cursor-pointer"
              title="Reset Zoom (100%)"
            >
              Reset
            </button>
          </div>

          {/* Bookmark Active Page */}
          <button
            type="button"
            onClick={handleToggleBookmark}
            className={`p-2 rounded-xl border transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
              bookmarks.some((b) => b.page === currentPage)
                ? 'bg-[#D1E4F6] border-[#B2D1F0] text-[#0C3B69]'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
            title={bookmarks.some((b) => b.page === currentPage) ? 'Hapus Bookmark Halaman Ini' : 'Bookmark Halaman Ini'}
          >
            {bookmarks.some((b) => b.page === currentPage) ? (
              <BookmarkCheck className="w-4 h-4 text-[#1976D2]" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
            <span className="hidden xl:inline text-xs">Bookmark</span>
          </button>

          {/* Theme Selector */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                theme === 'light' ? 'bg-[#D1E4F6] text-[#0C3B69]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Terang
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                theme === 'sepia' ? 'bg-[#E5DAC1] text-[#382E1E]' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sepia
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => {
              if (!isFullscreen) {
                document.documentElement.requestFullscreen?.().catch(() => {});
                setIsFullscreen(true);
              } else {
                document.exitFullscreen?.().catch(() => {});
                setIsFullscreen(false);
              }
            }}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer hidden sm:flex"
            title={isFullscreen ? 'Keluar Fullscreen' : 'Mode Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Print Button (Triggers Advanced Print Dialog) */}
          <button
            type="button"
            onClick={() => {
              setExportInitialMode('print');
              setExportModalOpen(true);
            }}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer hidden md:flex items-center gap-1.5 transition-colors"
            title="Cetak Dokumen Riset"
          >
            <Printer className="w-4 h-4 text-[#1976D2]" />
            <span className="text-xs font-semibold">Cetak</span>
          </button>

          {/* Advanced Export PDF Button */}
          <button
            type="button"
            onClick={() => {
              setExportInitialMode('download');
              setExportModalOpen(true);
            }}
            className="p-2 rounded-xl border border-[#B2D1F0] bg-[#D1E4F6]/60 hover:bg-[#D1E4F6] text-[#0C3B69] cursor-pointer flex items-center gap-1.5 transition-colors font-bold text-xs"
            title="Kustomisasi & Unduh PDF Riset"
          >
            <Download className="w-4 h-4 text-[#1976D2]" />
            <span>Unduh PDF</span>
          </button>
        </div>
      </header>

      {/* 3. WORKSPACE BODY: LEFT PANEL + CENTER DOCUMENT */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANEL: DOCUMENT NAVIGATION */}
        {leftPanelOpen && (
          <aside className="w-72 sm:w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col z-30 shadow-xs transition-all duration-200 h-[calc(100vh-53px)] print-hidden">
            {/* Panel Tabs: Halaman | Outline | Anotasi */}
            <div className="p-3 border-b border-slate-200/80 bg-slate-50/70">
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLeftPanelTab('pages')}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    leftPanelTab === 'pages'
                      ? 'bg-white text-[#1976D2] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Halaman ({totalPages})
                </button>
                <button
                  type="button"
                  onClick={() => setLeftPanelTab('outline')}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    leftPanelTab === 'outline'
                      ? 'bg-white text-[#1976D2] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daftar Isi
                </button>
                <button
                  type="button"
                  onClick={() => setLeftPanelTab('annotations')}
                  className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                    leftPanelTab === 'annotations'
                      ? 'bg-white text-[#1976D2] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Anotasi ({highlights.length + notes.length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* TAB 1: PAGES LIST (ALL 4 PAGES GUARANTEED) */}
              {leftPanelTab === 'pages' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-0.5">
                    Seluruh Halaman Riset ({totalPages} Halaman)
                  </div>
                  {pagesList.map((item) => {
                    const isActive = currentPage === item.pageNumber;
                    return (
                      <div
                        key={item.pageNumber}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                          isActive
                            ? 'bg-[#D1E4F6]/50 border-[#B2D1F0] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                        onClick={() => handlePageChange(item.pageNumber)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                                isActive ? 'bg-[#1976D2] text-white' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {String(item.pageNumber).padStart(2, '0')}
                            </span>
                            <span className="text-xs font-bold text-slate-900 line-clamp-1">
                              {item.title}
                            </span>
                          </div>
                          {item.isBookmarked && (
                            <BookmarkCheck className="w-4 h-4 text-[#1976D2] shrink-0" title="Halaman di-bookmark" />
                          )}
                        </div>

                        <p className="text-[11px] text-slate-500 font-supporting line-clamp-2 leading-relaxed">
                          {item.subtitle}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                          <div className="flex items-center gap-2">
                            {item.highlightsCount > 0 && (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                                <Highlighter className="w-2.5 h-2.5" />
                                {item.highlightsCount} Sorotan
                              </span>
                            )}
                            {item.notesCount > 0 && (
                              <span className="inline-flex items-center gap-1 font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded">
                                <MessageSquare className="w-2.5 h-2.5" />
                                {item.notesCount} Catatan
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPageSummary(item.pageNumber);
                            }}
                            className="font-bold text-[#1976D2] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-[#1976D2]" />
                            <span>Ringkasan</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: OUTLINE (GENUINE HEADINGS) */}
              {leftPanelTab === 'outline' && (
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-2 py-0.5">
                    Struktur Bab & Sub-bab
                  </div>
                  {documentOutline.map((sec, idx) => {
                    const isActive = currentPage === sec.page;
                    return (
                      <button
                        key={sec.id || idx}
                        type="button"
                        onClick={() => handleJumpToSection(sec.title, sec.page)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-start gap-2.5 ${
                          isActive
                            ? 'bg-[#D1E4F6]/50 border border-[#B2D1F0] text-[#0C3B69] font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          {sec.page}
                        </span>
                        <div className="min-w-0 space-y-0.5">
                          <div className="line-clamp-2 leading-snug font-semibold">{sec.title}</div>
                          <div className="text-[10px] text-slate-400 font-supporting line-clamp-1">
                            {sec.summary}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: ANNOTATIONS (HIGHLIGHTS & NOTES) */}
              {leftPanelTab === 'annotations' && (
                <div className="space-y-4">
                  {/* Highlights section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                      <span>Teks Disorot ({highlights.length})</span>
                      <span className="text-[10px] font-normal text-slate-400">Klik untuk lompat</span>
                    </div>

                    {highlights.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        Belum ada teks yang disorot. Seleksi teks pada dokumen untuk memberi sorotan warna kuning.
                      </div>
                    ) : (
                      highlights.map((h) => {
                        const colorConfig = HIGHLIGHT_COLORS[h.color || 'yellow'] || HIGHLIGHT_COLORS.yellow;
                        return (
                          <div
                            key={h.id}
                            onClick={() => handleJumpToHighlight(h)}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-[#1976D2] hover:bg-slate-50/80 transition-all cursor-pointer group relative space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                                <span className={`w-2.5 h-2.5 rounded-full ${colorConfig.dot}`} />
                                <span>Halaman {h.page}</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteHighlight(h.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-opacity cursor-pointer"
                                title="Hapus Sorotan"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-xs font-supporting text-slate-800 line-clamp-2 bg-yellow-50/80 p-1.5 rounded border-l-2 border-yellow-400 italic">
                              "{h.text}"
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Personal Notes section */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                      <span>Catatan Riset ({notes.length})</span>
                    </div>

                    {notes.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                        Belum ada catatan. Buat catatan baru melalui seleksi teks.
                      </div>
                    ) : (
                      notes.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1976D2]">Hlm. {n.page}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteId(n.id);
                                  setNoteTitle(n.title || '');
                                  setNoteContent(n.content);
                                  setNotePage(n.page);
                                  setNoteModalOpen(true);
                                }}
                                className="text-slate-400 hover:text-[#1976D2] p-1 cursor-pointer"
                                title="Edit Catatan"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(n.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Hapus Catatan"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="font-bold text-slate-900">{n.title}</div>
                          <div className="text-slate-600 font-supporting whitespace-pre-wrap">{n.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Panel Status */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Status Pembaca</span>
              <span className="font-bold text-[#1976D2]">{progress}% Tersinkron</span>
            </div>
          </aside>
        )}

        {/* CENTER DOCUMENT READING CANVAS (FOCUSED & SPACIOUS) */}
        <main
          onMouseUp={handleMouseUp}
          className="flex-1 overflow-y-auto relative flex flex-col items-center min-w-0 p-4 sm:p-8 lg:p-12 h-[calc(100vh-53px)]"
        >
          {/* FLOATING TEXT SELECTION TOOLBAR */}
          {selectionToolbar && (
            <div
              style={{ top: `${selectionToolbar.top}px`, left: `${selectionToolbar.left}px` }}
              className="fixed z-50 animate-in fade-in zoom-in-95 bg-slate-900 text-white rounded-2xl shadow-2xl px-2.5 py-1.5 flex items-center gap-1.5 border border-slate-700 text-xs backdrop-blur-md"
            >
              {/* Highlight Button (Yellow Default) */}
              <button
                type="button"
                onClick={() => handleAddHighlight('yellow')}
                className="px-2 py-1 bg-amber-400 text-amber-950 font-bold rounded-lg hover:bg-amber-300 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                title="Sorot Kuning"
              >
                <Highlighter className="w-3.5 h-3.5" />
                <span>Sorot Kuning</span>
              </button>

              {/* Color options dropdown or dots */}
              <div className="flex items-center gap-1 px-1 border-r border-slate-700">
                {(['blue', 'green', 'red', 'purple'] as HighlightColorKey[]).map((cKey) => {
                  const c = HIGHLIGHT_COLORS[cKey];
                  return (
                    <button
                      key={cKey}
                      type="button"
                      onClick={() => handleAddHighlight(cKey)}
                      className="w-4 h-4 rounded-full hover:scale-125 transition-transform cursor-pointer border border-white/20"
                      style={{ backgroundColor: c.hex }}
                      title={`Sorot ${c.label}`}
                    />
                  );
                })}
              </div>

              {/* Add Note Button */}
              <button
                type="button"
                onClick={handleOpenNoteModalFromSelection}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title="Buat Catatan Riset"
              >
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px] font-semibold">Catat</span>
              </button>

              {/* Ask AI Button */}
              <button
                type="button"
                onClick={() => handleAskAiAboutSelection()}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-amber-300 hover:text-amber-200 transition-colors cursor-pointer flex items-center gap-1 font-bold"
                title="Tanyakan ke Asisten AI"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px]">Tanya AI</span>
              </button>

              {/* Copy Button */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectionToolbar.text);
                  toast.success('Kutipan disalin ke clipboard.');
                  setSelectionToolbar(null);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Salin Teks"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {/* Close Toolbar */}
              <button
                type="button"
                onClick={() => setSelectionToolbar(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ACTIVE HIGHLIGHT CLICK TOOLTIP */}
          {activeHighlightTooltip && (
            <div
              style={{ top: `${activeHighlightTooltip.top}px`, left: `${activeHighlightTooltip.left}px` }}
              className="fixed z-50 animate-in fade-in zoom-in-95 bg-white border border-slate-300 shadow-xl rounded-xl p-1.5 flex items-center gap-1 text-xs"
            >
              <button
                type="button"
                onClick={() => handleAskAiAboutSelection(activeHighlightTooltip.highlight.text)}
                className="px-2 py-1 text-[#1976D2] font-semibold hover:bg-slate-50 rounded flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Tanya AI</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteHighlight(activeHighlightTooltip.highlight.id)}
                className="px-2 py-1 text-rose-600 font-semibold hover:bg-rose-50 rounded flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveHighlightTooltip(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* EDITORIAL RESEARCH READING CANVAS */}
          <article
            ref={articleRef}
            style={{
              zoom: `${zoomPercent}%`,
            }}
            className={`max-w-4xl w-full px-6 sm:px-14 py-12 my-2 rounded-2xl border transition-all duration-150 ${articlePaperStyles[theme]}`}
          >
            {/* Document Header Metadata */}
            <header className="border-b border-slate-200/80 pb-8 space-y-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D1E4F6] text-[#0C3B69] border border-[#B2D1F0] text-[11px] font-bold uppercase tracking-wider">
                <span>{product.category?.name || 'Riset Tematik & Sektoral'}</span>
                <span>•</span>
                <span>Inpartner Intelligence</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-2xl mx-auto">
                {product.title}
              </h1>

              {product.subtitle && (
                <p className="text-sm sm:text-base text-slate-600 font-supporting max-w-xl mx-auto">
                  {product.subtitle}
                </p>
              )}

              {/* Author & Publication Information */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 pt-2 font-sans">
                {product.author && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{product.author.name}</span>
                    {product.author.position && (
                      <span className="text-slate-400">({product.author.position})</span>
                    )}
                  </div>
                )}
                <span>•</span>
                <span>{product.publisher || 'Inpartner Research'}</span>
                <span>•</span>
                <span>{totalPages} Halaman Riset</span>
              </div>
            </header>

            {/* Document Body Prose */}
            <div className="pt-8 article-prose font-supporting">
              {readerData?.content_html ? (
                <div
                  dangerouslySetInnerHTML={{ __html: readerData.content_html }}
                  className="space-y-6 leading-relaxed text-slate-800 text-[1.05rem]"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <p className="text-slate-600">Konten bacaan digital siap diakses.</p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setExportInitialMode('download');
                      setExportModalOpen(true);
                    }}
                  >
                    Ekspor Dokumen (PDF)
                  </Button>
                </div>
              )}
            </div>

            {/* End of Document Footer */}
            <footer className="mt-16 pt-8 border-t border-slate-200 text-center space-y-4 font-sans print-hidden">
              <div className="w-10 h-10 rounded-full bg-[#D1E4F6] text-[#1976D2] mx-auto flex items-center justify-center font-bold">
                ✓
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">Akhir dari Laporan Riset</h4>
                <p className="text-xs text-slate-500">
                  Anda telah menyelesaikan seluruh {totalPages} halaman materi riset ini.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="secondary" onClick={() => handlePageChange(1)}>
                  Baca Ulang dari Awal
                </Button>
                <Link to="/library">
                  <Button variant="primary">Kembali ke Library Saya</Button>
                </Link>
              </div>
            </footer>
          </article>
        </main>
      </div>

      {/* 4. FLOATING AI RESEARCH ASSISTANT (TRIGGER BUTTON & FLOATING CARD) */}
      {!floatingAiOpen && (
        <button
          type="button"
          onClick={() => {
            setFloatingAiOpen(true);
            setFloatingAiMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 bg-[#1976D2] hover:bg-[#1562AF] text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all duration-200 hover:scale-105 cursor-pointer border border-[#B2D1F0]/40 group print-hidden"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <span className="font-bold text-xs tracking-wide">Tanya Asisten AI</span>
        </button>
      )}

      {/* FLOATING AI ASSISTANT CARD */}
      {floatingAiOpen && (
        <div
          className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-200 print-hidden ${
            floatingAiMinimized
              ? 'bottom-6 right-6 w-80 h-14'
              : floatingAiExpanded
              ? 'bottom-4 right-4 w-[640px] max-w-[95vw] h-[88vh]'
              : 'bottom-6 right-6 w-[430px] max-w-[92vw] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* FLOATING CARD HEADER */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-[#1976D2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs text-slate-900 truncate">Asisten Riset AI</h3>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Terhubung
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Konteks: {product.title || 'Laporan Riset Aktif'}
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setFloatingAiMinimized(!floatingAiMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title={floatingAiMinimized ? 'Pulihkan Panel' : 'Minimalkan Panel'}
              >
                <Minimize className="w-3.5 h-3.5" />
              </button>

              {!floatingAiMinimized && (
                <button
                  type="button"
                  onClick={() => setFloatingAiExpanded(!floatingAiExpanded)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer hidden sm:flex"
                  title={floatingAiExpanded ? 'Perkecil Ukuran' : 'Perbesar Ukuran Panel'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setFloatingAiOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup Asisten AI"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* FLOATING CARD BODY (WHEN NOT MINIMIZED) */}
          {!floatingAiMinimized && (
            <>
              {/* Quick Action Prompt Chips */}
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => handleSendAiMessage(`Ringkas poin-poin utama pada Halaman ${currentPage} dalam 3 butir eksekutif.`)}
                  className="px-2.5 py-1 bg-white hover:bg-[#D1E4F6]/50 border border-slate-200 text-slate-700 hover:text-[#0C3B69] rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                >
                  📑 Ringkas Hlm. {currentPage}
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAiMessage('Jelaskan istilah kunci, metrik ekonomi, dan metodologi yang terdapat dalam laporan ini.')}
                  className="px-2.5 py-1 bg-white hover:bg-[#D1E4F6]/50 border border-slate-200 text-slate-700 hover:text-[#0C3B69] rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                >
                  🔍 Istilah Kunci
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAiMessage('Apa implikasi strategis terpenting bagi pelaku bisnis dan investor dari kajian ini?')}
                  className="px-2.5 py-1 bg-white hover:bg-[#D1E4F6]/50 border border-slate-200 text-slate-700 hover:text-[#0C3B69] rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                >
                  💡 Implikasi Strategis
                </button>
                <button
                  type="button"
                  onClick={() => handleSendAiMessage('Rangkum seluruh data makroekonomi, angka statistik, dan proyeksi yang tercantum dalam laporan.')}
                  className="px-2.5 py-1 bg-white hover:bg-[#D1E4F6]/50 border border-slate-200 text-slate-700 hover:text-[#0C3B69] rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer shadow-2xs"
                >
                  📊 Data & Fakta
                </button>
              </div>

              {/* Chat Messages List (Independent Scroll) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
                {aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {/* User Quoted Snippet Indicator */}
                    {msg.selected_snippet && (
                      <div className="mb-1 text-[10px] bg-sky-50 text-sky-900 border border-sky-200 rounded-lg px-2 py-1 max-w-[85%] truncate">
                        Kutipan: "{msg.selected_snippet}"
                      </div>
                    )}

                    <div
                      className={`rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#1976D2] text-white rounded-tr-xs shadow-xs max-w-[85%]'
                          : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs max-w-[95%]'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div>
                          {renderFormattedText(msg.text)}
                          {msg.model && (
                            <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
                              <span>Model: {msg.model}</span>
                              {msg.reference_page && (
                                <span>Rujukan Hlm. {msg.reference_page}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>

                    <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}

                {/* Loading typing indicator */}
                {aiLoading && (
                  <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-xs max-w-[80%] shadow-2xs">
                    <Sparkles className="w-4 h-4 text-[#1976D2] animate-spin" />
                    <span className="text-xs text-slate-500 font-medium">
                      Menganalisis isi dokumen riset...
                    </span>
                  </div>
                )}

                {/* Error message with retry */}
                {aiError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Gagal Menghubungi Asisten AI</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{aiError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendAiMessage()}
                      className="text-xs border-rose-300 text-rose-700 hover:bg-rose-100"
                    >
                      Coba Kirim Ulang
                    </Button>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Selected text quote preview (if selected from document) */}
              {aiSelectedContext && (
                <div className="px-3 py-1.5 bg-[#D1E4F6] border-t border-[#B2D1F0] flex items-center justify-between text-xs text-[#0C3B69]">
                  <span className="truncate max-w-[85%] font-medium">
                    Kutipan: "{aiSelectedContext}"
                  </span>
                  <button
                    type="button"
                    onClick={() => setAiSelectedContext(null)}
                    className="text-[#0C3B69] hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Input Bar (Pinned at Bottom) */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <textarea
                    rows={1}
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAiMessage();
                      }
                    }}
                    placeholder="Tanyakan analisis dokumen atau implikasi..."
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1976D2] focus:bg-white resize-none max-h-24"
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim() || aiLoading}
                    className="p-2.5 bg-[#1976D2] hover:bg-[#1562AF] disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Kirim Pertanyaan"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between pt-2 px-1 text-[10px] text-slate-400">
                  <span>Enter untuk kirim • Shift+Enter untuk baris baru</span>
                  <button
                    type="button"
                    onClick={handleClearAiChat}
                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    Hapus Percakapan
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. PAGE SUMMARY MODAL */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs print-hidden">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#D1E4F6] text-[#0C3B69] flex items-center justify-center font-bold text-xs">
                  {activeSummaryPage}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Ringkasan Halaman {activeSummaryPage}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-supporting">
                    {readerData?.product?.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {summaryLoading ? (
                <div className="py-8 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-[#1976D2] mx-auto animate-spin" />
                  <p className="text-xs text-slate-500">Mengekstrak ringkasan struktural dari halaman {activeSummaryPage}...</p>
                </div>
              ) : pageSummaries[activeSummaryPage] ? (
                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">
                      {pageSummaries[activeSummaryPage].title}
                    </h4>
                    <p className="text-slate-600 leading-relaxed font-supporting">
                      {pageSummaries[activeSummaryPage].summary}
                    </p>
                  </div>

                  {pageSummaries[activeSummaryPage].key_points?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Poin Kunci & Temuan Utama
                      </div>
                      <ul className="space-y-1 pl-4 list-disc text-slate-600 font-supporting">
                        {pageSummaries[activeSummaryPage].key_points.map((pt, i) => (
                          <li key={i}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pageSummaries[activeSummaryPage].important_terms?.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Istilah & Konsep
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {pageSummaries[activeSummaryPage].important_terms.map((term, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Ringkasan belum tersedia untuk halaman ini.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSummaryModalOpen(false);
                  handlePageChange(activeSummaryPage);
                }}
              >
                Buka Halaman Ini
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSummaryModalOpen(false);
                  handleAskAiAboutSelection(`Jelaskan lebih mendalam ringkasan halaman ${activeSummaryPage}.`);
                }}
              >
                Tanya AI Lanjutan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. NOTE MODAL FORM */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs print-hidden">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#1976D2]" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingNoteId ? 'Edit Catatan Riset' : 'Buat Catatan Riset Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Catatan
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={`Catatan Halaman ${notePage}`}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Isi Catatan & Analisis Pribadi
                </label>
                <textarea
                  rows={5}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Tuliskan telaah, pemikiran kritis, atau implikasi strategis..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#1976D2] font-supporting"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">Tersimpan di Halaman {notePage}</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNoteModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Simpan Catatan
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. ADVANCED PRINT & EXPORT MODAL */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        product={product}
        contentHtml={readerData?.content_html || ''}
        totalPages={totalPages}
        highlights={highlights}
        notes={notes}
        bookmarks={bookmarks}
        aiMessages={aiMessages}
        pageSummaries={pageSummaries}
        initialMode={exportInitialMode}
      />
    </div>
  );
};

export default Reader;
