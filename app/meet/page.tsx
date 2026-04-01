"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { checkAndSendMeetReminders } from "@/lib/meetReminderService";
import { createNotification } from "@/lib/notificationService";
import { useT } from "../components/LangProvider";
import {
  Users,
  Search,
  MapPin,
  Calendar,
  UserPlus,
  UserMinus,
  FileText,
  Clock,
  TrendingUp,
  Star,
  Plus,
  LayoutGrid,
  Handshake,
  BookOpen,
  MessageSquare,
  UtensilsCrossed,
  Dumbbell,
} from "lucide-react";

type MeetType =
  | "hangout"
  | "study"
  | "language"
  | "meal"
  | "sports";

type MeetRow = {
  id: string;
  host_id: string;
  type: MeetType;
  sport: string | null;
  title: string;
  description: string;
  city: string | null;
  place_hint: string | null;
  start_at: string | null;
  max_people: number | null;
  max_foreigners: number | null;
  max_locals: number | null;
  is_closed: boolean;
  created_at: string;
  image_url: string | null;
  participant_count: number;
  foreigner_count: number;
  local_count: number;
  host_display_name?: string | null;
  host_avatar_url?: string | null;
};

function typeEmoji(t: MeetType) {
  switch (t) {
    case "hangout": return "🤝";
    case "study": return "📚";
    case "language": return "🗣️";
    case "meal": return "🍽️";
    case "sports": return "⚽";
    default: return "📌";
  }
}

function isPastMeet(start_at: string | null) {
  if (!start_at) return false;
  const t = new Date(start_at).getTime();
  return Number.isFinite(t) && t < Date.now();
}

