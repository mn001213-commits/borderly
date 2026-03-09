"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Edit3, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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

type MyStatus = "none" | "pending" | "approved" | "rejected";

type Participant = {
  user_id: string;
  status: MyStatus;
  display_name: string | null;
  avatar_url: string | null;
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
      return "Skill Exchange";
    case "language":
      return "Language Exchange";
    case "meal":
      return "Meal Buddy";
    case "party":
      return "Party";
    case "project":
      return "Team Recruit";
    case "sports":
      return "Sports";
    default:
      return "MEET";
  }
}

function isPast(start_at: string | null) {
  if (!start_at) return false;
  return new Date(start_at).getTime() < Date.now();
}

export default function MeetDetailPage() {
  const params = useParams();
  const router = useRouter();

  // Auto-redirect to group chat on approval: set false to disable
  const AUTO_GO_CHAT = false;

  const meetId = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [meet, setMeet] = useState<MeetRow | null>(null);
  const [meId, setMeId] = useState<string | null>(null);

  const [joining, setJoining] = useState(false);
  const [groupConversationId, setGroupConversationId] = useState<string | null>(null);

  const [myStatus, setMyStatus] = useState<MyStatus>("none");
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Detect approval transition + banner
  const prevStatusRef = useRef<MyStatus>("none");
  const [approvedJustNow, setApprovedJustNow] = useState(false);

  const loadAll = useCallback(async () => {
    if (!meetId) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const uid = user?.id ?? null;
    setMeId(uid);

    // 1) meet + count (view)
    const { data: m, error: mErr } = await supabase
      .from("v_meet_with_count")
      .select("*")
      .eq("id", meetId)
      .maybeSingle();

    if (mErr) {
      console.error(mErr);
      setMeet(null);
      setLoading(false);
      return;
    }
    setMeet(m as MeetRow);

    // 2) group chat id
    const { data: gc, error: gcErr } = await supabase
      .from("group_conversations")
      .select("conversation_id")
      .eq("meet_id", meetId)
      .maybeSingle();

    if (gcErr) console.error(gcErr);
    setGroupConversationId(gc?.conversation_id ?? null);

    // 3) Check my status (fallback if status column missing)
    if (uid) {
      const r1 = await supabase
        .from("meet_participants")
        .select("status")
        .eq("meet_id", meetId)
        .eq("user_id", uid)
        .maybeSingle();

      if (!r1.error) {
        const st = (r1.data?.status as MyStatus | undefined) ?? "none";
        setMyStatus((st ?? "none") as MyStatus);
      } else {
        const r2 = await supabase
          .from("meet_participants")
          .select("meet_id")
          .eq("meet_id", meetId)
          .eq("user_id", uid)
          .maybeSingle();

        setMyStatus(r2.data ? "approved" : "none");
      }
    } else {
      setMyStatus("none");
    }

    // 4) Load participants: avoid join (prevents 400) -> map profiles via 2nd query
    const mp = await supabase
      .from("meet_participants")
      .select("user_id,status")
      .eq("meet_id", meetId);

    if (mp.error) {
      console.error(mp.error);
      setParticipants([]);
      setLoading(false);
      return;
    }

    const mpRows = (mp.data ?? []).map((r: any) => ({
      user_id: r.user_id as string,
      status: ((r.status as MyStatus) ?? "approved") as MyStatus,
    }));

    const userIds = mpRows.map((x) => x.user_id).filter(Boolean);

    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();

    if (userIds.length > 0) {
      const pr = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", userIds);

      if (!pr.error) {
        for (const p of pr.data ?? []) {
          profileMap.set(p.id, {
            display_name: p.display_name ?? null,
            avatar_url: p.avatar_url ?? null,
          });
        }
      } else {
        console.error(pr.error);
      }
    }

    const merged: Participant[] = mpRows.map((r) => {
      const prof = profileMap.get(r.user_id);
      return {
        user_id: r.user_id,
        status: r.status,
        display_name: prof?.display_name ?? null,
        avatar_url: prof?.avatar_url ?? null,
      };
    });

    // approved -> pending -> rejected
    const w = (s: MyStatus) => (s === "approved" ? 0 : s === "pending" ? 1 : 2);
    merged.sort((a, b) => w(a.status) - w(b.status));

    setParticipants(merged);
    setLoading(false);
  }, [meetId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Detect approval transition (pending -> approved)
  useEffect(() => {
    const prev = prevStatusRef.current;

    if (prev === "pending" && myStatus === "approved") {
      setApprovedJustNow(true);

      const t = setTimeout(() => setApprovedJustNow(false), 3000);

      if (AUTO_GO_CHAT && groupConversationId) {
        router.push(`/chats/${groupConversationId}`);
      }

      return () => clearTimeout(t);
    }

    prevStatusRef.current = myStatus;
  }, [myStatus, groupConversationId, router]);

  // Realtime subscription
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!meetId) return;

    const refetchSoon = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => loadAll(), 200);
    };

    const ch = supabase
      .channel(`meet-detail-${meetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meet_participants", filter: `meet_id=eq.${meetId}` },
        refetchSoon
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meet_posts", filter: `id=eq.${meetId}` },
        refetchSoon
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(ch);
    };
  }, [meetId, loadAll]);

  const isHost = !!meet && meId === meet.host_id;
  const ended = isPast(meet?.start_at ?? null);

  const isFull =
    meet?.max_people != null &&
    (meet.participant_count ?? 0) >= (meet.max_people ?? 0);

  const isClosed = !!meet?.is_closed || ended || isFull;

  const capText =
    meet?.max_people == null
      ? `${meet?.participant_count ?? 0} joined`
      : `${meet?.participant_count ?? 0}/${meet?.max_people} joined`;

  const remainText =
    meet?.max_people == null
      ? "No capacity limit"
      : `${Math.max(0, (meet.max_people ?? 0) - (meet.participant_count ?? 0))} spots left`;

  async function joinOrRequest() {
    if (!meet || !meId) return;

    setJoining(true);

    const ins = await supabase.from("meet_participants").insert({
      meet_id: meet.id,
      user_id: meId,
      status: "pending",
    } as any);

    if (ins.error) {
      // Immediate (legacy) fallback: insert without status
      // Group chat member add/remove is handled by DB trigger
      await supabase.from("meet_participants").insert({
        meet_id: meet.id,
        user_id: meId,
      } as any);
    }

    setJoining(false);
    loadAll();
  }

  async function cancelRequestOrLeave() {
    if (!meet || !meId) return;

    setJoining(true);

    await supabase
      .from("meet_participants")
      .delete()
      .eq("meet_id", meet.id)
      .eq("user_id", meId);

    setJoining(false);
    loadAll();
  }

  async function goChat() {
    if (!groupConversationId) return;
    router.push(`/chats/${groupConversationId}`);
  }

  function primaryButtonText() {
    if (!meId) return "Login Required";
    if (isHost) return "";
    if (myStatus === "approved") return "Leave";
    if (myStatus === "pending") return "Pending - Cancel Request";
    if (myStatus === "rejected") return "Rejected";
    return "Request to Join";
  }

  function primaryDisabled() {
    if (!meId) return true;
    if (isHost) return true;
    if (myStatus === "rejected") return true;
    if (isClosed && myStatus === "none") return true;
    return false;
  }

  async function onPrimary() {
    if (!meId || isHost) return;
    if (myStatus === "approved" || myStatus === "pending") {
      await cancelRequestOrLeave();
      return;
    }
    await joinOrRequest();
  }

  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!meet || !meId) return;
    if (!confirm("Are you sure you want to delete this meetup? This action cannot be undone.")) return;

    setDeleting(true);
    const { error } = await supabase.from("meet_posts").delete().eq("id", meet.id);
    if (error) {
      alert(error.message);
      setDeleting(false);
      return;
    }
    router.push("/meet");
  }

  const approvedList = useMemo(() => participants.filter((p) => p.status === "approved"), [participants]);
  const pendingList = useMemo(() => participants.filter((p) => p.status === "pending"), [participants]);

  if (loading) return <div className="min-h-screen bg-[#F0F7FF] p-6 text-gray-500">Loading...</div>;
  if (!meet) return <div className="min-h-screen bg-[#F0F7FF] p-6 text-gray-500">Meetup not found.</div>;

  const pendingBtn = myStatus === "pending";

  const primaryClass = (() => {
    if (primaryDisabled()) return "bg-gray-300 text-white";
    if (pendingBtn) return "bg-white text-gray-700 border border-gray-200 hover:bg-[#F0F7FF]";
    return "bg-blue-600 text-white hover:opacity-90";
  })();

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex items-center justify-between">
          <Link href="/meet" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]">
            &larr; List
          </Link>

          <button onClick={() => loadAll()} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]">
            Refresh
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {meet.image_url && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meet.image_url} alt="cover" className="h-56 w-full object-cover" />
            </div>
          )}

          <div className="text-xs font-semibold text-gray-500">
            {typeLabel(meet.type)}
            {meet.type === "sports" && meet.sport ? ` · ${meet.sport}` : ""}
          </div>

          <h1 className="mt-2 text-xl font-bold">{meet.title}</h1>

          {/* Approval banner + shortcut */}
          {approvedJustNow && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div>The host approved you. You can now enter the group chat!</div>
              {groupConversationId && (
                <button onClick={goChat} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                  Enter Now
                </button>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {ended ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Ended</span>
            ) : meet.is_closed ? (
              <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">Closed</span>
            ) : isFull ? (
              <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">Full</span>
            ) : (
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Open</span>
            )}

            {meet.max_people != null && (
              <span className="rounded-full border border-gray-200 bg-[#F0F7FF] px-3 py-1 text-xs font-semibold text-gray-600">{remainText}</span>
            )}

            {myStatus !== "none" && !isHost && (
              <span className={cx(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                myStatus === "approved" ? "border-green-200 bg-green-50 text-green-700" :
                myStatus === "pending" ? "border-yellow-200 bg-yellow-50 text-yellow-700" :
                "border-red-200 bg-red-50 text-red-700"
              )}>
                My status: {myStatus}
              </span>
            )}
          </div>

          <div className="mt-3 text-sm whitespace-pre-wrap">{meet.description}</div>

          <div className="mt-4 space-y-1 text-sm text-gray-500">
            <div>Time: {meet.start_at ? new Date(meet.start_at).toLocaleString() : "TBD"}</div>
            <div>Place: {[meet.city, meet.place_hint].filter(Boolean).join(" · ") || "TBD"}</div>
            <div>{capText}</div>
          </div>

          {/* Participant list */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Participants</div>
              <div className="text-sm text-gray-500">{approvedList.length}</div>
            </div>

            {approvedList.length === 0 ? (
              <div className="mt-2 text-sm text-gray-400">No participants yet.</div>
            ) : (
              <div className="mt-3 grid gap-2">
                {approvedList.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full border border-gray-100 overflow-hidden bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {p.display_name ?? p.user_id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-green-600">approved</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingList.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Pending</div>
                  <div className="text-sm text-gray-500">{pendingList.length}</div>
                </div>

                <div className="mt-3 grid gap-2">
                  {pendingList.map((p) => (
                    <div key={p.user_id} className="flex items-center gap-3 opacity-80">
                      <div className="h-8 w-8 rounded-full border border-gray-100 overflow-hidden bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {p.display_name ?? p.user_id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-yellow-600">pending</div>
                      </div>
                    </div>
                  ))}
                </div>

                {!isHost && myStatus === "pending" && (
                  <div className="mt-3 text-xs text-gray-400">The group chat will open once approved.</div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2 flex-wrap">
            {groupConversationId && myStatus === "approved" && (
              <button
                onClick={goChat}
                className={cx(
                  "rounded-xl px-4 py-2 text-sm font-semibold",
                  approvedJustNow ? "bg-blue-600 text-white hover:opacity-90" : "border border-gray-200 bg-white text-gray-700 hover:bg-[#F0F7FF]"
                )}
              >
                Group Chat
              </button>
            )}

            {isHost && (
              <Link href={`/meet/${meet.id}/manage`} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]">
                Manage Participants
              </Link>
            )}

            {isHost && (
              <Link
                href={`/meet/${meet.id}/edit`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF] inline-flex items-center gap-1.5"
              >
                <Edit3 size={14} />
                Edit
              </Link>
            )}

            {isHost && (
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            )}

            {!isHost && (
              <button
                disabled={joining || primaryDisabled()}
                onClick={onPrimary}
                className={cx("rounded-xl px-4 py-2 text-sm font-semibold", primaryClass)}
              >
                {joining ? (
                  "Processing..."
                ) : pendingBtn ? (
                  primaryButtonText()
                ) : (
                  primaryButtonText()
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
