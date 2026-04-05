"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  FileText,
  CalendarDays,
  Clock3,
  Sparkles,
  Heart,
  MessageCircle,
  MapPin,
  X,
  LayoutGrid,
  Info,
  HelpCircle,
  Sun,
  Briefcase,
  MoreHorizontal,
  Handshake,
  BookOpen,
  Languages,
  UtensilsCrossed,
  Dumbbell,
  Wrench,
  PartyPopper,
  Rocket,
  Plus,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { swrCache } from "@/lib/swrCache";
import { formatRelative } from "@/lib/format";
import { CAT_COLORS } from "@/lib/constants";
import { sortByEngagement } from "@/lib/sortingUtils";
import { useT } from "@/app/components/LangProvider";
import SortDropdown from "@/app/components/SortDropdown";
import WelcomeHero from "@/app/components/WelcomeHero";
import { useAuth } from "@/app/components/AuthProvider";

type SearchTab = "posts" | "meets";
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
  image_url: string | null;
  image_urls: string[] | null;
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


const MEET_TYPE_CLASSES: Record<string, string> = {
  hangout: "b-meet-hangout",
  study: "b-meet-study",
  language: "b-meet-language",
  meal: "b-meet-meal",
  sports: "b-meet-sports",
  skill: "b-meet-skill",
  party: "b-meet-party",
  project: "b-meet-project",
  culture: "b-meet-culture",
  volunteer: "b-meet-volunteer",
  other: "b-meet-other",
};

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

const MEET_TYPE_LABELS: Record<string, string> = {
  hangout: "meet.hangout",
  study: "meet.study",
  skill: "meetDetail.skillExchange",
  language: "meetDetail.languageExchange",
  meal: "meetDetail.mealBuddy",
  party: "meetDetail.party",
  project: "meetDetail.teamRecruit",
  sports: "meet.sports",
};

