"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { addCloseFriend, removeCloseFriend } from "@/lib/closeFriendService";
import { ArrowLeft, User, Star, StarOff } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

type MutualProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  isCloseFriend: boolean;
};

export default function MutualsPage() {
  const { t } = useT();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutuals, setMutuals] = useState<MutualProfile[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      if (!alive) return;

      setMyId(user.id);

      // Get people I follow
      const { data: myFollowing } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      // Get people who follow me
      const { data: myFollowers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      if (!alive) return;

      const followingIds = new Set((myFollowing ?? []).map((r: any) => r.following_id));
      const followerIds = new Set((myFollowers ?? []).map((r: any) => r.follower_id));

      // Mutual = both directions
      const mutualIds = [...followingIds].filter((id) => followerIds.has(id));

      if (mutualIds.length === 0) {
        setMutuals([]);
        setLoading(false);
        return;
      }

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", mutualIds);

      // Get close friends
      const { data: closeFriendRows } = await supabase
        .from("close_friends")
        .select("friend_id")
        .eq("user_id", user.id);

      const closeFriendSet = new Set((closeFriendRows ?? []).map((r: any) => r.friend_id));

      if (alive) {
        setMutuals(
          ((profiles ?? []) as any[]).map((p) => ({
            id: p.id,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            isCloseFriend: closeFriendSet.has(p.id),
          }))
        );
        setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [router]);

  const toggleCloseFriend = async (friendId: string, current: boolean) => {
    if (!myId || busy[friendId]) return;

    setBusy((prev) => ({ ...prev, [friendId]: true }));

    if (current) {
      await removeCloseFriend(myId, friendId);
    } else {
      await addCloseFriend(myId, friendId);
    }

    setMutuals((prev) =>
      prev.map((m) => (m.id === friendId ? { ...m, isCloseFriend: !current } : m))
    );
    setBusy((prev) => ({ ...prev, [friendId]: false }));
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <header className="flex items-center gap-3 py-3">
          <Link
            href="/profile"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-[#F0F7FF] no-underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("mutuals.title")}</h1>
        </header>

        <p className="mt-1 text-sm text-gray-500">
          {t("mutuals.description")}
        </p>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="text-sm text-gray-500">{t("common.loading")}</div>
          ) : mutuals.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <User className="mb-3 h-10 w-10 text-gray-300" />
              <div className="text-sm font-semibold text-gray-800">{t("mutuals.empty")}</div>
              <div className="mt-1 text-sm text-gray-500">
                {t("mutuals.emptyDesc")}
              </div>
            </div>
          ) : (
            mutuals.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <Link
                  href={`/u/${m.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 no-underline text-inherit"
                >
                  {m.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatar_url}
                      alt={m.display_name ?? t("userProfile.user")}
                      className="h-11 w-11 rounded-full object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {m.display_name ?? t("userProfile.user")}
                    </div>
                    {m.isCloseFriend && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        <Star className="h-3 w-3 fill-yellow-500" />
                        {t("closeFriends.title")}
                      </div>
                    )}
                  </div>
                </Link>

                <button
                  onClick={() => toggleCloseFriend(m.id, m.isCloseFriend)}
                  disabled={!!busy[m.id]}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition disabled:opacity-50 ${
                    m.isCloseFriend
                      ? "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
                  }`}
                >
                  {m.isCloseFriend ? (
                    <>
                      <StarOff className="h-4 w-4" />
                      {t("mutuals.remove")}
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4" />
                      {t("closeFriends.title")}
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
