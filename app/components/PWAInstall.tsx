"use client";

import { useEffect, useState } from "react";
import { APP_SETTINGS } from "@/lib/constants";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Record<string, unknown>).standalone === true
  );
}

function isDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < APP_SETTINGS.pwaInstallCooldownDays;
}

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Skip if already installed as PWA or dismissed recently
    if (isStandalone() || isDismissedRecently()) return;

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.removeItem(DISMISS_KEY);
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 shadow-lg">
      <span className="text-sm text-white">
        Install Borderly for a better experience
      </span>
      <div className="flex gap-2 ml-3 shrink-0">
        <button
          onClick={handleDismiss}
          className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
