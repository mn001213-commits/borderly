"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  display_name: string | null;
};

type DirectConversation = {
  conversation_id: string;
  user_low: string;
  user_high: string;
  created_at: string;
};

export default function NewChatPage() {
  const router = useRouter();

  const [me, setMe] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1) 로그인 확인 + 초기 유저 목록 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;

      if (!uid) {
        router.push("/login");
        return;
      }

      setMe(uid);

      // 초기엔 최근 유저 20명 정도
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .neq("id", uid)
        .order("id", { ascending: false })
        .limit(20);

      if (error) setErrorMsg(error.message);
      setProfiles((data as Profile[] | null) ?? []);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles;

    return profiles.filter((p) => {
      const name = (p.display_name ?? "").toLowerCase();
      const id8 = p.id.slice(0, 8).toLowerCase();
      return name.includes(term) || id8.includes(term);
    });
  }, [profiles, q]);

  const refreshSearch = async () => {
    if (!me) return;

    setLoading(true);
    setErrorMsg(null);

    // display_name 검색 (ilike)
    const term = q.trim();
    if (!term) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .neq("id", me)
        .order("id", { ascending: false })
        .limit(20);

      if (error) setErrorMsg(error.message);
      setProfiles((data as Profile[] | null) ?? []);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .neq("id", me)
      .ilike("display_name", `%${term}%`)
      .limit(30);

    if (error) setErrorMsg(error.message);
    setProfiles((data as Profile[] | null) ?? []);
    setLoading(false);
  };

  const getOrCreateConversation = async (otherId: string) => {
    if (!me) return;

    setErrorMsg(null);

    const userLow = me < otherId ? me : otherId;
    const userHigh = me < otherId ? otherId : me;

    // 1) direct_conversations에서 기존 방 찾기 (1:1)
    const { data: existing, error: findErr } = await supabase
      .from("direct_conversations")
      .select("conversation_id, user_low, user_high, created_at")
      .eq("user_low", userLow)
      .eq("user_high", userHigh)
      .maybeSingle();

    if (findErr) {
      setErrorMsg(findErr.message);
      return;
    }

    let conversationId = (existing as DirectConversation | null)?.conversation_id ?? null;

    // 2) 없으면 새로 생성
    if (!conversationId) {
      conversationId = crypto.randomUUID();

      const { error: insErr } = await supabase.from("direct_conversations").insert({
        conversation_id: conversationId,
        user_low: userLow,
        user_high: userHigh,
      });

      if (insErr) {
        setErrorMsg(insErr.message);
        return;
      }
    }

    // 3) conversation_members upsert (있어도 괜찮게)
    //    - 테이블에 unique(conversation_id, user_id) 제약이 있으면 upsert가 잘 먹음
    const { error: memErr } = await supabase.from("conversation_members").upsert(
      [
        { conversation_id: conversationId, user_id: me, last_read_at: new Date().toISOString() },
        { conversation_id: conversationId, user_id: otherId, last_read_at: null },
      ],
      { onConflict: "conversation_id,user_id" }
    );

    if (memErr) {
      // upsert가 안 먹는 환경이면 insert 중복 에러가 날 수 있음.
      // 그래도 conversation은 만들어졌으니 이동은 시켜줌.
      // 필요하면 여기서 insert-only fallback도 추가 가능.
      console.warn(memErr);
    }

    // 4) 채팅방으로 이동
    router.push(`/chats/${conversationId}`);
  };

  if (!me) return <div style={{ padding: 16 }}>로딩중…</div>;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => router.push("/chats")}
            style={{
              border: "1px solid #ddd",
              background: "white",
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            ← 채팅 목록
          </button>

          <h2 style={{ margin: 0 }}>새 채팅 시작</h2>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="상대 이름 검색 (display_name)"
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 999,
            border: "1px solid #ddd",
            outline: "none",
            background: "white",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") refreshSearch();
          }}
        />
        <button
          onClick={refreshSearch}
          style={{
            padding: "0 18px",
            height: 44,
            borderRadius: 999,
            background: "#4da6ff",
            color: "white",
            border: "none",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          검색
        </button>
      </div>

      {errorMsg && (
        <div style={{ marginTop: 12, color: "#c70000", fontWeight: 700 }}>
          {errorMsg}
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "#666" }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: "#666" }}>검색 결과가 없어.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                style={{
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 18,
                  background: "white",
                  padding: 14,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>
                    {p.display_name ?? "이름없음"}
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    @{p.id.slice(0, 8)}…
                  </div>
                </div>

                <button
                  onClick={() => getOrCreateConversation(p.id)}
                  style={{
                    border: "none",
                    background: "#4da6ff",
                    color: "white",
                    borderRadius: 999,
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  채팅하기 →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}