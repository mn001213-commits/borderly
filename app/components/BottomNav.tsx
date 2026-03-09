"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Calendar, MessageCircle, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function BottomNav() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchUnread() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const { data } = await supabase
        .from("v_chat_list")
        .select("unread_count")
        .eq("me_id", user.id);

      if (mounted) {
        const total = (data ?? []).reduce(
          (sum: number, r: { unread_count: number | null }) =>
            sum + (r.unread_count ?? 0),
          0,
        );
        setUnread(total);
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);

    // Realtime subscription for new messages
    const channel = supabase
      .channel("bottom-nav-unread")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          // Re-fetch the full count so we stay accurate
          fetchUnread();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const base =
    "flex flex-col items-center justify-center gap-1 text-[11px] transition";
  const active = "text-blue-600 font-semibold";
  const inactive = "text-gray-400";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5">
        <Link href="/" className={`${base} ${isActive("/") ? active : inactive}`}>
          <Home className="h-5 w-5" />
          Home
        </Link>

        <Link href="/ngo" className={`${base} ${isActive("/ngo") ? active : inactive}`}>
          <Users className="h-5 w-5" />
          NGO
        </Link>

        <Link href="/meet" className={`${base} ${isActive("/meet") ? active : inactive}`}>
          <Calendar className="h-5 w-5" />
          Meet
        </Link>

        <Link href="/chats" className={`${base} ${isActive("/chats") ? active : inactive}`}>
          <div className="relative">
            <MessageCircle className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </div>
          Chats
        </Link>

        <Link href="/profile" className={`${base} ${isActive("/profile") ? active : inactive}`}>
          <User className="h-5 w-5" />
          Profile
        </Link>
      </div>
    </nav>
  );
}
