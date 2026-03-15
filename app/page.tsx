"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "./components/LangProvider";
import {
  Heart,
  MessageCircle,
  Search,
  Flame,
  ChevronRight,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react";

const VIDEO_EXTS = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
function isVideoUrl(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTS.some((ext) => path.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

type Category = "info" | "question" | "daily" | "general" | "jobs" | "other";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  user_id: string | null;
  author_name: string | null;
  like_count: number;
  comment_count: number;
  image_url: string | null;
  image_urls: string[] | null;
  category: Category | null;
  is_hidden?: boolean | null;
};

type AuthorProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

const CAT_COLOR: Record<Category, string> = {
  general: "bg-[#EAF4FF] text-[#4DA6FF]",
  info: "bg-[#E8F5E9] text-[#43A047]",
  question: "bg-[#FFF3E0] text-[#EF6C00]",
  daily: "bg-[#F3E5F5] text-[#8E24AA]",
  jobs: "bg-[#FFF8E1] text-[#F9A825]",
  other: "bg-[#ECEFF1] text-[#546E7A]",
};

export default function HomePage() {
  const { t } = useT();
  const catLabel = (k: string) => t(`cat.${k}`);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Map<string, AuthorProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeCat, setActiveCat] = useState<"all" | Category>("all");
  const [sortMode, setSortMode] = useState<"latest" | "likes">("latest");

  const fetchAuthors = useCallback(async (postIds: string[]) => {
    if (postIds.length === 0) return;
    // Get user_ids from posts table
    const { data: postRows } = await supabase
      .from("posts")
      .select("id, user_id")
      .in("id", postIds);
    if (!postRows) return;

    const userIdMap = new Map<string, string>();
    for (const r of postRows) if (r.user_id) userIdMap.set(r.id, r.user_id);

    // Update posts with user_id
    setPosts((prev) =>
      prev.map((p) => ({ ...p, user_id: userIdMap.get(p.id) ?? p.user_id }))
    );

    // Fetch profiles
    const userIds = [...new Set(postRows.map((r) => r.user_id).filter(Boolean))];
    if (userIds.length === 0) return;
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    if (profileData) {
      setProfiles((prev) => {
        const next = new Map(prev);
        for (const p of profileData) next.set(p.id, p as AuthorProfile);
        return next;
      });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("v_posts_engagement")
      .select("id,created_at,title,content,author_name,like_count,comment_count,image_url,image_urls,category,is_hidden")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const postsData = (data ?? []).map((d) => ({ ...d, user_id: null })) as Post[];
    setPosts(postsData);
    setLoading(false);

    fetchAuthors(postsData.map((p) => p.id));
  }, [fetchAuthors]);

  useEffect(() => {
    load();

    return () => {};
  }, [load]);

  const startedRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Load more posts (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);

    const lastPost = posts[posts.length - 1];
    const { data } = await supabase
      .from("v_posts_engagement")
      .select("id,created_at,title,content,author_name,like_count,comment_count,image_url,image_urls,category,is_hidden")
      .eq("is_hidden", false)
      .lt("created_at", lastPost.created_at)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const newPosts = (data as any[]).map((d) => ({ ...d, user_id: null })) as Post[];
      setPosts((prev) => [...prev, ...newPosts]);
      fetchAuthors(newPosts.map((p) => p.id));
    }
    if (!data || data.length < 20) setHasMore(false);
    setLoadingMore(false);
  }, [posts, loadingMore, hasMore, fetchAuthors]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // Realtime: incremental updates instead of full refetch
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let ch: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);

      if (cancelled) return;

      ch = supabase
        .channel("home:realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
          // New post: fetch full data and prepend
          const newId = payload.new?.id;
          if (!newId) return;
          supabase
            .from("v_posts_engagement")
            .select("id,created_at,title,content,author_name,like_count,comment_count,image_url,image_urls,category,is_hidden")
            .eq("id", newId)
            .maybeSingle()
            .then(({ data: p }) => {
              if (p && !p.is_hidden) {
                setPosts((prev) => [p as Post, ...prev.filter((x) => x.id !== p.id)]);
              }
            });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;
          if (updated.is_hidden) {
            setPosts((prev) => prev.filter((p) => p.id !== updated.id));
          } else {
            supabase
              .from("v_posts_engagement")
              .select("id,created_at,title,content,author_name,like_count,comment_count,image_url,image_urls,category,is_hidden")
              .eq("id", updated.id)
              .maybeSingle()
              .then(({ data: p }) => {
                if (p) setPosts((prev) => prev.map((x) => (x.id === p.id ? (p as Post) : x)));
              });
          }
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
          const oldId = (payload.old as any)?.id;
          if (oldId) setPosts((prev) => prev.filter((p) => p.id !== oldId));
        })
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      startedRef.current = false;
      if (ch) supabase.removeChannel(ch);
    };
  }, []);

  const handleSearch = useCallback(() => {
    setSearchText(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchText("");
  }, []);

  const trendingTop3 = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 72 * 60 * 60 * 1000;

    const cand = posts.filter((p) => {
      const t = new Date(p.created_at).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });

    const score = (p: Post) => (p.like_count ?? 0) * 2 + (p.comment_count ?? 0);

    return cand
      .slice()
      .sort((a, b) => {
        const d = score(b) - score(a);
        if (d !== 0) return d;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 3);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let arr = posts;

    if (activeCat !== "all") {
      arr = arr.filter((p) => (p.category ?? "general") === activeCat);
    }

    const s = searchText.trim().toLowerCase();
    if (s) {
      arr = arr.filter((p) => {
        const title = (p.title ?? "").toLowerCase();
        const content = (p.content ?? "").toLowerCase();
        const author = (p.author_name ?? "").toLowerCase();
        return title.includes(s) || content.includes(s) || author.includes(s);
      });
    }

    arr = arr.slice().sort((a, b) => {
      if (sortMode === "likes") {
        const scoreA = (a.like_count ?? 0) + (a.comment_count ?? 0);
        const scoreB = (b.like_count ?? 0) + (b.comment_count ?? 0);
        const diff = scoreB - scoreA;
        if (diff !== 0) return diff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return arr;
  }, [posts, searchText, activeCat, sortMode]);

  const catTabs: Array<"all" | Category> = ["all", "general", "info", "question", "daily", "jobs", "other"];

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Search bar */}
        <div className="mb-6">
          <div
            className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
            style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
          >
            <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder={t("home.searchPosts")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
              style={{ color: "var(--deep-navy)" }}
            />
            {searchInput && (
              <button type="button" onClick={clearSearch} className="text-xs font-medium hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                {t("common.clear")}
              </button>
            )}
          </div>
        </div>

        {/* Category tabs + sort */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {catTabs.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setActiveCat(k)}
                className={activeCat === k ? "b-pill b-pill-active" : "b-pill b-pill-inactive"}
              >
                {catLabel(k)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortMode("latest")}
              className="b-pill"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 13,
                background: sortMode === "latest" ? "var(--deep-navy)" : "transparent",
                color: sortMode === "latest" ? "#fff" : "var(--text-secondary)",
                border: sortMode === "latest" ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <Clock className="h-3.5 w-3.5" />
              {t("common.latest")}
            </button>
            <button
              type="button"
              onClick={() => setSortMode("likes")}
              className="b-pill"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 13,
                background: sortMode === "likes" ? "var(--deep-navy)" : "transparent",
                color: sortMode === "likes" ? "#fff" : "var(--text-secondary)",
                border: sortMode === "likes" ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {t("common.popular")}
            </button>

            <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {filteredPosts.length} {t("common.posts")}
              {searchText && <> · &quot;{searchText}&quot;</>}
            </span>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-6">
            {/* Trending */}
            {!loading && !errorMsg && trendingTop3.length > 0 && (
              <section className="b-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-base font-semibold" style={{ color: "var(--deep-navy)" }}>
                    <Flame className="h-5 w-5 text-orange-400" />
                    {t("home.trending")}
                  </div>
                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-1 text-sm font-medium no-underline transition hover:opacity-70"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {t("home.seeAll")} <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-3">
                  {trendingTop3.map((p, idx) => (
                    <Link key={p.id} href={`/posts/${p.id}`} className="no-underline text-inherit">
                      <div
                        className="flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:shadow-sm"
                        style={{ background: "var(--light-blue)" }}
                      >
                        <div className="w-6 text-center text-sm font-bold" style={{ color: "var(--primary)" }}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                            {p.title}
                          </div>
                          <div className="mt-0.5 truncate text-xs" style={{ color: "var(--text-muted)" }}>
                            {p.author_name ?? t("home.anonymous")} · {formatRelative(p.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                          <Heart className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{p.like_count ?? 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Post cards */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="b-skeleton h-48" />
                ))}
              </div>
            )}

            {errorMsg && (
              <div className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {!loading && !errorMsg && filteredPosts.map((p, idx) => {
              const profile = p.user_id ? profiles.get(p.user_id) : null;
              const displayName = profile?.display_name || p.author_name || t("home.anonymous");
              const avatarUrl = profile?.avatar_url;
              const initial = (displayName?.[0] ?? "?").toUpperCase();

              return (
              <Link key={p.id} href={`/posts/${p.id}`} className="no-underline text-inherit">
                <article className="b-card b-card-hover b-animate-in p-5" style={{ animationDelay: `${idx * 0.05}s` }}>
                  {/* Author + time */}
                  <div className="flex items-center gap-2.5 mb-3">
                    {p.user_id ? (
                      <Link
                        href={`/u/${p.user_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-2.5 no-underline text-inherit hover:opacity-80 transition"
                      >
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                            style={{ border: "2px solid var(--border-soft)" }}
                          />
                        ) : (
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: "var(--primary)" }}
                          >
                            {initial}
                          </div>
                        )}
                        <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                          {displayName}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: "var(--text-muted)" }}
                        >
                          ?
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                          {displayName}
                        </span>
                      </div>
                    )}
                    <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      · {formatRelative(p.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h2
                    className="line-clamp-2 text-lg font-semibold leading-snug"
                    style={{ color: "var(--deep-navy)" }}
                  >
                    {p.title}
                  </h2>

                  {/* Category tag */}
                  <div className="mt-2.5">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${
                        CAT_COLOR[(p.category ?? "general") as Category]
                      }`}
                    >
                      {catLabel(p.category ?? "general")}
                    </span>
                  </div>

                  {/* Content preview */}
                  <p
                    className="mt-3 line-clamp-3 text-[14px] leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {p.content.length > 200 ? `${p.content.slice(0, 200)}...` : p.content}
                  </p>

                  {/* Media */}
                  {p.image_url && (
                    <div className="relative mt-4">
                      {isVideoUrl(p.image_url) ? (
                        <video
                          src={p.image_url}
                          controls
                          preload="metadata"
                          className="w-full rounded-2xl"
                          style={{ border: "1px solid var(--border-soft)" }}
                          onClick={(e) => e.preventDefault()}
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.image_url}
                          alt=""
                          className="w-full rounded-2xl"
                          style={{ border: "1px solid var(--border-soft)" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                      {p.image_urls && p.image_urls.length > 1 && (
                        <div className="absolute top-3 right-3 inline-flex h-7 items-center rounded-full bg-black/60 px-2.5 text-xs font-semibold text-white">
                          +{p.image_urls.length - 1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-5">
                    <div className="flex items-center gap-1.5 transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                      <Heart className="h-[18px] w-[18px]" />
                      <span className="text-[13px] font-medium">{p.like_count ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                      <MessageCircle className="h-[18px] w-[18px]" />
                      <span className="text-[13px] font-medium">{p.comment_count ?? 0}</span>
                    </div>
                  </div>
                </article>
              </Link>
              );
            })}

            {/* Infinite scroll sentinel */}
            {!loading && !errorMsg && hasMore && filteredPosts.length > 0 && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && <div className="b-skeleton h-10 w-40 rounded-2xl" />}
              </div>
            )}

            {!loading && !errorMsg && filteredPosts.length === 0 && (
              <div
                className="flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center"
                style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}
              >
                <FileText className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
                <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                  {t("home.noPostsFound")}
                </div>
                <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  {searchText ? t("home.tryKeyword") : t("home.beFirst")}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
