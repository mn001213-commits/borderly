"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Heart,
  MessageCircle,
  Search,
  Flame,
  ChevronRight,
  Plus,
  FileText,
} from "lucide-react";

type Category = "info" | "question" | "daily" | "general" | "jobs" | "other";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  like_count: number;
  comment_count: number;
  image_url: string | null;
  category: Category | null;
  is_hidden?: boolean | null;
};

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

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

const CAT_LABEL: Record<"all" | Category, string> = {
  all: "All",
  general: "General",
  info: "Info",
  question: "Question",
  daily: "Daily",
  jobs: "Jobs",
  other: "Other",
};

export default function HomePage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeCat, setActiveCat] = useState<"all" | Category>("all");
  const [sortMode, setSortMode] = useState<"latest" | "likes">("latest");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("v_posts_engagement")
      .select("id,created_at,title,content,author_name,like_count,comment_count,image_url,category,is_hidden")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setPosts((data ?? []) as Post[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const startedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const refetchSoon = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => load(), 250);
      };

      ch = supabase
        .channel("home:realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, refetchSoon)
        .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, refetchSoon)
        .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, refetchSoon)
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      startedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [load]);

  const handleSearch = useCallback(() => {
    setSearchText(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchText("");
  }, []);

  const goBrowseWithSearch = useCallback(() => {
    const q = searchInput.trim();
    if (q) {
      router.push(`/browse?q=${encodeURIComponent(q)}`);
      return;
    }
    router.push("/browse");
  }, [router, searchInput]);

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

  const catCounts = useMemo(() => {
    const base: Record<"all" | Category, number> = {
      all: posts.length,
      general: 0,
      info: 0,
      question: 0,
      daily: 0,
      jobs: 0,
      other: 0,
    };

    for (const p of posts) {
      const k = (p.category ?? "general") as Category;
      if (k in base) {
        base[k] = (base[k] ?? 0) + 1;
      } else {
        base.other = (base.other ?? 0) + 1;
      }
    }

    return base;
  }, [posts]);

  const catTabs: Array<"all" | Category> = ["all", "general", "info", "question", "daily", "jobs", "other"];

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
  const pillBase =
    "inline-flex h-9 items-center rounded-full px-3 text-sm font-medium transition whitespace-nowrap";

  const SegTab = ({ k }: { k: "all" | Category }) => {
    const active = activeCat === k;

    return (
      <button
        type="button"
        onClick={() => setActiveCat(k)}
        className={cx(
          pillBase,
          active ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
        )}
      >
        {CAT_LABEL[k]}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <header className="flex items-center justify-between gap-3 py-3">
          <h1 className="text-xl font-bold">Community</h1>
          <Link
            href={isAuthed ? "/create" : "/login"}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Post
          </Link>
        </header>

        <div className="space-y-4">
            <section className={cx(card, "p-4")}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-gray-400" />
                  <input
                    id="home-search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    placeholder="Search..."
                    className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                  {searchInput && (
                    <button type="button" onClick={clearSearch} className="text-xs font-medium text-gray-400 hover:text-gray-600">
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {catTabs.map((k) => (
                    <SegTab key={k} k={k} />
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={() => setSortMode("latest")}
                    className={cx(
                      "inline-flex h-8 items-center rounded-full px-3 font-medium transition",
                      sortMode === "latest"
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
                    )}
                  >
                    Latest
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortMode("likes")}
                    className={cx(
                      "inline-flex h-8 items-center rounded-full px-3 font-medium transition",
                      sortMode === "likes"
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
                    )}
                  >
                    Popular
                  </button>

                  <span className="ml-auto text-right">
                    Results <b className="text-gray-900">{filteredPosts.length}</b>
                    {searchText ? (
                      <>
                        {" "}
                        · Search <b className="text-gray-900">{searchText}</b>
                      </>
                    ) : null}
                    {activeCat !== "all" ? (
                      <>
                        {" "}
                        · <b className="text-gray-900">{CAT_LABEL[activeCat]}</b> ({catCounts[activeCat] ?? 0})
                      </>
                    ) : (
                      <>
                        {" "}
                        · <b className="text-gray-900">All</b> ({catCounts.all})
                      </>
                    )}
                  </span>
                </div>
              </div>
            </section>

            {!loading && !errorMsg && trendingTop3.length > 0 && (
              <section className={cx(card, "p-4 sm:p-5")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <Flame className="h-5 w-5 text-orange-500" />
                    Trending
                  </div>

                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 transition hover:text-gray-900"
                  >
                    See all <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-3 grid gap-2">
                  {trendingTop3.map((p, idx) => (
                    <Link key={p.id} href={`/posts/${p.id}`} className="no-underline text-inherit">
                      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-[#F0F7FF] px-3 py-3 transition hover:bg-white">
                        <div className="w-6 text-sm font-semibold text-gray-400">{idx + 1}</div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">{p.title}</div>
                          <div className="mt-1 truncate text-xs text-gray-500">
                            {p.author_name ?? "Anonymous"} · {formatRelative(p.created_at)}
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1 text-gray-500">
                          <Heart className="h-4 w-4" />
                          <span className="text-xs font-medium">{p.like_count ?? 0}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-3">
              {loading && (
                <div className={cx(card, "p-5 text-sm text-gray-500")}>
                  Loading...
                </div>
              )}

              {errorMsg && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              {!loading &&
                !errorMsg &&
                filteredPosts.map((p) => (
                  <Link key={p.id} href={`/posts/${p.id}`} className="no-underline text-inherit">
                    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-gray-400">
                            {p.author_name ?? "Anonymous"} · {formatRelative(p.created_at)}
                          </div>

                          <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-gray-900 sm:text-base">
                            {p.title}
                          </h2>

                          <div className="mt-2 inline-flex h-7 items-center rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-600">
                            {CAT_LABEL[(p.category ?? "general") as Category]}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3 text-gray-500">
                          <div className="inline-flex items-center gap-1">
                            <Heart className="h-5 w-5" />
                            <span className="text-xs font-medium">{p.like_count ?? 0}</span>
                          </div>
                          <div className="inline-flex items-center gap-1">
                            <MessageCircle className="h-5 w-5" />
                            <span className="text-xs font-medium">{p.comment_count ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      {p.image_url ? (
                        <div className="mt-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.image_url}
                            alt="Post thumbnail"
                            className="h-44 w-full rounded-xl object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      ) : null}

                      <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                        {p.content.length > 180 ? `${p.content.slice(0, 180)}...` : p.content}
                      </p>
                    </article>
                  </Link>
                ))}

              {!loading && !errorMsg && filteredPosts.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
                  <FileText className="mb-3 h-10 w-10 text-gray-300" />
                  <div className="text-sm font-semibold text-gray-800">No posts found</div>
                  <div className="mt-1 text-sm text-gray-500">
                    {searchText ? "Try another keyword." : "Be the first to share something."}
                  </div>
                </div>
              )}
            </section>
        </div>
      </div>
    </div>
  );
}