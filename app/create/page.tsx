"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 로그인 체크
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setChecking(false);
    };
    check();
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const t = title.trim();
    const c = content.trim();

    if (!t || !c) {
      setErrorMsg("제목/내용을 입력해줘.");
      return;
    }

    setSaving(true);

    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    const email = data.user?.email ?? null;

    const { error } = await supabase.from("posts").insert({
      title: t,
      content: c,
      user_id: userId, // ✅ 필수
      author_name: email, // ✅ 자동
    });

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  };

  if (checking) return <div style={{ padding: 16 }}>로그인 확인 중...</div>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← 홈으로
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 16 }}>새 글 작성</h1>

      {errorMsg && <div style={{ color: "crimson", marginBottom: 12 }}>{errorMsg}</div>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용"
          rows={8}
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
    </div>
  );
}
