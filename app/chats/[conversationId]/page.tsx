"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home, Send, ShieldBan, ShieldCheck, Users, LogOut, ImagePlus, X, SmilePlus } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/lib/supabaseClient";

const QUICK_EMOJIS = ["\u{1F44D}", "\u2764\uFE0F", "\u{1F602}", "\u{1F62E}", "\u{1F622}", "\u{1F64F}"];

type Reaction = { id: string; emoji: string; user_id: string; message_id: string };

import { leaveGroup } from "@/lib/groupChatService";
import { useT } from "@/app/components/LangProvider";

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
  const { t } = useT();
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
  } = useChat(conversationId);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [pickerMessageId, setPickerMessageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastTypingSentRef = useRef(0);

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2000) return;
    lastTypingSentRef.current = now;
    sendTyping();
  }, [sendTyping]);

  // Group member name map
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of groupMembers) {
      map.set(m.user_id, m.display_name ?? t("chat.user"));
    }
    return map;
  }, [groupMembers, t]);

  // Load reactions for visible messages
  useEffect(() => {
    if (messages.length === 0) return;
    const msgIds = messages.map((m) => m.id);
    supabase
      .from("message_reactions")
      .select("id, message_id, user_id, emoji")
      .in("message_id", msgIds)
      .then(({ data }) => {
        if (!data) return;
        const grouped: Record<string, Reaction[]> = {};
        for (const r of data as Reaction[]) {
          if (!grouped[r.message_id]) grouped[r.message_id] = [];
          grouped[r.message_id].push(r);
        }
        setReactions(grouped);
      });
  }, [messages]);

  // Realtime subscription for reactions
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`reactions:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.new as Reaction;
          setReactions((prev) => ({
            ...prev,
            [r.message_id]: [...(prev[r.message_id] ?? []), r],
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const old = payload.old as { id: string; message_id: string };
          setReactions((prev) => {
            const list = (prev[old.message_id] ?? []).filter((x) => x.id !== old.id);
            const next = { ...prev };
            if (list.length === 0) delete next[old.message_id];
            else next[old.message_id] = list;
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!me) return;
      const existing = (reactions[messageId] ?? []).find(
        (r) => r.user_id === me && r.emoji === emoji
      );
      if (existing) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        await supabase
          .from("message_reactions")
          .insert({ message_id: messageId, user_id: me, emoji });
      }
      setPickerMessageId(null);
    },
    [me, reactions]
  );

  // Mark messages as read when messages load or new messages arrive
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  useEffect(() => {
    if (lastMessageId && me) {
      markAsRead(lastMessageId);
    }
  }, [lastMessageId, me, markAsRead]);

  // For DMs: find the last message ID that the other person has read
  const otherLastReadId = useMemo(() => {
    if (isGroup || !otherId || !readReceipts[otherId]) return null;
    return readReceipts[otherId].last_read_message_id;
  }, [isGroup, otherId, readReceipts]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const MAX_IMAGE_MB = 5;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  const handleSend = async () => {
    const v = text.trim();
    if ((!v && !imageFile) || !me || sending || blockedEither) return;
    setSending(true);
    try {
      if (imageFile) {
        // File type validation
        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
          alert(t("chat.invalidFileType") || "Only JPG, PNG, GIF, WebP allowed");
          return;
        }
        // File size validation
        if (imageFile.size > MAX_IMAGE_MB * 1024 * 1024) {
          alert(t("chat.fileTooLarge") || `Max file size: ${MAX_IMAGE_MB}MB`);
          return;
        }
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `chat/${conversationId}/${me}_${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(path, imageFile);
        if (uploadErr) {
          console.error("Image upload error:", uploadErr);
          return;
        }
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(path);
        const publicUrl = urlData.publicUrl;

        await supabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: me,
          body: v || null,
          image_url: publicUrl,
        });
        clearImage();
      } else {
        await sendText(v);
      }
      setText("");
    } finally {
      setSending(false);
    }
  };

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 backdrop-blur" style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--bg-snow)" }}>
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/chats")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--light-blue)]"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div>
                <div className="text-base font-semibold tracking-tight">
                  {isGroup ? (groupName ?? t("chatGroup.groupChat")) : (other?.display_name ?? t("chat.user"))}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {blockedEither
                    ? t("chat.conversationUnavailable")
                    : isGroup
                    ? `${groupMembers.length} ${t("chat.members")}`
                    : t("chat.directMessage")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isGroup ? (
                <>
                  <button
                    onClick={() => setShowMembers((prev) => !prev)}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition hover:bg-[var(--light-blue)]"
                    style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                    title={t("chat.members")}
                  >
                    <Users className="h-4 w-4" />
                    {groupMembers.length}
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm(t("chatGroup.leaveConfirm"))) return;
                      await leaveGroup(conversationId!);
                      router.push("/chats");
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition hover:bg-[var(--light-blue)]"
                    style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                    title={t("chatGroup.leaveGroup")}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              ) : me && otherId ? (
                <button
                  onClick={async () => {
                    if (iBlocked) await unblock();
                    else await block();
                  }}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition hover:bg-[var(--light-blue)]"
                  style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                  title={iBlocked ? t("chat.unblockUser") : t("chat.blockUser")}
                >
                  {iBlocked ? (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      {t("chat.unblock")}
                    </>
                  ) : (
                    <>
                      <ShieldBan className="h-4 w-4" />
                      {t("chat.block")}
                    </>
                  )}
                </button>
              ) : null}

              <Link
                href="/"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[var(--light-blue)]"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Home"
              >
                <Home className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Group Members Panel */}
        {isGroup && showMembers && (
          <div className="b-card mt-4 p-4 b-animate-in">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                {t("chat.members")} ({groupMembers.length})
              </div>
              <button
                onClick={() => setShowMembers(false)}
                className="text-xs hover:opacity-80"
                style={{ color: "var(--text-muted)" }}
              >
                {t("chat.close")}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto">
              {groupMembers.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center" style={{ border: "1px solid var(--border-soft)", background: "var(--light-blue)" }}>
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {(m.display_name ?? "U")[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" style={{ color: "var(--deep-navy)" }}>
                      {m.display_name ?? t("chat.user")}
                      {m.user_id === me && (
                        <span className="ml-1 text-[10px]" style={{ color: "var(--text-muted)" }}>({t("chat.you")})</span>
                      )}
                    </div>
                    {m.role === "admin" && (
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t("chat.admin")}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <section className="b-card mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto px-4 py-4">
            {blockedEither ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center" style={{ borderColor: "var(--border-soft)", background: "var(--light-blue)" }}>
                <ShieldBan className="mb-3 h-10 w-10" style={{ color: "var(--text-muted)" }} />
                <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("chat.conversationBlocked")}</div>
                <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("chat.unblockToSend")}
                </div>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={i % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
                    <div
                      className={
                        i % 2 === 0
                          ? "h-10 w-40 b-skeleton rounded-2xl rounded-bl-md"
                          : "h-10 w-32 b-skeleton rounded-2xl rounded-br-md"
                      }
                    />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center" style={{ borderColor: "var(--border-soft)", background: "var(--light-blue)" }}>
                <Send className="mb-3 h-10 w-10" style={{ color: "var(--text-muted)" }} />
                <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("chat.noMessagesYet")}</div>
                <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {t("chat.startByMessage")}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const isMine = m.user_id === me;

                  return (
                    <div key={m.id} className={isMine ? "flex justify-end" : "flex justify-start"}>
                      <div className="max-w-[80%]">
                        {isGroup && !isMine && (
                          <div className="mb-1 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                            {memberNameMap.get(m.user_id) ?? t("chat.user")}
                          </div>
                        )}
                        <div className="group relative">
                          <div
                            className={
                              isMine
                                ? "rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white"
                                : "rounded-2xl rounded-bl-md px-4 py-2.5 text-sm"
                            }
                            style={isMine ? { background: "var(--primary)" } : { background: "var(--light-blue)", color: "var(--deep-navy)" }}
                          >
                            {m.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={m.image_url}
                                alt="Shared image"
                                className="max-h-60 rounded-xl cursor-pointer mb-1"
                                onClick={() => setFullImage(m.image_url)}
                              />
                            )}
                            {m.body}
                          </div>

                          {/* Reaction trigger button */}
                          <button
                            onClick={() =>
                              setPickerMessageId((prev) => (prev === m.id ? null : m.id))
                            }
                            className={`absolute ${isMine ? "-left-8" : "-right-8"} top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full shadow-sm hover:opacity-80 transition ${pickerMessageId === m.id ? "flex" : "hidden group-hover:flex"}`}
                            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-muted)" }}
                            aria-label="Add reaction"
                          >
                            <SmilePlus className="h-3.5 w-3.5" />
                          </button>

                          {/* Emoji picker popover */}
                          {pickerMessageId === m.id && (
                            <div
                              className={`absolute ${isMine ? "right-0" : "left-0"} top-full z-20 mt-1 flex gap-1 rounded-2xl px-2 py-1.5 shadow-lg`}
                              style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)" }}
                            >
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(m.id, emoji)}
                                  className="h-8 w-8 rounded-lg text-lg transition hover:bg-[var(--light-blue)] flex items-center justify-center"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reaction pills */}
                        {reactions[m.id] && reactions[m.id].length > 0 && (
                          <div className={`mt-1 flex flex-wrap gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                            {Object.entries(
                              reactions[m.id].reduce<Record<string, string[]>>((acc, r) => {
                                if (!acc[r.emoji]) acc[r.emoji] = [];
                                acc[r.emoji].push(r.user_id);
                                return acc;
                              }, {})
                            ).map(([emoji, userIds]) => {
                              const myReaction = me ? userIds.includes(me) : false;
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(m.id, emoji)}
                                  className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition"
                                  style={myReaction
                                    ? { borderColor: "var(--primary)", background: "var(--light-blue)", color: "var(--primary)" }
                                    : { borderColor: "var(--border-soft)", background: "var(--bg-snow)", color: "var(--text-secondary)" }
                                  }
                                >
                                  <span>{emoji}</span>
                                  <span>{userIds.length}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div
                          className={
                            isMine
                              ? "mt-1 flex items-center justify-end gap-2 text-[11px]"
                              : "mt-1 flex items-center gap-2 text-[11px]"
                          }
                          style={{ color: "var(--text-muted)" }}
                        >
                          {formatMessageTime(m.created_at)}
                        </div>
                        {isMine && !isGroup && otherLastReadId === m.id && (
                          <div className="mt-0.5 text-right text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {t("chat.read")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {typingUsers.size > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="inline-flex gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full" style={{ background: "var(--text-muted)", animationDelay: "0ms" }} />
                <span className="h-1 w-1 animate-bounce rounded-full" style={{ background: "var(--text-muted)", animationDelay: "150ms" }} />
                <span className="h-1 w-1 animate-bounce rounded-full" style={{ background: "var(--text-muted)", animationDelay: "300ms" }} />
              </span>
              {t("chat.typing")}
            </div>
          )}

          <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-soft)", background: "var(--bg-card)" }}>
            {/* Image preview */}
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-xl" style={{ border: "1px solid var(--border-soft)" }}
                />
                <button
                  onClick={clearImage}
                  className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-white shadow hover:opacity-80"
                  style={{ background: "var(--primary)" }}
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!me || blockedEither}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--light-blue)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Attach image"
              >
                <ImagePlus className="h-5 w-5" />
              </button>

              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); handleTyping(); }}
                className="min-h-[44px] max-h-32 flex-1 resize-none rounded-2xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                placeholder={
                  !me
                    ? t("chat.signInToChat")
                    : blockedEither
                    ? t("chat.blockedCannotSend")
                    : t("chat.typeMessage")
                }
                disabled={!me || blockedEither}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    await handleSend();
                  }
                }}
              />

              <button
                onClick={handleSend}
                disabled={!me || sending || blockedEither || (!text.trim() && !imageFile)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "var(--primary)" }}
                aria-label="Send message"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Full-size image overlay */}
      {fullImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(30, 42, 56, 0.7)" }}
          onClick={() => setFullImage(null)}
        >
          <button
            onClick={() => setFullImage(null)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full text-white hover:opacity-80"
            style={{ background: "rgba(30, 42, 56, 0.5)" }}
            aria-label="Close image"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullImage}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}