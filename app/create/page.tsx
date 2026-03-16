"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, ImagePlus, Film, X, MessageCircle, Info, HelpCircle, Sun, Briefcase, MoreHorizontal } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

const VIDEO_EXTS = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
const MAX_VIDEO_MB = 50;

function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

function isVideoUrl(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTS.some((ext) => path.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

const BUCKET = "post-images";

async function compressImage(
  file: File,
  opts?: { maxSize?: number; quality?: number; mime?: "image/jpeg" | "image/webp" }
): Promise<{ blob: Blob; contentType: string; ext: string }> {
  const maxSize = opts?.maxSize ?? 1600;
  const quality = opts?.quality ?? 0.82;
  const mime = opts?.mime ?? "image/jpeg";

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Failed to read image"));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Failed to load image"));
    im.src = dataUrl;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const scale = Math.min(1, maxSize / Math.max(w, h));
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to create canvas context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, nw, nh);
  ctx.drawImage(img, 0, 0, nw, nh);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to convert image"))), mime, quality);
  });

  const ext = mime === "image/webp" ? "webp" : "jpg";
  return { blob, contentType: mime, ext };
}

type Category = "info" | "question" | "daily" | "general" | "jobs" | "other";

const CATEGORY_OPTIONS: Array<{ value: Category; color: string; icon: React.ElementType; iconColor: string }> = [
  { value: "general", color: "bg-[#EAF4FF] text-[#4DA6FF]", icon: MessageCircle, iconColor: "#7EC8E3" },
  { value: "info", color: "bg-[#E8F5E9] text-[#43A047]", icon: Info, iconColor: "#95E1D3" },
  { value: "question", color: "bg-[#FFF3E0] text-[#EF6C00]", icon: HelpCircle, iconColor: "#F9D56E" },
  { value: "daily", color: "bg-[#F3E5F5] text-[#8E24AA]", icon: Sun, iconColor: "#F3A683" },
  { value: "jobs", color: "bg-[#FFF8E1] text-[#F9A825]", icon: Briefcase, iconColor: "#AA96DA" },
  { value: "other", color: "bg-[#ECEFF1] text-[#546E7A]", icon: MoreHorizontal, iconColor: "#C4C4C4" },
];

