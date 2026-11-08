import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Shield,
  TrendingUp,
  ShoppingBag,
  Users,
  FileText,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  Layers,
  Database,
  Search,
  Plus,
  Trash2,
  Edit3,
  Download,
  Tag,
  BookOpen,
  Sparkles,
  X,
  Image as ImageIcon,
  ArrowUpRight,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  DollarSign,
  Star,
  FileSpreadsheet,
  Award,
  Clock,
  Briefcase,
  SlidersHorizontal,
  FileQuestion,
  Building2,
  CheckCircle,
  XCircle,
  MessageSquareQuote,
  Upload,
  LayoutGrid,
  Globe,
  ArrowUp,
  ArrowDown,
  EyeOff,
  ChevronUp
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Per-Tab Loading State
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({
    overview: true,
    analytics: false,
    products: false,
    categories: false,
    authors: false,
    reviews: false,
    orders: false,
    banners: false,
    users: false,
    custom_requests: false,
    integration: false,
    settings: false
  });

  // Global Data States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productMeta, setProductMeta] = useState<any>(null);
  const [productPagination, setProductPagination] = useState({ page: 1, total: 0, lastPage: 1 });
  const [orders, setOrders] = useState<any[]>([]);
  const [orderPagination, setOrderPagination] = useState({ page: 1, total: 0, lastPage: 1 });
  const [integration, setIntegration] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userPagination, setUserPagination] = useState({ page: 1, total: 0, lastPage: 1 });
  const [categories, setCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewPagination, setReviewPagination] = useState({ page: 1, total: 0, lastPage: 1 });
  const [customRequestsList, setCustomRequestsList] = useState<any[]>([]);
  const [customReqPagination, setCustomReqPagination] = useState({ page: 1, total: 0, lastPage: 1 });

  // Filter & Search states
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productTypeFilter, setProductTypeFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const [reviewStatusFilter, setReviewStatusFilter] = useState('all');
  const [reviewSearch, setReviewSearch] = useState('');

  const [customReqStatusFilter, setCustomReqStatusFilter] = useState('all');
  const [customReqSearch, setCustomReqSearch] = useState('');

  // Operations & Modals
  const [syncing, setSyncing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productModalTab, setProductModalTab] = useState<'basic' | 'pricing' | 'content' | 'multilingual' | 'seo'>('basic');
  const [productForm, setProductForm] = useState({
    title: '',
    subtitle: '',
    type: 'thematic_research',
    status: 'draft',
    price: 350000,
    sale_price: '',
    category_id: '',
    author_id: '',
    access_type: 'read_download',
    access_level: 'entry',
    senior_partner: '',
    publisher: 'Inpartner Publishing',
    chapters: '',
    methodology: '',
    sources: '',
    is_featured: false,
    tags: '',
    excerpt: '',
    content_html: '',
    reading_time: 15,
    en_title: '',
    en_subtitle: '',
    en_excerpt: '',
    ko_title: '',
    ko_subtitle: '',
    ko_excerpt: '',
    meta_title: '',
    meta_description: ''
  });

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadProductId, setUploadProductId] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<'cover' | 'file' | 'excel'>('file');
  const [uploading, setUploading] = useState(false);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [grantProductId, setGrantProductId] = useState('');

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', description: '', icon: '', color: '#2563EB', sort_order: 0 });

  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any | null>(null);
  const [authorForm, setAuthorForm] = useState({
    name: '',
    slug: '',
    bio: '',
    photo_url: '',
    is_senior_partner: false,
    position: 'Senior Research Fellow',
    affiliation: 'Inpartner Intelligence',
    credentials: 'Ph.D., CFA',
    linkedin_url: ''
  });

  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [bannerForm, setBannerForm] = useState({
    eyebrow: '',
    title: '',
    subtitle: '',
    image_url: '',
    cta_label: 'Jelajahi Sekarang',
    cta_url: '/products',
    theme: 'indigo',
    sort_order: 0,
    is_active: true
  });

  const [customReqModalOpen, setCustomReqModalOpen] = useState(false);
  const [selectedCustomReq, setSelectedCustomReq] = useState<any | null>(null);
  const [customReqNotes, setCustomReqNotes] = useState('');
  const [customReqStatus, setCustomReqStatus] = useState('in_review');

  // CMS & Site Settings States
  const [cmsSections, setCmsSections] = useState<any[]>([]);
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsSectionModalOpen, setCmsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [sectionFormLang, setSectionFormLang] = useState<'id' | 'en' | 'ko'>('id');
  const [sectionForm, setSectionForm] = useState({
    title: '',
    subtitle: '',
    type: 'hero',
    eyebrow: '',
    cta_primary_label: '',
    cta_primary_url: '',
    cta_secondary_label: '',
    cta_secondary_url: '',
    badge_text: '',
    is_active: true,
    en_title: '',
    en_subtitle: '',
    en_eyebrow: '',
    en_cta_primary: '',
    en_cta_secondary: '',
    ko_title: '',
    ko_subtitle: '',
    ko_eyebrow: '',
    ko_cta_primary: '',
    ko_cta_secondary: '',
  });

  const [siteSettings, setSiteSettings] = useState<Record<string, any>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    site_name: 'INPARTNER',
    site_tagline: 'Digital Knowledge & Strategic Intelligence',
    site_description: 'Platform penerbitan riset strategis, analisis ekonomi, dan produk digital premium Indonesia.',
    contact_email: 'editorial@inpartner.id',
    contact_phone: '+62 21 5088 0123',
    social_linkedin: 'https://linkedin.com/company/inpartner',
    social_twitter: 'https://x.com/inpartner_id',
    social_instagram: 'https://instagram.com/inpartner.id',
    footer_copyright: '© 2026 INPARTNER. Seluruh hak cipta dilindungi undang-undang.',
    seo_meta_title: 'INPARTNER — Digital Knowledge & Strategic Intelligence Platform',
    seo_meta_description: 'Akses ribuan paper penelitian, jurnal akademik, analisis pasar, dan ebook eksekutif untuk mempercepat pemahaman dan pengambilan keputusan strategis Anda.'
  });

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  const formatRupiah = (val: number = 0) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  // -------------------------------------------------------------
  // Data Fetching Functions
  // -------------------------------------------------------------
  const fetchDashboard = async (forceRefresh = false) => {
    try {
      const res = await api.get('/admin/dashboard', {
        params: forceRefresh ? { refresh: 1 } : {}
      });
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    }
  };

  const fetchProductMeta = async () => {
    try {
      const res = await api.get('/admin/products/meta');
      setProductMeta(res.data);
    } catch (err) {
      console.error('Failed to load product meta', err);
    }
  };

  const fetchProducts = async (page = 1) => {
    try {
      const res = await api.get('/admin/products', {
        params: {
          q: productSearch || undefined,
          status: productStatusFilter !== 'all' ? productStatusFilter : undefined,
          type: productTypeFilter !== 'all' ? productTypeFilter : undefined,
          category_id: productCategoryFilter !== 'all' ? productCategoryFilter : undefined,
          page,
          per_page: 20
        }
      });
      setProducts(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
      setProductPagination({
        page: res.data?.meta?.current_page || 1,
        total: res.data?.meta?.total || 0,
        lastPage: res.data?.meta?.last_page || 1
      });
    } catch (err) {
      console.error('Failed to load products', err);
      setProducts([]);
    }
  };

  const fetchOrders = async (page = 1) => {
    try {
      const res = await api.get('/admin/orders', {
        params: {
          q: orderSearch || undefined,
          status: orderStatusFilter !== 'all' ? orderStatusFilter : undefined,
          page,
          per_page: 15
        }
      });
      setOrders(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
      setOrderPagination({
        page: res.data?.meta?.current_page || 1,
        total: res.data?.meta?.total || 0,
        lastPage: res.data?.meta?.last_page || 1
      });
    } catch (err) {
      console.error('Failed to load orders', err);
      setOrders([]);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      const res = await api.get('/admin/users', {
        params: {
          q: userSearch || undefined,
          role: userRoleFilter !== 'all' ? userRoleFilter : undefined,
          page,
          per_page: 15
        }
      });
      setUsersList(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
      setUserPagination({
        page: res.data?.meta?.current_page || 1,
        total: res.data?.meta?.total || 0,
        lastPage: res.data?.meta?.last_page || 1
      });
    } catch (err) {
      console.error('Failed to load users', err);
      setUsersList([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/admin/categories');
      setCategories(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load categories', err);
      setCategories([]);
    }
  };

  const fetchAuthors = async () => {
    try {
      const res = await api.get('/admin/authors');
      setAuthors(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load authors', err);
      setAuthors([]);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await api.get('/admin/banners');
      setBanners(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load banners', err);
      setBanners([]);
    }
  };

  const fetchIntegration = async () => {
    try {
      const res = await api.get('/admin/integration');
      setIntegration(res.data || {});
    } catch (err) {
      console.error('Failed to load integration status', err);
    }
  };

  const fetchReviews = async (page = 1) => {
    try {
      const res = await api.get('/admin/reviews', {
        params: {
          status: reviewStatusFilter !== 'all' ? reviewStatusFilter : undefined,
          q: reviewSearch || undefined,
          page,
          per_page: 15
        }
      });
      setReviewsList(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
      setReviewPagination({
        page: res.data?.current_page || res.data?.meta?.current_page || 1,
        total: res.data?.total || res.data?.meta?.total || 0,
        lastPage: res.data?.last_page || res.data?.meta?.last_page || 1
      });
    } catch (err) {
      console.error('Failed to load reviews', err);
      setReviewsList([]);
    }
  };

  const fetchCustomRequests = async (page = 1) => {
    try {
      const res = await api.get('/admin/custom-requests', {
        params: {
          status: customReqStatusFilter !== 'all' ? customReqStatusFilter : undefined,
          q: customReqSearch || undefined,
          page,
          per_page: 15
        }
      });
      setCustomRequestsList(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
      setCustomReqPagination({
        page: res.data?.current_page || res.data?.meta?.current_page || 1,
        total: res.data?.total || res.data?.meta?.total || 0,
        lastPage: res.data?.last_page || res.data?.meta?.last_page || 1
      });
    } catch (err) {
      console.error('Failed to load custom requests', err);
      setCustomRequestsList([]);
    }
  };

  const fetchCmsSections = async () => {
    setCmsLoading(true);
    try {
      const res = await api.get('/admin/cms/sections');
      setCmsSections(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load CMS sections', err);
    } finally {
      setCmsLoading(false);
    }
  };

  const fetchSiteSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get('/admin/cms/settings');
      const data = res.data?.data || {};
      setSiteSettings(data);
      setSettingsForm((prev) => ({
        ...prev,
        site_name: data.site_name?.value || prev.site_name,
        site_tagline: data.site_tagline?.value || prev.site_tagline,
        site_description: data.site_description?.value || prev.site_description,
        contact_email: data.contact_email?.value || prev.contact_email,
        contact_phone: data.contact_phone?.value || prev.contact_phone,
        social_linkedin: data.social_linkedin?.value || prev.social_linkedin,
        social_twitter: data.social_twitter?.value || prev.social_twitter,
        social_instagram: data.social_instagram?.value || prev.social_instagram,
        footer_copyright: data.footer_copyright?.value || prev.footer_copyright,
        seo_meta_title: data.seo_meta_title?.value || prev.seo_meta_title,
        seo_meta_description: data.seo_meta_description?.value || prev.seo_meta_description,
      }));
    } catch (err) {
      console.error('Failed to load site settings', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Tab Loader
  const loadTab = useCallback(async (tab: string, force = false) => {
    setTabLoading((prev) => ({ ...prev, [tab]: true }));
    try {
      if (tab === 'overview' || tab === 'analytics') {
        await Promise.all([fetchDashboard(force), fetchIntegration()]);
      } else if (tab === 'products') {
        await Promise.all([fetchProducts(1), fetchProductMeta(), fetchCategories(), fetchAuthors()]);
      } else if (tab === 'categories') {
        await fetchCategories();
      } else if (tab === 'authors') {
        await fetchAuthors();
      } else if (tab === 'reviews') {
        await fetchReviews(1);
      } else if (tab === 'orders') {
        await fetchOrders(1);
      } else if (tab === 'banners') {
        await fetchBanners();
      } else if (tab === 'users') {
        await Promise.all([fetchUsers(1), fetchProducts(1)]);
      } else if (tab === 'custom_requests') {
        await fetchCustomRequests(1);
      } else if (tab === 'integration') {
        await fetchIntegration();
      } else if (tab === 'cms_homepage') {
        await fetchCmsSections();
      } else if (tab === 'site_settings') {
        await fetchSiteSettings();
      }
    } catch (err) {
      console.error(`Failed loading tab ${tab}`, err);
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, []);

  useEffect(() => {
    if ((!authLoading || user) && isAdmin) {
      loadTab(activeTab);
    }
  }, [activeTab, authLoading, isAdmin, user, loadTab]);

  // Actions
  const handleToggleProductStatus = async (productId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      await api.patch(`/admin/products/${productId}`, { status: newStatus });
      showToast('success', `Status produk diubah menjadi ${newStatus.toUpperCase()}`);
      fetchProducts(productPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal mengubah status produk.');
    }
  };

  const handleDeleteProduct = async (product: any) => {
    if (!confirm(`Hapus produk "${product.title}"?`)) return;
    try {
      const res = await api.delete(`/admin/products/${product.id}`);
      showToast('success', res.data.message || 'Produk berhasil dihapus.');
      fetchProducts(productPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menghapus produk.');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: productForm.title,
        subtitle: productForm.subtitle || null,
        publisher: productForm.publisher || null,
        type: productForm.type,
        status: productForm.status,
        price: Number(productForm.price),
        sale_price: productForm.sale_price ? Number(productForm.sale_price) : null,
        category_id: productForm.category_id ? Number(productForm.category_id) : null,
        author_id: productForm.author_id ? Number(productForm.author_id) : null,
        access_type: productForm.access_type,
        access_level: productForm.access_level,
        senior_partner: productForm.senior_partner || null,
        methodology: productForm.methodology || null,
        is_featured: Boolean(productForm.is_featured),
        reading_time: Number(productForm.reading_time) || 15,
        excerpt: productForm.excerpt || null,
        tags: productForm.tags ? productForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        seo: {
          meta_title: productForm.meta_title || productForm.title,
          meta_description: productForm.meta_description || productForm.excerpt || '',
        },
        translations: {
          en: {
            title: productForm.en_title || '',
            subtitle: productForm.en_subtitle || '',
            excerpt: productForm.en_excerpt || '',
          },
          ko: {
            title: productForm.ko_title || '',
            subtitle: productForm.ko_subtitle || '',
            excerpt: productForm.ko_excerpt || '',
          }
        }
      };

      if (productForm.chapters) {
        payload.chapters = productForm.chapters.split('\n').map((ch, i) => ({ title: ch.trim(), page: i + 1 })).filter(c => c.title);
      }

      if (productForm.sources) {
        payload.sources = productForm.sources.split('\n').map((s) => s.trim()).filter(Boolean);
      }

      if (!editingProduct) {
        payload.content_html = productForm.content_html || '<p>Ringkasan eksekutif riset.</p>';
        await api.post('/admin/products', payload);
        showToast('success', 'Produk riset berhasil dibuat!');
      } else {
        if (editingProduct.source === 'manual') {
          payload.content_html = productForm.content_html;
        }
        await api.patch(`/admin/products/${editingProduct.id}`, payload);
        showToast('success', 'Produk riset berhasil diperbarui!');
      }

      setProductModalOpen(false);
      fetchProducts(productPagination.page);
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.errors) {
        const errorMessages = Object.values(errData.errors).flat().join(' | ');
        showToast('error', errorMessages || errData.message || 'Gagal menyimpan produk.');
      } else {
        showToast('error', errData?.message || 'Gagal menyimpan produk.');
      }
    }
  };

  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setProductModalTab('basic');
    setProductForm({
      title: '',
      subtitle: '',
      type: 'thematic_research',
      status: 'draft',
      price: 350000,
      sale_price: '',
      category_id: categories[0]?.id ? String(categories[0].id) : '',
      author_id: authors[0]?.id ? String(authors[0].id) : '',
      access_type: 'read_download',
      access_level: 'entry',
      senior_partner: '',
      publisher: 'Inpartner Publishing',
      chapters: '',
      methodology: '',
      sources: '',
      is_featured: false,
      tags: '',
      excerpt: '',
      content_html: '',
      reading_time: 15,
      en_title: '',
      en_subtitle: '',
      en_excerpt: '',
      ko_title: '',
      ko_subtitle: '',
      ko_excerpt: '',
      meta_title: '',
      meta_description: ''
    });
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: any) => {
    setEditingProduct(p);
    setProductModalTab('basic');
    const chString = Array.isArray(p.chapters)
      ? p.chapters.map((c: any) => (typeof c === 'string' ? c : c.title)).filter(Boolean).join('\n')
      : (p.chapters || '');
    setProductForm({
      title: p.title || '',
      subtitle: p.subtitle || '',
      type: p.type || 'thematic_research',
      status: p.status || 'draft',
      price: p.price || 0,
      sale_price: p.sale_price || '',
      category_id: p.category_id ? String(p.category_id) : '',
      author_id: p.author_id ? String(p.author_id) : '',
      access_type: p.access_type || 'read_download',
      access_level: p.access_level || 'entry',
      senior_partner: p.senior_partner || '',
      publisher: p.publisher || 'Inpartner Publishing',
      chapters: chString,
      methodology: p.methodology || '',
      sources: Array.isArray(p.sources) ? p.sources.join('\n') : (p.sources || ''),
      is_featured: Boolean(p.is_featured),
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
      excerpt: p.excerpt || '',
      content_html: p.content_html || '',
      reading_time: p.reading_time || 15,
      en_title: p.translations?.en?.title || '',
      en_subtitle: p.translations?.en?.subtitle || '',
      en_excerpt: p.translations?.en?.excerpt || '',
      ko_title: p.translations?.ko?.title || '',
      ko_subtitle: p.translations?.ko?.subtitle || '',
      ko_excerpt: p.translations?.ko?.excerpt || '',
      meta_title: p.seo?.meta_title || p.meta_title || '',
      meta_description: p.seo?.meta_description || p.meta_description || ''
    });
    setProductModalOpen(true);
  };

  const handleReorderSection = async (index: number, direction: 'up' | 'down') => {
    const newSections = [...cmsSections];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIdx];
    newSections[targetIdx] = temp;

    const items = newSections.map((s, idx) => ({ id: s.id, sort_order: idx + 1 }));
    setCmsSections(newSections.map((s, idx) => ({ ...s, sort_order: idx + 1 })));

    try {
      await api.post('/admin/cms/sections/reorder', { items });
      showToast('success', 'Urutan section berhasil disimpan!');
    } catch {
      showToast('error', 'Gagal memperbarui urutan section.');
    }
  };

  const handleToggleSectionActive = async (id: number) => {
    try {
      const res = await api.patch(`/admin/cms/sections/${id}/toggle`);
      setCmsSections(cmsSections.map((s) => (s.id === id ? { ...s, is_active: res.data.is_active } : s)));
      showToast('success', res.data.message);
    } catch {
      showToast('error', 'Gagal mengubah status section.');
    }
  };

  const handlePublishAllCms = async () => {
    try {
      await api.post('/admin/cms/sections/publish');
      showToast('success', 'Seluruh konten CMS berhasil dipublikasikan ke storefront!');
      fetchCmsSections();
    } catch {
      showToast('error', 'Gagal mempublikasikan CMS.');
    }
  };

  const handleOpenEditSection = (section: any) => {
    setEditingSection(section);
    setSectionForm({
      title: section.title || '',
      subtitle: section.subtitle || '',
      type: section.type || 'hero',
      eyebrow: section.content?.eyebrow || '',
      cta_primary_label: section.content?.cta_primary_label || '',
      cta_primary_url: section.content?.cta_primary_url || '',
      cta_secondary_label: section.content?.cta_secondary_label || '',
      cta_secondary_url: section.content?.cta_secondary_url || '',
      badge_text: section.content?.badge_text || '',
      is_active: section.is_active,
      en_title: section.translations?.en?.title || '',
      en_subtitle: section.translations?.en?.subtitle || '',
      en_eyebrow: section.translations?.en?.content?.eyebrow || '',
      en_cta_primary: section.translations?.en?.content?.cta_primary_label || '',
      en_cta_secondary: section.translations?.en?.content?.cta_secondary_label || '',
      ko_title: section.translations?.ko?.title || '',
      ko_subtitle: section.translations?.ko?.subtitle || '',
      ko_eyebrow: section.translations?.ko?.content?.eyebrow || '',
      ko_cta_primary: section.translations?.ko?.content?.cta_primary_label || '',
      ko_cta_secondary: section.translations?.ko?.content?.cta_secondary_label || '',
    });
    setSectionFormLang('id');
    setCmsSectionModalOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: sectionForm.title,
        subtitle: sectionForm.subtitle,
        type: sectionForm.type,
        is_active: sectionForm.is_active,
        save_as_draft: saveAsDraft,
        content: {
          eyebrow: sectionForm.eyebrow,
          cta_primary_label: sectionForm.cta_primary_label,
          cta_primary_url: sectionForm.cta_primary_url,
          cta_secondary_label: sectionForm.cta_secondary_label,
          cta_secondary_url: sectionForm.cta_secondary_url,
          badge_text: sectionForm.badge_text,
        },
        translations: {
          en: {
            title: sectionForm.en_title,
            subtitle: sectionForm.en_subtitle,
            content: {
              eyebrow: sectionForm.en_eyebrow,
              cta_primary_label: sectionForm.en_cta_primary,
              cta_secondary_label: sectionForm.en_cta_secondary,
            }
          },
          ko: {
            title: sectionForm.ko_title,
            subtitle: sectionForm.ko_subtitle,
            content: {
              eyebrow: sectionForm.ko_eyebrow,
              cta_primary_label: sectionForm.ko_cta_primary,
              cta_secondary_label: sectionForm.ko_cta_secondary,
            }
          }
        }
      };

      if (editingSection) {
        await api.put(`/admin/cms/sections/${editingSection.id}`, payload);
      } else {
        await api.post('/admin/cms/sections', payload);
      }

      showToast('success', saveAsDraft ? 'Draf section berhasil disimpan!' : 'Section berhasil disimpan & dipublikasikan!');
      setCmsSectionModalOpen(false);
      fetchCmsSections();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan section.');
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/admin/cms/settings', { settings: settingsForm });
      showToast('success', 'Pengaturan website berhasil disimpan!');
      fetchSiteSettings();
    } catch {
      showToast('error', 'Gagal menyimpan pengaturan website.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadProductId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append(uploadType === 'cover' ? 'cover' : uploadType === 'excel' ? 'excel' : 'file', file);

    try {
      const endpoint =
        uploadType === 'cover'
          ? `/admin/products/${uploadProductId}/cover`
          : uploadType === 'excel'
          ? `/admin/products/${uploadProductId}/excel`
          : `/admin/products/${uploadProductId}/file`;

      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('success', `File ${uploadType.toUpperCase()} berhasil diunggah.`);
      setUploadModalOpen(false);
      fetchProducts(productPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

  // Review Actions
  const handleUpdateReviewStatus = async (reviewId: number, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/admin/reviews/${reviewId}`, { status });
      showToast('success', `Ulasan #${reviewId} ditandai ${status.toUpperCase()}.`);
      fetchReviews(reviewPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal mengubah status ulasan.');
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Hapus ulasan ini secara permanen?')) return;
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      showToast('success', 'Ulasan berhasil dihapus.');
      fetchReviews(reviewPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menghapus ulasan.');
    }
  };

  // Custom Request Actions
  const handleOpenCustomReq = (req: any) => {
    setSelectedCustomReq(req);
    setCustomReqNotes(req.admin_notes || '');
    setCustomReqStatus(req.status || 'in_review');
    setCustomReqModalOpen(true);
  };

  const handleSaveCustomReq = async () => {
    if (!selectedCustomReq) return;
    try {
      await api.patch(`/admin/custom-requests/${selectedCustomReq.id}`, {
        status: customReqStatus,
        admin_notes: customReqNotes
      });
      showToast('success', 'Status permintaan riset kustom berhasil diperbarui.');
      setCustomReqModalOpen(false);
      fetchCustomRequests(customReqPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal memperbarui status permintaan.');
    }
  };

  // Order Actions
  const handleOpenOrder = async (orderId: number) => {
    setOrderLoading(true);
    setOrderModalOpen(true);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      setSelectedOrder(res.data.order || res.data);
    } catch (err) {
      showToast('error', 'Gagal memuat detail pesanan.');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleMarkOrderPaid = async (orderId: number) => {
    try {
      const res = await api.post(`/admin/orders/${orderId}/mark-paid`);
      showToast('success', `Pesanan #${orderId} ditandai LUNAS.`);
      if (selectedOrder) setSelectedOrder(res.data.order || res.data);
      fetchOrders(orderPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menandai lunas.');
    }
  };

  // User Actions
  const handleOpenUserDetail = async (userId: number) => {
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setSelectedUserDetail(res.data);
      setUserModalOpen(true);
    } catch (err) {
      showToast('error', 'Gagal memuat detail user.');
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserDetail || !grantProductId) return;
    try {
      const res = await api.post(`/admin/users/${selectedUserDetail.user.id}/grant`, {
        product_id: Number(grantProductId)
      });
      showToast('success', 'Hak akses produk riset berhasil diberikan!');
      setSelectedUserDetail(res.data);
      setGrantProductId('');
      fetchUsers(userPagination.page);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal memberikan akses.');
    }
  };

  // Category Actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/admin/categories/${editingCategory.id}`, categoryForm);
        showToast('success', 'Kategori diperbarui!');
      } else {
        await api.post('/admin/categories', categoryForm);
        showToast('success', 'Kategori baru berhasil dibuat!');
      }
      setCategoryModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan kategori.');
    }
  };

  // Author Actions
  const handleSaveAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAuthor) {
        await api.put(`/admin/authors/${editingAuthor.id}`, authorForm);
        showToast('success', 'Profil Penulis/Partner diperbarui!');
      } else {
        await api.post('/admin/authors', authorForm);
        showToast('success', 'Penulis/Partner baru berhasil ditambahkan!');
      }
      setAuthorModalOpen(false);
      fetchAuthors();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Gagal menyimpan penulis.');
    }
  };

  // Auth Guard
  if (authLoading && !user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-[#D1E4F6]/40 border border-[#B2D1F0] flex items-center justify-center animate-pulse mb-4">
          <RefreshCw className="w-6 h-6 text-[#1976D2] animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Memuat Sesi Admin...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-800 font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Akses Khusus Admin</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Portal administrasi ini terbatas untuk Senior Fellow, Research Director, dan Administrator Inpartner.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => navigate('/login?redirect=/admin')}
              className="w-full py-3 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-md transition-all"
            >
              Masuk sebagai Admin &rarr;
            </button>
            <Link
              to="/"
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all"
            >
              Kembali ke Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const chartData = dashboardData?.chart || [];

  // Sidebar Menu Groups
  const navGroups = [
    {
      label: 'Overview',
      items: [
        { id: 'overview', label: 'Dashboard Overview', icon: TrendingUp },
        { id: 'analytics', label: 'Revenue Analytics', icon: DollarSign }
      ]
    },
    {
      label: 'Storefront CMS',
      items: [
        { id: 'cms_homepage', label: 'Homepage CMS', icon: LayoutGrid, count: cmsSections.length },
        { id: 'site_settings', label: 'Global Site Settings', icon: Globe }
      ]
    },
    {
      label: 'Content Management',
      items: [
        { id: 'products', label: 'Products & Reports', icon: BookOpen, count: stats.products },
        { id: 'categories', label: 'Categories', icon: Tag, count: categories.length },
        { id: 'authors', label: 'Authors & Partners', icon: Award, count: authors.length },
        { id: 'reviews', label: 'Review Moderation', icon: MessageSquareQuote }
      ]
    },
    {
      label: 'Transactions',
      items: [
        { id: 'orders', label: 'Orders & Invoices', icon: ShoppingBag, count: stats.orders, badge: stats.pending_orders ? `${stats.pending_orders} pending` : undefined },
        { id: 'banners', label: 'Promo Banners', icon: ImageIcon, count: banners.length }
      ]
    },
    {
      label: 'Customers',
      items: [
        { id: 'users', label: 'Users & Entitlements', icon: Users, count: usersList.length }
      ]
    },
    {
      label: 'Research Management',
      items: [
        { id: 'custom_requests', label: 'Custom Data Requests', icon: FileQuestion, highlight: true }
      ]
    },
    {
      label: 'System & Tools',
      items: [
        { id: 'integration', label: 'Generator Sync Hub', icon: Database, count: stats.generator_products },
        { id: 'settings', label: 'System Simulator', icon: SlidersHorizontal }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans flex antialiased selection:bg-[#1976D2] selection:text-white">
      {/* Toast Alert */}
      {actionMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : actionMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-[#D1E4F6]/40 text-[#0C3B69] border-[#B2D1F0]'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : actionMessage.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-[#1976D2] animate-spin shrink-0" />
            )}
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SIDEBAR */}
      {/* ============================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-[#FFFFFF] transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header following guideline.md */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 bg-white">
          <Link to="/admin" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="w-9 h-9 rounded-xl bg-[#1976D2] group-hover:bg-[#1562AF] flex items-center justify-center text-white font-wordmark font-extrabold text-sm shadow-xs shrink-0 transition-colors">
              IN
            </div>
            {!sidebarCollapsed && (
              <div className="leading-tight">
                <span className="font-wordmark font-extrabold text-[#1976D2] text-base tracking-tight block">INPARTNER</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Executive Portal</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={sidebarCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </div>
              )}
              {group.items.map((item: any) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-[#1976D2] text-white shadow-sm shadow-blue-600/30 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#1976D2]'}`} />
                    {!sidebarCollapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                    {!sidebarCollapsed && item.count !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.count}
                      </span>
                    )}
                    {!sidebarCollapsed && item.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                        {item.badge}
                      </span>
                    )}
                    {!sidebarCollapsed && item.highlight && (
                      <span className="w-2 h-2 rounded-full bg-[#D1E4F6]/400"></span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Admin Info */}
        <div className="p-3 border-t border-slate-200 bg-[#FFFFFF]">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-[#F8FAFC] border border-slate-200">
            <div className="w-8 h-8 rounded-full bg-[#1976D2] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-[#1976D2] truncate font-semibold">Senior Research Admin</p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================== */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'} flex flex-col min-h-screen`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Portal Admin</span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-800 capitalize">
                {activeTab.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-[#1976D2] hover:bg-[#D1E4F6]/40 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Store Publik</span>
            </Link>
            <button
              onClick={() => loadTab(activeTab, true)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-[#1976D2] hover:bg-slate-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${tabLoading[activeTab] ? 'animate-spin text-[#1976D2]' : ''}`} />
            </button>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto space-y-6">

          {/* ========================================================== */}
          {/* TAB 1: OVERVIEW */}
          {/* ========================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Banner following guideline.md */}
              <div className="p-6 rounded-2xl bg-[#1976D2] text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#D1E4F6] block mb-1">
                    B2B Intelligence Dashboard
                  </span>
                  <h1 className="text-2xl font-black tracking-tight">Selamat Datang, {user?.name}</h1>
                  <p className="text-xs text-[#D1E4F6] mt-1 max-w-xl leading-relaxed font-supporting">
                    Ringkasan performa penjualan produk riset, engagement pembaca eksekutif, dan status sinkronisasi intelligence library.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenNewProduct}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0C3B69] hover:bg-[#D1E4F6]/40 font-bold text-xs shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" /> Tambah Riset Baru
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total Pendapatan</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-2">{formatRupiah(stats.revenue || 0)}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">Transaksional lunas</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Total Transaksi</span>
                    <div className="w-8 h-8 rounded-lg bg-[#D1E4F6]/40 text-[#1976D2] flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-2">{stats.orders || 0}</p>
                  <p className="text-[11px] text-[#1976D2] font-semibold mt-1">{stats.pending_orders || 0} menunggu pembayaran</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Katalog Produk Riset</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-2">{stats.products || 0}</p>
                  <p className="text-[11px] text-indigo-600 font-semibold mt-1">Thematic & Sectoral reports</p>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Pengguna Terdaftar</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-slate-900 mt-2">{stats.users || 0}</p>
                  <p className="text-[11px] text-amber-600 font-semibold mt-1">Corporate & analyst accounts</p>
                </div>
              </div>

              {/* Chart & Quick Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Grafik Penjualan 30 Hari Terakhir</h3>
                      <p className="text-xs text-slate-500">Distribusi nominal transaksi per hari</p>
                    </div>
                  </div>
                  <div className="h-64 w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis dataKey="date" stroke="#64748B" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                            formatter={(value: any) => [formatRupiah(Number(value)), 'Revenue']}
                          />
                          <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        Belum ada data transaksi 30 hari terakhir.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-3">Aksi Cepat Manajemen</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('custom_requests')}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#D1E4F6]/40 border border-slate-200 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileQuestion className="w-4 h-4 text-[#1976D2]" />
                          <span className="text-xs font-semibold text-slate-800">Review Riset Kustom</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('reviews')}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#D1E4F6]/40 border border-slate-200 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <MessageSquareQuote className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-semibold text-slate-800">Moderasi Ulasan Pembeli</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      </button>

                      <button
                        onClick={() => setActiveTab('orders')}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] hover:bg-[#D1E4F6]/40 border border-slate-200 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShoppingBag className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-slate-800">Kelola Pesanan & Faktur</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-[#D1E4F6]/40/70 border border-blue-100 text-xs text-blue-900">
                    <p className="font-bold">Standar B2B Inpartner</p>
                    <p className="text-[11px] text-[#1562AF] mt-1">
                      Pastikan setiap publikasi riset dilengkapi data metodologi, atribusi Senior Fellow, dan dataset Excel jika bertipe Data Series.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: ANALYTICS */}
          {/* ========================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Analitik & Revenue Metrik</h2>
                  <p className="text-xs text-slate-500">Rincian pendapatan komersial per kategori dan tipe produk</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Rata-rata Nilai Pesanan (AOV)</span>
                  <p className="text-2xl font-black text-slate-900 mt-2">
                    {formatRupiah(stats.orders > 0 ? Math.round((stats.revenue || 0) / stats.orders) : 0)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Berdasarkan total order terbayar</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Persentase Sukses Pembayaran</span>
                  <p className="text-2xl font-black text-emerald-600 mt-2">
                    {stats.orders > 0 ? Math.round(((stats.orders - (stats.pending_orders || 0)) / stats.orders) * 100) : 100}%
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Rasio order selesai vs pending</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Riset Terpublikasi</span>
                  <p className="text-2xl font-black text-[#1976D2] mt-2">{stats.products || 0}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Laporan aktif di etalase</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: PRODUCTS & REPORTS */}
          {/* ========================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Katalog Produk & Riset Bisnis</h2>
                  <p className="text-xs text-slate-500">Kelola Thematic Research, Sector Insight, Data Series, dan brief eksekutif</p>
                </div>
                <button
                  onClick={handleOpenNewProduct}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Publikasi Riset Baru
                </button>
              </div>

              {/* Filters */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari riset atau metodologi..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchProducts(1)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1976D2]"
                  />
                </div>

                <select
                  value={productStatusFilter}
                  onChange={(e) => {
                    setProductStatusFilter(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>

                <select
                  value={productTypeFilter}
                  onChange={(e) => {
                    setProductTypeFilter(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Tipe Riset</option>
                  <option value="thematic_research">Thematic Research</option>
                  <option value="sector_insight">Sector Insight</option>
                  <option value="data_series">Data Series</option>
                  <option value="custom_analysis">Custom Analysis</option>
                  <option value="article">Executive Brief</option>
                </select>

                <button
                  onClick={() => fetchProducts(1)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Terapkan Filter
                </button>
              </div>

              {/* Table */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Laporan / Riset</th>
                        <th className="py-3 px-4">Tipe & Level</th>
                        <th className="py-3 px-4">Senior Partner</th>
                        <th className="py-3 px-4">Harga Komersial</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            Tidak ada produk riset ditemukan.
                          </td>
                        </tr>
                      ) : (
                        products.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {p.cover_url ? (
                                    <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    to={`/products/${p.slug}`}
                                    target="_blank"
                                    className="font-bold text-slate-900 hover:text-[#1976D2] line-clamp-1"
                                  >
                                    {p.title}
                                  </Link>
                                  <p className="text-[11px] text-slate-400 truncate">{p.category?.name || 'Uncategorized'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-[#D1E4F6]/40 text-[#1562AF] text-[10px] font-bold border border-blue-100">
                                {p.type_label || p.type}
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5 uppercase">
                                {p.access_level || 'entry'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-slate-800">{p.senior_partner || p.author?.name || 'Inpartner Team'}</p>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {p.is_free ? (
                                <span className="text-emerald-600 font-bold">Gratis</span>
                              ) : (
                                formatRupiah(p.price)
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleProductStatus(p.id, p.status)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                                  p.status === 'published'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                {(p.status || 'draft').toString().toUpperCase()}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setUploadProductId(p.id);
                                    setUploadType('excel');
                                    setUploadModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700"
                                  title="Unggah Dataset Excel / CSV"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setUploadProductId(p.id);
                                    setUploadType('file');
                                    setUploadModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#D1E4F6]/40 text-slate-600 hover:text-[#1562AF]"
                                  title="Unggah PDF Laporan"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                                  title="Edit Riset"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p)}
                                  className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {productPagination.lastPage > 1 && (
                  <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Halaman {productPagination.page} dari {productPagination.lastPage} ({productPagination.total} total)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={productPagination.page <= 1}
                        onClick={() => fetchProducts(productPagination.page - 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        disabled={productPagination.page >= productPagination.lastPage}
                        onClick={() => fetchProducts(productPagination.page + 1)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 4: REVIEWS MODERATION */}
          {/* ========================================================== */}
          {activeTab === 'reviews' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Moderasi Ulasan Riset</h2>
                  <p className="text-xs text-slate-500">Tinjau feedback dari pembeli terverifikasi sebelum tampil di halaman detail</p>
                </div>
              </div>

              {/* Filters */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
                <select
                  value={reviewStatusFilter}
                  onChange={(e) => {
                    setReviewStatusFilter(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu Moderasi</option>
                  <option value="approved">Approved (Tayang)</option>
                  <option value="rejected">Ditolak</option>
                </select>

                <button
                  onClick={() => fetchReviews(1)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Terapkan
                </button>
              </div>

              {/* Reviews List */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Pengulas & Produk</th>
                        <th className="py-3 px-4">Rating</th>
                        <th className="py-3 px-4">Judul & Komentar</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Moderasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {reviewsList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            Belum ada ulasan yang perlu dimoderasi.
                          </td>
                        </tr>
                      ) : (
                        reviewsList.map((rev: any) => (
                          <tr key={rev.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{rev.user?.name || 'Pelanggan'}</p>
                              <p className="text-[11px] text-slate-400">{rev.user?.email}</p>
                              <span className="text-[11px] font-semibold text-[#1976D2] block mt-1">
                                {rev.product?.title || 'Produk'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 text-amber-500">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${
                                      i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                    }`}
                                  />
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4 max-w-md">
                              {rev.title && <p className="font-bold text-slate-800">{rev.title}</p>}
                              <p className="text-slate-600 text-xs mt-0.5 line-clamp-3">{rev.comment}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                rev.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : rev.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {(rev.status || 'pending').toString().toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {rev.status !== 'approved' && (
                                  <button
                                    onClick={() => handleUpdateReviewStatus(rev.id, 'approved')}
                                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                    title="Setujui (Tayang)"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {rev.status !== 'rejected' && (
                                  <button
                                    onClick={() => handleUpdateReviewStatus(rev.id, 'rejected')}
                                    className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                    title="Tolak Ulasan"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteReview(rev.id)}
                                  className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                                  title="Hapus Permanen"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 5: CUSTOM RESEARCH REQUESTS */}
          {/* ========================================================== */}
          {activeTab === 'custom_requests' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Permintaan Riset & Data Kustom</h2>
                  <p className="text-xs text-slate-500">Inquiry analisis sektoral khusus dari korporasi, kementerian, dan direksi</p>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Klien / Perusahaan</th>
                        <th className="py-3 px-4">Sektor & Topik Riset</th>
                        <th className="py-3 px-4">Estimasi Budget</th>
                        <th className="py-3 px-4">Timeline</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Detail & Respon</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {customRequestsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            Belum ada permintaan riset kustom baru.
                          </td>
                        </tr>
                      ) : (
                        customRequestsList.map((req: any) => (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-900">{req.name}</p>
                              <p className="text-[11px] text-[#1976D2] font-medium">{req.company || 'Perorangan'}</p>
                              <p className="text-[10px] text-slate-400">{req.email}</p>
                            </td>
                            <td className="py-3 px-4 max-w-sm">
                              <span className="inline-block px-2 py-0.5 rounded-full bg-[#D1E4F6]/40 text-[#1562AF] text-[10px] font-bold border border-blue-100 mb-1">
                                {req.sector}
                              </span>
                              <p className="font-bold text-slate-800 line-clamp-2">{req.topic}</p>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700">
                              {req.budget_range || 'Fleksibel'}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {req.timeline || 'Standar'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                req.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : req.status === 'in_progress'
                                  ? 'bg-[#D1E4F6]/40 text-[#1562AF] border-[#B2D1F0]'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {(req.status || 'pending').toString().replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleOpenCustomReq(req)}
                                className="px-3 py-1.5 rounded-xl border border-[#B2D1F0] bg-[#D1E4F6]/40 text-[#1562AF] hover:bg-blue-100 font-semibold text-xs"
                              >
                                Tinjau Permintaan
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 6: ORDERS & INVOICES */}
          {/* ========================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Pesanan & Faktur Komersial</h2>
                  <p className="text-xs text-slate-500">Monitoring status transaksi, verifikasi payment gateway, dan NPWP korporasi</p>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">No. Invoice / Pesanan</th>
                        <th className="py-3 px-4">Pelanggan & Entitas</th>
                        <th className="py-3 px-4">Total Tagihan</th>
                        <th className="py-3 px-4">Status Transaksi</th>
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {orders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400">
                            Belum ada riwayat pesanan.
                          </td>
                        </tr>
                      ) : (
                        orders.map((ord: any) => {
                          const orderNum = ord.order_number || ord.number || `ORD-${ord.id}`;
                          const customerName = ord.customer_name || ord.user?.name || ord.user_name || 'Pembeli';
                          const customerEmail = ord.customer_email || ord.user?.email || ord.user_email || '-';
                          const total = ord.total ?? ord.total_amount ?? 0;
                          const status = (ord.payment_status || ord.status || 'pending').toString().toLowerCase();

                          return (
                            <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-mono font-bold text-slate-900">{orderNum}</span>
                                <p className="text-[10px] text-slate-400">{ord.items_count || 1} produk riset</p>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900">{customerName}</p>
                                {ord.corporate_name && (
                                  <p className="text-[11px] text-[#1976D2] font-medium flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-[#1976D2] shrink-0" />
                                    <span>{ord.corporate_name}</span>
                                  </p>
                                )}
                                <p className="text-[10px] text-slate-400">{customerEmail}</p>
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {formatRupiah(total)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {ord.created_at ? new Date(ord.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleOpenOrder(ord.id)}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-[#D1E4F6]/40 text-slate-700 hover:text-[#1562AF] font-semibold text-xs"
                                >
                                  Detail Pesanan
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 7: USERS & ENTITLEMENTS */}
          {/* ========================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Manajemen Pengguna & Entitlement</h2>
                  <p className="text-xs text-slate-500">Kelola hak akses riset, akun corporate analyst, dan penugasan akses manual</p>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Nama & Email</th>
                        <th className="py-3 px-4">Role Akses</th>
                        <th className="py-3 px-4">Status Akun</th>
                        <th className="py-3 px-4">Tanggal Daftar</th>
                        <th className="py-3 px-4 text-right">Kelola Entitlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {usersList.map((u: any) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-[11px] text-slate-400">{u.email}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${
                              u.role === 'admin'
                                ? 'bg-[#D1E4F6]/40 text-[#1562AF] border-[#B2D1F0]'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-emerald-600 font-bold text-[11px]">Active</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(u.created_at).toLocaleDateString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenUserDetail(u.id)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-[#D1E4F6]/40 text-[#1562AF] font-semibold text-xs"
                            >
                              Akses Riset
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 8: CATEGORIES & AUTHORS */}
          {/* ========================================================== */}
          {(activeTab === 'categories' || activeTab === 'authors') && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {activeTab === 'categories' ? 'Kategori Sektor Riset' : 'Senior Partners & Penulis Riset'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeTab === 'categories'
                      ? 'Kelola taksonomi sektor industri domestik'
                      : 'Profil Senior Fellow, kredensial analis, afiliasi, dan badge otoritas'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (activeTab === 'categories') {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', slug: '', description: '', icon: '', color: '#2563EB', sort_order: 0 });
                      setCategoryModalOpen(true);
                    } else {
                      setEditingAuthor(null);
                      setAuthorForm({
                        name: '',
                        slug: '',
                        bio: '',
                        photo_url: '',
                        is_senior_partner: true,
                        position: 'Senior Research Fellow',
                        affiliation: 'Inpartner Intelligence',
                        credentials: 'Ph.D., CFA',
                        linkedin_url: ''
                      });
                      setAuthorModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> {activeTab === 'categories' ? 'Tambah Kategori' : 'Tambah Senior Partner'}
                </button>
              </div>

              {activeTab === 'categories' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat: any) => (
                    <div key={cat.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">/{cat.slug}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{cat.description || 'Sektor riset analitik Inpartner.'}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#1976D2]">{cat.products_count || 0} Publikasi</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCategoryForm({
                                name: cat.name,
                                slug: cat.slug,
                                description: cat.description || '',
                                icon: cat.icon || '',
                                color: cat.color || '#2563EB',
                                sort_order: cat.sort_order || 0
                              });
                              setCategoryModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#1976D2]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {authors.map((auth: any) => (
                    <div key={auth.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#D1E4F6]/40 border border-[#B2D1F0] overflow-hidden flex items-center justify-center shrink-0">
                            {auth.photo_url ? (
                              <img src={auth.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Award className="w-5 h-5 text-[#1976D2]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{auth.name}</h4>
                            <p className="text-[11px] text-[#1976D2] font-medium truncate">{auth.position || 'Research Partner'}</p>
                            {auth.is_senior_partner && (
                              <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold">
                                ⭐ Senior Fellow
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 line-clamp-2">{auth.bio || 'Pakar analisis data bisnis dan makroekonomi.'}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">{auth.credentials || 'Inpartner Editorial'}</span>
                        <button
                          onClick={() => {
                            setEditingAuthor(auth);
                            setAuthorForm({
                              name: auth.name,
                              slug: auth.slug,
                              bio: auth.bio || '',
                              photo_url: auth.photo_url || '',
                              is_senior_partner: Boolean(auth.is_senior_partner),
                              position: auth.position || '',
                              affiliation: auth.affiliation || '',
                              credentials: auth.credentials || '',
                              linkedin_url: auth.linkedin_url || ''
                            });
                            setAuthorModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-[#1976D2]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 9: GENERATOR SYNC HUB */}
          {/* ========================================================== */}
          {activeTab === 'integration' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <h3 className="text-base font-black text-slate-900">Inpartner Article Generator Sync Hub</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                  Platform ini terhubung secara otomatis dengan database artikel riset backend Inpartner. Gunakan sinkronisasi berkala untuk menyerap draft atau hasil riset terbaru.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    disabled={syncing}
                    onClick={async () => {
                      setSyncing(true);
                      showToast('info', 'Sedang menjalankan sinkronisasi...');
                      try {
                        const res = await api.post('/admin/integration/sync');
                        showToast('success', res.data.message || 'Sinkronisasi berhasil!');
                        fetchIntegration();
                      } catch (err: any) {
                        showToast('error', err.response?.data?.message || 'Sinkronisasi gagal.');
                      } finally {
                        setSyncing(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>Jalankan Sinkronisasi Penuh</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 10: SETTINGS / SIMULATOR */}
          {/* ========================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <h3 className="text-base font-black text-slate-900">Payment Simulator & Sandbox Tools</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                  Gunakan simulator transaksi internal untuk menguji skenario pembayaran VA, QRIS, dan kartu kredit secara aman dalam lingkungan staging/production.
                </p>
                <div className="mt-4">
                  <Link
                    to="/payment/simulator/INV-SAMPLE"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Buka Simulator Pembayaran
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 11: HOMEPAGE CMS & SECTION MANAGER */}
          {/* ========================================================== */}
          {activeTab === 'cms_homepage' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-[#1976D2]" />
                    <span>Homepage CMS & Section Manager</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelola urutan section beranda, sembunyikan/tampilkan, sunting konten draf multilingual, dan publikasikan ke storefront.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/?preview=cms"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#1976D2]" /> Preview Draf
                  </a>
                  <button
                    onClick={handlePublishAllCms}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Publikasikan Semua
                  </button>
                  <button
                    onClick={() => {
                      setEditingSection(null);
                      setSectionForm({
                        title: '',
                        subtitle: '',
                        type: 'hero',
                        eyebrow: '',
                        cta_primary_label: '',
                        cta_primary_url: '',
                        cta_secondary_label: '',
                        cta_secondary_url: '',
                        badge_text: '',
                        is_active: true,
                        en_title: '',
                        en_subtitle: '',
                        en_eyebrow: '',
                        en_cta_primary: '',
                        en_cta_secondary: '',
                        ko_title: '',
                        ko_subtitle: '',
                        ko_eyebrow: '',
                        ko_cta_primary: '',
                        ko_cta_secondary: '',
                      });
                      setSectionFormLang('id');
                      setCmsSectionModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> Tambah Section
                  </button>
                </div>
              </div>

              {/* Sections Table / Cards */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <span className="text-xs font-bold text-slate-700">
                    Total {cmsSections.length} Section Terdaftar (Disusun Sesuai Hierarki Tampilan Beranda)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Gunakan tombol panah untuk mengubah urutan (reorder)
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {cmsSections.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Belum ada section CMS. Klik tombol "Tambah Section" di atas.
                    </div>
                  ) : (
                    cmsSections.map((sec, idx) => (
                      <div
                        key={sec.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          !sec.is_active ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Reorder controls */}
                          <div className="flex flex-col items-center gap-1">
                            <button
                              disabled={idx === 0}
                              onClick={() => handleReorderSection(idx, 'up')}
                              className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none"
                              title="Pindahkan ke atas"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                            <button
                              disabled={idx === cmsSections.length - 1}
                              onClick={() => handleReorderSection(idx, 'down')}
                              className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:pointer-events-none"
                              title="Pindahkan ke bawah"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#1562AF] border border-[#B2D1F0]">
                                {sec.type}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm truncate">
                                {sec.title || sec.name || `Section #${sec.id}`}
                              </h4>
                              {sec.status === 'draft' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  Draf Tersimpan
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Live / Aktif
                                </span>
                              )}
                              {!sec.is_active && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  Disembunyikan
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                              {sec.subtitle || 'Tidak ada deskripsi subjudul.'}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                              <span>Bahasa tersedia:</span>
                              <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">ID</span>
                              {sec.translations?.en && (
                                <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">EN</span>
                              )}
                              {sec.translations?.ko && (
                                <span className="font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">KO</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleToggleSectionActive(sec.id)}
                            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                              sec.is_active
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={sec.is_active ? 'Sembunyikan dari homepage' : 'Tampilkan di homepage'}
                          >
                            {sec.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            <span>{sec.is_active ? 'Aktif' : 'Nonaktif'}</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditSection(sec)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#1976D2]" /> Edit Konten
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 12: GLOBAL SITE SETTINGS */}
          {/* ========================================================== */}
          {activeTab === 'site_settings' && (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#1976D2]" />
                  <span>Global Site Settings & Branding</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pengaturan identitas brand, footer copyright, kontak editorial, dan metadata SEO storefront.
                </p>
              </div>

              <form onSubmit={handleSaveSiteSettings} className="space-y-6 text-xs">
                {/* Brand & Identity */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    Identitas Brand Platform
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nama Brand / Platform</label>
                      <input
                        type="text"
                        value={settingsForm.site_name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, site_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tagline</label>
                      <input
                        type="text"
                        value={settingsForm.site_tagline}
                        onChange={(e) => setSettingsForm({ ...settingsForm, site_tagline: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Deskripsi Singkat Platform</label>
                    <textarea
                      rows={2}
                      value={settingsForm.site_description}
                      onChange={(e) => setSettingsForm({ ...settingsForm, site_description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                </div>

                {/* Contact & Socials */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    Kontak Editorial & Social Media
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email Editorial / Support</label>
                      <input
                        type="email"
                        value={settingsForm.contact_email}
                        onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nomor Telepon Kantor</label>
                      <input
                        type="text"
                        value={settingsForm.contact_phone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, contact_phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">LinkedIn URL</label>
                      <input
                        type="text"
                        value={settingsForm.social_linkedin}
                        onChange={(e) => setSettingsForm({ ...settingsForm, social_linkedin: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">X / Twitter URL</label>
                      <input
                        type="text"
                        value={settingsForm.social_twitter}
                        onChange={(e) => setSettingsForm({ ...settingsForm, social_twitter: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Instagram URL</label>
                      <input
                        type="text"
                        value={settingsForm.social_instagram}
                        onChange={(e) => setSettingsForm({ ...settingsForm, social_instagram: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer & Copyright */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    Footer & Copyright
                  </h3>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Teks Hak Cipta Footer</label>
                    <input
                      type="text"
                      value={settingsForm.footer_copyright}
                      onChange={(e) => setSettingsForm({ ...settingsForm, footer_copyright: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                </div>

                {/* SEO Metadata */}
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
                    Metadata SEO Global
                  </h3>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Default Meta Title</label>
                    <input
                      type="text"
                      value={settingsForm.seo_meta_title}
                      onChange={(e) => setSettingsForm({ ...settingsForm, seo_meta_title: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Default Meta Description</label>
                    <textarea
                      rows={2}
                      value={settingsForm.seo_meta_description}
                      onChange={(e) => setSettingsForm({ ...settingsForm, seo_meta_description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-md transition-all"
                  >
                    <Check className="w-4 h-4" /> Simpan Pengaturan Website
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* ============================================================== */}
      {/* MODAL: CMS SECTION EDIT/CREATE */}
      {/* ============================================================== */}
      {cmsSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingSection ? `Edit Section: ${editingSection.title || editingSection.type}` : 'Tambah Section Beranda Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Konfigurasi teks, CTA, visibilitas, dan dukungan multilingual.
                </p>
              </div>
              <button
                onClick={() => setCmsSectionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Language Switcher for Form */}
            <div className="mt-4 flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              {(['id', 'en', 'ko'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSectionFormLang(lang)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    sectionFormLang === lang
                      ? 'bg-white text-[#1976D2] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang === 'id' ? '🇮🇩 Indonesian (Utama)' : lang === 'en' ? '🇬🇧 English' : '🇰🇷 Korean'}
                </button>
              ))}
            </div>

            <form onSubmit={(e) => handleSaveSection(e, false)} className="mt-5 space-y-4 text-xs">
              {/* Type and Active (shared) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipe Section *</label>
                  <select
                    disabled={Boolean(editingSection)}
                    value={sectionForm.type}
                    onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white font-medium"
                  >
                    <option value="hero">Hero Banner (Utama)</option>
                    <option value="featured_products">Featured Publications / Riset Unggulan</option>
                    <option value="categories">Browse Sectors / Kategori</option>
                    <option value="why_us">Why Us / Metodologi Riset</option>
                    <option value="latest_products">Latest Publications / Riset Terbaru</option>
                    <option value="about">About Platform / Mengenai Inpartner</option>
                    <option value="cta">Institutional Membership / CTA</option>
                    <option value="newsletter">Intelligence Briefing / Newsletter</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sectionForm.is_active}
                      onChange={(e) => setSectionForm({ ...sectionForm, is_active: e.target.checked })}
                      className="rounded text-[#1976D2]"
                    />
                    <span className="font-bold text-slate-800">Tampilkan Section di Homepage</span>
                  </label>
                </div>
              </div>

              {/* Language: Indonesian */}
              {sectionFormLang === 'id' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Eyebrow / Label Kecil Atas</label>
                    <input
                      type="text"
                      value={sectionForm.eyebrow}
                      onChange={(e) => setSectionForm({ ...sectionForm, eyebrow: e.target.value })}
                      placeholder="Contoh: Digital Knowledge & Strategic Intelligence"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Judul Section (Indonesia) *</label>
                    <input
                      type="text"
                      required
                      value={sectionForm.title}
                      onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                      placeholder="Contoh: Strategic Intelligence for Indonesia's Leaders"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Subjudul / Deskripsi Paragraf</label>
                    <textarea
                      rows={2}
                      value={sectionForm.subtitle}
                      onChange={(e) => setSectionForm({ ...sectionForm, subtitle: e.target.value })}
                      placeholder="Jelaskan pesan atau deskripsi section ini..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Label CTA Utama</label>
                      <input
                        type="text"
                        value={sectionForm.cta_primary_label}
                        onChange={(e) => setSectionForm({ ...sectionForm, cta_primary_label: e.target.value })}
                        placeholder="Contoh: Jelajahi Katalog Riset"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">URL CTA Utama</label>
                      <input
                        type="text"
                        value={sectionForm.cta_primary_url}
                        onChange={(e) => setSectionForm({ ...sectionForm, cta_primary_url: e.target.value })}
                        placeholder="/products"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Label CTA Kedua</label>
                      <input
                        type="text"
                        value={sectionForm.cta_secondary_label}
                        onChange={(e) => setSectionForm({ ...sectionForm, cta_secondary_label: e.target.value })}
                        placeholder="Contoh: Konsultasi Riset Kustom"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">URL CTA Kedua</label>
                      <input
                        type="text"
                        value={sectionForm.cta_secondary_url}
                        onChange={(e) => setSectionForm({ ...sectionForm, cta_secondary_url: e.target.value })}
                        placeholder="/contact"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Language: English */}
              {sectionFormLang === 'en' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-[#1562AF]">
                    Terjemahan bahasa Inggris akan otomatis tampil saat pengunjung memilih bahasa English di navbar.
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Eyebrow (English)</label>
                    <input
                      type="text"
                      value={sectionForm.en_eyebrow}
                      onChange={(e) => setSectionForm({ ...sectionForm, en_eyebrow: e.target.value })}
                      placeholder="e.g. Digital Knowledge & Strategic Intelligence"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Section Title (English)</label>
                    <input
                      type="text"
                      value={sectionForm.en_title}
                      onChange={(e) => setSectionForm({ ...sectionForm, en_title: e.target.value })}
                      placeholder="e.g. Strategic Intelligence for Decision Makers"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Subtitle / Description (English)</label>
                    <textarea
                      rows={2}
                      value={sectionForm.en_subtitle}
                      onChange={(e) => setSectionForm({ ...sectionForm, en_subtitle: e.target.value })}
                      placeholder="English description..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Primary CTA Label (English)</label>
                      <input
                        type="text"
                        value={sectionForm.en_cta_primary}
                        onChange={(e) => setSectionForm({ ...sectionForm, en_cta_primary: e.target.value })}
                        placeholder="e.g. Explore Publications"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Secondary CTA Label (English)</label>
                      <input
                        type="text"
                        value={sectionForm.en_cta_secondary}
                        onChange={(e) => setSectionForm({ ...sectionForm, en_cta_secondary: e.target.value })}
                        placeholder="e.g. Request Custom Brief"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Language: Korean */}
              {sectionFormLang === 'ko' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-800">
                    한국어 번역은 방문자가 네비게이션 바에서 한국어를 선택했을 때 표시됩니다.
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Eyebrow (한국어)</label>
                    <input
                      type="text"
                      value={sectionForm.ko_eyebrow}
                      onChange={(e) => setSectionForm({ ...sectionForm, ko_eyebrow: e.target.value })}
                      placeholder="예: 디지털 지식 & 전략적 인텔리전스"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Section Title (한국어)</label>
                    <input
                      type="text"
                      value={sectionForm.ko_title}
                      onChange={(e) => setSectionForm({ ...sectionForm, ko_title: e.target.value })}
                      placeholder="예: 대한민국 및 동남아 비즈니스 리더를 위한 전략적 리서치"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Subtitle / Description (한국어)</label>
                    <textarea
                      rows={2}
                      value={sectionForm.ko_subtitle}
                      onChange={(e) => setSectionForm({ ...sectionForm, ko_subtitle: e.target.value })}
                      placeholder="한국어 설명..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Primary CTA Label (한국어)</label>
                      <input
                        type="text"
                        value={sectionForm.ko_cta_primary}
                        onChange={(e) => setSectionForm({ ...sectionForm, ko_cta_primary: e.target.value })}
                        placeholder="예: 리서치 보고서 탐색"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Secondary CTA Label (한국어)</label>
                      <input
                        type="text"
                        value={sectionForm.ko_cta_secondary}
                        onChange={(e) => setSectionForm({ ...sectionForm, ko_cta_secondary: e.target.value })}
                        placeholder="예: 맞춤형 리서치 요청"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCmsSectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSaveSection(e, true)}
                  className="px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs shadow-xs"
                >
                  Simpan sebagai Draf
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-md"
                >
                  Simpan & Publikasikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PRODUCT EDIT/CREATE WITH STRUCTURED TABS */}
      {/* ============================================================== */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingProduct ? 'Edit Laporan Riset' : 'Publikasi Riset Baru'}
                </h3>
                <p className="text-xs text-slate-500">Konfigurasi metadata terstruktur, bab pembaca, harga, dan multilingual.</p>
              </div>
              <button onClick={() => setProductModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div className="mt-4 flex border-b border-slate-200 gap-1 overflow-x-auto">
              {[
                { id: 'basic', label: '1. Info Dasar' },
                { id: 'pricing', label: '2. Harga & Akses' },
                { id: 'content', label: '3. Konten & Bab' },
                { id: 'multilingual', label: '4. Multilingual' },
                { id: 'seo', label: '5. SEO & Tag' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProductModalTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                    productModalTab === tab.id
                      ? 'border-[#1976D2] text-[#1976D2]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4 text-xs">
              {/* TAB 1: BASIC INFO */}
              {productModalTab === 'basic' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Judul Riset *</label>
                    <input
                      type="text"
                      required
                      value={productForm.title}
                      onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                      placeholder="Contoh: Indonesia Macro & Financial Sector Outlook 2026"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Subjudul / Brief</label>
                    <input
                      type="text"
                      value={productForm.subtitle}
                      onChange={(e) => setProductForm({ ...productForm, subtitle: e.target.value })}
                      placeholder="Contoh: Navigasi Risiko Suku Bunga dan Likuiditas Korporasi"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Institusi Penerbit / Publisher</label>
                      <input
                        type="text"
                        value={productForm.publisher}
                        onChange={(e) => setProductForm({ ...productForm, publisher: e.target.value })}
                        placeholder="Inpartner Publishing"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Senior Fellow / Lead Analyst</label>
                      <input
                        type="text"
                        value={productForm.senior_partner}
                        onChange={(e) => setProductForm({ ...productForm, senior_partner: e.target.value })}
                        placeholder="Contoh: Dr. Rizal Pratama, CFA"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tipe Produk Riset</label>
                      <select
                        value={productForm.type}
                        onChange={(e) => setProductForm({ ...productForm, type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white"
                      >
                        <option value="thematic_research">Thematic Research</option>
                        <option value="insight">Sector Insight</option>
                        <option value="data">Data Series & Stats (Excel)</option>
                        <option value="custom_analysis">Custom Analysis</option>
                        <option value="article">Executive Brief / Article</option>
                        <option value="journal">Journal Paper</option>
                        <option value="research_paper">Research Paper</option>
                        <option value="ebook">Ebook / Publication</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Kategori Sektor</label>
                      <select
                        value={productForm.category_id}
                        onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white"
                      >
                        <option value="">-- Pilih Sektor --</option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Author / Senior Fellow</label>
                      <select
                        value={productForm.author_id}
                        onChange={(e) => setProductForm({ ...productForm, author_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white"
                      >
                        <option value="">-- Pilih Author --</option>
                        {authors.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Status Publikasi</label>
                      <select
                        value={productForm.status}
                        onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white font-medium"
                      >
                        <option value="draft">Draft (Internal)</option>
                        <option value="published">Published (Tayang di Storefront)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={productForm.is_featured}
                          onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                          className="rounded text-[#1976D2]"
                        />
                        <span className="font-bold text-slate-800">Sorot di Homepage (Featured Research)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRICING & ACCESS */}
              {productModalTab === 'pricing' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-[11px] text-[#1562AF]">
                    Catatan: Informasi harga hanya ditampilkan di halaman katalog (/products), detail produk, dan checkout. Harga tidak muncul di homepage.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Harga Normal (IDR) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Harga Diskon / Promo (Opsional)</label>
                      <input
                        type="number"
                        min="0"
                        value={productForm.sale_price}
                        onChange={(e) => setProductForm({ ...productForm, sale_price: e.target.value })}
                        placeholder="Kosongkan jika tidak promo"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Target Entitlement / Access Level</label>
                      <select
                        value={productForm.access_level}
                        onChange={(e) => setProductForm({ ...productForm, access_level: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white"
                      >
                        <option value="free">Public Free (Tanpa Bayar)</option>
                        <option value="entry">Entry Level / Riset Pemula</option>
                        <option value="professional">Professional / Analis Korporasi</option>
                        <option value="enterprise">Enterprise Bespoke / Institusi</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Tipe Hak Akses</label>
                      <select
                        value={productForm.access_type}
                        onChange={(e) => setProductForm({ ...productForm, access_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white"
                      >
                        <option value="read">Hanya Baca Online (Reader)</option>
                        <option value="download">Hanya Unduh Dokumen (PDF/Dataset)</option>
                        <option value="read_download">Baca Online & Unduh Dokumen (Full Access)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTENT & CHAPTERS */}
              {productModalTab === 'content' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ringkasan Eksekutif (Excerpt) *</label>
                    <textarea
                      rows={3}
                      value={productForm.excerpt}
                      onChange={(e) => setProductForm({ ...productForm, excerpt: e.target.value })}
                      placeholder="Poin-poin temuan utama untuk ditampilkan pada preview kartu dan ringkasan eksekutif..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Struktur Bab & Halaman / Table of Contents (1 baris per bab)
                    </label>
                    <textarea
                      rows={4}
                      value={productForm.chapters}
                      onChange={(e) => setProductForm({ ...productForm, chapters: e.target.value })}
                      placeholder="Bab 1: Ikhtisar Makroekonomi & Finansial&#10;Bab 2: Transmisi Kebijakan Moneter & Perbankan&#10;Bab 3: Pemetaan Risiko Likuiditas Korporasi&#10;Bab 4: Skenario Stres & Mitigasi Risiko"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-[#1976D2]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Bab ini otomatis diubah menjadi daftar isi interaktif pada Digital Reader pembaca.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Estimasi Waktu Baca (Menit)</label>
                      <input
                        type="number"
                        min="1"
                        value={productForm.reading_time}
                        onChange={(e) => setProductForm({ ...productForm, reading_time: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Daftar Sumber Data Resmi (1 per baris)</label>
                      <textarea
                        rows={2}
                        value={productForm.sources}
                        onChange={(e) => setProductForm({ ...productForm, sources: e.target.value })}
                        placeholder="Bank Indonesia (BI)&#10;Badan Pusat Statistik (BPS)&#10;Otoritas Jasa Keuangan (OJK)"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Metodologi Riset & Pengumpulan Data</label>
                    <textarea
                      rows={2}
                      value={productForm.methodology}
                      onChange={(e) => setProductForm({ ...productForm, methodology: e.target.value })}
                      placeholder="Jelaskan sumber data primer/sekunder, model ekonometrika, atau cakupan sampel..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: MULTILINGUAL (EN & KO) */}
              {productModalTab === 'multilingual' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
                    Pengunjung dapat mengganti bahasa antarmuka ke English atau 한국어. Masukkan judul dan ringkasan eksekutif dalam bahasa tersebut di bawah ini.
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <h4 className="font-bold text-blue-700 text-xs flex items-center gap-1.5">
                      <span>🇬🇧</span> English Translation
                    </h4>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">English Title</label>
                      <input
                        type="text"
                        value={productForm.en_title}
                        onChange={(e) => setProductForm({ ...productForm, en_title: e.target.value })}
                        placeholder="e.g. Indonesia Macro & Financial Sector Outlook 2026"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">English Subtitle</label>
                      <input
                        type="text"
                        value={productForm.en_subtitle}
                        onChange={(e) => setProductForm({ ...productForm, en_subtitle: e.target.value })}
                        placeholder="e.g. Navigating Interest Rate Risk and Corporate Liquidity"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">English Excerpt</label>
                      <textarea
                        rows={2}
                        value={productForm.en_excerpt}
                        onChange={(e) => setProductForm({ ...productForm, en_excerpt: e.target.value })}
                        placeholder="Executive summary in English..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <h4 className="font-bold text-purple-700 text-xs flex items-center gap-1.5">
                      <span>🇰🇷</span> 한국어 (Korean Translation)
                    </h4>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Korean Title</label>
                      <input
                        type="text"
                        value={productForm.ko_title}
                        onChange={(e) => setProductForm({ ...productForm, ko_title: e.target.value })}
                        placeholder="예: 인도네시아 거시경제 및 금융 부문 전망 2026"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Korean Subtitle</label>
                      <input
                        type="text"
                        value={productForm.ko_subtitle}
                        onChange={(e) => setProductForm({ ...productForm, ko_subtitle: e.target.value })}
                        placeholder="예: 금리 리스크 및 기업 유동성 전략 분석"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Korean Excerpt</label>
                      <textarea
                        rows={2}
                        value={productForm.ko_excerpt}
                        onChange={(e) => setProductForm({ ...productForm, ko_excerpt: e.target.value })}
                        placeholder="한국어 핵심 요약..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SEO & TAGS */}
              {productModalTab === 'seo' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">SEO Meta Title</label>
                    <input
                      type="text"
                      value={productForm.meta_title}
                      onChange={(e) => setProductForm({ ...productForm, meta_title: e.target.value })}
                      placeholder="Default: Judul riset"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">SEO Meta Description</label>
                    <textarea
                      rows={2}
                      value={productForm.meta_description}
                      onChange={(e) => setProductForm({ ...productForm, meta_description: e.target.value })}
                      placeholder="Default: Ringkasan eksekutif riset"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tags / Kata Kunci (Dipisah koma)</label>
                    <input
                      type="text"
                      value={productForm.tags}
                      onChange={(e) => setProductForm({ ...productForm, tags: e.target.value })}
                      placeholder="Makroekonomi, Perbankan, Likuiditas, Outlook 2026"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold text-xs shadow-md"
                >
                  Simpan Produk Riset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: FILE UPLOAD (PDF, COVER, EXCEL) */}
      {/* ============================================================== */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-black text-slate-900 text-sm">
                Unggah File {uploadType === 'excel' ? 'Dataset Excel / CSV' : uploadType === 'cover' ? 'Cover Gambar' : 'Dokumen PDF Riset'}
              </h3>
              <button onClick={() => setUploadModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-5 text-center">
              <input
                type="file"
                id="fileUploadInput"
                accept={uploadType === 'excel' ? '.xlsx,.xls,.csv' : uploadType === 'cover' ? 'image/*' : '.pdf'}
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
              <label
                htmlFor="fileUploadInput"
                className="cursor-pointer block border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-center transition-colors bg-[#F8FAFC]"
              >
                {uploadType === 'excel' ? (
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                ) : uploadType === 'cover' ? (
                  <ImageIcon className="w-10 h-10 text-[#1976D2] mx-auto mb-2" />
                ) : (
                  <Upload className="w-10 h-10 text-indigo-600 mx-auto mb-2" />
                )}
                <p className="font-bold text-slate-800 text-xs">
                  {uploading ? 'Mengunggah file...' : 'Klik untuk memilih file'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {uploadType === 'excel' ? 'Mendukung XLSX, XLS, CSV (Maks 50MB)' : uploadType === 'cover' ? 'Mendukung JPG, PNG, WebP' : 'Mendukung PDF Laporan Lengkap (Maks 100MB)'}
                </p>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CUSTOM REQUEST DETAIL */}
      {/* ============================================================== */}
      {customReqModalOpen && selectedCustomReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Permintaan Riset Kustom #{selectedCustomReq.id}</h3>
                <p className="text-[11px] text-slate-500">Dari: {selectedCustomReq.name} ({selectedCustomReq.company || 'Pribadi'})</p>
              </div>
              <button onClick={() => setCustomReqModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Topik & Lingkup Riset</p>
                <p className="font-bold text-slate-900 text-xs mt-1">{selectedCustomReq.topic}</p>
                <p className="text-slate-600 mt-1 text-[11px] leading-relaxed whitespace-pre-wrap">{selectedCustomReq.scope}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Sektor Industri</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedCustomReq.sector}</p>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Estimasi Budget</p>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedCustomReq.budget_range || '-'}</p>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Status Permintaan</label>
                <select
                  value={customReqStatus}
                  onChange={(e) => setCustomReqStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2] bg-white"
                >
                  <option value="pending">Pending (Menunggu Review)</option>
                  <option value="in_review">In Review (Sedang Dikaji Tim Analis)</option>
                  <option value="quoted">Quoted (Penawaran Telah Dikirim)</option>
                  <option value="in_progress">In Progress (Pengerjaan Riset)</option>
                  <option value="completed">Completed (Selesai)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Admin / Rekomendasi Internal</label>
                <textarea
                  rows={3}
                  value={customReqNotes}
                  onChange={(e) => setCustomReqNotes(e.target.value)}
                  placeholder="Catatan penugasan Senior Fellow, rincian penawaran biaya, atau no kontak klien..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#1976D2]"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setCustomReqModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
              >
                Tutup
              </button>
              <button
                onClick={handleSaveCustomReq}
                className="px-5 py-2 rounded-xl bg-[#1976D2] hover:bg-[#1562AF] text-white font-bold shadow-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ORDER DETAIL */}
      {/* ============================================================== */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Pesanan #{selectedOrder?.order_number || selectedOrder?.number || selectedOrder?.id}</h3>
                <p className="text-[11px] text-slate-500">
                  Status: {(selectedOrder?.payment_status || selectedOrder?.status || 'pending').toString().toUpperCase()}
                </p>
              </div>
              <button onClick={() => setOrderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderLoading ? (
              <div className="py-12 text-center text-slate-400">Memuat detail pesanan...</div>
            ) : selectedOrder ? (
              <div className="mt-4 space-y-4">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-900">
                    Pembeli: {selectedOrder.customer_name || selectedOrder.user?.name || selectedOrder.user_name || 'Pembeli'}
                  </p>
                  <p className="text-slate-500">
                    Email: {selectedOrder.customer_email || selectedOrder.user?.email || selectedOrder.user_email || '-'}
                  </p>
                  {selectedOrder.corporate_name && (
                    <p className="text-[#1562AF] font-semibold flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#1976D2] shrink-0" />
                      <span>Entitas: {selectedOrder.corporate_name}</span>
                    </p>
                  )}
                  {selectedOrder.tax_id && (
                    <p className="text-slate-600 font-mono">NPWP: {selectedOrder.tax_id}</p>
                  )}
                  <p className="text-slate-400 text-[10px]">
                    Metode: {selectedOrder.payment_provider || '-'} ({selectedOrder.payment_method || '-'})
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-2">Item Riset yang Dibeli</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                        <span className="font-medium text-slate-800">{item.product_title || item.title}</span>
                        <span className="font-bold text-slate-900">{formatRupiah(item.price)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex justify-between items-center font-black text-slate-900 text-sm">
                    <span>Total Pembayaran</span>
                    <span className="text-[#1562AF]">{formatRupiah(selectedOrder.total ?? selectedOrder.total_amount ?? 0)}</span>
                  </div>
                </div>

                {(selectedOrder.payment_status || selectedOrder.status) !== 'paid' && (
                  <div className="pt-3 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => handleMarkOrderPaid(selectedOrder.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      Tandai Lunas Manual
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: USER ENTITLEMENT DETAIL & GRANT */}
      {/* ============================================================== */}
      {userModalOpen && selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Hak Akses: {selectedUserDetail.user?.name}</h3>
                <p className="text-[11px] text-slate-500">{selectedUserDetail.user?.email}</p>
              </div>
              <button onClick={() => setUserModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <form onSubmit={handleGrantAccess} className="p-3 rounded-xl bg-[#D1E4F6]/40/70 border border-blue-100 flex gap-2">
                <select
                  required
                  value={grantProductId}
                  onChange={(e) => setGrantProductId(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none"
                >
                  <option value="">-- Berikan Akses Riset Manual --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-[#1976D2] text-white font-bold text-xs shrink-0"
                >
                  Beri Akses
                </button>
              </form>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Entitlement Aktif ({selectedUserDetail.entitlements?.length || 0})</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedUserDetail.entitlements?.map((ent: any) => (
                    <div key={ent.id} className="p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                      <span className="font-medium text-slate-800">{ent.product?.title || `Produk #${ent.product_id}`}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">Aktif</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CATEGORY EDIT */}
      {/* ============================================================== */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-xs">
            <h3 className="font-black text-slate-900 text-sm mb-3">
              {editingCategory ? 'Edit Kategori Riset' : 'Tambah Kategori Sektor Baru'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Contoh: Banking & Financial Services"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Sektor</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Riset industri perbankan, likuiditas, dan fintech domestik..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1976D2] text-white font-bold"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: AUTHOR / SENIOR PARTNER EDIT */}
      {/* ============================================================== */}
      {authorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-xs">
            <h3 className="font-black text-slate-900 text-sm mb-3">
              {editingAuthor ? 'Edit Profil Penulis / Fellow' : 'Tambah Senior Partner Baru'}
            </h3>
            <form onSubmit={handleSaveAuthor} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  value={authorForm.name}
                  onChange={(e) => setAuthorForm({ ...authorForm, name: e.target.value })}
                  placeholder="Contoh: Dr. Rizal Pratama, CFA"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jabatan / Posisi</label>
                  <input
                    type="text"
                    value={authorForm.position}
                    onChange={(e) => setAuthorForm({ ...authorForm, position: e.target.value })}
                    placeholder="Senior Research Fellow"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kredensial Otoritas</label>
                  <input
                    type="text"
                    value={authorForm.credentials}
                    onChange={(e) => setAuthorForm({ ...authorForm, credentials: e.target.value })}
                    placeholder="Ph.D. Economics, CFA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="seniorPartnerCheck"
                  checked={authorForm.is_senior_partner}
                  onChange={(e) => setAuthorForm({ ...authorForm, is_senior_partner: e.target.checked })}
                  className="rounded text-[#1976D2]"
                />
                <label htmlFor="seniorPartnerCheck" className="font-bold text-slate-800">
                  Tetapkan sebagai Senior Fellow (Tampil di Credential Badge)
                </label>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Biografi Profesional</label>
                <textarea
                  rows={2}
                  value={authorForm.bio}
                  onChange={(e) => setAuthorForm({ ...authorForm, bio: e.target.value })}
                  placeholder="Pengalaman lebih dari 15 tahun di riset perbankan dan makroekonomi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthorModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#1976D2] text-white font-bold"
                >
                  Simpan Profil Fellow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
