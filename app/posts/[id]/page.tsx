"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  user_id: string | null;
};

type CommentRow = {
  id: string;
  created_at: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  content: string;
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const postId = params?.id;

  const [post, setPost] = useState<Post | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // comments
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [cLoading, setCLoading] = useState(true);
  const [cError, setCError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  // edit comment state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const isOwner = useMemo(() => {
    return !!post?.user_id && !!myUserId && post.user_id === myUserId;
  }, [post?.user_id, myUserId]);

  const loadPost = async () => {
    if (!postId) return;

    setLoading(true);
    setErrorMsg(null);

    const { data: u } = await supabase.auth.getUser();
    setMyUserId(u.user?.id ?? null);

    const { data, error } = await supabase
      .from("posts")
      .select("id,created_at,title,content,author_name,user_id")
      .eq("id", postId)
      .single();

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setPost(data as Post);
  };

  const loadComments = async () => {
    if (!postId) return;

    setCLoading(true);
    setCError(null);

    const { data, error } = await supabase
      .from("comments")
      .select("id,created_at,post_id,user_id,author_name,content")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    setCLoading(false);

    if (error) {
      setCError(error.message);
      return;
    }

    setComments((data ?? []) as CommentRow[]);
  };

  useEffect(() => {
    loadPost();
    loadComments();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setMyUserId(session?.user?.id ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const handleDeletePost = async () => {
    if (!post) return;

    const ok = confirm("정말 삭제할까?");
    if (!ok) return;

    const { error, count } = await supabase
      .from("posts")
      .delete({ count: "exact" })
      .eq("id", post.id);

    if (error) {
      alert("삭제 실패(에러): " + error.message);
      return;
    }
    if (count === 0) {
      alert("삭제 실패: 권한이 없어서 삭제할 수 없어.");
      return;
    }

    alert("삭제 완료");
    router.push("/");
    router.refresh();
  };

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text) return;

    const { data: u } = await supabase.auth.getUser();
    const user = u.user;

    if (!user) {
      router.push("/login");
      return;
    }

    setSending(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      author_name: user.email ?? null,
      content: text,
    });

    setSending(false);

    if (error) {
      alert("댓글 등록 실패: " + error.message);
      return;
    }

    setNewComment("");
    loadComments();
  };

  const startEdit = (c: CommentRow) => {
    setEditingId(c.id);
    setEditText(c.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const text = editText.trim();
    if (!text) {
      alert("내용이 비어있어.");
      return;
    }

    setEditSaving(true);

    const { error, count } = await supabase
      .from("comments")
      .update({ content: text }, { count: "exact" })
      .eq("id", editingId);

    setEditSaving(false);

    if (error) {
      alert("댓글 수정 실패: " + error.message);
      return;
    }
    if (count === 0) {
      alert("수정 실패: 권한이 없어.");
      return;
    }

    cancelEdit();
    loadComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    const ok = confirm("댓글을 삭제할까?");
    if (!ok) return;

    const { error, count } = await supabase
      .from("comments")
      .delete({ count: "exact" })
      .eq("id", commentId);

    if (error) {
      alert("댓글 삭제 실패: " + error.message);
      return;
    }
    if (count === 0) {
      alert("삭제 실패: 권한이 없어.");
      return;
    }

    // 수정 중이던 댓글을 삭제했다면 편집 모드 종료
    if (editingId === commentId) cancelEdit();

    loadComments();
  };

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← 목록으로
        </Link>
      </div>

      {loading && <div>불러오는 중...</div>}
      {errorMsg && <div style={{ color: "crimson" }}>{errorMsg}</div>}

      {post && (
        <div
          style={{
            border: "1px solid #e5e5e5",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900 }}>{post.title}</div>

          {post.author_name && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#555" }}>
              by {post.author_name}
            </div>
          )}

          <div style={{ marginTop: 14, color: "#333", lineHeight: 1.7 }}>
            {post.content}
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: "#777" }}>
            {new Date(post.created_at).toLocaleString()}
          </div>

          {isOwner ? (
            <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
              <Link
                href={`/posts/${post.id}/edit`}
                style={{
                  display: "inline-block",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  textDecoration: "none",
                  color: "#111",
                }}
              >
                수정하기
              </Link>

              <button
                onClick={handleDeletePost}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid crimson",
                  background: "white",
                  color: "crimson",
                  cursor: "pointer",
                }}
              >
                삭제하기
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 18, fontSize: 13, color: "#666" }}>
              수정/삭제는 작성자만 할 수 있어.
            </div>
          )}

          {/* ---------------- 댓글 ---------------- */}
          <div style={{ marginTop: 28, borderTop: "1px solid #eee", paddingTop: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>댓글</div>

            {/* 댓글 입력 */}
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={myUserId ? "댓글을 입력해줘" : "로그인하면 댓글을 쓸 수 있어"}
                rows={3}
                disabled={!myUserId || sending}
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  resize: "vertical",
                  background: !myUserId ? "#f7f7f7" : "white",
                }}
              />

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={handleAddComment}
                  disabled={!myUserId || sending || !newComment.trim()}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: !myUserId || sending ? "#ddd" : "#111",
                    color: "#fff",
                    cursor: !myUserId || sending ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "등록 중..." : "댓글 등록"}
                </button>

                {!myUserId && (
                  <button
                    onClick={() => router.push("/login")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    로그인하러 가기
                  </button>
                )}
              </div>
            </div>

            {/* 댓글 목록 */}
            <div style={{ marginTop: 16 }}>
              {cLoading && <div>댓글 불러오는 중...</div>}
              {cError && <div style={{ color: "crimson" }}>{cError}</div>}

              {!cLoading && comments.length === 0 && (
                <div style={{ color: "#666", marginTop: 10 }}>아직 댓글이 없어.</div>
              )}

              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {comments.map((c) => {
                  const canEdit = !!myUserId && c.user_id === myUserId;
                  const isEditing = editingId === c.id;

                  return (
                    <div
                      key={c.id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontSize: 13, color: "#555" }}>
                          {c.author_name ? `by ${c.author_name}` : "by (unknown)"}
                        </div>

                        {canEdit && (
                          <div style={{ display: "flex", gap: 8 }}>
                            {!isEditing ? (
                              <button
                                onClick={() => startEdit(c)}
                                style={{
                                  border: "1px solid #111",
                                  background: "white",
                                  color: "#111",
                                  borderRadius: 10,
                                  padding: "6px 10px",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                수정
                              </button>
                            ) : (
                              <button
                                onClick={cancelEdit}
                                disabled={editSaving}
                                style={{
                                  border: "1px solid #777",
                                  background: "white",
                                  color: "#777",
                                  borderRadius: 10,
                                  padding: "6px 10px",
                                  cursor: editSaving ? "not-allowed" : "pointer",
                                  fontSize: 12,
                                }}
                              >
                                취소
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              disabled={editSaving}
                              style={{
                                border: "1px solid crimson",
                                background: "white",
                                color: "crimson",
                                borderRadius: 10,
                                padding: "6px 10px",
                                cursor: editSaving ? "not-allowed" : "pointer",
                                fontSize: 12,
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 본문 / 편집 textarea */}
                      {!isEditing ? (
                        <div style={{ marginTop: 8, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                          {c.content}
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            style={{
                              padding: 10,
                              border: "1px solid #ddd",
                              borderRadius: 10,
                              resize: "vertical",
                            }}
                          />
                          <button
                            onClick={saveEdit}
                            disabled={editSaving || !editText.trim()}
                            style={{
                              justifySelf: "start",
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: "1px solid #111",
                              background: editSaving ? "#ddd" : "#111",
                              color: "#fff",
                              cursor: editSaving ? "not-allowed" : "pointer",
                              fontSize: 12,
                            }}
                          >
                            {editSaving ? "저장 중..." : "수정 저장"}
                          </button>
                        </div>
                      )}

                      <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                        {new Date(c.created_at).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* ---------------- /댓글 ---------------- */}
        </div>
      )}
    </div>
  );
}
