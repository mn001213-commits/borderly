"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";

const LANGS = [
  { key: "ko", label: "Korean" },
  { key: "ja", label: "Japanese" },
  { key: "en", label: "English" },
  { key: "id", label: "Indonesian" },
  { key: "zh", label: "Chinese" },
  { key: "es", label: "Spanish" },
  { key: "ar", label: "Arabic" },
  { key: "fr", label: "French" },
] as const;

const SITUATIONS = [
  { key: "living_in_japan", label: "Living in Japan", desc: "Worker, student, resident, etc." },
  { key: "refugee", label: "Refugee / Asylum Seeker", desc: "Seeking protection or asylum" },
  { key: "planning_move", label: "Planning to move to Japan", desc: "Preparing to relocate" },
  { key: "visiting", label: "Just visiting", desc: "Tourist or short-term stay" },
  { key: "supporting", label: "Supporting from abroad", desc: "Helping others remotely" },
] as const;

const PURPOSES = [
  { key: "social", label: "Social" },
  { key: "volunteering", label: "Volunteering" },
  { key: "ngo_support", label: "NGO Support" },
  { key: "visa_legal", label: "Visa/Legal Help" },
  { key: "find_help", label: "Find Help" },
  { key: "other", label: "Other" },
] as const;

function CountrySelect({
  value,
  onChange,
  lang = "en",
}: {
  value: string;
  onChange: (code: string) => void;
  lang?: "ko" | "en";
}) {
  const all = useMemo(() => getCountryList(lang), [lang]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all.slice(0, 50);
    return all.filter((c) => c.name.toLowerCase().includes(t)).slice(0, 120);
  }, [q, all]);

  const selectedName = countryName(value, lang);

  return (
    <div className="relative">
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
        placeholder="Search country..."
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
      />

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-60 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No results</div>
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
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#F0F7FF] ${
                  c.code === value ? "bg-gray-100 font-medium text-gray-900" : ""
                }`}
              >
                {c.name} <span className="text-gray-400">({c.code})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Step 1: Languages
  const [languages, setLanguages] = useState<string[]>([]);

  // Step 2: Country
  const [countryCode, setCountryCode] = useState("");

  // Step 3: Situation
  const [situation, setSituation] = useState("");

  // Step 4: Purpose
  const [purposes, setPurposes] = useState<string[]>([]);

  const toggleLang = (key: string) => {
    setLanguages((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

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
        .select("use_purpose, languages, country_code, social_status")
        .eq("id", uid)
        .single();

      if (profile?.use_purpose) {
        router.replace("/");
        return;
      }

      // Pre-fill any existing data
      if (profile?.languages && Array.isArray(profile.languages) && profile.languages.length > 0) {
        setLanguages(profile.languages);
      }
      if (profile?.country_code) {
        setCountryCode(profile.country_code);
      }
      if (profile?.social_status) {
        setSituation(profile.social_status);
      }

      setLoading(false);
    })();
  }, [router]);

  const canNext = () => {
    switch (step) {
      case 1:
        return languages.length >= 1;
      case 2:
        return countryCode.length === 2;
      case 3:
        return situation !== "";
      case 4:
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
        country_code: countryCode,
        social_status: situation,
        use_purpose: purposes.join(", "),
      },
      { onConflict: "id" }
    );

    setSaving(false);

    if (error) {
      setErrorMsg("Save failed: " + error.message);
      return;
    }

    router.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F7FF]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-12">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Step {step} of {totalSteps}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {/* Step 1: Welcome + Languages */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome to Borderly!</h1>
              <p className="text-sm text-gray-500 mb-6">
                Let&apos;s set up your profile. First, select the languages you speak.
              </p>

              <label className="block text-xs font-medium text-gray-500 mb-2">
                Select your languages
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => toggleLang(l.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      languages.includes(l.key)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Country */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold mb-1">Where are you from?</h1>
              <p className="text-sm text-gray-500 mb-6">
                This helps us connect you with relevant communities.
              </p>

              <label className="block text-xs font-medium text-gray-500 mb-2">
                Country
              </label>
              <CountrySelect value={countryCode} onChange={setCountryCode} lang="en" />
            </div>
          )}

          {/* Step 3: Situation */}
          {step === 3 && (
            <div>
              <h1 className="text-2xl font-bold mb-1">What&apos;s your situation?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Help us understand how we can best support you.
              </p>

              <div className="space-y-3">
                {SITUATIONS.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSituation(s.key)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      situation === s.key
                        ? "border-blue-600 bg-[#F0F7FF] ring-1 ring-black"
                        : "border-gray-200 bg-white hover:bg-[#F0F7FF]"
                    }`}
                  >
                    <div className="font-medium text-sm">{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Purpose */}
          {step === 4 && (
            <div>
              <h1 className="text-2xl font-bold mb-1">What brings you to Borderly?</h1>
              <p className="text-sm text-gray-500 mb-6">
                Select all that apply. You can change this later in Settings.
              </p>

              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => togglePurpose(p.key)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      purposes.includes(p.key)
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
              >
                Back
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
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            )}

            {step === totalSteps && (
              <button
                type="button"
                disabled={!canNext() || saving}
                onClick={onComplete}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Complete"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
