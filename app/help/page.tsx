"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  Plus,
  AlertCircle,
  MapPin,
  Clock,
  HelpCircle,
} from "lucide-react";

type HelpCategory =
  | "housing"
  | "legal"
  | "medical"
  | "translation"
  | "daily"
  | "employment"
  | "other";

type Urgency = "low" | "medium" | "high" | "urgent";

type HelpRequest = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: HelpCategory;
  urgency: Urgency;
  city: string | null;
  status: string;
  created_at: string;
  author_name: string | null;
};

const CAT_LABEL: Record<"all" | HelpCategory, string> = {
  all: "All",
  housing: "Housing",
  legal: "Legal",
  medical: "Medical",
  translation: "Translation",
  daily: "Daily Life",
  employment: "Employment",
  other: "Other",
};

const URGENCY_COLOR: Record<Urgency, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
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

export default function HelpListPage() {
  const router = useRouter();

  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activeCat, setActiveCat] = useState<"all" | HelpCategory>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("help_requests")
      .select("id, user_id, title, description, category, urgency, city, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Array<Omit<HelpRequest, "author_name">>;

    // Fetch author names from profiles
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    let profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p.display_name ?? "Anonymous";
        }
      }
    }

    const enriched: HelpRequest[] = rows.map((r) => ({
      ...r,
      author_name: profileMap[r.user_id] ?? "Anonymous",
    }));

    setRequests(enriched);
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

  const handleSearch = useCallback(() => {
    setSearchText(searchInput.trim());
  }, [searchInput]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchText("");
  }, []);

  const filteredRequests = useMemo(() => {
    let arr = requests;

    if (activeCat !== "all") {
      arr = arr.filter((r) => r.category === activeCat);
    }

    const s = searchText.trim().toLowerCase();
    if (s) {
      arr = arr.filter((r) => {
        const title = (r.title ?? "").toLowerCase();
        const desc = (r.description ?? "").toLowerCase();
        const city = (r.city ?? "").toLowerCase();
        const author = (r.author_name ?? "").toLowerCase();
        return title.includes(s) || desc.includes(s) || city.includes(s) || author.includes(s);
      });
    }

    return arr;
  }, [requests, searchText, activeCat]);

  const catTabs: Array<"all" | HelpCategory> = [
    "all",
    "housing",
    "legal",
    "medical",
    "translation",
    "daily",
    "employment",
    "other",
  ];

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
  const pillBase =
    "inline-flex h-9 items-center rounded-full px-3 text-sm font-medium transition whitespace-nowrap";

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-[820px] px-4 pb-24 pt-4">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-[#F0F7FF]/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
              >
                Home
              </Link>
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-semibold tracking-tight">Help Requests</span>
              </div>
            </div>

            <Link
              href={isAuthed ? "/help/new" : "/login"}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create Request
            </Link>
          </div>
        </header>

        {/* Search + Filters */}
        <section className={cx(card, "mt-4 p-4 sm:p-5")}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Search by title, description, city, author..."
                  className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
                >
                  Search
                </button>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {catTabs.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setActiveCat(k)}
                  className={cx(
                    pillBase,
                    activeCat === k
                      ? "bg-blue-600 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
                  )}
                >
                  {CAT_LABEL[k]}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              Results <b className="text-gray-900">{filteredRequests.length}</b>
              {searchText ? (
                <>
                  {" "}· Search <b className="text-gray-900">{searchText}</b>
                </>
              ) : null}
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="mt-4 grid gap-3">
          {loading && (
            <div className={cx(card, "p-5 text-sm text-gray-500")}>Loading...</div>
          )}

          {errorMsg && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {!loading &&
            !errorMsg &&
            filteredRequests.map((r) => (
              <Link key={r.id} href={`/help/${r.id}`} className="no-underline text-inherit">
                <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span>{r.author_name ?? "Anonymous"}</span>
                        <span>·</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatRelative(r.created_at)}</span>
                        {r.city ? (
                          <>
                            <span>·</span>
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{r.city}</span>
                          </>
                        ) : null}
                      </div>

                      <h2 className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-gray-900 sm:text-base">
                        {r.title}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-500">
                        {r.description.length > 160
                          ? `${r.description.slice(0, 160)}...`
                          : r.description}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={cx(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                          URGENCY_COLOR[r.urgency]
                        )}
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        {URGENCY_LABEL[r.urgency]}
                      </span>

                      <span className="inline-flex h-7 items-center rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-600">
                        {CAT_LABEL[r.category] ?? r.category}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}

          {!loading && !errorMsg && filteredRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <HelpCircle className="mb-3 h-10 w-10 text-gray-300" />
              <div className="text-sm font-semibold text-gray-800">No help requests found</div>
              <div className="mt-1 text-sm text-gray-500">
                {searchText
                  ? "Try another keyword or clear filters."
                  : "Be the first to ask for help."}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
                >
                  Clear Filters
                </button>
                <Link
                  href={isAuthed ? "/help/new" : "/login"}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Create Request
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
