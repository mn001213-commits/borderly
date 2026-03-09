"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  AlertCircle,
  MapPin,
  Clock,
  HelpCircle,
  MessageCircle,
  CheckCircle,
  Send,
} from "lucide-react";

type Urgency = "low" | "medium" | "high" | "urgent";

type HelpRequest = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  urgency: Urgency;
  city: string | null;
  status: string;
  created_at: string;
};

type Comment = {
  id: string;
  help_request_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
};

const CAT_LABEL: Record<string, string> = {
  housing: "Housing",
  legal: "Legal",
  medical: "Medical",
  translation: "Translation",
  daily: "Daily Life",
  employment: "Employment",
  other: "Other",
};

const URGENCY_COLOR: Record<Urgency, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function HelpRequestDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const requestId = params?.id;

  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myId, setMyId] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  const [chatLoading, setChatLoading] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);

  const [resolving, setResolving] = useState(false);

  const loadComments = useCallback(async (rid: string) => {
    const { data, error } = await supabase
      .from("help_request_comments")
      .select("id, help_request_id, user_id, content, created_at")
      .eq("help_request_id", rid)
      .order("created_at", { ascending: true });

    if (error || !data) {
      setComments([]);
      return;
    }

    // Fetch author names
    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    let profileMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p.display_name ?? "Anonymous";
        }
      }
    }

    const enriched: Comment[] = data.map((c: any) => ({
      ...c,
      author_name: profileMap[c.user_id] ?? "Anonymous",
    }));

    setComments(enriched);
  }, []);

  useEffect(() => {
    if (!requestId) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      setMyId(auth.user?.id ?? null);

      const { data, error } = await supabase
        .from("help_requests")
        .select("id, user_id, title, description, category, urgency, city, status, created_at")
        .eq("id", requestId)
        .single();

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setRequest(data as HelpRequest);

      // Fetch author name
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", (data as HelpRequest).user_id)
        .maybeSingle();

      setAuthorName(profile?.display_name ?? "Anonymous");

      await loadComments(requestId);
      setLoading(false);
    };

    load();
  }, [requestId, loadComments]);

  const startChatWithAuthor = async () => {
    setChatErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;

    if (!uid) {
      router.push("/login");
      return;
    }
    if (!request?.user_id) {
      setChatErr("Could not load author information.");
      return;
    }
    if (uid === request.user_id) {
      setChatErr("You cannot message yourself.");
      return;
    }

    setChatLoading(true);

    const otherId = request.user_id;
    const user_low = uid < otherId ? uid : otherId;
    const user_high = uid < otherId ? otherId : uid;

    const { data: dcRow, error: dcErr } = await supabase
      .from("direct_conversations")
      .upsert({ user_low, user_high }, { onConflict: "user_low,user_high" })
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
    router.push(`/chats/${conversationId}`);
  };

  const markResolved = async () => {
    if (!requestId || resolving) return;

    setResolving(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from("help_requests")
      .update({ status: "resolved" })
      .eq("id", requestId)
      .eq("user_id", myId);

    if (error) {
      setErrorMsg(error.message);
      setResolving(false);
      return;
    }

    setRequest((prev) => (prev ? { ...prev, status: "resolved" } : prev));
    setResolving(false);
  };

  const getMyDisplayName = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    if (error) return null;
    return (data?.display_name as string | null) ?? null;
  };

  const addComment = async () => {
    if (!requestId || savingComment) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const content = commentBody.trim();
    if (!content) return;

    setSavingComment(true);
    setErrorMsg(null);

    const { error } = await supabase.from("help_request_comments").insert({
      help_request_id: requestId,
      user_id: user.id,
      content,
    });

    if (error) {
      setErrorMsg(error.message);
      setSavingComment(false);
      return;
    }

    setCommentBody("");
    await loadComments(requestId);
    setSavingComment(false);
  };

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
  const isAuthor = myId && request && myId === request.user_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-[820px] px-4 pb-20 pt-4">
          <div className={cx(card, "p-5 text-sm text-gray-500")}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-[820px] px-4 pb-20 pt-4">
          <Link
            href="/help"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>
          <div className={cx("mt-4 p-5 text-sm text-gray-600", card)}>
            {errorMsg ?? "Help request not found"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-[820px] px-4 pb-24 pt-4">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-[#F0F7FF]/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <Link
              href="/help"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </Link>

            <div className="flex items-center gap-2">
              {!isAuthor && myId && (
                <button
                  type="button"
                  onClick={startChatWithAuthor}
                  disabled={chatLoading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <MessageCircle className="h-4 w-4" />
                  {chatLoading ? "Opening chat..." : "Offer Help"}
                </button>
              )}

              {!myId && (
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Log in to help
                </Link>
              )}

              {isAuthor && request.status === "open" && (
                <button
                  type="button"
                  onClick={markResolved}
                  disabled={resolving}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckCircle className="h-4 w-4" />
                  {resolving ? "Resolving..." : "Mark Resolved"}
                </button>
              )}
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {chatErr && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {chatErr}
          </div>
        )}

        {/* Request Detail */}
        <section className={cx(card, "mt-4 p-5")}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold leading-7 text-gray-900 sm:text-xl">
                {request.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-800">{authorName ?? "Anonymous"}</span>
                <span>·</span>
                <Clock className="h-3.5 w-3.5" />
                <span>{formatRelative(request.created_at)}</span>
                {request.city ? (
                  <>
                    <span>·</span>
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{request.city}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                  URGENCY_COLOR[request.urgency]
                )}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                {URGENCY_LABEL[request.urgency]}
              </span>

              <span className="inline-flex h-7 items-center rounded-full bg-gray-100 px-3 text-xs font-medium text-gray-600">
                {CAT_LABEL[request.category] ?? request.category}
              </span>

              {request.status !== "open" && (
                <span
                  className={cx(
                    "inline-flex h-7 items-center rounded-full px-3 text-xs font-medium",
                    request.status === "resolved"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {request.status === "resolved" ? "Resolved" : "Closed"}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {request.description}
          </div>
        </section>

        {/* Comments */}
        <section className={cx(card, "mt-4 p-5")}>
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-gray-900">Comments</div>
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-900">{comments.length}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-[#F0F7FF] px-6 py-10 text-center">
                <MessageCircle className="mb-3 h-10 w-10 text-gray-300" />
                <div className="text-sm font-semibold text-gray-800">No comments yet</div>
                <div className="mt-1 text-sm text-gray-500">
                  Be the first to offer advice or help.
                </div>
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-800">
                      {c.author_name ?? "Anonymous"}
                    </span>
                    {myId === c.user_id && (
                      <span className="inline-flex h-6 items-center rounded-full bg-blue-600 px-2 text-[10px] font-medium text-white">
                        You
                      </span>
                    )}
                    <span>·</span>
                    <span>{formatRelative(c.created_at)}</span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {c.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add comment */}
          <div className="mt-5 rounded-2xl border border-gray-100 bg-[#F0F7FF] p-4">
            <div className="mb-2 text-sm font-medium text-gray-800">Write a comment</div>

            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  addComment();
                }
              }}
              placeholder="Share advice, resources, or offer to help..."
              disabled={savingComment}
              className="min-h-[100px] w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={addComment}
                disabled={savingComment || !commentBody.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {savingComment ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
