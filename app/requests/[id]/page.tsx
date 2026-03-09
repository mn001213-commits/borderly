"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  author_id: string | null;
  purpose: string | null;
};

function PurposeBadge({ purpose }: { purpose?: string | null }) {
  if (!purpose) return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-gray-900 whitespace-nowrap">
      <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm" />
      {purpose}
    </span>
  );
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params?.id;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [me, setMe] = useState<string | null>(null);

  const [chatLoading, setChatLoading] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      setMe(auth.user?.id ?? null);

      const { data, error } = await supabase
        .from("posts")
        .select("id,created_at,title,content,author_name,author_id,purpose")
        .eq("id", postId)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setPost(data as Post);
      setLoading(false);
    };

    load();
  }, [postId]);

  // Navigate to existing conversation or create one
  const startChatWithAuthor = async () => {
    setChatErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;

    if (!uid) {
      router.push("/login");
      return;
    }
    if (!post?.author_id) {
      setChatErr("Could not load author information.");
      return;
    }
    if (uid === post.author_id) {
      setChatErr("You cannot message yourself.");
      return;
    }

    setChatLoading(true);

    const otherId = post.author_id;
    const user_low = uid < otherId ? uid : otherId;
    const user_high = uid < otherId ? otherId : uid;

    // 1) Upsert direct_conversations
    const { data: dcRow, error: dcErr } = await supabase
      .from("direct_conversations")
      .upsert(
        { user_low, user_high },
        { onConflict: "user_low,user_high" }
      )
      .select("conversation_id")
      .single();

    if (dcErr) {
      setChatLoading(false);
      setChatErr(dcErr.message);
      return;
    }

    const conversationId = (dcRow as any)?.conversation_id as string | undefined;
    if (!conversationId) {
      setChatLoading(false);
      setChatErr("Could not get conversation ID.");
      return;
    }

    // 2) Upsert conversation members
    const { error: memErr } = await supabase
      .from("conversation_members")
      .upsert(
        [
          { conversation_id: conversationId, user_id: uid, last_read_at: new Date().toISOString() },
          { conversation_id: conversationId, user_id: otherId, last_read_at: null },
        ],
        { onConflict: "conversation_id,user_id" }
      );

    if (memErr) {
      setChatLoading(false);
      setChatErr(memErr.message);
      return;
    }

    setChatLoading(false);

    // Navigate to chat
    router.push(`/chats/${conversationId}`);
  };

  if (loading) return <div className="min-h-screen bg-[#F0F7FF] p-6 text-gray-500">Loading...</div>;
  if (errorMsg) return (
    <div className="min-h-screen bg-[#F0F7FF] p-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      </div>
    </div>
  );
  if (!post) return <div className="min-h-screen bg-[#F0F7FF] p-6 text-gray-500">Post not found.</div>;

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="mb-4">
          <Link href="/" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]">
            &larr; Home
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {/* Title + purpose badge */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-xl font-bold">{post.title}</h1>
            <PurposeBadge purpose={post.purpose} />
          </div>

          <div className="text-sm text-gray-500 mb-4">
            Author: {post.author_name ?? "Unknown"}
            <br />
            Posted: {new Date(post.created_at).toLocaleString()}
          </div>

          <div className="text-base leading-relaxed whitespace-pre-wrap mb-4">
            {post.content}
          </div>

          {/* Contact section */}
          {chatErr ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-3">{chatErr}</div>
          ) : null}

          {me && me !== post.author_id ? (
            <button
              onClick={startChatWithAuthor}
              disabled={chatLoading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {chatLoading ? "Opening chat..." : "Contact Author"}
            </button>
          ) : !me ? (
            <button
              onClick={() => router.push("/login")}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Log in to contact
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
