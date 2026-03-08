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

export function useChat(conversationId?: string) {
  const [me, setMe] = useState<string | null>(null);

  const [otherId, setOtherId] = useState<string | null>(null);
  const [other, setOther] = useState<Profile | null>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  const [iBlocked, setIBlocked] = useState(false);
  const [blockedEither, setBlockedEither] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // 대화 변경 시 초기화
  useEffect(() => {
    seenIdsRef.current = new Set();
    setMessages([]);
    setOtherId(null);
    setOther(null);
    setIBlocked(false);
    setBlockedEither(false);
  }, [conversationId]);

  // 내 ID 세팅
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

  // 상대 ID 추출 (messages 기반)
  useEffect(() => {
    if (!conversationId || !me) return;

    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", me)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!alive) return;
      if (error) return;

      const oid = data?.[0]?.user_id ?? null;
      setOtherId(oid);

      if (oid) {
        setOther({
          id: oid,
          display_name: null,
          avatar_url: null,
        });
      }
    })();

    return () => {
      alive = false;
    };
  }, [conversationId, me]);

  // 차단 상태 체크
  useEffect(() => {
    if (!me || !otherId) {
      setIBlocked(false);
      setBlockedEither(false);
      return;
    }

    let alive = true;

    (async () => {
      // 내가 차단했는지
      const { data: mine } = await supabase
        .from("blocks")
        .select("id")
        .eq("blocker_id", me)
        .eq("blocked_id", otherId)
        .maybeSingle();

      if (!alive) return;

      setIBlocked(!!mine);

      // 양방향 체크 (RPC 없으면 mine 기준)
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

  // 메시지 로드 + realtime
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

      await ch.subscribe();
      channelRef.current = ch;
    };

    void (async () => {
      await loadInitial();
      await subscribe();
    })();

    return () => {
      alive = false;
      void cleanup();
    };
  }, [conversationId, blockedEither]);

  // 보내기
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
      messages,
      loading,
      sendText,
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
      messages,
      loading,
      sendText,
      iBlocked,
      blockedEither,
      block,
      unblock,
    ]
  );
}