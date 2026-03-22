"use client";

import { useEffect, useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { X, ImagePlus } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import { isVideoFile, isVideoUrl } from "@/lib/format";
import { type Category } from "@/lib/constants";

const BUCKET = "post-images";
const MAX_VIDEO_MB = 50;
const MAX_FILES = 5;

const CAT_KEYS: Category[] = ["general", "info", "question", "daily", "jobs", "other"];

type Post = {
  id: string;
  title: string;
  content: string;
  author_name: string | null;
  user_id: string | null;
  created_at: string;
  image_url: string | null;
  image_urls: string[] | null;
  category: Category | null;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

// Image resize/compress (max 1600px, quality 0.82)
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
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to convert image"))),
      mime,
      quality
    );
  });

  const ext = mime === "image/webp" ? "webp" : "jpg";
  return { blob, contentType: mime, ext };
}

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [category, setCategory] = useState<Category>("general");

  // Multi-image state
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]);

  const totalMedia = existingUrls.length + newFiles.length;

  // Generate preview URLs for new files
  useEffect(() => {
    if (newFiles.length === 0) {
      setNewPreviewUrls([]);
      return;
    }
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setNewPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newFiles]);

  useEffect(() => {
    const load = async () => {
      if (!id || !isUuid(id)) {
        setLoading(false);
        setErrorMsg(t("editPost.invalidUrl"));
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      // 1) Login check
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }
      setMyId(uid);

      // 2) Load post
      const { data, error } = await supabase
        .from("posts")
        .select("id,title,content,author_name,user_id,created_at,image_url,image_urls,category")
        .eq("id", id)
        .single();

      if (error) {
        setLoading(false);
        setErrorMsg(error.message);
        return;
      }

      const p = data as Post;

      // 3) Owner check
      if (!p.user_id || p.user_id !== uid) {
        setLoading(false);
        setErrorMsg(t("editPost.noPermission"));
        return;
      }

      setPost(p);
      setTitle(p.title ?? "");
      setContent(p.content ?? "");
      setAuthorName(p.author_name ?? "");
      setCategory((p.category ?? "general") as Category);

      // Load existing images: prefer image_urls array, fall back to single image_url
      if (p.image_urls && p.image_urls.length > 0) {
        setExistingUrls(p.image_urls);
      } else if (p.image_url) {
        setExistingUrls([p.image_url]);
      } else {
        setExistingUrls([]);
      }
      setNewFiles([]);

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const removeExisting = (index: number) => {
    setExistingUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAllMedia = () => {
    setExistingUrls([]);
    setNewFiles([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFilesSelected = (selected: File[]) => {
    setErrorMsg(null);
    const valid = selected.filter((f) => {
      if (!f.type.startsWith("image/") && !f.type.startsWith("video/")) return false;
      if (isVideoFile(f) && f.size > MAX_VIDEO_MB * 1024 * 1024) {
        setErrorMsg(`Video must be under ${MAX_VIDEO_MB}MB`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;
    setNewFiles((prev) => {
      const combined = [...prev, ...valid];
      return combined.slice(0, MAX_FILES - existingUrls.length);
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadSingleFile = async (file: File, userId: string, postId: string) => {
    const rand = Math.random().toString(16).slice(2);
    if (isVideoFile(file)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `posts/${postId}/${userId}_${Date.now()}_${rand}.${ext}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type,
      });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl ?? null;
      if (!publicUrl) throw new Error("Failed to generate URL");
      return publicUrl;
    }

    const { blob, contentType, ext } = await compressImage(file, {
      maxSize: 1600,
      quality: 0.82,
      mime: "image/jpeg",
    });

    const path = `posts/${postId}/${userId}_${Date.now()}_${rand}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType,
    });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data?.publicUrl ?? null;
    if (!publicUrl) throw new Error("Failed to generate image URL");
    return publicUrl;
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!post || !myId) return;

    setErrorMsg(null);

    const trimTitle = title.trim();
    const c = content.trim();
    const a = authorName.trim();

    if (!trimTitle || !c) {
      setErrorMsg(t("editPost.enterTitleContent"));
      return;
    }

    setSaving(true);

    try {
      // Upload new files
      const uploadedUrls: string[] = [];
      for (const f of newFiles) {
        const url = await uploadSingleFile(f, myId, post.id);
        uploadedUrls.push(url);
      }

      // Combine existing + newly uploaded
      const allUrls = [...existingUrls, ...uploadedUrls];
      const nextImageUrl = allUrls.length > 0 ? allUrls[0] : null;
      const nextImageUrls = allUrls.length > 0 ? allUrls : null;

      const { error, count } = await supabase
        .from("posts")
        .update(
          {
            title: trimTitle,
            content: c,
            author_name: a || null,
            image_url: nextImageUrl,
            image_urls: nextImageUrls,
            category,
          },
          { count: "exact" }
        )
        .eq("id", post.id)
        .eq("user_id", myId);

      setSaving(false);

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (count === 0) {
        setErrorMsg(t("editPost.editFailed"));
        return;
      }

      router.push(`/posts/${post.id}`);
      router.refresh();
    } catch (err: any) {
      setSaving(false);
      setErrorMsg(err?.message ?? "Error during image upload");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="mb-4">
          <Link
            href={post ? `/posts/${post.id}` : "/"}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF] no-underline"
          >
            {t("editPost.goBack")}
          </Link>
        </div>

        <h1 className="text-xl font-bold">{t("editPost.title")}</h1>

        {loading && <div className="mt-3 text-sm text-gray-500">{t("common.loading")}</div>}
        {errorMsg && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {!loading && post && (
          <form onSubmit={onSave} className="mt-4 space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("create.title")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("create.category")}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
              >
                {CAT_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t("cat." + k)}
                  </option>
                ))}
              </select>
            </div>

            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder={t("editPost.author")}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("editPost.content")}
              rows={10}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400 min-h-[150px]"
            />

            {/* Multi-image section */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-gray-700">
                {t("editPost.imagesVideo")} ({MAX_FILES}, {t("editPost.autoCompressed")})
              </div>

              {totalMedia > 0 ? (
                <div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {/* Existing images */}
                    {existingUrls.map((url, i) => (
                      <div key={`existing-${i}`} className="relative shrink-0">
                        {isVideoUrl(url) ? (
                          <video
                            src={url}
                            controls
                            preload="metadata"
                            className="rounded-xl border border-gray-100"
                            style={{ height: 200, maxWidth: 280 }}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={`Image ${i + 1}`}
                            className="rounded-xl object-cover border border-gray-100"
                            style={{ height: 200, width: 200 }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeExisting(i)}
                          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {/* New file previews */}
                    {newPreviewUrls.map((url, i) => (
                      <div key={`new-${i}`} className="relative shrink-0">
                        {newFiles[i] && isVideoFile(newFiles[i]) ? (
                          <video
                            src={url}
                            controls
                            className="rounded-xl border border-gray-100"
                            style={{ height: 200, maxWidth: 280 }}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={`New ${i + 1}`}
                            className="rounded-xl object-cover border border-gray-100"
                            style={{ height: 200, width: 200 }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewFile(i)}
                          className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {/* Add more button */}
                    {totalMedia < MAX_FILES && (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-[#F0F7FF]"
                        style={{ height: 200, width: 100 }}
                      >
                        <ImagePlus className="h-6 w-6 text-gray-400" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {totalMedia}/{MAX_FILES} {t("create.files")}
                    </span>
                    <button
                      type="button"
                      onClick={removeAllMedia}
                      className="text-xs font-medium text-gray-500 hover:text-gray-700"
                    >
                      {t("editPost.removeAll")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-10 hover:bg-[#F0F7FF] transition"
                >
                  <ImagePlus className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-500">{t("editPost.tapToAdd")}</span>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  const selected = Array.from(e.target.files ?? []);
                  if (selected.length > 0) onFilesSelected(selected);
                }}
                className="hidden"
              />
              <div className="mt-2 text-xs text-gray-500">
                {t("editPost.imagesAutoCompressed")} {MAX_VIDEO_MB}MB.
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? t("editPost.saving") : t("editPost.save")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
