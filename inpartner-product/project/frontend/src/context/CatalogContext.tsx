import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface CatalogContextType {
  banners: any[];
  popular: any[];
  latest: any[];
  featured: any[];
  categories: any[];
  authors: any[];
  stats: any;
  loading: boolean;
  fetchHome: (force?: boolean) => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [banners, setBanners] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [latest, setLatest] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchHome = async (force = false) => {
    if (fetched && !force) return;
    setLoading(true);
    try {
      const res = await api.get('/home');
      const d = res.data;
      setBanners(d.banners || []);
      setPopular(d.popular || []);
      setLatest(d.latest || []);
      setFeatured(d.featured || []);
      setCategories(d.categories || []);
      setAuthors(d.authors || []);
      setStats(d.stats || {});
      setFetched(true);
    } catch (e) {
      console.error('Fetch home catalog error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHome();
  }, []);

  return (
    <CatalogContext.Provider value={{ banners, popular, latest, featured, categories, authors, stats, loading, fetchHome }}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within CatalogProvider');
  return context;
};
