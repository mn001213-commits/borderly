"use client";

import { useState, useEffect, useRef, DragEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, ImagePlus, Film, X, Upload, MessageCircle, Info, HelpCircle, Sun, Briefcase, MoreHorizontal } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import { isVideoFile, isVideoUrl } from "@/lib/format";
import { type Category } from "@/lib/constants";

const MAX_VIDEO_MB = 50;

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

const CATEGORY_OPTIONS: Array<{ value: Category; color: string; icon: React.ElementType; iconColor: string }> = [
  { value: "general", color: "bg-[#F0F4FF] text-[#4361EE]", icon: MessageCircle, iconColor: "#4361EE" },
  { value: "info", color: "bg-[#EEFBF3] text-[#06D6A0]", icon: Info, iconColor: "#06D6A0" },
  { value: "question", color: "bg-[#FFF4EC] text-[#F77F00]", icon: HelpCircle, iconColor: "#F77F00" },
  { value: "daily", color: "bg-[#F5F0FF] text-[#7B2FF2]", icon: Sun, iconColor: "#7B2FF2" },
  { value: "jobs", color: "bg-[#FFF8EB] text-[#E6A817]", icon: Briefcase, iconColor: "#E6A817" },
  { value: "other", color: "bg-[#F5F5F3] text-[#737373]", icon: MoreHorizontal, iconColor: "#737373" },
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
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const accepted = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime"];
    const valid = newFiles.filter((f) => {
      if (!accepted.some((t) => f.type.startsWith(t.split("/")[0]))) return false;
      if (isVideoFile(f) && f.size > MAX_VIDEO_MB * 1024 * 1024) return false;
      return true;
    });
    if (valid.length === 0) return;
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

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

        {/* Image area — always supports drag & drop */}
        <div
          className={`b-card b-animate-in overflow-hidden mb-4 transition-all ${isDragging ? "ring-2 ring-[var(--primary)] scale-[1.01]" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {previewUrls.length > 0 ? (
            <div className="relative">
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
                    className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-xl transition hover:opacity-80"
                    style={{ height: 200, width: 120, background: "var(--light-blue)", border: "2px dashed var(--border-soft)" }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: "var(--primary)" }}
                    >
                      <ImagePlus className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>
                      {t("create.addMoreMedia")}
                    </span>
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
              {isDragging && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8" style={{ color: "var(--primary)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                      Drop to add
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex cursor-pointer flex-col items-center gap-3 p-8 text-center transition hover:opacity-80"
              onClick={() => fileRef.current?.click()}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full transition ${isDragging ? "scale-110" : ""}`}
                style={{ background: isDragging ? "var(--primary)" : "var(--light-blue)" }}
              >
                <Upload className="h-6 w-6" style={{ color: isDragging ? "#fff" : "var(--primary)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                  {isDragging ? "Drop files here" : "Drag & drop files"}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  or click to browse (max 5 files, {MAX_VIDEO_MB}MB video)
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              if (selected.length === 0) return;
              addFiles(selected);
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
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${
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

      </div>
    </div>
  );
}
