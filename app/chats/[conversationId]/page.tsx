"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home, Send, ShieldBan, ShieldCheck } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/lib/supabaseClient";

function formatMessageTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ChatRoomPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const conversationId = params?.conversationId;

  useEffect(() => {
    supabase.auth.getSession().then((res) => {
      console.log("🔥 CURRENT UID:", res.data.session?.user?.id);
    });
  }, []);

  const {
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
  } = useChat(conversationId);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-gray-50/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/chats")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="text-base font-semibold tracking-tight">
                  {other?.display_name ?? "User"}
                </div>
                <div className="text-xs text-gray-500">
                  {blockedEither ? "Conversation unavailable" : "Direct message"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {me && otherId ? (
                <button
                  onClick={async () => {
                    if (iBlocked) await unblock();
                    else await block();
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  title={iBlocked ? "Unblock user" : "Block user"}
                >
                  {iBlocked ? (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Unblock
                    </>
                  ) : (
                    <>
                      <ShieldBan className="h-4 w-4" />
                      Block
                    </>
                  )}
                </button>
              ) : null}

              <Link
                href="/"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Home"
              >
                <Home className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex-1 overflow-auto px-4 py-4">
            {blockedEither ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                <ShieldBan className="mb-3 h-10 w-10 text-gray-300" />
                <div className="text-sm font-semibold text-gray-800">This conversation is blocked</div>
                <div className="mt-1 text-sm text-gray-500">
                  Unblock to send messages again.
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={i % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
                    <div
                      className={
                        i % 2 === 0
                          ? "h-10 w-40 animate-pulse rounded-2xl rounded-bl-md bg-gray-100"
                          : "h-10 w-32 animate-pulse rounded-2xl rounded-br-md bg-gray-200"
                      }
                    />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                <Send className="mb-3 h-10 w-10 text-gray-300" />
                <div className="text-sm font-semibold text-gray-800">No messages yet</div>
                <div className="mt-1 text-sm text-gray-500">
                  Start the conversation by sending a message.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const isMine = m.user_id === me;

                  return (
                    <div key={m.id} className={isMine ? "flex justify-end" : "flex justify-start"}>
                      <div className="max-w-[80%]">
                        <div
                          className={
                            isMine
                              ? "rounded-2xl rounded-br-md bg-black px-4 py-2.5 text-sm text-white"
                              : "rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-900"
                          }
                        >
                          {m.body}
                        </div>
                        <div
                          className={
                            isMine
                              ? "mt-1 text-right text-[11px] text-gray-400"
                              : "mt-1 text-left text-[11px] text-gray-400"
                          }
                        >
                          {formatMessageTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-100 bg-white px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[44px] max-h-32 flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
                placeholder={
                  !me
                    ? "Sign in to chat"
                    : blockedEither
                    ? "You cannot send messages in a blocked conversation"
                    : "Type a message..."
                }
                disabled={!me || blockedEither}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const v = text.trim();
                    if (!v || !me || sending || blockedEither) return;
                    setSending(true);
                    try {
                      await sendText(v);
                      setText("");
                    } finally {
                      setSending(false);
                    }
                  }
                }}
              />

              <button
                onClick={async () => {
                  const v = text.trim();
                  if (!v || !me || sending || blockedEither) return;
                  setSending(true);
                  try {
                    await sendText(v);
                    setText("");
                  } finally {
                    setSending(false);
                  }
                }}
                disabled={!me || sending || blockedEither || !text.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}