import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Lang, type T, translations } from "./translations";

const LS_KEY = "wb_lang";

function getInitialLang(): Lang {
  const stored = localStorage.getItem(LS_KEY) as Lang | null;
  if (stored && stored in translations) return stored;
  // Auto-detect browser language as fallback
  const browser = navigator.language.slice(0, 2).toLowerCase();
  if (browser in translations) return browser as Lang;
  return "it";
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LangContext = createContext<LangContextValue>({
  lang: "it",
  setLang: () => {},
  t: translations.it,
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  // <html lang> follows the language on screen: a screen reader picks its voice (and a browser its
  // hyphenation and quotation rules) from it, and index.html can only declare one language.
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(LS_KEY, l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
