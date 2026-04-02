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
      <div
        className="flex items-center gap-3 rounded-2xl p-4 shadow-sm"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
      >
        <Link
          href={`/u/${u.id}`}
          className="flex items-center gap-3 min-w-0 flex-1 no-underline text-inherit"
        >
          {u.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={u.avatar_url}
              alt={u.display_name ?? t("userProfile.user")}
              className="h-11 w-11 rounded-full object-cover"
              style={{ border: "1px solid var(--border-soft)" }}
            />
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
            >
              <User className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            </div>
          )}
          <div className="truncate text-sm font-medium" style={{ color: "var(--deep-navy)" }}>
            {u.display_name ?? t("userProfile.user")}
          </div>
        </Link>

        {!isMe && (
          isFollowing ? (
            <button
              onClick={() => handleUnfollow(u.id)}
              disabled={!!busy[u.id]}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
            >
              <UserMinus className="h-4 w-4" />
              {t("following.unfollow")}
            </button>
          ) : (
            <button
              onClick={() => handleFollow(u.id)}
              disabled={!!busy[u.id]}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)" }}
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
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <header className="flex items-center gap-3 py-3">
          <Link
            href="/profile"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium no-underline transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("profile.followers")}</h1>
        </header>

        {/* Search */}
        <div
          className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("followers.searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--deep-navy)" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs font-medium transition hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
            >
              {t("common.clear")}
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t("common.loading")}</div>
          ) : isSearching ? (
            <>
              <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                {searching ? t("followers.searching") : `${sortedSearchResults.length} ${t("common.results")}`}
              </div>
              {sortedSearchResults.length === 0 && !searching ? (
                <div
                  className="rounded-2xl border border-dashed px-6 py-8 text-center text-sm"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-soft)", color: "var(--text-muted)" }}
                >
                  {t("followers.noResults")} &quot;{query.trim()}&quot;
                </div>
              ) : (
                sortedSearchResults.map((u) => <UserCard key={u.id} u={u} />)
              )}
            </>
          ) : sortedFollowers.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-soft)" }}
            >
              <User className="mb-3 h-10 w-10" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("followers.empty")}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
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
