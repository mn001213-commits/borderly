"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShieldAlert, X, CheckCircle } from "lucide-react";

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
  const [success, setSuccess] = useState(false);

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

    setSuccess(true);
    onDone?.();
  };

  const handleClose = () => {
    setOpen(false);
    setMsg(null);
    setReason("");
    setSuccess(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl px-3 py-2 text-sm font-medium transition hover:opacity-80"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-soft)",
          color: "var(--text-secondary)",
        }}
      >
        Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          onClick={handleClose}
        >
          <div
            className="b-animate-in w-full max-w-md rounded-2xl p-6"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {!success ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: "#FEE2E2" }}
                    >
                      <ShieldAlert className="h-5 w-5" style={{ color: "#DC2626" }} />
                    </div>
                    <div className="text-base font-bold" style={{ color: "var(--deep-navy)" }}>
                      Report User
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full p-1.5 transition hover:opacity-70"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium mb-2" style={{ color: "var(--deep-navy)" }}>
                    Reason
                  </div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    placeholder="e.g. harassment, spam, scam, etc."
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                    style={{
                      background: "var(--light-blue)",
                      border: "1px solid var(--border-soft)",
                      color: "var(--deep-navy)",
                    }}
                  />
                </div>

                {msg && (
                  <div
                    className="mb-4 rounded-xl px-4 py-3 text-sm"
                    style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}
                  >
                    {msg}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-2xl py-3 text-sm font-medium transition hover:opacity-80"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-soft)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={loading}
                    className="flex-1 rounded-2xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ background: "#DC2626" }}
                  >
                    {loading ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-4">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full mb-4"
                  style={{ background: "#DCFCE7" }}
                >
                  <CheckCircle className="h-7 w-7" style={{ color: "#16A34A" }} />
                </div>
                <div className="text-base font-bold mb-1" style={{ color: "var(--deep-navy)" }}>
                  Report submitted
                </div>
                <div className="text-sm text-center mb-5" style={{ color: "var(--text-secondary)" }}>
                  We'll review this report and take appropriate action.
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-2xl px-8 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  style={{ background: "var(--primary)" }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
