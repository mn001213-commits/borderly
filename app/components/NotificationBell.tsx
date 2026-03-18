"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getUnreadCount } from "@/lib/notificationService";

function BellIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22a2.2 2.2 0 0 0 2.1-1.6H9.9A2.2 2.2 0 0 0 12 22Z" fill="currentColor" opacity="0.18" />
      <path
        d="M18 16.8H6c-.6 0-1-.6-.7-1.1l1.2-1.9V10a5.5 5.5 0 1 1 11 0v3.8l1.2 1.9c.3.5-.1 1.1-.7 1.1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 7.2A3.5 3.5 0 0 1 12 5.8a3.5 3.5 0 0 1 3 1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

type NotificationBellProps = {
  className?: string;
};

export default function NotificationBell({ className }: NotificationBellProps) {
  const [count, setCount] = useState(0);
  const [me, setMe] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        const uid = user?.id ?? null;
        setMe(uid);

        if (!uid) {
          setCount(0);
          return;
        }

        const unread = await getUnreadCount();
        if (!mounted) return;
        setCount(unread);
      } catch (error) {
        console.error("NotificationBell load error:", error);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;

    const refreshSoon = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const unread = await getUnreadCount();
          if (!cancelled) setCount(unread);
        } catch (error) {
          console.error("NotificationBell refresh error:", error);
        }
      }, 120);
    };

    let ch: ReturnType<typeof supabase.channel> | null = null;

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      ch = supabase
        .channel(`notifications-badge:${me}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${me}`,
          },
          () => {
            refreshSoon();
          }
        )
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [me]);

  return (
    <Link
      href="/notifications"
      className={className ?? "relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-sm hover:bg-neutral-50"}
      aria-label="Notifications"
      title="Notifications"
    >
      <BellIcon className="h-5 w-5" />

      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}