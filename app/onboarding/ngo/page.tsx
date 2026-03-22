"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { Building2, Globe, FileText, Send } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

export default function NgoOnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useT();

  const [orgName, setOrgName] = useState("");
  const [orgPurpose, setOrgPurpose] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = orgName.trim().length >= 2 && orgPurpose.trim().length >= 5 && purpose.trim().length >= 10;

  const onSubmit = async () => {
    if (!canSubmit || !user) return;

    setBusy(true);
    setError(null);

    // Save NGO info to profile
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        ngo_org_name: orgName.trim(),
        ngo_org_purpose: orgPurpose.trim(),
        ngo_org_url: orgUrl.trim() || null,
        ngo_purpose: purpose.trim(),
        ngo_status: "pending",
      })
      .eq("id", user.id);

    if (updateErr) {
      setError(updateErr.message);
      setBusy(false);
      return;
    }

    // Notify admin via API
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/ngo-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          org_name: orgName.trim(),
          org_purpose: orgPurpose.trim(),
          org_url: orgUrl.trim(),
          purpose: purpose.trim(),
        }),
      });
    } catch {
      // Email notification is best-effort
    }

    setBusy(false);
    router.push("/onboarding/ngo/pending");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-8">
        <div className="b-card b-animate-in p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--light-blue)" }}>
              <Building2 className="h-5 w-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{t("ngoOnboarding.title")}</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("ngoOnboarding.subtitle")}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Organization Name */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Building2 className="h-3.5 w-3.5" />
                {t("ngoOnboarding.orgName")}
              </label>
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder={t("ngoOnboarding.orgNamePlaceholder")}
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            {/* Organization Purpose */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <FileText className="h-3.5 w-3.5" />
                {t("ngoOnboarding.orgPurpose")}
              </label>
              <textarea
                value={orgPurpose}
                onChange={(e) => setOrgPurpose(e.target.value)}
                placeholder={t("ngoOnboarding.orgPurposePlaceholder")}
                disabled={busy}
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
              <p className="mt-1 text-[11px]" style={{ color: orgPurpose.trim().length >= 5 ? "var(--text-muted)" : "#B91C1C" }}>
                {t("ngoOnboarding.orgPurposeMin")}
              </p>
            </div>

            {/* Organization URL */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Globe className="h-3.5 w-3.5" />
                {t("ngoOnboarding.orgUrl")}
                <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>({t("common.optional")})</span>
              </label>
              <input
                value={orgUrl}
                onChange={(e) => setOrgUrl(e.target.value)}
                placeholder="https://example.org"
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            {/* Activity Purpose */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <FileText className="h-3.5 w-3.5" />
                {t("ngoOnboarding.purpose")}
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t("ngoOnboarding.purposePlaceholder")}
                disabled={busy}
                rows={4}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
              <p className="mt-1 text-[11px]" style={{ color: purpose.trim().length >= 10 ? "var(--text-muted)" : "#B91C1C" }}>
                {t("ngoOnboarding.purposeMin")}
              </p>
            </div>

            <button
              onClick={onSubmit}
              disabled={!canSubmit || busy}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              <Send className="h-4 w-4" />
              {busy ? t("ngoOnboarding.submitting") : t("ngoOnboarding.submit")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
