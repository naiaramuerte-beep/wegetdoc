/* =============================================================
   EditorPDF LanguageContext
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

  // Resolve language: an explicit /xx/ prefix wins; otherwise fall back to the
  // browser language. This is what makes Ukrainian/Russian/Polish/etc. ad
  // traffic that lands on a NON-prefixed URL see their own language instead of
  // Spanish. Previously the effect below reset every navigation to "es" for any
  // path without a prefix, which is why UA traffic saw Spanish and never
  // engaged with the paywall.
  const langFromPathOrBrowser = (): LangCode => {
    const m = window.location.pathname.match(/^\/([a-z]{2})(\/|$)/);
    if (m && LANGUAGES.find((l) => l.code === m[1])) return m[1] as LangCode;
    return detectLangFromBrowser();
  };

  const [lang, setLangState] = useState<LangCode>(langFromPathOrBrowser);

  // Update lang when URL changes — same rule (prefix wins, else browser).
  useEffect(() => {
    setLangState(langFromPathOrBrowser());
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
