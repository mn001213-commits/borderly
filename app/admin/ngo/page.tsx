"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { listAllNgos, verifyNgo } from "@/lib/ngoService";
import NgoVerifiedBadge from "@/app/components/NgoVerifiedBadge";
import { useT } from "@/app/components/LangProvider";
import { ArrowLeft, ShieldCheck, ShieldOff, User, Search, X } from "lucide-react";

type NgoProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  ngo_verified: boolean;
  ngo_org_name: string | null;
  ngo_org_purpose: string | null;
  ngo_org_url: string | null;
  ngo_purpose: string | null;
  ngo_status: string | null;
  created_at: string;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminNgoPage() {
  const { t } = useT();
  const router = useRouter();
  const [ngos, setNgos] = useState<NgoProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<NgoProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const filtered = useMemo(() => {
    let arr = ngos;
    if (filter !== "all") {
      arr = arr.filter((n) => {
        if (filter === "pending") return !n.ngo_verified && n.ngo_status !== "rejected";
        if (filter === "approved") return n.ngo_verified;
        if (filter === "rejected") return n.ngo_status === "rejected";
        return true;
      });
    }
    const s = search.trim().toLowerCase();
    if (s) {
      arr = arr.filter(
        (n) =>
          (n.ngo_org_name ?? "").toLowerCase().includes(s) ||
          n.display_name.toLowerCase().includes(s)
      );
    }
    return arr;
  }, [ngos, filter, search]);

  const sendEmail = async (userId: string, approved: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      fetch("/api/ngo-approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId, approved }),
      }).catch(() => {});
    }
  };

  const handleVerify = async (id: string, current: boolean) => {
    if (!current) {
      // Approving — do directly
      setBusy(id);
      try {
        await verifyNgo(id, true);
        setNgos((prev) => prev.map((n) => (n.id === id ? { ...n, ngo_verified: true, ngo_status: "approved" } : n)));
        await sendEmail(id, true);
      } catch {}
      setBusy(null);
    } else {
      // Revoking — also do directly (no reason needed for revoke)
      setBusy(id);
      try {
        await verifyNgo(id, false);
        setNgos((prev) => prev.map((n) => (n.id === id ? { ...n, ngo_verified: false, ngo_status: "rejected" } : n)));
        await sendEmail(id, false);
      } catch {}
      setBusy(null);
    }
  };

  const openRejectModal = (n: NgoProfile) => {
    setRejectTarget(n);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setBusy(rejectTarget.id);
    try {
      await verifyNgo(rejectTarget.id, false);
      setNgos((prev) =>
        prev.map((n) => (n.id === rejectTarget.id ? { ...n, ngo_verified: false, ngo_status: "rejected" } : n))
      );
      await sendEmail(rejectTarget.id, false);
    } catch {}
    setBusy(null);
    setRejectTarget(null);
  };

  const statusColor = (n: NgoProfile) => {
    if (n.ngo_verified) return "#43A047";
    if (n.ngo_status === "rejected") return "#E53935";
    return "#F59E0B";
  };

  const statusLabel = (n: NgoProfile) => {
    if (n.ngo_verified) return t("adminNgo.verified");
    if (n.ngo_status === "rejected") return t("adminNgo.rejected");
    return t("adminNgo.pending");
  };

  if (!isAdmin) return null;

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: t("adminNgo.filterAll") },
    { key: "pending", label: t("adminNgo.pending") },
    { key: "approved", label: t("adminNgo.verified") },
    { key: "rejected", label: t("adminNgo.rejected") },
  ];

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70" style={{ background: "var(--light-blue)" }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{t("adminNgo.title")}</h1>
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full" style={{ background: "var(--light-blue)", color: "var(--text-secondary)" }}>
            {filtered.length} / {ngos.length}
          </span>
        </div>

        {/* Search */}
        <div className="mb-3 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("adminNgo.searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)]"
            style={{ color: "var(--deep-navy)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="hover:opacity-70">
              <X className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="b-pill shrink-0"
              style={{
                background: filter === key ? "var(--primary)" : "var(--bg-card)",
                color: filter === key ? "#fff" : "var(--text-secondary)",
                border: filter === key ? "none" : "1px solid var(--border-soft)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="b-skeleton h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="b-card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {t("adminNgo.noAccounts")}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n, idx) => (
              <div key={n.id} className="b-card b-animate-in p-4" style={{ animationDelay: `${idx * 0.04}s` }}>
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  {n.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={n.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" style={{ border: "2px solid var(--border-soft)" }} />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                      <User className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{n.ngo_org_name || n.display_name}</span>
                      <NgoVerifiedBadge verified={n.ngo_verified} />
                    </div>
                    {n.ngo_org_name && (
                      <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{n.display_name}</div>
                    )}
                    {n.ngo_org_url && (
                      <a href={n.ngo_org_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline truncate block" style={{ color: "var(--primary)" }}>{n.ngo_org_url}</a>
                    )}
                    {n.ngo_org_purpose && (
                      <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span className="font-medium" style={{ color: "var(--text-muted)" }}>{t("adminNgo.orgPurpose")}: </span>
                        {n.ngo_org_purpose}
                      </div>
                    )}
                    {n.ngo_purpose && (
                      <div className="mt-1 text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{n.ngo_purpose}</div>
                    )}
                    <div className="text-[11px] mt-1 font-semibold" style={{ color: statusColor(n) }}>
                      {statusLabel(n)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!n.ngo_verified && n.ngo_status !== "rejected" && (
                      <>
                        <button
                          onClick={() => handleVerify(n.id, false)}
                          disabled={busy === n.id}
                          className="inline-flex h-8 items-center gap-1 rounded-2xl px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                          style={{ background: "#43A047" }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {t("adminNgo.verify")}
                        </button>
                        <button
                          onClick={() => openRejectModal(n)}
                          disabled={busy === n.id}
                          className="inline-flex h-8 items-center gap-1 rounded-2xl px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                          style={{ background: "#E53935" }}
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          {t("ngoApp.reject")}
                        </button>
                      </>
                    )}
                    {n.ngo_verified && (
                      <button
                        onClick={() => handleVerify(n.id, true)}
                        disabled={busy === n.id}
                        className="inline-flex h-8 items-center gap-1 rounded-2xl px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                        style={{ background: "#E53935" }}
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                        {t("adminNgo.revoke")}
                      </button>
                    )}
                    {n.ngo_status === "rejected" && !n.ngo_verified && (
                      <button
                        onClick={() => handleVerify(n.id, false)}
                        disabled={busy === n.id}
                        className="inline-flex h-8 items-center gap-1 rounded-2xl px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                        style={{ background: "#43A047" }}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t("adminNgo.verify")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="b-card w-full max-w-sm p-6">
            <h2 className="text-base font-bold mb-1">{t("ngoApp.reject")}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              {rejectTarget.ngo_org_name || rejectTarget.display_name}
            </p>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
              {t("adminNgo.rejectReason")}
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t("adminNgo.rejectReasonPlaceholder")}
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mb-4"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 h-10 rounded-2xl text-sm font-semibold transition hover:opacity-80"
                style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={confirmReject}
                disabled={busy === rejectTarget.id}
                className="flex-1 h-10 rounded-2xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                style={{ background: "#E53935" }}
              >
                {t("adminNgo.confirmReject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
