"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, KeyRound, CheckCircle } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { t } = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // PASSWORD_RECOVERY 이벤트가 발생할 때만 폼을 활성화
    // Supabase SDK가 URL hash의 토큰을 자동으로 파싱해 이 이벤트를 발행함
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // 5초 안에 PASSWORD_RECOVERY 이벤트가 없으면 링크 만료/무효로 처리
    const timer = setTimeout(() => setTimedOut(true), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg(t("updatePw.minLength"));
      return;
    }

    if (password !== confirm) {
      setErrorMsg(t("updatePw.mismatch"));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  };

  if (!ready) {
    if (timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--light-blue)" }}>
          <div className="b-card b-animate-in mx-4 w-full max-w-md p-6 text-center">
            <div className="text-base font-semibold mb-2" style={{ color: "var(--deep-navy)" }}>
              {t("updatePw.linkExpired")}
            </div>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              {t("updatePw.linkExpiredDesc")}
            </p>
            <Link
              href="/reset-password"
              className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              {t("updatePw.requestNewLink")}
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--light-blue)" }}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t("updatePw.verifying")}</div>
      </div>
    );
  }

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
              <h1 className="text-xl font-semibold" style={{ color: "var(--deep-navy)" }}>{t("updatePw.title")}</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("updatePw.subtitle")}</p>
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
              <div className="text-base font-semibold" style={{ color: "var(--deep-navy)" }}>{t("updatePw.updated")}</div>
              <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{t("updatePw.redirecting")}</p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>{t("updatePw.newPassword")}</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("signup.pwPlaceholder")}
                  type="password"
                  disabled={loading}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                  style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>{t("updatePw.confirmPassword")}</label>
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder={t("updatePw.reenterPw")}
                  type="password"
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
                {loading ? t("updatePw.updating") : t("updatePw.updatePassword")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
