
import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'tl';

interface Translations {
  [key: string]: {
    en: string;
    tl: string;
  };
}

const translations: Translations = {
  managePersonnel: { en: 'Manage Personnel', tl: 'Pamahalaan ang Tauhan' },
  manageAccess: { en: 'Manage system access and roles.', tl: 'Pamahalaan ang access at mga tungkulin sa system.' },
  addPersonnel: { en: 'Add Personnel', tl: 'Magdagdag ng Tauhan' },
  officer: { en: 'Officer', tl: 'Opisyal' },
  role: { en: 'Role', tl: 'Tungkulin' },
  badgeId: { en: 'Badge ID', tl: 'Badge ID' },
  actions: { en: 'Actions', tl: 'Mga Aksyon' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: { [key: string]: string };
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = Object.keys(translations).reduce((acc, key) => {
    acc[key] = translations[key][language];
    return acc;
  }, {} as { [key: string]: string });

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
