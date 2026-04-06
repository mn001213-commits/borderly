"use client";

import { useState, useEffect } from "react";
import { useT } from "@/app/components/LangProvider";

type Props = {
  onContinue: () => void;
};

const SLIDE_KEYS = [
  "onboardingTour.slide1",
  "onboardingTour.slide2",
  "onboardingTour.slide3",
];

const PENGUIN_COUNT = 3;

export default function OnboardingSuccess({ onContinue }: Props) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const isLast = step === SLIDE_KEYS.length - 1;

  function handleNext() {
    if (isLast) {
      onContinue();
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
    >
      {/* Outer card — light blue */}
      <div
        className="w-full max-w-sm rounded-3xl p-6"
        style={{ background: "#D6EAF8", border: "1.5px solid #A9CCE3" }}
      >
        {/* Penguin step indicator */}
        <div className="flex items-end justify-center gap-2 mb-4">
          {Array.from({ length: PENGUIN_COUNT }).map((_, i) => (
            <img
              key={i}
              src="/borderly-logo2.png"
              alt=""
              className="transition-all duration-300 select-none"
              style={{
                width: i === step ? "3rem" : "1.9rem",
                height: i === step ? "3rem" : "1.9rem",
                opacity: i === step ? 1 : 0.5,
              }}
            />
          ))}
        </div>

        {/* Inner white card */}
        <div className="rounded-2xl bg-white p-6 min-h-[200px] flex flex-col justify-center">
          <h1 className="text-xl font-bold text-center mb-5 text-black">
            {t("onboardingTour.welcomeTitle")}
          </h1>
          <p
            className="text-base font-medium text-black leading-relaxed"
            style={{ wordBreak: "keep-all", overflowWrap: "break-word", whiteSpace: "pre-line" }}
            key={step}
          >
            {t(SLIDE_KEYS[step])}
          </p>
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleNext}
          className="mt-5 w-full rounded-full py-3 text-base font-bold text-black bg-white transition hover:bg-gray-50 active:scale-95"
          style={{ border: "1.5px solid #C0D9EA" }}
        >
          {isLast ? t("onboardingTour.finish") : t("onboardingTour.next")}
        </button>
      </div>
    </div>
  );
}
