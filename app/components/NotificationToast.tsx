"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";
import { useT } from "./LangProvider";
import type { NotificationRow } from "@/lib/notificationService";
import { MessageCircle, Heart, Mail, Handshake, UserPlus, X } from "lucide-react";

const TYPE_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  comment: { icon: MessageCircle, color: "#4DA6FF" },
  like: { icon: Heart, color: "#F87171" },
  dm: { icon: Mail, color: "#34D399" },
  meet: { icon: Handshake, color: "#A78BFA" },
  follow: { icon: UserPlus, color: "#FBBF24" },
};

type Toast = {
  id: string;
  notification: NotificationRow;
  exiting: boolean;
};

export default function NotificationToast() {
  const { user } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 300);
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (notification: NotificationRow) => {
      const id = notification.id;
      setToasts((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        const next = [...prev, { id, notification, exiting: false }];
        // Keep max 3 toasts
        if (next.length > 3) {
          const oldest = next[0];
          dismiss(oldest.id);
        }
        return next.slice(-3);
      });

      const timer = setTimeout(() => {
        dismiss(id);
        timersRef.current.delete(id);
      }, 5000);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      ch = supabase
        .channel(`notifications-toast:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow;
            if (row?.id) addToast(row);
          }
        )
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      if (ch) supabase.removeChannel(ch);
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [user, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-[68px] right-4 z-50 flex flex-col gap-2 w-[340px] max-w-[calc(100vw-32px)]">
      {toasts.map((toast) => {
        const n = toast.notification;
        const typeInfo = TYPE_ICON[n.type] ?? TYPE_ICON.comment;
        const Icon = typeInfo.icon;

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-2xl p-4 shadow-lg backdrop-blur-md cursor-pointer transition-all duration-300 ${
              toast.exiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
            }`}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-soft)",
              animation: toast.exiting ? undefined : "slideInRight 0.3s ease-out",
            }}
            onClick={() => {
              dismiss(toast.id);
              if (n.link) router.push(n.link);
              else router.push("/notifications");
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${typeInfo.color}20` }}
            >
              <Icon className="h-4.5 w-4.5" style={{ color: typeInfo.color }} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate" style={{ color: "var(--deep-navy)" }}>
                {n.title}
              </div>
              {n.body && (
                <div className="mt-0.5 text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {n.body}
                </div>
              )}
              <div className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                {t("notif.new")}
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-full p-1 transition hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              onClick={(e) => {
                e.stopPropagation();
                dismiss(toast.id);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
