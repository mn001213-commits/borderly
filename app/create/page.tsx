"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "post-images";

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

  // Fill transparent background with white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, nw, nh);

  ctx.drawImage(img, 0, 0, nw, nh);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to convert image"))), mime, quality);
  });

  const ext = mime === "image/webp" ? "webp" : "jpg";
  return { blob, contentType: mime, ext };
}

type Category = "info" | "question" | "daily" | "jobs" | "meet" | "general";

const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: "info", label: "Info Sharing" },
  { value: "question", label: "Questions" },
  { value: "daily", label: "Daily Life" },
  { value: "jobs", label: "Jobs" },
  { value: "meet", label: "Meetups" },
  { value: "general", label: "General" },
];

export default function CreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Category: no default (force selection)
  const [category, setCategory] = useState<Category | "">("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Image preview
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Generate file path (with extension)
  const makeSafePath = (userId: string, ext: string) => {
    const rand = Math.random().toString(16).slice(2);
    return `${userId}/${Date.now()}-${rand}.${ext}`;
  };

  const uploadImageIfAny = async (userId: string) => {
    if (!file) return null;

    // Compress before upload
    const { blob, contentType, ext } = await compressImage(file, {
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

  const onSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);

    // Check logged-in user
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user ?? null;

    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    const t = title.trim();
    const c = content.trim();

    if (!category) {
      setErrorMsg("Please select a category");
      setLoading(false);
      return;
    }

    if (!t || !c) {
      setErrorMsg("Please enter a title and content");
      setLoading(false);
      return;
    }

    try {
      const authorName = null;

      // Upload image (if present, compress then upload)
      const imageUrl = await uploadImageIfAny(user.id);

      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: t,
          content: c,
          category,
          user_id: user.id,
          author_name: authorName,
          image_url: imageUrl,
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

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
        >
          ← Back
        </button>

        <h2 className="mt-4 text-xl font-bold">Create New Post</h2>

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {/* Category selection */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="" disabled>
                Select
              </option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Image */}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
            />
          </div>

          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              className="w-full max-h-[400px] object-cover rounded-xl border border-gray-100"
            />
          )}

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400 min-h-[150px]"
          />

          <button
            onClick={onSubmit}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>

          <div className="text-xs text-gray-500">
            Images are automatically resized and compressed before upload.
          </div>
        </div>
      </div>
    </div>
  );
}
