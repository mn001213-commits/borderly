"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  reporterId: string; // 로그인 유저 id
  targetId: string;   // 신고 대상 유저 id
  conversationId?: string; // 있으면 저장(선택)
  onDone?: () => void;
};

export default function ReportUserButton({
  reporterId,
  targetId,
  conversationId,
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);

    if (!reason.trim()) {
      setMsg("신고 사유를 입력해줘.");
      return;
    }
    if (!reporterId || !targetId) {
      setMsg("유저 정보가 부족해. 로그인/상대 유저를 확인해줘.");
      return;
    }

    setLoading(true);

    const payload: any = {
      reporter_id: reporterId,
      target_id: targetId,
      reason: reason.trim(),
    };

    // (선택) conversation_id 컬럼을 만들었다면 같이 넣기
    if (conversationId) payload.conversation_id = conversationId;

    const { error } = await supabase.from("reports").insert(payload);

    setLoading(false);

    if (error) {
      setMsg("신고 등록 실패: " + error.message);
      return;
    }

    setReason("");
    setOpen(false);
    onDone?.();
    alert("신고가 접수됐어.");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid #ddd",
          background: "white",
          cursor: "pointer",
        }}
      >
        신고하기
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: 420,
              maxWidth: "90vw",
              background: "white",
              borderRadius: 14,
              padding: 16,
              border: "1px solid #eee",
            }}
          >
            <h3 style={{ marginTop: 0 }}>신고 사유</h3>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="예) 욕설/사기 의심/성희롱 등 구체적으로 적어줘"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ddd",
                resize: "vertical",
              }}
            />

            {msg && <p style={{ margin: "8px 0", color: "#b00020" }}>{msg}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setOpen(false);
                  setMsg(null);
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #ddd",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                취소
              </button>

              <button
                onClick={submit}
                disabled={loading}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                  cursor: "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "접수 중..." : "신고 접수"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}