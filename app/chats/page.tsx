"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notificationService";
import NgoVerifiedBadge from "@/app/components/NgoVerifiedBadge";
import { Bell, MessageCircle, User, Users, Plus, ShieldCheck } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import { formatRelative } from "@/lib/format";

type ChatRow = {
  conversation_id: string;
  me_id: string;
  other_id: string | null;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message_content: string | null;
  last_message_image_url: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  is_pinned: boolean | null;
};

type GroupRow = {
  conversation_id: string;
  name: string | null;
  avatar_url: string | null;
  member_count: number;
  last_message_content: string | null;
  last_message_at: string | null;
  type: string;
};

export default function ChatsPage() {
  const { t } = useT();
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [groupRows, setGroupRows] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "dm" | "group" | "ngo">("all");

  const prevMessageIds = useRef<Set<string>>(new Set());

  const loadMeAndList = async () => {
    setLoading(true);
    setErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setMe(uid);

    if (!uid) { setRows([]); setLoading(false); return; }

    const { data: list, error } = await supabase
      .from("v_chat_list")
      .select("*")
      .eq("me_id", uid)
      .order("last_message_at", { ascending: false });

    if (error) { setErr(error.message); setRows([]); setLoading(false); return; }
    setRows((list as ChatRow[]) ?? []);

    // Load group + ngo conversations
    const { data: myMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", uid);

    if (myMemberships && myMemberships.length > 0) {
      const convIds = myMemberships.map((m: any) => m.conversation_id);

      const { data: convs } = await supabase
        .from("conversations")
        .select("id, name, avatar_url, type")
        .in("type", ["group", "ngo"])
        .in("id", convIds);

      if (convs && convs.length > 0) {
        const groupConvIds = convs.map((gc: any) => gc.id);

        // Batch: get member counts for all groups at once
        const { data: allMembers } = await supabase
          .from("conversation_members")
          .select("conversation_id")
          .in("conversation_id", groupConvIds);

        const memberCountMap: Record<string, number> = {};
        for (const m of allMembers ?? []) {
          memberCountMap[m.conversation_id] = (memberCountMap[m.conversation_id] ?? 0) + 1;
        }

        // Batch: get last message for each group using a single query
        // We get recent messages and pick the latest per conversation client-side
        const { data: recentMsgs } = await supabase
          .from("messages")
          .select("conversation_id, body, created_at")
          .in("conversation_id", groupConvIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(groupConvIds.length * 2);

        const lastMsgMap: Record<string, { body: string | null; created_at: string }> = {};
        for (const msg of recentMsgs ?? []) {
          if (!lastMsgMap[msg.conversation_id]) {
            lastMsgMap[msg.conversation_id] = { body: msg.body, created_at: msg.created_at };
          }
        }

        const groups: GroupRow[] = convs.map((gc: any) => ({
          conversation_id: gc.id,
          name: gc.name ?? null,
          avatar_url: gc.avatar_url ?? null,
          member_count: memberCountMap[gc.id] ?? 0,
          last_message_content: lastMsgMap[gc.id]?.body ?? null,
          last_message_at: lastMsgMap[gc.id]?.created_at ?? null,
          type: gc.type,
        }));

        groups.sort((a, b) => {
          const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return tb - ta;
        });

        setGroupRows(groups);
      }
    }

    setLoading(false);
  };

  useEffect(() => { loadMeAndList(); }, []);

  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      ch = supabase
        .channel(`chat_notifications:${me}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
          const msg = payload.new as any;
          if (!msg || prevMessageIds.current.has(msg.id) || msg.user_id === me) return;
          prevMessageIds.current.add(msg.id);
          try {
            await createNotification({ userId: me, type: "dm", title: "New message", body: msg.body ?? "You received a new message", link: `/chats/${msg.conversation_id}`, meta: { conversation_id: msg.conversation_id } });
          } catch {}

          // Update only the affected DM row instead of full reload
          setRows((prev) => {
            const idx = prev.findIndex((r) => r.conversation_id === msg.conversation_id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                last_message_content: msg.body ?? null,
                last_message_image_url: msg.image_url ?? null,
                last_message_at: msg.created_at,
                unread_count: (updated[idx].unread_count ?? 0) + 1,
              };
              updated.sort((a, b) => {
                const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                return tb - ta;
              });
              return updated;
            }
            return prev;
          });

          // Update group rows too
          setGroupRows((prev) => {
            const idx = prev.findIndex((g) => g.conversation_id === msg.conversation_id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                last_message_content: msg.body ?? null,
                last_message_at: msg.created_at,
              };
              updated.sort((a, b) => {
                const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                return tb - ta;
              });
              return updated;
            }
            return prev;
          });
        })
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      if (ch) supabase.removeChannel(ch);
    };
  }, [me]);

  const ngoGroups = groupRows.filter((g) => g.type === "ngo");
  const normalGroups = groupRows.filter((g) => g.type === "group");

  const tabs = [
    { key: "all" as const, label: t("common.all") },
    { key: "dm" as const, label: t("chat.direct") },
    { key: "group" as const, label: t("chat.groups"), count: normalGroups.length },
    { key: "ngo" as const, label: t("nav.ngo"), count: ngoGroups.length },
  ];

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6">
        <header className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-xl font-bold">{t("nav.messages")}</h1>
          <Link
            href="/chats/new"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white no-underline hover:opacity-90"
            style={{ background: "var(--primary)" }}
            aria-label="New chat"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </header>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className="b-pill shrink-0"
              style={{
                height: 36,
                padding: "0 14px",
                fontSize: 13,
                background: tab === tb.key ? "var(--primary)" : "transparent",
                color: tab === tb.key ? "#fff" : "var(--text-secondary)",
                border: tab === tb.key ? "none" : "1px solid var(--border-soft)",
              }}
            >
              {tb.label}
              {tb.count != null && tb.count > 0 && (
                <span className="ml-1 text-[10px] opacity-70">{tb.count}</span>
              )}
            </button>
          ))}
        </div>

        <div>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="b-skeleton h-48" />
              ))}
            </div>
          ) : err ? (
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>{err}</div>
          ) : rows.length === 0 && groupRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center b-animate-in" style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}>
              <MessageCircle className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold">{t("chat.noConversations")}</div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("chat.startConversation")}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* NGO Chats — green cards */}
              {(tab === "all" || tab === "ngo") &&
                ngoGroups.map((g, idx) => (
                  <Link key={g.conversation_id} href={`/chats/${g.conversation_id}`} className="block no-underline text-inherit">
                    <article
                      className="b-card b-card-hover b-animate-in p-5"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                          <ShieldCheck className="h-5 w-5" style={{ color: "var(--primary)" }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <div className="truncate text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{g.name ?? "Partner Chat"}</div>
                            <NgoVerifiedBadge verified size={12} />
                          </div>
                          <div className="mt-0.5 truncate text-sm" style={{ color: "var(--text-muted)" }}>
                            {g.last_message_content ?? t("chat.noMessagesYet")}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{formatRelative(g.last_message_at)}</div>
                      </div>
                    </article>
                  </Link>
                ))}

              {/* Group Chats */}
              {(tab === "all" || tab === "group") &&
                normalGroups.map((g, idx) => (
                  <Link key={g.conversation_id} href={`/chats/${g.conversation_id}`} className="block no-underline text-inherit">
                    <article className="b-card b-card-hover b-animate-in p-5" style={{ animationDelay: `${(ngoGroups.length + idx) * 0.05}s` }}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                          {g.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={g.avatar_url} alt={g.name ?? "Group"} className="h-full w-full object-cover" />
                          ) : (
                            <Users className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-medium">{g.name ?? t("chat.groups")}</div>
                            <span className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium" style={{ background: "var(--light-blue)", color: "var(--text-muted)" }}>{g.member_count}</span>
                          </div>
                          <div className="mt-0.5 truncate text-sm" style={{ color: "var(--text-muted)" }}>{g.last_message_content ?? t("chat.noMessagesYet")}</div>
                        </div>
                        <div className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{formatRelative(g.last_message_at)}</div>
                      </div>
                    </article>
                  </Link>
                ))}

              {/* DM Chats */}
              {(tab === "all" || tab === "dm") &&
                rows.map((r, idx) => {
                  const unread = r.unread_count ?? 0;
                  return (
                    <Link key={r.conversation_id} href={`/chats/${r.conversation_id}`} className="block no-underline text-inherit">
                      <article className="b-card b-card-hover b-animate-in p-5" style={{ animationDelay: `${(ngoGroups.length + normalGroups.length + idx) * 0.05}s` }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                            {r.other_avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.other_avatar_url} alt={r.other_display_name ?? "User"} className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium">{r.other_display_name ?? "User"}</div>
                              {unread > 0 && (
                                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: "var(--primary)" }}>{unread}</span>
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-sm" style={{ color: "var(--text-muted)" }}>
                              {r.last_message_image_url ? t("chat.image") : r.last_message_content ?? t("chat.noMessagesYet")}
                            </div>
                          </div>
                          <div className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>{formatRelative(r.last_message_at)}</div>
                        </div>
                      </article>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
