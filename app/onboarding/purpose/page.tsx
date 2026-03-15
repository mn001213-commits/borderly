"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/app/components/LangProvider";

type PurposeKey = "community" | "volunteer" | "help" | "ngo" | "jobs";

export default function PurposeOnboardingPage() {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const options = useMemo(
    () =>
      [
        { key: "community" as const, labelKey: "onboardingPurpose.community" },
        { key: "volunteer" as const, labelKey: "onboardingPurpose.volunteer" },
        { key: "help" as const, labelKey: "onboardingPurpose.help" },
        { key: "ngo" as const, labelKey: "onboardingPurpose.ngo" },
        { key: "jobs" as const, labelKey: "onboardingPurpose.jobs" },
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
      setErrorMsg(t("onboardingPurpose.selectAtLeastOne"));
      setSaving(false);
      return;
    }

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

    localStorage.removeItem("purpose_skip_until");
    router.replace("/");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-2xl border p-6">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border bg-white/80 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{t("onboardingPurpose.title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("onboardingPurpose.desc")}</p>

        <div className="mt-5 space-y-3">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => toggle(o.key)}
              className={[
                "w-full rounded-xl border px-4 py-3 text-left transition",
                selected[o.key] ? "border-blue-600 bg-[#F0F7FF]" : "hover:bg-[#F0F7FF]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t(o.labelKey)}</span>
                <span className="text-sm">{selected[o.key] ? t("onboardingPurpose.selected") : ""}</span>
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
            className="rounded-xl bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          >
            {saving ? t("onboardingPurpose.saving") : t("onboardingPurpose.saveAndContinue")}
          </button>

          <button
            type="button"
            onClick={() => {
              const H = 24;
              localStorage.setItem("purpose_skip_until", String(Date.now() + H * 60 * 60 * 1000));
              router.replace("/");
            }}
            className="rounded-xl border px-4 py-2"
          >
            {t("onboardingPurpose.later")}
          </button>
        </div>
      </div>
    </div>
  );
}
