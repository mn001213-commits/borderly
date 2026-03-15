"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

export default function ResetPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg(t("resetPw.enterEmail"));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}>
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-8">
        <Link
          href="/login"
          className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition hover:opacity-80"
          style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("resetPw.backToLogin")}
        </Link>

        <div className="b-card b-animate-in mt-6 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--light-blue)" }}
            >
              <KeyRound className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--deep-navy)" }}>{t("resetPw.title")}</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("resetPw.subtitle")}</p>
            </div>
          </div>

          {sent ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <div className="text-base font-semibold" style={{ color: "var(--deep-navy)" }}>{t("resetPw.checkEmail")}</div>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("resetPw.sentTo")} <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{email}</span>.
                {t("resetPw.clickLink")}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex h-10 items-center rounded-2xl px-4 text-sm font-medium text-white transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                {t("resetPw.backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>{t("auth.email")}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  type="email"
                  disabled={loading}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                  style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                />
              </div>

              {errorMsg && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "var(--primary)" }}
              >
                {loading ? t("resetPw.sending") : t("resetPw.sendLink")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
