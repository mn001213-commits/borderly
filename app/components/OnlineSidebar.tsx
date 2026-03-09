"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { User } from "lucide-react";

type FollowingProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function OnlineSidebar() {
  const [myId, setMyId] = useState<string | null>(null);
  const [following, setFollowing] = useState<FollowingProfile[]>([]);
  const onlineUserIds = useOnlinePresence(myId);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;

      setMyId(user.id);

      // Get who I follow
      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!followRows || followRows.length === 0 || !alive) return;

      const ids = followRows.map((r: any) => r.following_id).filter(Boolean);

      // Get their profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);

      if (alive) {
        setFollowing((profiles ?? []) as FollowingProfile[]);
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

  // Filter to only online friends
  const onlineFriends = following.filter((f) => onlineUserIds.has(f.id));

  // Don't render if not logged in or no online friends
  if (!myId || onlineFriends.length === 0) return null;

  return (
    <aside className="hidden xl:block fixed right-0 top-0 h-screen w-64 border-l border-gray-200 bg-white/80 backdrop-blur pt-6 px-4 overflow-y-auto">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        Online Now
        <span className="ml-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-bold text-white normal-case tracking-normal">
          {onlineFriends.length}
        </span>
      </div>

      <div className="space-y-1">
        {onlineFriends.map((f) => (
          <Link
            key={f.id}
            href={`/u/${f.id}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[#F0F7FF] no-underline text-inherit"
          >
            <div className="relative">
              {f.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.avatar_url}
                  alt={f.display_name ?? "User"}
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-gray-200"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            </div>

            <span className="truncate text-sm font-medium text-gray-800">
              {f.display_name ?? "User"}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
