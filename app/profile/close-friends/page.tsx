"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { removeCloseFriend } from "@/lib/closeFriendService";
import { ArrowLeft, User, Star, StarOff } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

type FriendProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function CloseFriendsPage() {
  const { t } = useT();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      if (!alive) return;

      setMyId(user.id);

      const { data: rows } = await supabase
        .from("close_friends")
        .select("friend_id")
        .eq("user_id", user.id);

      if (!rows || rows.length === 0 || !alive) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const ids = rows.map((r: any) => r.friend_id).filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);

      if (alive) {
        setFriends((profiles ?? []) as FriendProfile[]);
        setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [router]);

  const handleRemove = async (friendId: string) => {
    if (!myId || busy[friendId]) return;

    const ok = confirm(t("closeFriends.removeConfirm"));
    if (!ok) return;

    setBusy((prev) => ({ ...prev, [friendId]: true }));
    await removeCloseFriend(myId, friendId);
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
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
          <h1 className="text-xl font-bold">{t("closeFriends.title")}</h1>
        </header>

        <p className="mt-1 text-sm text-gray-500">
          {t("closeFriends.description")}
        </p>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="text-sm text-gray-500">{t("common.loading")}</div>
          ) : friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <Star className="mb-3 h-10 w-10 text-gray-300" />
              <div className="text-sm font-semibold text-gray-800">{t("closeFriends.empty")}</div>
              <div className="mt-1 text-sm text-gray-500">
                {t("closeFriends.emptyDesc")}
              </div>
              <Link
                href="/profile/mutuals"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:opacity-90 no-underline"
              >
                {t("closeFriends.viewMutuals")}
              </Link>
            </div>
          ) : (
            friends.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <Link
                  href={`/u/${f.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 no-underline text-inherit"
                >
                  {f.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.avatar_url}
                      alt={f.display_name ?? t("userProfile.user")}
                      className="h-11 w-11 rounded-full object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">
                      {f.display_name ?? t("userProfile.user")}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-600">
                      <Star className="h-3 w-3 fill-yellow-500" />
                      {t("closeFriends.title")}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => handleRemove(f.id)}
                  disabled={!!busy[f.id]}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <StarOff className="h-4 w-4" />
                  {t("mutuals.remove")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
