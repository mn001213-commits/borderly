"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

type Props = {
  onContinue: () => void;
};

export default function OnboardingSuccess({ onContinue }: Props) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const missions = [
    { label: t("onboardingSuccess.mission1"), done: false },
    { label: t("onboardingSuccess.mission2"), done: false },
    { label: t("onboardingSuccess.mission3"), done: false },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="b-card b-animate-in mx-auto w-full max-w-sm p-8 text-center"
        style={{
          background: "var(--bg-card)",
          boxShadow: "0 24px 64px rgba(74,143,231,0.2)",
        }}
      >
        {/* Celebration icon */}
        <div
          className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: "linear-gradient(135deg, #4A8FE7 0%, #7B2FF2 100%)",
            boxShadow: "0 8px 24px rgba(74,143,231,0.35)",
          }}
        >
          <span className="text-3xl">🎉</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold mb-1" style={{ color: "var(--deep-navy)" }}>
          {t("onboardingSuccess.title")}
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {t("onboardingSuccess.subtitle")}
        </p>

        {/* Mission preview */}
        <div
          className="rounded-xl p-4 mb-6 text-left"
          style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            {t("onboardingSuccess.missionLabel")}
          </div>
          <div className="space-y-2">
            {missions.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {m.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                ) : (
                  <Circle className="h-4 w-4 shrink-0" style={{ color: "var(--border-soft)" }} />
                )}
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          id="onboarding-success-cta"
          onClick={onContinue}
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4A8FE7 0%, #7B2FF2 100%)" }}
        >
          {t("onboardingSuccess.cta")}
        </button>
      </div>
    </div>
  );
}
