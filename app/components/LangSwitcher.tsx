"use client";

import { useState, useEffect } from "react";
import { getLocale, setLocale, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";

const LANG_LABELS: Record<Locale, string> = {
  en: "EN",
  ko: "한",
  ja: "日",
};

export default function LangSwitcher() {
  const [locale, setLocal] = useState<Locale>("en");

  useEffect(() => {
    setLocal(getLocale());
    const handler = () => setLocal(getLocale());
    window.addEventListener("locale-change", handler);
    return () => window.removeEventListener("locale-change", handler);
  }, []);

  const cycle = () => {
    const order: Locale[] = ["en", "ko", "ja"];
    const next = order[(order.indexOf(locale) + 1) % order.length];
    setLocale(next);
    setLocal(next);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition hover:opacity-80"
      style={{
        background: "var(--light-blue)",
        color: "var(--primary)",
        border: "1px solid var(--border-soft)",
      }}
    >
      <Globe className="h-3.5 w-3.5" />
      {LANG_LABELS[locale]}
    </button>
  );
}
