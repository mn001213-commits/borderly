"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  listNgoPosts,
  listApplications,
  updateApplicationStatus,
  createNgoConversation,
  deleteNgoPost,
  type NgoPost,
  type NgoApplication,
} from "@/lib/ngoService";
import { createNotification } from "@/lib/notificationService";
import { useT } from "@/app/components/LangProvider";
import { formatRelative } from "@/lib/format";
import {
  ArrowLeft, Plus, CheckCircle, XCircle, Clock,
  FileText, Users, Pencil, Trash2, User,
} from "lucide-react";

type Tab = "posts" | "applications";
type AppFilter = "all" | "pending" | "approved" | "rejected";

type NgoProfile = {
  ngo_verified: boolean;
  ngo_status: string | null;
  ngo_org_name: string | null;
  avatar_url: string | null;
};

export default function NgoPortalPage() {
  const { t } = useT();
  const router = useRouter();

  const [myUid, setMyUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<NgoProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Posts tab
  const [posts, setPosts] = useState<NgoPost[]>([]);

  // Applications tab
  const [tab, setTab] = useState<Tab>("posts");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [apps, setApps] = useState<NgoApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appFilter, setAppFilter] = useState<AppFilter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Auth + profile check
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setMyUid(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("ngo_verified, ngo_status, ngo_org_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(prof as NgoProfile | null);

      if (prof?.ngo_verified) {
        const all = await listNgoPosts(undefined, 200);
        setPosts(all.filter((p) => p.ngo_user_id === user.id));
      }

      setLoading(false);
    })();
  }, [router]);

  // Load applications when post selected
  useEffect(() => {
    if (!selectedPostId) { setApps([]); return; }
    (async () => {
      setAppsLoading(true);
      try {
        setApps(await listApplications(selectedPostId));
      } catch {
        setApps([]);
      }
      setAppsLoading(false);
    })();
  }, [selectedPostId]);

  const handleApprove = async (app: NgoApplication) => {
    if (!myUid || !selectedPostId) return;
    setBusy(app.id);
    setErr(null);
    try {
      await updateApplicationStatus(app.id, "approved");
      const post = posts.find((p) => p.id === selectedPostId);
      const convId = await createNgoConversation(myUid, app.applicant_id, post?.title ?? "Supporter");
      await createNotification({
        userId: app.applicant_id,
        type: "meet",
        title: t("ngoApp.notifyApprovedTitle"),
        body: `${t("ngoApp.notifyApprovedBody")} "${post?.title}"`,
        link: `/chats/${convId}`,
      });
      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "approved" as const } : a));
      setPosts((prev) => prev.map((p) => p.id === selectedPostId
        ? { ...p, approved_count: (p.approved_count ?? 0) + 1 }
        : p));
    } catch (e: any) {
      setErr(e?.message || t("ngoApp.failedApprove"));
    }
    setBusy(null);
  };

  const handleReject = async (app: NgoApplication) => {
    setBusy(app.id);
    setErr(null);
    try {
      await updateApplicationStatus(app.id, "rejected");
      setApps((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "rejected" as const } : a));
    } catch (e: any) {
      setErr(e?.message || t("ngoApp.failedReject"));
    }
    setBusy(null);
  };

  const handleDelete = async (postId: string) => {
    if (!confirm(t("ngoPortal.confirmDelete"))) return;
    try {
      await deleteNgoPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      if (selectedPostId === postId) setSelectedPostId(null);
    } catch (e: any) {
      setErr(e?.message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="b-skeleton h-16 rounded-2xl" />)}
      </div>
    );
  }

  // Not an NGO account
  if (!profile?.ngo_verified) {
    return (
      <div className="mx-auto max-w-lg px-4 pt-12 text-center">
        <div className="b-card p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full mx-auto mb-4" style={{ background: "var(--light-blue)" }}>
            <FileText className="h-7 w-7" style={{ color: "var(--primary)" }} />
          </div>
          <div className="text-base font-bold mb-2" style={{ color: "var(--deep-navy)" }}>
            {profile?.ngo_status === "pending"
              ? t("ngo.pendingNotice")
              : profile?.ngo_status === "rejected"
              ? t("ngo.rejectedNotice")
              : t("ngoPortal.notVerified")}
          </div>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            {!profile?.ngo_status ? t("ngoPortal.applyFirst") : t("ngoPortal.notVerified")}
          </p>
          <Link href="/ngo" className="inline-flex h-10 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white no-underline" style={{ background: "var(--primary)" }}>
            {t("ngo.title")}
          </Link>
        </div>
      </div>
    );
  }

  // Stats
  const totalApps = posts.reduce((s, p) => s + (p.application_count ?? 0), 0);
  const totalApproved = posts.reduce((s, p) => s + (p.approved_count ?? 0), 0);
  const totalPending = totalApps - totalApproved;

  // Filtered applications
  const filteredApps = appFilter === "all" ? apps : apps.filter((a) => a.status === appFilter);

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ background: "var(--light-blue)" }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{t("ngoPortal.title")}</h1>
            {profile.ngo_org_name && (
              <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{profile.ngo_org_name}</p>
            )}
          </div>
          <Link
            href="/ngo/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-white no-underline transition hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            <Plus className="h-4 w-4" />
            {t("ngoPortal.newPost")}
          </Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: t("ngoPortal.totalPosts"), value: posts.length, color: "var(--primary)" },
            { label: t("ngoPortal.totalApps"), value: totalApps, color: "#8B5CF6" },
            { label: t("ngoPortal.pendingApps"), value: totalPending, color: "#F59E0B" },
            { label: t("ngoPortal.approvedApps"), value: totalApproved, color: "#10B981" },
          ].map((c) => (
            <div key={c.label} className="b-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
              <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "var(--text-muted)" }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 rounded-2xl p-1" style={{ background: "var(--light-blue)" }}>
          {(["posts", "applications"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition"
              style={{
                background: tab === tb ? "var(--bg-card)" : "transparent",
                color: tab === tb ? "var(--deep-navy)" : "var(--text-secondary)",
                boxShadow: tab === tb ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {tb === "posts" ? t("ngoPortal.tabPosts") : t("ngoPortal.tabApplications")}
            </button>
          ))}
        </div>

        {err && (
          <div className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
            {err}
          </div>
        )}

        {/* ── Posts Tab ── */}
        {tab === "posts" && (
          posts.length === 0 ? (
            <div className="b-card p-8 text-center">
              <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>{t("ngoPortal.noPosts")}</div>
              <Link href="/ngo/new" className="inline-flex h-10 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white no-underline" style={{ background: "var(--primary)" }}>
                <Plus className="h-4 w-4" />{t("ngoPortal.newPost")}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post, idx) => (
                <div key={post.id} className="b-card b-animate-in p-4" style={{ animationDelay: `${idx * 0.04}s` }}>
                  <div className="flex items-start gap-3">
                    {post.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={post.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "var(--light-blue)" }}>
                        <FileText className="h-6 w-6" style={{ color: "var(--primary)" }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold truncate">{post.title}</span>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: post.is_closed ? "var(--light-blue)" : "#DCFCE7",
                            color: post.is_closed ? "var(--text-muted)" : "#15803D",
                          }}
                        >
                          {post.is_closed ? t("ngoPortal.closed") : t("ngoPortal.open")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {post.application_count ?? 0} {t("ngoPortal.applicants")}
                        </span>
                        <span className="flex items-center gap-1 text-green-600 font-medium">
                          <CheckCircle className="h-3 w-3" />
                          {post.approved_count ?? 0}
                        </span>
                        {post.max_applicants && (
                          <span>{t("ngo.max")} {post.max_applicants}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Link
                        href={`/ngo/${post.id}/edit`}
                        className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-semibold no-underline transition hover:opacity-80"
                        style={{ background: "var(--light-blue)", color: "var(--deep-navy)" }}
                      >
                        <Pencil className="h-3 w-3" />
                        {t("ngoPortal.editPost")}
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedPostId(post.id);
                          setTab("applications");
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-semibold transition hover:opacity-80"
                        style={{ background: "var(--light-blue)", color: "var(--primary)" }}
                      >
                        <Users className="h-3 w-3" />
                        {t("ngoPortal.tabApplications")}
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-white transition hover:opacity-80"
                        style={{ background: "#EF4444" }}
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("ngoPortal.deletePost")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Applications Tab ── */}
        {tab === "applications" && (
          <>
            {/* Post selector */}
            {posts.length === 0 ? (
              <div className="b-card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {t("ngoPortal.noPosts")}
              </div>
            ) : (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                  {posts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPostId(p.id)}
                      className="b-pill shrink-0 text-left"
                      style={{
                        background: selectedPostId === p.id ? "var(--primary)" : "var(--bg-card)",
                        color: selectedPostId === p.id ? "#fff" : "var(--text-secondary)",
                        border: selectedPostId === p.id ? "none" : "1px solid var(--border-soft)",
                      }}
                    >
                      {p.title.length > 20 ? p.title.slice(0, 20) + "…" : p.title}
                      {(p.application_count ?? 0) > 0 && (
                        <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: selectedPostId === p.id ? "rgba(255,255,255,0.25)" : "var(--light-blue)" }}>
                          {p.application_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Status filter */}
                {selectedPostId && (
                  <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                    {(["all", "pending", "approved", "rejected"] as AppFilter[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setAppFilter(f)}
                        className="b-pill shrink-0"
                        style={{
                          background: appFilter === f ? "var(--deep-navy)" : "var(--bg-card)",
                          color: appFilter === f ? "#fff" : "var(--text-secondary)",
                          border: appFilter === f ? "none" : "1px solid var(--border-soft)",
                        }}
                      >
                        {t(`ngoPortal.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
                        {f === "pending" && apps.filter((a) => a.status === "pending").length > 0 && (
                          <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: appFilter === "pending" ? "rgba(255,255,255,0.25)" : "#FEF3C7", color: "#92400E" }}>
                            {apps.filter((a) => a.status === "pending").length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Applications list */}
                {!selectedPostId ? (
                  <div className="b-card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    {t("ngoPortal.noPostSelected")}
                  </div>
                ) : appsLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="b-skeleton h-40 rounded-2xl" />)}</div>
                ) : filteredApps.length === 0 ? (
                  <div className="b-card p-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    {t("ngoPortal.noApps")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredApps.map((app, idx) => {
                      const post = posts.find((p) => p.id === selectedPostId);
                      const questions = (post?.questions as string[]) ?? [];
                      return (
                        <div key={app.id} className="b-card b-animate-in p-5" style={{ animationDelay: `${idx * 0.04}s` }}>
                          {/* Applicant header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              {app.applicant_avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={app.applicant_avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" style={{ border: "2px solid var(--border-soft)" }} />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                                  <User className="h-4 w-4" style={{ color: "var(--primary)" }} />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-semibold">{app.applicant_name ?? t("ngoApp.unknown")}</div>
                                <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                  {t("ngoPortal.appliedAt")} · {formatRelative(app.created_at)}
                                </div>
                              </div>
                            </div>
                            {/* Status badge */}
                            {app.status === "approved" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                <CheckCircle className="h-3.5 w-3.5" />{t("ngoDetail.statusApproved")}
                              </span>
                            )}
                            {app.status === "rejected" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                <XCircle className="h-3.5 w-3.5" />{t("ngoDetail.statusRejected")}
                              </span>
                            )}
                            {app.status === "pending" && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--light-blue)", color: "var(--text-secondary)" }}>
                                <Clock className="h-3.5 w-3.5" />{t("ngoApp.pending")}
                              </span>
                            )}
                          </div>

                          {/* Q&A */}
                          <div className="space-y-3 mb-4">
                            {questions.map((q, i) => (
                              <div key={i} className="rounded-xl p-3" style={{ background: "var(--light-blue)" }}>
                                <div className="text-[11px] font-bold mb-1" style={{ color: "var(--text-muted)" }}>
                                  {t("ngoPortal.q")}{i + 1}. {q}
                                </div>
                                <div className="text-sm" style={{ color: "var(--deep-navy)" }}>
                                  {(app.answers as string[])?.[i]?.trim() || "-"}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Actions */}
                          {app.status === "pending" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(app)}
                                disabled={busy === app.id}
                                className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                                style={{ background: "#16A34A" }}
                              >
                                <CheckCircle className="h-4 w-4" />
                                {t("ngoApp.approve")}
                              </button>
                              <button
                                onClick={() => handleReject(app)}
                                disabled={busy === app.id}
                                className="flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                                style={{ background: "#DC2626" }}
                              >
                                <XCircle className="h-4 w-4" />
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
          </>
        )}
      </div>
    </div>
  );
}
