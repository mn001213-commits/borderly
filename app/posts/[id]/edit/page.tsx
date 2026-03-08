"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "post-images"; // ✅ 너의 Supabase Storage 버킷명으로 맞춰줘

type Category = "info" | "question" | "daily" | "jobs" | "meet" | "general";

const CAT_LABEL: Record<Category, string> = {
  info: "정보 공유",
  question: "질문",
  daily: "일상",
  jobs: "일자리",
  meet: "교류",
  general: "자유",
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

// ✅ 이미지 리사이즈/압축 (최대 1600px, 품질 0.82)
// - PNG/GIF도 업로드 전에 JPEG로 압축(용량 절감 목적)
// - 투명 배경은 흰색으로 깔림 (투명 유지가 필요하면 말해줘)
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
    r.onerror = () => reject(new Error("이미지 읽기 실패"));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("이미지 로드 실패"));
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
  if (!ctx) throw new Error("canvas context 생성 실패");

  // 투명 배경 흰색 처리(원하면 제거 가능)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, nw, nh);

  ctx.drawImage(img, 0, 0, nw, nh);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))),
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

  // ✅ 이미지 교체용 상태
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  // ✅ preview URL 누수 방지
  useEffect(() => {
    return () => {
      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    };
  }, [newPreviewUrl]);

  useEffect(() => {
    const load = async () => {
      if (!id || !isUuid(id)) {
        setLoading(false);
        setErrorMsg("잘못된 게시글 주소야.");
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      // 1) 로그인 체크
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      if (!uid) {
        router.replace("/auth");
        return;
      }
      setMyId(uid);

      // 2) 글 불러오기
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

      // 3) 소유자 체크
      if (!p.user_id || p.user_id !== uid) {
        setLoading(false);
        setErrorMsg("수정 권한이 없어. (작성자만 수정 가능)");
        return;
      }

      setPost(p);
      setTitle(p.title ?? "");
      setContent(p.content ?? "");
      setAuthorName(p.author_name ?? "");
      setCategory((p.category ?? "general") as Category);

      // 이미지 상태 초기화
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
      setErrorMsg("이미지 파일만 선택해줘.");
      return;
    }

    setRemoveImage(false);
    setNewFile(file);
    setNewPreviewUrl(URL.createObjectURL(file));
  };

  const uploadToStorage = async (file: File, userId: string, postId: string) => {
    // ✅ 업로드 전에 압축
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
    if (!publicUrl) throw new Error("이미지 URL 생성 실패");
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
      setErrorMsg("제목/내용을 입력해줘.");
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
        setErrorMsg("수정 실패: 권한이 없어서 수정할 수 없어.");
        return;
      }

      router.push(`/posts/${post.id}`);
      router.refresh();
    } catch (err: any) {
      setSaving(false);
      setErrorMsg(err?.message ?? "이미지 업로드 중 오류");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={post ? `/posts/${post.id}` : "/"} style={{ textDecoration: "none" }}>
          ← 돌아가기
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 900 }}>글 수정</h1>

      {loading && <div style={{ marginTop: 12 }}>불러오는 중...</div>}
      {errorMsg && <div style={{ marginTop: 12, color: "crimson" }}>{errorMsg}</div>}

      {!loading && post && (
        <form onSubmit={onSave} style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
          />

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>카테고리</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10, background: "white" }}
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
            placeholder="작성자(선택)"
            style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용"
            rows={10}
            style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
          />

          {/* ✅ 이미지 교체/삭제 */}
          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>이미지 (업로드 전 자동 압축됨)</div>

            {post.image_url && !removeImage && !newPreviewUrl ? (
              <div style={{ display: "grid", gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image_url}
                  alt="current"
                  style={{
                    width: "100%",
                    maxHeight: 360,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #eee",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveImage(true);
                      setNewFile(null);
                      if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
                      setNewPreviewUrl(null);
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    현재 이미지 삭제
                  </button>
                </div>
              </div>
            ) : null}

            {removeImage ? (
              <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 900 }}>
                저장하면 이미지가 삭제돼.
              </div>
            ) : null}

            {newPreviewUrl ? (
              <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={newPreviewUrl}
                  alt="preview"
                  style={{
                    width: "100%",
                    maxHeight: 360,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #eee",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => pickFile(null)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #111",
                      background: "white",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    선택 취소
                  </button>
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 10 }}>
              <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                최대 1600px로 리사이즈 + 압축 후 업로드돼.
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #111",
              background: saving ? "#ddd" : "#111",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              fontWeight: 900,
            }}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </form>
      )}
    </div>
  );
}