import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { cmsApi } from '@/services/cms/cmsApi';
import {
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_THEME_CONFIG,
} from '@/services/cms/componentRegistry';
import type { CmsFooterConfig, CmsHeaderConfig, CmsSeoConfig, CmsThemeConfig } from '@/types/cms/builder';

interface SiteConfigContextType {
  header: CmsHeaderConfig;
  footer: CmsFooterConfig;
  theme: CmsThemeConfig;
  seo: CmsSeoConfig;
  siteSettings: Record<string, any>;
  loading: boolean;
  refreshSiteConfig: () => Promise<void>;
}

const DEFAULT_SEO: CmsSeoConfig = {
  meta_title: 'INPARTNER — Digital Knowledge & Strategic Intelligence Platform',
  meta_description:
    'Akses ribuan paper penelitian, jurnal akademik, analisis pasar, dan ebook eksekutif untuk mempercepat pemahaman dan pengambilan keputusan strategis Anda.',
};

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

export function buildThemeCssVars(theme: CmsThemeConfig): React.CSSProperties {
  const colors = theme?.colors || DEFAULT_THEME_CONFIG.colors;
  const typo = theme?.typography || DEFAULT_THEME_CONFIG.typography;

  const fontMap: Record<string, string> = {
    Inter: "'Inter', system-ui, -apple-system, sans-serif",
    'Plus Jakarta Sans': "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    'DM Sans': "'DM Sans', 'Inter', system-ui, sans-serif",
    System: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    'PT Sans': "'PT Sans', 'Inter', sans-serif",
    'Source Serif 4': "'Source Serif 4', Georgia, serif",
  };

  return {
    '--color-primary': colors.primary || '#1976D2',
    '--color-primary-hover': colors.primary_hover || '#1562AF',
    '--color-primary-pressed': colors.primary_pressed || '#0C3B69',
    '--color-primary-surface': colors.primary_surface || '#D1E4F6',
    '--color-primary-border': colors.primary_border || '#B2D1F0',
    '--color-primary-focus': colors.primary_surface || '#D1E4F6',
    '--bg-canvas': colors.canvas || '#F8FAFC',
    '--bg-surface': colors.surface || '#FFFFFF',
    '--text-heading': colors.text_heading || '#0F172A',
    '--text-body': colors.text_body || '#334155',
    '--text-secondary': colors.text_muted || '#64748B',
    '--border-light': colors.border || '#E2E8F0',
    '--font-primary': fontMap[typo.font_primary] || fontMap.Inter,
    '--font-supporting': fontMap[typo.font_supporting] || fontMap['PT Sans'],
    '--cms-primary': colors.primary || '#1976D2',
    '--cms-primary-hover': colors.primary_hover || '#1562AF',
    '--cms-primary-surface': colors.primary_surface || '#D1E4F6',
    '--cms-primary-border': colors.primary_border || '#B2D1F0',
    '--cms-secondary': colors.secondary || '#0F172A',
    '--cms-accent': colors.accent || '#1976D2',
    '--cms-canvas': colors.canvas || '#F8FAFC',
    '--cms-surface': colors.surface || '#FFFFFF',
    '--cms-text-heading': colors.text_heading || '#0F172A',
    '--cms-text-body': colors.text_body || '#334155',
    '--cms-text-muted': colors.text_muted || '#64748B',
    '--cms-border': colors.border || '#E2E8F0',
    '--cms-body-size': `${typo.body_size || 16}px`,
    '--cms-line-height': String(typo.line_height || 1.6),
  } as React.CSSProperties;
}

export const SiteConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [header, setHeader] = useState<CmsHeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [footer, setFooter] = useState<CmsFooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [theme, setTheme] = useState<CmsThemeConfig>(DEFAULT_THEME_CONFIG);
  const [seo, setSeo] = useState<CmsSeoConfig>(DEFAULT_SEO);
  const [siteSettings, setSiteSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const refreshSiteConfig = useCallback(async () => {
    try {
      const res = await cmsApi.getPublicSettings();
      const d = res.data || {};
      if (d.header) setHeader({ ...DEFAULT_HEADER_CONFIG, ...d.header });
      if (d.footer) setFooter({ ...DEFAULT_FOOTER_CONFIG, ...d.footer });
      if (d.theme) {
        setTheme({
          colors: { ...DEFAULT_THEME_CONFIG.colors, ...(d.theme.colors || {}) },
          typography: { ...DEFAULT_THEME_CONFIG.typography, ...(d.theme.typography || {}) },
          layout: { ...DEFAULT_THEME_CONFIG.layout, ...(d.theme.layout || {}) },
        });
      }
      if (d.seo) setSeo({ ...DEFAULT_SEO, ...d.seo });
      if (d.data) setSiteSettings(d.data);
    } catch {
      // Keep safe defaults if API unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSiteConfig();
    const onPublished = () => refreshSiteConfig();
    window.addEventListener('inpartner:cms-published', onPublished);
    return () => window.removeEventListener('inpartner:cms-published', onPublished);
  }, [refreshSiteConfig]);

  // Apply published theme CSS tokens on root only for non-admin public routes
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) return;
    const vars = buildThemeCssVars(theme) as Record<string, string>;
    const root = document.documentElement;
    Object.entries(vars).forEach(([k, v]) => {
      if (v) root.style.setProperty(k, v);
    });
    if (seo.meta_title) {
      document.title = seo.meta_title;
    }
  }, [theme, seo]);

  return (
    <SiteConfigContext.Provider
      value={{ header, footer, theme, seo, siteSettings, loading, refreshSiteConfig }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) {
    return {
      header: DEFAULT_HEADER_CONFIG,
      footer: DEFAULT_FOOTER_CONFIG,
      theme: DEFAULT_THEME_CONFIG,
      seo: DEFAULT_SEO,
      siteSettings: {},
      loading: false,
      refreshSiteConfig: async () => {},
    };
  }
  return ctx;
};

