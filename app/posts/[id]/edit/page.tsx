"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "post-images";

type Category = "info" | "question" | "daily" | "jobs" | "meet" | "general";

const CAT_LABEL: Record<Category, string> = {
  info: "Info Sharing",
  question: "Questions",
  daily: "Daily Life",
  jobs: "Jobs",
  meet: "Meetups",
  general: "General",
};

type Post = {
  id: string;
  title: string;
  content: string;
  author_name: string | null;
  user_id: string | null;
  created_at: string;
  image_url: string | null;
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [category, setCategory] = useState<Category>("general");

  // State for image replacement
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  // Prevent preview URL memory leak
  useEffect(() => {
    return () => {
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    };
  }, [newPreviewUrl]);

  useEffect(() => {
    const load = async () => {
      if (!id || !isUuid(id)) {
        setLoading(false);
        setErrorMsg("Invalid post URL.");
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
        .select("id,title,content,author_name,user_id,created_at,image_url,category")
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
        setErrorMsg("You don't have permission to edit. (Only the author can edit)");
        return;
      }

      setPost(p);
      setTitle(p.title ?? "");
      setContent(p.content ?? "");
      setAuthorName(p.author_name ?? "");
      setCategory((p.category ?? "general") as Category);

      // Reset image state
      setNewFile(null);
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
      setNewPreviewUrl(null);
      setRemoveImage(false);

      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const pickFile = (file: File | null) => {
    setErrorMsg(null);

    if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);

    if (!file) {
      setNewFile(null);
      setNewPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNewFile(null);
      setNewPreviewUrl(null);
      setErrorMsg("Please select an image file only.");
      return;
    }

    setRemoveImage(false);
    setNewFile(file);
    setNewPreviewUrl(URL.createObjectURL(file));
  };

  const uploadToStorage = async (file: File, userId: string, postId: string) => {
    // Compress before upload
    const { blob, contentType, ext } = await compressImage(file, {
      maxSize: 1600,
      quality: 0.82,
      mime: "image/jpeg",
    });

    const path = `posts/${postId}/${userId}_${Date.now()}.${ext}`;

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

    const t = title.trim();
    const c = content.trim();
    const a = authorName.trim();

    if (!t || !c) {
      setErrorMsg("Please enter a title and content.");
      return;
    }

    setSaving(true);

    try {
      let nextImageUrl: string | null = post.image_url ?? null;

      if (removeImage) {
        nextImageUrl = null;
      } else if (newFile) {
        nextImageUrl = await uploadToStorage(newFile, myId, post.id);
      }

      const { error, count } = await supabase
        .from("posts")
        .update(
          {
            title: t,
            content: c,
            author_name: a || null,
            image_url: nextImageUrl,
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
        setErrorMsg("Edit failed: You don't have permission to edit this post.");
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
            ← Go Back
          </Link>
        </div>

        <h1 className="text-xl font-bold">Edit Post</h1>

        {loading && <div className="mt-3 text-sm text-gray-500">Loading...</div>}
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
              placeholder="Title"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
              >
                {Object.keys(CAT_LABEL).map((k) => (
                  <option key={k} value={k}>
                    {CAT_LABEL[k as Category]}
                  </option>
                ))}
              </select>
            </div>

            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Author (optional)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Content"
              rows={10}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400 min-h-[150px]"
            />

            {/* Image replace/delete */}
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm font-semibold text-gray-700">Image (auto-compressed before upload)</div>

              {post.image_url && !removeImage && !newPreviewUrl ? (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image_url}
                    alt="current"
                    className="w-full max-h-[400px] object-cover rounded-xl border border-gray-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveImage(true);
                        setNewFile(null);
                        if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
                        setNewPreviewUrl(null);
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
                    >
                      Delete Current Image
                    </button>
                  </div>
                </div>
              ) : null}

              {removeImage ? (
                <div className="mt-2 text-sm font-semibold text-red-700">
                  The image will be deleted when you save.
                </div>
              ) : null}

              {newPreviewUrl ? (
                <div className="mt-3 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={newPreviewUrl}
                    alt="preview"
                    className="w-full max-h-[400px] object-cover rounded-xl border border-gray-100"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => pickFile(null)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
                    >
                      Cancel Selection
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                />
                <div className="mt-1 text-xs text-gray-500">
                  Resized to max 1600px and compressed before upload.
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