function formatWhen(start_at: string | null) {
  if (!start_at) return null;
  return new Date(start_at).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysAgo(iso: string) {
  const t = new Date(iso).getTime();
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function topKeys(arr: Array<string | null | undefined>, n = 2) {
  const m = new Map<string, number>();
  for (const v of arr) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

function scoreMeet(meet: MeetRow, prefs: { topTypes: string[]; topCities: string[] }) {
  let s = 0;

  if (prefs.topTypes.includes(meet.type)) s += 25;
  if (meet.city && prefs.topCities.includes(meet.city)) s += 20;

  s += Math.log2((meet.participant_count ?? 0) + 1) * 8;

  const d = daysAgo(meet.created_at);
  s += Math.max(0, 14 - d) * 2;

  if (meet.is_closed) s -= 999;
  if (isPastMeet(meet.start_at)) s -= 999;

  if (meet.max_people != null && meet.participant_count >= meet.max_people) s -= 50;

  return s;
}

export default function MeetPage() {
  const { t } = useT();
  const [meets, setMeets] = useState<MeetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myUid, setMyUid] = useState<string | null>(null);
  const [statusMap, setStatusMap] = useState<Map<string, string>>(new Map());

  const [prefs, setPrefs] = useState<{ topTypes: string[]; topCities: string[] }>({
    topTypes: [],
    topCities: [],
  });

  const [q, setQ] = useState("");
  const [activeType, setActiveType] = useState<"all" | MeetType>("all");
  const [sortMode, setSortMode] = useState<"recommend" | "latest" | "popular">("recommend");

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [joinError, setJoinError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id ?? null;

    setMyUid(uid);
    
    const { data, error } = await supabase
      .from("v_meet_with_count")
      .select(
        "id,host_id,type,sport,title,description,city,place_hint,start_at,max_people,max_foreigners,max_locals,is_closed,created_at,image_url,participant_count,foreigner_count,local_count"
      )
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      setErrorMsg(error.message);
      setMeets([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []) as MeetRow[];

    // Fetch host profiles
    const hostIds = [...new Set(list.map((m) => m.host_id).filter(Boolean))];
    if (hostIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", hostIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      for (const m of list) {
        const p = profileMap.get(m.host_id) as any;
        m.host_display_name = p?.display_name ?? null;
        m.host_avatar_url = p?.avatar_url ?? null;
      }
    }

    setMeets(list);

    if (uid) {
      const r = await supabase.from("meet_participants").select("meet_id,status").eq("user_id", uid);

      const rows = (r.data ?? []) as Array<{ meet_id: string; status: string }>;
      const meetIds = rows.map((x) => x.meet_id).filter(Boolean);
      setStatusMap(new Map(rows.map((x) => [x.meet_id, x.status ?? "approved"])));

      if (meetIds.length > 0) {
        const { data: joinedMeets } = await supabase.from("meet_posts").select("id,type,city").in("id", meetIds);

        const types = (joinedMeets ?? []).map((m: any) => m.type as string);
        const cities = (joinedMeets ?? []).map((m: any) => (m.city as string | null) ?? null);

        setPrefs({
          topTypes: topKeys(types, 2),
          topCities: topKeys(cities, 2),
        });
      } else {
        setPrefs({ topTypes: [], topCities: [] });
      }
    } else {
      setStatusMap(new Map());
      setPrefs({ topTypes: [], topCities: [] });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;

    const refetchSoon = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { if (!cancelled) load(); }, 250);
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      ch = supabase
        .channel(`meet-list-realtime:${myUid ?? "anon"}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "meets" }, refetchSoon)
        .on("postgres_changes", { event: "*", schema: "public", table: "meet_participants" }, refetchSoon)
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [load, myUid]);

  // Run reminder check once per session
  const reminderChecked = useRef(false);
  useEffect(() => {
    if (myUid && !reminderChecked.current) {
      reminderChecked.current = true;
      checkAndSendMeetReminders(myUid);
    }
  }, [myUid]);

  const typeTabs: Array<"all" | MeetType> = [
    "all",
    "hangout",
    "study",
    "language",
    "meal",
    "sports",
  ];

  const typeIcon: Record<string, { icon: React.ElementType; color: string }> = {
    all: { icon: LayoutGrid, color: "#4DA6FF" },
    hangout: { icon: Handshake, color: "#7EC8E3" },
    study: { icon: BookOpen, color: "#95E1D3" },
    language: { icon: MessageSquare, color: "#F9D56E" },
    meal: { icon: UtensilsCrossed, color: "#F3A683" },
    sports: { icon: Dumbbell, color: "#AA96DA" },
  };
  const meetTypeLabel = (type: MeetType) => {
    return `${typeEmoji(type)} ${t(`meet.${type}`)}`;
  };
  const meetTabLabel = (type: "all" | MeetType) => {
    if (type === "all") return t("common.all");
    return t(`meet.${type}`);
  };

  const filtered = useMemo(() => {
    let arr = meets;

    if (activeType !== "all") {
      arr = arr.filter((m) => m.type === activeType);
    }

    const s = q.trim().toLowerCase();
    if (s) {
      arr = arr.filter((m) => {
        const title = (m.title ?? "").toLowerCase();
        const desc = (m.description ?? "").toLowerCase();
        const city = (m.city ?? "").toLowerCase();
        const place = (m.place_hint ?? "").toLowerCase();
        return title.includes(s) || desc.includes(s) || city.includes(s) || place.includes(s);
      });
    }

    arr = arr.slice().sort((a, b) => {
      if (sortMode === "popular") {
        const diff = (b.participant_count ?? 0) - (a.participant_count ?? 0);
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      if (sortMode === "latest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }

      const sb = scoreMeet(b, prefs);
      const sa = scoreMeet(a, prefs);
      if (sb !== sa) return sb - sa;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return arr;
  }, [meets, activeType, q, sortMode, prefs]);

  const setBusyKey = (meetId: string, v: boolean) => {
    setBusy((prev) => ({ ...prev, [meetId]: v }));
  };

  const joinMeet = async (meetId: string) => {
    if (!myUid) return;
    setBusyKey(meetId, true);
    setJoinError(null);

    setStatusMap((prev) => new Map(prev).set(meetId, "pending"));

    try {
      const { error } = await supabase.from("meet_participants").insert({
        meet_id: meetId,
        user_id: myUid,
        status: "pending",
      } as any);

      if (error) {
        const msg = String(error.message ?? error);

        setStatusMap((prev) => {
          const n = new Map(prev);
          n.delete(meetId);
          return n;
        });

        if (msg.includes("full") || msg.includes("capacity")) setJoinError(t("meetDetail.meetFull"));
        else if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")) setJoinError(t("meetDetail.alreadyRequested"));
        else setJoinError(msg);

        await load();
      } else {
        // Notify host about the join request
        const meetData = meets.find((m) => m.id === meetId);
        if (meetData) {
          const { data: myProf } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", myUid)
            .maybeSingle();
          const requesterName = myProf?.display_name ?? "Someone";

          createNotification({
            userId: meetData.host_id,
            type: "meet",
            title: "New join request",
            body: `${requesterName} wants to join "${meetData.title}"`,
            link: `/meet/${meetId}/manage`,
          });
        }
      }
    } finally {
      setBusyKey(meetId, false);
    }
  };

  const leaveMeet = async (meetId: string) => {
    if (!myUid) return;
    setBusyKey(meetId, true);

    setStatusMap((prev) => {
      const n = new Map(prev);
      n.delete(meetId);
      return n;
    });

    try {
      const { error } = await supabase
        .from("meet_participants")
        .delete()
        .eq("meet_id", meetId)
        .eq("user_id", myUid);
      if (error) {
        await load();
      }
    } finally {
      setBusyKey(meetId, false);
    }
  };

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
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("meet.searchMeets")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
              style={{ color: "var(--deep-navy)" }}
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="text-xs font-medium hover:opacity-70" style={{ color: "var(--text-muted)" }}>
                {t("common.clear")}
              </button>
            )}
          </div>
          <Link
            href="/meet/new"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white no-underline transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>

        {/* Type tabs + sort */}
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {typeTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveType(tab)}
                className={activeType === tab ? "b-pill b-pill-active" : "b-pill b-pill-inactive"}
              >
                {(() => { const ci = typeIcon[tab]; if (!ci) return null; const I = ci.icon; return <I className="h-3.5 w-3.5 shrink-0" style={{ color: ci.color }} />; })()}
                {meetTabLabel(tab)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortMode("recommend")}
              className="b-pill"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 13,
                background: sortMode === "recommend" ? "var(--primary)" : "transparent",
                color: sortMode === "recommend" ? "#fff" : "var(--text-secondary)",
                border: sortMode === "recommend" ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <Star className="h-3.5 w-3.5" />
              {t("common.recommended")}
            </button>
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

            <span className="ml-auto text-xs font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              {filtered.length} {t("common.meets")}
            </span>
          </div>
        </div>

        {/* Meet cards */}
        <div className="space-y-6">
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

          {joinError && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium mb-3"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}
              onClick={() => setJoinError(null)}
            >
              {joinError}
            </div>
          )}

          {!loading &&
            !errorMsg &&
            filtered.map((m, idx) => {
              const where = [m.city, m.place_hint].filter(Boolean).join(" · ") || t("meet.locationNotSet");
              const when = formatWhen(m.start_at) ?? t("meet.timeNotSet");
              const ended = isPastMeet(m.start_at);

              const cap =
                m.max_foreigners != null && m.max_locals != null
                  ? `F ${m.foreigner_count ?? 0}/${m.max_foreigners} · L ${m.local_count ?? 0}/${m.max_locals}`
                  : m.max_people == null
                    ? `${m.participant_count} ${t("meet.joined_count")}`
                    : `${m.participant_count} / ${m.max_people}`;

              const isFull = m.max_people != null && m.participant_count >= m.max_people;
              const myStatus = statusMap.get(m.id) ?? "none";
              const joined = myStatus !== "none";
              const isPending = myStatus === "pending";

              const joinDisabled = !myUid || ended || m.is_closed || isFull || busy[m.id];

              let statusLabel = t("meet.open");
              if (ended) statusLabel = t("meet.ended");
              else if (m.is_closed) statusLabel = t("meet.closed");
              else if (isFull) statusLabel = t("meet.full");
              else if (isPending) statusLabel = t("meetManage.pendingApproval");
              else if (joined) statusLabel = t("meet.joined");

              return (
                <Link key={m.id} href={`/meet/${m.id}`} className="no-underline text-inherit">
                  <article className="b-card b-card-hover b-animate-in overflow-hidden" style={{ animationDelay: `${idx * 0.05}s` }}>
                    {/* Image — full width, top of card */}
                    {m.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.image_url}
                        alt="Meet cover"
                        className="w-full"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    )}

                    <div className="p-5">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold b-meet-${m.type}`}
                      >
                        {meetTypeLabel(m.type)}
                        {m.type === "sports" && m.sport ? ` · ${m.sport}` : ""}
                      </span>

                      <span
                        className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold"
                        style={{
                          background: isPending ? "#FEF9C3" : joined ? "var(--primary)" : "var(--light-blue)",
                          color: isPending ? "#854D0E" : joined ? "#fff" : (ended || m.is_closed || isFull) ? "var(--text-muted)" : "var(--text-secondary)",
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {/* Title */}
                    <h2
                      className="line-clamp-2 text-lg font-semibold leading-snug"
                      style={{ color: "var(--deep-navy)" }}
                    >
                      {m.title}
                    </h2>

                    {/* Details */}
                    <div className="mt-4 space-y-2 text-[13px]" style={{ color: "var(--text-secondary)" }}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                        <span>{when}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                        <span>{where}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                        <span>{cap}</span>
                      </div>
                    </div>

                    {/* Mini quota bars */}
                    {m.max_foreigners != null && m.max_locals != null && (
                      <div className="mt-3 flex gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold mb-0.5">
                            <span style={{ color: "#1D4ED8" }}>F</span>
                            <span style={{ color: "var(--text-muted)" }}>{m.foreigner_count ?? 0}/{m.max_foreigners}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${Math.min(100, ((m.foreigner_count ?? 0) / m.max_foreigners) * 100)}%`,
                              background: (m.foreigner_count ?? 0) >= m.max_foreigners ? "#22C55E" : "#3B82F6",
                            }} />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold mb-0.5">
                            <span style={{ color: "#92400E" }}>L</span>
                            <span style={{ color: "var(--text-muted)" }}>{m.local_count ?? 0}/{m.max_locals}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                            <div className="h-full rounded-full transition-all" style={{
                              width: `${Math.min(100, ((m.local_count ?? 0) / m.max_locals) * 100)}%`,
                              background: (m.local_count ?? 0) >= m.max_locals ? "#22C55E" : "#F59E0B",
                            }} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    <p
                      className="mt-3 line-clamp-3 text-[14px] leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {m.description.length > 200 ? `${m.description.slice(0, 200)}...` : m.description}
                    </p>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                      {/* Host info */}
                      <Link
                        href={`/u/${m.host_id}`}
                        className="flex items-center gap-1.5 min-w-0 flex-1 no-underline group"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {m.host_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.host_avatar_url}
                            alt={m.host_display_name ?? "Host"}
                            className="h-6 w-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ background: "var(--primary)" }}
                          >
                            {(m.host_display_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <span
                          className="text-xs font-medium truncate group-hover:underline"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {m.host_display_name ?? t("common.unknown")}
                        </span>
                      </Link>
                      <div className="flex shrink-0 gap-2">
                      {!myUid ? (
                        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                          {t("meet.signInToJoin")}
                        </span>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            leaveMeet(m.id);
                          }}
                          disabled={busy[m.id]}
                          className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ background: "#FEF9C3", color: "#854D0E", border: "1px solid #FDE68A" }}
                        >
                          <Clock className="h-4 w-4" />
                          {t("meetDetail.pendingCancel")}
                        </button>
                      ) : joined ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            leaveMeet(m.id);
                          }}
                          disabled={busy[m.id]}
                          className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ background: "var(--light-blue)", color: "var(--text-secondary)", border: "1px solid var(--border-soft)" }}
                        >
                          <UserMinus className="h-4 w-4" />
                          {t("meet.leave")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            joinMeet(m.id);
                          }}
                          disabled={joinDisabled}
                          className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{
                            background: joinDisabled ? "var(--text-muted)" : "var(--primary)",
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                          {ended ? t("meet.ended") : m.is_closed ? t("meet.closed") : isFull ? t("meet.full") : t("meet.join")}
                        </button>
                      )}
                      </div>
                    </div>
                    </div>
                  </article>
                </Link>
              );
            })}

          {!loading && !errorMsg && filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center"
              style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}
            >
              <FileText className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                {t("meet.noMeets")}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("meet.trySearch")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}