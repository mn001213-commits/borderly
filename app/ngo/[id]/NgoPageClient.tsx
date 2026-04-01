"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getNgoPost, applyToNgoPost, getMyApplication, type NgoPost, type NgoApplication } from "@/lib/ngoService";
import NgoVerifiedBadge from "@/app/components/NgoVerifiedBadge";
import { useT } from "@/app/components/LangProvider";
import { ArrowLeft, MapPin, Globe, Users, Send, CheckCircle, Clock, XCircle } from "lucide-react";

export default function NgoDetailPage() {
  const { t } = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [post, setPost] = useState<NgoPost | null>(null);
  const [myApp, setMyApp] = useState<NgoApplication | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Application form
  const [answers, setAnswers] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setMyUid(user?.id ?? null);

        const p = await getNgoPost(id);
        setPost(p);
        setAnswers(((p.questions as string[]) ?? []).map(() => ""));

        if (user) {
          const app = await getMyApplication(id);
          setMyApp(app);
        }
      } catch (e: any) {
        setErrorMsg(e?.message || t("ngoDetail.failedToLoad"));
      }
      setLoading(false);
    })();
  }, [id]);

  const updateAnswer = (idx: number, val: string) => {
    setAnswers((prev) => prev.map((a, i) => (i === idx ? val : a)));
  };

  const onApply = async () => {
    if (!post) return;
    setSubmitting(true);
    setErrorMsg(null);

    const trimmed = answers.map((a) => a.trim());
    if (trimmed.some((a) => !a)) {
      setErrorMsg(t("ngoDetail.answerAll"));
      setSubmitting(false);
      return;
    }

    try {
      await applyToNgoPost(post.id, trimmed);
      const app = await getMyApplication(post.id);
      setMyApp(app);
      setShowForm(false);
    } catch (e: any) {
      setErrorMsg(e?.message || t("ngoDetail.failedToApply"));
    }
    setSubmitting(false);
  };

  const isOwner = myUid && post?.ngo_user_id === myUid;

  if (loading) {
    return (
      <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
          <div className="space-y-4">
            <div className="b-skeleton h-8 w-32" style={{ borderRadius: 12 }} />
            <div className="b-skeleton h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
        <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
          <div className="b-card p-6 text-center">
            <div className="text-sm font-semibold">{t("ngoDetail.notFound")}</div>
            <Link href="/ngo" className="mt-3 inline-block text-sm font-medium" style={{ color: "var(--primary)" }}>{t("ngoDetail.backToNgo")}</Link>
          </div>
        </div>
      </div>
    );
  }

  const questions = (post.questions as string[]) ?? [];

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70" style={{ background: "var(--light-blue)" }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">{t("ngoDetail.title")}</h1>
          {isOwner && (
            <Link href={`/ngo/applications`} className="inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold no-underline transition hover:opacity-80" style={{ background: "var(--light-blue)", color: "#43A047", border: "1px solid var(--border-soft)" }}>
              {t("ngo.applications")}
            </Link>
          )}
        </div>

        {errorMsg && <div className="mb-4 rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>{errorMsg}</div>}

        {/* Post card */}
        <div className="b-card b-animate-in overflow-hidden">
          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.image_url} alt="" className="w-full" />
          )}

          <div className="p-5">
            {/* NGO info */}
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>{post.ngo_name ?? "Supporter"}</span>
              <NgoVerifiedBadge verified={post.ngo_verified} />
            </div>

            {post.is_closed && (
              <span className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold bg-red-100 text-red-600">{t("meet.closed")}</span>
            )}

            <div className="mt-3 rounded-2xl p-4" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("ngoDetail.activityPurpose")}</div>
              <p className="text-base font-semibold leading-snug" style={{ color: "var(--deep-navy)" }}>{post.title}</p>
            </div>

            <div className="mt-3 rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("ngoDetail.helpOffered")}</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{post.description}</p>
            </div>

            {/* Meta */}
            <div className="mt-4 space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
              {post.location && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />{post.location}</div>
              )}
              {post.website_url && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <a href={post.website_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--primary)" }}>{post.website_url}</a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {post.approved_count ?? 0} {t("ngoDetail.approved")} / {post.application_count ?? 0} {t("ngo.applied")}
                {post.max_applicants != null && ` (${t("ngo.max")} ${post.max_applicants})`}
              </div>
            </div>

            {/* Questions preview */}
            {questions.length > 0 && (
              <div className="mt-5 rounded-2xl p-4" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{t("ngoDetail.questionsYoullAnswer")}</div>
                <ol className="list-decimal list-inside space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                  {questions.map((q, i) => <li key={i}>{q}</li>)}
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Apply section */}
        {myUid && !isOwner && (
          <div className="mt-4">
            {myApp ? (
              <div className="b-card b-animate-in p-5" style={{ animationDelay: "0.1s" }}>
                <div className="flex items-center gap-2 mb-2">
                  {myApp.status === "approved" ? (
                    <><CheckCircle className="h-5 w-5 text-green-500" /><span className="font-semibold text-green-700">{t("ngoDetail.statusApproved")}</span></>
                  ) : myApp.status === "rejected" ? (
                    <><XCircle className="h-5 w-5 text-red-500" /><span className="font-semibold text-red-700">{t("ngoDetail.statusRejected")}</span></>
                  ) : (
                    <><Clock className="h-5 w-5" style={{ color: "var(--text-muted)" }} /><span className="font-semibold" style={{ color: "var(--text-muted)" }}>{t("ngoDetail.statusPending")}</span></>
                  )}
                </div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {myApp.status === "approved"
                    ? t("ngoDetail.approvedMsg")
                    : myApp.status === "rejected"
                    ? t("ngoDetail.rejectedMsg")
                    : t("ngoDetail.pendingMsg")}
                </div>
              </div>
            ) : post.is_closed ? (
              <div className="b-card p-5 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {t("ngoDetail.closedForApps")}
              </div>
            ) : !showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-white transition hover:opacity-90 b-animate-in"
                style={{ background: "#43A047", animationDelay: "0.1s" }}
              >
                <Send className="h-4 w-4" />
                {t("ngoDetail.applyForHelp")}
              </button>
            ) : (
              <div className="b-card b-animate-in p-5 space-y-4" style={{ animationDelay: "0.1s" }}>
                <div className="text-sm font-bold">{t("ngoDetail.answerBelow")}</div>
                {questions.map((q, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>{idx + 1}. {q}</div>
                    <textarea
                      value={answers[idx] ?? ""}
                      onChange={(e) => updateAnswer(idx, e.target.value)}
                      placeholder={t("ngoDetail.yourAnswer")}
                      className="w-full min-h-[80px] resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={onApply} disabled={submitting} className="inline-flex h-10 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40" style={{ background: "#43A047" }}>
                    {submitting ? t("ngoDetail.submitting") : t("ngoDetail.submitApp")}
                  </button>
                  <button onClick={() => setShowForm(false)} className="inline-flex h-10 items-center rounded-2xl px-4 text-sm font-medium transition hover:opacity-70" style={{ color: "var(--text-secondary)" }}>
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!myUid && (
          <div className="mt-4 b-card p-5 text-center">
            <Link href="/login" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{t("ngoDetail.signInToApply")}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
