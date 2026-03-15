"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { listNgoPosts, listApplications, updateApplicationStatus, createNgoConversation, type NgoPost, type NgoApplication } from "@/lib/ngoService";
import { createNotification } from "@/lib/notificationService";
import { useT } from "@/app/components/LangProvider";
import { ArrowLeft, CheckCircle, XCircle, Clock, MessageCircle } from "lucide-react";

export default function NgoApplicationsPage() {
  const { t } = useT();
  const router = useRouter();

  const [myUid, setMyUid] = useState<string | null>(null);
  const [posts, setPosts] = useState<NgoPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [apps, setApps] = useState<NgoApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMyUid(user.id);

      try {
        const all = await listNgoPosts(200);
        const mine = all.filter((p) => p.ngo_user_id === user.id);
        setPosts(mine);
        if (mine.length > 0) {
          setSelectedPostId(mine[0].id);
        }
      } catch (e: any) {
        setErrorMsg(e?.message);
      }
      setLoading(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!selectedPostId) { setApps([]); return; }
    (async () => {
      setAppsLoading(true);
      try {
        const list = await listApplications(selectedPostId);
        setApps(list);
      } catch {
        setApps([]);
      }
      setAppsLoading(false);
    })();
  }, [selectedPostId]);

  const handleApprove = async (app: NgoApplication) => {
    if (!myUid || !selectedPostId) return;
    setBusy(app.id);
    setErrorMsg(null);

    try {
      await updateApplicationStatus(app.id, "approved");

      // Create NGO conversation
      const post = posts.find((p) => p.id === selectedPostId);
      const convId = await createNgoConversation(myUid, app.applicant_id, post?.title ?? "Partner Support");

      // Notify applicant
      await createNotification({
        userId: app.applicant_id,
        type: "meet",
        title: t("ngoApp.notifyApprovedTitle"),
        body: `${t("ngoApp.notifyApprovedBody")} "${post?.title}"`,
        link: `/chats/${convId}`,
      });

      setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "approved" as const } : a)));
    } catch (e: any) {
      setErrorMsg(e?.message || t("ngoApp.failedApprove"));
    }
    setBusy(null);
  };

  const handleReject = async (app: NgoApplication) => {
    setBusy(app.id);
    try {
      await updateApplicationStatus(app.id, "rejected");
      setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: "rejected" as const } : a)));
    } catch (e: any) {
      setErrorMsg(e?.message || t("ngoApp.failedReject"));
    }
    setBusy(null);
  };

  const statusBadge = (status: string) => {
    if (status === "approved") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><CheckCircle className="h-3.5 w-3.5" />{t("ngoDetail.statusApproved")}</span>;
    if (status === "rejected") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><XCircle className="h-3.5 w-3.5" />{t("ngoDetail.statusRejected")}</span>;
    return <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}><Clock className="h-3.5 w-3.5" />{t("ngoApp.pending")}</span>;
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70" style={{ background: "var(--light-blue)" }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{t("ngo.applications")}</h1>
        </div>

        {errorMsg && <div className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>{errorMsg}</div>}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="b-skeleton h-16" />)}</div>
        ) : posts.length === 0 ? (
          <div className="b-card p-6 text-center">
            <div className="text-sm font-semibold">{t("ngoApp.noPostsYet")}</div>
            <Link href="/ngo/new" className="mt-2 inline-block text-sm font-medium" style={{ color: "#43A047" }}>{t("ngoApp.createFirst")}</Link>
          </div>
        ) : (
          <>
            {/* Post selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
              {posts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPostId(p.id)}
                  className="b-pill shrink-0"
                  style={{
                    background: selectedPostId === p.id ? "#43A047" : "var(--bg-card)",
                    color: selectedPostId === p.id ? "#fff" : "var(--text-secondary)",
                    border: selectedPostId === p.id ? "none" : "1px solid var(--border-soft)",
                  }}
                >
                  {p.title.length > 25 ? p.title.slice(0, 25) + "..." : p.title}
                </button>
              ))}
            </div>

            {/* Applications list */}
            {appsLoading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="b-skeleton h-32" />)}</div>
            ) : apps.length === 0 ? (
              <div className="b-card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {t("ngoApp.noApps")}
              </div>
            ) : (
              <div className="space-y-3">
                {apps.map((app, idx) => {
                  const post = posts.find((p) => p.id === selectedPostId);
                  const questions = (post?.questions as string[]) ?? [];

                  return (
                    <div key={app.id} className="b-card b-animate-in p-5" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-semibold text-sm">{app.applicant_name ?? t("ngoApp.unknown")}</div>
                        {statusBadge(app.status)}
                      </div>

                      {/* Answers */}
                      <div className="space-y-3">
                        {questions.map((q, i) => (
                          <div key={i}>
                            <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>{q}</div>
                            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{(app.answers as string[])?.[i] ?? "-"}</div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      {app.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleApprove(app)}
                            disabled={busy === app.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                            style={{ background: "#43A047" }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {t("ngoApp.approve")}
                          </button>
                          <button
                            onClick={() => handleReject(app)}
                            disabled={busy === app.id}
                            className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                            style={{ background: "#E53935" }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {t("ngoApp.reject")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
