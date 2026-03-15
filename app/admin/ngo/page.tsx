"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { listAllNgos, verifyNgo } from "@/lib/ngoService";
import NgoVerifiedBadge from "@/app/components/NgoVerifiedBadge";
import { useT } from "@/app/components/LangProvider";
import { ArrowLeft, ShieldCheck, ShieldOff, User } from "lucide-react";

type NgoProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  ngo_verified: boolean;
  created_at: string;
};

export default function AdminNgoPage() {
  const { t } = useT();
  const router = useRouter();
  const [ngos, setNgos] = useState<NgoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (prof?.role !== "admin") { router.replace("/"); return; }
      setIsAdmin(true);

      try {
        const list = await listAllNgos();
        setNgos(list as NgoProfile[]);
      } catch { setNgos([]); }
      setLoading(false);
    })();
  }, [router]);

  const toggleVerify = async (id: string, current: boolean) => {
    setBusy(id);
    try {
      await verifyNgo(id, !current);
      setNgos((prev) => prev.map((n) => (n.id === id ? { ...n, ngo_verified: !current } : n)));
    } catch {}
    setBusy(null);
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70" style={{ background: "var(--light-blue)" }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{t("adminNgo.title")}</h1>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="b-skeleton h-16" />)}</div>
        ) : ngos.length === 0 ? (
          <div className="b-card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {t("adminNgo.noAccounts")}
          </div>
        ) : (
          <div className="space-y-3">
            {ngos.map((n, idx) => (
              <div key={n.id} className="b-card b-animate-in p-4 flex items-center gap-4" style={{ animationDelay: `${idx * 0.04}s` }}>
                {n.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" style={{ border: "2px solid var(--border-soft)" }} />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                    <User className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">{n.display_name}</span>
                    <NgoVerifiedBadge verified={n.ngo_verified} />
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {n.ngo_verified ? t("adminNgo.verified") : t("adminNgo.notVerified")}
                  </div>
                </div>

                <button
                  onClick={() => toggleVerify(n.id, n.ngo_verified)}
                  disabled={busy === n.id}
                  className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-4 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: n.ngo_verified ? "#E53935" : "#43A047" }}
                >
                  {n.ngo_verified ? <><ShieldOff className="h-3.5 w-3.5" />{t("adminNgo.revoke")}</> : <><ShieldCheck className="h-3.5 w-3.5" />{t("adminNgo.verify")}</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
