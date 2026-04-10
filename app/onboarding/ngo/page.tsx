"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/app/components/AuthProvider";
import { ArrowLeft, Building2, Globe, FileText, Send, User, Mail, Phone } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import { getCountryList, countryName } from "@/lib/countries";

function CountryMultiSelect({
  selected,
  onChange,
  label,
  disabled,
}: {
  selected: string[];
  onChange: (codes: string[]) => void;
  label: string;
  disabled?: boolean;
}) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const allCountries = useMemo(() => getCountryList("en"), []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allCountries;
    return allCountries.filter((c) => c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term));
  }, [q, allCountries]);

  const toggle = (code: string) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        <Globe className="h-3.5 w-3.5" />
        {label}
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white transition disabled:opacity-70"
              style={{ background: "var(--primary)", border: "1px solid var(--primary)" }}
            >
              {countryName(code, "en")} ×
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
          placeholder={t("onboarding.searchCountry") || "Search countries..."}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
          style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
        />

        {open && (
          <div
            className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-48 overflow-auto rounded-xl shadow-lg"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{t("settings.noResults") || "No results"}</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(c.code)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between"
                  style={{
                    background: selected.includes(c.code) ? "var(--light-blue)" : undefined,
                    fontWeight: selected.includes(c.code) ? 500 : undefined,
                    color: selected.includes(c.code) ? "var(--primary)" : undefined,
                  }}
                  onMouseEnter={(e) => { if (!selected.includes(c.code)) e.currentTarget.style.background = "var(--light-blue)"; }}
                  onMouseLeave={(e) => { if (!selected.includes(c.code)) e.currentTarget.style.background = ""; }}
                >
                  {c.name} <span className="text-xs" style={{ color: "var(--text-muted)" }}>{c.code}</span>
                  {selected.includes(c.code) && <span className="ml-2" style={{ color: "var(--primary)" }}>✓</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NgoOnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useT();

  const [orgName, setOrgName] = useState("");
  const [orgPurpose, setOrgPurpose] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [purpose, setPurpose] = useState("");
  const [repName, setRepName] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [repPhone, setRepPhone] = useState("");
  const [activityCountries, setActivityCountries] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !loading && !!user &&
    orgName.trim().length >= 2 &&
    orgPurpose.trim().length >= 5 &&
    purpose.trim().length >= 10 &&
    repName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repEmail.trim()) &&
    repPhone.trim().length >= 5 &&
    activityCountries.length >= 1;

  const onSubmit = async () => {
    if (loading) return;
    if (!user) {
      setError(t("common.loginRequired") || "Please log in first");
      return;
    }
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Session expired. Please log in again.");
      setBusy(false);
      return;
    }

    const res = await fetch("/api/ngo-onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        org_name: orgName.trim(),
        org_purpose: orgPurpose.trim(),
        org_url: orgUrl.trim() || null,
        purpose: purpose.trim(),
        rep_name: repName.trim(),
        rep_email: repEmail.trim(),
        rep_phone: repPhone.trim(),
        activity_countries: activityCountries,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: "Failed to submit" }));
      const msg = body.detail ? `${body.error}: ${body.detail}` : body.error;
      setError(msg || "Failed to submit");
      setBusy(false);
      return;
    }

    // Notify admin via email (best-effort)
    try {
      await fetch("/api/ngo-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          org_name: orgName.trim(),
          org_purpose: orgPurpose.trim(),
          org_url: orgUrl.trim(),
          purpose: purpose.trim(),
          rep_name: repName.trim(),
          rep_email: repEmail.trim(),
          rep_phone: repPhone.trim(),
          activity_countries: activityCountries,
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
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium mb-4 hover:opacity-70 transition"
          style={{ color: "var(--primary)" }}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back") || "Back"}
        </button>
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
                {t("ngoOnboarding.orgName")} *
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
                {t("ngoOnboarding.orgPurpose")} *
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
                {t("ngoOnboarding.purpose")} *
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

            {/* Activity Countries */}
            <CountryMultiSelect
              selected={activityCountries}
              onChange={setActivityCountries}
              label={`${t("ngoOnboarding.activityCountries")} *`}
              disabled={busy}
            />

            {/* Representative Info */}
            <div className="pt-3 border-t" style={{ borderColor: "var(--border-soft)" }}>
              <p className="flex items-center gap-1.5 text-xs font-semibold mb-3" style={{ color: "var(--deep-navy)" }}>
                <User className="h-3.5 w-3.5" />
                {t("ngoOnboarding.repName")}
              </p>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <User className="h-3.5 w-3.5" />
                {t("ngoOnboarding.repName")} *
              </label>
              <input
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder={t("ngoOnboarding.repNamePlaceholder")}
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Mail className="h-3.5 w-3.5" />
                {t("ngoOnboarding.repEmail")} *
              </label>
              <input
                type="email"
                value={repEmail}
                onChange={(e) => setRepEmail(e.target.value)}
                placeholder={t("ngoOnboarding.repEmailPlaceholder")}
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                <Phone className="h-3.5 w-3.5" />
                {t("ngoOnboarding.repPhone")} *
              </label>
              <input
                type="tel"
                value={repPhone}
                onChange={(e) => setRepPhone(e.target.value)}
                placeholder={t("ngoOnboarding.repPhonePlaceholder")}
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            {loading && (
              <p className="text-xs text-center mb-2" style={{ color: "var(--text-muted)" }}>
                {t("common.loading") || "Loading..."}
              </p>
            )}
            {!loading && !user && (
              <p className="text-xs text-center mb-2" style={{ color: "#B91C1C" }}>
                {t("common.loginRequired") || "Please log in first"}
              </p>
            )}
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
