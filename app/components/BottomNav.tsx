"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShieldCheck, CalendarHeart, MessageCircle, FileText } from "lucide-react";
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
  const fetchUnreadRef = useRef<(() => void) | null>(null);

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

    fetchUnreadRef.current = fetchUnread;

    async function start() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (!mounted) return;

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
      fetchUnreadRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  // Re-fetch unread count on navigation (entering or leaving a chat room)
  useEffect(() => {
    if (fetchUnreadRef.current) {
      fetchUnreadRef.current();
    }
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const items = [
    { href: "/", icon: Home, label: t("nav.explore") },
    { href: "/browse", icon: FileText, label: t("nav.home") },
    { href: "/meet", icon: CalendarHeart, label: t("nav.meet") },
    { href: "/chats", icon: MessageCircle, label: t("nav.chats"), badge: unread },
    { href: "/ngo", icon: ShieldCheck, label: t("nav.ngo") },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 xl:hidden"
      style={{
        background: "color-mix(in srgb, var(--bg-card) 92%, transparent)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        boxShadow: "0 -1px 0 var(--border-subtle), 0 -2px 8px rgba(30,42,58,0.04)",
      }}
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {items.map(({ href, icon: Icon, label, badge }) => {
          const on = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex flex-col items-center justify-center gap-0.5 no-underline"
              style={{
                color: on ? "var(--primary)" : "var(--text-muted)",
                transition: "color 0.2s ease",
              }}
            >
              {/* Active pill indicator */}
              <div
                className="rounded-full mb-0.5"
                style={{
                  width: on ? "16px" : "0px",
                  height: "3px",
                  background: on ? "var(--primary)" : "transparent",
                  borderRadius: "9999px",
                  transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  boxShadow: on ? "0 1px 4px rgba(74,143,231,0.3)" : "none",
                }}
              />
              <div className="relative flex h-8 w-8 items-center justify-center">
                <Icon
                  className="h-5 w-5"
                  strokeWidth={on ? 2.5 : 1.8}
                  style={{ transition: "stroke-width 0.2s ease" }}
                />
                {badge !== undefined && badge > 0 && (
                  <span
                    className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white"
                    style={{
                      background: "#EF4444",
                      boxShadow: "0 1px 3px rgba(239,68,68,0.3)",
                    }}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span
                className="text-[10px]"
                style={{ fontWeight: on ? 600 : 500 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
