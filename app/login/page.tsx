"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { LogIn } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import LangSwitcher from "@/app/components/LangSwitcher";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000 * 3; // 3 minutes

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // Check lockout
    if (lockedUntil && Date.now() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      setMsg(t("login.tooManyAttempts") || `Too many attempts. Try again in ${remaining}s`);
      return;
    }

    // Reset lockout if expired
    if (lockedUntil && Date.now() >= lockedUntil) {
      setLockedUntil(null);
      setAttempts(0);
    }

    const e2 = email.trim();
    const p2 = password.trim();

    if (!e2 || !p2) {
      setMsg(t("login.enterEmailPw"));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: e2,
      password: p2,
    });

    setLoading(false);

    if (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setMsg(t("login.accountLocked") || "Too many failed attempts. Account locked for 3 minutes.");
      } else {
        // Convert technical error messages to user-friendly messages
        if (error.message === "Invalid login credentials") {
          setMsg(t("login.invalidCredentials") || "Invalid email or password. Please check and try again.");
        } else {
          setMsg(error.message);
        }
      }
      return;
    }

    setAttempts(0);
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden" style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}>
      <div className="mx-auto w-full max-w-md px-4">
        <div className="flex justify-end mb-4">
          <LangSwitcher />
        </div>

        <div className="b-card b-animate-in p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--light-blue)" }}>
              <LogIn className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--deep-navy)" }}>{t("common.login")}</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("login.welcome")}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: window.location.origin },
              });
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.56-2.77z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("auth.google")}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("auth.or")}</span>
            <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("auth.email")}</label>
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

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("auth.password")}</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.pwPlaceholder")}
                type="password"
                disabled={loading}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            {msg && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {loading ? t("login.signingIn") : t("login.signIn")}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="/signup" className="hover:opacity-70 transition" style={{ color: "var(--text-secondary)" }}>
              {t("login.createAccount")}
            </Link>
            <Link href="/reset-password" className="hover:opacity-70 transition" style={{ color: "var(--text-secondary)" }}>
              {t("auth.forgotPassword")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