export default function BrowsePage() {
  const { t } = useT();
  const { user } = useAuth();
  const [tab, setTab] = useState<SearchTab>("posts");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [activeMeetType, setActiveMeetType] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [meets, setMeets] = useState<MeetRow[]>([]);

  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const catIcon: Record<string, { icon: React.ElementType; color: string }> = {
    all: { icon: LayoutGrid, color: "#4A8FE7" },
    general: { icon: MessageCircle, color: "#4361EE" },
    info: { icon: Info, color: "#06D6A0" },
    question: { icon: HelpCircle, color: "#F77F00" },
    daily: { icon: Sun, color: "#7B2FF2" },
    jobs: { icon: Briefcase, color: "#E6A817" },
    other: { icon: MoreHorizontal, color: "#737373" },
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

  const meetTypeIcon: Record<string, { icon: React.ElementType; color: string }> = {
    all: { icon: LayoutGrid, color: "#4A8FE7" },
    hangout: { icon: Handshake, color: "#F77F00" },
    study: { icon: BookOpen, color: "#06D6A0" },
    language: { icon: Languages, color: "#7B2FF2" },
    meal: { icon: UtensilsCrossed, color: "#E6A817" },
    sports: { icon: Dumbbell, color: "#4361EE" },
    skill: { icon: Wrench, color: "#0096C7" },
    party: { icon: PartyPopper, color: "#E91E63" },
    project: { icon: Rocket, color: "#4361EE" },
  };
  const meetTypes = useMemo(
    () => ["all", "hangout", "study", "language", "meal", "sports", "skill", "party", "project"],
    []
  );

  const sortedPosts = useMemo(() => {
    if (sortMode === "popular") {
      return sortByEngagement(posts);
    }
    return posts;
  }, [posts, sortMode]);

  const resultCount = useMemo(() => {
    if (tab === "posts") return sortedPosts.length;
    return meets.length;
  }, [tab, sortedPosts.length, meets.length]);

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
      setErrorMsg(null);
      const keyword = debouncedQ;
      const cacheKey = `browse:${tab}:${tab === "posts" ? activeCat : activeMeetType}:${sortMode}:${keyword}`;

      // SWR: show cached data instantly, skip skeleton
      const cached = tab === "posts"
        ? swrCache.get<PostRow[]>(cacheKey)
        : swrCache.get<MeetRow[]>(cacheKey);

      if (cached) {
        if (tab === "posts") { setPosts(cached as PostRow[]); setMeets([]); }
        else { setMeets(cached as MeetRow[]); setPosts([]); }
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        if (tab === "posts") {
          let query = supabase
            .from("posts")
            .select("id, created_at, title, content, author_name, category, image_url, image_urls")
            .eq("is_hidden", false)
            .limit(50);

          if (activeCat !== "all") query = query.eq("category", activeCat);
          if (keyword) query = query.or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`);
          query = query.order("created_at", { ascending: false });

          const { data, error } = await query;
          if (error) throw error;
          const rawPosts = data ?? [];
          const postIds = rawPosts.map((p: any) => p.id);

          // Fetch actual engagement counts
          let likeCounts = new Map<string, number>();
          let commentCounts = new Map<string, number>();

          if (postIds.length > 0) {
            const [likesRes, commentsRes] = await Promise.all([
              supabase.from("post_likes").select("post_id").in("post_id", postIds),
              supabase.from("comments").select("post_id").in("post_id", postIds).eq("is_hidden", false),
            ]);

            if (likesRes.data) {
              for (const row of likesRes.data) {
                likeCounts.set(row.post_id, (likeCounts.get(row.post_id) ?? 0) + 1);
              }
            }
            if (commentsRes.data) {
              for (const row of commentsRes.data) {
                commentCounts.set(row.post_id, (commentCounts.get(row.post_id) ?? 0) + 1);
              }
            }
          }

          const fresh = rawPosts.map((p: any) => ({
            ...p,
            like_count: likeCounts.get(p.id) ?? 0,
            comment_count: commentCounts.get(p.id) ?? 0,
          })) as PostRow[];
          setPosts(fresh);
          setMeets([]);
          swrCache.set(cacheKey, fresh);
        }

        if (tab === "meets") {
          let query = supabase
            .from("meet_posts")
            .select("id, created_at, title, description, city, start_at, type, is_closed")
            .limit(50);

          if (activeMeetType !== "all") query = query.eq("type", activeMeetType);
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
          const fresh = (data ?? []) as MeetRow[];
          setMeets(fresh);
          setPosts([]);
          swrCache.set(cacheKey, fresh);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data.";
        setErrorMsg(message);
        if (!cached) { setPosts([]); setMeets([]); }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tab, activeCat, activeMeetType, sortMode, debouncedQ]);

  const applyRecentSearch = (item: RecentSearchItem) => {
    setTab(item.tab);
    setQ(item.keyword);
    setActiveCat("all");
    setActiveMeetType("all");
    if (item.tab === "posts") setSortMode("latest");
    if (item.tab === "meets") setSortMode("newest");
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
    setActiveMeetType("all");
    if (tab === "posts") setSortMode("latest");
    if (tab === "meets") setSortMode("newest");
  };

  const tabIcon = (tb: SearchTab) => {
    if (tb === "posts") return <FileText className="h-3.5 w-3.5" />;
    return <CalendarDays className="h-3.5 w-3.5" />;
  };

  const tabLabel = (tb: SearchTab) => {
    if (tb === "posts") return t("browse.posts");
    return t("browse.meets");
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Welcome Hero — non-logged-in users only */}
        {!user && <WelcomeHero />}
        <div className="sticky top-2 z-20">
          <div
            className="b-card-glass p-3"
          >
            <div className="flex items-center gap-2">
              <div
                className="flex flex-1 items-center gap-2.5 rounded-2xl px-4 py-3"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("browse.searchAll")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: "var(--deep-navy)" }}
                />
                {q && (
                  <button type="button" onClick={() => setQ("")} className="text-xs font-medium whitespace-nowrap hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                    {t("common.clear")}
                  </button>
                )}
              </div>
              <Link
                href={tab === "meets" ? "/meet/new" : "/create"}
                className="b-btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white no-underline"
                style={{ padding: 0 }}
              >
                <Plus className="h-5 w-5" />
              </Link>
            </div>

            {/* Tabs */}
            <div className="mt-3 flex items-center gap-2">
              {(["posts", "meets"] as SearchTab[]).map((tb) => (
                <button
                  key={tb}
                  onClick={() => {
                    setTab(tb);
                    setActiveCat("all");
                    setActiveMeetType("all");
                    if (tb === "posts") setSortMode("latest");
                    if (tb === "meets") setSortMode("newest");
                  }}
                  className={`b-pill shrink-0 h-9 px-3 text-xs inline-flex items-center gap-1.5 ${tab === tb ? "b-pill-active" : "b-pill-inactive"}`}
                >
                  {tabIcon(tb)}
                  {tabLabel(tb)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category pills + sort dropdown (posts) */}
        {tab === "posts" && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              {cats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`b-pill shrink-0 h-9 px-3 text-xs ${activeCat === c.id ? "b-pill-active" : "b-pill-inactive"}`}
                >
                  {(() => { const ci = catIcon[c.id]; if (!ci) return null; const I = ci.icon; return <I className="h-3.5 w-3.5 shrink-0" style={{ color: activeCat === c.id ? "#fff" : ci.color }} />; })()}
                  {t("cat." + c.id)}
                </button>
              ))}
            </div>
            <SortDropdown
              options={[
                { key: "latest", label: t("common.latest"), icon: <Clock3 className="h-3.5 w-3.5" /> },
                { key: "popular", label: t("common.popular"), icon: <Sparkles className="h-3.5 w-3.5" /> },
              ]}
              value={sortMode}
              onChange={(k) => setSortMode(k as SortMode)}
            />
          </div>
        )}

        {/* Meet type pills + sort dropdown */}
        {tab === "meets" && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
              {meetTypes.map((mt) => {
                const mi = meetTypeIcon[mt];
                const Icon = mi?.icon;
                return (
                  <button
                    key={mt}
                    onClick={() => setActiveMeetType(mt)}
                    className={`b-pill shrink-0 h-9 px-3 text-xs ${activeMeetType === mt ? "b-pill-active" : "b-pill-inactive"}`}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0 mr-1 inline" style={{ color: activeMeetType === mt ? "#fff" : mi.color }} />}
                    {mt === "all" ? t("common.all") : (MEET_TYPE_LABELS[mt] ? t(MEET_TYPE_LABELS[mt]) : mt)}
                  </button>
                );
              })}
            </div>
            <SortDropdown
              options={[
                { key: "newest", label: t("browse.newest"), icon: <Clock3 className="h-3.5 w-3.5" /> },
                { key: "soonest", label: t("browse.soonest"), icon: <CalendarDays className="h-3.5 w-3.5" /> },
              ]}
              value={sortMode}
              onChange={(k) => setSortMode(k as SortMode)}
            />
          </div>
        )}

        {/* Result count */}
        {!loading && !errorMsg && (
          <div className="mt-3 flex items-center">
            <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {resultCount} {tab === "posts" ? (resultCount === 1 ? t("browse.post") : t("browse.posts")) : (resultCount === 1 ? t("browse.meet") : t("browse.meets"))}
            </span>
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && !debouncedQ && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("browse.recent")}</span>
              <button onClick={clearRecentSearches} className="text-xs font-medium transition hover:opacity-70" style={{ color: "var(--text-muted)" }}>{t("common.clear")}</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => applyRecentSearch(item)}
                  className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium b-list-item"
                  style={{ color: "var(--text-secondary)", boxShadow: "var(--ring-border)" }}
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
        <div className="mt-6 space-y-5">
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
          {!loading && !errorMsg && tab === "posts" && sortedPosts.length === 0 && (
            <div className="b-animate-in b-empty-state">
              <FileText className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold">{t("browse.noPostsFound")}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {debouncedQ ? `Nothing matched "${debouncedQ}". Try another keyword.` : "There are no posts in this section yet."}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={resetSearch} className="b-pill h-9 px-3 text-xs" style={{ border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>{t("browse.reset")}</button>
                <Link href="/create" className="b-pill no-underline h-9 px-3 text-xs" style={{ background: "var(--primary)", color: "#fff" }}>{t("browse.writePost")}</Link>
              </div>
            </div>
          )}

          {!loading && !errorMsg && tab === "meets" && meets.length === 0 && (
            <div className="b-animate-in b-empty-state">
              <CalendarDays className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold">{t("browse.noMeetsFound")}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {debouncedQ ? `No meets matched "${debouncedQ}". Try a city or keyword.` : "No meet results yet."}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={resetSearch} className="b-pill h-9 px-3 text-xs" style={{ border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>{t("browse.reset")}</button>
                <Link href="/meet" className="b-pill no-underline h-9 px-3 text-xs" style={{ background: "var(--primary)", color: "#fff" }}>{t("browse.viewMeets")}</Link>
              </div>
            </div>
          )}


          {/* Post results */}
          {!loading &&
            tab === "posts" &&
            sortedPosts.map((p, idx) => {
              const cc = CAT_COLORS[p.category] ?? CAT_COLORS.other;
              return (
                <Link key={p.id} href={`/posts/${p.id}`} className="block no-underline text-inherit">
                  <article className="b-card b-card-hover b-animate-in p-5" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold">{p.title}</div>
                          <span
                            className="shrink-0 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold"
                            style={{ background: cc.bg, color: cc.color }}
                          >
                            {catBadge(p.category)}
                          </span>
                          {(p.image_url || (p.image_urls && p.image_urls.length > 0)) && (
                            <span
                              className="shrink-0 inline-flex items-center justify-center rounded-full border p-1"
                              style={{ borderColor: "var(--border-focus)", color: "var(--text-muted)" }}
                            >
                              <ImageIcon className="h-3 w-3" />
                            </span>
                          )}
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
                            <span className={`shrink-0 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${typeClass}`}>
                              {MEET_TYPE_LABELS[m.type] ? t(MEET_TYPE_LABELS[m.type]) : m.type}
                            </span>
                          )}
                          {m.is_closed && (
                            <span className="shrink-0 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold bg-red-100 text-red-600">
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

        </div>
      </div>
    </div>
  );
}
