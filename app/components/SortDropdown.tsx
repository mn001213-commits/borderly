"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpDown, Check } from "lucide-react";

export type SortOption = {
  key: string;
  label: string;
  icon?: React.ReactNode;
};

type Props = {
  options: SortOption[];
  value: string;
  onChange: (key: string) => void;
};

export default function SortDropdown({ options, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
        style={{
          background: "var(--bg-card)",
          color: "var(--text-secondary)",
          boxShadow: "var(--ring-border), var(--shadow-xs)",
        }}
      >
        <ArrowUpDown className="h-4 w-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl py-1.5 b-scale-in"
          style={{
            background: "var(--bg-card)",
            boxShadow: "var(--shadow-lg), 0 0 0 1px var(--border-subtle)",
          }}
        >
          {options.map((opt) => {
            const isActive = opt.key === value;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  onChange(opt.key);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm b-list-item"
                style={{
                  color: isActive ? "var(--primary)" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                <span className="flex-1 text-left">{opt.label}</span>
                {isActive && <Check className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
