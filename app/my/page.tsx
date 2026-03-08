"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getFollowerCount, getFollowingCount } from "@/lib/followService";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
};

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

export default function MyPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const S = useMemo(() => {
    const bg = "#081723";
    const card = "rgba(255,255,255,0.06)";
    const line = "rgba(255,255,255,0.10)";
    const text = "rgba(255,255,255,0.92)";
    const sub = "rgba(255,255,255,0.70)";
    const muted = "rgba(255,255,255,0.55)";
    const mint = "#49D6B5";
    return { bg, card, line, text, sub, muted, mint };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) {
        setMsg(uErr.message);
        setLoading(false);
        return;
      }

      const myId = u.user?.id;
      if (!myId) {
        router.replace("/login");
        return;
      }

      // 팔로워/팔로잉 카운트
      const fc = await getFollowerCount(myId);
      const fg = await getFollowingCount(myId);
      setFollowers(fc);
      setFollowing(fg);

      // 내 글
      const { data, error } = await supabase
        .from("posts")
        .select("id,created_at,title,content,author_name")
        .eq("user_id", myId)
        .order("created_at", { ascending: false });

      if (error) {
        setMsg(error.message);
        setPosts([]);
        setLoading(false);
        return;
      }

      setPosts((data ?? []) as Post[]);
      setLoading(false);
    };

    load();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(900px 600px at 20% 0%, rgba(73,214,181,0.10), transparent 55%),
          radial-gradient(900px 600px at 80% 0%, rgba(80,140,255,0.10), transparent 55%),
          ${S.bg}
        `,
        color: S.text,
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: S.text,
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${S.line}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            ← 홈
          </Link>

          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>내 글</h1>
        </div>

        {/* Tabs */}
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link
            href="/my/followers"
            style={{
              textDecoration: "none",
              color: S.text,
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${S.line}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            팔로워
          </Link>
          <Link
            href="/my/following"
            style={{
              textDecoration: "none",
              color: S.text,
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${S.line}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            팔로잉
          </Link>
          <Link
            href="/my/notifications"
            style={{
              textDecoration: "none",
              color: S.text,
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${S.line}`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            알림
          </Link>
        </div>

        {/* Counts */}
        <div
          style={{
            marginTop: 12,
            borderRadius: 16,
            border: `1px solid ${S.line}`,
            background: S.card,
            padding: 14,
            display: "flex",
            gap: 14,
            alignItems: "center",
            color: S.sub,
          }}
        >
          <div>
            팔로워 <b style={{ color: S.text }}>{followers}</b>
          </div>
          <div>
            팔로잉 <b style={{ color: S.text }}>{following}</b>
          </div>
        </div>

        {loading && (
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: `1px solid ${S.line}`,
              background: S.card,
              padding: 14,
              color: S.sub,
            }}
          >
            불러오는 중...
          </div>
        )}

        {msg && (
          <div
            style={{
              marginTop: 12,
              borderRadius: 16,
              border: "1px solid rgba(255,80,80,0.35)",
              background: "rgba(255,80,80,0.10)",
              padding: 14,
              color: "rgba(255,230,230,0.95)",
            }}
          >
            {msg}
          </div>
        )}

        {/* List */}
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {!loading && posts.length === 0 && (
            <div
              style={{
                borderRadius: 16,
                border: `1px solid ${S.line}`,
                background: S.card,
                padding: 16,
                color: S.sub,
              }}
            >
              아직 내 글이 없어.
              <div style={{ marginTop: 10 }}>
                <Link
                  href="/create"
                  style={{
                    display: "inline-block",
                    padding: "10px 12px",
                    borderRadius: 14,
                    textDecoration: "none",
                    color: "#062018",
                    background: S.mint,
                    fontWeight: 900,
                  }}
                >
                  첫 글 쓰기
                </Link>
              </div>
            </div>
          )}

          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  borderRadius: 16,
                  border: `1px solid ${S.line}`,
                  background: S.card,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: S.muted, whiteSpace: "nowrap" }}>
                    {formatRelative(p.created_at)}
                  </div>
                </div>

                <div style={{ marginTop: 10, color: S.sub, lineHeight: 1.6 }}>
                  {p.content.length > 160 ? p.content.slice(0, 160) + "..." : p.content}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}