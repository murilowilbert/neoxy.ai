import React, { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'pt' | 'en' | 'es';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'pt',
  setLang: () => {}
});

const HTML_LANG: Record<Language, string> = {
  pt: 'pt-BR',
  en: 'en',
  es: 'es'
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('neoxy_lang');
    if (saved === 'pt' || saved === 'en' || saved === 'es') return saved;
    return 'pt';
  });

  useEffect(() => {
    document.documentElement.lang = HTML_LANG[lang];
    localStorage.setItem('neoxy_lang', lang);
  }, [lang]);

  const setLang = (next: Language) => setLangState(next);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
