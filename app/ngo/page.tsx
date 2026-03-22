"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { listNgoPosts, type NgoPost } from "@/lib/ngoService";
import NgoVerifiedBadge from "@/app/components/NgoVerifiedBadge";
import { useT } from "@/app/components/LangProvider";
import {
  Search,
  MapPin,
  Users,
  FileText,
  Plus,
  ClipboardList,
  Clock,
  TrendingUp,
  LayoutGrid,
  Briefcase,
  Home,
  Scale,
  GraduationCap,
  HeartPulse,
  MoreHorizontal,
} from "lucide-react";

type NgoCat = "all" | "jobs" | "housing" | "legal" | "education" | "health" | "other";

const CAT_KEYWORDS: Record<Exclude<NgoCat, "all" | "other">, string[]> = {
  jobs: ["job", "employment", "career", "work", "hiring", "recruit", "internship"],
  housing: ["housing", "shelter", "accommodation", "rent", "apartment", "home", "residence"],
  legal: ["legal", "lawyer", "asylum", "visa", "immigration", "rights", "court", "permit"],
  education: ["education", "school", "training", "course", "learn", "language", "class", "workshop", "scholarship"],
  health: ["health", "medical", "clinic", "doctor", "mental", "therapy", "hospital", "care", "wellness"],
};

