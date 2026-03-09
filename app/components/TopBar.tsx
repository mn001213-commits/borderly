"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import NotificationBell from "./NotificationBell";
import { User } from "lucide-react";

export default function TopBar() {
  const [myId, setMyId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;

      if (!user) {
        setMyId(null);
        setDisplayName(null);
        setAvatarUrl(null);
        return;
      }

      setMyId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (alive) {
        setDisplayName(prof?.display_name ?? user.email ?? null);
        setAvatarUrl(prof?.avatar_url ?? null);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/penguin.png" alt="Borderly" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-lg font-bold tracking-tight text-gray-900">
            BORDERLY
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {myId ? (
            <>
              <NotificationBell className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-[#F0F7FF] transition" />

              <Link
                href="/profile"
                className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 transition hover:bg-[#F0F7FF] no-underline text-inherit"
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Me"
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                    <User className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                )}
                <span className="hidden sm:block max-w-[120px] truncate text-sm font-medium text-gray-700">
                  {displayName ?? "Account"}
                </span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:opacity-90 no-underline"
            >
              Log In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
