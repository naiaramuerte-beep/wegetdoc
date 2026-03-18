/* =============================================================
   PDFPro LanguageContext
   Provides current language, translations and language switcher
   ============================================================= */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  LangCode,
  TranslationKeys,
  translations,
  detectLangFromPath,
  detectLangFromBrowser,
  buildLangUrl,
  LANGUAGES,
} from "@/lib/i18n";
import { useLocation } from "wouter";

interface LanguageContextValue {
  lang: LangCode;
  t: TranslationKeys;
  setLang: (code: LangCode) => void;
  switchLang: (code: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();

  // Detect initial language from URL path
  const getInitialLang = (): LangCode => {
    const fromPath = detectLangFromPath(window.location.pathname);
    // If URL has no lang prefix, try browser language
    if (window.location.pathname === "/" || window.location.pathname === "") {
      return detectLangFromBrowser();
    }
    return fromPath;
  };

  const [lang, setLangState] = useState<LangCode>(getInitialLang);

  // Update lang when URL changes
  useEffect(() => {
    const fromPath = detectLangFromPath(window.location.pathname);
    setLangState(fromPath);
  }, [location]);

  const setLang = useCallback((code: LangCode) => {
    setLangState(code);
  }, []);

  // Switch language and navigate to the same page in new lang
  const switchLang = useCallback((code: LangCode) => {
    setLangState(code);
    const currentPath = window.location.pathname;
    const newUrl = buildLangUrl(code, currentPath);
    navigate(newUrl);
  }, [navigate]);

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, t, setLang, switchLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export { LANGUAGES };
