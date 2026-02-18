"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  title: string;
  content: string;
  author_name: string | null;
  user_id: string | null;
  created_at: string;
};

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setLoading(true);
      setErrorMsg(null);

      // 1) 로그인 체크
      const { data: u } = await supabase.auth.getUser();
      const myId = u.user?.id ?? null;
      if (!myId) {
        router.replace("/login");
        return;
      }

      // 2) 글 불러오기
      const { data, error } = await supabase
        .from("posts")
        .select("id,title,content,author_name,user_id,created_at")
        .eq("id", id)
        .single();

      if (error) {
        setLoading(false);
        setErrorMsg(error.message);
        return;
      }

      const p = data as Post;

      // 3) 소유자 체크 (내 글 아니면 접근 차단)
      if (!p.user_id || p.user_id !== myId) {
        setLoading(false);
        setErrorMsg("수정 권한이 없어. (작성자만 수정 가능)");
        return;
      }

      setPost(p);
      setTitle(p.title ?? "");
      setContent(p.content ?? "");
      setAuthorName(p.author_name ?? "");
      setLoading(false);
    };

    load();
  }, [id, router]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    setErrorMsg(null);

    const t = title.trim();
    const c = content.trim();
    const a = authorName.trim();

    if (!t || !c) {
      setErrorMsg("제목/내용을 입력해줘.");
      return;
    }

    setSaving(true);

    const { error, count } = await supabase
      .from("posts")
      .update(
        {
          title: t,
          content: c,
          author_name: a || null,
        },
        { count: "exact" }
      )
      .eq("id", post.id);

    console.log("update result =>", { error, count });

    setSaving(false);

    if (error) {
      alert("수정 실패(에러): " + error.message);
      return;
    }

    // RLS로 막히면 count 0 가능
    if (count === 0) {
      alert("수정 실패: 권한이 없어서 수정할 수 없어.");
      return;
    }

    alert("수정 완료");
    router.push(`/posts/${post.id}`);
    router.refresh();
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={post ? `/posts/${post.id}` : "/"} style={{ textDecoration: "none" }}>
          ← 돌아가기
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900 }}>글 수정</h1>

      {loading && <div style={{ marginTop: 12 }}>불러오는 중...</div>}

      {errorMsg && (
        <div style={{ marginTop: 12, color: "crimson" }}>{errorMsg}</div>
      )}

      {!loading && post && (
        <form onSubmit={onSave} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
          />

          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="작성자(선택)"
            style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용"
            rows={10}
            style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
          />

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #111",
              background: saving ? "#ddd" : "#111",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </form>
      )}
    </div>
  );
}
