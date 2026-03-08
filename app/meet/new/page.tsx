"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type MeetType =
  | "hangout"
  | "study"
  | "skill"
  | "language"
  | "meal"
  | "party"
  | "project"
  | "sports";

// ✅ 지금 Storage에 있는 버킷으로 맞춤 (스샷 기준)
const BUCKET = "post-images";

export default function NewMeetPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<MeetType>("hangout");
  const [sport, setSport] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [placeHint, setPlaceHint] = useState("");
  const [startAt, setStartAt] = useState("");
  const [maxPeople, setMaxPeople] = useState("");

  // ✅ 커버 이미지
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("제목과 설명은 필수입니다.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        return;
      }

      // ✅ 커버 이미지 업로드 (선택)
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

        // ✅ public 버킷이면 publicUrl 사용 가능
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        image_url = data?.publicUrl ?? null;
      }

      // 1) meet_posts 생성 (id 받아오기)
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
          start_at: startAt ? new Date(startAt).toISOString() : null,
          max_people: maxPeople ? Number(maxPeople) : null,
          image_url,
        })
        .select("id")
        .single();

      if (e1 || !createdMeet) {
        alert(e1?.message || "모임 생성 실패");
        return;
      }

      const meetId = createdMeet.id as string;

      // 2) conversations 생성 (FK 깨지는 문제 방지용)
      // ⚠️ 만약 conversations 테이블 컬럼이 다르면, 여기 insert 컬럼만 너 스키마에 맞게 바꾸면 됨
      const { data: conv, error: eConv } = await supabase
        .from("conversations")
        .insert({
          type: "group", // ✅ 스키마에 맞게 (예: kind, conversation_type 등) 필요하면 변경
        })
        .select("id")
        .single();

      if (eConv || !conv) {
        alert(eConv?.message || "대화방 생성 실패 (conversations)");
        return;
      }

      const conversationId = conv.id as string;

      // 3) group_conversations upsert (409 Conflict 방지)
      const { error: e2 } = await supabase
        .from("group_conversations")
        .upsert(
          { meet_id: meetId, conversation_id: conversationId },
          { onConflict: "meet_id" }
        );

      if (e2) {
        alert(e2.message || "단톡방 매핑 실패");
        return;
      }

      // 4) host를 conversation_members에 추가
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

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="text-xl font-bold mb-4">모임 만들기</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">모임 종류</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MeetType)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="hangout">번개</option>
            <option value="study">스터디</option>
            <option value="language">언어교환</option>
            <option value="meal">밥친구</option>
            <option value="sports">스포츠</option>
            <option value="skill">재능교환</option>
            <option value="project">팀원모집</option>
            <option value="party">파티</option>
          </select>
        </div>

        {type === "sports" && (
          <div>
            <label className="block text-sm font-medium mb-1">종목</label>
            <input
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="예: 축구, 농구, 러닝"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 h-32"
            maxLength={4000}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">도시 (선택)</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="예: 서울, 교토"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">장소 힌트 (선택)</label>
          <input
            value={placeHint}
            onChange={(e) => setPlaceHint(e.target.value)}
            placeholder="예: 홍대 근처"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {/* ✅ 커버 이미지 */}
        <div>
          <label className="block text-sm font-medium mb-1">커버 이미지 (선택)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;

              if (coverPreview) URL.revokeObjectURL(coverPreview);

              setCoverFile(f);

              if (f) setCoverPreview(URL.createObjectURL(f));
              else setCoverPreview(null);
            }}
            className="w-full border rounded-lg px-3 py-2 bg-white"
          />

          {coverPreview ? (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="preview"
                className="h-40 w-full rounded-2xl border object-cover"
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">날짜/시간 (선택)</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">최대 인원 (선택)</label>
          <input
            type="number"
            value={maxPeople}
            onChange={(e) => setMaxPeople(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            min={2}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-lg font-semibold hover:opacity-90"
        >
          {loading ? "생성 중..." : "생성하기"}
        </button>
      </form>
    </div>
  );
}