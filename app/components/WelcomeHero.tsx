"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, CalendarDays, Building2, MessageCircle, ArrowRight, X } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

const HERO_DISMISS_KEY = "borderly_hero_dismissed";

type FeatureCard = {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  titleKey: string;
  descKey: string;
  href: string;
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    icon: FileText,
    color: "#4A8FE7",
    bgColor: "rgba(74,143,231,0.12)",
    titleKey: "hero.feature.posts.title",
    descKey: "hero.feature.posts.desc",
    href: "/browse",
  },
  {
    icon: CalendarDays,
    color: "#7B2FF2",
    bgColor: "rgba(123,47,242,0.12)",
    titleKey: "hero.feature.meet.title",
    descKey: "hero.feature.meet.desc",
    href: "/meet",
  },
  {
    icon: Building2,
    color: "#06D6A0",
    bgColor: "rgba(6,214,160,0.12)",
    titleKey: "hero.feature.ngo.title",
    descKey: "hero.feature.ngo.desc",
    href: "/ngo",
  },
  {
    icon: MessageCircle,
    color: "#F77F00",
    bgColor: "rgba(247,127,0,0.12)",
    titleKey: "hero.feature.chat.title",
    descKey: "hero.feature.chat.desc",
    href: "/chats",
  },
];

export default function WelcomeHero() {
  const { t } = useT();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flicker
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDismissed = typeof window !== "undefined"
      ? window.localStorage.getItem(HERO_DISMISS_KEY) === "true"
      : false;
    setDismissed(isDismissed);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(HERO_DISMISS_KEY, "true");
    } catch { /* ignore */ }
  };

  if (!mounted || dismissed) return null;

  return (
    <div className="b-animate-in mb-6">
      {/* Hero Card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #4A8FE7 0%, #7B2FF2 100%)",
          boxShadow: "0 8px 32px rgba(74,143,231,0.3)",
        }}
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/20"
          style={{ color: "rgba(255,255,255,0.7)" }}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Decorative circles */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🐧</span>
            <span className="text-sm font-semibold tracking-wider text-white/80 uppercase">BORDERLY</span>
          </div>

          <h1 className="text-2xl font-bold text-white leading-tight mb-2">
            {t("hero.tagline")}
          </h1>
          <p className="text-sm text-white/80 leading-relaxed mb-5">
            {t("hero.subtitle")}
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/signup"
              id="hero-cta-signup"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold no-underline transition hover:opacity-90 active:scale-95"
              style={{ background: "#fff", color: "#4A8FE7" }}
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-medium transition hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.35)" }}
            >
              {t("hero.browse")}
            </button>
          </div>

          {/* Badge */}
          <p className="mt-4 text-xs text-white/60">
            {t("hero.badge")}
          </p>
        </div>
      </div>

      {/* Login link */}
      <div className="mt-3 text-center">
        <Link
          href="/login"
          id="hero-login-link"
          className="text-sm no-underline transition hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          {t("hero.dismiss")}
        </Link>
      </div>

      {/* Feature cards */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FEATURE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="block no-underline"
            >
              <div
                className="b-card b-card-hover b-animate-in flex flex-col items-start gap-2 p-4 h-full"
                style={{ cursor: "pointer" }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: card.bgColor }}
                >
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-0.5" style={{ color: "var(--deep-navy)" }}>
                    {t(card.titleKey)}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {t(card.descKey)}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
