"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { joinMeet, leaveMeet, isJoined, getParticipantCount } from "@/lib/meetParticipationService";

type MeetRow = {
  id: string;
  host_id: string;
  type: string;
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
};

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export default function MeetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const meetId = params?.id;

  const [meId, setMeId] = useState<string | null>(null);
  const [meet, setMeet] = useState<MeetRow | null>(null);
  const [loading, setLoading] = useState(true);

  const [joined, setJoined] = useState(false);
  const [pCount, setPCount] = useState(0);
  const [joinLoading, setJoinLoading] = useState(false);

  const isFull = useMemo(() => {
    if (!meet?.max_people) return false;
    return pCount >= meet.max_people;
  }, [meet?.max_people, pCount]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setMeId(uid);

      if (!meetId) return;

      // meet 로드
      const { data: m, error: mErr } = await supabase
        .from("meets")
        .select("*")
        .eq("id", meetId)
        .maybeSingle();

      if (mErr) {
        console.error(mErr);
        setLoading(false);
        return;
      }

      setMeet(m as MeetRow);

      // 참가자 수
      const c = await getParticipantCount(meetId as string);
      setPCount(c);

      // 내가 참가했는지
      if (uid) {
        const j = await isJoined(meetId as string, uid);
        setJoined(j);
      } else {
        setJoined(false);
      }

      setLoading(false);
    };

    init();
  }, [meetId]);

  const refreshCounts = async () => {
    if (!meetId) return;
    const c = await getParticipantCount(meetId as string);
    setPCount(c);
  };

  const onJoin = async () => {
    if (!meId || !meetId) return;
    if (meet?.is_closed) return;
    if (isFull) return;
    if (joinLoading) return;

    setJoinLoading(true);
    try {
      await joinMeet(meetId as string);

      // 동기화
      const [c, j] = await Promise.all([
        getParticipantCount(meetId as string),
        isJoined(meetId as string, meId),
      ]);
      setPCount(c);
      setJoined(j);

      router.refresh();
    } catch (e: any) {
      const msg = String(e?.message ?? e);

      if (msg.includes("MEET_FULL")) alert("인원이 꽉 찼습니다.");
      else if (msg.includes("MEET_CLOSED")) alert("모집이 마감되었습니다.");
      else alert("처리 중 오류가 발생했습니다.");

      console.error(e);

      // 혹시 서버쪽에서 처리됐는데 UI만 꼬인 경우 대비
      try {
        const [c, j] = await Promise.all([
          getParticipantCount(meetId as string),
          isJoined(meetId as string, meId),
        ]);
        setPCount(c);
        setJoined(j);
      } catch {}
    } finally {
      setJoinLoading(false);
    }
  };

  const onLeave = async () => {
    if (!meId || !meetId) return;
    if (joinLoading) return;

    setJoinLoading(true);
    try {
      await leaveMeet(meetId as string);

      const [c, j] = await Promise.all([
        getParticipantCount(meetId as string),
        isJoined(meetId as string, meId),
      ]);
      setPCount(c);
      setJoined(j);

      router.refresh();
    } catch (e) {
      console.error(e);

      // 일단 숫자/상태 재동기화
      try {
        const [c, j] = await Promise.all([
          getParticipantCount(meetId as string),
          isJoined(meetId as string, meId),
        ]);
        setPCount(c);
        setJoined(j);
      } catch {}
    } finally {
      setJoinLoading(false);
    }
  };

  if (loading) return <div className="p-6">로딩중...</div>;
  if (!meet) return <div className="p-6">모임을 찾을 수 없음</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/meets" className="text-sm underline">
          ← 목록
        </Link>
        <button onClick={() => router.refresh()} className="text-sm px-3 py-1 rounded border">
          새로고침
        </button>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xl font-semibold">{meet.title}</div>
            <div className="text-sm opacity-70 mt-1">
              {meet.city ? `도시: ${meet.city}` : "도시: -"} ·{" "}
              {meet.place_hint ? `장소 힌트: ${meet.place_hint}` : "장소 힌트: -"}
            </div>
            <div className="text-sm opacity-70 mt-1">
              {meet.start_at ? `시작: ${new Date(meet.start_at).toLocaleString()}` : "시작: -"}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm opacity-70">참가자</div>
            <div className="text-lg font-semibold">
              {pCount}
              {meet.max_people ? ` / ${meet.max_people}` : ""}
            </div>
            {meet.is_closed && <div className="text-xs mt-1">마감됨</div>}
            {isFull && !meet.is_closed && <div className="text-xs mt-1">정원 마감</div>}
          </div>
        </div>

        <div className="mt-4 whitespace-pre-wrap leading-relaxed">{meet.description}</div>

        <div className="mt-5 flex gap-2">
          {!meId ? (
            <div className="text-sm opacity-70">로그인하면 참가할 수 있어요.</div>
          ) : joined ? (
            <button onClick={onLeave} disabled={joinLoading} className="px-4 py-2 rounded-xl border disabled:opacity-50">
              {joinLoading ? "처리 중..." : "참가 취소"}
            </button>
          ) : (
            <button
              onClick={onJoin}
              disabled={meet.is_closed || isFull || joinLoading}
              className={cx(
                "px-4 py-2 rounded-xl border",
                (meet.is_closed || isFull || joinLoading) && "opacity-50 cursor-not-allowed"
              )}
            >
              {joinLoading ? "처리 중..." : "참가하기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}