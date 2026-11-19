import React, { createContext, useContext } from 'react';
import type { CmsResponsiveConfig, ViewportMode } from '@/types/cms/builder';

interface CmsViewportContextType {
  /** null means live public site (uses native CSS media queries). 'desktop'|'tablet'|'mobile' means Builder Canvas simulation. */
  viewport: ViewportMode | null;
}

const CmsViewportContext = createContext<CmsViewportContextType>({ viewport: null });

export const CmsViewportProvider: React.FC<{
  viewport: ViewportMode | null;
  children: React.ReactNode;
}> = ({ viewport, children }) => (
  <CmsViewportContext.Provider value={{ viewport }}>{children}</CmsViewportContext.Provider>
);

export const useCmsViewport = () => useContext(CmsViewportContext);

export function isSectionVisibleInViewport(
  viewport: ViewportMode | null,
  responsive?: CmsResponsiveConfig
): boolean {
  if (!viewport || !responsive) return true;
  const cfg = responsive[viewport];
  if (!cfg) return true;
  return cfg.visible !== false;
}

export function getResponsiveGridClass(
  viewport: ViewportMode | null,
  responsive?: CmsResponsiveConfig,
  defaults: { desktop: number; tablet: number; mobile: number } = { desktop: 4, tablet: 2, mobile: 1 }
): string {
  const dCols = responsive?.desktop?.columns || defaults.desktop;
  const tCols = responsive?.tablet?.columns || defaults.tablet;
  const mCols = responsive?.mobile?.columns || defaults.mobile;

  const colMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  if (viewport === 'mobile') return colMap[mCols] || 'grid-cols-1';
  if (viewport === 'tablet') return colMap[tCols] || 'grid-cols-2';
  if (viewport === 'desktop') return colMap[dCols] || 'grid-cols-4';

  const smMap: Record<number, string> = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  };
  const lgMap: Record<number, string> = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  };

  return `${colMap[mCols] || 'grid-cols-1'} ${smMap[tCols] || 'sm:grid-cols-2'} ${lgMap[dCols] || 'lg:grid-cols-4'}`;
}

