"use client";
import { useState, useEffect } from "react";
import { getLocale, type Locale } from "@/lib/i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(getLocale());

    const handler = () => setLocaleState(getLocale());
    window.addEventListener("locale-change", handler);
    return () => window.removeEventListener("locale-change", handler);
  }, []);

  return locale;
}
