"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AuthBar from "@/app/components/AuthBar";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
};

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ 로그인 여부(버튼 표시용)
  const [isAuthed, setIsAuthed] = useState(false);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("posts")
      .select("id,created_at,title,content,author_name")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setPosts((data ?? []) as Post[]);
  };

  useEffect(() => {
    load();

    // ✅ 최초 로그인 상태 확인
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user);
    });

    // ✅ 로그인/로그아웃 변화 감지
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(!!session?.user);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      {/* 상단 헤더 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>EICConnect MVP</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <AuthBar />

          {/* ✅ 로그인 했을 때만 새 글 버튼 표시 */}
       {isAuthed && (
  <>
    <Link
      href="/my"
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #111",
        textDecoration: "none",
        color: "#111",
      }}
    >
      내 글
    </Link>

    <Link
      href="/create"
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #111",
        textDecoration: "none",
        color: "#111",
      }}
    >
      + 새 글
    </Link>
  </>
)}

        </div>
      </div>

      {!isAuthed && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>
          글을 작성하려면 로그인해줘.
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {loading && <div>불러오는 중...</div>}
        {errorMsg && <div style={{ color: "crimson" }}>{errorMsg}</div>}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800 }}>{p.title}</div>

                {p.author_name && (
                  <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
                    by {p.author_name}
                  </div>
                )}

                <div style={{ marginTop: 10, color: "#333", lineHeight: 1.55 }}>
                  {p.content.length > 120 ? p.content.slice(0, 120) + "..." : p.content}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
            </Link>
          ))}

          {!loading && posts.length === 0 && (
            <div style={{ color: "#666" }}>아직 글이 없어.</div>
          )}
        </div>
      </div>
    </div>
  );
}
