"use client";

import Link from "next/link";
import { Clock, Home } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

export default function NgoPendingPage() {
  const { t } = useT();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto w-full max-w-md px-4">
        <div className="b-card b-animate-in p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ background: "var(--light-blue)" }}>
            <Clock className="h-8 w-8" style={{ color: "var(--primary)" }} />
          </div>
          <h1 className="text-xl font-bold mb-2">{t("ngoOnboarding.pendingTitle")}</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {t("ngoOnboarding.pendingDesc")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            <Home className="h-4 w-4" />
            {t("nav.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