function detectCategory(p: NgoPost): Exclude<NgoCat, "all"> {
  const text = `${p.title} ${p.description}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CAT_KEYWORDS) as [Exclude<NgoCat, "all" | "other">, string[]][]) {
    if (keywords.some((kw) => text.includes(kw))) return cat;
  }
  return "other";
}

export default function NGOPage() {
  const { t } = useT();
  const [posts, setPosts] = useState<NgoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNgo, setIsNgo] = useState(false);
  const [ngoStatus, setNgoStatus] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<NgoCat>("all");
  const [sortMode, setSortMode] = useState<"latest" | "popular">("latest");

  const catIcon: Record<string, { icon: React.ElementType; color: string }> = {
    all: { icon: LayoutGrid, color: "#4DA6FF" },
    jobs: { icon: Briefcase, color: "#AA96DA" },
    housing: { icon: Home, color: "#7EC8E3" },
    legal: { icon: Scale, color: "#F9D56E" },
    education: { icon: GraduationCap, color: "#95E1D3" },
    health: { icon: HeartPulse, color: "#F3A683" },
    other: { icon: MoreHorizontal, color: "#C4C4C4" },
  };
  const catLabel = (k: NgoCat) => {
    if (k === "all") return t("common.all");
    const map: Record<string, string> = {
      jobs: t("cat.jobs"),
      housing: t("ngo.housing"),
      legal: t("ngo.legal"),
      education: t("ngo.education"),
      health: t("ngo.health"),
      other: t("cat.other"),
    };
    return map[k] ?? k;
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("user_type, ngo_verified, ngo_status")
          .eq("id", user.id)
          .maybeSingle();
        if (prof?.user_type === "ngo") {
          if (prof.ngo_verified === true) {
            setIsNgo(true);
          } else {
            setNgoStatus(prof.ngo_status ?? "pending");
          }
        }
      }

      try {
        const list = await listNgoPosts(80);
        setPosts(list);
      } catch {
        setPosts([]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let arr = posts;

    // Category filter
    if (activeCat !== "all") {
      arr = arr.filter((p) => detectCategory(p) === activeCat);
    }

    // Search filter
    const s = q.trim().toLowerCase();
    if (s) {
      arr = arr.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.description.toLowerCase().includes(s) ||
          (p.location ?? "").toLowerCase().includes(s) ||
          (p.ngo_name ?? "").toLowerCase().includes(s)
      );
    }

    // Sort
    arr = arr.slice().sort((a, b) => {
      if (sortMode === "popular") {
        const diff = (b.application_count ?? 0) - (a.application_count ?? 0);
        if (diff !== 0) return diff;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return arr;
  }, [posts, q, activeCat, sortMode]);

  const catTabs: NgoCat[] = ["all", "jobs", "housing", "legal", "education", "health", "other"];

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold">{t("ngo.title")}</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {t("ngo.desc")}
            </p>
          </div>

          {!isNgo && ngoStatus === "pending" && (
            <span className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-medium"
              style={{ background: "#FFF8E1", color: "#F59E0B", border: "1px solid #FED7AA" }}>
              <Clock className="h-4 w-4" />
              {t("adminNgo.pending")}
            </span>
          )}
          {!isNgo && ngoStatus === "rejected" && (
            <span className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-medium"
              style={{ background: "#FEF2F2", color: "#E53935", border: "1px solid #FECACA" }}>
              {t("adminNgo.rejected")}
            </span>
          )}
          {isNgo && (
            <div className="flex gap-2">
              <Link
                href="/ngo/applications"
                className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold no-underline transition hover:opacity-80"
                style={{ background: "var(--light-blue)", color: "var(--primary)", border: "1px solid var(--border-soft)" }}
              >
                <ClipboardList className="h-4 w-4" />
                {t("ngo.applications")}
              </Link>
              <Link
                href="/ngo/new"
                className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white no-underline transition hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                <Plus className="h-4 w-4" />
                {t("ngo.newPost")}
              </Link>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div
            className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
            style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
          >
            <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("ngo.searchPosts")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
              style={{ color: "var(--deep-navy)" }}
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="text-xs font-medium hover:opacity-70" style={{ color: "var(--text-muted)" }}>
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
                {(() => { const ci = catIcon[k]; if (!ci) return null; const I = ci.icon; return <I className="h-3.5 w-3.5 shrink-0" style={{ color: ci.color }} />; })()}
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
                background: sortMode === "latest" ? "var(--primary)" : "transparent",
                color: sortMode === "latest" ? "#fff" : "var(--text-secondary)",
                border: sortMode === "latest" ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <Clock className="h-3.5 w-3.5" />
              {t("common.latest")}
            </button>
            <button
              type="button"
              onClick={() => setSortMode("popular")}
              className="b-pill"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 13,
                background: sortMode === "popular" ? "var(--primary)" : "transparent",
                color: sortMode === "popular" ? "#fff" : "var(--text-secondary)",
                border: sortMode === "popular" ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {t("common.popular")}
            </button>

            <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              {filtered.length} {t("common.results")}
              {q.trim() && <> &middot; &quot;{q.trim()}&quot;</>}
            </span>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="b-skeleton h-48" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center b-animate-in"
              style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}
            >
              <FileText className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                {t("ngo.noPostsYet")}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("ngo.willAppear")}
              </div>
            </div>
          )}

          {!loading &&
            filtered.map((p, idx) => (
              <Link key={p.id} href={`/ngo/${p.id}`} className="no-underline text-inherit">
                <article
                  className="b-card b-card-hover b-animate-in p-5"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  {p.image_url && (
                    <div className="mb-4 -mx-5 -mt-5 overflow-hidden rounded-t-[20px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image_url} alt="" className="w-full" />
                    </div>
                  )}

                  {/* NGO name + verified */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      {p.ngo_name ?? "Supporter"}
                    </span>
                    <NgoVerifiedBadge verified={p.ngo_verified} />
                  </div>

                  <h2 className="text-lg font-semibold leading-snug line-clamp-2" style={{ color: "var(--deep-navy)" }}>
                    {p.title}
                  </h2>

                  <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {p.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    {p.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {p.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {p.application_count ?? 0} {t("ngo.applied")}
                      {p.max_applicants != null && ` / ${p.max_applicants} ${t("ngo.max")}`}
                    </span>
                  </div>

                  {p.is_closed && (
                    <div className="mt-3">
                      <span className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold bg-red-100 text-red-600">
                        {t("meet.closed")}
                      </span>
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
