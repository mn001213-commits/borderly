"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getLocale, t as rawT, type Locale } from "@/lib/i18n";

type LangCtx = {
  locale: Locale;
  t: (key: string) => string;
};

const LangContext = createContext<LangCtx>({
  locale: "en",
  t: rawT,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    setLocale(getLocale());
    const handler = () => setLocale(getLocale());
    window.addEventListener("locale-change", handler);
    return () => window.removeEventListener("locale-change", handler);
  }, []);

  const t = useCallback(
    (key: string) => rawT(key, locale),
    [locale]
  );

  return (
    <LangContext.Provider value={{ locale, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useT() {
  return useContext(LangContext);
}
