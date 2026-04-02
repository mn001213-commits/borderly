"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";
import { getAllLanguages, langLabel } from "@/lib/languages";
import { useT } from "@/app/components/LangProvider";
import { setLocale, type Locale } from "@/lib/i18n";

const PURPOSE_KEYS = [
  "social",
  "volunteering",
  "ngo_support",
  "visa_legal",
  "find_help",
  "jobs_education",
  "other",
] as const;

function CountrySelect({
  value,
  onChange,
  label,
  searchPlaceholder,
  noResultsText,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  searchPlaceholder: string;
  noResultsText: string;
}) {
  const all = useMemo(() => getCountryList("en"), []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all;
    return all.filter((c) => c.name.toLowerCase().includes(t));
  }, [q, all]);

  const selectedName = countryName(value, "en");

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">{label}</label>
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
        placeholder={searchPlaceholder}
        className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--light-blue)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
      />

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-60 overflow-auto rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--text-muted)]">{noResultsText}</div>
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
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--light-blue)] ${
                  c.code === value ? "bg-[var(--light-blue)] font-medium text-[var(--deep-navy)]" : ""
                }`}
              >
                {c.name} <span className="text-[var(--text-muted)]">({c.code})</span>
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
  labelText,
  searchPlaceholder,
  noResultsText,
}: {
  selected: string[];
  onChange: (langs: string[]) => void;
  labelText: string;
  searchPlaceholder: string;
  noResultsText: string;
}) {
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
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
        {labelText}
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-medium text-white hover:opacity-90 transition"
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
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--light-blue)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
        />

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-48 overflow-auto rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--text-muted)]">{noResultsText}</div>
            ) : (
              filtered.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(l.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--light-blue)] flex items-center justify-between ${
                    selected.includes(l.key) ? "bg-[var(--light-blue)] font-medium text-[var(--primary)]" : ""
                  }`}
                >
                  {l.label} <span className="text-[var(--text-muted)] text-xs">{l.key}</span>
                  {selected.includes(l.key) && <span className="text-[var(--primary)] ml-2">✓</span>}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  // Whether to show display name step (for Google login users without display_name)
  const [needsDisplayName, setNeedsDisplayName] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: UI Language
  const [uiLanguage, setUiLanguage] = useState<Locale>("en");

  // Step 2 (conditional): Display Name
  const [displayName, setDisplayName] = useState("");

  // Step 3: Spoken Languages
  const [languages, setLanguages] = useState<string[]>([]);

  // Step 4: Countries
  const [residenceCountry, setResidenceCountry] = useState("");
  const [originCountry, setOriginCountry] = useState("");

  // Step 5: Purpose
  const [purposes, setPurposes] = useState<string[]>([]);
  const [otherDescription, setOtherDescription] = useState("");

  // Calculate total steps based on whether display name is needed
  // Always include UI language as step 1
  const totalSteps = needsDisplayName ? 5 : 4;
  const displayStep = step;

  const togglePurpose = (key: string) => {
    setPurposes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setMyId(uid);

      // Initialize UI language from localStorage
      const storedLocale = localStorage.getItem("borderly-locale");
      if (storedLocale === "ko" || storedLocale === "ja" || storedLocale === "en") {
        setUiLanguage(storedLocale);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, use_purpose, languages, residence_country, origin_country")
        .eq("id", uid)
        .maybeSingle();

      // If profile is complete, redirect to home
      if (profile?.use_purpose && profile?.languages?.length > 0 && profile?.residence_country && profile?.origin_country && profile?.display_name) {
        router.replace("/");
        return;
      }

      // Check if display_name is needed
      if (!profile?.display_name) {
        setNeedsDisplayName(true);
      } else {
        setDisplayName(profile.display_name);
      }

      // Load existing data
      if (profile?.languages && Array.isArray(profile.languages) && profile.languages.length > 0) {
        setLanguages(profile.languages);
      }
      if (profile?.residence_country) {
        setResidenceCountry(profile.residence_country);
      }
      if (profile?.origin_country) {
        setOriginCountry(profile.origin_country);
      }

      setLoading(false);
    })();
  }, [router]);

  const canNext = () => {
    if (needsDisplayName) {
      switch (step) {
        case 1:
          return true; // UI language always valid (has default)
        case 2:
          return displayName.trim().length >= 2;
        case 3:
          return languages.length >= 1;
        case 4:
          return residenceCountry.length === 2 && originCountry.length === 2;
        case 5:
          return purposes.length >= 1;
        default:
          return false;
      }
    } else {
      switch (step) {
        case 1:
          return true; // UI language always valid
        case 2:
          return languages.length >= 1;
        case 3:
          return residenceCountry.length === 2 && originCountry.length === 2;
        case 4:
          return purposes.length >= 1;
        default:
          return false;
      }
    }
  };

  const onComplete = async () => {
    if (!myId || purposes.length === 0) return;
    setSaving(true);
    setErrorMsg(null);

    // Determine user_type based on countries
    const userType = residenceCountry === originCountry ? "local" : "foreigner";

    // Build use_purpose array (include other description if provided)
    const finalPurposes = purposes.includes("other") && otherDescription.trim()
      ? purposes.map(p => p === "other" ? `other:${otherDescription.trim()}` : p)
      : purposes;

    const { error } = await supabase.from("profiles").upsert(
      {
        id: myId,
        display_name: displayName.trim(),
        languages,
        residence_country: residenceCountry,
        origin_country: originCountry,
        user_type: userType,
        use_purpose: finalPurposes,
      },
      { onConflict: "id" }
    );

    setSaving(false);

    if (error) {
      // User-friendly error messages
      let friendlyMessage = t("onboarding.saveFailed");

      if (error.message.includes("profiles_use_purpose_check")) {
        friendlyMessage = t("onboarding.invalidPurpose");
      } else if (error.message.includes("check constraint") || error.message.includes("violates")) {
        friendlyMessage = t("onboarding.invalidData");
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        friendlyMessage = t("onboarding.networkError");
      }

      setErrorMsg(friendlyMessage);
      console.error("Onboarding save error:", error);
      return;
    }

    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[var(--text-muted)]">{t("common.loading")}</div>
      </div>
    );
  }

  // UI Language selection component
  const renderUILanguageStep = () => {
    const uiLanguages: { value: Locale; label: string; nativeLabel: string }[] = [
      { value: "en", label: "English", nativeLabel: "English" },
      { value: "ko", label: "Korean", nativeLabel: "한국어" },
      { value: "ja", label: "Japanese", nativeLabel: "日本語" },
    ];

    return (
      <div>
        <h1 className="text-2xl font-bold mb-1 text-[var(--deep-navy)]">{t("onboarding.selectUILanguage")}</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {t("onboarding.uiLanguageDesc")}
        </p>
        <div className="space-y-3">
          {uiLanguages.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => setUiLanguage(lang.value)}
              className={`w-full text-left rounded-xl border px-4 py-4 text-sm font-medium transition ${
                uiLanguage === lang.value
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--light-blue)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base">{lang.nativeLabel}</span>
                <span className="text-xs opacity-70">{lang.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Render step content based on needsDisplayName and current step
  const renderStepContent = () => {
    if (needsDisplayName) {
      switch (step) {
        case 1:
          return renderUILanguageStep();
        case 2:
          return (
            <div>
              <h1 className="text-2xl font-bold mb-1 text-[var(--deep-navy)]">{t("onboarding.whatsYourName")}</h1>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                {t("onboarding.nameDesc")}
              </p>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                  {t("onboarding.displayNameLabel")}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("onboarding.displayNamePlaceholder")}
                  maxLength={50}
                  className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--light-blue)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
                />
              </div>
            </div>
          );
        case 3:
          return (
            <div>
              <h1 className="text-2xl font-bold mb-1 text-[var(--deep-navy)]">{t("onboarding.welcome")}</h1>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                {t("onboarding.selectLanguagesDesc")}
              </p>
              <LanguageSelect
                selected={languages}
                onChange={setLanguages}
                labelText={t("onboarding.selectLanguagesLabel")}
                searchPlaceholder={t("onboarding.searchLanguages")}
                noResultsText={t("onboarding.noResults")}
              />
            </div>
          );
        case 4:
          return (
            <div>
              <h1 className="text-2xl font-bold mb-1 text-[var(--deep-navy)]">{t("onboarding.whereAreYou")}</h1>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                {t("onboarding.countryDesc")}
              </p>
              <div className="space-y-4">
                <CountrySelect value={residenceCountry} onChange={setResidenceCountry} label={t("onboarding.residenceCountry")} searchPlaceholder={t("onboarding.searchCountry")} noResultsText={t("onboarding.noResults")} />
                <CountrySelect value={originCountry} onChange={setOriginCountry} label={t("onboarding.originCountry")} searchPlaceholder={t("onboarding.searchCountry")} noResultsText={t("onboarding.noResults")} />
              </div>
            </div>
          );
        case 5:
          return renderPurposeStep();
        default:
          return null;
      }
    } else {
      switch (step) {
        case 1:
          return renderUILanguageStep();
        case 2:
          return (
            <div>
              <h1 className="text-2xl font-bold mb-1 text-[var(--deep-navy)]">{t("onboarding.welcome")}</h1>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                {t("onboarding.selectLanguagesDesc")}
              </p>
              <LanguageSelect
                selected={languages}
                onChange={setLanguages}
                labelText={t("onboarding.selectLanguagesLabel")}
                searchPlaceholder={t("onboarding.searchLanguages")}
                noResultsText={t("onboarding.noResults")}
              />
            </div>
          );
        case 3:
          return (
            <div>
              <h1 className="text-2xl font-bold mb-1 text-[var(--deep-navy)]">{t("onboarding.whereAreYou")}</h1>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                {t("onboarding.countryDesc")}
              </p>
              <div className="space-y-4">
                <CountrySelect value={residenceCountry} onChange={setResidenceCountry} label={t("onboarding.residenceCountry")} searchPlaceholder={t("onboarding.searchCountry")} noResultsText={t("onboarding.noResults")} />
                <CountrySelect value={originCountry} onChange={setOriginCountry} label={t("onboarding.originCountry")} searchPlaceholder={t("onboarding.searchCountry")} noResultsText={t("onboarding.noResults")} />
              </div>
            </div>
          );
        case 4:
          return renderPurposeStep();
        default:
          return null;
      }
    }
  };

  const renderPurposeStep = () => (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-[var(--deep-navy)]">{t("onboarding.whatBringsYou")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {t("onboarding.purposeDesc")}
      </p>

      <div className="flex flex-wrap gap-2">
        {PURPOSE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => togglePurpose(key)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              purposes.includes(key)
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border-soft)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--light-blue)]"
            }`}
          >
            {t(`onboarding.purpose.${key}`)}
          </button>
        ))}
      </div>

      {/* Other description textarea - only show when 'other' is selected */}
      {purposes.includes("other") && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
            {t("onboarding.otherDescriptionLabel")}
          </label>
          <textarea
            value={otherDescription}
            onChange={(e) => setOtherDescription(e.target.value)}
            placeholder={t("onboarding.otherPlaceholder")}
            maxLength={200}
            rows={3}
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--light-blue)] px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] resize-none"
          />
        </div>
      )}
    </div>
  );

  const isLastStep = step === totalSteps;

  return (
    <div className="min-h-screen text-[var(--deep-navy)]">
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-12">
        {/* Progress bar */}
        <div className="mb-8 b-animate-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text-muted)] font-medium">{t("onboarding.step")} {step} / {totalSteps}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--border-soft)]">
            <div
              className="h-1.5 rounded-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="b-card p-6 b-animate-in">
          {renderStepContent()}

          {/* Error message */}
          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setStep((s) => s - 1);
                }}
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-card)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--light-blue)]"
              >
                {t("common.back")}
              </button>
            )}

            {!isLastStep && (
              <button
                type="button"
                disabled={!canNext()}
                onClick={() => {
                  setErrorMsg(null);
                  // If leaving UI language step, apply the selected locale
                  if (step === 1) {
                    setLocale(uiLanguage);
                  }
                  setStep((s) => s + 1);
                }}
                className="flex-1 rounded-2xl bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("onboarding.next")}
              </button>
            )}

            {isLastStep && (
              <button
                type="button"
                disabled={!canNext() || saving}
                onClick={onComplete}
                className="flex-1 rounded-2xl bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? t("onboarding.saving") : t("onboarding.complete")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
