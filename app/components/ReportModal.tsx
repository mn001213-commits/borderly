"use client";

import { useState } from "react";
import { ShieldAlert, X, CheckCircle } from "lucide-react";

type ReportModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string, detail: string) => Promise<void>;
  t: (key: string) => string;
};

const REASON_KEYS = ["spam", "abuse", "hate", "scam", "other"] as const;

export default function ReportModal({ open, onClose, onSubmit, t }: ReportModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonLabels: Record<string, Record<string, string>> = {
    spam: { en: "Spam", ko: "스팸", ja: "スパム" },
    abuse: { en: "Abuse", ko: "욕설", ja: "悪用" },
    hate: { en: "Hate speech", ko: "혐오 발언", ja: "ヘイトスピーチ" },
    scam: { en: "Scam", ko: "사기", ja: "詐欺" },
    other: { en: "Other", ko: "기타", ja: "その他" },
  };

  const getLabel = (key: string) => {
    const labels = reasonLabels[key];
    if (!labels) return key;
    const lang = (typeof window !== "undefined" && localStorage.getItem("borderly-lang")) || "en";
    return labels[lang] || labels.en;
  };

  const handleSubmit = async () => {
    if (!reason) {
      setError(t("report.selectReason"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(reason, detail);
      setStep("success");
    } catch (err: any) {
      setError(err?.message ?? t("post.reportFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setReason("");
    setDetail("");
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!open) return null;

  return (
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
        {step === "form" ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: "#FEE2E2" }}
                >
                  <ShieldAlert className="h-5 w-5" style={{ color: "#DC2626" }} />
                </div>
                <div>
                  <div className="text-base font-bold" style={{ color: "var(--deep-navy)" }}>
                    {t("post.report")}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {t("report.subtitle")}
                  </div>
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
                {t("report.reasonLabel")}
              </div>
              <div className="flex flex-wrap gap-2">
                {REASON_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setReason(key); setError(null); }}
                    className="rounded-xl px-3.5 py-2 text-sm font-medium transition"
                    style={{
                      background: reason === key ? "var(--primary)" : "var(--light-blue)",
                      color: reason === key ? "#fff" : "var(--text-secondary)",
                      border: reason === key ? "1px solid var(--primary)" : "1px solid var(--border-soft)",
                    }}
                  >
                    {getLabel(key)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium mb-2" style={{ color: "var(--deep-navy)" }}>
                {t("report.detailLabel")}
              </div>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                rows={3}
                placeholder={t("report.detailPlaceholder")}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                style={{
                  background: "var(--light-blue)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--deep-navy)",
                }}
              />
            </div>

            {error && (
              <div
                className="mb-4 rounded-xl px-4 py-3 text-sm"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}
              >
                {error}
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
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-2xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "#DC2626" }}
              >
                {loading ? t("post.reporting") : t("report.submit")}
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
              {t("post.reportSubmitted")}
            </div>
            <div className="text-sm text-center mb-5" style={{ color: "var(--text-secondary)" }}>
              {t("report.thankYou")}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-2xl px-8 py-3 text-sm font-medium text-white transition hover:opacity-90"
              style={{ background: "var(--primary)" }}
            >
              {t("report.close")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
