"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Msg = {
  id: string;
  conversation_id: string;
  user_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  deleted_at?: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function ChatDetailPage() {
  const params = useParams();
  const conversationId = String(params.id);

  const [me, setMe] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const userIds = useMemo(() => {
    return Array.from(new Set(messages.map((m) => m.user_id).filter(Boolean)));
  }, [messages]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErrorMsg("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          setErrorMsg("Please log in first.");
          return;
        }

        if (!alive) return;
        setMe(user.id);

        const { data, error } = await supabase
          .from("messages")
          .select("id, conversation_id, user_id, body, image_url, created_at, deleted_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!alive) return;

        setMessages(data ?? []);
      } catch (err: any) {
        console.error(err);
        if (!alive) return;
        setErrorMsg(err?.message || "Failed to load chat.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`chat-room-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Msg;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    let alive = true;

    async function loadProfiles() {
      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (error) {
        console.error(error);
        return;
      }

      if (!alive) return;

      const nextMap: Record<string, Profile> = {};
      for (const row of data ?? []) {
        nextMap[row.id] = row;
      }
      setProfiles(nextMap);
    }

    loadProfiles();

    return () => {
      alive = false;
    };
  }, [userIds]);

  async function handleSend() {
    if (!me) {
      setErrorMsg("Please log in first.");
      return;
    }

    if (!text.trim()) return;

    try {
      setSending(true);
      setErrorMsg("");

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: me,
        body: text.trim(),
        image_url: null,
      });

      if (error) throw error;

      setText("");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <Link
          href="/ngo"
          className="mb-4 inline-block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
        >
          ← Back
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xl font-bold">Chat</div>
          <div className="mt-1.5 text-xs text-gray-500">
            Conversation ID: {conversationId}
          </div>

          {!!errorMsg && (
            <div className="mt-3.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="mt-4 grid min-h-[320px] max-h-[520px] gap-2.5 overflow-y-auto p-1.5">
            {loading ? (
              <div className="text-sm text-gray-500">Loading chat...</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-gray-500">No messages yet.</div>
            ) : (
              messages.map((msg) => {
                const mine = msg.user_id === me;
                const profile = profiles[msg.user_id];
                const name = profile?.display_name?.trim() || "User";

                return (
                  <div
                    key={msg.id}
                    className={`max-w-[82%] ${mine ? "justify-self-end" : "justify-self-start"}`}
                  >
                    <div
                      className={`mb-1 text-xs text-gray-500 ${mine ? "text-right" : "text-left"}`}
                    >
                      {name}
                    </div>

                    <div
                      className={`rounded-xl px-3.5 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        mine
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {msg.body || ""}
                    </div>

                    <div
                      className={`mt-1 text-[11px] text-gray-500 ${mine ? "text-right" : "text-left"}`}
                    >
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center gap-2.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a message..."
              className="flex-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
