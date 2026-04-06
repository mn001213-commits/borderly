"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getLocale, setLocale, type Locale } from "@/lib/i18n";
import {
  ArrowLeft,
  ShieldBan,
  LogOut,
  KeyRound,
  Trash2,
  Globe,
  Bell,
  BellOff,
  Moon,
  Sun,
  Lock,
  Users,
  Info,
  MapIcon,
} from "lucide-react";
import { useT } from "@/app/components/LangProvider";

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useT();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Language
  const [lang, setLang] = useState<Locale>("en");
  useEffect(() => {
    setLang(getLocale());
  }, []);
  const changeLang = (l: Locale) => {
    setLocale(l);
    setLang(l);
  };

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("borderly-theme");
    if (saved === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);
  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    const meta = document.getElementById("theme-color-meta");
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("borderly-theme", "dark");
      if (meta) meta.setAttribute("content", "#0F1419");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("borderly-theme", "light");
      if (meta) meta.setAttribute("content", "#F8FAFE");
    }
  };

  // Notifications
  const [notifComment, setNotifComment] = useState(true);
  const [notifLike, setNotifLike] = useState(true);
  const [notifDM, setNotifDM] = useState(true);
  const [notifMeet, setNotifMeet] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("borderly-notif");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifComment(parsed.comment ?? true);
        setNotifLike(parsed.like ?? true);
        setNotifDM(parsed.dm ?? true);
        setNotifMeet(parsed.meet ?? true);
      } catch {}
    }
  }, []);
  const saveNotif = (key: string, value: boolean) => {
    const current = { comment: notifComment, like: notifLike, dm: notifDM, meet: notifMeet };
    const updated = { ...current, [key]: value };
    localStorage.setItem("borderly-notif", JSON.stringify(updated));
    if (key === "comment") setNotifComment(value);
    if (key === "like") setNotifLike(value);
    if (key === "dm") setNotifDM(value);
    if (key === "meet") setNotifMeet(value);
  };

  // Privacy
  const [dmPolicy, setDmPolicy] = useState<"everyone" | "followers">("everyone");
  const [profilePublic, setProfilePublic] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("borderly-privacy");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDmPolicy(parsed.dmPolicy ?? "everyone");
        setProfilePublic(parsed.profilePublic ?? true);
      } catch {}
    }
  }, []);
  const savePrivacy = (key: string, value: string | boolean) => {
    const current = { dmPolicy, profilePublic };
    const updated = { ...current, [key]: value };
    localStorage.setItem("borderly-privacy", JSON.stringify(updated));
    if (key === "dmPolicy") setDmPolicy(value as "everyone" | "followers");
    if (key === "profilePublic") setProfilePublic(value as boolean);
  };

  const restartGuideTour = async () => {
    await supabase.auth.updateUser({ data: { guide_tour_completed: false } }).catch(() => {});
    localStorage.setItem("borderly_guide_pending", "true");
    window.location.href = "/browse";
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const openDeleteModal = () => {
    setDeleteConfirm("");
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "Failed to delete account" }));
        throw new Error(error);
      }

      await supabase.auth.signOut();
      router.push("/login");
    } catch (e: any) {
      setDeleteError(e?.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ background: on ? "var(--primary)" : "var(--border-soft)" }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(24px)" : "translateX(4px)" }}
      />
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
      <div className="flex items-center gap-3 py-3 mb-4">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full transition" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--deep-navy)" }} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: "var(--deep-navy)" }}>{t("common.settings")}</h1>
      </div>

      {/* 1. Language */}
      <div className="b-card b-animate-in p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("settings.language")}</div>
        </div>
        <div className="flex gap-2">
          {([
            { key: "en" as Locale, label: "English" },
            { key: "ko" as Locale, label: "한국어" },
            { key: "ja" as Locale, label: "日本語" },
          ]).map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => changeLang(l.key)}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition"
              style={{
                background: lang === l.key ? "var(--primary)" : "var(--light-blue)",
                color: lang === l.key ? "#fff" : "var(--text-secondary)",
                border: lang === l.key ? "none" : "1px solid var(--border-soft)",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Notifications */}
      <div className="b-card b-animate-in p-5 mb-4" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("settings.notifications")}</div>
        </div>
        <div className="space-y-3">
          {[
            { key: "comment", label: t("settings.notifComment"), on: notifComment },
            { key: "like", label: t("settings.notifLike"), on: notifLike },
            { key: "dm", label: t("settings.notifDM"), on: notifDM },
            { key: "meet", label: t("settings.notifMeet"), on: notifMeet },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
              <Toggle on={item.on} onToggle={() => saveNotif(item.key, !item.on)} />
            </div>
          ))}
        </div>
      </div>

      {/* 3. Appearance (Dark Mode) */}
      <div className="b-card b-animate-in p-5 mb-4" style={{ animationDelay: "0.1s" }}>
        <div className="flex items-center gap-2 mb-3">
          {darkMode ? <Moon className="h-4 w-4" style={{ color: "var(--text-muted)" }} /> : <Sun className="h-4 w-4" style={{ color: "var(--text-muted)" }} />}
          <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("settings.appearance")}</div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("settings.darkMode")}</span>
          <Toggle on={darkMode} onToggle={toggleDarkMode} />
        </div>
      </div>

      {/* 4. Privacy */}
      <div className="b-card b-animate-in p-5 mb-4" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("settings.privacy")}</div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>{t("settings.whoCanDM")}</div>
            <div className="flex gap-2">
              {([
                { key: "everyone" as const, label: t("settings.everyone"), icon: Globe },
                { key: "followers" as const, label: t("settings.followersOnly"), icon: Users },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => savePrivacy("dmPolicy", opt.key)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition"
                  style={{
                    background: dmPolicy === opt.key ? "var(--primary)" : "var(--light-blue)",
                    color: dmPolicy === opt.key ? "#fff" : "var(--text-secondary)",
                    border: dmPolicy === opt.key ? "none" : "1px solid var(--border-soft)",
                  }}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("settings.publicProfile")}</span>
            <Toggle on={profilePublic} onToggle={() => savePrivacy("profilePublic", !profilePublic)} />
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="b-card b-animate-in p-5 mb-4" style={{ animationDelay: "0.2s" }}>
        <div className="text-sm font-semibold mb-4" style={{ color: "var(--deep-navy)" }}>{t("settings.account")}</div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={restartGuideTour}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
          >
            <MapIcon className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            {t("settings.restartTour")}
          </button>

          <Link
            href="/profile/blocked"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition no-underline"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
          >
            <ShieldBan className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            {t("settings.blockedUsers")}
          </Link>

          <Link
            href="/reset-password"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition no-underline"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
          >
            <KeyRound className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            {t("settings.changePassword")}
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-50"
            style={{ background: "var(--bg-card)", border: "1px solid #FECACA", color: "#B91C1C" }}
          >
            <LogOut className="h-4 w-4" />
            {loggingOut ? t("settings.loggingOut") : t("settings.logOut")}
          </button>
        </div>
      </div>

      {/* 6. App Info */}
      <div className="b-card b-animate-in p-5 mb-4" style={{ animationDelay: "0.25s" }}>
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("settings.appInfo")}</div>
        </div>
        <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <div className="flex items-center justify-between">
            <span>{t("settings.version")}</span>
            <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("settings.appName")}</span>
            <span className="font-semibold" style={{ color: "var(--deep-navy)" }} translate="no">Borderly</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Link
              href="/privacy"
              className="text-sm no-underline transition hover:underline"
              style={{ color: "var(--primary)" }}
            >
              {t("settings.privacyPolicy")}
            </Link>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="b-animate-in flex items-center gap-4 pt-8 pb-4" style={{ animationDelay: "0.3s" }}>
        <Link
          href="/privacy"
          className="text-xs no-underline transition hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          {t("settings.privacyPolicy")}
        </Link>
        <span className="text-xs" style={{ color: "var(--border-soft)" }}>·</span>
        <button
          onClick={openDeleteModal}
          disabled={deleting}
          className="text-xs transition hover:underline disabled:opacity-40"
          style={{ color: "var(--text-muted)" }}
        >
          {t("settings.deleteAccount")}
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ background: "var(--bg-card)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "#FEF2F2" }}>
                <Trash2 className="h-5 w-5" style={{ color: "#B91C1C" }} />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: "#B91C1C" }}>{t("settings.deleteAccount")}</h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("settings.deleteIrreversible")}</p>
              </div>
            </div>

            <div className="rounded-xl p-3 mb-4 text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
              {t("settings.deleteAllData")}
            </div>

            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              {t("settings.typeDelete")}
            </label>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none mb-4"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              autoFocus
            />

            {deleteError && (
              <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-2xl py-3 text-sm font-medium transition"
                style={{ background: "var(--light-blue)", color: "var(--text-secondary)" }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={deleteAccount}
                disabled={deleteConfirm !== "DELETE" || deleting}
                className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ background: "#E53935" }}
              >
                {deleting ? t("settings.deleting") : t("settings.deleteAccount")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
