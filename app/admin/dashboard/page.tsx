"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/app/components/LangProvider";
import {
  ArrowLeft, Users, FileText, MessageCircle, CalendarHeart,
  ShieldAlert, Send, UserPlus, ShieldCheck, RefreshCw,
} from "lucide-react";

type DayRange = 7 | 14 | 30;

type ChartSeries = {
  labelKey: string;
  data: number[];
  color: string;
  icon: React.ReactNode;
  total: number;
};

type Totals = {
  totalUsers: number;
  totalPosts: number;
  pendingNgo: number;
  pendingReports: number;
};

// ── SVG mini line chart ──────────────────────────────────────────────────────
function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="h-14" />;
  const max = Math.max(...data, 1);
  const W = 280, H = 56, P = 3;
  const pts = data.map((v, i): [number, number] => [
    P + (i / (data.length - 1)) * (W - P * 2),
    P + (1 - v / max) * (H - P * 2),
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fill = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const gid = `grad_${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── X-axis labels ────────────────────────────────────────────────────────────
function XLabels({ labels, range }: { labels: string[]; range: DayRange }) {
  const step = range === 7 ? 1 : range === 14 ? 2 : 5;
  return (
    <div className="flex justify-between mt-1 px-0.5">
      {labels.map((l, i) => (
        <span
          key={i}
          className="text-[9px]"
          style={{
            color: "var(--text-muted)",
            visibility: i % step === 0 || i === labels.length - 1 ? "visible" : "hidden",
          }}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildLabels(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
}

function groupByDate(items: { created_at: string }[], days: number): number[] {
  const counts = new Array(days).fill(0);
  const now = Date.now();
  for (const item of items) {
    const diff = Math.floor((now - new Date(item.created_at).getTime()) / 86400000);
    if (diff >= 0 && diff < days) counts[days - 1 - diff]++;
  }
  return counts;
}

async function fetchDates(table: string, days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase.from(table).select("created_at").gte("created_at", since);
  return (data ?? []) as { created_at: string }[];
}

async function fetchCount(table: string, filter?: { col: string; val: string }) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count } = await q;
  return count ?? 0;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { t } = useT();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [range, setRange] = useState<DayRange>(30);
  const [labels, setLabels] = useState<string[]>([]);
  const [series, setSeries] = useState<ChartSeries[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (prof?.role !== "admin") { router.replace("/"); return; }
      setAuthed(true);
    })();
  }, [router]);

  useEffect(() => {
    if (authed) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, range]);

  async function load() {
    setRefreshing(true);
    const days = range;

    const [
      regRows, postRows, commentRows, meetRows,
      reportRows, msgRows, followRows, ngoRows,
      totalUsers, totalPosts, pendingNgo, pendingReports,
    ] = await Promise.all([
      fetchDates("profiles", days),
      fetchDates("posts", days),
      fetchDates("comments", days),
      fetchDates("meet_posts", days),
      fetchDates("reports", days),
      fetchDates("messages", days),
      fetchDates("follows", days),
      fetchDates("ngo_applications", days),
      fetchCount("profiles"),
      fetchCount("posts"),
      fetchCount("ngo_applications", { col: "status", val: "pending" }),
      fetchCount("reports", { col: "status", val: "pending" }),
    ]);

    setLabels(buildLabels(days));
    setTotals({ totalUsers, totalPosts, pendingNgo, pendingReports });
    setSeries([
      { labelKey: "adminDash.registrations", data: groupByDate(regRows, days), color: "#4A8FE7", icon: <UserPlus className="h-4 w-4" />, total: regRows.length },
      { labelKey: "adminDash.posts",         data: groupByDate(postRows, days), color: "#2EC4B6", icon: <FileText className="h-4 w-4" />, total: postRows.length },
      { labelKey: "adminDash.comments",      data: groupByDate(commentRows, days), color: "#8B5CF6", icon: <MessageCircle className="h-4 w-4" />, total: commentRows.length },
      { labelKey: "adminDash.meets",         data: groupByDate(meetRows, days), color: "#F59E0B", icon: <CalendarHeart className="h-4 w-4" />, total: meetRows.length },
      { labelKey: "adminDash.reports",       data: groupByDate(reportRows, days), color: "#EF4444", icon: <ShieldAlert className="h-4 w-4" />, total: reportRows.length },
      { labelKey: "adminDash.messages",      data: groupByDate(msgRows, days), color: "#06B6D4", icon: <Send className="h-4 w-4" />, total: msgRows.length },
      { labelKey: "adminDash.follows",       data: groupByDate(followRows, days), color: "#10B981", icon: <Users className="h-4 w-4" />, total: followRows.length },
      { labelKey: "adminDash.ngoApplications", data: groupByDate(ngoRows, days), color: "#F97316", icon: <ShieldCheck className="h-4 w-4" />, total: ngoRows.length },
    ]);

    setLoading(false);
    setRefreshing(false);
  }

  if (!authed) return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="b-skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="b-skeleton h-64 rounded-2xl" />
    </div>
  );

  const summaryCards = totals
    ? [
        { labelKey: "adminDash.totalUsers",    value: totals.totalUsers,    color: "#4A8FE7", icon: <Users className="h-5 w-5" /> },
        { labelKey: "adminDash.totalPosts",    value: totals.totalPosts,    color: "#2EC4B6", icon: <FileText className="h-5 w-5" /> },
        { labelKey: "adminDash.pendingNgo",    value: totals.pendingNgo,    color: "#F97316", icon: <ShieldCheck className="h-5 w-5" />, href: "/admin/ngo" },
        { labelKey: "adminDash.pendingReports",value: totals.pendingReports,color: "#EF4444", icon: <ShieldAlert className="h-5 w-5" />, href: "/admin/reports" },
      ]
    : [];

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-4">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ background: "var(--light-blue)" }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{t("adminDash.title")}</h1>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={load}
              disabled={refreshing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-70 disabled:opacity-40"
              style={{ background: "var(--light-blue)" }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-soft)" }}>
              {([7, 14, 30] as DayRange[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className="px-3 py-1.5 text-xs font-semibold transition"
                  style={{
                    background: range === d ? "var(--primary)" : "var(--bg-card)",
                    color: range === d ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {d}{t("adminDash.days")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Admin nav */}
        <div className="flex gap-2 mb-6 text-xs font-medium">
          <span className="px-3 py-1.5 rounded-full text-white" style={{ background: "var(--primary)" }}>{t("admin.dashboard")}</span>
          <Link href="/admin/reports" className="px-3 py-1.5 rounded-full no-underline transition hover:opacity-80" style={{ background: "var(--light-blue)", color: "var(--text-secondary)" }}>{t("admin.reports")}</Link>
          <Link href="/admin/ngo" className="px-3 py-1.5 rounded-full no-underline transition hover:opacity-80" style={{ background: "var(--light-blue)", color: "var(--text-secondary)" }}>{t("admin.ngo")}</Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="b-skeleton h-24 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="b-skeleton h-36 rounded-2xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {summaryCards.map((c) => {
                const inner = (
                  <div className="b-card p-4 flex flex-col gap-2 h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{t(c.labelKey)}</span>
                      <span style={{ color: c.color }}>{c.icon}</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value.toLocaleString()}</div>
                  </div>
                );
                return c.href ? (
                  <Link key={c.labelKey} href={c.href} className="no-underline block">{inner}</Link>
                ) : (
                  <div key={c.labelKey}>{inner}</div>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {series.map((s) => {
                const max = Math.max(...s.data, 0);
                const sum = s.data.reduce((a, b) => a + b, 0);
                const avg = sum > 0 ? (sum / s.data.filter(v => v > 0).length).toFixed(1) : "0";
                return (
                  <div key={s.labelKey} className="b-card p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: s.color }}>{s.icon}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t(s.labelKey)}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold" style={{ color: s.color }}>{s.total.toLocaleString()}</div>
                        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{range}{t("adminDash.days")}</div>
                      </div>
                    </div>
                    <div className="flex gap-3 mb-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      <span>{t("adminDash.max")} <b style={{ color: "var(--deep-navy)" }}>{max}</b></span>
                      <span>{t("adminDash.dailyAvg")} <b style={{ color: "var(--deep-navy)" }}>{avg}</b></span>
                    </div>
                    <MiniChart data={s.data} color={s.color} />
                    <XLabels labels={labels} range={range} />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
