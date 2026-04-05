"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import { useAuth } from "@/app/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const dismissedKey = (uid: string) => `borderly_missions_dismissed_${uid}`;

type MissionState = {
  profileComplete: boolean;
  hasAvatar: boolean;
  hasPost: boolean;
  hasMeet: boolean;
  hasFollow: boolean;
  hasComment: boolean;
};

const DEFAULT_STATE: MissionState = {
  profileComplete: false,
  hasAvatar: false,
  hasPost: false,
  hasMeet: false,
  hasFollow: false,
  hasComment: false,
};

type MissionDef = {
  key: keyof MissionState;
  labelKey: string;
  href: string;
};

const ALL_MISSIONS: MissionDef[] = [
  { key: "profileComplete", labelKey: "mission.1.label", href: "/settings" },
  { key: "hasAvatar",       labelKey: "mission.3.label", href: "/profile/edit" },
  { key: "hasPost",         labelKey: "mission.4.label", href: "/create" },
  { key: "hasMeet",         labelKey: "mission.5.label", href: "/meet" },
  { key: "hasFollow",       labelKey: "mission.6.label", href: "/browse" },
  { key: "hasComment",      labelKey: "mission.7.label", href: "/" },
];

type Props = {
  compact?: boolean;
};

export default function MissionChecklist({ compact = false }: Props) {
  const { t } = useT();
  const { user, needsOnboarding } = useAuth();
  const [missions, setMissions] = useState<MissionState>(DEFAULT_STATE);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.id;

    setMounted(true);
    const isDismissed = typeof window !== "undefined"
      ? window.localStorage.getItem(dismissedKey(uid)) === "true"
      : false;
    setDismissed(isDismissed);

    const check = async () => {
      const [postsRes, meetRes, followRes, commentRes] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("meet_participants").select("meet_id", { count: "exact", head: true }).eq("user_id", uid),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", uid),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);

      setMissions({
        profileComplete: !needsOnboarding,
        hasAvatar: !!user.avatarUrl,
        hasPost: (postsRes.count ?? 0) > 0,
        hasMeet: (meetRes.count ?? 0) > 0,
        hasFollow: (followRes.count ?? 0) > 0,
        hasComment: (commentRes.count ?? 0) > 0,
      });
    };

    check();
  }, [user, needsOnboarding]);

  const handleDismiss = () => {
    if (!user) return;
    setDismissed(true);
    try { window.localStorage.setItem(dismissedKey(user.id), "true"); } catch { /* ignore */ }
  };

  if (!mounted || !user || dismissed) return null;

  const completedCount = ALL_MISSIONS.filter((m) => missions[m.key]).length;
  const totalCount = ALL_MISSIONS.length;
  const allDone = completedCount === totalCount;
  const progressPercent = (completedCount / totalCount) * 100;

  const incompleteMissions = ALL_MISSIONS.filter((m) => !missions[m.key]);
  const displayMissions = compact && !expanded
    ? incompleteMissions.slice(0, 3)
    : ALL_MISSIONS;
  const hasMore = compact && incompleteMissions.length > 3;

  return (
    <div
      className="b-card b-animate-in p-4 mb-4"
      style={{ border: "1px solid var(--border-soft)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--deep-navy)" }}>
            {t("mission.title")}
          </h2>
          {!allDone && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {t("mission.subtitle")}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-gray-100"
          style={{ color: "var(--text-muted)" }}
          aria-label={t("mission.dismiss")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-2 rounded-full" style={{ background: "var(--border-soft)" }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: allDone
                ? "linear-gradient(90deg, #06D6A0, #4A8FE7)"
                : "var(--primary)",
            }}
          />
        </div>
        <span className="text-xs font-medium shrink-0" style={{ color: "var(--text-muted)" }}>
          {completedCount}/{totalCount}
        </span>
      </div>

      {/* All done state */}
      {allDone ? (
        <div
          className="rounded-xl px-4 py-3 text-center text-sm font-medium"
          style={{ background: "var(--light-blue)", color: "var(--primary)" }}
        >
          {t("mission.completed")}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayMissions.map((mission) => {
              const done = missions[mission.key];
              return (
                <Link
                  key={mission.key}
                  href={done ? "#" : mission.href}
                  className="flex items-center gap-3 no-underline rounded-xl px-3 py-2 transition"
                  style={{
                    background: done ? "transparent" : "var(--light-blue)",
                    cursor: done ? "default" : "pointer",
                    opacity: done ? 0.6 : 1,
                  }}
                  onClick={(e) => done && e.preventDefault()}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0" style={{ color: "var(--primary)" }} />
                  )}
                  <span
                    className="text-sm flex-1"
                    style={{
                      color: done ? "var(--text-muted)" : "var(--deep-navy)",
                      textDecoration: done ? "line-through" : "none",
                    }}
                  >
                    {t(mission.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 flex w-full items-center justify-center gap-1 text-xs transition hover:opacity-70"
              style={{ color: "var(--primary)" }}
            >
              {expanded ? (
                <><ChevronUp className="h-3.5 w-3.5" />{t("mission.viewLess")}</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" />{t("mission.viewAll")}</>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
