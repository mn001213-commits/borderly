"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { useT } from "@/app/components/LangProvider";
import { isVideoUrl, formatRelative } from "@/lib/format";
import { type Category } from "@/lib/constants";
import { sortByEngagement } from "@/lib/sortingUtils";
import {
  Heart,
  MessageCircle,
  Search,
  Flame,
  ChevronRight,
  FileText,
  Clock,
  TrendingUp,
  Plus,
  LayoutGrid,
  Info,
  HelpCircle,
  Sun,
  Briefcase,
  MoreHorizontal,
} from "lucide-react";
import SortDropdown from "@/app/components/SortDropdown";

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

const CAT_COLOR: Record<Category, string> = {
  general: "bg-[#F0F4FF] text-[#4361EE]",
  info: "bg-[#EEFBF3] text-[#06D6A0]",
  question: "bg-[#FFF4EC] text-[#F77F00]",
  daily: "bg-[#F5F0FF] text-[#7B2FF2]",
  jobs: "bg-[#FFF8EB] text-[#E6A817]",
  other: "bg-[#F5F5F3] text-[#737373]",
};

// Fetch like & comment counts for a list of post IDs
async function fetchEngagement(postIds: string[]): Promise<Map<string, { likes: number; comments: number }>> {
  const map = new Map<string, { likes: number; comments: number }>();
  if (postIds.length === 0) return map;

  for (const id of postIds) map.set(id, { likes: 0, comments: 0 });

  try {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from("post_likes").select("post_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds).eq("is_hidden", false),
    ]);

    if (likesRes.data) {
      for (const row of likesRes.data) {
        const entry = map.get(row.post_id);
        if (entry) entry.likes++;
      }
    }
    if (commentsRes.data) {
      for (const row of commentsRes.data) {
        const entry = map.get(row.post_id);
        if (entry) entry.comments++;
      }
    }
  } catch {
    // Engagement fetch failed — show posts without counts
  }
  return map;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useT();

  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Map<string, AuthorProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeCat, setActiveCat] = useState<"all" | Category>("all");
  const [sortMode, setSortMode] = useState<"latest" | "likes">("latest");

  const enrichPosts = useCallback(async (rawPosts: any[]): Promise<Post[]> => {
    const ids = rawPosts.map((p) => p.id);
    const userIds = [...new Set(rawPosts.map((p) => p.user_id).filter(Boolean))] as string[];

    // Fetch engagement counts and profiles in parallel
    const [engagement, profilesRes] = await Promise.all([
      fetchEngagement(ids),
      userIds.length > 0
        ? supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Update profiles map
    if (profilesRes.data && profilesRes.data.length > 0) {
      setProfiles((prev) => {
        const next = new Map(prev);
        for (const p of profilesRes.data!) next.set(p.id, p as AuthorProfile);
        return next;
      });
    }

    return rawPosts.map((p) => ({
      ...p,
      like_count: engagement.get(p.id)?.likes ?? 0,
      comment_count: engagement.get(p.id)?.comments ?? 0,
    })) as Post[];
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("posts")
      .select("id,created_at,title,content,user_id,author_name,image_url,image_urls,category,is_hidden")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const enriched = await enrichPosts(data ?? []);
    setPosts(enriched);
    setLoading(false);
  }, [enrichPosts]);

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
      .from("posts")
      .select("id,created_at,title,content,user_id,author_name,image_url,image_urls,category,is_hidden")
      .eq("is_hidden", false)
      .lt("created_at", lastPost.created_at)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const enriched = await enrichPosts(data);
      setPosts((prev) => [...prev, ...enriched]);
    }
    if (!data || data.length < 20) setHasMore(false);
    setLoadingMore(false);
  }, [posts, loadingMore, hasMore, enrichPosts]);

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
    let likeChannel: ReturnType<typeof supabase.channel> | null = null;
    let commentChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);

      if (cancelled) return;

      ch = supabase
        .channel("home:realtime")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
          const newPost = payload.new as any;
          if (!newPost?.id || newPost.is_hidden) return;
          enrichPosts([newPost]).then((enriched) => {
            if (enriched.length > 0) {
              setPosts((prev) => [enriched[0], ...prev.filter((x) => x.id !== enriched[0].id)]);
            }
          });
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "posts" }, (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;
          if (updated.is_hidden) {
            setPosts((prev) => prev.filter((p) => p.id !== updated.id));
          } else {
            enrichPosts([updated]).then((enriched) => {
              if (enriched.length > 0) {
                setPosts((prev) => prev.map((x) => (x.id === enriched[0].id ? enriched[0] : x)));
              }
            });
          }
        })
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "posts" }, (payload) => {
          const oldId = (payload.old as any)?.id;
          if (oldId) setPosts((prev) => prev.filter((p) => p.id !== oldId));
        })
        .subscribe();

      // Real-time like count updates
      likeChannel = supabase
        .channel("browse-likes")
        .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const postId = (payload.new as any).post_id;
            setPosts((prev) =>
              prev.map((post) =>
                post.id === postId
                  ? { ...post, like_count: (post.like_count || 0) + 1 }
                  : post
              )
            );
          } else if (payload.eventType === "DELETE" && payload.old) {
            const postId = (payload.old as any).post_id;
            setPosts((prev) =>
              prev.map((post) =>
                post.id === postId
                  ? { ...post, like_count: Math.max(0, (post.like_count || 0) - 1) }
                  : post
              )
            );
          }
        })
        .subscribe();

      // Real-time comment count updates
      commentChannel = supabase
        .channel("browse-comments")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
          if (payload.new) {
            const postId = (payload.new as any).post_id;
            const isHidden = (payload.new as any).is_hidden;
            if (!isHidden) {
              setPosts((prev) =>
                prev.map((post) =>
                  post.id === postId
                    ? { ...post, comment_count: (post.comment_count || 0) + 1 }
                    : post
                )
              );
            }
          }
        })
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      startedRef.current = false;
      if (ch) supabase.removeChannel(ch);
      if (likeChannel) supabase.removeChannel(likeChannel);
      if (commentChannel) supabase.removeChannel(commentChannel);
    };
  }, [enrichPosts]);

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

    return sortByEngagement(cand).slice(0, 3);
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

    if (sortMode === "likes") {
      arr = sortByEngagement(arr);
    } else {
      arr = arr.slice().sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return arr;
  }, [posts, searchText, activeCat, sortMode]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="b-skeleton h-10 w-40 rounded-2xl" />
      </div>
    );
  }

  const catIcon: Record<string, { icon: React.ElementType; color: string }> = {
    all: { icon: LayoutGrid, color: "#4A8FE7" },
    general: { icon: MessageCircle, color: "#4361EE" },
    info: { icon: Info, color: "#06D6A0" },
    question: { icon: HelpCircle, color: "#F77F00" },
    daily: { icon: Sun, color: "#7B2FF2" },
    jobs: { icon: Briefcase, color: "#E6A817" },
    other: { icon: MoreHorizontal, color: "#737373" },
  };
  const catLabel = (k: string) => t(`cat.${k}`);

  const catTabs: Array<"all" | Category> = ["all", "general", "info", "question", "daily", "jobs", "other"];

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Search bar + Create button */}
        <div className="mb-6 flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2.5 rounded-2xl px-4 py-3"
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
              <button type="button" onClick={clearSearch} className="text-xs font-medium whitespace-nowrap hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                {t("common.clear")}
              </button>
            )}
          </div>
          <Link
            href="/create"
            className="b-btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white no-underline"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>

        {/* Category tabs + sort */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide flex-1 min-w-0">
              {catTabs.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setActiveCat(k)}
                  className={activeCat === k ? "b-pill b-pill-active" : "b-pill b-pill-inactive"}
                >
                  {(() => { const ci = catIcon[k]; if (!ci) return null; const I = ci.icon; return <I className="h-3.5 w-3.5 shrink-0" style={{ color: activeCat === k ? "#fff" : ci.color }} />; })()}
                  {catLabel(k)}
                </button>
              ))}
            </div>
            <SortDropdown
              options={[
                { key: "latest", label: t("common.latest"), icon: <Clock className="h-3.5 w-3.5" /> },
                { key: "likes", label: t("common.popular"), icon: <TrendingUp className="h-3.5 w-3.5" /> },
              ]}
              value={sortMode}
              onChange={(k) => setSortMode(k as "latest" | "likes")}
            />
          </div>
          <div className="mt-2 flex items-center">
            <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {filteredPosts.length} {t("common.posts")}
              {searchText && <> · &quot;{searchText}&quot;</>}
            </span>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-5">
            {/* Trending */}
            {!loading && !errorMsg && trendingTop3.length > 0 && (
              <section className="b-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-base font-semibold" style={{ color: "var(--deep-navy)" }}>
                    <Flame className="h-5 w-5 text-orange-400" />
                    {t("home.trending")}
                  </div>
                  <Link
                    href="/"
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
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
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
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
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
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                          {displayName}
                        </span>
                      </div>
                    )}
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
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
                      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
                        CAT_COLOR[(p.category ?? "general") as Category]
                      }`}
                    >
                      {catLabel(p.category ?? "general")}
                    </span>
                  </div>

                  {/* Content preview */}
                  <p
                    className="mt-3 line-clamp-3 text-sm leading-relaxed"
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
                      <span className="text-xs font-medium">{p.like_count ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                      <MessageCircle className="h-[18px] w-[18px]" />
                      <span className="text-xs font-medium">{p.comment_count ?? 0}</span>
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
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center"
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
