"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { createGroupConversation, searchUsers } from "@/lib/groupChatService";
import { useT } from "@/app/components/LangProvider";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type DirectConversation = {
  conversation_id: string;
  user_low: string;
  user_high: string;
};

export default function NewChatPage() {
  const router = useRouter();
  const { t } = useT();

  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [me, setMe] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Group state
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [groupSearchResults, setGroupSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auth + load users
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!uid) { router.push("/login"); return; }
      setMe(uid);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .neq("id", uid)
        .order("id", { ascending: false })
        .limit(30);

      if (error) setErrorMsg(error.message);
      setProfiles((data as Profile[] | null) ?? []);
      setLoading(false);
    })();
  }, [router]);

  // DM: filtered list
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles;
    return profiles.filter((p) => {
      const name = (p.display_name ?? "").toLowerCase();
      return name.includes(term) || p.id.slice(0, 8).toLowerCase().includes(term);
    });
  }, [profiles, q]);

  // DM: search server
  const refreshSearch = async () => {
    if (!me) return;
    setLoading(true);
    setErrorMsg(null);
    const term = q.trim();

    const query = supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .neq("id", me)
      .limit(30);

    const { data, error } = term
      ? await query.ilike("display_name", `%${term}%`)
      : await query.order("id", { ascending: false });

    if (error) setErrorMsg(error.message);
    setProfiles((data as Profile[] | null) ?? []);
    setLoading(false);
  };

  // DM: create or find conversation
  const getOrCreateConversation = async (otherId: string) => {
    if (!me) return;
    setErrorMsg(null);

    const userLow = me < otherId ? me : otherId;
    const userHigh = me < otherId ? otherId : me;

    const { data: existing, error: findErr } = await supabase
      .from("direct_conversations")
      .select("conversation_id, user_low, user_high")
      .eq("user_low", userLow)
      .eq("user_high", userHigh)
      .maybeSingle();

    if (findErr) { setErrorMsg(findErr.message); return; }

    let conversationId = (existing as DirectConversation | null)?.conversation_id ?? null;

    if (!conversationId) {
      conversationId = crypto.randomUUID();
      const { error: insErr } = await supabase.from("direct_conversations").insert({
        conversation_id: conversationId,
        user_low: userLow,
        user_high: userHigh,
      });
      if (insErr) { setErrorMsg(insErr.message); return; }
    }

    await supabase.from("conversation_members").upsert(
      [
        { conversation_id: conversationId, user_id: me, last_read_at: new Date().toISOString() },
        { conversation_id: conversationId, user_id: otherId, last_read_at: null },
      ],
      { onConflict: "conversation_id,user_id" }
    );

    router.push(`/chats/${conversationId}`);
  };

  // Group: search users
  const handleGroupSearch = async () => {
    const gq = groupSearchQuery.trim();
    if (!gq || !me) return;
    setSearching(true);
    const excludeIds = [me, ...selectedMembers.map((m) => m.id)];
    const results = await searchUsers(gq, excludeIds);
    setGroupSearchResults(results as Profile[]);
    setSearching(false);
  };

  const addMember = (user: Profile) => {
    if (selectedMembers.find((m) => m.id === user.id)) return;
    setSelectedMembers((prev) => [...prev, user]);
    setGroupSearchResults((prev) => prev.filter((r) => r.id !== user.id));
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { setErrorMsg(t("chatGroup.nameRequired")); return; }
    if (selectedMembers.length === 0) { setErrorMsg(t("chatGroup.addAtLeastOne")); return; }

    setCreating(true);
    setErrorMsg(null);

    const conversationId = await createGroupConversation(groupName.trim(), selectedMembers.map((m) => m.id));
    if (!conversationId) { setErrorMsg(t("chatGroup.createFailed")); setCreating(false); return; }
    router.push(`/chats/${conversationId}`);
  };

  if (!me) return <div className="p-6 text-sm" style={{ color: "var(--text-muted)" }}>{t("common.loading")}</div>;

  const tabs = [
    { key: "dm" as const, label: t("chat.direct"), icon: MessageCircle },
    { key: "group" as const, label: t("chat.groups"), icon: Users },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push("/chats")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ background: "var(--light-blue)" }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--deep-navy)" }} />
          </button>
          <h1 className="text-lg font-bold">{t("chat.newChat")}</h1>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => { setTab(tb.key); setErrorMsg(null); }}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition"
              style={{
                background: tab === tb.key ? "var(--deep-navy)" : "var(--bg-card)",
                color: tab === tb.key ? "#fff" : "var(--text-secondary)",
                border: tab === tb.key ? "none" : "1px solid var(--border-soft)",
              }}
            >
              <tb.icon className="h-4 w-4" />
              {tb.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
            {errorMsg}
          </div>
        )}

        {/* DM Tab */}
        {tab === "dm" && (
          <>
            {/* Search */}
            <div className="mb-4">
              <div
                className="flex items-center gap-2.5 rounded-2xl px-4 py-3"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
              >
                <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") refreshSearch(); }}
                  placeholder={t("chat.searchByName")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: "var(--deep-navy)" }}
                />
                {q && (
                  <button onClick={() => setQ("")} style={{ color: "var(--text-muted)" }}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* User list */}
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="b-skeleton h-16 rounded-2xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  {t("chat.noResults")}
                </div>
              ) : (
                filtered.map((p) => {
                  const initial = ((p.display_name ?? "?")[0] ?? "?").toUpperCase();
                  return (
                    <button
                      key={p.id}
                      onClick={() => getOrCreateConversation(p.id)}
                      className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left transition hover:shadow-sm"
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
                    >
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.avatar_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                          style={{ border: "2px solid var(--border-soft)" }}
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ background: "var(--primary)" }}
                        >
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                          {p.display_name ?? t("chat.unnamed")}
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          @{p.id.slice(0, 8)}
                        </div>
                      </div>
                      <MessageCircle className="h-5 w-5 shrink-0" style={{ color: "var(--primary)" }} />
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Group Tab */}
        {tab === "group" && (
          <div className="space-y-4">
            {/* Group Name */}
            <div className="b-card p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--deep-navy)" }}>
                {t("chatGroup.groupName")}
              </label>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t("chatGroup.enterGroupName")}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                maxLength={100}
              />
            </div>

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="b-card p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: "var(--deep-navy)" }}>
                  <Users className="h-4 w-4" />
                  {t("chatGroup.selected")} ({selectedMembers.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((m) => (
                    <div
                      key={m.id}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                      style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
                    >
                      <span className="text-sm" style={{ color: "var(--deep-navy)" }}>
                        {m.display_name ?? t("chat.user")}
                      </span>
                      <button onClick={() => removeMember(m.id)} style={{ color: "var(--text-muted)" }}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Users */}
            <div className="b-card p-4">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--deep-navy)" }}>
                {t("chatGroup.addMembers")}
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
                >
                  <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                  <input
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleGroupSearch(); }}
                    placeholder={t("chat.searchByName")}
                    className="w-full bg-transparent text-sm outline-none"
                    style={{ color: "var(--deep-navy)" }}
                  />
                </div>
                <button
                  onClick={handleGroupSearch}
                  disabled={searching || !groupSearchQuery.trim()}
                  className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium transition disabled:opacity-50"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
                >
                  {searching ? "..." : t("common.search")}
                </button>
              </div>

              {groupSearchResults.length > 0 && (
                <div className="mt-3 space-y-2 max-h-60 overflow-auto">
                  {groupSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => addMember(user)}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition"
                      style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
                    >
                      <div
                        className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center"
                        style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
                      >
                        {user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {(user.display_name ?? "U")[0]}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium" style={{ color: "var(--deep-navy)" }}>
                        {user.display_name ?? t("chat.user")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateGroup}
              disabled={creating || !groupName.trim() || selectedMembers.length === 0}
              className="w-full inline-flex h-12 items-center justify-center rounded-2xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {creating ? t("chatGroup.creating") : t("chatGroup.createGroupChat")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
