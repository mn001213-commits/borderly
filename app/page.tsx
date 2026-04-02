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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { formatRelative } from "@/lib/format";
import { CAT_COLORS } from "@/lib/constants";
import { useT } from "@/app/components/LangProvider";

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

  const resultCount = useMemo(() => {
    if (tab === "posts") return posts.length;
    return meets.length;
  }, [tab, posts.length, meets.length]);

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
          setMeets((data ?? []) as MeetRow[]);
          setPosts([]);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load data.";
        setErrorMsg(message);
        setPosts([]);
        setMeets([]);
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
                  className="b-pill shrink-0 h-9 px-3 text-xs inline-flex items-center gap-1.5"
                  style={{
                    background: tab === tb ? "var(--primary)" : "transparent",
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
                className="b-pill shrink-0 h-9 px-3 text-xs"
                style={{
                  background: activeCat === c.id ? "var(--primary)" : "transparent",
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

        {/* Meet type pills */}
        {tab === "meets" && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {meetTypes.map((mt) => {
              const mi = meetTypeIcon[mt];
              const Icon = mi?.icon;
              return (
                <button
                  key={mt}
                  onClick={() => setActiveMeetType(mt)}
                  className="b-pill shrink-0 h-9 px-3 text-xs"
                  style={{
                    background: activeMeetType === mt ? "var(--primary)" : "transparent",
                    color: activeMeetType === mt ? "#fff" : "var(--text-secondary)",
                    border: activeMeetType === mt ? "none" : "1px solid var(--border-soft)",
                  }}
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0 mr-1 inline" style={{ color: activeMeetType === mt ? "#fff" : mi.color }} />}
                  {mt === "all" ? t("common.all") : (MEET_TYPE_LABELS[mt] ? t(MEET_TYPE_LABELS[mt]) : mt)}
                </button>
              );
            })}
          </div>
        )}


        {/* Sort pills */}
        <div className="mt-3 flex items-center gap-3">
          {tab === "posts" && (
            <>
              <button onClick={() => setSortMode("latest")} className="b-pill shrink-0 h-9 px-3 text-xs" style={{ background: sortMode === "latest" ? "var(--primary)" : "transparent", color: sortMode === "latest" ? "#fff" : "var(--text-secondary)", border: sortMode === "latest" ? "none" : "1px solid var(--border-soft)" }}>
                <Clock3 className="mr-1 inline h-3.5 w-3.5" />{t("common.latest")}
              </button>
              <button onClick={() => setSortMode("popular")} className="b-pill shrink-0 h-9 px-3 text-xs" style={{ background: sortMode === "popular" ? "var(--primary)" : "transparent", color: sortMode === "popular" ? "#fff" : "var(--text-secondary)", border: sortMode === "popular" ? "none" : "1px solid var(--border-soft)" }}>
                <Sparkles className="mr-1 inline h-3.5 w-3.5" />{t("common.popular")}
              </button>
            </>
          )}
          {tab === "meets" && (
            <>
              <button onClick={() => setSortMode("newest")} className="b-pill shrink-0 h-9 px-3 text-xs" style={{ background: sortMode === "newest" ? "var(--primary)" : "transparent", color: sortMode === "newest" ? "#fff" : "var(--text-secondary)", border: sortMode === "newest" ? "none" : "1px solid var(--border-soft)" }}>
                <Clock3 className="mr-1 inline h-3.5 w-3.5" />{t("browse.newest")}
              </button>
              <button onClick={() => setSortMode("soonest")} className="b-pill shrink-0 h-9 px-3 text-xs" style={{ background: sortMode === "soonest" ? "var(--primary)" : "transparent", color: sortMode === "soonest" ? "#fff" : "var(--text-secondary)", border: sortMode === "soonest" ? "none" : "1px solid var(--border-soft)" }}>
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />{t("browse.soonest")}
              </button>
            </>
          )}

          {/* Result count */}
          {!loading && !errorMsg && (
            <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {resultCount} {tab === "posts" ? (resultCount === 1 ? t("browse.post") : t("browse.posts")) : (resultCount === 1 ? t("browse.meet") : t("browse.meets"))}
            </span>
          )}
        </div>

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
                  className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition hover:opacity-80"
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
        <div className="mt-6 space-y-4">
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
            <div className="b-animate-in flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
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
            <div className="b-animate-in flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
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
                            className="shrink-0 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold"
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
