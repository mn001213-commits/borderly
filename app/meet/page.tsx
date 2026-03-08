"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AuthBar from "@/app/components/AuthBar";
import { getUnreadCount } from "@/lib/notificationService";
import {
  LayoutGrid,
  Users,
  Building2,
  Search,
  MessageCircle,
  Bell,
  User,
  Plus,
  MapPin,
  Calendar,
  UserPlus,
  UserMinus,
  FileText,
} from "lucide-react";

type MeetType =
  | "hangout"
  | "study"
  | "skill"
  | "language"
  | "meal"
  | "party"
  | "project"
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
  is_closed: boolean;
  created_at: string;
  image_url: string | null;
  participant_count: number;
};

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function typeLabel(t: MeetType) {
  switch (t) {
    case "hangout":
      return "Hangout";
    case "study":
      return "Study";
    case "skill":
      return "Skill";
    case "language":
      return "Language";
    case "meal":
      return "Meal";
    case "party":
      return "Party";
    case "project":
      return "Project";
    case "sports":
      return "Sports";
    default:
      return "Meet";
  }
}

function isPastMeet(start_at: string | null) {
  if (!start_at) return false;
  const t = new Date(start_at).getTime();
  return Number.isFinite(t) && t < Date.now();
}

function formatWhen(start_at: string | null) {
  if (!start_at) return "Time not set";
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
  const pathname = usePathname();

  const [meets, setMeets] = useState<MeetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isAuthed, setIsAuthed] = useState(false);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [joinedSet, setJoinedSet] = useState<Set<string>>(new Set());

  const [prefs, setPrefs] = useState<{ topTypes: string[]; topCities: string[] }>({
    topTypes: [],
    topCities: [],
  });

  const [q, setQ] = useState("");
  const [activeType, setActiveType] = useState<"all" | MeetType>("all");
  const [sortMode, setSortMode] = useState<"recommend" | "latest" | "popular">("recommend");

  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id ?? null;

    setMyUid(uid);
    setIsAuthed(!!uid);

    const { data, error } = await supabase
      .from("v_meet_with_count")
      .select(
        "id,host_id,type,sport,title,description,city,place_hint,start_at,max_people,is_closed,created_at,image_url,participant_count"
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
    setMeets(list);

    if (uid) {
      const r = await supabase.from("meet_participants").select("meet_id").eq("user_id", uid);

      const meetIds = (r.data ?? []).map((x: any) => x.meet_id).filter(Boolean);
      setJoinedSet(new Set(meetIds));

      if (meetIds.length > 0) {
        const { data: joinedMeets } = await supabase.from("meets").select("id,type,city").in("id", meetIds);

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
      setJoinedSet(new Set());
      setPrefs({ topTypes: [], topCities: [] });
    }

    if (uid) {
      try {
        const c = await getUnreadCount();
        setUnread(c);
      } catch {
        setUnread(0);
      }
    } else {
      setUnread(0);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(!!data.session);
      setMyUid(data.session?.user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session);
      setMyUid(session?.user?.id ?? null);
      load();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refetchSoon = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => load(), 250);
    };

    const ch = supabase
      .channel("meet-list-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meets" }, refetchSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "meet_participants" }, refetchSoon)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, refetchSoon)
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(ch);
    };
  }, [load]);

  const typeTabs: Array<"all" | MeetType> = [
    "all",
    "hangout",
    "study",
    "language",
    "meal",
    "sports",
    "skill",
    "project",
    "party",
  ];

  const typeLabelForTab = (t: "all" | MeetType) => {
    if (t === "all") return "All";
    return typeLabel(t);
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

    setJoinedSet((prev) => new Set(prev).add(meetId));
    setMeets((prev) =>
      prev.map((m) => (m.id === meetId ? { ...m, participant_count: (m.participant_count ?? 0) + 1 } : m))
    );

    try {
      const { error } = await supabase.rpc("join_meet", { p_meet_id: meetId });

      if (error) {
        const msg = String(error.message ?? error);

        setJoinedSet((prev) => {
          const n = new Set(prev);
          n.delete(meetId);
          return n;
        });
        setMeets((prev) =>
          prev.map((m) =>
            m.id === meetId ? { ...m, participant_count: Math.max(0, (m.participant_count ?? 0) - 1) } : m
          )
        );

        if (msg.includes("MEET_FULL")) alert("This meet is full.");
        else if (msg.includes("MEET_CLOSED")) alert("This meet is closed.");
        else alert("Something went wrong.");

        await load();
      }
    } finally {
      setBusyKey(meetId, false);
    }
  };

  const leaveMeet = async (meetId: string) => {
    if (!myUid) return;
    setBusyKey(meetId, true);

    setJoinedSet((prev) => {
      const n = new Set(prev);
      n.delete(meetId);
      return n;
    });
    setMeets((prev) =>
      prev.map((m) =>
        m.id === meetId ? { ...m, participant_count: Math.max(0, (m.participant_count ?? 0) - 1) } : m
      )
    );

    try {
      const { error } = await supabase.rpc("leave_meet", { p_meet_id: meetId });
      if (error) {
        await load();
      }
    } finally {
      setBusyKey(meetId, false);
    }
  };

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
  const iconButton =
    "flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-900";
  const tabBase =
    "inline-flex h-9 items-center rounded-full px-3 text-sm font-medium transition whitespace-nowrap";

  const SortButton = ({
    mode,
    label,
  }: {
    mode: "recommend" | "latest" | "popular";
    label: string;
  }) => {
    const active = sortMode === mode;
    return (
      <button
        type="button"
        onClick={() => setSortMode(mode)}
        className={cx(
          tabBase,
          active ? "bg-black text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
        )}
      >
        {label}
      </button>
    );
  };

  const NavItem = ({
    href,
    icon,
    label,
    active,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active: boolean;
  }) => (
    <Link
      href={href}
      className={cx(
        "flex items-center gap-3 rounded-2xl px-3 py-3 transition",
        active ? "bg-black text-white" : "text-gray-700 hover:bg-gray-50"
      )}
    >
      <div
        className={cx(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          active ? "bg-white/15" : "border border-gray-200 bg-white"
        )}
      >
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-gray-50/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold tracking-tight">borderly</div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Link href="/inbox" className={iconButton} aria-label="Messages">
                <MessageCircle className="h-5 w-5" />
              </Link>

              <Link href="/notifications" className={cx(iconButton, "relative")} aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>

              <Link href="/profile" className={iconButton} aria-label="Profile">
                <User className="h-5 w-5" />
              </Link>

              <div className="ml-1">
                <AuthBar />
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
          <aside className={cx(card, "hidden h-fit p-3 lg:sticky lg:top-20 lg:block")}>
            <div className="grid gap-1">
              <NavItem
                href="/"
                label="Community"
                active={pathname === "/"}
                icon={<LayoutGrid className="h-5 w-5" />}
              />
              <NavItem
                href="/meet"
                label="Meet"
                active={pathname === "/meet"}
                icon={<Users className="h-5 w-5" />}
              />
              <NavItem
                href="/ngo"
                label="NGO"
                active={pathname === "/ngo"}
                icon={<Building2 className="h-5 w-5" />}
              />
            </div>
          </aside>

          <main className="min-w-0 space-y-5">
            <section className={cx(card, "p-4 sm:p-5")}>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3">
                    <Search className="h-5 w-5 shrink-0 text-gray-400" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search meets by title, description, city..."
                      className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={isAuthed ? "/meet/new" : "/auth"}
                      className="hidden h-11 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:opacity-90 sm:inline-flex"
                    >
                      Create Meet
                    </Link>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {typeTabs.map((t) => {
                    const active = activeType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setActiveType(t)}
                        className={cx(
                          tabBase,
                          active
                            ? "bg-black text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        {typeLabelForTab(t)}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="mr-1 text-xs font-medium text-gray-500">Sort</span>
                  <SortButton mode="recommend" label="Recommended" />
                  <SortButton mode="latest" label="Latest" />
                  <SortButton mode="popular" label="Popular" />

                  <span className="ml-auto text-right">
                    Results <b className="text-gray-900">{filtered.length}</b>
                    {activeType !== "all" ? (
                      <>
                        {" "}
                        · <b className="text-gray-900">{typeLabelForTab(activeType)}</b>
                      </>
                    ) : null}
                    {q.trim() ? (
                      <>
                        {" "}
                        · Search <b className="text-gray-900">{q.trim()}</b>
                      </>
                    ) : null}
                  </span>
                </div>
              </div>
            </section>

            <section className="grid gap-3">
              {loading && <div className={cx(card, "p-5 text-sm text-gray-500")}>Loading...</div>}

              {errorMsg && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              {!loading &&
                !errorMsg &&
                filtered.map((m) => {
                  const where = [m.city, m.place_hint].filter(Boolean).join(" · ") || "Location not set";
                  const when = formatWhen(m.start_at);
                  const ended = isPastMeet(m.start_at);

                  const cap =
                    m.max_people == null
                      ? `${m.participant_count} joined`
                      : `${m.participant_count} / ${m.max_people}`;

                  const isFull = m.max_people != null && m.participant_count >= m.max_people;
                  const joined = joinedSet.has(m.id);

                  const joinDisabled = !myUid || ended || m.is_closed || isFull || busy[m.id];

                  let statusLabel = "Open";
                  if (ended) statusLabel = "Ended";
                  else if (m.is_closed) statusLabel = "Closed";
                  else if (isFull) statusLabel = "Full";
                  else if (joined) statusLabel = "Joined";

                  return (
                    <Link key={m.id} href={`/meet/${m.id}`} className="no-underline text-inherit">
                      <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="inline-flex h-7 items-center rounded-full bg-gray-100 px-3 font-medium text-gray-600">
                                {typeLabel(m.type)}
                                {m.type === "sports" && m.sport ? ` · ${m.sport}` : ""}
                              </span>

                              <span
                                className={cx(
                                  "inline-flex h-7 items-center rounded-full px-3 font-medium",
                                  joined
                                    ? "bg-black text-white"
                                    : ended || m.is_closed || isFull
                                    ? "bg-gray-100 text-gray-500"
                                    : "bg-gray-100 text-gray-700"
                                )}
                              >
                                {statusLabel}
                              </span>
                            </div>

                            <h2 className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-gray-900 sm:text-base">
                              {m.title}
                            </h2>
                          </div>
                        </div>

                        {m.image_url ? (
                          <div className="mt-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.image_url}
                              alt="Meet cover"
                              className="h-44 w-full rounded-xl object-cover"
                            />
                          </div>
                        ) : null}

                        <div className="mt-4 space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{when}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{where}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{cap}</span>
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                          {m.description.length > 140 ? `${m.description.slice(0, 140)}...` : m.description}
                        </p>

                        <div className="mt-4 flex justify-end gap-2">
                          {!myUid ? (
                            <span className="inline-flex h-10 items-center text-xs font-medium text-gray-500">
                              Sign in required
                            </span>
                          ) : joined ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                leaveMeet(m.id);
                              }}
                              disabled={busy[m.id]}
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <UserMinus className="h-4 w-4" />
                              Leave
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
                              className={cx(
                                "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                                joinDisabled
                                  ? "border border-gray-200 bg-white text-gray-500"
                                  : "bg-black text-white hover:opacity-90"
                              )}
                            >
                              <UserPlus className="h-4 w-4" />
                              {ended ? "Ended" : m.is_closed ? "Closed" : isFull ? "Full" : "Join"}
                            </button>
                          )}
                        </div>
                      </article>
                    </Link>
                  );
                })}

              {!loading && !errorMsg && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
                  <FileText className="mb-3 h-10 w-10 text-gray-300" />
                  <div className="text-sm font-semibold text-gray-800">No meets found</div>
                  <div className="mt-1 text-sm text-gray-500">Try another search or create a new meet.</div>
                </div>
              )}
            </section>
          </main>
        </div>

        <Link
          href={isAuthed ? "/meet/new" : "/auth"}
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg transition hover:scale-[1.03]"
          aria-label="Create meet"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}