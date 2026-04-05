"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";
import { ArrowLeft, UserPlus, Users, Globe, Building2 } from "lucide-react";
import { getAllLanguages, langLabel } from "@/lib/languages";
import { useT } from "@/app/components/LangProvider";
import LangSwitcher from "@/app/components/LangSwitcher";

function CountrySelect({
  value,
  onChange,
  lang = "en",
  label = "Country",
}: {
  value: string;
  onChange: (code: string) => void;
  lang?: "ko" | "en";
  label?: string;
}) {
  const { t } = useT();
  const all = useMemo(() => getCountryList(lang), [lang]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((c) => c.name.toLowerCase().includes(t));
  }, [q, all]);

  const selectedName = countryName(value, lang);

  return (
    <div className="relative">
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <input
        value={open ? q : selectedName}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQ("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={t("signup.searchCountry")}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--text-muted)]"
        style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
      />

      {open && (
        <div
          className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-60 overflow-auto rounded-xl shadow-lg"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{t("settings.noResults")}</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-sm"
                style={{
                  background: c.code === value ? "var(--light-blue)" : undefined,
                  fontWeight: c.code === value ? 500 : undefined,
                }}
                onMouseEnter={(e) => { if (c.code !== value) e.currentTarget.style.background = "var(--light-blue)"; }}
                onMouseLeave={(e) => { if (c.code !== value) e.currentTarget.style.background = ""; }}
              >
                {c.name} <span style={{ color: "var(--text-muted)" }}>({c.code})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}


function LanguageSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (langs: string[]) => void;
}) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const allLangs = useMemo(() => getAllLanguages(), []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return allLangs;
    return allLangs.filter((l) => l.label.toLowerCase().includes(t) || l.key.includes(t));
  }, [q, allLangs]);

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("signup.languages")}</label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white transition"
              style={{ background: "var(--primary)", border: "1px solid var(--primary)" }}
            >
              {langLabel(key)} ×
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
          placeholder={t("signup.searchLanguages")}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[var(--text-muted)]"
          style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
        />

        {open && (
          <div
            className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-48 overflow-auto rounded-xl shadow-lg"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{t("settings.noResults")}</div>
            ) : (
              filtered.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(l.key)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between"
                  style={{
                    background: selected.includes(l.key) ? "var(--light-blue)" : undefined,
                    fontWeight: selected.includes(l.key) ? 500 : undefined,
                    color: selected.includes(l.key) ? "var(--primary)" : undefined,
                  }}
                  onMouseEnter={(e) => { if (!selected.includes(l.key)) e.currentTarget.style.background = "var(--light-blue)"; }}
                  onMouseLeave={(e) => { if (!selected.includes(l.key)) e.currentTarget.style.background = ""; }}
                >
                  {l.label} <span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.key}</span>
                  {selected.includes(l.key) && <span className="ml-2" style={{ color: "var(--primary)" }}>✓</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const { t } = useT();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [userType, setUserType] = useState<"local" | "foreigner" | "ngo">("foreigner");
  const [residenceCountry, setResidenceCountry] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);

  // NGO fields
  const [orgName, setOrgName] = useState("");
  const [orgPurpose, setOrgPurpose] = useState("");
  const [orgUrl, setOrgUrl] = useState("");
  const [ngoPurpose, setNgoPurpose] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Reset all fields whenever the page mounts
  useEffect(() => {
    setEmail("");
    setPw("");
    setDisplayName("");
    setUserType("foreigner");
    setResidenceCountry("");
    setOriginCountry("");
    setLanguages([]);
    setOrgName("");
    setOrgPurpose("");
    setOrgUrl("");
    setNgoPurpose("");
    setErrorMsg(null);
    setOkMsg(null);
  }, []);

  const pwHasUpper = /[A-Z]/.test(pw);
  const pwHasLower = /[a-z]/.test(pw);
  const pwHasNumber = /[0-9]/.test(pw);
  const pwStrong = pw.length >= 8 && pwHasUpper && pwHasLower && pwHasNumber;

  const canSubmit = useMemo(() => {
    const baseValid =
      email.trim().length > 3 &&
      pw.length >= 8 &&
      pwHasUpper &&
      pwHasLower &&
      pwHasNumber &&
      displayName.trim().length >= 1 &&
      displayName.trim().length <= 30 &&
      residenceCountry.trim().length === 2 &&
      originCountry.trim().length === 2 &&
      languages.length >= 1;

    if (userType === "ngo") {
      return baseValid &&
        orgName.trim().length >= 2 &&
        orgPurpose.trim().length >= 5 &&
        ngoPurpose.trim().length >= 10;
    }
    return baseValid;
  }, [email, pw, pwHasUpper, pwHasLower, pwHasNumber, displayName, residenceCountry, originCountry, languages, userType, orgName, orgPurpose, ngoPurpose]);

  const onSignup = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setErrorMsg(null);
    setOkMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (error) {
      setBusy(false);
      setErrorMsg(error.message);
      return;
    }

    // Supabase returns a fake user with no session when email already exists
    if (data.user && !data.session && data.user.identities?.length === 0) {
      setBusy(false);
      setErrorMsg(t("signup.alreadyExists"));
      return;
    }

    const uid = data.user?.id;
    if (!uid) {
      setBusy(false);
      setErrorMsg(t("signup.noUserInfo"));
      return;
    }

    const profileData: Record<string, unknown> = {
      id: uid,
      display_name: displayName.trim(),
      residence_country: residenceCountry || null,
      origin_country: originCountry || null,
      languages,
      user_type: userType,
      ngo_verified: false,
    };

    // Add NGO fields if user type is ngo
    if (userType === "ngo") {
      profileData.ngo_org_name = orgName.trim();
      profileData.ngo_org_purpose = orgPurpose.trim();
      profileData.ngo_org_url = orgUrl.trim() || null;
      profileData.ngo_purpose = ngoPurpose.trim();
      profileData.ngo_status = "pending";
    }

    // Try client-side upsert first (works when session exists)
    const { error: pErr } = await supabase.from("profiles").upsert(profileData, { onConflict: "id" });

    if (pErr) {
      // Fallback to server-side API if client RLS blocks
      try {
        const profileRes = await fetch("/api/signup-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileData),
        });
        if (!profileRes.ok) {
          const { error: msg } = await profileRes.json().catch(() => ({ error: "Profile creation failed" }));
          setBusy(false);
          setErrorMsg(msg || "Profile creation failed");
          return;
        }
      } catch {
        setBusy(false);
        setErrorMsg("Profile creation failed. Please try again.");
        return;
      }
    }

    // Send NGO request email (best-effort)
    if (userType === "ngo") {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          await fetch("/api/ngo-request", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              org_name: orgName.trim(),
              org_purpose: orgPurpose.trim(),
              org_url: orgUrl.trim(),
              purpose: ngoPurpose.trim(),
            }),
          });
        }
      } catch {
        // Email notification is best-effort
      }
    }

    setBusy(false);
    // NGO users go to pending page, regular users go to email verification page
    const redirectUrl = userType === "ngo"
      ? "/onboarding/ngo/pending"
      : `/signup/verify-email?email=${encodeURIComponent(email.trim())}`;
    router.push(redirectUrl);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nav.home")}
          </Link>
          <LangSwitcher />
        </div>

        <div className="b-card b-animate-in mt-6 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--light-blue)" }}>
              <UserPlus className="h-5 w-5" style={{ color: "var(--primary)" }} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--deep-navy)" }}>{t("common.signup")}</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("signup.subtitle")}</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
              {errorMsg}
            </div>
          )}

          {okMsg && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {okMsg}
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${window.location.origin}/onboarding` },
              });
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm font-medium transition"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.56-2.77z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {t("auth.google")}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("auth.or")}</span>
            <div className="h-px flex-1" style={{ background: "var(--border-soft)" }} />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("auth.email")}</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("auth.password")}</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={t("signup.pwPlaceholder") || "Min 8 chars, uppercase, lowercase, number"}
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
              {pw.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[pw.length >= 8, pwHasUpper, pwHasLower, pwHasNumber].map((ok, i) => (
                      <div key={i} className="h-1 flex-1 rounded-full" style={{ background: ok ? "#22C55E" : "var(--border-soft)" }} />
                    ))}
                  </div>
                  <div className="text-[11px]" style={{ color: pwStrong ? "#22C55E" : "var(--text-muted)" }}>
                    {!pwStrong ? (t("signup.pwRequirements") || "8+ chars, uppercase, lowercase, number") : (t("signup.pwStrong") || "Strong password")}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("signup.displayName")}</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
                placeholder={t("signup.displayNamePlaceholder")}
                maxLength={30}
                disabled={busy}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("signup.iAmA")}</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "local" as const, label: t("signup.local"), icon: Users },
                  { value: "foreigner" as const, label: t("signup.foreigner"), icon: Globe },
                  { value: "ngo" as const, label: t("signup.partner"), icon: Building2 },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUserType(opt.value)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-xs font-semibold transition"
                    style={{
                      borderColor: userType === opt.value ? "var(--primary)" : "var(--border-soft)",
                      background: userType === opt.value ? "var(--light-blue)" : "var(--bg-card)",
                      color: userType === opt.value ? "var(--primary)" : "var(--text-secondary)",
                    }}
                  >
                    <opt.icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                ))}
              </div>
              {userType === "ngo" && (
                <div className="mt-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
                  {t("signup.ngoNotice")}
                </div>
              )}
            </div>

            {/* NGO Information Fields */}
            {userType === "ngo" && (
              <div className="space-y-4 p-4 rounded-xl" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                  <Building2 className="h-4 w-4" />
                  {t("ngoOnboarding.title") || "Organization Information"}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {t("ngoOnboarding.orgName") || "Organization Name"} *
                  </label>
                  <input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t("ngoOnboarding.orgNamePlaceholder") || "Enter organization name"}
                    disabled={busy}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {t("ngoOnboarding.orgPurpose") || "Organization Purpose"} *
                  </label>
                  <textarea
                    value={orgPurpose}
                    onChange={(e) => setOrgPurpose(e.target.value)}
                    placeholder={t("ngoOnboarding.orgPurposePlaceholder") || "Describe your organization"}
                    disabled={busy}
                    rows={2}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none disabled:opacity-70"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                  />
                  <p className="mt-1 text-[11px]" style={{ color: orgPurpose.trim().length >= 5 ? "var(--text-muted)" : "#B91C1C" }}>
                    {t("ngoOnboarding.orgPurposeMin") || "Minimum 5 characters"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {t("ngoOnboarding.orgUrl") || "Website"} ({t("common.optional") || "Optional"})
                  </label>
                  <input
                    value={orgUrl}
                    onChange={(e) => setOrgUrl(e.target.value)}
                    placeholder="https://example.org"
                    disabled={busy}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-70"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    {t("ngoOnboarding.purpose") || "Activity Purpose"} *
                  </label>
                  <textarea
                    value={ngoPurpose}
                    onChange={(e) => setNgoPurpose(e.target.value)}
                    placeholder={t("ngoOnboarding.purposePlaceholder") || "Why do you want to use Borderly?"}
                    disabled={busy}
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none disabled:opacity-70"
                    style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                  />
                  <p className="mt-1 text-[11px]" style={{ color: ngoPurpose.trim().length >= 10 ? "var(--text-muted)" : "#B91C1C" }}>
                    {t("ngoOnboarding.purposeMin") || "Minimum 10 characters"}
                  </p>
                </div>
              </div>
            )}

            <CountrySelect value={residenceCountry} onChange={setResidenceCountry} lang="en" label={t("profile.residenceCountry")} />
            <CountrySelect value={originCountry} onChange={setOriginCountry} lang="en" label={t("profile.originCountry")} />

            <LanguageSelect selected={languages} onChange={setLanguages} />

            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={onSignup}
              className="w-full rounded-2xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "var(--primary)" }}
            >
              {busy ? t("signup.creating") : t("signup.createAccount")}
            </button>

            <div className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="font-medium hover:underline" style={{ color: "var(--deep-navy)" }}>
                {t("common.login")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
