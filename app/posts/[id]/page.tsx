"use client";

import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notificationService";
import { createReport } from "@/lib/reportService";
import NotificationBell from "@/app/components/NotificationBell";
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Heart,
  MessageCircle,
  Plus,
  Reply,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  FileText,
} from "lucide-react";

type PostRow = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  category: string;
  image_url: string | null;
  is_hidden?: boolean | null;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author_name: string | null;
  is_hidden?: boolean | null;
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

export default function PostDetailPage() {
  const router = useRouter();

  const params = useParams();
  const rawId = (params as any)?.id as string | string[] | undefined;
  const postId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<PostRow | null>(null);

  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [replyBodyById, setReplyBodyById] = useState<Record<string, string>>({});
  const [replyOpenById, setReplyOpenById] = useState<Record<string, boolean>>({});
  const [repliesHiddenById, setRepliesHiddenById] = useState<Record<string, boolean>>({});

  const [saving, setSaving] = useState(false);
  const [replySavingId, setReplySavingId] = useState<string | null>(null);
  const [liking, setLiking] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const [reportingPost, setReportingPost] = useState(false);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  const [myId, setMyId] = useState<string | null>(null);

  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const myIdRef = useRef<string | null>(null);
  const replyInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  const catBadge = useMemo(() => {
    const map: Record<string, string> = {
      general: "General",
      info: "Info",
      question: "Question",
      daily: "Daily",
      jobs: "Jobs",
      meet: "Meet",
      skill: "Skill Share",
      ngo: "NGO",
      legal: "Visa / Legal",
      etc: "Other",
    };
    return (k: string) => map[k] ?? k;
  }, []);

  const rootComments = useMemo(() => {
    return comments.filter((c) => !c.parent_id);
  }, [comments]);

  const childrenMap = useMemo(() => {
    const map: Record<string, CommentRow[]> = {};
    for (const c of comments) {
      if (!c.parent_id) continue;
      if (!map[c.parent_id]) map[c.parent_id] = [];
      map[c.parent_id].push(c);
    }
    return map;
  }, [comments]);

  const commentById = useMemo(() => {
    const map: Record<string, CommentRow> = {};
    for (const c of comments) {
      map[c.id] = c;
    }
    return map;
  }, [comments]);

  const getDescendantIds = useCallback(
    (commentId: string) => {
      const result: string[] = [];

      const walk = (id: string) => {
        const children = childrenMap[id] ?? [];
        for (const child of children) {
          result.push(child.id);
          walk(child.id);
        }
      };

      walk(commentId);
      return result;
    },
    [childrenMap]
  );

  const toggleReplyBox = useCallback((commentId: string) => {
    setReplyOpenById((prev) => {
      const willOpen = !prev[commentId];

      if (willOpen) {
        setTimeout(() => {
          const el = replyInputRefs.current[commentId];
          if (el) {
            el.focus();
            const len = el.value.length;
            el.setSelectionRange(len, len);
          }
        }, 0);
      }

      return { ...prev, [commentId]: willOpen };
    });
  }, []);

  const loadLikeState = useCallback(async (pid: string, uid: string | null) => {
    const { count } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", pid);

    setLikeCount(count ?? 0);

    if (!uid) {
      setLikedByMe(false);
      return;
    }

    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("post_id", pid)
      .eq("user_id", uid)
      .maybeSingle();

    setLikedByMe(!!data);
  }, []);

  const loadPost = useCallback(async (pid: string) => {
    const { data: p, error: pErr } = await supabase
      .from("posts")
      .select("id, user_id, created_at, title, content, author_name, category, image_url, is_hidden")
      .eq("id", pid)
      .eq("is_hidden", false)
      .maybeSingle();

    if (pErr || !p) {
      setPost(null);
      return null;
    }

    setPost(p as PostRow);
    return p as PostRow;
  }, []);

  const loadComments = useCallback(async (pid: string) => {
    const { data: cs, error: cErr } = await supabase
      .from("comments")
      .select("id, post_id, user_id, parent_id, content, created_at, author_name, is_hidden")
      .eq("post_id", pid)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    if (cErr) {
      setComments([]);
      return;
    }

    setComments((cs ?? []) as CommentRow[]);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!postId) {
        setPost(null);
        setComments([]);
        setLoading(false);
        setErrorMsg("Invalid post URL.");
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user: me },
      } = await supabase.auth.getUser();

      const meId = me?.id ?? null;
      setMyId(meId);

      const p = await loadPost(postId);

      if (!p) {
        setLoading(false);
        setErrorMsg("Post not found. It may have been deleted or hidden.");
        setTimeout(() => router.replace("/"), 600);
        return;
      }

      await loadComments(postId);
      await loadLikeState(postId, meId);

      setLoading(false);
    };

    load();
  }, [postId, loadPost, loadComments, loadLikeState, router]);

  const startedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!postId) return;
    if (startedRef.current) return;
    startedRef.current = true;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const refetchSoon = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        const p = await loadPost(postId);

        if (!p) {
          router.replace("/");
          return;
        }

        await loadComments(postId);
        await loadLikeState(postId, myIdRef.current);
      }, 200);
    };

    const startRealtime = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (token) {
        supabase.realtime.setAuth(token);
      }

      if (cancelled) return;

      channel = supabase
        .channel(`post:${postId}:realtime`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
          () => refetchSoon()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${postId}` },
          () => refetchSoon()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "posts", filter: `id=eq.${postId}` },
          () => refetchSoon()
        )
        .subscribe((status) => {
          console.log("POST Realtime status:", status);
        });
    };

    startRealtime();

    return () => {
      cancelled = true;
      startedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [postId, loadPost, loadComments, loadLikeState, router]);

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
    if (!postId || saving) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    const content = commentBody.trim();
    if (!content) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const author = await getMyDisplayName(user.id);

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        parent_id: null,
        content,
        author_name: author ?? "Anonymous",
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (post && post.user_id !== user.id) {
        try {
          await createNotification({
            userId: post.user_id,
            type: "comment",
            title: "New comment",
            body: `${author ?? "Someone"} commented: ${content}`,
            link: `/posts/${postId}`,
            meta: { post_id: postId },
          });
        } catch (notifError) {
          console.error("comment notification error:", notifError);
        }
      }

      setCommentBody("");
    } finally {
      setSaving(false);
    }
  };

  const addReply = async (parentId: string) => {
    if (!postId || replySavingId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    const content = (replyBodyById[parentId] ?? "").trim();
    if (!content) return;

    setReplySavingId(parentId);
    setErrorMsg(null);

    try {
      const author = await getMyDisplayName(user.id);

      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        parent_id: parentId,
        content,
        author_name: author ?? "Anonymous",
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (post && post.user_id !== user.id) {
        try {
          await createNotification({
            userId: post.user_id,
            type: "comment",
            title: "New reply",
            body: `${author ?? "Someone"} replied: ${content}`,
            link: `/posts/${postId}`,
            meta: {
              post_id: postId,
              parent_id: parentId,
            },
          });
        } catch (notifError) {
          console.error("reply notification error:", notifError);
        }
      }

      setReplyBodyById((prev) => ({ ...prev, [parentId]: "" }));
      setReplyOpenById((prev) => ({ ...prev, [parentId]: false }));
      setRepliesHiddenById((prev) => ({ ...prev, [parentId]: false }));
    } finally {
      setReplySavingId(null);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (deletingCommentId) return;

    const ok = confirm("Delete this comment and all its replies?");
    if (!ok) return;

    setDeletingCommentId(commentId);
    setErrorMsg(null);

    try {
      const idsToDelete = [...getDescendantIds(commentId), commentId];

      const { error } = await supabase.from("comments").delete().in("id", idsToDelete);

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setReplyOpenById((prev) => {
        const next = { ...prev };
        for (const id of idsToDelete) delete next[id];
        return next;
      });

      setReplyBodyById((prev) => {
        const next = { ...prev };
        for (const id of idsToDelete) delete next[id];
        return next;
      });

      setRepliesHiddenById((prev) => {
        const next = { ...prev };
        for (const id of idsToDelete) delete next[id];
        return next;
      });
    } finally {
      setDeletingCommentId(null);
    }
  };

  const reportPost = async () => {
    if (!postId || reportingPost) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    const reason = prompt("Report reason? (spam / abuse / hate / scam / other)");
    if (!reason) return;

    const detail = prompt("Additional details? (optional)") ?? "";

    setReportingPost(true);
    setErrorMsg(null);

    try {
      await createReport({
        targetType: "post",
        targetId: postId,
        reason,
        detail,
      });

      alert("Report submitted.");
    } catch (error: any) {
      setErrorMsg(error?.message ?? "Failed to submit report.");
    } finally {
      setReportingPost(false);
    }
  };

  const reportComment = async (commentId: string) => {
    if (reportingCommentId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    const reason = prompt("Report reason? (spam / abuse / hate / scam / other)");
    if (!reason) return;

    const detail = prompt("Additional details? (optional)") ?? "";

    setReportingCommentId(commentId);
    setErrorMsg(null);

    try {
      await createReport({
        targetType: "comment",
        targetId: commentId,
        reason,
        detail,
      });

      alert("Report submitted.");
    } catch (error: any) {
      setErrorMsg(error?.message ?? "Failed to submit report.");
    } finally {
      setReportingCommentId(null);
    }
  };

  const toggleLike = async () => {
    if (!postId || liking) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    setLiking(true);
    setErrorMsg(null);

    try {
      if (likedByMe) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        await loadLikeState(postId, user.id);
        return;
      }

      const { error } = await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: user.id,
      });

      if (error) {
        if ((error as any)?.code === "23505") {
          await loadLikeState(postId, user.id);
          return;
        }
        setErrorMsg(error.message);
        return;
      }

      if (post && post.user_id !== user.id) {
        try {
          const actorName = (await getMyDisplayName(user.id)) ?? "Someone";
          await createNotification({
            userId: post.user_id,
            type: "like",
            title: "New like",
            body: `${actorName} liked your post.`,
            link: `/posts/${postId}`,
            meta: { post_id: postId },
          });
        } catch (notifError) {
          console.error("like notification error:", notifError);
        }
      }

      await loadLikeState(postId, user.id);
    } finally {
      setLiking(false);
    }
  };

  const canEditPost = !!myId && !!post && post.user_id === myId;

  const goEdit = () => {
    if (!post) return;
    router.push(`/posts/${post.id}/edit`);
  };

  const deletePost = async () => {
    if (!postId || deletingPost) return;

    if (!canEditPost) {
      setErrorMsg("You do not have permission to delete this post.");
      return;
    }

    const ok = confirm("Do you want to delete this post?");
    if (!ok) return;

    setDeletingPost(true);
    setErrorMsg(null);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", myId);

    if (error) {
      setErrorMsg(error.message);
      setDeletingPost(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
  const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60";

  const ActionIconButton = ({
    onClick,
    icon,
    label,
    disabled = false,
  }: {
    onClick: () => void;
    icon: ReactNode;
    label: string;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cx(iconButton, "border border-gray-200 bg-white")}
    >
      {icon}
    </button>
  );

  const renderCommentNode = (comment: CommentRow, depth = 0): ReactNode => {
    const replies = childrenMap[comment.id] ?? [];
    const isReplyOpen = !!replyOpenById[comment.id];
    const isRepliesHidden = !!repliesHiddenById[comment.id];
    const parentComment = comment.parent_id ? commentById[comment.parent_id] : null;
    const isMine = myId === comment.user_id;

    return (
      <div key={comment.id} className={cx(depth > 0 && "mt-3")}>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-800">{comment.author_name ?? "Anonymous"}</span>

                {isMine ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-black px-2 text-[10px] font-medium text-white">
                    You
                  </span>
                ) : null}

                <span>·</span>
                <span>{formatRelative(comment.created_at)}</span>

                {replies.length > 0 ? (
                  <span className="inline-flex h-6 items-center rounded-full bg-gray-100 px-2 text-[10px] font-medium text-gray-600">
                    {replies.length}
                  </span>
                ) : null}
              </div>

              {parentComment ? (
                <div className="mt-2 text-xs font-medium text-gray-500">
                  Replying to @{parentComment.author_name ?? "Anonymous"}
                </div>
              ) : null}

              <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{comment.content}</div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <ActionIconButton
                onClick={() => toggleReplyBox(comment.id)}
                icon={<Reply className="h-4 w-4" />}
                label="Reply"
              />

              {!isMine ? (
                <ActionIconButton
                  onClick={() => reportComment(comment.id)}
                  disabled={reportingCommentId === comment.id}
                  icon={<ShieldAlert className="h-4 w-4" />}
                  label={reportingCommentId === comment.id ? "Reporting..." : "Report"}
                />
              ) : null}

              {replies.length > 0 ? (
                <ActionIconButton
                  onClick={() =>
                    setRepliesHiddenById((prev) => ({
                      ...prev,
                      [comment.id]: !prev[comment.id],
                    }))
                  }
                  icon={
                    isRepliesHidden ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )
                  }
                  label={isRepliesHidden ? "Show replies" : "Hide replies"}
                />
              ) : null}

              {myId && comment.user_id === myId ? (
                <ActionIconButton
                  onClick={() => deleteComment(comment.id)}
                  disabled={deletingCommentId === comment.id}
                  icon={<Trash2 className="h-4 w-4" />}
                  label={deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                />
              ) : null}
            </div>
          </div>

          {isReplyOpen ? (
            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 text-xs font-medium text-gray-500">
                Reply to @{comment.author_name ?? "Anonymous"}
              </div>

              <textarea
                ref={(el) => {
                  replyInputRefs.current[comment.id] = el;
                }}
                value={replyBodyById[comment.id] ?? ""}
                onChange={(e) =>
                  setReplyBodyById((prev) => ({
                    ...prev,
                    [comment.id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    addReply(comment.id);
                  }
                }}
                placeholder={`Reply to @${comment.author_name ?? "Anonymous"}...`}
                className="min-h-[96px] w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400"
              />

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setReplyOpenById((prev) => ({
                      ...prev,
                      [comment.id]: false,
                    }))
                  }
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => addReply(comment.id)}
                  disabled={replySavingId === comment.id || !(replyBodyById[comment.id] ?? "").trim()}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {replySavingId === comment.id ? "Posting..." : "Post Reply"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {replies.length > 0 && !isRepliesHidden ? (
          <div className={cx("mt-3 border-l-2 border-gray-200 pl-4", depth > 0 && "ml-2")}>
            {replies.map((child) => renderCommentNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-[980px] px-4 pb-20 pt-4">
          <div className={cx(card, "p-5 text-sm text-gray-500")}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-[980px] px-4 pb-20 pt-4">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Link>

          <div className={cx("mt-4 p-5 text-sm text-gray-600", card)}>{errorMsg ?? "Post not found"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[980px] px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-gray-50/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-5 w-5" />
              Back
            </Link>

            <div className="flex items-center gap-2">
              <NotificationBell className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-900" />

              <Link
                href="/create"
                className="hidden h-11 items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:opacity-90 sm:inline-flex"
              >
                <Plus className="h-5 w-5" />
                Create Post
              </Link>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <section className={cx(card, "mt-4 p-5")}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold leading-7 text-gray-900 sm:text-xl">{post.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="inline-flex h-7 items-center rounded-full bg-gray-100 px-3 font-medium text-gray-600">
                  {catBadge(post.category)}
                </span>
                <span className="font-medium text-gray-800">{post.author_name ?? "Anonymous"}</span>
                <span>·</span>
                <span>{formatRelative(post.created_at)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggleLike}
                disabled={liking}
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                  likedByMe
                    ? "border-black bg-black text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                )}
              >
                <Heart className={cx("h-4 w-4", likedByMe && "fill-white")} />
                <span>{liking ? "Updating..." : likeCount}</span>
              </button>

              {!canEditPost ? (
                <button
                  type="button"
                  onClick={reportPost}
                  disabled={reportingPost}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldAlert className="h-4 w-4" />
                  {reportingPost ? "Reporting..." : "Report"}
                </button>
              ) : null}

              {canEditPost ? (
                <>
                  <button
                    type="button"
                    onClick={goEdit}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={deletePost}
                    disabled={deletingPost}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingPost ? "Deleting..." : "Delete"}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {post.image_url ? (
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image_url}
                alt="Post image"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="max-h-[520px] w-full rounded-xl object-cover"
              />
            </div>
          ) : null}

          <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{post.content}</div>
        </section>

        <section className={cx(card, "mt-4 p-5")}>
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold text-gray-900">Comments</div>
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-900">{comments.length}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {rootComments.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                <FileText className="mb-3 h-10 w-10 text-gray-300" />
                <div className="text-sm font-semibold text-gray-800">No comments yet</div>
                <div className="mt-1 text-sm text-gray-500">Be the first to join the conversation.</div>
              </div>
            ) : (
              rootComments.map((comment) => renderCommentNode(comment))
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
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
              placeholder="Write a comment..."
              disabled={saving}
              className="min-h-[120px] w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={addComment}
                disabled={saving || !commentBody.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MessageCircle className="h-5 w-5" />
                {saving ? "Posting..." : "Post Comment"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}