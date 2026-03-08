"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BUCKET = "post-images";

// ✅ 이미지 리사이즈/압축 (최대 1600px, 품질 0.82)
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

  // 투명 배경 흰색 처리(투명 유지 필요하면 말해줘)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, nw, nh);

  ctx.drawImage(img, 0, 0, nw, nh);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환 실패"))), mime, quality);
  });

  const ext = mime === "image/webp" ? "webp" : "jpg";
  return { blob, contentType: mime, ext };
}

type Category = "info" | "question" | "daily" | "jobs" | "meet" | "general";

const CATEGORY_OPTIONS: Array<{ value: Category; label: string }> = [
  { value: "info", label: "정보 공유" },
  { value: "question", label: "질문" },
  { value: "daily", label: "일상" },
  { value: "jobs", label: "일자리" },
  { value: "meet", label: "교류" },
  { value: "general", label: "자유" },
];

export default function CreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // ✅ 카테고리: 기본값 없음(강제 선택)
  const [category, setCategory] = useState<Category | "">("");

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 이미지 미리보기
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const S = useMemo(() => {
    const bg = "#E0F2FE";
    const text = "#111827";
    const line = "rgba(0,0,0,0.12)";
    const card = "rgba(255,255,255,0.92)";
    const mint = "#49D6B5";
    return { bg, text, line, card, mint };
  }, []);

  // ✅ 파일 경로 생성(확장자 포함)
  const makeSafePath = (userId: string, ext: string) => {
    const rand = Math.random().toString(16).slice(2);
    return `${userId}/${Date.now()}-${rand}.${ext}`;
  };

  const uploadImageIfAny = async (userId: string) => {
    if (!file) return null;

    // ✅ 업로드 전에 압축
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

    // ✅ 로그인 유저 확인
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
      setErrorMsg("카테고리를 선택해줘");
      setLoading(false);
      return;
    }

    if (!t || !c) {
      setErrorMsg("제목/내용을 입력해줘");
      setLoading(false);
      return;
    }

    try {
      const authorName = null;

      // ✅ 이미지 업로드(있으면, 압축 후 업로드)
      const imageUrl = await uploadImageIfAny(user.id);

      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: t,
          content: c,
          category, // ✅ 선택값 저장
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
      setErrorMsg(e?.message || "업로드/저장 중 오류");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: 20 }}>
        <button onClick={() => router.back()}>← 뒤로</button>
        <h2>새 게시물 작성</h2>

        {errorMsg && <div style={{ color: "red", marginBottom: 10 }}>{errorMsg}</div>}

        {/* ✅ 카테고리 선택 */}
        <div
          style={{
            marginTop: 10,
            borderRadius: 12,
            border: `1px solid ${S.line}`,
            background: S.card,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(17,24,39,0.72)", marginBottom: 6 }}>
            카테고리
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 10,
              border: `1px solid ${S.line}`,
              background: "rgba(255,255,255,0.85)",
              fontSize: 13,
              fontWeight: 900,
              outline: "none",
            }}
          >
            <option value="" disabled>
              선택해줘
            </option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* 이미지 */}
        <div style={{ marginTop: 10 }}>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="preview"
            style={{
              width: "100%",
              maxHeight: 400,
              objectFit: "cover",
              marginTop: 10,
              borderRadius: 12,
              border: `1px solid ${S.line}`,
              background: "white",
            }}
          />
        )}

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          style={{
            display: "block",
            marginTop: 10,
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${S.line}`,
          }}
        />

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용"
          style={{
            display: "block",
            marginTop: 10,
            width: "100%",
            minHeight: 150,
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${S.line}`,
          }}
        />

        <button
          onClick={onSubmit}
          disabled={loading}
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "none",
            background: loading ? "rgba(73,214,181,0.35)" : S.mint,
            color: "#062018",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 900,
          }}
        >
          {loading ? "등록 중..." : "등록"}
        </button>

        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(17,24,39,0.6)" }}>
          이미지가 있다면 업로드 전에 자동으로 리사이즈/압축돼.
        </div>
      </div>
    </div>
  );
}