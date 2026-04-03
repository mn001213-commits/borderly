"use client";

import { useState, useRef, useEffect, DragEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { createNgoPost, type NgoCategory, type NgoChatType } from "@/lib/ngoService";
import { ArrowLeft, ImagePlus, Plus, X, Trash2, Users, MessageCircle } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

const BUCKET = "post-images";

const CATEGORY_LABELS: Record<NgoCategory, string> = {
  general: "General",
  environment: "Environment",
  education: "Education",
  health: "Health",
  human_rights: "Human Rights",
  community: "Community",
  animal_welfare: "Animal Welfare",
  disaster_relief: "Disaster Relief",
  refugee_support: "Refugee Support",
  arts_culture: "Arts & Culture",
  social_gathering: "Social Gathering",
};

async function compressImage(file: File): Promise<{ blob: Blob; ext: string }> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error("load failed"));
    im.src = dataUrl;
  });
  const maxSize = 1600;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, nw, nh);
  ctx.drawImage(img, 0, 0, nw, nh);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("blob failed"))), "image/jpeg", 0.82)
  );
  return { blob, ext: "jpg" };
}

export default function NgoNewPage() {
  const router = useRouter();
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<NgoCategory>("general");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [maxApplicants, setMaxApplicants] = useState("");
  const [chatType, setChatType] = useState<NgoChatType>("group");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const addQuestion = () => { if (questions.length < 10) setQuestions([...questions, ""]); };
  const removeQuestion = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));
  const updateQuestion = (idx: number, val: string) => setQuestions(questions.map((q, i) => (i === idx ? val : q)));

  const onSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    if (!title.trim()) { setErrorMsg(t("createNgo.titleRequired")); setLoading(false); return; }
    if (!description.trim()) { setErrorMsg(t("createNgo.descRequired")); setLoading(false); return; }
    const validQ = questions.map((q) => q.trim()).filter(Boolean);
    if (validQ.length === 0) { setErrorMsg(t("createNgo.questionRequired")); setLoading(false); return; }

    try {
      let imageUrl: string | null = null;
      if (file) {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) { router.push("/login"); return; }
        const { blob, ext } = await compressImage(file);
        const path = `${uid}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
      const id = await createNgoPost({ title: title.trim(), description: description.trim(), category, location: location.trim(), website_url: websiteUrl.trim(), image_url: imageUrl, questions: validQ, max_applicants: maxApplicants ? parseInt(maxApplicants, 10) : null, chat_type: chatType });
      router.push(`/ngo/${id}`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to create post");
      setLoading(false);
    }
  };

  function handleCoverDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) {
      setFile(f);
    }
  }

  const canSubmit = !loading && !!title.trim() && !!description.trim() && questions.some((q) => q.trim());

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70" style={{ background: "var(--light-blue)" }}>
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--deep-navy)" }} />
          </button>
          <h1 className="text-lg font-bold">{t("createNgo.title")}</h1>
          <button onClick={onSubmit} disabled={!canSubmit} className="inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40" style={{ background: "#43A047" }}>
            {loading ? t("createNgo.posting") : t("createNgo.publish")}
          </button>
        </div>

        {errorMsg && <div className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>{errorMsg}</div>}

        {/* Image */}
        <div
          className="b-card b-animate-in overflow-hidden mb-4"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
          onDrop={handleCoverDrop}
        >
          {previewUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="w-full" />
              <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className={`flex w-full flex-col items-center justify-center gap-3 py-12 transition ${isDragging ? "scale-[1.01]" : "hover:opacity-70"}`} style={{ background: isDragging ? "color-mix(in srgb, var(--primary) 5%, var(--light-blue))" : "var(--light-blue)" }}>
              <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${isDragging ? "border-[var(--primary)]" : ""}`} style={{ background: "var(--bg-card)", border: isDragging ? "2px dashed var(--primary)" : "2px dashed var(--border-soft)" }}>
                <ImagePlus className="h-6 w-6" style={{ color: isDragging ? "var(--primary)" : "#43A047" }} />
              </div>
              <div className="text-sm font-medium" style={{ color: isDragging ? "var(--primary)" : "var(--text-secondary)" }}>
                {isDragging ? "Drop image here" : t("createNgo.addCover")}
              </div>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
        </div>

        {/* Category */}
        <div className="b-card b-animate-in p-4 mb-4" style={{ animationDelay: "0.05s" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{t("createNgo.category")}</div>
          <div className="flex flex-wrap gap-2">
            {(["general","environment","education","health","human_rights","community","animal_welfare","disaster_relief","refugee_support","arts_culture","social_gathering"] as NgoCategory[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition"
                style={category === c
                  ? { background: "#43A047", color: "#fff" }
                  : { background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }
                }
              >
                {t(`ngo.cat.${c}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="b-card b-animate-in p-4 space-y-4 mb-4" style={{ animationDelay: "0.1s" }}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Category *</div>
            <select value={category} onChange={(e) => setCategory(e.target.value as NgoCategory)} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}>
              {(Object.keys(CATEGORY_LABELS) as NgoCategory[]).map((key) => (
                <option key={key} value={key}>{CATEGORY_LABELS[key]}</option>
              ))}
            </select>
          </div>
          <div style={{ borderTop: "1px solid var(--border-soft)" }} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{t("createNgo.activityPurpose")}</div>
            <textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("createNgo.activityPurposePlaceholder")} className="w-full min-h-[80px] resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--text-muted)]" style={{ color: "var(--deep-navy)" }} />
          </div>
          <div style={{ borderTop: "1px solid var(--border-soft)" }} />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{t("createNgo.helpOffered")}</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("createNgo.helpOfferedPlaceholder")} className="w-full min-h-[120px] resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--text-muted)]" style={{ color: "var(--deep-navy)" }} />
          </div>
          <div style={{ borderTop: "1px solid var(--border-soft)" }} />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("createNgo.locationPlaceholder")} className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]" style={{ color: "var(--deep-navy)" }} />
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder={t("createNgo.websitePlaceholder")} className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]" style={{ color: "var(--deep-navy)" }} />
          <input value={maxApplicants} onChange={(e) => setMaxApplicants(e.target.value.replace(/\D/g, ""))} placeholder={t("createNgo.maxApplicants")} className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]" style={{ color: "var(--deep-navy)" }} />
        </div>

        {/* Chat Type */}
        <div className="b-card b-animate-in p-4 mb-4" style={{ animationDelay: "0.1s" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{t("createNgo.chatType")}</div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "group" as NgoChatType, icon: Users, label: t("createNgo.chatTypeGroup"), desc: t("createNgo.chatTypeGroupDesc") },
              { value: "dm" as NgoChatType, icon: MessageCircle, label: t("createNgo.chatTypeDm"), desc: t("createNgo.chatTypeDmDesc") },
            ]).map(({ value, icon: Icon, label, desc }) => {
              const active = chatType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setChatType(value)}
                  className="flex flex-col items-start gap-1.5 rounded-2xl p-3 text-left transition"
                  style={{
                    background: active ? "color-mix(in srgb, var(--primary) 12%, var(--bg-card))" : "var(--light-blue)",
                    border: active ? "2px solid var(--primary)" : "2px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "var(--primary)" : "var(--text-secondary)" }} />
                    <span className="text-sm font-semibold" style={{ color: active ? "var(--primary)" : "var(--deep-navy)" }}>{label}</span>
                  </div>
                  <span className="text-xs leading-tight" style={{ color: "var(--text-muted)" }}>{desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions */}
        <div className="b-card b-animate-in p-4" style={{ animationDelay: "0.15s" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{t("createNgo.questions")}</div>
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-bold shrink-0" style={{ color: "var(--text-muted)", width: 20 }}>{idx + 1}.</span>
                <input value={q} onChange={(e) => updateQuestion(idx, e.target.value)} placeholder={t("createNgo.questionPlaceholder")} className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }} />
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(idx)} className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                )}
              </div>
            ))}
          </div>
          {questions.length < 10 && (
            <button type="button" onClick={addQuestion} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70" style={{ color: "#43A047" }}>
              <Plus className="h-4 w-4" /> {t("createNgo.addQuestion")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
