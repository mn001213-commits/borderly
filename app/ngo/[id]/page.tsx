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

  const bg = "#E0F2FE";
  const card = "rgba(255,255,255,0.94)";
  const line = "rgba(0,0,0,0.12)";
  const textColor = "#111827";
  const sub = "rgba(17,24,39,0.72)";

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
    <div style={{ minHeight: "100vh", background: bg, color: textColor }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px 90px" }}>
        <Link
          href="/ngo"
          style={{
            display: "inline-block",
            marginBottom: 16,
            color: "#2563EB",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back
        </Link>

        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${line}`,
            background: card,
            padding: 16,
            boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900 }}>Chat</div>
          <div style={{ marginTop: 6, fontSize: 13, color: sub }}>
            Conversation ID: {conversationId}
          </div>

          {!!errorMsg && (
            <div
              style={{
                marginTop: 14,
                borderRadius: 12,
                padding: "12px 14px",
                background: "#FEE2E2",
                color: "#991B1B",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {errorMsg}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              minHeight: 320,
              maxHeight: 520,
              overflowY: "auto",
              display: "grid",
              gap: 10,
              padding: "6px 2px",
            }}
          >
            {loading ? (
              <div style={{ color: sub, fontSize: 14 }}>Loading chat...</div>
            ) : messages.length === 0 ? (
              <div style={{ color: sub, fontSize: 14 }}>No messages yet.</div>
            ) : (
              messages.map((msg) => {
                const mine = msg.user_id === me;
                const profile = profiles[msg.user_id];
                const name = profile?.display_name?.trim() || "User";

                return (
                  <div
                    key={msg.id}
                    style={{
                      justifySelf: mine ? "end" : "start",
                      maxWidth: "82%",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: sub,
                        marginBottom: 4,
                        textAlign: mine ? "right" : "left",
                      }}
                    >
                      {name}
                    </div>

                    <div
                      style={{
                        borderRadius: 14,
                        padding: "12px 14px",
                        background: mine ? "#2563EB" : "#F3F4F6",
                        color: mine ? "#FFFFFF" : textColor,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                        fontSize: 14,
                      }}
                    >
                      {msg.body || ""}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: sub,
                        textAlign: mine ? "right" : "left",
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
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
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                border: `1px solid ${line}`,
                padding: "0 14px",
                fontSize: 14,
                outline: "none",
                background: "#FFFFFF",
                color: textColor,
              }}
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              style={{
                height: 46,
                padding: "0 16px",
                borderRadius: 12,
                border: "none",
                background: sending ? "#93C5FD" : "#2563EB",
                color: "#FFFFFF",
                fontWeight: 900,
                fontSize: 14,
                cursor: sending ? "default" : "pointer",
              }}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}