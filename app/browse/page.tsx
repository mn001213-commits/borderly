"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  Users,
  CalendarDays,
  Clock3,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

type SearchTab = "posts" | "users" | "meets";
type SortMode = "latest" | "popular" | "az" | "newest" | "soonest";

type RecentSearchItem = {
  keyword: string;
  tab: SearchTab;
};

type PostRow = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  category: string;
  like_count: number | null;
  comment_count: number | null;
};

type UserRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  social_status: string | null;
};

type MeetRow = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  city: string | null;
  start_at: string | null;
  type: string | null;
  is_closed: boolean | null;
};

function formatRelative(iso?: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;

  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;

  const year = Math.floor(month / 12);
  return `${year}y ago`;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "Schedule TBD";
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${h}:${min}`;
}

export default function BrowsePage() {
  const [tab, setTab] = useState<SearchTab>("posts");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meets, setMeets] = useState<MeetRow[]>([]);

  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cats = useMemo(
    () => [
      { id: "all", label: "All" },
      { id: "general", label: "General" },
      { id: "skill", label: "Skill Share" },
      { id: "ngo", label: "NGO" },
      { id: "legal", label: "Visa / Legal" },
      { id: "etc", label: "Other" },
    ],
    []
  );

  const catBadge = useMemo(() => {
    const map: Record<string, string> = {
      general: "General",
      skill: "Skill Share",
      ngo: "NGO",
      legal: "Visa / Legal",
      etc: "Other",
    };
    return (k: string) => map[k] ?? k;
  }, []);

  const suggestedKeywords = useMemo(() => {
    if (tab === "posts") {
      return ["visa", "housing", "job", "language exchange", "NGO", "volunteer"];
    }
    if (tab === "users") {
      return ["Japan", "Korea", "student", "worker", "designer", "developer"];
    }
    return ["Tokyo", "Osaka", "Kyoto", "language exchange", "study", "meal"];
  }, [tab]);

  const resultMeta = useMemo(() => {
    const keyword = debouncedQ.trim();

    if (tab === "posts") {
      return {
        text: keyword
          ? `${posts.length} ${posts.length === 1 ? "post" : "posts"} found for "${keyword}"`
          : `${posts.length} ${posts.length === 1 ? "post" : "posts"} found`,
      };
    }

    if (tab === "users") {
      return {
        text: keyword
          ? `${users.length} ${users.length === 1 ? "user" : "users"} found for "${keyword}"`
          : `${users.length} ${users.length === 1 ? "user" : "users"} found`,
      };
    }

    return {
      text: keyword
        ? `${meets.length} ${meets.length === 1 ? "meet" : "meets"} found for "${keyword}"`
        : `${meets.length} ${meets.length === 1 ? "meet" : "meets"} found`,
    };
  }, [tab, posts.length, users.length, meets.length, debouncedQ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("borderly_recent_searches");
      if (!raw) return;
      const parsed = JSON.parse(raw) as RecentSearchItem[];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.slice(0, 8));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        "borderly_recent_searches",
        JSON.stringify(recentSearches.slice(0, 8))
      );
    } catch {}
  }, [recentSearches]);

  useEffect(() => {
    const keyword = debouncedQ.trim();
    if (!keyword) return;

    setRecentSearches((prev) => {
      const deduped = prev.filter(
        (item) =>
          !(item.keyword.toLowerCase() === keyword.toLowerCase() && item.tab === tab)
      );

      return [{ keyword, tab }, ...deduped].slice(0, 8);
    });
  }, [debouncedQ, tab]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const keyword = debouncedQ;

      try {
        if (tab === "posts") {
          let query = supabase
            .from("posts")
            .select(
              "id, created_at, title, content, author_name, category, like_count, comment_count"
            )
            .limit(50);

          if (activeCat !== "all") {
            query = query.eq("category", activeCat);
          }

          if (keyword) {
            query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
          }

          if (sortMode === "popular") {
            query = query
              .order("like_count", { ascending: false, nullsFirst: false })
              .order("comment_count", { ascending: false, nullsFirst: false })
              .order("created_at", { ascending: false });
          } else {
            query = query.order("created_at", { ascending: false });
          }

          const { data, error } = await query;
          if (error) throw error;

          setPosts((data ?? []) as PostRow[]);
          setUsers([]);
          setMeets([]);
        }

        if (tab === "users") {
          let query = supabase
            .from("profiles")
            .select("id, display_name, avatar_url, country_code, social_status")
            .limit(50);

          if (keyword) {
            query = query.or(
              `display_name.ilike.%${keyword}%,country_code.ilike.%${keyword}%,social_status.ilike.%${keyword}%`
            );
          }

          query = query.order("display_name", { ascending: true });

          const { data, error } = await query;
          if (error) throw error;

          setUsers((data ?? []) as UserRow[]);
          setPosts([]);
          setMeets([]);
        }

        if (tab === "meets") {
          let query = supabase
            .from("meets")
            .select("id, created_at, title, description, city, start_at, type, is_closed")
            .limit(50);

          if (keyword) {
            query = query.or(
              `title.ilike.%${keyword}%,description.ilike.%${keyword}%,city.ilike.%${keyword}%`
            );
          }

          if (sortMode === "soonest") {
            query = query.order("start_at", { ascending: true, nullsFirst: false });
          } else {
            query = query.order("created_at", { ascending: false });
          }

          const { data, error } = await query;
          if (error) throw error;

          setMeets((data ?? []) as MeetRow[]);
          setPosts([]);
          setUsers([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data.";
        setErrorMsg(message);
        setPosts([]);
        setUsers([]);
        setMeets([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tab, activeCat, sortMode, debouncedQ]);

  const applyRecentSearch = (item: RecentSearchItem) => {
    setTab(item.tab);
    setQ(item.keyword);

    if (item.tab === "posts") {
      setActiveCat("all");
      setSortMode("latest");
    }
    if (item.tab === "users") {
      setActiveCat("all");
      setSortMode("az");
    }
    if (item.tab === "meets") {
      setActiveCat("all");
      setSortMode("newest");
    }
  };

  const removeRecentSearch = (target: RecentSearchItem) => {
    setRecentSearches((prev) =>
      prev.filter((item) => !(item.keyword === target.keyword && item.tab === target.tab))
    );
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const applySuggestedKeyword = (keyword: string) => {
    setQ(keyword);
  };

  const resetSearch = () => {
    setQ("");
    setActiveCat("all");

    if (tab === "posts") setSortMode("latest");
    if (tab === "users") setSortMode("az");
    if (tab === "meets") setSortMode("newest");
  };

  const EmptyState = () => {
    const keyword = debouncedQ.trim();

    if (tab === "posts") {
      return (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100">
            <FileText size={24} className="text-neutral-500" />
          </div>
          <div className="mt-4 text-lg font-extrabold text-neutral-900">
            No posts found
          </div>
          <div className="mt-2 text-sm text-neutral-500">
            {keyword
              ? `Nothing matched "${keyword}". Try another keyword or a different category.`
              : "There are no posts in this section yet."}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetSearch}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-bold hover:bg-neutral-50"
            >
              Reset Search
            </button>
            <Link
              href="/create"
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
            >
              Write a Post
            </Link>
          </div>
        </div>
      );
    }

    if (tab === "users") {
      return (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
            <Users size={24} className="text-sky-700" />
          </div>
          <div className="mt-4 text-lg font-extrabold text-neutral-900">
            No users found
          </div>
          <div className="mt-2 text-sm text-neutral-500">
            {keyword
              ? `No users matched "${keyword}". Try a country, role, or another name.`
              : "Try searching by country, role, or display name."}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetSearch}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-bold hover:bg-neutral-50"
            >
              Reset Search
            </button>
            <button
              type="button"
              onClick={() => setTab("posts")}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
            >
              Browse Posts
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CalendarDays size={24} className="text-emerald-700" />
        </div>
        <div className="mt-4 text-lg font-extrabold text-neutral-900">
          No meets found
        </div>
        <div className="mt-2 text-sm text-neutral-500">
          {keyword
            ? `No meets matched "${keyword}". Try a city, activity, or another keyword.`
            : "There are no meet results yet. Try another city or keyword."}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={resetSearch}
            className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-bold hover:bg-neutral-50"
          >
            Reset Search
          </button>
          <Link
            href="/meet"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white hover:bg-neutral-800"
          >
            View Meets
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50 to-emerald-50 text-neutral-900">
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="rounded-xl border bg-white px-3 py-2 text-sm font-bold hover:bg-neutral-50"
            >
              ← Home
            </Link>
            <div className="truncate text-base font-black sm:text-lg">Browse</div>
          </div>

          <Link
            href="/create"
            className="shrink-0 rounded-xl border bg-white px-3 py-2 text-sm font-bold hover:bg-neutral-50"
          >
            + New Post
          </Link>
        </header>

        <div className="sticky top-2 z-20 mt-4 sm:top-3 sm:mt-6">
          <section className="rounded-[24px] border border-neutral-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:rounded-[28px] sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Search size={18} />
                <div className="relative w-full md:w-72">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-xl border px-3 py-2 pr-10 text-sm outline-none"
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={() => setQ("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-bold text-neutral-500 hover:bg-neutral-100"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setTab("posts");
                    setActiveCat("all");
                    setSortMode("latest");
                  }}
                  className={cx(
                    "flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold",
                    tab === "posts"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  )}
                >
                  <FileText size={16} />
                  Posts
                </button>

                <button
                  onClick={() => {
                    setTab("users");
                    setActiveCat("all");
                    setSortMode("az");
                  }}
                  className={cx(
                    "flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold",
                    tab === "users"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  )}
                >
                  <Users size={16} />
                  Users
                </button>

                <button
                  onClick={() => {
                    setTab("meets");
                    setActiveCat("all");
                    setSortMode("newest");
                  }}
                  className={cx(
                    "flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold",
                    tab === "meets"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  )}
                >
                  <CalendarDays size={16} />
                  Meets
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
              {tab === "posts" && (
                <>
                  {cats.map((c) => {
                    const on = c.id === activeCat;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveCat(c.id)}
                        className={cx(
                          "rounded-full border px-4 py-2 text-sm font-semibold",
                          on
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white hover:bg-sky-50"
                        )}
                      >
                        {c.label}
                      </button>
                    );
                  })}

                  <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                    <button
                      onClick={() => setSortMode("latest")}
                      className={cx(
                        "rounded-full border px-4 py-2 text-sm font-semibold",
                        sortMode === "latest"
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      )}
                    >
                      Latest
                    </button>
                    <button
                      onClick={() => setSortMode("popular")}
                      className={cx(
                        "rounded-full border px-4 py-2 text-sm font-semibold",
                        sortMode === "popular"
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      )}
                    >
                      Popular
                    </button>
                  </div>
                </>
              )}

              {tab === "users" && (
                <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                  <button
                    onClick={() => setSortMode("az")}
                    className={cx(
                      "rounded-full border px-4 py-2 text-sm font-semibold",
                      sortMode === "az"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    A-Z
                  </button>
                </div>
              )}

              {tab === "meets" && (
                <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                  <button
                    onClick={() => setSortMode("newest")}
                    className={cx(
                      "rounded-full border px-4 py-2 text-sm font-semibold",
                      sortMode === "newest"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    Newest
                  </button>
                  <button
                    onClick={() => setSortMode("soonest")}
                    className={cx(
                      "rounded-full border px-4 py-2 text-sm font-semibold",
                      sortMode === "soonest"
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    )}
                  >
                    Soonest
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="mt-4 sm:mt-5">
          {!loading && !errorMsg && (
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm shadow-sm">
              <div className="font-semibold text-neutral-800">{resultMeta.text}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-neutral-400">
                {tab}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {errorMsg && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {errorMsg}
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600 shadow-sm">
                Loading...
              </div>
            )}

            {!loading && !errorMsg && tab === "posts" && posts.length === 0 && <EmptyState />}
            {!loading && !errorMsg && tab === "users" && users.length === 0 && <EmptyState />}
            {!loading && !errorMsg && tab === "meets" && meets.length === 0 && <EmptyState />}

            {!loading &&
              tab === "posts" &&
              posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:bg-neutral-50 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-lg font-extrabold">{p.title}</div>

                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                          {catBadge(p.category)}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        {p.author_name ?? "Anonymous"} • {formatRelative(p.created_at)}
                      </div>

                      <div className="mt-3 line-clamp-2 text-sm text-neutral-600">
                        {p.content}
                      </div>

                      <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-neutral-500">
                        <span>❤️ {p.like_count ?? 0}</span>
                        <span>💬 {p.comment_count ?? 0}</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-bold text-neutral-500">
                      View →
                    </div>
                  </div>
                </Link>
              ))}

            {!loading &&
              tab === "users" &&
              users.map((u) => (
                <Link
                  key={u.id}
                  href={`/users/${u.id}`}
                  className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:bg-neutral-50 sm:p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={u.avatar_url}
                          alt={u.display_name ?? "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{(u.display_name ?? "U").slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-extrabold">
                        {u.display_name ?? "Unnamed User"}
                      </div>
                      <div className="mt-1 text-sm text-neutral-500">
                        {u.country_code ?? "No country"} • {u.social_status ?? "No status"}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-bold text-neutral-500">
                      View →
                    </div>
                  </div>
                </Link>
              ))}

            {!loading &&
              tab === "meets" &&
              meets.map((m) => (
                <Link
                  key={m.id}
                  href={`/meet/${m.id}`}
                  className="block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:bg-neutral-50 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-lg font-extrabold">{m.title}</div>

                        <span
                          className={cx(
                            "rounded-full px-3 py-1 text-xs font-bold",
                            m.is_closed
                              ? "bg-neutral-200 text-neutral-700"
                              : "bg-sky-100 text-sky-800"
                          )}
                        >
                          {m.is_closed ? "Closed" : "Open"}
                        </span>
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        {m.city ?? "Location TBD"} • {formatDateTime(m.start_at)}
                      </div>

                      <div className="mt-3 line-clamp-2 text-sm text-neutral-600">
                        {m.description}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs font-bold text-neutral-500">
                      View →
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}