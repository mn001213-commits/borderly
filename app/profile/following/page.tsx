"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { unfollowUser } from "@/lib/followService";
import { ArrowLeft, User, UserMinus } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

type FollowingProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowingPage() {
  const { t } = useT();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<FollowingProfile[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      if (!alive) return;

      setMyId(user.id);

      const { data: rows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!rows || rows.length === 0 || !alive) {
        setFollowing([]);
        setLoading(false);
        return;
      }

      const ids = rows.map((r: any) => r.following_id).filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);

      if (alive) {
        setFollowing((profiles ?? []) as FollowingProfile[]);
        setLoading(false);
      }
    }

    load();
    return () => { alive = false; };
  }, [router]);

  const handleUnfollow = async (targetId: string) => {
    if (!myId || busy[targetId]) return;

    const ok = confirm(t("following.unfollowConfirm"));
    if (!ok) return;

    setBusy((prev) => ({ ...prev, [targetId]: true }));
    await unfollowUser(myId, targetId);
    setFollowing((prev) => prev.filter((f) => f.id !== targetId));
    setBusy((prev) => ({ ...prev, [targetId]: false }));
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
          <h1 className="text-xl font-bold">{t("profile.following")}</h1>
        </header>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="text-sm text-gray-500">{t("common.loading")}</div>
          ) : following.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <User className="mb-3 h-10 w-10 text-gray-300" />
              <div className="text-sm font-semibold text-gray-800">{t("following.empty")}</div>
              <div className="mt-1 text-sm text-gray-500">
                {t("following.emptyDesc")}
              </div>
            </div>
          ) : (
            following.map((f) => (
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
                  <div className="truncate text-sm font-medium text-gray-900">
                    {f.display_name ?? t("userProfile.user")}
                  </div>
                </Link>

                <button
                  onClick={() => handleUnfollow(f.id)}
                  disabled={!!busy[f.id]}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <UserMinus className="h-4 w-4" />
                  {t("following.unfollow")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
