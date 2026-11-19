import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, ShieldAlert } from 'lucide-react';
import { useCatalog } from '@/context/CatalogContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSiteConfig } from '@/context/SiteConfigContext';
import { cmsApi } from '@/services/cms/cmsApi';
import { createDefaultPageTree } from '@/services/cms/componentRegistry';
import { HomepageSectionRenderer } from '@/components/cms-renderer/HomepageSectionRenderer';
import { CmsViewportProvider } from '@/components/cms-renderer/CmsViewportContext';
import type { CmsSectionNode, CmsThemeConfig } from '@/types/cms/builder';

export const Home: React.FC = () => {
  const { popular, latest, featured, categories, banners, fetchHome } = useCatalog();
  const { locale } = useLanguage();
  const { theme: siteTheme } = useSiteConfig();
  const [searchParams] = useSearchParams();
  const wantsPreview = searchParams.get('preview') === 'cms' || searchParams.get('preview') === '1';

  const [cmsSections, setCmsSections] = useState<CmsSectionNode[]>([]);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewDenied, setPreviewDenied] = useState(false);
  const [pageTheme, setPageTheme] = useState<CmsThemeConfig | null>(null);
  const [cmsLoaded, setCmsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchCmsData = async () => {
      try {
        const res = await cmsApi.getHomepage(locale, wantsPreview);
        if (!isMounted) return;
        const data = res.data || {};
        if (Array.isArray(data.sections)) {
          setCmsSections(data.sections);
        }
        setIsPreviewActive(Boolean(data.is_preview));
        setPreviewDenied(Boolean(data.preview_denied));
        if (data.theme) setPageTheme(data.theme);
      } catch (err) {
        console.error('Failed to load CMS homepage sections', err);
      } finally {
        if (isMounted) setCmsLoaded(true);
      }
    };

    fetchCmsData();
    fetchHome();

    const handleCmsPublished = () => {
      fetchCmsData();
    };
    window.addEventListener('inpartner:cms-published', handleCmsPublished);

    return () => {
      isMounted = false;
      window.removeEventListener('inpartner:cms-published', handleCmsPublished);
    };
  }, [locale, wantsPreview]);

  const activeTheme = pageTheme || siteTheme;
  const spacingCls =
    activeTheme?.layout?.section_spacing === 'compact'
      ? 'space-y-10 sm:space-y-14 py-4 sm:py-6'
      : activeTheme?.layout?.section_spacing === 'spacious'
      ? 'space-y-20 sm:space-y-28 py-8 sm:py-14'
      : 'space-y-16 sm:space-y-24 py-6 sm:py-10';

  const sectionsToRender: CmsSectionNode[] =
    cmsSections.length > 0
      ? [...cmsSections].filter((s) => s.visible !== false && s.is_active !== false).sort((a, b) => (a.sort_order ?? a.order ?? 0) - (b.sort_order ?? b.order ?? 0))
      : cmsLoaded
      ? createDefaultPageTree().sections
      : createDefaultPageTree().sections;

  return (
    <CmsViewportProvider viewport={null}>
      <div className={spacingCls}>
        {/* Authenticated Draft Preview Indicator Banner */}
        {isPreviewActive && (
          <div className="sticky top-20 z-30 max-w-4xl mx-auto bg-amber-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Mode Pratinjau Draf CMS Aktif — Menampilkan perubahan draf yang belum dipublikasikan.</span>
            </div>
            <Link to="/" className="underline text-white hover:text-amber-100 text-[11px] shrink-0">
              Tutup Pratinjau
            </Link>
          </div>
        )}

        {wantsPreview && previewDenied && (
          <div className="max-w-4xl mx-auto bg-slate-800 text-white text-xs font-medium py-2 px-4 rounded-xl shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Pratinjau draf hanya dapat diakses oleh Administrator terautentikasi. Menampilkan versi publik terbaru.</span>
            </div>
            <Link to="/login?redirect=/?preview=cms" className="underline text-[#B2D1F0] text-[11px] shrink-0">
              Masuk Admin
            </Link>
          </div>
        )}

        {sectionsToRender.map((sec) => (
          <HomepageSectionRenderer
            key={sec.id || sec.key}
            section={sec}
            catalog={{
              featured,
              latest,
              popular,
              categories,
              banners,
            }}
          />
        ))}
      </div>
    </CmsViewportProvider>
  );
};

export default Home;
