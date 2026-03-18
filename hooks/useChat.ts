"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { blockUser, getMyUserId, unblockUser } from "@/lib/blockService";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Msg = {
  id: string;
  conversation_id: string;
  user_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

function sortByCreatedAt(arr: Msg[]) {
  return arr
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );
}

export type GroupMember = {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type ReadReceipt = {
  user_id: string;
  last_read_message_id: string | null;
};

export function useChat(conversationId?: string) {
  const [me, setMe] = useState<string | null>(null);

  const [otherId, setOtherId] = useState<string | null>(null);
  const [other, setOther] = useState<Profile | null>(null);

  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  const [iBlocked, setIBlocked] = useState(false);
  const [blockedEither, setBlockedEither] = useState(false);

  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceipt>>({});

  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const receiptChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Reset on conversation change
  useEffect(() => {
    seenIdsRef.current = new Set();
    setMessages([]);
    setOtherId(null);
    setOther(null);
    setIsGroup(false);
    setGroupName(null);
    setGroupMembers([]);
    setIBlocked(false);
    setBlockedEither(false);
    setReadReceipts({});
    setTypingUsers(new Set());
    // Clear all typing timeouts
    for (const t of Object.values(typingTimeouts.current)) clearTimeout(t);
    typingTimeouts.current = {};
  }, [conversationId]);

  // Set my ID
  useEffect(() => {
    let alive = true;

    const applyMe = async () => {
      const id = await getMyUserId();
      if (!alive) return;
      setMe(id);
    };

    void applyMe();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void applyMe();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Detect conversation type + load other/group members
  useEffect(() => {
    if (!conversationId || !me) return;

    let alive = true;

    (async () => {
      // Fetch conversation info
      const { data: convInfo } = await supabase
        .from("conversations")
        .select("type, name")
        .eq("id", conversationId)
        .maybeSingle();

      if (!alive) return;

      const convType = convInfo?.type ?? "direct";

      if (convType === "group") {
        setIsGroup(true);
        setGroupName(convInfo?.name ?? null);

        // Load group members
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id, role")
          .eq("conversation_id", conversationId);

        if (!alive) return;

        const userIds = (members ?? []).map((m: any) => m.user_id);

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", userIds);

          if (!alive) return;

          const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
          for (const p of profiles ?? []) {
            profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
          }

          setGroupMembers(
            (members ?? []).map((m: any) => ({
              user_id: m.user_id,
              role: m.role ?? "member",
              display_name: profileMap.get(m.user_id)?.display_name ?? null,
              avatar_url: profileMap.get(m.user_id)?.avatar_url ?? null,
            }))
          );
        }
      } else {
        // 1:1 DM logic
        setIsGroup(false);

        // Try to find other user from conversation_members first
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId)
          .neq("user_id", me);

        if (!alive) return;

        let oid = members?.[0]?.user_id ?? null;

        // Fallback: check direct_conversations table
        if (!oid) {
          const { data: dc } = await supabase
            .from("direct_conversations")
            .select("user_low, user_high")
            .eq("conversation_id", conversationId)
            .maybeSingle();

          if (!alive) return;
          if (dc) {
            oid = dc.user_low === me ? dc.user_high : dc.user_low;
          }
        }

        // Last fallback: check messages
        if (!oid) {
          const { data: msgData } = await supabase
            .from("messages")
            .select("user_id")
            .eq("conversation_id", conversationId)
            .neq("user_id", me)
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
            .limit(1);

          if (!alive) return;
          oid = msgData?.[0]?.user_id ?? null;
        }

        setOtherId(oid);

        if (oid) {
          // Load profile for the other user
          const { data: prof } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .eq("id", oid)
            .maybeSingle();

          if (!alive) return;
          setOther(prof ? { id: prof.id, display_name: prof.display_name, avatar_url: prof.avatar_url } : { id: oid, display_name: null, avatar_url: null });
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [conversationId, me]);

  // Check block status
  useEffect(() => {
    if (!me || !otherId) {
      setIBlocked(false);
      setBlockedEither(false);
      return;
    }

    let alive = true;

    (async () => {
      // Check if I blocked
      const { data: mine } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", me)
        .eq("blocked_id", otherId)
        .maybeSingle();

      if (!alive) return;

      setIBlocked(!!mine);

      // Bidirectional check
      const { data: both, error } = await supabase.rpc("is_blocked", {
        user_a: me,
        user_b: otherId,
      });

      if (!alive) return;

      if (error) {
        setBlockedEither(!!mine);
      } else {
        setBlockedEither(!!both);
      }
    })();

    return () => {
      alive = false;
    };
  }, [me, otherId]);

  // Load messages + realtime
  useEffect(() => {
    if (!conversationId) return;

    let alive = true;

    const cleanup = async () => {
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };

    const loadInitial = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (!alive) return;

      if (!error && data) {
        data.forEach((m) => seenIdsRef.current.add(m.id));
        setMessages(data as Msg[]);
      }

      setLoading(false);
    };

    const subscribe = async () => {
      await cleanup();

      if (blockedEither) return;

      // Set auth token for realtime
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) supabase.realtime.setAuth(token);

      const ch = supabase.channel(`chat:${conversationId}`);

      ch.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          if (seenIdsRef.current.has(m.id)) return;
          seenIdsRef.current.add(m.id);
          setMessages((prev) => sortByCreatedAt([...prev, m]));
        }
      );

      ch.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => {
            if (m.deleted_at) {
              return prev.filter((x) => x.id !== m.id);
            }
            return prev.map((x) => (x.id === m.id ? m : x));
          });
        }
      );

      ch.on("broadcast", { event: "typing" }, (payload: any) => {
        const uid = payload.payload?.user_id as string | undefined;
        if (!uid || uid === me) return;
        setTypingUsers((prev) => new Set(prev).add(uid));
        if (typingTimeouts.current[uid]) clearTimeout(typingTimeouts.current[uid]);
        typingTimeouts.current[uid] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(uid);
            return next;
          });
        }, 3000);
      });

      await ch.subscribe();
      channelRef.current = ch;
    };

    const loadReadReceipts = async () => {
      if (!conversationId) return;
      const { data } = await supabase
        .from("message_read_receipts")
        .select("user_id, last_read_message_id")
        .eq("conversation_id", conversationId);
      if (!alive || !data) return;
      const map: Record<string, ReadReceipt> = {};
      for (const r of data) {
        map[r.user_id] = { user_id: r.user_id, last_read_message_id: r.last_read_message_id };
      }
      setReadReceipts(map);
    };

    const subscribeReceipts = async () => {
      if (receiptChannelRef.current) {
        await supabase.removeChannel(receiptChannelRef.current);
        receiptChannelRef.current = null;
      }
      if (!conversationId) return;

      const ch = supabase.channel(`receipts:${conversationId}`);
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_read_receipts",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const r = payload.new as any;
          if (r && r.user_id) {
            setReadReceipts((prev) => ({
              ...prev,
              [r.user_id]: { user_id: r.user_id, last_read_message_id: r.last_read_message_id },
            }));
          }
        }
      );
      await ch.subscribe();
      receiptChannelRef.current = ch;
    };

    void (async () => {
      await loadInitial();
      await loadReadReceipts();
      await subscribe();
      await subscribeReceipts();
    })();

    return () => {
      alive = false;
      void cleanup();
      if (receiptChannelRef.current) {
        void supabase.removeChannel(receiptChannelRef.current);
        receiptChannelRef.current = null;
      }
    };
  }, [conversationId, blockedEither]);

  // Send message
  const sendText = useCallback(
    async (text: string) => {
      if (!conversationId) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      const meId = await getMyUserId();
      if (!meId) return;

      if (blockedEither) return;

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: meId,
        body: trimmed,
        image_url: null,
      });
    },
    [conversationId, blockedEither]
  );

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !me) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: me },
    });
  }, [me]);

  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!conversationId || !me) return;
      await supabase.rpc("mark_messages_read", {
        p_conversation_id: conversationId,
        p_message_id: messageId,
      });
    },
    [conversationId, me]
  );

  const block = useCallback(async () => {
    if (!me || !otherId) return;
    await blockUser(me, otherId);
    setIBlocked(true);
    setBlockedEither(true);
  }, [me, otherId]);

  const unblock = useCallback(async () => {
    if (!me || !otherId) return;
    await unblockUser(me, otherId);
    setIBlocked(false);
    setBlockedEither(false);
  }, [me, otherId]);

  return useMemo(
    () => ({
      me,
      other,
      otherId,
      isGroup,
      groupName,
      groupMembers,
      messages,
      loading,
      sendText,
      sendTyping,
      markAsRead,
      readReceipts,
      typingUsers,
      iBlocked,
      blockedEither,
      block,
      unblock,
      setMessages,
    }),
    [
      me,
      other,
      otherId,
      isGroup,
      groupName,
      groupMembers,
      messages,
      loading,
      sendText,
      sendTyping,
      markAsRead,
      readReceipts,
      typingUsers,
      iBlocked,
      blockedEither,
      block,
      unblock,
    ]
  );
}