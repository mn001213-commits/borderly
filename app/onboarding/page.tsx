"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const PURPOSES = ["개인교류", "재능기부", "NGO연결", "비자/법률도움", "기타"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number] | "">("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) {
        router.push("/login");
        return;
      }
      setMyId(uid);

      const { data: profile } = await supabase
        .from("profiles")
        .select("use_purpose")
        .eq("id", uid)
        .single();

      // 이미 목적이 있으면 홈으로
      if (profile?.use_purpose) {
        router.push("/");
        return;
      }

      setLoading(false);
    })();
  }, [router]);

  const save = async () => {
    if (!myId || !purpose) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ use_purpose: purpose })
      .eq("id", myId);

    setSaving(false);

    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }

    router.push("/");
  };

  if (loading) return <div className="p-6">로딩중...</div>;

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-xl font-bold mb-2">이용 목적을 선택해줘</div>
        <div className="text-sm opacity-80 mb-4">
          가입 목적은 1개만 선택할 수 있어. (나중에 설정 페이지에서 변경 가능하게 만들 예정)
        </div>

        <div className="space-y-2">
          {PURPOSES.map((p) => (
            <label
              key={p}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                purpose === p ? "border-white/30 bg-white/10" : "border-white/10 bg-white/5"
              }`}
            >
              <input
                type="radio"
                name="purpose"
                value={p}
                checked={purpose === p}
                onChange={() => setPurpose(p)}
              />
              <span>{p}</span>
            </label>
          ))}
        </div>

        <button
          onClick={save}
          disabled={!purpose || saving}
          className="mt-4 w-full rounded-xl bg-white/90 text-black py-3 font-semibold disabled:opacity-50"
        >
          {saving ? "저장중..." : "저장하고 시작하기"}
        </button>
      </div>
    </div>
  );
}