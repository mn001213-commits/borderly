"use client";

import { useState, useEffect, useMemo, DragEvent } from "react";
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
  Link2,
  Video,
} from "lucide-react";

type MeetType = "hangout" | "study" | "language" | "meal" | "sports";

const BUCKET = "post-images";

const MEET_TYPES: { value: MeetType; label: string; emoji: string }[] = [
  { value: "hangout", label: "Hangout", emoji: "🤝" },
  { value: "study", label: "Study", emoji: "📚" },
  { value: "language", label: "Language", emoji: "🗣️" },
  { value: "meal", label: "Meal", emoji: "🍽️" },
  { value: "sports", label: "Sports", emoji: "⚽" },
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
  const [placeHint, setPlaceHint] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [startAt, setStartAt] = useState("");
  const [maxForeigners, setMaxForeigners] = useState("");
  const [maxLocals, setMaxLocals] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Cover image
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
  const skipRatio = type === "study"; // Only study skips foreigner/local ratio
  const ratioValid = skipRatio || total === 0 || (nf / total <= 0.7 && nf / total >= 0.3);
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

      if (meet.host_id !== user.id) {
        router.push("/meet");
        return;
      }

      setType(meet.type as MeetType);
      setSport(meet.sport ?? "");
      setTitle(meet.title ?? "");
      setDescription(meet.description ?? "");
      setPlaceHint(meet.place_hint ?? "");
      setMapUrl(meet.map_url ?? "");
      setOnlineUrl(meet.online_url ?? "");
      setIsClosed(!!meet.is_closed);
      setExistingImageUrl(meet.image_url ?? null);

      // For study type, max_foreigners/max_locals are null; max_people holds the total
      if (meet.type === "study") {
        setMaxForeigners(meet.max_people != null ? String(meet.max_people) : "");
        setMaxLocals("");
      } else {
        setMaxForeigners(meet.max_foreigners != null ? String(meet.max_foreigners) : "");
        setMaxLocals(meet.max_locals != null ? String(meet.max_locals) : "");
      }

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
    setCoverFromFile(f);
  }

  function setCoverFromFile(f: File | null) {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(f);
    if (f) setCoverPreview(URL.createObjectURL(f));
    else setCoverPreview(null);
  }

  function removeCover() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
    setExistingImageUrl(null);
  }

  function handleCoverDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCoverFromFile(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert(t("createMeet.titleRequired"));
      return;
    }

    if (!skipRatio && (!maxForeigners || !maxLocals || nf < 1 || nl < 1)) {
      alert(t("createMeet.quotaRequired"));
      return;
    }

    if (!ratioValid) {
      alert(t("createMeet.ratioError"));
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert(t("createMeet.loginFirst"));
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
      } else if (existingImageUrl === null) {
        // Image was explicitly removed
        image_url = null;
      }

      const finalMaxForeigners = skipRatio ? null : (nf > 0 ? nf : null);
      const finalMaxLocals = skipRatio ? null : (nl > 0 ? nl : null);
      const finalMaxPeople = skipRatio
        ? (nf > 0 ? nf : null) // Study: nf contains total count
        : ((finalMaxForeigners || 0) + (finalMaxLocals || 0)) || null;

      const updatePayload: Record<string, unknown> = {
        type,
        sport: type === "sports" ? sport : null,
        title: title.trim(),
        description: description.trim(),
        city: null,
        place_hint: placeHint.trim() || null,
        map_url: mapUrl.trim() || null,
        online_url: onlineUrl.trim() || null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        max_people: finalMaxPeople,
        max_foreigners: finalMaxForeigners,
        max_locals: finalMaxLocals,
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

  const displayImage = coverPreview || existingImageUrl;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 b-animate-in">
          <Link
            href={`/meet/${meetId}`}
            className="b-btn-secondary h-10 rounded-xl px-3 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <h1 className="text-xl font-bold" style={{ letterSpacing: "-0.02em" }}>{t("editMeet.title")}</h1>
        </header>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Cover Image */}
          <div
            className="b-card b-animate-in overflow-hidden"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
            onDrop={handleCoverDrop}
          >
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
              <label className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-2 transition ${isDragging ? "bg-[var(--primary)]/5 border-2 border-dashed border-[var(--primary)] scale-[1.01]" : "hover:opacity-70"}`}>
                <Camera className={`h-8 w-8 transition-colors ${isDragging ? "text-[var(--primary)]" : ""}`} style={isDragging ? undefined : { color: "var(--text-muted)" }} />
                <span className="text-sm font-medium" style={{ color: isDragging ? "var(--primary)" : "var(--text-muted)" }}>
                  {isDragging ? "Drop image here" : t("createMeet.addCover")}
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
                  className={`b-pill px-4 py-2 text-sm font-semibold ${type === mt.value ? "b-pill-active" : "b-pill-inactive"}`}
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
                  className="b-search w-full px-4 py-3 text-sm"
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
                className="b-search mt-2 w-full px-4 py-3 text-sm resize-none"
                style={{ minHeight: 120 }}
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
              {(() => {
                const MONTHS = [t("cal.jan"),t("cal.feb"),t("cal.mar"),t("cal.apr"),t("cal.may"),t("cal.jun"),t("cal.jul"),t("cal.aug"),t("cal.sep"),t("cal.oct"),t("cal.nov"),t("cal.dec")];
                const DAYS = [t("cal.su"),t("cal.mo"),t("cal.tu"),t("cal.we"),t("cal.th"),t("cal.fr"),t("cal.sa")];

                const datePart = startAt ? startAt.split("T")[0] : "";
                const timePart = startAt ? startAt.split("T")[1] || "" : "";
                const selectedYear = datePart ? Number(datePart.split("-")[0]) : 0;
                const selectedMonth = datePart ? Number(datePart.split("-")[1]) : 0;
                const selectedDay = datePart ? Number(datePart.split("-")[2]) : 0;
                const hr24 = timePart ? Number(timePart.split(":")[0]) : 12;
                const mn = timePart ? timePart.split(":")[1] : "00";

                const today = new Date();

                const viewYear = selectedYear || today.getFullYear();
                const viewMonth = selectedMonth || (today.getMonth() + 1);

                const firstDayOfMonth = new Date(viewYear, viewMonth - 1, 1).getDay();
                const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
                const prevMonthDays = new Date(viewYear, viewMonth - 1, 0).getDate();

                const calendarDays: { day: number; current: boolean; date: string }[] = [];

                // Previous month filler
                for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                  const d = prevMonthDays - i;
                  const pm = viewMonth === 1 ? 12 : viewMonth - 1;
                  const py = viewMonth === 1 ? viewYear - 1 : viewYear;
                  calendarDays.push({ day: d, current: false, date: `${py}-${String(pm).padStart(2,"0")}-${String(d).padStart(2,"0")}` });
                }
                // Current month
                for (let d = 1; d <= daysInMonth; d++) {
                  calendarDays.push({ day: d, current: true, date: `${viewYear}-${String(viewMonth).padStart(2,"0")}-${String(d).padStart(2,"0")}` });
                }
                // Next month filler
                const remaining = 42 - calendarDays.length;
                for (let d = 1; d <= remaining; d++) {
                  const nm = viewMonth === 12 ? 1 : viewMonth + 1;
                  const ny = viewMonth === 12 ? viewYear + 1 : viewYear;
                  calendarDays.push({ day: d, current: false, date: `${ny}-${String(nm).padStart(2,"0")}-${String(d).padStart(2,"0")}` });
                }

                const pickDate = (dateStr: string) => {
                  const time = timePart || "12:00";
                  setStartAt(`${dateStr}T${time}`);
                };

                const navMonth = (delta: number) => {
                  let m = viewMonth + delta;
                  let y = viewYear;
                  if (m < 1) { m = 12; y--; }
                  if (m > 12) { m = 1; y++; }
                  const time = timePart || "12:00";
                  setStartAt(`${y}-${String(m).padStart(2,"0")}-01T${time}`);
                };

                const hr12 = hr24 === 0 ? 12 : hr24 > 12 ? hr24 - 12 : hr24;
                const ampm = hr24 >= 12 ? "PM" : "AM";

                const setTime = (h12: number, minute: string, ap: string) => {
                  let h24v = h12;
                  if (ap === "PM" && h12 < 12) h24v = h12 + 12;
                  if (ap === "AM" && h12 === 12) h24v = 0;
                  const date = datePart || today.toISOString().split("T")[0];
                  setStartAt(`${date}T${String(h24v).padStart(2,"0")}:${minute}`);
                };

                const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

                return (
                  <div className="rounded-2xl p-4" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                    {/* Calendar header */}
                    <div className="flex items-center justify-between mb-3">
                      <button type="button" onClick={() => navMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/60" style={{ color: "var(--text-secondary)" }}>
                        ‹
                      </button>
                      <div className="text-sm font-bold" style={{ color: "var(--deep-navy)" }}>
                        {MONTHS[viewMonth - 1]} {viewYear}
                      </div>
                      <button type="button" onClick={() => navMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/60" style={{ color: "var(--text-secondary)" }}>
                        ›
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 gap-1 mb-1">
                      {DAYS.map((d) => (
                        <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
                      ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((cd, i) => {
                        const isSelected = cd.date === datePart;
                        const isToday = cd.date === todayStr;
                        const isPast = cd.date < todayStr;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => !isPast && pickDate(cd.date)}
                            disabled={isPast}
                            className="flex h-9 w-full items-center justify-center rounded-xl text-sm transition"
                            style={{
                              fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                              background: isSelected ? "var(--primary)" : isToday ? "white" : "transparent",
                              color: isSelected ? "#fff" : isPast ? "var(--border-soft)" : !cd.current ? "var(--text-muted)" : "var(--deep-navy)",
                              border: isToday && !isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                              cursor: isPast ? "default" : "pointer",
                            }}
                          >
                            {cd.day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Time picker */}
                    <div className="mt-4 pt-3 flex items-center justify-center gap-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
                      <Calendar className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                      <select
                        value={datePart ? String(hr12) : ""}
                        onChange={(e) => setTime(Number(e.target.value), mn, ampm)}
                        className="rounded-xl px-2 py-2 text-sm font-semibold outline-none text-center"
                        style={{ background: "white", border: "1px solid var(--border-soft)", color: "var(--deep-navy)", minWidth: 52 }}
                      >
                        <option value="" disabled>--</option>
                        {[12,1,2,3,4,5,6,7,8,9,10,11].map((h) => (
                          <option key={h} value={String(h)}>{h}</option>
                        ))}
                      </select>
                      <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>:</span>
                      <select
                        value={mn}
                        onChange={(e) => setTime(hr12, e.target.value, ampm)}
                        className="rounded-xl px-2 py-2 text-sm font-semibold outline-none text-center"
                        style={{ background: "white", border: "1px solid var(--border-soft)", color: "var(--deep-navy)", minWidth: 52 }}
                      >
                        {["00","05","10","15","20","25","30","35","40","45","50","55"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-soft)" }}>
                        {["AM","PM"].map((ap) => (
                          <button
                            key={ap}
                            type="button"
                            onClick={() => setTime(hr12, mn, ap)}
                            className="px-3 py-2 text-sm font-semibold transition"
                            style={{
                              background: ampm === ap ? "var(--primary)" : "white",
                              color: ampm === ap ? "#fff" : "var(--text-secondary)",
                            }}
                          >
                            {ap}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected display */}
                    {datePart && (
                      <div className="mt-3 text-center text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                        {viewYear} {MONTHS[viewMonth - 1]} {selectedDay} — {hr12}:{mn} {ampm}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <MapPin className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  value={placeHint}
                  onChange={(e) => setPlaceHint(e.target.value)}
                  placeholder={t("createMeet.locationPlaceholder")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: "var(--deep-navy)" }}
                />
              </div>

              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <Link2 className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder={t("createMeet.mapUrlPlaceholder")}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
                  style={{ color: "var(--deep-navy)" }}
                />
              </div>

              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <Video className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                <input
                  value={onlineUrl}
                  onChange={(e) => setOnlineUrl(e.target.value)}
                  placeholder={t("createMeet.onlineUrlPlaceholder")}
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
              {skipRatio ? t("createMeet.quotaOptional") : t("createMeet.quotaDesc")}
            </p>

            {skipRatio ? (
              /* Study — simple total input */
              <div className="mt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{t("createMeet.maxPeople")}</span>
                </div>
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-3"
                  style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
                >
                  <input
                    type="number"
                    value={maxForeigners}
                    onChange={(e) => { setMaxForeigners(e.target.value); setMaxLocals("0"); }}
                    min={0}
                    placeholder={t("createMeet.maxPeoplePlaceholder")}
                    className="w-full bg-transparent text-center text-lg font-bold outline-none"
                    style={{ color: "var(--deep-navy)" }}
                  />
                </div>
                <div className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("createMeet.leaveEmptyUnlimited")}
                </div>
              </div>
            ) : (
              /* Other types — foreigner/local ratio */
              <>
                <div className="mt-4 flex gap-3">
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

                  <div className="flex flex-col items-center justify-end pb-3">
                    <span className="text-sm font-bold" style={{ color: "var(--text-muted)" }}>+</span>
                  </div>

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

                {showRatio && (
                  <div className="mt-4">
                    <div className="flex h-3 overflow-hidden rounded-full">
                      <div className="transition-all duration-300" style={{ width: `${foreignerPct}%`, background: ratioValid ? "#3B82F6" : "#EF4444" }} />
                      <div className="transition-all duration-300" style={{ width: `${localPct}%`, background: ratioValid ? "#F59E0B" : "#EF4444" }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs font-semibold">
                      <span style={{ color: ratioValid ? "#1D4ED8" : "#DC2626" }}>{foreignerPct}% {t("createMeet.foreigners")}</span>
                      <span className="font-bold" style={{ color: "var(--text-muted)" }}>{t("createMeet.total")} {total}</span>
                      <span style={{ color: ratioValid ? "#92400E" : "#DC2626" }}>{localPct}% {t("createMeet.locals")}</span>
                    </div>
                    {!ratioValid && (
                      <div className="mt-3 rounded-xl px-4 py-2.5 text-xs font-medium" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626" }}>
                        {t("createMeet.ratioWarning")}
                      </div>
                    )}
                  </div>
                )}
              </>
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
            disabled={saving || (!skipRatio && showRatio && !ratioValid)}
            className="b-btn-primary b-animate-in w-full rounded-2xl py-3.5 text-sm disabled:opacity-50"
            style={{ animationDelay: "0.3s" }}
          >
            {saving ? t("editMeet.saving") : t("editMeet.saveChanges")}
          </button>
        </form>
      </div>
    </div>
  );
}
