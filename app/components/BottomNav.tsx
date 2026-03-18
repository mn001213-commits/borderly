"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShieldCheck, CalendarHeart, MessageCircle, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./AuthProvider";
import { useT } from "./LangProvider";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchUnread() {
      const { data } = await supabase
        .from("v_chat_list")
        .select("unread_count")
        .eq("me_id", user!.id);

      if (mounted) {
        const total = (data ?? []).reduce(
          (sum: number, r: { unread_count: number | null }) =>
            sum + (r.unread_count ?? 0),
          0,
        );
        setUnread(total);
      }
    }

    async function start() {
      // Set auth token for realtime
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (!mounted) return;

      // Fetch once on mount
      if (!fetchedRef.current) {
        fetchedRef.current = true;
        fetchUnread();
      }

      channel = supabase
        .channel(`bottom-nav-unread:${user!.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          () => fetchUnread(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "message_read_receipts" },
          () => fetchUnread(),
        )
        .subscribe();
    }

    start();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const items = [
    { href: "/", icon: Home, label: t("nav.home") },
    { href: "/browse", icon: Search, label: t("nav.explore") },
    { href: "/meet", icon: CalendarHeart, label: t("nav.meet") },
    { href: "/chats", icon: MessageCircle, label: t("nav.chats"), badge: unread },
    { href: "/ngo", icon: ShieldCheck, label: t("nav.ngo") },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md xl:hidden"
      style={{ borderTop: "1px solid var(--border-soft)", boxShadow: "0 -2px 12px rgba(30,42,56,0.04)" }}
    >
      <div className="mx-auto grid h-[72px] max-w-lg grid-cols-5">
        {items.map(({ href, icon: Icon, label, badge }) => {
          const on = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-col items-center justify-center gap-1 no-underline transition"
              style={{ color: on ? "var(--primary)" : "var(--text-muted)" }}
            >
              <div
                className="relative flex h-9 w-9 items-center justify-center rounded-full transition"
                style={{ background: on ? "var(--light-blue)" : "transparent" }}
              >
                <Icon className="h-[22px] w-[22px]" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
