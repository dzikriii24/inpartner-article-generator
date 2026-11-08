import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, translations } from '@/i18n/translations';

interface LanguageContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: string, fallback?: string) => string;
  formatPrice: (amount: number) => string;
  formatDate: (dateStr?: string | null) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('inpartner_lang') as Locale;
    return saved === 'en' || saved === 'ko' || saved === 'id' ? saved : 'id';
  });

  const setLocale = (newLoc: Locale) => {
    setLocaleState(newLoc);
    localStorage.setItem('inpartner_lang', newLoc);
    document.documentElement.lang = newLoc;
  };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = (key: string, fallback?: string): string => {
    const dict = translations[locale];
    if (dict && dict[key]) {
      return dict[key];
    }
    // Fallback to Indonesian if missing in current locale
    if (locale !== 'id' && translations['id']?.[key]) {
      return translations['id'][key];
    }
    // Fallback to English if missing in ID
    if (translations['en']?.[key]) {
      return translations['en'][key];
    }
    return fallback !== undefined ? fallback : key;
  };

  const formatPrice = (amount: number): string => {
    if (amount === 0) {
      return t('catalog.free_badge', 'Gratis');
    }
    if (locale === 'en') {
      return `IDR ${amount.toLocaleString('en-US')}`;
    }
    if (locale === 'ko') {
      return `IDR ${amount.toLocaleString('ko-KR')}`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (locale === 'en') {
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      }
      if (locale === 'ko') {
        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, formatPrice, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

