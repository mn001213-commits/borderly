"use client";

import { useEffect, useMemo, useState, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notificationService";
import { createReport } from "@/lib/reportService";
import ReportModal from "@/app/components/ReportModal";
import { useT } from "@/app/components/LangProvider";

import {
  ArrowLeft,
  Edit3,
  Trash2,
  Heart,
  MessageCircle,
  Reply,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  FileText,
  Bookmark,
  Share2,
} from "lucide-react";
import { isVideoUrl } from "@/lib/format";
import { CAT_COLORS } from "@/lib/constants";

type PostRow = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  category: string;
  image_url: string | null;
  image_urls: string[] | null;
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

function formatRelative(iso: string, tr?: (key: string) => string) {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return tr ? tr("post.justNow") : "Just now";
  if (min < 60) return `${min}${tr ? tr("post.mAgo") : "m ago"}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${tr ? tr("post.hAgo") : "h ago"}`;
  const day = Math.floor(hr / 24);
  return `${day}${tr ? tr("post.dAgo") : "d ago"}`;
}

export default function PostDetailPage() {
  const { t } = useT();
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
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);

  const [myId, setMyId] = useState<string | null>(null);

  const [likeCount, setLikeCount] = useState(0);
  const [likedByMe, setLikedByMe] = useState(false);
  const [bookmarkedByMe, setBookmarkedByMe] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  const [copiedToast, setCopiedToast] = useState(false);

  const [authorProfile, setAuthorProfile] = useState<{ avatar_url: string | null; display_name: string | null } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const myIdRef = useRef<string | null>(null);
  const replyInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  const catBadge = useMemo(() => {
    const map: Record<string, string> = {
      general: t("cat.general"),
      info: t("cat.info"),
      question: t("cat.question"),
      daily: t("cat.daily"),
      jobs: t("cat.jobs"),
      meet: t("cat.meet"),
      skill: t("cat.skill"),
      ngo: t("cat.ngo"),
      legal: t("cat.legal"),
      etc: t("cat.other"),
    };
    return (k: string) => map[k] ?? k;
  }, [t]);

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

  const loadBookmarkState = useCallback(async (pid: string, uid: string | null) => {
    if (!uid) { setBookmarkedByMe(false); return; }
    const { data } = await supabase
      .from("post_bookmarks")
      .select("post_id")
      .eq("post_id", pid)
      .eq("user_id", uid)
      .maybeSingle();
    setBookmarkedByMe(!!data);
  }, []);

  const loadPost = useCallback(async (pid: string) => {
    const { data: p, error: pErr } = await supabase
      .from("posts")
      .select("id, user_id, created_at, title, content, author_name, category, image_url, image_urls, is_hidden")
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
        setErrorMsg(t("post.invalidUrl"));
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
        setErrorMsg(t("post.notFoundMsg"));
        setTimeout(() => router.replace("/"), 600);
        return;
      }

      const { data: ap } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", p.user_id)
        .maybeSingle();
      setAuthorProfile(ap ?? null);

      await loadComments(postId);
      await loadLikeState(postId, meId);
      await loadBookmarkState(postId, meId);

      setLoading(false);
    };

    load();
  }, [postId, loadPost, loadComments, loadLikeState, loadBookmarkState, router]);

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
        .subscribe();
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
      router.push("/login");
      return;
    }

    const content = commentBody.trim();
    if (!content) return;

    setSaving(true);
    setErrorMsg(null);

    // 1. Optimistic update - 임시 댓글 추가
    const tempId = `temp-${Date.now()}`;
    const author = await getMyDisplayName(user.id);

    const optimisticComment = {
      id: tempId,
      post_id: postId,
      user_id: user.id,
      parent_id: null,
      content,
      created_at: new Date().toISOString(),
      author_name: author ?? t("post.anonymous"),
      is_hidden: false,
    };

    setComments((prev) => [optimisticComment, ...prev]);
    const savedContent = content;
    setCommentBody("");

    try {
      // 2. 실제 DB 삽입
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          parent_id: null,
          content: savedContent,
          author_name: author ?? t("post.anonymous"),
        })
        .select()
        .single();

      if (error) throw error;

      // 3. 임시 댓글을 실제 데이터로 교체
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? data : c))
      );

      // 알림 생성
      if (post && post.user_id !== user.id) {
        try {
          await createNotification({
            userId: post.user_id,
            type: "comment",
            title: "New comment",
            body: `${author ?? t("post.someone")} commented: ${savedContent}`,
            link: `/posts/${postId}`,
            meta: { post_id: postId, title_key: "notif.tpl.commentTitle", body_key: "notif.tpl.commentBody", actor: author ?? t("post.someone"), content: savedContent },
          });
        } catch (notifError) {
          if (process.env.NODE_ENV === "development") console.error("comment notification error:", notifError);
        }
      }
    } catch (err: any) {
      console.error("addComment error:", err);
      setErrorMsg(err.message || "Failed to post comment");

      // 4. Rollback - 임시 댓글 제거
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCommentBody(savedContent);
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
      router.push("/login");
      return;
    }

    const content = (replyBodyById[parentId] ?? "").trim();
    if (!content) return;

    setReplySavingId(parentId);
    setErrorMsg(null);

    // 1. Optimistic update - 임시 댓글 추가
    const tempId = `temp-${Date.now()}`;
    const author = await getMyDisplayName(user.id);

    const optimisticComment = {
      id: tempId,
      post_id: postId,
      user_id: user.id,
      parent_id: parentId,
      content,
      created_at: new Date().toISOString(),
      author_name: author ?? t("post.anonymous"),
      is_hidden: false,
    };

    setComments((prev) => [optimisticComment, ...prev]);
    const savedContent = content;
    setReplyBodyById((prev) => ({ ...prev, [parentId]: "" }));
    setReplyOpenById((prev) => ({ ...prev, [parentId]: false }));
    setRepliesHiddenById((prev) => ({ ...prev, [parentId]: false }));

    try {
      // 2. 실제 DB 삽입
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          parent_id: parentId,
          content: savedContent,
          author_name: author ?? t("post.anonymous"),
        })
        .select()
        .single();

      if (error) throw error;

      // 3. 임시 댓글을 실제 데이터로 교체
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? data : c))
      );

      // 알림 생성
      if (post && post.user_id !== user.id) {
        try {
          await createNotification({
            userId: post.user_id,
            type: "comment",
            title: "New reply",
            body: `${author ?? t("post.someone")} replied: ${savedContent}`,
            link: `/posts/${postId}`,
            meta: {
              post_id: postId,
              title_key: "notif.tpl.replyTitle",
              body_key: "notif.tpl.replyBody",
              actor: author ?? t("post.someone"),
              content: savedContent,
              parent_id: parentId,
            },
          });
        } catch (notifError) {
          if (process.env.NODE_ENV === "development") console.error("reply notification error:", notifError);
        }
      }
    } catch (err: any) {
      console.error("addReply error:", err);
      setErrorMsg(err.message || "Failed to post reply");

      // 4. Rollback - 임시 댓글 제거
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setReplyBodyById((prev) => ({ ...prev, [parentId]: savedContent }));
    } finally {
      setReplySavingId(null);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (deletingCommentId) return;

    // Verify ownership before attempting delete
    const comment = comments.find((c) => c.id === commentId);
    if (!comment || comment.user_id !== myId) {
      setErrorMsg(t("post.noDeletePermission") || "No permission to delete");
      return;
    }

    const ok = confirm(t("post.deleteCommentConfirm"));
    if (!ok) return;

    setDeletingCommentId(commentId);
    setErrorMsg(null);

    try {
      // Only delete own comments — RLS enforces this at DB level too
      const descendantIds = getDescendantIds(commentId);
      const myDescendants = descendantIds.filter(
        (id) => comments.find((c) => c.id === id)?.user_id === myId
      );
      const idsToDelete = [...myDescendants, commentId];

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
      router.push("/login");
      return;
    }

    setReportTarget({ type: "post", id: postId });
    setReportModalOpen(true);
  };

  const reportComment = async (commentId: string) => {
    if (reportingCommentId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setReportTarget({ type: "comment", id: commentId });
    setReportModalOpen(true);
  };

  const handleReportSubmit = async (reason: string, detail: string) => {
    if (!reportTarget) return;

    if (reportTarget.type === "post") setReportingPost(true);
    else setReportingCommentId(reportTarget.id);

    setErrorMsg(null);

    try {
      await createReport({
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        reason,
        detail,
      });
    } finally {
      if (reportTarget.type === "post") setReportingPost(false);
      else setReportingCommentId(null);
    }
  };

  const toggleLike = async () => {
    if (!postId || liking) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
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
          const actorName = (await getMyDisplayName(user.id)) ?? t("post.someone");
          await createNotification({
            userId: post.user_id,
            type: "like",
            title: "New like",
            body: `${actorName} liked your post.`,
            link: `/posts/${postId}`,
            meta: { post_id: postId, title_key: "notif.tpl.likeTitle", body_key: "notif.tpl.likeBody", actor: actorName },
          });
        } catch (notifError) {
          if (process.env.NODE_ENV === "development") console.error("like notification error:", notifError);
        }
      }

      await loadLikeState(postId, user.id);
    } finally {
      setLiking(false);
    }
  };

  const toggleBookmark = async () => {
    if (!postId || bookmarking) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setBookmarking(true);
    try {
      if (bookmarkedByMe) {
        const { error: delErr } = await supabase.from("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
        if (delErr && process.env.NODE_ENV === "development") console.error("bookmark delete error:", delErr);
        setBookmarkedByMe(false);
      } else {
        const { error } = await supabase.from("post_bookmarks").insert({ post_id: postId, user_id: user.id });
        if (error && (error as any)?.code === "23505") {
          // Already bookmarked (duplicate), just set state
          setBookmarkedByMe(true);
        } else if (error) {
          if (process.env.NODE_ENV === "development") console.error("bookmark insert error:", error);
        } else {
          setBookmarkedByMe(true);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("toggleBookmark error:", err);
    } finally {
      setBookmarking(false);
    }
  };

  const sharePost = async () => {
    const url = `${window.location.origin}/posts/${postId}`;
    if (navigator.share) {
      try { await navigator.share({ title: post?.title ?? "Post", url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
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
      setErrorMsg(t("post.noDeletePermission"));
      return;
    }

    const ok = confirm(t("post.deletePostConfirm"));
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

  const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60";

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
      className={iconButton}
      style={{ color: "var(--text-secondary)", border: "1px solid var(--border-soft)", background: "var(--bg-card)" }}
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
        <div className="b-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                <Link href={`/u/${comment.user_id}`} className="font-medium hover:underline" style={{ color: "var(--deep-navy)" }}>{comment.author_name ?? t("post.anonymous")}</Link>

                {isMine ? (
                  <span className="inline-flex h-6 items-center rounded-full px-2 text-[10px] font-medium text-white" style={{ background: "var(--primary)" }}>
                    {t("post.you")}
                  </span>
                ) : null}

                <span>·</span>
                <span>{formatRelative(comment.created_at, t)}</span>

                {replies.length > 0 ? (
                  <span className="inline-flex h-6 items-center rounded-full px-2 text-[10px] font-medium" style={{ background: "var(--light-blue)", color: "var(--text-secondary)" }}>
                    {replies.length}
                  </span>
                ) : null}
              </div>

              {parentComment ? (
                <div className="mt-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  {t("post.replyingTo")} @{parentComment.author_name ?? t("post.anonymous")}
                </div>
              ) : null}

              <div className="mt-2 whitespace-pre-wrap text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{comment.content}</div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <ActionIconButton
                onClick={() => toggleReplyBox(comment.id)}
                icon={<Reply className="h-4 w-4" />}
                label={t("post.reply")}
              />

              {!isMine ? (
                <ActionIconButton
                  onClick={() => reportComment(comment.id)}
                  disabled={reportingCommentId === comment.id}
                  icon={<ShieldAlert className="h-4 w-4" />}
                  label={reportingCommentId === comment.id ? t("post.reporting") : t("post.report")}
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
                  label={isRepliesHidden ? t("post.showReplies") : t("post.hideReplies")}
                />
              ) : null}

              {myId && comment.user_id === myId ? (
                <ActionIconButton
                  onClick={() => deleteComment(comment.id)}
                  disabled={deletingCommentId === comment.id}
                  icon={<Trash2 className="h-4 w-4" />}
                  label={deletingCommentId === comment.id ? t("post.deleting") : t("common.delete")}
                />
              ) : null}
            </div>
          </div>

          {isReplyOpen ? (
            <div className="mt-3 rounded-2xl p-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
              <div className="mb-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {t("post.replyTo")} @{comment.author_name ?? t("post.anonymous")}
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
                placeholder={`${t("post.replyTo")} @${comment.author_name ?? t("post.anonymous")}...`}
                className="min-h-[96px] w-full resize-y rounded-xl p-3 text-sm outline-none"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
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
                  className="inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-medium transition"
                  style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                >
                  {t("common.cancel")}
                </button>

                <button
                  type="button"
                  onClick={() => addReply(comment.id)}
                  disabled={replySavingId === comment.id || !(replyBodyById[comment.id] ?? "").trim()}
                  className="inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "var(--primary)" }}
                >
                  {replySavingId === comment.id ? t("post.posting") : t("post.postReply")}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {replies.length > 0 && !isRepliesHidden ? (
          <div className={cx("mt-3 border-l-2 pl-4", depth > 0 && "ml-2")} style={{ borderColor: "var(--border-soft)" }}>
            {replies.map((child) => renderCommentNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}>
        <div className="mx-auto max-w-[980px] px-4 pb-20 pt-4">
          <div className="b-card p-5 space-y-3">
            <div className="b-skeleton h-6 w-2/3 rounded-lg" />
            <div className="b-skeleton h-4 w-1/3 rounded-lg" />
            <div className="b-skeleton h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen" style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}>
        <div className="mx-auto max-w-[980px] px-4 pb-20 pt-4">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition"
            style={{ background: "var(--light-blue)", color: "var(--deep-navy)", border: "1px solid var(--border-soft)" }}
          >
            <ArrowLeft className="h-5 w-5" />
            {t("common.back")}
          </Link>

          <div className="b-card mt-4 p-5 text-sm" style={{ color: "var(--text-secondary)" }}>{errorMsg ?? t("post.notFound")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-[980px] px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 backdrop-blur" style={{ borderBottom: "1px solid var(--border-soft)" }}>
          <div className="flex items-center gap-3 py-3">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition"
              style={{ color: "var(--deep-navy)", border: "1px solid var(--border-soft)" }}
            >
              <ArrowLeft className="h-5 w-5" />
              {t("common.back")}
            </Link>
          </div>
        </header>

        {errorMsg && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="mt-4">
        <section className="b-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold leading-7 sm:text-xl" style={{ color: "var(--deep-navy)" }}>{post.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                {(() => {
                  const cc = CAT_COLORS[post.category] ?? CAT_COLORS.other;
                  return (
                    <span
                      className="inline-flex h-7 items-center rounded-full px-3 font-semibold text-[10px]"
                      style={{ background: cc.bg, color: cc.color }}
                    >
                      {catBadge(post.category)}
                    </span>
                  );
                })()}
                <Link href={`/u/${post.user_id}`} className="inline-flex items-center gap-1.5 no-underline">
                  <div
                    className="h-6 w-6 shrink-0 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "var(--primary)" }}
                  >
                    {authorProfile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={authorProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (authorProfile?.display_name ?? post.author_name ?? "?")[0]?.toUpperCase()
                    )}
                  </div>
                  <span className="font-medium" style={{ color: "var(--text-secondary)" }}>
                    {authorProfile?.display_name ?? post.author_name ?? t("post.anonymous")}
                  </span>
                </Link>
                <span>·</span>
                <span>{formatRelative(post.created_at, t)}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleLike}
                disabled={liking}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                style={likedByMe
                  ? { borderColor: "var(--primary)", background: "var(--primary)", color: "#fff" }
                  : { borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }
                }
              >
                <Heart className={cx("h-4 w-4", likedByMe && "fill-white")} />
                <span>{liking ? t("post.updating") : likeCount}</span>
              </button>

              <button
                type="button"
                onClick={toggleBookmark}
                disabled={bookmarking}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                style={bookmarkedByMe
                  ? { borderColor: "#F59E0B", background: "#F59E0B", color: "#fff" }
                  : { borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }
                }
              >
                <Bookmark className={cx("h-4 w-4", bookmarkedByMe && "fill-white")} />
              </button>

              <button
                type="button"
                onClick={sharePost}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition"
                style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
              >
                <Share2 className="h-4 w-4" />
              </button>

              {!canEditPost ? (
                <button
                  type="button"
                  onClick={reportPost}
                  disabled={reportingPost}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                >
                  <ShieldAlert className="h-4 w-4" />
                  {reportingPost ? t("post.reporting") : t("post.report")}
                </button>
              ) : null}

              {canEditPost ? (
                <>
                  <button
                    type="button"
                    onClick={goEdit}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition"
                    style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                  >
                    <Edit3 className="h-4 w-4" />
                    {t("common.edit")}
                  </button>

                  <button
                    type="button"
                    onClick={deletePost}
                    disabled={deletingPost}
                    className="inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingPost ? t("post.deleting") : t("common.delete")}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {(() => {
            const mediaUrls = post.image_urls && post.image_urls.length > 0 ? post.image_urls : post.image_url ? [post.image_url] : [];
            if (mediaUrls.length === 0) return null;

            if (mediaUrls.length === 1) {
              const url = mediaUrls[0];
              return (
                <div className="mt-4">
                  {isVideoUrl(url) ? (
                    <video src={url} controls preload="metadata" className="w-full rounded-xl" style={{ maxHeight: 520 }} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={t("post.postImage")} onError={(e) => { e.currentTarget.style.display = "none"; }} className="w-full rounded-xl" />
                  )}
                </div>
              );
            }

            return (
              <div className="mt-4">
                <div
                  className="flex snap-x snap-mandatory overflow-x-auto rounded-xl scrollbar-hide"
                  style={{ scrollBehavior: "smooth" }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const idx = Math.round(el.scrollLeft / el.clientWidth);
                    const dots = el.parentElement?.querySelector("[data-dots]");
                    if (dots) dots.setAttribute("data-active", String(idx));
                    // Force re-render dots
                    const allDots = dots?.querySelectorAll("span");
                    allDots?.forEach((d, i) => {
                      d.style.opacity = i === idx ? "1" : "0.4";
                    });
                  }}
                >
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="w-full shrink-0 snap-center">
                      {isVideoUrl(url) ? (
                        <video src={url} controls preload="metadata" className="w-full" style={{ maxHeight: 520 }} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`${t("post.postImage")} ${i + 1}`} onError={(e) => { e.currentTarget.style.display = "none"; }} className="w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
                <div data-dots className="mt-2 flex justify-center gap-1.5">
                  {mediaUrls.map((_, i) => (
                    <span
                      key={i}
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: "var(--deep-navy)", opacity: i === 0 ? 1 : 0.4, transition: "opacity 0.2s" }}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="mt-4 whitespace-pre-wrap text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{post.content}</div>
        </section>

        <section className="b-card mt-4 p-5">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold" style={{ color: "var(--deep-navy)" }}>{t("post.comments")}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium" style={{ color: "var(--deep-navy)" }}>{comments.length}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {rootComments.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl px-4 py-4" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <MessageCircle className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("post.noComments")}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("post.beFirstComment")}</div>
                </div>
              </div>
            ) : (
              rootComments.map((comment) => renderCommentNode(comment))
            )}
          </div>

          <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
            <div className="mb-2 text-sm font-medium" style={{ color: "var(--deep-navy)" }}>{t("post.writeComment")}</div>

            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  addComment();
                }
              }}
              placeholder={t("post.writeCommentPlaceholder")}
              disabled={saving}
              className="min-h-[120px] w-full resize-y rounded-xl p-3 text-sm outline-none disabled:opacity-70"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
            />

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={addComment}
                disabled={saving || !commentBody.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: "var(--primary)" }}
              >
                <MessageCircle className="h-5 w-5" />
                {saving ? t("post.posting") : t("post.postComment")}
              </button>
            </div>
          </div>
        </section>
        </div>
      </div>

      {copiedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-lg" style={{ background: "var(--deep-navy)" }}>
          {t("post.linkCopied")}
        </div>
      )}

      <ReportModal
        open={reportModalOpen}
        onClose={() => { setReportModalOpen(false); setReportTarget(null); }}
        onSubmit={handleReportSubmit}
        t={t}
      />
    </div>
  );
}