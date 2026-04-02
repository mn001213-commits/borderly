"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import LangSwitcher from "@/app/components/LangSwitcher";

function VerifyEmailContent() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;

    setResending(true);
    setError(null);
    setResent(false);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    setResending(false);

    if (resendError) {
      setError(resendError.message);
    } else {
      setResent(true);
      setCooldown(60); // 60 seconds cooldown
    }
  };

  return (
    <div className="b-card b-animate-in mt-6 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ background: "var(--light-blue)" }}>
          <Mail className="h-8 w-8" style={{ color: "var(--primary)" }} />
        </div>

        <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--deep-navy)" }}>
          {t("verifyEmail.title")}
        </h1>

        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          {t("verifyEmail.description")}
        </p>

        {email && (
          <div className="w-full rounded-xl px-4 py-3 mb-6 text-sm font-medium" style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}>
            {email}
          </div>
        )}

        <div className="w-full space-y-3">
          {resent && (
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534" }}>
              <CheckCircle className="h-4 w-4" />
              {t("verifyEmail.resent")}
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !email}
            className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
            {cooldown > 0
              ? `${t("verifyEmail.resendIn")} ${cooldown}s`
              : resending
                ? t("verifyEmail.sending")
                : t("verifyEmail.resend")
            }
          </button>

          <Link
            href="/login"
            className="w-full flex items-center justify-center rounded-2xl py-3 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            {t("verifyEmail.goToLogin")}
          </Link>
        </div>

        <p className="mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
          {t("verifyEmail.checkSpam")}
        </p>
      </div>
    </div>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="b-card mt-6 p-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4 bg-[var(--light-blue)]">
          <Mail className="h-8 w-8" style={{ color: "var(--primary)" }} />
        </div>
        <div className="h-6 w-48 rounded bg-[var(--border-soft)] animate-pulse mb-2" />
        <div className="h-4 w-64 rounded bg-[var(--border-soft)] animate-pulse mb-6" />
        <div className="w-full h-12 rounded-xl bg-[var(--border-soft)] animate-pulse mb-3" />
        <div className="w-full h-12 rounded-2xl bg-[var(--border-soft)] animate-pulse" />
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  const { t } = useT();

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-8">
        <div className="flex items-center justify-between">
          <Link
            href="/signup"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <LangSwitcher />
        </div>

        <Suspense fallback={<VerifyEmailFallback />}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
