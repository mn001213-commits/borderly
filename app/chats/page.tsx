"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notificationService";
import { Bell, MessageCircle, User } from "lucide-react";

type ChatRow = {
  conversation_id: string;
  me_id: string;
  other_id: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message_content: string | null;
  last_message_image_url: string | null;
  last_message_at: string | null;
  unread_count: number | null;
  is_pinned: boolean | null;
};

type FilterMode = "all" | "unread" | "pinned";

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function formatRelative(iso: string | null) {
  if (!iso) return "";

  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";

  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  return new Date(iso).toLocaleDateString();
}

export default function ChatsPage() {
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const prevMessageIds = useRef<Set<string>>(new Set());

  const totalUnread = useMemo(() => {
    let sum = 0;
    for (const r of rows) sum += r.unread_count ?? 0;
    return sum;
  }, [rows]);

  const loadMeAndList = async () => {
    setLoading(true);
    setErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setMe(uid);

    if (!uid) {
      setRows([]);
      setLoading(false);
      return;
    }

    const { data: list, error } = await supabase
      .from("v_chat_list")
      .select("*")
      .eq("me_id", uid)
      .order("last_message_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((list as ChatRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadMeAndList();
  }, []);

  useEffect(() => {
    if (!me) return;

    const ch = supabase
      .channel("chat_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const msg = payload.new as any;
          if (!msg) return;

          if (prevMessageIds.current.has(msg.id)) return;
          prevMessageIds.current.add(msg.id);

          if (msg.user_id === me) return;

          try {
            await createNotification({
              userId: me,
              type: "dm",
              title: "New message",
              body: msg.body ?? "You received a new message",
              link: `/chats/${msg.conversation_id}`,
              meta: {
                conversation_id: msg.conversation_id,
              },
            });
          } catch (e) {
            console.error("notification error", e);
          }

          loadMeAndList();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [me]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-gray-50/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-100">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold tracking-tight">Messages</div>
                <div className="text-xs text-gray-500">
                  {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
                </div>
              </div>
            </div>

            <Link
              href="/notifications"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </Link>
          </div>
        </header>

        <div className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 animate-pulse rounded-full bg-gray-200" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
                    </div>
                    <div className="h-3 w-12 animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <MessageCircle className="mb-3 h-10 w-10 text-gray-300" />
              <div className="text-sm font-semibold text-gray-800">No conversations yet</div>
              <div className="mt-1 text-sm text-gray-500">
                Start a conversation and your chats will appear here.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => {
                const unread = r.unread_count ?? 0;

                return (
                  <Link
                    key={r.conversation_id}
                    href={`/chats/${r.conversation_id}`}
                    className="block no-underline text-inherit"
                  >
                    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-200">
                          {r.other_avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.other_avatar_url}
                              alt={r.other_display_name ?? "User"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-medium text-gray-900">
                              {r.other_display_name ?? "User"}
                            </div>

                            {unread > 0 && (
                              <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-black px-2 py-0.5 text-[11px] font-medium text-white">
                                {unread}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 truncate text-sm text-gray-500">
                            {r.last_message_image_url
                              ? "Image"
                              : r.last_message_content ?? "No messages yet"}
                          </div>
                        </div>

                        <div className="shrink-0 text-xs text-gray-400">
                          {formatRelative(r.last_message_at)}
                        </div>
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