"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";
import { ArrowLeft, Save, CheckCircle, Camera, User } from "lucide-react";
import { getAllLanguages, langLabel } from "@/lib/languages";
import { useT } from "@/app/components/LangProvider";

function LanguageSelect({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (langs: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { t } = useT();

  const allLangs = useMemo(() => getAllLanguages(), []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allLangs;
    return allLangs.filter((l) => l.label.toLowerCase().includes(term) || l.key.includes(term));
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
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("settings.languages")}</label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className="b-pill-active inline-flex items-center gap-1 px-3 py-1 text-xs font-medium"
              style={{ height: "auto", fontSize: "12px" }}
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
          placeholder={t("settings.searchLanguages")}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-[var(--text-muted)]"
          style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
        />

        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-48 overflow-auto rounded-xl shadow-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>{t("settings.noResults")}</div>
            ) : (
              filtered.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(l.key)}
                  className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition"
                  style={{
                    background: selected.includes(l.key) ? "var(--light-blue)" : undefined,
                    fontWeight: selected.includes(l.key) ? 500 : undefined,
                    color: selected.includes(l.key) ? "var(--primary)" : "var(--deep-navy)",
                  }}
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

function CountrySelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
}) {
  const all = useMemo(() => getCountryList("en"), []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { t } = useT();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((c) => c.name.toLowerCase().includes(term));
  }, [q, all]);

  const selectedName = countryName(value, "en");

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
        placeholder={t("settings.searchCountry")}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
        style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
      />

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1.5 max-h-60 overflow-auto rounded-xl shadow-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
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
                className="w-full text-left px-4 py-2.5 text-sm transition"
                style={{
                  background: c.code === value ? "var(--light-blue)" : undefined,
                  fontWeight: c.code === value ? 500 : undefined,
                  color: "var(--deep-navy)",
                }}
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

export default function ProfileEditPage() {
  const router = useRouter();
  const { t } = useT();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [residenceCountry, setResidenceCountry] = useState("JP");
  const [originCountry, setOriginCountry] = useState("KR");
  const [languages, setLanguages] = useState<string[]>([]);
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
        .select("display_name, residence_country, origin_country, languages, avatar_url, bio")
        .eq("id", uid)
        .maybeSingle();

      if (prof) {
        setDisplayName(prof.display_name ?? "");
        setResidenceCountry(prof.residence_country ?? "JP");
        setOriginCountry(prof.origin_country ?? "KR");
        setLanguages(prof.languages ?? []);
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
        display_name: (displayName.trim() || "Unnamed User").slice(0, 30),
        residence_country: residenceCountry,
        origin_country: originCountry,
        languages,
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

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        <div className="flex items-center gap-3 py-3 mb-4">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full transition" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--deep-navy)" }} />
          </button>
          <h1 className="text-lg font-semibold" style={{ color: "var(--deep-navy)" }}>{t("settings.title")}</h1>
        </div>
        <div className="space-y-4">
          <div className="b-skeleton h-64 w-full" />
          <div className="b-skeleton h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3 py-3 mb-4">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full transition" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--deep-navy)" }} />
        </button>
        <h1 className="text-lg font-semibold" style={{ color: "var(--deep-navy)" }}>{t("settings.title")}</h1>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
          {errorMsg}
        </div>
      )}

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D" }}>
          <CheckCircle className="h-4 w-4" />
          {t("settings.savedSuccess")}
        </div>
      )}

      {/* Profile Section */}
      <div className="b-card b-animate-in p-5 mb-4">
        <div className="text-sm font-semibold mb-4" style={{ color: "var(--deep-navy)" }}>{t("settings.profile")}</div>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover"
                  style={{ border: "2px solid var(--border-soft)" }}
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                  <User className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
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
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition disabled:opacity-50"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
            >
              <Camera className="h-4 w-4" />
              {uploadingAvatar ? t("settings.uploading") : t("settings.changeAvatar")}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("settings.displayName")}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("settings.displayNamePlaceholder")}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("settings.bio")}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              placeholder={t("settings.bioPlaceholder")}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
            />
            <div className="mt-1 text-right text-xs" style={{ color: "var(--text-muted)" }}>{bio.length}/500</div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>{t("settings.email")}</label>
            <input
              value={email}
              disabled
              className="w-full rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--text-muted)", opacity: 0.7 }}
            />
          </div>

          <CountrySelect value={residenceCountry} onChange={setResidenceCountry} label={t("settings.residenceCountry")} />
          <CountrySelect value={originCountry} onChange={setOriginCountry} label={t("settings.originCountry")} />

          <LanguageSelect selected={languages} onChange={setLanguages} />

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            <Save className="h-4 w-4" />
            {saving ? t("settings.saving") : t("settings.saveChanges")}
          </button>
        </div>
      </div>

    </div>
  );
}
