"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/app/components/LangProvider";
import { useAuth } from "@/app/components/AuthProvider";
import { X, ChevronRight } from "lucide-react";

const GUIDE_PENDING_KEY = "borderly_guide_pending";

type TourStep = {
  titleKey: string;
  descKey: string;
  mobileIcon: string;
  desktopLabelKey: string;
  href: string;
  anchorDesktop: "right-top" | "right-center";
  // Which nav item index to highlight (0-4 for mobile, -1 for none)
  mobileNavIndex: number;
};

const TOUR_STEPS: TourStep[] = [
  {
    titleKey: "guideTour.step1.title",
    descKey: "guideTour.step1.desc",
    mobileIcon: "🏠",
    desktopLabelKey: "nav.home",
    href: "/browse",
    anchorDesktop: "right-top",
    mobileNavIndex: 1,
  },
  {
    titleKey: "guideTour.step2.title",
    descKey: "guideTour.step2.desc",
    mobileIcon: "📅",
    desktopLabelKey: "nav.meet",
    href: "/meet",
    anchorDesktop: "right-top",
    mobileNavIndex: 2,
  },
  {
    titleKey: "guideTour.step3.title",
    descKey: "guideTour.step3.desc",
    mobileIcon: "🏢",
    desktopLabelKey: "nav.ngo",
    href: "/ngo",
    anchorDesktop: "right-top",
    mobileNavIndex: 4,
  },
  {
    titleKey: "guideTour.step4.title",
    descKey: "guideTour.step4.desc",
    mobileIcon: "👤",
    desktopLabelKey: "nav.profile",
    href: "/profile",
    anchorDesktop: "right-top",
    mobileNavIndex: -1, // profile is in top bar on mobile
  },
];

const TOOLTIP_W = 260;
const TOOLTIP_MARGIN = 8;

