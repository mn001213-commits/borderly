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

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
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

    const ok = confirm("Delete this report only?");
    if (!ok) return;

    setErr(null);
    setDeletingId(id);

    try {
      const { error } = await supabase.from("reports").delete().eq("id", id);

      if (error) {
        setErr(error.message);
        return;
      }

      setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const deleteTargetAndReport = async (report: ReportView) => {
    if (deletingTargetId) return;

    const ok = confirm(`Delete this ${report.target_type} and this report?`);
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

      setHiddenMap((prev) => ({
        ...prev,
        [key]: nextHidden,
      }));
    } finally {
      setTogglingHiddenId(null);
    }
  };

  if (!adminChecked) {
    return <p style={{ padding: 24 }}>Loading...</p>;
  }

  if (!isAdmin) {
    return <p style={{ padding: 24 }}>No permission.</p>;
  }

  if (loading) {
    return <p style={{ padding: 24 }}>Loading...</p>;
  }

  const pendingCount = rows.filter((r) => (r.status ?? "pending") === "pending").length;
  const resolvedCount = rows.filter((r) => (r.status ?? "pending") === "resolved").length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-indigo-50 px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-[1100px]">
        <div className="rounded-3xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xl font-black">
                <ShieldAlert size={20} className="text-rose-500" />
                Reports Admin
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Pending {pendingCount} / Resolved {resolvedCount} / Total {rows.length}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Home
              </Link>

              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <b>Error:</b> {err}
          </div>
        ) : null}

        <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "pending" | "resolved")}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "all" | "post" | "comment")}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All types</option>
                <option value="post">Post</option>
                <option value="comment">Comment</option>
              </select>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search reason, detail, name, uuid"
              className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 lg:w-[320px]"
            />
          </div>
        </div>

        {list.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white px-5 py-10 text-center shadow-sm">
            <div className="text-base font-extrabold text-slate-800">No reports found.</div>
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
                    "rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm",
                    isResolved && "opacity-90"
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span
                          className={cx(
                            "rounded-full px-3 py-1 font-extrabold border",
                            isResolved
                              ? "border-slate-200 bg-slate-100 text-slate-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          )}
                        >
                          {isResolved ? "Resolved" : "Pending"}
                        </span>

                        <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-extrabold text-rose-700">
                          {r.target_type}
                        </span>

                        <span
                          className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-extrabold text-indigo-700"
                        >
                          {r.report_count} {r.report_count === 1 ? "report" : "reports"}
                        </span>

                        <span
                          className={cx(
                            "rounded-full px-3 py-1 font-extrabold border",
                            isHidden
                              ? "border-slate-200 bg-slate-100 text-slate-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {isHidden ? "Hidden" : "Visible"}
                        </span>

                        <span>{formatRelative(r.created_at)}</span>
                        <span className="text-slate-400">•</span>
                        <span>{formatDateTime(r.created_at)}</span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div>
                          <div className="text-sm font-extrabold text-slate-800">Reason</div>
                          <div className="mt-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {r.reason}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-extrabold text-slate-800">Detail</div>
                          <div className="mt-1 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {r.detail?.trim() ? r.detail : "No detail"}
                          </div>
                        </div>

                        <div className="grid gap-2 text-sm text-slate-600">
                          <div>
                            <b className="text-slate-800">Reporter:</b> {r.reporter_name}
                          </div>
                          <div>
                            <b className="text-slate-800">Target:</b> {r.target_name}
                          </div>
                          <div>
                            <b className="text-slate-800">Target type:</b> {r.target_type}
                          </div>
                          <div>
                            <b className="text-slate-800">Report ID:</b> {r.id}
                          </div>
                          <div>
                            <b className="text-slate-800">Reporter UUID:</b> {r.reporter_id}
                          </div>
                          <div>
                            <b className="text-slate-800">Target UUID:</b> {r.target_id}
                          </div>

                          {isResolved ? (
                            <div className="text-xs text-slate-500">
                              Resolved at: {formatDateTime(r.resolved_at)} / Resolved by: {resolverName}
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
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resolvingId === r.id ? "Resolving..." : "Mark resolved"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPending(r.id)}
                          disabled={resolvingId === r.id}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {resolvingId === r.id ? "Updating..." : "Set pending"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleHidden(r)}
                        disabled={togglingHiddenId === r.id}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60",
                          isHidden
                            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        )}
                      >
                        {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        {togglingHiddenId === r.id
                          ? "Updating..."
                          : isHidden
                          ? "Unhide target"
                          : "Hide target"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteReportOnly(r.id)}
                        disabled={deletingId === r.id || deletingTargetId === r.id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <FileText size={16} />
                        {deletingId === r.id ? "Deleting..." : "Delete report only"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTargetAndReport(r)}
                        disabled={deletingTargetId === r.id || deletingId === r.id}
                        className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        {deletingTargetId === r.id
                          ? "Deleting..."
                          : r.target_type === "post"
                          ? "Delete post + report"
                          : "Delete comment + report"}
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