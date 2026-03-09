"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { translateText, getBrowserLang } from "@/lib/translateService";

export default function TranslateButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleTranslate = async () => {
    if (translated) {
      setShow((prev) => !prev);
      return;
    }

    setLoading(true);
    try {
      const lang = getBrowserLang();
      const result = await translateText(text, lang);
      setTranslated(result);
      setShow(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className={className}>
      <button
        type="button"
        onClick={handleTranslate}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
        title={show ? "Show original" : "Translate"}
      >
        <Languages className="h-3.5 w-3.5" />
        {loading ? "..." : show ? "Original" : "Translate"}
      </button>

      {show && translated && (
        <div className="mt-1 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
          {translated}
        </div>
      )}
    </span>
  );
}
