"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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

export default function NewMeetPage() {
  const router = useRouter();
  const { t } = useT();

  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<MeetType>("hangout");
  const [sport, setSport] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [placeHint, setPlaceHint] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [startAt, setStartAt] = useState("");
  const [maxForeigners, setMaxForeigners] = useState("");
  const [maxLocals, setMaxLocals] = useState("");

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
  const skipRatio = type === "study" || type === "language";
  const ratioValid = skipRatio || total === 0 || (nf / total <= 0.7 && nf / total >= 0.3);
  const showRatio = nf > 0 && nl > 0;

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

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert(t("createMeet.loginFirst"));
        return;
      }

      // Upload cover image (optional)
      let image_url: string | null = null;

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

      // 1) Create meet_posts
      const { data: createdMeet, error: e1 } = await supabase
        .from("meet_posts")
        .insert({
          host_id: user.id,
          type,
          sport: type === "sports" ? sport : null,
          title: title.trim(),
          description: description.trim(),
          city: city.trim() || null,
          place_hint: placeHint.trim() || null,
          map_url: mapUrl.trim() || null,
          online_url: onlineUrl.trim() || null,
          start_at: startAt ? new Date(startAt).toISOString() : null,
          max_people: nf + nl,
          max_foreigners: nf,
          max_locals: nl,
          image_url,
        })
        .select("id")
        .single();

      if (e1 || !createdMeet) {
        alert(e1?.message || "Failed to create meetup");
        return;
      }

      const meetId = createdMeet.id as string;

      // 2) Create conversation
      const { data: conv, error: eConv } = await supabase
        .from("conversations")
        .insert({
          type: "group",
          name: title.trim(),
          created_by: user.id,
        })
        .select("id")
        .single();

      if (eConv || !conv) {
        alert(eConv?.message || "Failed to create conversation");
        return;
      }

      const conversationId = conv.id as string;

      // 3) group_conversations upsert
      const { error: e2 } = await supabase
        .from("group_conversations")
        .upsert(
          { meet_id: meetId, conversation_id: conversationId },
          { onConflict: "meet_id" }
        );

      if (e2) {
        alert(e2.message || "Failed to map group chat");
        return;
      }

      // 4) Add host to conversation_members
      const { error: e3 } = await supabase.from("conversation_members").upsert(
        [{ conversation_id: conversationId, user_id: user.id }],
        { onConflict: "conversation_id,user_id" }
      );

      if (e3) {
        alert(e3.message);
        return;
      }

      router.push(`/meet/${meetId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <header className="flex items-center gap-3 py-3 b-animate-in">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
          <h1 className="text-xl font-bold">{t("createMeet.title")}</h1>
        </header>

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Cover Image */}
          <div className="b-card b-animate-in overflow-hidden">
            {coverPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="preview" className="h-48 w-full object-cover" />
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
                const [calYear, setCalYear] = [
                  selectedYear || today.getFullYear(),
                  (y: number) => {
                    // handled inline
                  },
                ];
                const [calMonth, setCalMonth] = [
                  selectedMonth || today.getMonth() + 1,
                  (m: number) => {
                    // handled inline
                  },
                ];

                // We need state for calendar navigation — use viewMonth/viewYear derived from startAt or current
                // Since we're inside render, compute the calendar from selection or today
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
                  // Set to first of that month to navigate
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
              /* Study / Language — simple total input */
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

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || (!skipRatio && showRatio && !ratioValid)}
            className="b-animate-in w-full rounded-2xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--primary)", animationDelay: "0.25s" }}
          >
            {loading ? t("createMeet.creating") : t("createMeet.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