export default function GuideTour() {
  const { t } = useT();
  const { user, completeGuideTour } = useAuth();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);
  // Exact position of the highlighted nav item (measured from DOM)
  const [navRect, setNavRect] = useState<{ left: number; width: number } | null>(null);
  const [viewportW, setViewportW] = useState(0);

  useEffect(() => {
    // Wait for user to load; only check once
    if (!user) return;
    if (checkedRef.current) return;
    checkedRef.current = true;

    // Already completed on this account — skip
    if (user.guideTourCompleted) return;

    // Only show if onboarding/signup triggered the pending flag
    const pending = typeof window !== "undefined"
      ? window.localStorage.getItem(GUIDE_PENDING_KEY) === "true"
      : false;
    if (!pending) return;

    try { window.localStorage.removeItem(GUIDE_PENDING_KEY); } catch { /* ignore */ }

    setActive(true);
    const check = () => setIsDesktop(window.innerWidth >= 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [user]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  // Measure the exact position of the target nav item in the DOM
  useEffect(() => {
    if (!active || isDesktop) return;

    const navIndex = TOUR_STEPS[currentStep]?.mobileNavIndex;
    if (navIndex === undefined || navIndex < 0) {
      setNavRect(null);
      setViewportW(window.innerWidth);
      return;
    }

    const measure = () => {
      const el = document.getElementById(`bottom-nav-${navIndex}`);
      if (el) {
        const r = el.getBoundingClientRect();
        setNavRect({ left: r.left, width: r.width });
      }
      setViewportW(window.innerWidth);
    };

    // Small delay to ensure the nav has rendered on the new route
    const timer = setTimeout(measure, 50);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [active, currentStep, isDesktop]);

  const handleComplete = useCallback(() => {
    completeGuideTour(); // Saves to Supabase user_metadata (account-bound)
    setVisible(false);
    setTimeout(() => setActive(false), 300);
  }, [completeGuideTour]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      const nextStep = TOUR_STEPS[currentStep + 1];
      setCurrentStep((s) => s + 1);
      // Navigate to the next step's page so the nav item is highlighted
      router.push(nextStep.href);
    } else {
      handleComplete();
      router.push(TOUR_STEPS[currentStep].href);
    }
  }, [currentStep, router, handleComplete]);

  if (!active) return null;

  const step = TOUR_STEPS[currentStep];
  if (!step) return null;

  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progressPercent = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const descKey = isDesktop && step.titleKey === "guideTour.step4.title"
    ? "guideTour.step4.descDesktop"
    : step.descKey;

  // Compute exact mobile tooltip + arrow + glow positions from measured nav item rect
  let tooltipLeft: string;
  let tooltipTransform: string;
  let arrowLeftPos: string;
  let glowLeft: string;
  let glowWidth: string;

  if (step.mobileNavIndex >= 0 && navRect && viewportW > 0) {
    const navCenter = navRect.left + navRect.width / 2;
    const rawLeft = navCenter - TOOLTIP_W / 2;
    const maxLeft = viewportW - TOOLTIP_W - TOOLTIP_MARGIN;
    const clamped = Math.max(TOOLTIP_MARGIN, Math.min(rawLeft, maxLeft));
    tooltipLeft = `${clamped}px`;
    tooltipTransform = "none";
    arrowLeftPos = `${navCenter - clamped}px`;
    glowLeft = `${navRect.left}px`;
    glowWidth = `${navRect.width}px`;
  } else {
    // Centered (step4 — no nav item)
    tooltipLeft = "50%";
    tooltipTransform = "translateX(-50%)";
    arrowLeftPos = "50%";
    glowLeft = "calc(50% - 32px)";
    glowWidth = "64px";
  }

  return (
    <>
      {/* Dark backdrop overlay */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.3)",
          transition: "opacity 0.3s ease",
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Mobile tooltip — positioned above BottomNav */}
      {!isDesktop && (
        <div
          className="fixed z-[9999] xl:hidden"
          style={{
            bottom: "80px", // above bottom nav (64px) + gap
            left: tooltipLeft,
            transform: tooltipTransform,
            width: `${TOOLTIP_W}px`,
            transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
          }}
        >
          <div
            className="rounded-2xl p-4 shadow-xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-soft)",
              boxShadow: "0 8px 32px rgba(74,143,231,0.25)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{step.mobileIcon}</span>
                <h3 className="text-sm font-bold" style={{ color: "var(--deep-navy)" }}>
                  {t(step.titleKey)}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleComplete}
                className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-gray-100"
                style={{ color: "var(--text-muted)" }}
                aria-label={t("guideTour.skip")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
              {t(descKey)}
            </p>

            {/* Progress bar */}
            <div className="h-1 w-full rounded-full mb-3" style={{ background: "var(--border-soft)" }}>
              <div
                className="h-1 rounded-full transition-all duration-300"
                style={{ background: "var(--primary)", width: `${progressPercent}%` }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {currentStep + 1} {t("guideTour.stepOf")} {TOUR_STEPS.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleComplete}
                  className="text-[11px] transition hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("guideTour.skip")}
                </button>
                <button
                  type="button"
                  id={`guide-tour-step-${currentStep + 1}`}
                  onClick={handleNext}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ background: "var(--primary)" }}
                >
                  {isLastStep ? t("guideTour.finish") : t("guideTour.next")}
                  {!isLastStep && <ChevronRight className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Arrow pointing down at nav item */}
            <div
              style={{
                position: "absolute",
                bottom: "-8px",
                left: arrowLeftPos,
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid var(--bg-card)",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
              }}
            />
          </div>
        </div>
      )}

      {/* Desktop tooltip — position near top-right sidebar */}
      {isDesktop && (
        <div
          className="fixed z-[9999] hidden xl:block"
          style={{
            top: "80px",
            right: "360px", // just left of the 340px sidebar
            width: "300px",
            transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? "auto" : "none",
          }}
        >
          <div
            className="rounded-2xl p-5 shadow-xl"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-soft)",
              boxShadow: "0 12px 48px rgba(74,143,231,0.2)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{step.mobileIcon}</span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>
                    Step {currentStep + 1} / {TOUR_STEPS.length}
                  </div>
                  <h3 className="text-base font-bold" style={{ color: "var(--deep-navy)" }}>
                    {t(step.titleKey)}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={handleComplete}
                className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-gray-100"
                style={{ color: "var(--text-muted)" }}
                aria-label={t("guideTour.skip")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>
              {t(descKey)}
            </p>

            {/* Side label hint */}
            <div
              className="rounded-lg px-3 py-2 mb-4 flex items-center gap-2"
              style={{ background: "var(--light-blue)" }}
            >
              <span className="text-xs" style={{ color: "var(--primary)" }}>
                → Sidebar: <strong>{t(step.desktopLabelKey)}</strong>
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full rounded-full mb-4" style={{ background: "var(--border-soft)" }}>
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ background: "var(--primary)", width: `${progressPercent}%` }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleComplete}
                className="text-xs transition hover:opacity-70"
                style={{ color: "var(--text-muted)" }}
              >
                {t("guideTour.skip")}
              </button>
              <button
                type="button"
                id={`guide-tour-desktop-step-${currentStep + 1}`}
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                {isLastStep ? t("guideTour.finish") : t("guideTour.next")}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>

            {/* Arrow pointing right toward sidebar */}
            <div
              style={{
                position: "absolute",
                top: "30px",
                right: "-8px",
                width: 0,
                height: 0,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderLeft: "8px solid var(--bg-card)",
                filter: "drop-shadow(2px 0 4px rgba(0,0,0,0.1))",
              }}
            />
          </div>
        </div>
      )}

      {/* Glow highlight on mobile nav item */}
      {!isDesktop && step.mobileNavIndex >= 0 && (
        <div
          className="fixed z-[9997] xl:hidden pointer-events-none"
          style={{
            bottom: "0px",
            left: glowLeft,
            width: glowWidth,
            height: "64px",
            background: "rgba(74,143,231,0.25)",
            borderRadius: "12px 12px 0 0",
            transition: "all 0.3s ease",
            opacity: visible ? 1 : 0,
          }}
        />
      )}
    </>
  );
}
