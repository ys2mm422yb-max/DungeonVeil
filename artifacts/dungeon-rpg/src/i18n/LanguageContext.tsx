import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, Translations, translations } from './translations';

const STORAGE_KEY = 'dungeon-veil-language';

interface LanguageContextValue {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  hasChosen: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'de' || stored === 'en') ? stored : 'en';
  });

  const [hasChosen, setHasChosen] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setHasChosen(true);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, hasChosen }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
