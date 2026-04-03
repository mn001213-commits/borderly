"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Search, User } from "lucide-react";
import {
  followUser,
  unfollowUser,
  getFollowing,
  searchUsersToFollow,
  getSuggestedUsers,
  type ProfileSearchResult,
} from "@/lib/followService";
import { useAuth } from "@/app/components/AuthProvider";
import { countryName } from "@/lib/countries";

export default function SearchPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [suggested, setSuggested] = useState<ProfileSearchResult[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [busySet, setBusySet] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    async function init() {
      const following = await getFollowing(user!.id);
      const ids = following.map((f) => f.following_id as string);
      setFollowingSet(new Set(ids));
      const suggestions = await getSuggestedUsers(user!.id, ids);
      setSuggested(suggestions);
    }
    init();
  }, [user]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || !user) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const data = await searchUsersToFollow(query.trim(), user.id);
      setResults(data);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  async function toggleFollow(targetId: string) {
    if (!user || busySet.has(targetId)) return;
    setBusySet((prev) => new Set(prev).add(targetId));
    if (followingSet.has(targetId)) {
      await unfollowUser(user.id, targetId);
      setFollowingSet((prev) => {
        const s = new Set(prev);
        s.delete(targetId);
        return s;
      });
    } else {
      await followUser(user.id, targetId);
      setFollowingSet((prev) => new Set(prev).add(targetId));
    }
    setBusySet((prev) => {
      const s = new Set(prev);
      s.delete(targetId);
      return s;
    });
  }

  const showList = query.trim() ? results : suggested;
  const isSearchMode = !!query.trim();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-24 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-[var(--bg-elevated)]"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--deep-navy)" }}>
          Find People
        </h1>
      </div>

      <div className="relative mb-6">
        <Search
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
        />
        <input
          type="text"
          placeholder="Search by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="w-full h-11 rounded-xl pl-10 pr-4 text-sm outline-none transition-colors"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--deep-navy)",
            border: "1.5px solid var(--border-soft)",
          }}
        />
      </div>

      {!isSearchMode && (
        <p
          className="text-xs font-semibold uppercase tracking-wide mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          Suggested
        </p>
      )}

      {isSearchMode && searching && (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          Searching...
        </p>
      )}

      <div className="space-y-3">
        {!searching &&
          showList.map((u) => (
            <div key={u.id} className="b-card p-4 flex items-center gap-3">
              <Link href={`/u/${u.id}`} className="shrink-0">
                {u.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={u.avatar_url}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: "var(--primary-light)" }}
                  >
                    <User className="h-5 w-5" style={{ color: "var(--primary)" }} />
                  </div>
                )}
              </Link>

              <Link href={`/u/${u.id}`} className="flex-1 min-w-0 no-underline">
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--deep-navy)" }}
                >
                  {u.display_name ?? "Unknown"}
                </p>
                {(u.origin_country || u.residence_country) && (
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {u.origin_country && countryName(u.origin_country)}
                    {u.origin_country && u.residence_country && " → "}
                    {u.residence_country && countryName(u.residence_country)}
                  </p>
                )}
              </Link>

              <button
                onClick={() => toggleFollow(u.id)}
                disabled={busySet.has(u.id)}
                className={`shrink-0 h-9 rounded-xl px-3 text-sm font-semibold transition-colors ${
                  followingSet.has(u.id) ? "b-btn-secondary" : "b-btn-primary"
                }`}
              >
                {followingSet.has(u.id) ? "Following" : "Follow"}
              </button>
            </div>
          ))}

        {!isSearchMode && suggested.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            No suggestions yet
          </p>
        )}
        {isSearchMode && !searching && results.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            No users found for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
