"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";
import { ArrowLeft, Settings, Save, CheckCircle, LogOut, KeyRound, Camera, User, Globe } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { setLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

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

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const all = useMemo(() => getCountryList("en"), []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all.slice(0, 50);
    return all.filter((c) => c.name.toLowerCase().includes(t)).slice(0, 120);
  }, [q, all]);

  const selectedName = countryName(value, "en");

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

export default function SettingsPage() {
  const router = useRouter();
  const currentLocale = useLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
  const [languages, setLanguages] = useState<string[]>([]);
  const [socialStatus, setSocialStatus] = useState<string>("worker");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;

      if (!uid) {
        router.replace("/login");
        return;
      }

      setEmail(u.user?.email ?? "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, country_code, languages, social_status, avatar_url, bio")
        .eq("id", uid)
        .maybeSingle();

      if (prof) {
        setDisplayName(prof.display_name ?? "");
        setCountryCode(prof.country_code ?? "KR");
        setLanguages(prof.languages ?? []);
        setSocialStatus(prof.social_status ?? "worker");
        setAvatarUrl(prof.avatar_url ?? null);
        setBio(prof.bio ?? "");
      }

      setLoading(false);
    };

    load();
  }, [router]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorMsg(null);

    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${uid}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setErrorMsg(uploadError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", uid);

      if (updateError) {
        setErrorMsg(updateError.message);
        return;
      }

      setAvatarUrl(publicUrl);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSaved(false);

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;

    const { error } = await supabase.from("profiles").upsert(
      {
        id: uid,
        display_name: displayName.trim() || "Unnamed User",
        country_code: countryCode,
        languages,
        social_status: socialStatus,
        avatar_url: avatarUrl,
        bio: bio.trim(),
      },
      { onConflict: "id" }
    );

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto w-full max-w-lg px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-[#F0F7FF]/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-100">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold tracking-tight">Settings</div>
                <div className="text-xs text-gray-500">Manage your profile and account</div>
              </div>
            </div>

            <Link
              href="/profile"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
            >
              <ArrowLeft className="h-4 w-4" />
              Profile
            </Link>
          </div>
        </header>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {saved && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Settings saved successfully.
          </div>
        )}

        {/* Language Section */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-4">
            <Globe className="h-4 w-4 text-gray-400" />
            Language / 言語
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                currentLocale === "en"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLocale("ja")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                currentLocale === "ja"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-[#F0F7FF]"
              }`}
            >
              日本語
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-900 mb-4">Profile</div>

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 ring-2 ring-gray-200">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-[#F0F7FF] disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                {uploadingAvatar ? "Uploading..." : "Change Avatar"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400 resize-none"
              />
              <div className="mt-1 text-right text-xs text-gray-400">{bio.length}/500</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
              <input
                value={email}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500"
              />
            </div>

            <CountrySelect value={countryCode} onChange={setCountryCode} />

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Languages</label>
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
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-gray-900 mb-4">Account</div>

          <div className="space-y-3">
            <Link
              href="/reset-password"
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
            >
              <KeyRound className="h-4 w-4 text-gray-400" />
              Change Password
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "Logging out..." : "Log Out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
