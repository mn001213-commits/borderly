"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  CalendarDays,
  ShieldCheck,
  Clock3,
  Sparkles,
  Heart,
  MessageCircle,
  MapPin,
  X,
  Users,
  LayoutGrid,
  Info,
  HelpCircle,
  Sun,
  Briefcase,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import NgoVerifiedBadge from "@/app/components/NgoVerifiedBadge";
import { useT } from "@/app/components/LangProvider";

type SearchTab = "posts" | "meets" | "ngo";
type SortMode = "latest" | "popular" | "newest" | "soonest";

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

type NgoRow = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  location: string | null;
  ngo_name: string | null;
  ngo_verified: boolean;
  application_count: number | null;
  is_closed: boolean | null;
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  general: { bg: "#E3F2FD", color: "#1565C0" },
  info: { bg: "#FFF3E0", color: "#EF6C00" },
  question: { bg: "#F3E5F5", color: "#8E24AA" },
  daily: { bg: "#E8F5E9", color: "#2E7D32" },
  jobs: { bg: "#FFF8E1", color: "#F57F17" },
  other: { bg: "#F5F5F5", color: "#616161" },
};

const MEET_TYPE_CLASSES: Record<string, string> = {
  hangout: "b-meet-hangout",
  study: "b-meet-study",
  language: "b-meet-language",
  meal: "b-meet-meal",
  sports: "b-meet-sports",
  culture: "b-meet-culture",
  volunteer: "b-meet-volunteer",
  other: "b-meet-other",
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

function formatDateTime(iso?: string | null, fallback = "Schedule TBD") {
  if (!iso) return fallback;
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${h}:${min}`;
}

export default function BrowsePage() {
  const { t } = useT();
  const [tab, setTab] = useState<SearchTab>("posts");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [meets, setMeets] = useState<MeetRow[]>([]);
  const [ngos, setNgos] = useState<NgoRow[]>([]);

  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const catIcon: Record<string, { icon: React.ElementType; color: string }> = {
    all: { icon: LayoutGrid, color: "#4DA6FF" },
    general: { icon: MessageCircle, color: "#7EC8E3" },
    info: { icon: Info, color: "#95E1D3" },
    question: { icon: HelpCircle, color: "#F9D56E" },
    daily: { icon: Sun, color: "#F3A683" },
    jobs: { icon: Briefcase, color: "#AA96DA" },
    other: { icon: MoreHorizontal, color: "#C4C4C4" },
  };
  const cats = useMemo(
    () => [
      { id: "all" },
      { id: "general" },
      { id: "info" },
      { id: "question" },
      { id: "daily" },
      { id: "jobs" },
      { id: "other" },
    ],
    []
  );

  const catBadge = (k: string) => t(`cat.${k}`);

  const resultCount = useMemo(() => {
    if (tab === "posts") return posts.length;
    if (tab === "ngo") return ngos.length;
    return meets.length;
  }, [tab, posts.length, meets.length, ngos.length]);

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
            .select("id, created_at, title, content, author_name, category")
            .eq("is_hidden", false)
            .limit(50);

          if (activeCat !== "all") query = query.eq("category", activeCat);
          if (keyword) query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
          query = query.order("created_at", { ascending: false });

          const { data, error } = await query;
          if (error) throw error;
          setPosts((data ?? []).map((p: any) => ({ ...p, like_count: 0, comment_count: 0 })) as PostRow[]);
          setMeets([]);
          setNgos([]);
        }

        if (tab === "meets") {
          let query = supabase
            .from("meet_posts")
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
          setNgos([]);
        }

        if (tab === "ngo") {
          let query = supabase
            .from("v_ngo_posts")
            .select("id, created_at, title, description, location, ngo_name, ngo_verified, application_count, is_closed")
            .limit(50);

          if (keyword) {
            query = query.or(
              `title.ilike.%${keyword}%,description.ilike.%${keyword}%,location.ilike.%${keyword}%,ngo_name.ilike.%${keyword}%`
            );
          }

          query = query.order("created_at", { ascending: false });

          const { data, error } = await query;
          if (error) throw error;
          setNgos((data ?? []) as NgoRow[]);
          setPosts([]);
          setMeets([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data.";
        setErrorMsg(message);
        setPosts([]);
        setMeets([]);
        setNgos([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tab, activeCat, sortMode, debouncedQ]);

  const applyRecentSearch = (item: RecentSearchItem) => {
    setTab(item.tab);
    setQ(item.keyword);
    setActiveCat("all");
    if (item.tab === "posts") setSortMode("latest");
    if (item.tab === "meets") setSortMode("newest");
    if (item.tab === "ngo") setSortMode("latest");
  };

  const removeRecentSearch = (target: RecentSearchItem) => {
    setRecentSearches((prev) =>
      prev.filter((item) => !(item.keyword === target.keyword && item.tab === target.tab))
    );
  };

  const clearRecentSearches = () => setRecentSearches([]);

  const resetSearch = () => {
    setQ("");
    setActiveCat("all");
    if (tab === "posts") setSortMode("latest");
    if (tab === "meets") setSortMode("newest");
    if (tab === "ngo") setSortMode("latest");
  };

  const tabIcon = (tb: SearchTab) => {
    if (tb === "posts") return <FileText className="h-3.5 w-3.5" />;
    if (tb === "ngo") return <ShieldCheck className="h-3.5 w-3.5" />;
    return <CalendarDays className="h-3.5 w-3.5" />;
  };

  const tabLabel = (tb: SearchTab) => {
    if (tb === "posts") return t("browse.posts");
    if (tb === "ngo") return t("browse.ngo");
    return t("browse.meets");
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Search bar */}
        <div className="sticky top-2 z-20">
          <div className="b-card p-3" style={{ backdropFilter: "blur(12px)" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("browse.searchAll")}
                className="w-full rounded-2xl py-2.5 pl-10 pr-10 text-sm outline-none"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full transition hover:opacity-70"
                  style={{ background: "var(--border-soft)" }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="mt-3 flex items-center gap-3">
              {(["posts", "meets", "ngo"] as SearchTab[]).map((tb) => (
                <button
                  key={tb}
                  onClick={() => {
                    setTab(tb);
                    setActiveCat("all");
                    if (tb === "posts") setSortMode("latest");
                    if (tb === "meets") setSortMode("newest");
                    if (tb === "ngo") setSortMode("latest");
                  }}
                  className="b-pill shrink-0"
                  style={{
                    height: 34,
                    padding: "0 14px",
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: tab === tb ? "var(--deep-navy)" : "transparent",
                    color: tab === tb ? "#fff" : "var(--text-secondary)",
                    border: tab === tb ? "none" : "1px solid var(--border-soft)",
                  }}
                >
                  {tabIcon(tb)}
                  {tabLabel(tb)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category pills (posts only) */}
        {tab === "posts" && (
          <div className="mt-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className="b-pill shrink-0"
                style={{
                  height: 36,
                  padding: "0 14px",
                  fontSize: 13,
                  background: activeCat === c.id ? "var(--deep-navy)" : "transparent",
                  color: activeCat === c.id ? "#fff" : "var(--text-secondary)",
                  border: activeCat === c.id ? "none" : "1px solid var(--border-soft)",
                }}
              >
                {(() => { const ci = catIcon[c.id]; if (!ci) return null; const I = ci.icon; return <I className="h-3.5 w-3.5 shrink-0" style={{ color: ci.color }} />; })()}
                {t("cat." + c.id)}
              </button>
            ))}
          </div>
        )}

        {/* Sort pills */}
        <div className="mt-3 flex items-center gap-3">
          {tab === "posts" && (
            <>
              <button onClick={() => setSortMode("latest")} className="b-pill shrink-0" style={{ height: 36, padding: "0 14px", fontSize: 13, background: sortMode === "latest" ? "var(--deep-navy)" : "transparent", color: sortMode === "latest" ? "#fff" : "var(--text-secondary)", border: sortMode === "latest" ? "none" : "1px solid var(--border-soft)" }}>
                <Clock3 className="mr-1 inline h-3.5 w-3.5" />{t("common.latest")}
              </button>
              <button onClick={() => setSortMode("popular")} className="b-pill shrink-0" style={{ height: 36, padding: "0 14px", fontSize: 13, background: sortMode === "popular" ? "var(--deep-navy)" : "transparent", color: sortMode === "popular" ? "#fff" : "var(--text-secondary)", border: sortMode === "popular" ? "none" : "1px solid var(--border-soft)" }}>
                <Sparkles className="mr-1 inline h-3.5 w-3.5" />{t("common.popular")}
              </button>
            </>
          )}
          {tab === "meets" && (
            <>
              <button onClick={() => setSortMode("newest")} className="b-pill shrink-0" style={{ height: 36, padding: "0 14px", fontSize: 13, background: sortMode === "newest" ? "var(--deep-navy)" : "transparent", color: sortMode === "newest" ? "#fff" : "var(--text-secondary)", border: sortMode === "newest" ? "none" : "1px solid var(--border-soft)" }}>
                <Clock3 className="mr-1 inline h-3.5 w-3.5" />{t("browse.newest")}
              </button>
              <button onClick={() => setSortMode("soonest")} className="b-pill shrink-0" style={{ height: 36, padding: "0 14px", fontSize: 13, background: sortMode === "soonest" ? "var(--deep-navy)" : "transparent", color: sortMode === "soonest" ? "#fff" : "var(--text-secondary)", border: sortMode === "soonest" ? "none" : "1px solid var(--border-soft)" }}>
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />{t("browse.soonest")}
              </button>
            </>
          )}

          {/* Result count */}
          {!loading && !errorMsg && (
            <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {resultCount} {tab === "posts" ? (resultCount === 1 ? t("browse.post") : t("browse.posts")) : tab === "ngo" ? (resultCount === 1 ? t("browse.post") : t("browse.posts")) : (resultCount === 1 ? t("browse.meet") : t("browse.meets"))}
            </span>
          )}
        </div>

        {/* Recent searches */}
        {recentSearches.length > 0 && !debouncedQ && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("browse.recent")}</span>
              <button onClick={clearRecentSearches} className="text-[11px] font-medium transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>{t("common.clear")}</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => applyRecentSearch(item)}
                  className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition hover:opacity-80"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
                >
                  {tabIcon(item.tab)}
                  {item.keyword}
                  <span
                    onClick={(e) => { e.stopPropagation(); removeRecentSearch(item); }}
                    className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full opacity-40 hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="mt-5 space-y-6">
          {errorMsg && (
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>{errorMsg}</div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="b-skeleton h-48" />
              ))}
            </div>
          )}

          {/* Empty states */}
          {!loading && !errorMsg && tab === "posts" && posts.length === 0 && (
            <div className="b-animate-in flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
              <FileText className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold">{t("browse.noPostsFound")}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {debouncedQ ? `Nothing matched "${debouncedQ}". Try another keyword.` : "There are no posts in this section yet."}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={resetSearch} className="b-pill" style={{ height: 36, padding: "0 14px", fontSize: 13, border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>{t("browse.reset")}</button>
                <Link href="/create" className="b-pill no-underline" style={{ height: 36, padding: "0 14px", fontSize: 13, background: "var(--deep-navy)", color: "#fff" }}>{t("browse.writePost")}</Link>
              </div>
            </div>
          )}

          {!loading && !errorMsg && tab === "meets" && meets.length === 0 && (
            <div className="b-animate-in flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
              <CalendarDays className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold">{t("browse.noMeetsFound")}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {debouncedQ ? `No meets matched "${debouncedQ}". Try a city or keyword.` : "No meet results yet."}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={resetSearch} className="b-pill" style={{ height: 36, padding: "0 14px", fontSize: 13, border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>{t("browse.reset")}</button>
                <Link href="/meet" className="b-pill no-underline" style={{ height: 36, padding: "0 14px", fontSize: 13, background: "var(--deep-navy)", color: "#fff" }}>{t("browse.viewMeets")}</Link>
              </div>
            </div>
          )}

          {!loading && !errorMsg && tab === "ngo" && ngos.length === 0 && (
            <div className="b-animate-in flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
              <ShieldCheck className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold">{t("browse.noNgoFound")}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {debouncedQ ? `No partner posts matched "${debouncedQ}".` : "No partner posts yet."}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={resetSearch} className="b-pill" style={{ height: 36, padding: "0 14px", fontSize: 13, border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>{t("browse.reset")}</button>
                <Link href="/ngo" className="b-pill no-underline" style={{ height: 36, padding: "0 14px", fontSize: 13, background: "var(--deep-navy)", color: "#fff" }}>{t("browse.viewNgo")}</Link>
              </div>
            </div>
          )}

          {/* Post results */}
          {!loading &&
            tab === "posts" &&
            posts.map((p, idx) => {
              const cc = CAT_COLORS[p.category] ?? CAT_COLORS.other;
              return (
                <Link key={p.id} href={`/posts/${p.id}`} className="block no-underline text-inherit">
                  <article className="b-card b-card-hover b-animate-in p-5" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold">{p.title}</div>
                          <span
                            className="shrink-0 inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold"
                            style={{ background: cc.bg, color: cc.color }}
                          >
                            {catBadge(p.category)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                          {p.author_name ?? t("home.anonymous")} · {formatRelative(p.created_at)}
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                          {p.content}
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" />{p.like_count ?? 0}</span>
                          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p.comment_count ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}

          {/* Meet results */}
          {!loading &&
            tab === "meets" &&
            meets.map((m, idx) => {
              const typeClass = MEET_TYPE_CLASSES[m.type ?? "other"] ?? "";
              return (
                <Link key={m.id} href={`/meet/${m.id}`} className="block no-underline text-inherit">
                  <article className="b-card b-card-hover b-animate-in p-5" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold">{m.title}</div>
                          {m.type && (
                            <span className={`shrink-0 inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold ${typeClass}`}>
                              {m.type}
                            </span>
                          )}
                          {m.is_closed && (
                            <span className="shrink-0 inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold bg-red-100 text-red-600">
                              Closed
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                          {m.city && (
                            <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{m.city}</span>
                          )}
                          <span className="inline-flex items-center gap-0.5"><CalendarDays className="h-3 w-3" />{formatDateTime(m.start_at, t("meet.timeNotSet"))}</span>
                        </div>
                        <div className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                          {m.description}
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}

          {/* NGO results */}
          {!loading &&
            tab === "ngo" &&
            ngos.map((n, idx) => (
              <Link key={n.id} href={`/ngo/${n.id}`} className="block no-underline text-inherit">
                <article
                  className="b-card b-card-hover b-animate-in p-5"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      {n.ngo_name ?? "Partner"}
                    </span>
                    <NgoVerifiedBadge verified={n.ngo_verified} size={12} />
                  </div>
                  <h2 className="text-lg font-semibold leading-snug line-clamp-2" style={{ color: "var(--deep-navy)" }}>
                    {n.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {n.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    {n.location && (
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{n.location}</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{n.application_count ?? 0} applied</span>
                  </div>
                  {n.is_closed && (
                    <div className="mt-3">
                      <span className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold bg-red-100 text-red-600">Closed</span>
                    </div>
                  )}
                </article>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
