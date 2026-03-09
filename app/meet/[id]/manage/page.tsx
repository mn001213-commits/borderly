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

  // Safe id handling (string | string[])
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Prevent button spam
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
      router.push("/login");
      return;
    }

    // 1) Fetch meetup info (verify host)
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

    // 2) Group chat id
    const { data: gc, error: gcErr } = await supabase
      .from("group_conversations")
      .select("conversation_id")
      .eq("meet_id", id)
      .maybeSingle();

    if (gcErr) console.error(gcErr);
    setConversationId(gc?.conversation_id ?? null);

    // 3) Fetch participants (no join with profiles to prevent 400)
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

    // 4) Map profiles via 2nd query
    const nameMap = new Map<string, string | null>();
    if (userIds.length > 0) {
      const pr = await supabase
        .from("profiles")
        .select("id,display_name") // Change table name here if different in your project
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

    // Sort: pending first, then approved, then rejected
    const weight = (s: Participant["status"]) => (s === "pending" ? 0 : s === "approved" ? 1 : 2);
    mapped.sort((a, b) => weight(a.status) - weight(b.status));

    setParticipants(mapped);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    init();
  }, [init]);

  // Realtime: auto-reflect participant changes (minimized dev warnings)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!id) return;

    // Skip if already subscribed (StrictMode/HMR guard)
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

      // Delay cleanup slightly to avoid "closed before established" warning
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

  if (loading) return <div className="min-h-screen bg-[#F0F7FF] p-6 text-gray-500">Loading...</div>;
  if (!isHost) return null;

  const pending = participants.filter((p) => p.status === "pending");
  const approved = participants.filter((p) => p.status === "approved");
  const rejected = participants.filter((p) => p.status === "rejected");

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex items-center justify-between">
          <Link href={`/meet/${id}`} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]">
            &larr; Back to Meetup
          </Link>

          <button onClick={() => init()} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]">
            Refresh
          </button>
        </div>

        <h1 className="mt-4 text-xl font-bold">Manage Participants</h1>

        {/* Pending */}
        <div className="mt-6">
          <h2 className="mb-2 font-semibold">Pending Approval ({pending.length})</h2>

          {pending.length === 0 && <div className="text-sm text-gray-500">No pending requests</div>}

          {pending.map((p) => (
            <div key={p.user_id} className="mb-2 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold">{p.display_name ?? p.user_id.slice(0, 6)}</div>

              <div className="flex gap-2">
                <button
                  disabled={!!busy[p.user_id]}
                  onClick={() => approve(p.user_id)}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy[p.user_id] ? "Processing" : "Approve"}
                </button>

                <button
                  disabled={!!busy[p.user_id]}
                  onClick={() => reject(p.user_id)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Approved */}
        <div className="mt-8">
          <h2 className="mb-2 font-semibold">Participants ({approved.length})</h2>

          {approved.length === 0 && <div className="text-sm text-gray-500">No participants</div>}

          {approved.map((p) => (
            <div key={p.user_id} className="mb-2 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold">{p.display_name ?? p.user_id.slice(0, 6)}</div>
              <div className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Approved</div>
            </div>
          ))}
        </div>

        {/* Rejected (optional display) */}
        {rejected.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-2 font-semibold">Rejected ({rejected.length})</h2>

            {rejected.map((p) => (
              <div
                key={p.user_id}
                className="mb-2 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm opacity-75"
              >
                <div className="text-sm font-semibold">{p.display_name ?? p.user_id.slice(0, 6)}</div>
                <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">Rejected</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
