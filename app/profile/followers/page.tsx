"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { followUser, unfollowUser } from "@/lib/followService";
import { ArrowLeft, User, Search, UserPlus, UserMinus } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowersPage() {
  const { t } = useT();
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<UserProfile[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      if (!alive) return;

      setMyId(user.id);

      // My followers
      const { data: followerRows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id);

      const followerIds = (followerRows ?? []).map((r: any) => r.follower_id).filter(Boolean);

      // Who I follow
      const { data: followingRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      setFollowingSet(new Set((followingRows ?? []).map((r: any) => r.following_id)));

      if (followerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", followerIds);

        if (alive) setFollowers((profiles ?? []) as UserProfile[]);
      }

      if (alive) setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [router]);

  // Search users by display_name
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .ilike("display_name", `%${q}%`)
        .neq("id", myId ?? "")
        .limit(20);

      setSearchResults((data ?? []) as UserProfile[]);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, myId]);

  const handleFollow = async (targetId: string) => {
    if (!myId || busy[targetId]) return;
    setBusy((p) => ({ ...p, [targetId]: true }));
    await followUser(myId, targetId);
    setFollowingSet((prev) => new Set(prev).add(targetId));
    setBusy((p) => ({ ...p, [targetId]: false }));
  };

  const handleUnfollow = async (targetId: string) => {
    if (!myId || busy[targetId]) return;
    setBusy((p) => ({ ...p, [targetId]: true }));
    await unfollowUser(myId, targetId);
    setFollowingSet((prev) => {
      const n = new Set(prev);
      n.delete(targetId);
      return n;
    });
    setBusy((p) => ({ ...p, [targetId]: false }));
  };

  // Sort: not following first
  const sortedFollowers = useMemo(() => {
    return [...followers].sort((a, b) => {
      const aFollowing = followingSet.has(a.id) ? 1 : 0;
      const bFollowing = followingSet.has(b.id) ? 1 : 0;
      return aFollowing - bFollowing;
    });
  }, [followers, followingSet]);

  const isSearching = query.trim().length >= 2;
  const followerIdSet = useMemo(() => new Set(followers.map((f) => f.id)), [followers]);

  // Sort search results: not following first
  const sortedSearchResults = useMemo(() => {
    return [...searchResults].sort((a, b) => {
      const aFollowing = followingSet.has(a.id) ? 1 : 0;
      const bFollowing = followingSet.has(b.id) ? 1 : 0;
      return aFollowing - bFollowing;
    });
  }, [searchResults, followingSet]);

  const UserCard = ({ u }: { u: UserProfile }) => {
    const isFollowing = followingSet.has(u.id);
    const isMe = u.id === myId;

    return (
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <Link
          href={`/u/${u.id}`}
          className="flex items-center gap-3 min-w-0 flex-1 no-underline text-inherit"
        >
          {u.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={u.avatar_url}
              alt={u.display_name ?? t("userProfile.user")}
              className="h-11 w-11 rounded-full object-cover ring-1 ring-gray-200"
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
              <User className="h-5 w-5 text-gray-400" />
            </div>
          )}
          <div className="truncate text-sm font-medium text-gray-900">
            {u.display_name ?? t("userProfile.user")}
          </div>
        </Link>

        {!isMe && (
          isFollowing ? (
            <button
              onClick={() => handleUnfollow(u.id)}
              disabled={!!busy[u.id]}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <UserMinus className="h-4 w-4" />
              {t("following.unfollow")}
            </button>
          ) : (
            <button
              onClick={() => handleFollow(u.id)}
              disabled={!!busy[u.id]}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {t("userProfile.follow")}
            </button>
          )
        )}
      </div>
    );
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
          <h1 className="text-xl font-bold">{t("profile.followers")}</h1>
        </header>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("followers.searchPlaceholder")}
            className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-xs font-medium text-gray-400 hover:text-gray-600">
              {t("common.clear")}
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="text-sm text-gray-500">{t("common.loading")}</div>
          ) : isSearching ? (
            <>
              <div className="text-xs text-gray-500 mb-2">
                {searching ? t("followers.searching") : `${sortedSearchResults.length} ${t("common.results")}`}
              </div>
              {sortedSearchResults.length === 0 && !searching ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
                  {t("followers.noResults")} &quot;{query.trim()}&quot;
                </div>
              ) : (
                sortedSearchResults.map((u) => <UserCard key={u.id} u={u} />)
              )}
            </>
          ) : sortedFollowers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <User className="mb-3 h-10 w-10 text-gray-300" />
              <div className="text-sm font-semibold text-gray-800">{t("followers.empty")}</div>
              <div className="mt-1 text-sm text-gray-500">
                {t("followers.emptyDesc")}
              </div>
            </div>
          ) : (
            sortedFollowers.map((f) => <UserCard key={f.id} u={f} />)
          )}
        </div>
      </div>
    </div>
  );
}
