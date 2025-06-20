"use client"

import React, { createContext, useState, useContext } from 'react';
import es from './es';
import en from './en';

const LanguageContext = createContext(); // First define LanguageContext

const LanguageProvider = ({ children }) => { // Then define LanguageProvider
  const [language, setLanguage] = useState('en');
  const [translations, setTranslations] = useState(en);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    setTranslations(lang === 'es' ? es : en);
  };

  return (
    <LanguageContext.Provider value={{ language, translations, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageProvider, LanguageContext };
export const useLanguage = () => useContext(LanguageContext);
