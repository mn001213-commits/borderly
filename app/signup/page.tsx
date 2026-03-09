"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";
import { ArrowLeft, UserPlus } from "lucide-react";

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
      <label className="block text-xs font-medium text-gray-500 mb-1.5">Country</label>
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
        className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
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
                  c.code === value ? "bg-gray-100 font-medium" : ""
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

const SOCIAL = [
  { key: "worker", label: "Worker" },
  { key: "job_seeker", label: "Job Seeker" },
  { key: "student", label: "Student" },
  { key: "homemaker", label: "Homemaker" },
  { key: "freelancer", label: "Freelancer" },
  { key: "self_employed", label: "Self-employed" },
  { key: "retired", label: "Retired" },
  { key: "other", label: "Other" },
] as const;

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [countryCode, setCountryCode] = useState("KR");
  const [languages, setLanguages] = useState<string[]>(["ko"]);
  const [socialStatus, setSocialStatus] = useState<(typeof SOCIAL)[number]["key"]>("worker");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      pw.length >= 6 &&
      displayName.trim().length >= 1 &&
      countryCode.trim().length === 2 &&
      languages.length >= 1 &&
      !!socialStatus
    );
  }, [email, pw, displayName, countryCode, languages, socialStatus]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

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

    const uid = data.user?.id;
    if (!uid) {
      setBusy(false);
      setErrorMsg("Sign up succeeded but could not retrieve user info.");
      return;
    }

    const { error: pErr } = await supabase.from("profiles").upsert(
      {
        id: uid,
        display_name: displayName.trim(),
        country_code: countryCode,
        languages,
        social_status: socialStatus,
      },
      { onConflict: "id" }
    );

    if (pErr) {
      setBusy(false);
      setErrorMsg(pErr.message);
      return;
    }

    setBusy(false);
    setOkMsg("Account created! Redirecting...");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto w-full max-w-md px-4 pb-24 pt-8">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <UserPlus className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Sign Up</h1>
              <p className="text-xs text-gray-500">Create your Borderly account</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                options: { redirectTo: window.location.origin },
              });
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
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
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                disabled={busy}
                className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="At least 6 characters"
                disabled={busy}
                className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. borderly_user"
                disabled={busy}
                className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 disabled:opacity-70"
              />
            </div>

            <CountrySelect value={countryCode} onChange={setCountryCode} lang="en" />

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Languages (select at least 1)
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setLanguages((prev) => toggle(prev, l.key))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
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

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <div className="flex flex-wrap gap-2">
                {SOCIAL.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSocialStatus(s.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      socialStatus === s.key
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={onSignup}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Creating account..." : "Create Account"}
            </button>

            <div className="text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link href="/login" className="text-gray-900 font-medium hover:underline">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
