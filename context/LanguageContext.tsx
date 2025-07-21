'use client'
import React, { createContext, useContext, useState, useEffect } from "react";

// Define los idiomas soportados
type Language = "en" | "es";
type Translations = Record<string, any>;

const LanguageContext = createContext<{
  language: Language;
  translations: Translations;
  changeLanguage: (lang: Language) => void;
}>({
  language: "es",
  translations: {},
  changeLanguage: () => {},
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>("es");
  const [translations, setTranslations] = useState<Translations>({});

  useEffect(() => {
    import(`../language/${language}.json`).then((mod) => {
      setTranslations(mod.default);
    });
  }, [language]);

  const changeLanguage = (lang: Language) => setLanguage(lang);

  return (
    <LanguageContext.Provider value={{ language, translations, changeLanguage }}>
      {Object.keys(translations).length > 0 ? children : null}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
