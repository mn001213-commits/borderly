"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft,
  ShieldAlert,
  Trash2,
  RefreshCw,
  FileText,
  EyeOff,
  Eye,
} from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import { formatRelative } from "@/lib/format";

type ReportRow = {
  id: string;
  reason: string;
  detail: string | null;
  created_at: string;
  reporter_id: string;
  target_type: "post" | "comment";
  target_id: string;
  status?: "pending" | "resolved" | string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type ReportView = ReportRow & {
  reporter_name: string;
  target_name: string;
  report_count: number;
};

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

function targetKey(targetType: "post" | "comment", targetId: string) {
  return `${targetType}:${targetId}`;
}

export default function ReportsPage() {
  const { t } = useT();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, Profile>>({});
  const [hiddenMap, setHiddenMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "resolved">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "comment">("all");
  const [q, setQ] = useState("");

  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTargetId, setDeletingTargetId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [togglingHiddenId, setTogglingHiddenId] = useState<string | null>(null);

  const checkAdmin = useCallback(async () => {
    setErr(null);

    const { data: au, error: auErr } = await supabase.auth.getUser();
    if (auErr) {
      setErr(auErr.message);
      window.location.href = "/";
      return false;
    }

    const uid = au.user?.id ?? null;
    if (!uid) {
      window.location.href = "/";
      return false;
    }

    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", uid)
      .maybeSingle();

    if (pErr) {
      setErr("Admin check failed: " + pErr.message);
      window.location.href = "/";
      return false;
    }

    if ((prof as any)?.role !== "admin") {
      window.location.href = "/";
      return false;
    }

    return true;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("reports")
      .select("id, reason, detail, created_at, reporter_id, target_type, target_id, status, resolved_at, resolved_by")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const reports = ((data ?? []) as ReportRow[]).map((r) => ({
      ...r,
      status: r.status ?? "pending",
      resolved_at: r.resolved_at ?? null,
      resolved_by: r.resolved_by ?? null,
    }));

    setRows(reports);

    const ids = Array.from(
      new Set(
        reports
          .flatMap((r) => [r.reporter_id, r.target_id, r.resolved_by ?? null])
          .filter(Boolean) as string[]
      )
    );

    if (ids.length > 0) {
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role")
        .in("id", ids);

      if (!pErr) {
        const map: Record<string, Profile> = {};
        (profs as Profile[]).forEach((p) => {
          map[p.id] = p;
        });
        setProfilesMap(map);
      } else {
        setProfilesMap({});
      }
    } else {
      setProfilesMap({});
    }

    const postIds = Array.from(new Set(reports.filter((r) => r.target_type === "post").map((r) => r.target_id)));
    const commentIds = Array.from(new Set(reports.filter((r) => r.target_type === "comment").map((r) => r.target_id)));

    const nextHiddenMap: Record<string, boolean> = {};

    if (postIds.length > 0) {
      const { data: postRows } = await supabase
        .from("posts")
        .select("id, is_hidden")
        .in("id", postIds);

      (postRows ?? []).forEach((p: any) => {
        nextHiddenMap[`post:${p.id}`] = !!p.is_hidden;
      });
    }

    if (commentIds.length > 0) {
      const { data: commentRows } = await supabase
        .from("comments")
        .select("id, is_hidden")
        .in("id", commentIds);

      (commentRows ?? []).forEach((c: any) => {
        nextHiddenMap[`comment:${c.id}`] = !!c.is_hidden;
      });
    }

    setHiddenMap(nextHiddenMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const ok = await checkAdmin();
      setAdminChecked(true);
      setIsAdmin(ok);
      if (ok) await load();
    })();
  }, [checkAdmin, load]);

  const reportCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      const key = targetKey(r.target_type, r.target_id);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [rows]);

  const list: ReportView[] = useMemo(() => {
    const base = rows.map((r) => {
      const reporter = profilesMap[r.reporter_id];
      const target = profilesMap[r.target_id];

      const reporter_name = reporter?.display_name?.trim() ? reporter.display_name : r.reporter_id;
      const target_name = target?.display_name?.trim() ? target.display_name : r.target_id;
      const report_count = reportCountMap[targetKey(r.target_type, r.target_id)] ?? 1;

      return { ...r, reporter_name, target_name, report_count };
    });

    const keyword = q.trim().toLowerCase();

    return base.filter((r) => {
      const normalizedStatus = (r.status ?? "pending") as string;

      if (statusFilter !== "all" && normalizedStatus !== statusFilter) return false;
      if (typeFilter !== "all" && r.target_type !== typeFilter) return false;

      if (!keyword) return true;

      const hay =
        `${r.reason} ${r.detail ?? ""} ${r.reporter_name} ${r.target_name} ` +
        `${r.reporter_id} ${r.target_id} ${r.target_type}`.toLowerCase();

      return hay.includes(keyword);
    });
  }, [rows, profilesMap, reportCountMap, statusFilter, typeFilter, q]);

  const logAudit = async (action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => {
    try {
      const { data: au } = await supabase.auth.getUser();
      if (!au.user?.id) return;
      await supabase.from("audit_log").insert({
        admin_id: au.user.id,
        action,
        target_type: targetType,
        target_id: targetId,
        details: details ?? {},
      });
    } catch {}
  };

  const setResolved = async (id: string) => {
    setErr(null);
    setResolvingId(id);

    try {
      const { data: au } = await supabase.auth.getUser();
      const me = au.user?.id ?? null;

      const { error } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: me,
        })
        .eq("id", id);

      if (error) {
        setErr(error.message);
        return;
      }

      await logAudit("resolve_report", "report", id);

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "resolved",
                resolved_at: new Date().toISOString(),
                resolved_by: me,
              }
            : r
        )
      );
    } finally {
      setResolvingId(null);
    }
  };

  const setPending = async (id: string) => {
    setErr(null);
    setResolvingId(id);

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: "pending",
          resolved_at: null,
          resolved_by: null,
        })
        .eq("id", id);

      if (error) {
        setErr(error.message);
        return;
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "pending",
                resolved_at: null,
                resolved_by: null,
              }
            : r
        )
      );
    } finally {
      setResolvingId(null);
    }
  };

  const deleteReportOnly = async (id: string) => {
    if (deletingId) return;

    const ok = confirm(t("adminReports.confirmDeleteReport"));
    if (!ok) return;

    setErr(null);
    setDeletingId(id);

    try {
      const { error } = await supabase.from("reports").delete().eq("id", id);

      if (error) {
        setErr(error.message);
        return;
      }

      await logAudit("delete_report", "report", id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const deleteTargetAndReport = async (report: ReportView) => {
    if (deletingTargetId) return;

    const ok = confirm(t("adminReports.confirmDeleteTarget"));
    if (!ok) return;

    setErr(null);
    setDeletingTargetId(report.id);

    try {
      if (report.target_type === "post") {
        const { error: targetError } = await supabase.from("posts").delete().eq("id", report.target_id);
        if (targetError) {
          setErr(targetError.message);
          return;
        }
      }

      if (report.target_type === "comment") {
        const { error: targetError } = await supabase.from("comments").delete().eq("id", report.target_id);
        if (targetError) {
          setErr(targetError.message);
          return;
        }
      }

      const { error: reportError } = await supabase.from("reports").delete().eq("id", report.id);

      if (reportError) {
        setErr(reportError.message);
        return;
      }

      await logAudit("delete_target", report.target_type, report.target_id, { report_id: report.id });
      setRows((prev) => prev.filter((r) => r.id !== report.id));
    } finally {
      setDeletingTargetId(null);
    }
  };

  const toggleHidden = async (report: ReportView) => {
    if (togglingHiddenId) return;

    const key = targetKey(report.target_type, report.target_id);
    const currentlyHidden = !!hiddenMap[key];
    const nextHidden = !currentlyHidden;

    setErr(null);
    setTogglingHiddenId(report.id);

    try {
      if (report.target_type === "post") {
        const { error } = await supabase
          .from("posts")
          .update({ is_hidden: nextHidden })
          .eq("id", report.target_id);

        if (error) {
          setErr(error.message);
          return;
        }
      }

      if (report.target_type === "comment") {
        const { error } = await supabase
          .from("comments")
          .update({ is_hidden: nextHidden })
          .eq("id", report.target_id);

        if (error) {
          setErr(error.message);
          return;
        }
      }

      await logAudit(nextHidden ? "hide_content" : "unhide_content", report.target_type, report.target_id);

      setHiddenMap((prev) => ({
        ...prev,
        [key]: nextHidden,
      }));
    } finally {
      setTogglingHiddenId(null);
    }
  };

  if (!adminChecked) {
    return <div className="p-6"><div className="mx-auto max-w-[1100px] space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="b-skeleton h-20 w-full"/>)}</div></div>;
  }

  if (!isAdmin) {
    return <p className="p-6" style={{ color: "var(--text-muted)" }}>{t("adminReports.noPermission")}</p>;
  }

  if (loading) {
    return <div className="p-6"><div className="mx-auto max-w-[1100px] space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="b-skeleton h-20 w-full"/>)}</div></div>;
  }

  const pendingCount = rows.filter((r) => (r.status ?? "pending") === "pending").length;
  const resolvedCount = rows.filter((r) => (r.status ?? "pending") === "resolved").length;

  return (
    <main className="min-h-screen px-4 py-6" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-[1100px] b-animate-in">
        <div className="b-card px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xl font-bold">
                <ShieldAlert size={20} className="text-red-500" />
                {t("adminReports.title")}
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                {t("adminReports.pending")} {pendingCount} / {t("adminReports.resolved")} {resolvedCount} / {t("adminReports.total")} {rows.length}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold hover:bg-[var(--light-blue)]"
                style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
              >
                <ArrowLeft size={16} />
                {t("nav.home")}
              </Link>

              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold hover:bg-[var(--light-blue)]"
                style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
              >
                <RefreshCw size={16} />
                {t("adminReports.refresh")}
              </button>
            </div>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
            <b>{t("adminReports.error")}:</b> {err}
          </div>
        ) : null}

        <div className="b-card mt-4 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "resolved")}
                className="rounded-2xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--deep-navy)" }}
              >
                <option value="pending">{t("adminReports.pending")}</option>
                <option value="resolved">{t("adminReports.resolved")}</option>
                <option value="all">{t("common.all")}</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "post" | "comment")}
                className="rounded-2xl px-3 py-2 text-sm outline-none"
                style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--deep-navy)" }}
              >
                <option value="all">{t("adminReports.allTypes")}</option>
                <option value="post">{t("adminReports.post")}</option>
                <option value="comment">{t("adminReports.comment")}</option>
              </select>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("adminReports.searchPlaceholder")}
              className="min-w-0 rounded-2xl px-4 py-2 text-sm outline-none lg:w-[320px]"
              style={{ border: "1px solid var(--border-soft)", background: "var(--light-blue)", color: "var(--deep-navy)" }}
            />
          </div>
        </div>

        {list.length === 0 ? (
          <div className="b-card mt-4 px-5 py-10 text-center">
            <div className="text-base font-semibold" style={{ color: "var(--deep-navy)" }}>{t("adminReports.noReports")}</div>
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {list.map((r) => {
              const isResolved = (r.status ?? "pending") === "resolved";
              const resolverName =
                r.resolved_by && profilesMap[r.resolved_by]?.display_name
                  ? profilesMap[r.resolved_by]?.display_name
                  : r.resolved_by ?? "-";

              const hiddenKey = targetKey(r.target_type, r.target_id);
              const isHidden = !!hiddenMap[hiddenKey];

              return (
                <div
                  key={r.id}
                  className={cx(
                    "b-card p-5",
                    isResolved && "opacity-90"
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                        <span
                          className={cx(
                            "rounded-full px-3 py-1 font-semibold border",
                            isResolved
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-yellow-200 bg-yellow-50 text-yellow-700"
                          )}
                        >
                          {isResolved ? t("adminReports.resolved") : t("adminReports.pending")}
                        </span>

                        <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-semibold text-red-700">
                          {r.target_type}
                        </span>

                        <span
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700"
                        >
                          {r.report_count} {r.report_count === 1 ? t("adminReports.report") : t("adminReports.reports")}
                        </span>

                        <span
                          className={cx(
                            "rounded-full px-3 py-1 font-semibold border",
                            !isHidden && "border-green-200 bg-green-50 text-green-700"
                          )}
                          style={isHidden ? { borderColor: "var(--border-soft)", background: "var(--light-blue)", color: "var(--text-secondary)" } : undefined}
                        >
                          {isHidden ? t("adminReports.hidden") : t("adminReports.visible")}
                        </span>

                        <span>{formatRelative(r.created_at)}</span>
                        <span style={{ color: "var(--text-muted)" }}>•</span>
                        <span>{formatDateTime(r.created_at)}</span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("adminReports.reason")}</div>
                          <div className="mt-1 rounded-2xl px-3 py-2 text-sm" style={{ border: "1px solid var(--border-soft)", background: "var(--light-blue)", color: "var(--text-secondary)" }}>
                            {r.reason}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("adminReports.detail")}</div>
                          <div className="mt-1 whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm" style={{ border: "1px solid var(--border-soft)", background: "var(--light-blue)", color: "var(--text-secondary)" }}>
                            {r.detail?.trim() ? r.detail : t("adminReports.noDetail")}
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                          <div>
                            <b style={{ color: "var(--deep-navy)" }}>{t("adminReports.reporter")}:</b> {r.reporter_name}
                          </div>
                          <div>
                            <b style={{ color: "var(--deep-navy)" }}>{t("adminReports.target")}:</b> {r.target_name}
                          </div>
                          <div>
                            <b style={{ color: "var(--deep-navy)" }}>{t("adminReports.targetType")}:</b> {r.target_type}
                          </div>
                          <div>
                            <b style={{ color: "var(--deep-navy)" }}>{t("adminReports.reportId")}:</b> {r.id}
                          </div>
                          <div>
                            <b style={{ color: "var(--deep-navy)" }}>{t("adminReports.reporterUuid")}:</b> {r.reporter_id}
                          </div>
                          <div>
                            <b style={{ color: "var(--deep-navy)" }}>{t("adminReports.targetUuid")}:</b> {r.target_id}
                          </div>

                          {isResolved ? (
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                              {t("adminReports.resolvedAt")}: {formatDateTime(r.resolved_at)} / {t("adminReports.resolvedBy")}: {resolverName}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!isResolved ? (
                        <button
                          type="button"
                          onClick={() => setResolved(r.id)}
                          disabled={resolvingId === r.id}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ background: "var(--primary)" }}
                        >
                          {resolvingId === r.id ? t("adminReports.resolving") : t("adminReports.markResolved")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPending(r.id)}
                          disabled={resolvingId === r.id}
                          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold hover:bg-[var(--light-blue)] disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                        >
                          {resolvingId === r.id ? t("adminReports.updating") : t("adminReports.setPending")}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleHidden(r)}
                        disabled={togglingHiddenId === r.id}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60",
                          isHidden
                            ? "hover:bg-[var(--light-blue)]"
                            : "bg-yellow-500 text-white hover:bg-yellow-600"
                        )}
                        style={isHidden ? { border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" } : undefined}
                      >
                        {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        {togglingHiddenId === r.id
                          ? t("adminReports.updating")
                          : isHidden
                          ? t("adminReports.unhideTarget")
                          : t("adminReports.hideTarget")}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteReportOnly(r.id)}
                        disabled={deletingId === r.id || deletingTargetId === r.id}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold hover:bg-[var(--light-blue)] disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)", color: "var(--text-secondary)" }}
                      >
                        <FileText size={16} />
                        {deletingId === r.id ? t("adminReports.deleting") : t("adminReports.deleteReportOnly")}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTargetAndReport(r)}
                        disabled={deletingTargetId === r.id || deletingId === r.id}
                        className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        {deletingTargetId === r.id
                          ? t("adminReports.deleting")
                          : r.target_type === "post"
                          ? t("adminReports.deletePostReport")
                          : t("adminReports.deleteCommentReport")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
