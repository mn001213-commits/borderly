"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/app/components/LangProvider";
import {
  ArrowLeft,
  Camera,
  Calendar,
  MapPin,
  Users,
  Globe,
  Home,
  X,
} from "lucide-react";

type MeetType = "hangout" | "study" | "language" | "meal" | "sports";

const BUCKET = "post-images";

const MEET_TYPES: { value: MeetType; label: string; emoji: string }[] = [
  { value: "hangout", label: "Hangout", emoji: "\u{1F91D}" },
  { value: "study", label: "Study", emoji: "\u{1F4DA}" },
  { value: "language", label: "Language", emoji: "\u{1F5E3}\uFE0F" },
  { value: "meal", label: "Meal", emoji: "\u{1F37D}\uFE0F" },
  { value: "sports", label: "Sports", emoji: "\u26BD" },
];

export default function EditMeetPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useT();

  const meetId = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<MeetType>("hangout");
  const [sport, setSport] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [placeHint, setPlaceHint] = useState("");
  const [startAt, setStartAt] = useState("");
  const [maxForeigners, setMaxForeigners] = useState("");
  const [maxLocals, setMaxLocals] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Cover image
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  // Ratio calculation
  const nf = maxForeigners ? Number(maxForeigners) : 0;
  const nl = maxLocals ? Number(maxLocals) : 0;
  const total = nf + nl;
  const foreignerPct = total > 0 ? Math.round((nf / total) * 100) : 0;
  const localPct = total > 0 ? 100 - foreignerPct : 0;
  const ratioValid = total === 0 || (nf / total <= 0.7 && nf / total >= 0.3);
  const showRatio = nf > 0 && nl > 0;

  // Load existing meet data
  useEffect(() => {
    if (!meetId) return;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/meet");
        return;
      }

      const { data: meet, error } = await supabase
        .from("meet_posts")
        .select("*")
        .eq("id", meetId)
        .maybeSingle();

      if (error || !meet) {
        router.push("/meet");
        return;
      }

      // Verify host
      if (meet.host_id !== user.id) {
        router.push("/meet");
        return;
      }

      setType(meet.type as MeetType);
      setSport(meet.sport ?? "");
      setTitle(meet.title ?? "");
      setDescription(meet.description ?? "");
      setCity(meet.city ?? "");
      setPlaceHint(meet.place_hint ?? "");
      setMaxForeigners(meet.max_foreigners != null ? String(meet.max_foreigners) : "");
      setMaxLocals(meet.max_locals != null ? String(meet.max_locals) : "");
      setIsClosed(!!meet.is_closed);
      setExistingImageUrl(meet.image_url ?? null);

      // Format start_at for datetime-local input
      if (meet.start_at) {
        const d = new Date(meet.start_at);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setStartAt(local);
      }

      setLoading(false);
    })();
  }, [meetId, router]);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(f);
    if (f) setCoverPreview(URL.createObjectURL(f));
    else setCoverPreview(null);
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Title and description are required.");
      return;
    }

    if (!maxForeigners || !maxLocals || nf < 1 || nl < 1) {
      alert("You must set both foreigner and local recruitment numbers (at least 1 each).");
      return;
    }

    if (!ratioValid) {
      alert("The ratio between foreigners and locals must be at least 30:70 (neither side can exceed 70%).");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in first.");
        return;
      }

      // Upload new cover image if selected
      let image_url: string | null | undefined = undefined; // undefined = keep existing

      if (coverFile) {
        const ext = coverFile.name.split(".").pop() || "jpg";
        const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `meet/covers/${user.id}_${Date.now()}.${safeExt}`;

        const up = await supabase.storage.from(BUCKET).upload(path, coverFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: coverFile.type || "image/jpeg",
        });

        if (up.error) {
          alert(up.error.message);
          return;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        image_url = data?.publicUrl ?? null;
      }

      const updatePayload: Record<string, unknown> = {
        type,
        sport: type === "sports" ? sport : null,
        title: title.trim(),
        description: description.trim(),
        city: city.trim() || null,
        place_hint: placeHint.trim() || null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        max_people: nf + nl,
        max_foreigners: nf,
        max_locals: nl,
        is_closed: isClosed,
      };

      if (image_url !== undefined) {
        updatePayload.image_url = image_url;
      }

      const { error } = await supabase
        .from("meet_posts")
        .update(updatePayload)
        .eq("id", meetId);

      if (error) {
        alert(error.message);
        return;
      }

      router.push(`/meet/${meetId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  // Determine which image to show in the cover area
  const displayImage = coverPreview || existingImageUrl;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 b-animate-in">
          <Link
            href={`/meet/${meetId}`}
            className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold">{t("editMeet.title")}</h1>
        </header>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Cover Image */}
          <div className="b-card b-animate-in overflow-hidden">
            {displayImage ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={displayImage} alt="cover" className="h-48 w-full object-cover" />
                <button
                  type="button"
                  onClick={removeCover}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 transition hover:opacity-70">
                <Camera className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                  {t("createMeet.addCover")}
                </span>
                <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
              </label>
            )}
          </div>

          {/* Type Selection */}
          <section className="b-card b-animate-in p-5" style={{ animationDelay: "0.05s" }}>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {t("createMeet.meetupType")}
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {MEET_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => setType(mt.value)}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition"
                  style={
                    type === mt.value
                      ? { background: "var(--primary)", color: "#fff" }
                      : { background: "var(--light-blue)", color: "var(--text-secondary)", border: "1px solid var(--border-soft)" }
                  }
                >
                  <span>{mt.emoji}</span>
                  {t("meet." + mt.value)}
                </button>
              ))}
            </div>

            {type === "sports" && (
              <div className="mt-4">
                <input
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  placeholder={t("createMeet.sportPlaceholder")}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                />
              </div>
            )}
          </section>

          {/* Title & Description */}
          <section className="b-card b-animate-in p-5" style={{ animationDelay: "0.1s" }}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("createMeet.titleLabel")}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("createMeet.titlePlaceholder")}
                maxLength={120}
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
              <div className="mt-1 text-right text-xs" style={{ color: "var(--text-muted)" }}>
                {title.length}/120
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("createMeet.description")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("createMeet.descPlaceholder")}
                maxLength={4000}
                className="mt-2 w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)", minHeight: 120 }}
              />
              <div className="mt-1 text-right text-xs" style={{ color: "var(--text-muted)" }}>
                {description.length}/4000
              </div>
            </div>
          </section>

          {/* When & Where */}
          <section className="b-card b-animate-in p-5" style={{ animationDelay: "0.15s" }}>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {t("createMeet.whenWhere")}
            </label>

            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <Calendar className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: "var(--deep-navy)" }}
                />
              </div>

              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("createMeet.cityPlaceholder")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: "var(--deep-navy)" }}
                />
              </div>

              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  value={placeHint}
                  onChange={(e) => setPlaceHint(e.target.value)}
                  placeholder={t("createMeet.placePlaceholder")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: "var(--deep-navy)" }}
                />
              </div>
            </div>
          </section>

          {/* Recruitment Quota */}
          <section className="b-card b-animate-in p-5" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {t("createMeet.recruitmentQuota")}
              </label>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {t("createMeet.quotaDesc")}
            </p>

            <div className="mt-4 flex gap-3">
              {/* Foreigner input */}
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Globe className="h-3.5 w-3.5" style={{ color: "#3B82F6" }} />
                  <span className="text-xs font-semibold" style={{ color: "#1D4ED8" }}>{t("createMeet.foreigners")}</span>
                </div>
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-3"
                  style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
                >
                  <input
                    type="number"
                    value={maxForeigners}
                    onChange={(e) => setMaxForeigners(e.target.value)}
                    min={1}
                    placeholder="0"
                    className="w-full bg-transparent text-center text-lg font-bold outline-none"
                    style={{ color: "#1D4ED8" }}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="flex flex-col items-center justify-end pb-3">
                <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>+</span>
              </div>

              {/* Local input */}
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <Home className="h-3.5 w-3.5" style={{ color: "#D97706" }} />
                  <span className="text-xs font-semibold" style={{ color: "#92400E" }}>{t("createMeet.locals")}</span>
                </div>
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-3"
                  style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
                >
                  <input
                    type="number"
                    value={maxLocals}
                    onChange={(e) => setMaxLocals(e.target.value)}
                    min={1}
                    placeholder="0"
                    className="w-full bg-transparent text-center text-lg font-bold outline-none"
                    style={{ color: "#92400E" }}
                  />
                </div>
              </div>
            </div>

            {/* Ratio visualization */}
            {showRatio && (
              <div className="mt-4">
                {/* Bar */}
                <div className="flex h-3 overflow-hidden rounded-full">
                  <div
                    className="transition-all duration-300"
                    style={{ width: `${foreignerPct}%`, background: ratioValid ? "#3B82F6" : "#EF4444" }}
                  />
                  <div
                    className="transition-all duration-300"
                    style={{ width: `${localPct}%`, background: ratioValid ? "#F59E0B" : "#EF4444" }}
                  />
                </div>

                {/* Labels */}
                <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                  <span style={{ color: ratioValid ? "#1D4ED8" : "#DC2626" }}>
                    {foreignerPct}% {t("createMeet.foreigners")}
                  </span>
                  <span className="font-bold" style={{ color: "var(--text-muted)" }}>
                    {t("createMeet.total")} {total}
                  </span>
                  <span style={{ color: ratioValid ? "#92400E" : "#DC2626" }}>
                    {localPct}% {t("createMeet.locals")}
                  </span>
                </div>

                {/* Warning */}
                {!ratioValid && (
                  <div
                    className="mt-3 rounded-xl px-4 py-2.5 text-xs font-medium"
                    style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}
                  >
                    {t("createMeet.ratioWarning")}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Closed Toggle */}
          <section className="b-card b-animate-in p-5" style={{ animationDelay: "0.25s" }}>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {t("editMeet.recruitmentStatus")}
                </label>
                <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {isClosed ? t("editMeet.closedDesc") : t("editMeet.openDesc")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClosed(!isClosed)}
                className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                style={{ background: isClosed ? "var(--primary)" : "var(--border-soft)" }}
              >
                <span
                  className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: isClosed ? "translateX(24px)" : "translateX(4px)" }}
                />
              </button>
            </div>
          </section>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || (showRatio && !ratioValid)}
            className="b-animate-in w-full rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)", animationDelay: "0.3s" }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
