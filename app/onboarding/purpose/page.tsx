"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PurposeKey = "community" | "volunteer" | "help" | "ngo" | "jobs";

export default function PurposeOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const options = useMemo(
    () =>
      [
        { key: "community" as const, label: "커뮤니티/친구 만들기" },
        { key: "volunteer" as const, label: "재능기부/봉사" },
        { key: "help" as const, label: "도움 요청/상담" },
        { key: "ngo" as const, label: "NGO 활동/프로그램 관심" },
        { key: "jobs" as const, label: "일자리/교육 정보 탐색" },
      ] as const,
    []
  );

  const [selected, setSelected] = useState<Record<PurposeKey, boolean>>({
    community: false,
    volunteer: false,
    help: false,
    ngo: false,
    jobs: false,
  });

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      // 이미 선택했으면 홈으로 보내기
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("usage_purposes")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      const current = (profile?.usage_purposes ?? []) as string[];
      if (current.length > 0) {
        router.replace("/");
        return;
      }

      setLoading(false);
    };

    run();
  }, [router]);

  const toggle = (k: PurposeKey) => {
    setSelected((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const onSave = async () => {
    setSaving(true);
    setErrorMsg(null);

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    const purposes = (Object.keys(selected) as PurposeKey[]).filter((k) => selected[k]);
    if (purposes.length === 0) {
      setErrorMsg("최소 1개는 선택해줘!");
      setSaving(false);
      return;
    }

    // ✅ update 대신 upsert: profiles 행이 없으면 생성, 있으면 업데이트
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        usage_purposes: purposes,
      },
      { onConflict: "id" }
    );

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    // ✅ 저장했으면 스킵 유예는 제거
    localStorage.removeItem("purpose_skip_until");
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-2xl border p-6">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">가입 목적을 선택해줘</h1>
        <p className="mt-2 text-sm text-gray-600">선택한 목적은 나중에 글/사람 추천과 필터에 활용돼.</p>

        <div className="mt-5 space-y-3">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              className={[
                "w-full rounded-xl border px-4 py-3 text-left transition",
                selected[o.key] ? "border-black bg-gray-50" : "hover:bg-gray-50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.label}</span>
                <span className="text-sm">{selected[o.key] ? "✅" : "⬜️"}</span>
              </div>
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장하고 시작하기"}
          </button>

          <button
            type="button"
            onClick={() => {
              // ✅ 24시간 유예
              const H = 24;
              localStorage.setItem("purpose_skip_until", String(Date.now() + H * 60 * 60 * 1000));
              router.replace("/");
            }}
            className="rounded-xl border px-4 py-2"
          >
            나중에 할게
          </button>
        </div>
      </div>
    </div>
  );
}