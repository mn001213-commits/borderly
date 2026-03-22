"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/app/components/LangProvider";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notificationService";

type Participant = {
  user_id: string;
  status: "pending" | "approved" | "rejected";
  display_name: string | null;
  user_type: string | null;
};

export default function MeetManagePage() {
  const { t } = useT();
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
  const [maxForeigners, setMaxForeigners] = useState<number | null>(null);
  const [maxLocals, setMaxLocals] = useState<number | null>(null);
  const [meetTitle, setMeetTitle] = useState<string>("");

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
      .select("host_id,max_foreigners,max_locals,title")
      .eq("id", id)
      .maybeSingle();

    if (meetErr && process.env.NODE_ENV === "development") console.error(meetErr);

    if (!meet || meet.host_id !== user.id) {
      router.push("/meet");
      return;
    }

    setIsHost(true);
    setMaxForeigners(meet.max_foreigners ?? null);
    setMaxLocals(meet.max_locals ?? null);
    setMeetTitle(meet.title ?? "");

    // 2) Group chat id
    const { data: gc, error: gcErr } = await supabase
      .from("group_conversations")
      .select("conversation_id")
      .eq("meet_id", id)
      .maybeSingle();

    if (gcErr && process.env.NODE_ENV === "development") console.error(gcErr);
    setConversationId(gc?.conversation_id ?? null);

    // 3) Fetch participants (no join with profiles to prevent 400)
    const mp = await supabase
      .from("meet_participants")
      .select("user_id,status")
      .eq("meet_id", id);

    if (mp.error) {
      if (process.env.NODE_ENV === "development") console.error(mp.error);
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
    const profileMap = new Map<string, { display_name: string | null; user_type: string | null }>();
    if (userIds.length > 0) {
      const pr = await supabase
        .from("profiles")
        .select("id,display_name,user_type")
        .in("id", userIds);

      if (!pr.error) {
        for (const r of pr.data ?? []) {
          profileMap.set(r.id, {
            display_name: r.display_name ?? null,
            user_type: r.user_type ?? null,
          });
        }
      } else {
        if (process.env.NODE_ENV === "development") console.error(pr.error);
      }
    }

    const mapped: Participant[] = base.map((p) => ({
      user_id: p.user_id,
      status: p.status,
      display_name: profileMap.get(p.user_id)?.display_name ?? null,
      user_type: profileMap.get(p.user_id)?.user_type ?? null,
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

    let cancelled = false;

    const refetchSoon = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { if (!cancelled) init(); }, 200);
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      const ch = supabase
        .channel(`meet-manage-${id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "meet_participants", filter: `meet_id=eq.${id}` },
          refetchSoon
        )
        .subscribe();

      chRef.current = ch;
    };

    start();

    return () => {
      cancelled = true;
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

    if (up.error && process.env.NODE_ENV === "development") console.error(up.error);

    if (!up.error && conversationId) {
      const upsert = await supabase.from("conversation_members").upsert({
        conversation_id: conversationId,
        user_id: userId,
      });
      if (upsert.error && process.env.NODE_ENV === "development") console.error(upsert.error);
    }

    // Notify the approved participant
    if (!up.error) {
      createNotification({
        userId,
        type: "meet",
        title: "Request approved",
        body: `Your request to join "${meetTitle}" has been approved. You can now enter the group chat!`,
        link: `/meet/${id}`,
      });
    }

    // Check if a quota slot just filled up → notify host
    if (!up.error && maxForeigners != null && maxLocals != null) {
      const approvedUser = participants.find((p) => p.user_id === userId);
      const userType = approvedUser?.user_type;

      // Count approved after this approval
      const newApproved = [...approved, ...(approvedUser ? [{ ...approvedUser, status: "approved" as const }] : [])];
      const fCount = newApproved.filter((p) => p.user_type === "foreigner").length;
      const lCount = newApproved.filter((p) => p.user_type === "local").length;

      const { data: { user: me } } = await supabase.auth.getUser();

      if (userType === "foreigner" && fCount === maxForeigners && me) {
        createNotification({
          userId: me.id,
          type: "meet",
          title: t("meetManage.foreignerSlotsFull"),
          body: `${t("meetManage.allSlotsFilled")} ${maxForeigners} ${t("createMeet.foreigners")} - "${meetTitle}"`,
          link: `/meet/${id}`,
        });
      }
      if (userType === "local" && lCount === maxLocals && me) {
        createNotification({
          userId: me.id,
          type: "meet",
          title: t("meetManage.localSlotsFull"),
          body: `${t("meetManage.allSlotsFilled")} ${maxLocals} ${t("createMeet.locals")} - "${meetTitle}"`,
          link: `/meet/${id}`,
        });
      }
      if (fCount >= maxForeigners && lCount >= maxLocals && me) {
        createNotification({
          userId: me.id,
          type: "meet",
          title: t("meetManage.recruitmentComplete"),
          body: `${t("meetManage.allSlotsFilled")} "${meetTitle}"`,
          link: `/meet/${id}`,
        });
      }
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

    if (up.error && process.env.NODE_ENV === "development") console.error(up.error);

    if (!up.error && conversationId) {
      const del = await supabase
        .from("conversation_members")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", userId);

      if (del.error && process.env.NODE_ENV === "development") console.error(del.error);
    }

    // Notify the rejected participant
    if (!up.error) {
      createNotification({
        userId,
        type: "meet",
        title: "Request declined",
        body: `Your request to join "${meetTitle}" was declined.`,
        link: `/meet/${id}`,
      });
    }

    setBusyKey(userId, false);
    init();
  }

  if (loading) return <div className="min-h-screen p-6" style={{ background: "var(--bg-snow)", color: "var(--text-muted)" }}><div className="mx-auto max-w-2xl space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="b-skeleton h-24 w-full"/>)}</div></div>;
  if (!isHost) return null;

  const pending = participants.filter((p) => p.status === "pending");
  const approved = participants.filter((p) => p.status === "approved");
  const rejected = participants.filter((p) => p.status === "rejected");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex items-center justify-between b-animate-in">
          <Link href={`/meet/${id}`} className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition hover:opacity-80" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>
            &larr; {t("meetManage.backToMeetup")}
          </Link>

          <button onClick={() => init()} className="inline-flex h-10 items-center rounded-2xl px-3 text-sm font-medium transition hover:opacity-80" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>
            {t("meetDetail.refresh")}
          </button>
        </div>

        <h1 className="mt-4 text-xl font-bold b-animate-in">{t("meetDetail.manageParticipants")}</h1>

        {/* Quota Progress */}
        {maxForeigners != null && maxLocals != null && (() => {
          const approvedForeigners = approved.filter((p) => p.user_type === "foreigner").length;
          const approvedLocals = approved.filter((p) => p.user_type === "local").length;
          const fPct = Math.min(100, (approvedForeigners / maxForeigners) * 100);
          const lPct = Math.min(100, (approvedLocals / maxLocals) * 100);
          return (
            <div className="mt-4 b-card p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("createMeet.recruitmentQuota")}
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1">
                  <span style={{ color: "#1D4ED8" }}>{t("createMeet.foreigners")}</span>
                  <span style={{ color: "var(--text-muted)" }}>{approvedForeigners} / {maxForeigners}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${fPct}%`, background: approvedForeigners >= maxForeigners ? "#22C55E" : "#3B82F6" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1">
                  <span style={{ color: "#92400E" }}>{t("createMeet.locals")}</span>
                  <span style={{ color: "var(--text-muted)" }}>{approvedLocals} / {maxLocals}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${lPct}%`, background: approvedLocals >= maxLocals ? "#22C55E" : "#F59E0B" }} />
                </div>
              </div>
              <div className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                {t("createMeet.total")}: {approvedForeigners + approvedLocals} / {maxForeigners + maxLocals} {t("ngoDetail.approved")}
              </div>
            </div>
          );
        })()}

        {/* Pending */}
        <section className="mt-6 b-card b-animate-in p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            {t("meetManage.pendingApproval")} ({pending.length})
          </h2>

          {pending.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t("meetManage.noPending")}</div>}

          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between rounded-2xl p-3" style={{ background: "var(--light-blue)" }}>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{p.display_name ?? p.user_id.slice(0, 6)}</div>
                  {p.user_type && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                      background: p.user_type === "foreigner" ? "#DBEAFE" : "#FEF3C7",
                      color: p.user_type === "foreigner" ? "#1D4ED8" : "#92400E",
                    }}>
                      {p.user_type === "foreigner" ? t("createMeet.foreigners") : t("createMeet.locals")}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={!!busy[p.user_id]}
                    onClick={() => approve(p.user_id)}
                    className="rounded-2xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    style={{ background: "var(--primary)" }}
                  >
                    {busy[p.user_id] ? "..." : t("ngoApp.approve")}
                  </button>

                  <button
                    disabled={!!busy[p.user_id]}
                    onClick={() => reject(p.user_id)}
                    className="rounded-2xl px-4 py-2 text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
                  >
                    {t("ngoApp.reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Approved */}
        <section className="mt-4 b-card b-animate-in p-5" style={{ animationDelay: "0.05s" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            {t("meetDetail.participants")} ({approved.length})
          </h2>

          {approved.length === 0 && <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t("meetDetail.noParticipants")}</div>}

          <div className="space-y-2">
            {approved.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between rounded-2xl p-3" style={{ background: "var(--light-blue)" }}>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{p.display_name ?? p.user_id.slice(0, 6)}</div>
                  {p.user_type && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                      background: p.user_type === "foreigner" ? "#DBEAFE" : "#FEF3C7",
                      color: p.user_type === "foreigner" ? "#1D4ED8" : "#92400E",
                    }}>
                      {p.user_type === "foreigner" ? t("createMeet.foreigners") : t("createMeet.locals")}
                    </span>
                  )}
                </div>
                <div className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">{t("ngoDetail.statusApproved")}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Rejected */}
        {rejected.length > 0 && (
          <section className="mt-4 b-card b-animate-in p-5 opacity-75" style={{ animationDelay: "0.1s" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              {t("meetManage.rejected")} ({rejected.length})
            </h2>

            <div className="space-y-2">
              {rejected.map((p) => (
                <div key={p.user_id} className="flex items-center justify-between rounded-2xl p-3" style={{ background: "var(--light-blue)" }}>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{p.display_name ?? p.user_id.slice(0, 6)}</div>
                    {p.user_type && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                        background: p.user_type === "foreigner" ? "#DBEAFE" : "#FEF3C7",
                        color: p.user_type === "foreigner" ? "#1D4ED8" : "#92400E",
                      }}>
                        {p.user_type === "foreigner" ? t("createMeet.foreigners") : t("createMeet.locals")}
                      </span>
                    )}
                  </div>
                  <div className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{t("meetManage.rejected")}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