export default function CreatePage() {
  const router = useRouter();
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const makeSafePath = (userId: string, ext: string) => {
    const rand = Math.random().toString(16).slice(2);
    return `${userId}/${Date.now()}-${rand}.${ext}`;
  };

  const uploadSingleFile = async (userId: string, f: File): Promise<string> => {
    if (isVideoFile(f)) {
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        throw new Error(`Video must be under ${MAX_VIDEO_MB}MB`);
      }
      const ext = f.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = makeSafePath(userId, ext);

      const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type,
      });

      if (error) throw new Error(error.message);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    }

    const { blob, contentType, ext } = await compressImage(f, {
      maxSize: 1600,
      quality: 0.82,
      mime: "image/jpeg",
    });

    const path = makeSafePath(userId, ext);

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadAllFiles = async (userId: string): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const f of files) {
      const url = await uploadSingleFile(userId, f);
      urls.push(url);
    }
    return urls;
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAllMedia = () => {
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user ?? null;

    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const trimTitle = title.trim();
    const c = content.trim();

    if (!category) {
      setErrorMsg(t("create.selectCategory"));
      setLoading(false);
      return;
    }

    if (!trimTitle || !c) {
      setErrorMsg(t("create.enterTitleContent"));
      setLoading(false);
      return;
    }

    try {
      const uploadedUrls = await uploadAllFiles(user.id);
      const imageUrl = uploadedUrls.length > 0 ? uploadedUrls[0] : null;
      const imageUrls = uploadedUrls.length > 0 ? uploadedUrls : null;

      // Fetch display name from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();

      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: trimTitle,
          content: c,
          category,
          user_id: user.id,
          author_name: profile?.display_name ?? null,
          image_url: imageUrl,
          image_urls: imageUrls,
        })
        .select("id")
        .single();

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      router.push(`/posts/${data.id}`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error during upload/save");
      setLoading(false);
    }
  };

  const canSubmit = !loading && !!title.trim() && !!content.trim() && !!category;

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ background: "var(--light-blue)" }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--deep-navy)" }} />
          </button>

          <h1 className="text-lg font-bold">{t("create.newPost")}</h1>

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--primary)" }}
          >
            {loading ? t("create.posting") : t("create.share")}
          </button>
        </div>

        {errorMsg && (
          <div
            className="mb-4 rounded-2xl px-4 py-3 text-sm"
            style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}
          >
            {errorMsg}
          </div>
        )}

        {/* Image area */}
        <div className="b-card b-animate-in overflow-hidden mb-4">
          {previewUrls.length > 0 ? (
            <div>
              <div className="flex gap-3 overflow-x-auto p-3 scrollbar-hide">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative shrink-0">
                    {files[i] && isVideoFile(files[i]) ? (
                      <video
                        src={url}
                        controls
                        className="rounded-xl"
                        style={{ height: 200, maxWidth: 280 }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Preview ${i + 1}`}
                        className="rounded-xl object-cover"
                        style={{ height: 200, width: 200 }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {files.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex shrink-0 items-center justify-center rounded-xl"
                    style={{ height: 200, width: 100, background: "var(--light-blue)", border: "2px dashed var(--border-soft)" }}
                  >
                    <ImagePlus className="h-6 w-6" style={{ color: "var(--primary)" }} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between px-3 pb-3">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {files.length}/5 {t("create.files")}
                </span>
                <button
                  type="button"
                  onClick={removeAllMedia}
                  className="text-xs font-medium hover:opacity-70"
                  style={{ color: "var(--text-muted)" }}
                >
                  {t("create.removeAll")}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-3 py-16 transition hover:opacity-70"
              style={{ background: "var(--light-blue)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "var(--bg-card)", border: "2px dashed var(--border-soft)" }}
                >
                  <ImagePlus className="h-6 w-6" style={{ color: "var(--primary)" }} />
                </div>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ background: "var(--bg-card)", border: "2px dashed var(--border-soft)" }}
                >
                  <Film className="h-6 w-6" style={{ color: "var(--primary)" }} />
                </div>
              </div>
              <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                {t("create.tapToAdd")}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {t("create.autoCompress")} {MAX_VIDEO_MB}MB
              </div>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (selected.length === 0) return;
              setFiles((prev) => {
                const combined = [...prev, ...selected];
                return combined.slice(0, 5);
              });
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="hidden"
          />
        </div>

        {/* Category pills */}
        <div className="b-card b-animate-in p-4 mb-4" style={{ animationDelay: "0.05s" }}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            {t("create.category")}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setCategory(o.value)}
                className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition ${
                  category === o.value
                    ? o.color
                    : ""
                }`}
                style={
                  category === o.value
                    ? { boxShadow: "0 0 0 2px var(--primary)" }
                    : { background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }
                }
              >
                <o.icon className="h-3.5 w-3.5 shrink-0" style={{ color: category === o.value ? undefined : o.iconColor }} />
                {t("cat." + o.value)}
              </button>
            ))}
          </div>
        </div>

        {/* Title + Content */}
        <div className="b-card b-animate-in p-4 space-y-4" style={{ animationDelay: "0.1s" }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("create.title")}
            className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: "var(--deep-navy)" }}
          />

          <div style={{ borderTop: "1px solid var(--border-soft)" }} />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("create.writeSomething")}
            className="w-full min-h-[180px] resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: "var(--deep-navy)" }}
          />
        </div>

        {/* Bottom action bar (mobile) */}
        {previewUrls.length > 0 && files.length < 5 && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition hover:opacity-80"
              style={{ background: "var(--light-blue)", color: "var(--primary)", border: "1px solid var(--border-soft)" }}
            >
              <ImagePlus className="h-4 w-4" />
              {t("create.addMoreMedia")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
