"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home, Send, ShieldBan, ShieldCheck, Users, LogOut, ImagePlus, X } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/lib/supabaseClient";

import { leaveGroup } from "@/lib/groupChatService";

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
    isGroup,
    groupName,
    groupMembers,
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
  const [showMembers, setShowMembers] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Group member name map
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of groupMembers) {
      map.set(m.user_id, m.display_name ?? "User");
    }
    return map;
  }, [groupMembers]);

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

  const handleSend = async () => {
    const v = text.trim();
    if ((!v && !imageFile) || !me || sending || blockedEither) return;
    setSending(true);
    try {
      if (imageFile) {
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
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-[#F0F7FF]/90 backdrop-blur">
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
                  {isGroup ? (groupName ?? "Group Chat") : (other?.display_name ?? "User")}
                </div>
                <div className="text-xs text-gray-500">
                  {blockedEither
                    ? "Conversation unavailable"
                    : isGroup
                    ? `${groupMembers.length} members`
                    : "Direct message"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isGroup ? (
                <>
                  <button
                    onClick={() => setShowMembers((prev) => !prev)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
                    title="Members"
                  >
                    <Users className="h-4 w-4" />
                    {groupMembers.length}
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm("Leave this group chat?")) return;
                      await leaveGroup(conversationId!);
                      router.push("/chats");
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
                    title="Leave group"
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
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
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

        {/* Group Members Panel */}
        {isGroup && showMembers && (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-900">
                Members ({groupMembers.length})
              </div>
              <button
                onClick={() => setShowMembers(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto">
              {groupMembers.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-400">
                        {(m.display_name ?? "U")[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {m.display_name ?? "User"}
                      {m.user_id === me && (
                        <span className="ml-1 text-[10px] text-gray-400">(You)</span>
                      )}
                    </div>
                    {m.role === "admin" && (
                      <div className="text-[10px] text-gray-500">Admin</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <section className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex-1 overflow-auto px-4 py-4">
            {blockedEither ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-[#F0F7FF] px-6 py-12 text-center">
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
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-[#F0F7FF] px-6 py-12 text-center">
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
                        {isGroup && !isMine && (
                          <div className="mb-1 text-[11px] font-medium text-gray-500">
                            {memberNameMap.get(m.user_id) ?? "User"}
                          </div>
                        )}
                        <div
                          className={
                            isMine
                              ? "rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-sm text-white"
                              : "rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-900"
                          }
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
                        <div
                          className={
                            isMine
                              ? "mt-1 flex items-center justify-end gap-2 text-[11px] text-gray-400"
                              : "mt-1 flex items-center gap-2 text-[11px] text-gray-400"
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
            {/* Image preview */}
            {imagePreview && (
              <div className="mb-2 relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-32 rounded-xl border border-gray-200"
                />
                <button
                  onClick={clearImage}
                  className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:opacity-80"
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
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Attach image"
              >
                <ImagePlus className="h-5 w-5" />
              </button>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[44px] max-h-32 flex-1 resize-none rounded-2xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
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
                    await handleSend();
                  }
                }}
              />

              <button
                onClick={handleSend}
                disabled={!me || sending || blockedEither || (!text.trim() && !imageFile)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-blue-600/70 p-4"
          onClick={() => setFullImage(null)}
        >
          <button
            onClick={() => setFullImage(null)}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/50 text-white hover:bg-blue-600/70"
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