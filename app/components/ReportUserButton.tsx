"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  reporterId: string;
  targetId: string;
  conversationId?: string;
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
      setMsg("Please enter a reason for the report.");
      return;
    }
    if (!reporterId || !targetId) {
      setMsg("User info is missing. Please check your login status.");
      return;
    }

    setLoading(true);

    const payload: any = {
      reporter_id: reporterId,
      target_id: targetId,
      reason: reason.trim(),
    };

    if (conversationId) payload.conversation_id = conversationId;

    const { error } = await supabase.from("reports").insert(payload);

    setLoading(false);

    if (error) {
      setMsg("Report failed: " + error.message);
      return;
    }

    setReason("");
    setOpen(false);
    onDone?.();
    alert("Report submitted successfully.");
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
        Report
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
            <h3 style={{ marginTop: 0 }}>Report Reason</h3>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder="e.g. harassment, spam, scam, etc."
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
                Cancel
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
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
