"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
      return "번개";
    case "study":
      return "스터디";
    case "skill":
      return "재능교환";
    case "language":
      return "언어교환";
    case "meal":
      return "밥친구";
    case "party":
      return "파티";
    case "project":
      return "팀원모집";
    case "sports":
      return "스포츠";
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

  // ✅ 승인되면 자동 단톡방 이동: 원치 않으면 false
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

  // ✅ 승인 순간 감지 + 배너
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

    // 3) 내 상태 조회 (status 없으면 fallback)
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

    // 4) ✅ 참가자 로드: 조인 금지(400 제거) → 2번 쿼리로 profiles 매핑
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

    // approved → pending → rejected
    const w = (s: MyStatus) => (s === "approved" ? 0 : s === "pending" ? 1 : 2);
    merged.sort((a, b) => w(a.status) - w(b.status));

    setParticipants(merged);
    setLoading(false);
  }, [meetId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ✅ 승인 전환 감지 (pending -> approved)
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

  // ✅ realtime
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
      ? `👥 ${meet?.participant_count ?? 0}명`
      : `👥 ${meet?.participant_count ?? 0}/${meet?.max_people}명`;

  const remainText =
    meet?.max_people == null
      ? "정원 제한 없음"
      : `남은 자리 ${Math.max(0, (meet.max_people ?? 0) - (meet.participant_count ?? 0))}명`;

  async function joinOrRequest() {
    if (!meet || !meId) return;

    setJoining(true);

    const ins = await supabase.from("meet_participants").insert({
      meet_id: meet.id,
      user_id: meId,
      status: "pending",
    } as any);

    if (ins.error) {
      // ✅ 즉시형(구버전) fallback: status 없이 insert
      // 단톡방 멤버 추가/제거는 DB 트리거가 담당
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
    if (!meId) return "로그인 필요";
    if (isHost) return "";
    if (myStatus === "approved") return "참여 취소";
    if (myStatus === "pending") return "대기중 · 요청 취소";
    if (myStatus === "rejected") return "거절됨";
    return "참여 요청";
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

  const approvedList = useMemo(() => participants.filter((p) => p.status === "approved"), [participants]);
  const pendingList = useMemo(() => participants.filter((p) => p.status === "pending"), [participants]);

  if (loading) return <div className="p-6">불러오는 중...</div>;
  if (!meet) return <div className="p-6">모임을 찾을 수 없습니다.</div>;

  const pendingBtn = myStatus === "pending";

  const primaryClass = (() => {
    if (primaryDisabled()) return "bg-gray-300 text-white";
    if (pendingBtn) return "bg-white text-black border hover:bg-gray-50";
    return "bg-black text-white";
  })();

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <Link href="/meet" className="text-sm text-gray-500 hover:underline">
          ← 목록
        </Link>

        <button onClick={() => loadAll()} className="text-sm rounded-lg border px-3 py-1 hover:bg-gray-50">
          새로고침
        </button>
      </div>

      <div className="mt-4 rounded-2xl border p-5">
        {meet.image_url && (
          <div className="mb-4 overflow-hidden rounded-2xl border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={meet.image_url} alt="cover" className="h-56 w-full object-cover" />
          </div>
        )}

        <div className="text-xs font-semibold opacity-70">
          {typeLabel(meet.type)}
          {meet.type === "sports" && meet.sport ? ` · ${meet.sport}` : ""}
        </div>

        <h1 className="mt-2 text-xl font-bold">{meet.title}</h1>

        {/* ✅ 승인 직후 배너 + 바로가기 */}
        {approvedJustNow && (
          <div className="mt-3 rounded-xl border bg-white px-4 py-3 text-sm flex items-center justify-between gap-3">
            <div>✅ 호스트가 승인했어. 단톡방에 입장할 수 있어!</div>
            {groupConversationId && (
              <button onClick={goChat} className="rounded-lg bg-black px-3 py-1 text-xs text-white">
                지금 들어가기
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {ended ? (
            <span className="rounded-full border px-3 py-1 text-xs font-semibold opacity-70">종료</span>
          ) : meet.is_closed ? (
            <span className="rounded-full border px-3 py-1 text-xs font-semibold">마감</span>
          ) : isFull ? (
            <span className="rounded-full border px-3 py-1 text-xs font-semibold">정원 마감</span>
          ) : (
            <span className="rounded-full border px-3 py-1 text-xs font-semibold opacity-80">모집중</span>
          )}

          {meet.max_people != null && (
            <span className="rounded-full border px-3 py-1 text-xs font-semibold opacity-70">{remainText}</span>
          )}

          {myStatus !== "none" && !isHost && (
            <span className="rounded-full border px-3 py-1 text-xs font-semibold opacity-70">
              내 상태: {myStatus}
            </span>
          )}
        </div>

        <div className="mt-3 text-sm whitespace-pre-wrap">{meet.description}</div>

        <div className="mt-4 text-sm opacity-70 space-y-1">
          <div>🕒 {meet.start_at ? new Date(meet.start_at).toLocaleString() : "시간 미정"}</div>
          <div>📍 {[meet.city, meet.place_hint].filter(Boolean).join(" · ") || "장소 미정"}</div>
          <div>{capText}</div>
        </div>

        {/* 참가자 리스트 */}
        <div className="mt-6 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">참가자</div>
            <div className="text-sm opacity-70">{approvedList.length}명</div>
          </div>

          {approvedList.length === 0 ? (
            <div className="mt-2 text-sm opacity-60">아직 참가자가 없어.</div>
          ) : (
            <div className="mt-3 grid gap-2">
              {approvedList.map((p) => (
                <div key={p.user_id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border overflow-hidden bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {p.display_name ?? p.user_id.slice(0, 8)}
                    </div>
                    <div className="text-xs opacity-60">approved</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingList.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">대기</div>
                <div className="text-sm opacity-70">{pendingList.length}명</div>
              </div>

              <div className="mt-3 grid gap-2">
                {pendingList.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-3 opacity-80">
                    <div className="h-8 w-8 rounded-full border overflow-hidden bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {p.display_name ?? p.user_id.slice(0, 8)}
                      </div>
                      <div className="text-xs opacity-60">pending</div>
                    </div>
                  </div>
                ))}
              </div>

              {!isHost && myStatus === "pending" && (
                <div className="mt-3 text-xs opacity-60">승인되면 단톡방이 열려.</div>
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
                approvedJustNow ? "bg-black text-white" : "border hover:bg-gray-50"
              )}
            >
              모임 단톡방
            </button>
          )}

          {isHost && (
            <Link href={`/meet/${meet.id}/manage`} className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50">
              참가자 관리
            </Link>
          )}

          {!isHost && (
            <button
              disabled={joining || primaryDisabled()}
              onClick={onPrimary}
              className={cx("rounded-xl px-4 py-2 text-sm font-semibold", primaryClass)}
            >
              {joining ? (
                "처리중..."
              ) : pendingBtn ? (
                <>
                  <span className="mr-2" aria-hidden>
                    ⏳
                  </span>
                  {primaryButtonText()}
                </>
              ) : (
                primaryButtonText()
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}