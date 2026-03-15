"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";
import { getAllLanguages, langLabel } from "@/lib/languages";
import { useT } from "@/app/components/LangProvider";

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

  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Languages
  const [languages, setLanguages] = useState<string[]>([]);

  // Step 2: Countries
  const [residenceCountry, setResidenceCountry] = useState("");
  const [originCountry, setOriginCountry] = useState("");

  // Step 3: Purpose
  const [purposes, setPurposes] = useState<string[]>([]);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("use_purpose, languages, residence_country, origin_country")
        .eq("id", uid)
        .single();

      if (profile?.use_purpose) {
        router.replace("/");
        return;
      }

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
    switch (step) {
      case 1:
        return languages.length >= 1;
      case 2:
        return residenceCountry.length === 2 && originCountry.length === 2;
      case 3:
        return purposes.length >= 1;
      default:
        return false;
    }
  };

  const onComplete = async () => {
    if (!myId || purposes.length === 0) return;
    setSaving(true);
    setErrorMsg(null);

    const { error } = await supabase.from("profiles").upsert(
      {
        id: myId,
        languages,
        residence_country: residenceCountry,
        origin_country: originCountry,
        use_purpose: purposes.join(", "),
      },
      { onConflict: "id" }
    );

    setSaving(false);

    if (error) {
      setErrorMsg(t("onboarding.saveFailed") + ": " + error.message);
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
          {/* Step 1: Languages */}
          {step === 1 && (
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
          )}

          {/* Step 2: Countries */}
          {step === 2 && (
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
          )}

          {/* Step 3: Purpose */}
          {step === 3 && (
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
            </div>
          )}

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

            {step < totalSteps && (
              <button
                type="button"
                disabled={!canNext()}
                onClick={() => {
                  setErrorMsg(null);
                  setStep((s) => s + 1);
                }}
                className="flex-1 rounded-2xl bg-[var(--primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("onboarding.next")}
              </button>
            )}

            {step === totalSteps && (
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
