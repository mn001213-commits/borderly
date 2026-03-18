"use client";

import { useState, useEffect } from "react";
import { getLocale, setLocale, type Locale } from "@/lib/i18n";

const LANGS: { key: Locale; flag: string; label: string }[] = [
  { key: "en", flag: "🇺🇸", label: "EN" },
  { key: "ko", flag: "🇰🇷", label: "한국어" },
  { key: "ja", flag: "🇯🇵", label: "日本語" },
];

export default function LangSwitcher() {
  const [locale, setLocal] = useState<Locale>("en");

  useEffect(() => {
    setLocal(getLocale());
    const handler = () => setLocal(getLocale());
    window.addEventListener("locale-change", handler);
    return () => window.removeEventListener("locale-change", handler);
  }, []);

  const pick = (lang: Locale) => {
    setLocale(lang);
    setLocal(lang);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl p-1" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => pick(l.key)}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition"
          style={{
            background: locale === l.key ? "var(--primary)" : "transparent",
            color: locale === l.key ? "#fff" : "var(--text-secondary)",
          }}
        >
          <span className="text-sm">{l.flag}</span>
          {l.label}
        </button>
      ))}
    </div>
  );
}
