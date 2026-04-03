"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  listNotifications,
  markAllRead,
  markRead,
  resolveNotifText,
  type NotificationRow,
} from "@/lib/notificationService";
import { swrCache } from "@/lib/swrCache";
import { useAuth } from "@/app/components/AuthProvider";
import { useT } from "@/app/components/LangProvider";

function formatRelative(iso: string, tr?: (key: string) => string) {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - ts);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}${tr ? tr("notif.sAgo") : "s ago"}`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}${tr ? tr("notif.mAgo") : "m ago"}`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${tr ? tr("notif.hAgo") : "h ago"}`;

  const day = Math.floor(hr / 24);
  return `${day}${tr ? tr("notif.dAgo") : "d ago"}`;
}

function typeLabel(type: NotificationRow["type"], tr?: (key: string) => string) {
  switch (type) {
    case "comment":
      return tr ? tr("notif.typeComment") : "Comment";
    case "like":
      return tr ? tr("notif.typeLike") : "Like";
    case "dm":
      return tr ? tr("notif.typeMessage") : "Message";
    case "meet":
      return tr ? tr("notif.typeMeet") : "Meet";
    case "follow":
      return tr ? tr("notif.typeFollow") : "Follow";
    default:
      return type;
  }
}

export default function NotificationsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    // SWR: show cached notifications instantly
    const cached = swrCache.get<NotificationRow[]>("notifications");
    if (cached) {
      setRows(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const list = await listNotifications(80);
      setRows(list);
      swrCache.set("notifications", list);
      // Auto-mark all as read when visiting the page
      const hasUnread = list.some((n) => !n.is_read);
      if (hasUnread) {
        await markAllRead();
        const readList = list.map((n) => ({ ...n, is_read: true }));
        setRows(readList);
        swrCache.set("notifications", readList);
        window.dispatchEvent(new CustomEvent("notifications-read"));
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("listNotifications error:", error);
      if (!cached) setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Realtime: auto-refresh when notifications change
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;

    const refreshSoon = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (cancelled) return;
        try {
          const list = await listNotifications(80);
          if (!cancelled) setRows(list);
        } catch (error) {
          if (process.env.NODE_ENV === "development") console.error("notifications realtime refresh error:", error);
        }
      }, 200);
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      ch = supabase
        .channel(`notifications-page:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => refreshSoon()
        )
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [user]);

  const unreadCount = useMemo(() => {
    return rows.filter((row) => !row.is_read).length;
  }, [rows]);

  const onMarkAll = async () => {
    if (markingAll || unreadCount === 0) return;

    setMarkingAll(true);
    try {
      await markAllRead();
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          is_read: true,
        }))
      );
      // Notify NotificationBell to refresh
      window.dispatchEvent(new CustomEvent("notifications-read"));
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("markAllRead error:", error);
    } finally {
      setMarkingAll(false);
    }
  };

  const onOpen = async (n: NotificationRow) => {
    try {
      if (!n.is_read) {
        await markRead([n.id]);
        setRows((prev) =>
          prev.map((row) =>
            row.id === n.id ? { ...row, is_read: true } : row
          )
        );
        // Notify NotificationBell to refresh
        window.dispatchEvent(new CustomEvent("notifications-read"));
      }

      if (n.link) {
        router.push(n.link);
        return;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("markRead error:", error);
      if (n.link) {
        router.push(n.link);
        return;
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="b-card mb-4 flex items-center justify-between gap-3 p-5">
          <div>
            <div className="text-xl font-bold" style={{ letterSpacing: "-0.02em" }}>{t("notif.title")}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {unreadCount > 0 ? `${unreadCount} ${t("notif.unread")}` : t("notif.allCaughtUp")}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="b-btn-secondary rounded-xl px-3 py-2 text-sm no-underline"
            >
              {t("nav.home")}
            </Link>

            <button
              className="b-btn-secondary rounded-xl px-3 py-2 text-sm disabled:opacity-50"
              onClick={onMarkAll}
              disabled={markingAll || rows.length === 0 || unreadCount === 0}
            >
              {markingAll ? t("notif.updating") : t("notif.markAllRead")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="b-skeleton h-20" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="b-empty-state b-animate-in">
            <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("notif.noNotifications")}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("notif.allCaughtUpDesc")}</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {rows.map((n, idx) => {
              const { title: notifTitle, body: notifBody } = resolveNotifText(n, t);
              return (
              <button
                key={n.id}
                onClick={() => onOpen(n)}
                className="b-card b-animate-in rounded-2xl p-4 text-left transition"
                style={{
                  animationDelay: `${idx * 0.04}s`,
                  background: n.is_read ? "var(--bg-card)" : "var(--light-blue)",
                  borderColor: n.is_read ? "var(--border-soft)" : "var(--primary)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-bold" style={{ color: "var(--deep-navy)" }}>
                        {notifTitle}
                      </div>

                      {!n.is_read ? (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                          {t("notif.new")}
                        </span>
                      ) : null}
                    </div>

                    {notifBody ? (
                      <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                        {notifBody}
                      </div>
                    ) : null}

                    <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span
                        className="rounded-full px-2 py-0.5 font-semibold"
                        style={{ background: "var(--light-blue)", color: "var(--text-secondary)", border: "1px solid var(--border-soft)" }}
                      >
                        {typeLabel(n.type, t)}
                      </span>
                      <span>{formatRelative(n.created_at, t)}</span>
                    </div>
                  </div>
                </div>
              </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
