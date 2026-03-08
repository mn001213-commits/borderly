"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Participant = {
  user_id: string;
  status: "pending" | "approved" | "rejected";
  display_name: string | null;
};

export default function MeetManagePage() {
  const params = useParams();
  const router = useRouter();

  // ✅ id 안전 처리 (string | string[])
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // ✅ 버튼 연타 방지
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const setBusyKey = (userId: string, v: boolean) => {
    setBusy((prev) => ({ ...prev, [userId]: v }));
  };

  const init = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    // 1) 모임 정보 조회 (호스트 확인)
    const { data: meet, error: meetErr } = await supabase
      .from("meet_posts")
      .select("host_id")
      .eq("id", id)
      .maybeSingle();

    if (meetErr) console.error(meetErr);

    if (!meet || meet.host_id !== user.id) {
      router.push("/meet");
      return;
    }

    setIsHost(true);

    // 2) 단톡방 id
    const { data: gc, error: gcErr } = await supabase
      .from("group_conversations")
      .select("conversation_id")
      .eq("meet_id", id)
      .maybeSingle();

    if (gcErr) console.error(gcErr);
    setConversationId(gc?.conversation_id ?? null);

    // 3) ✅ 참가자 조회 (profiles 조인 금지: 400 방지)
    const mp = await supabase
      .from("meet_participants")
      .select("user_id,status")
      .eq("meet_id", id);

    if (mp.error) {
      console.error(mp.error);
      setParticipants([]);
      setLoading(false);
      return;
    }

    const base = (mp.data ?? []).map((p: any) => ({
      user_id: p.user_id as string,
      status: (p.status ?? "approved") as "pending" | "approved" | "rejected",
    }));

    const userIds = base.map((x) => x.user_id).filter(Boolean);

    // 4) profiles 2쿼리로 매핑
    const nameMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const pr = await supabase
        .from("profiles") // ✅ 너 프로젝트에서 테이블명이 다르면 여기만 교체
        .select("id,display_name")
        .in("id", userIds);

      if (!pr.error) {
        for (const r of pr.data ?? []) {
          nameMap.set(r.id, r.display_name ?? null);
        }
      } else {
        console.error(pr.error);
      }
    }

    const mapped: Participant[] = base.map((p) => ({
      user_id: p.user_id,
      status: p.status,
      display_name: nameMap.get(p.user_id) ?? null,
    }));

    // pending 먼저 보이게 정렬 (approved, rejected는 아래)
    const weight = (s: Participant["status"]) => (s === "pending" ? 0 : s === "approved" ? 1 : 2);
    mapped.sort((a, b) => weight(a.status) - weight(b.status));

    setParticipants(mapped);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    init();
  }, [init]);

  // ✅ realtime: 참가자 변동 자동 반영 (dev 경고 최소화 버전)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!id) return;

    // 이미 구독 중이면 재구독 안 함 (StrictMode/HMR 방어)
    if (chRef.current) return;

    const refetchSoon = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => init(), 200);
    };

    const ch = supabase
      .channel(`meet-manage-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meet_participants", filter: `meet_id=eq.${id}` },
        refetchSoon
      )
      .subscribe();

    chRef.current = ch;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      // cleanup이 너무 빨리 실행되면 "closed before established"가 뜰 수 있어서 한 템포 늦춤
      const old = chRef.current;
      chRef.current = null;

      setTimeout(() => {
        if (old) supabase.removeChannel(old);
      }, 0);
    };
  }, [id, init]);

  async function approve(userId: string) {
    if (!id) return;

    setBusyKey(userId, true);

    const up = await supabase
      .from("meet_participants")
      .update({ status: "approved" })
      .eq("meet_id", id)
      .eq("user_id", userId);

    if (up.error) console.error(up.error);

    if (!up.error && conversationId) {
      const upsert = await supabase.from("conversation_members").upsert({
        conversation_id: conversationId,
        user_id: userId,
      });
      if (upsert.error) console.error(upsert.error);
    }

    setBusyKey(userId, false);
    init();
  }

  async function reject(userId: string) {
    if (!id) return;

    setBusyKey(userId, true);

    const up = await supabase
      .from("meet_participants")
      .update({ status: "rejected" })
      .eq("meet_id", id)
      .eq("user_id", userId);

    if (up.error) console.error(up.error);

    if (!up.error && conversationId) {
      const del = await supabase
        .from("conversation_members")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (del.error) console.error(del.error);
    }

    setBusyKey(userId, false);
    init();
  }

  if (loading) return <div className="p-6">불러오는 중...</div>;
  if (!isHost) return null;

  const pending = participants.filter((p) => p.status === "pending");
  const approved = participants.filter((p) => p.status === "approved");
  const rejected = participants.filter((p) => p.status === "rejected");

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="flex items-center justify-between">
        <Link href={`/meet/${id}`} className="text-sm text-gray-500 hover:underline">
          ← 모임으로 돌아가기
        </Link>

        <button onClick={() => init()} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">
          새로고침
        </button>
      </div>

      <h1 className="mt-4 text-xl font-bold">참가자 관리</h1>

      {/* Pending */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold">승인 대기 ({pending.length})</h2>

        {pending.length === 0 && <div className="text-sm text-gray-500">대기중인 요청 없음</div>}

        {pending.map((p) => (
          <div key={p.user_id} className="mb-2 flex items-center justify-between rounded-xl border p-3">
            <div className="text-sm">{p.display_name ?? p.user_id.slice(0, 6)}</div>

            <div className="flex gap-2">
              <button
                disabled={!!busy[p.user_id]}
                onClick={() => approve(p.user_id)}
                className="rounded-lg bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                {busy[p.user_id] ? "처리중" : "승인"}
              </button>

              <button
                disabled={!!busy[p.user_id]}
                onClick={() => reject(p.user_id)}
                className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50"
              >
                거절
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Approved */}
      <div className="mt-8">
        <h2 className="mb-2 font-semibold">참여자 ({approved.length})</h2>

        {approved.length === 0 && <div className="text-sm text-gray-500">참여자 없음</div>}

        {approved.map((p) => (
          <div key={p.user_id} className="mb-2 flex items-center justify-between rounded-xl border p-3">
            <div className="text-sm">{p.display_name ?? p.user_id.slice(0, 6)}</div>
            <div className="text-xs opacity-60">승인됨</div>
          </div>
        ))}
      </div>

      {/* Rejected (선택 표시) */}
      {rejected.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 font-semibold">거절됨 ({rejected.length})</h2>

          <div className="mb-2 text-sm text-gray-500">필요 없으면 이 섹션 통째로 지워도 됨.</div>

          {rejected.map((p) => (
            <div
              key={p.user_id}
              className="mb-2 flex items-center justify-between rounded-xl border p-3 opacity-75"
            >
              <div className="text-sm">{p.display_name ?? p.user_id.slice(0, 6)}</div>
              <div className="text-xs opacity-60">거절됨</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}