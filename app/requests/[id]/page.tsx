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

  const chip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(17,17,17,0.12)",
    background: "rgba(59,130,246,0.08)",
    color: "#111111",
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };

  const dot: React.CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "#16EB33",
    boxShadow: "0 6px 14px rgba(22,235,51,0.22)",
  };

  return (
    <span style={chip}>
      <span style={dot} />
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

  // ✅ 핵심: 기존 대화방 있으면 이동 / 없으면 생성 후 이동
  const startChatWithAuthor = async () => {
    setChatErr(null);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;

    if (!uid) {
      router.push("/login");
      return;
    }
    if (!post?.author_id) {
      setChatErr("작성자 정보를 불러오지 못했어.");
      return;
    }
    if (uid === post.author_id) {
      setChatErr("본인 글에는 연락할 수 없어.");
      return;
    }

    setChatLoading(true);

    const otherId = post.author_id;
    const user_low = uid < otherId ? uid : otherId;
    const user_high = uid < otherId ? otherId : uid;

    // 1) direct_conversations upsert로 "있으면 가져오고 없으면 만들기"
    const { data: dcRow, error: dcErr } = await supabase
      .from("direct_conversations")
      .upsert(
        { user_low, user_high },
        { onConflict: "user_low,user_high" } // ✅ 테이블에 unique(user_low,user_high) 있어야 함
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
      setChatErr("대화방 ID를 얻지 못했어.");
      return;
    }

    // 2) conversation_members 두 명 등록 (중복이면 upsert)
    const { error: memErr } = await supabase
      .from("conversation_members")
      .upsert(
        [
          { conversation_id: conversationId, user_id: uid, last_read_at: new Date().toISOString() },
          { conversation_id: conversationId, user_id: otherId, last_read_at: null },
        ],
        { onConflict: "conversation_id,user_id" } // ✅ unique(conversation_id,user_id) 있어야 함
      );

    if (memErr) {
      setChatLoading(false);
      setChatErr(memErr.message);
      return;
    }

    setChatLoading(false);

    // ✅ 여기 중요:
    // 너 채팅 리스트가 /chats 이고, 리스트 링크도 /chats/{id} 로 되어 있으니까
    router.push(`/chats/${conversationId}`);
  };

  if (loading) return <div style={{ padding: 20 }}>불러오는 중...</div>;
  if (errorMsg) return <div style={{ padding: 20, color: "crimson" }}>{errorMsg}</div>;
  if (!post) return <div style={{ padding: 20 }}>글이 존재하지 않아.</div>;

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← 홈으로
        </Link>
      </div>

      {/* 제목 + 목적 뱃지 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>{post.title}</h1>
        <PurposeBadge purpose={post.purpose} />
      </div>

      <div style={{ fontSize: 13, color: "rgba(17,17,17,0.6)", marginBottom: 20 }}>
        작성자: {post.author_name ?? "알 수 없음"}
        <br />
        작성일: {new Date(post.created_at).toLocaleString()}
      </div>

      <div style={{ lineHeight: 1.7, fontSize: 16, whiteSpace: "pre-wrap", marginBottom: 18 }}>
        {post.content}
      </div>

      {/* 연락하기 */}
      {chatErr ? <div style={{ color: "crimson", marginBottom: 10 }}>{chatErr}</div> : null}

      {me && me !== post.author_id ? (
        <button
          onClick={startChatWithAuthor}
          disabled={chatLoading}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #111",
            background: chatLoading ? "#ddd" : "#111",
            color: "#fff",
            fontWeight: 800,
            cursor: chatLoading ? "not-allowed" : "pointer",
          }}
        >
          {chatLoading ? "대화방 여는 중..." : "작성자에게 연락하기"}
        </button>
      ) : !me ? (
        <button
          onClick={() => router.push("/login")}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          로그인하고 연락하기
        </button>
      ) : null}
    </div>
  );
}