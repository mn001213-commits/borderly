"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Edit3, Trash2, Calendar, MapPin, Users, MessageCircle, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { useT } from "@/app/components/LangProvider";
import { supabase } from "@/lib/supabaseClient";
import { createNotification } from "@/lib/notificationService";

type MeetType =
  | "hangout"
  | "study"
  | "skill"
  | "language"
  | "meal"
  | "party"
  | "project"
  | "sports";

type MeetRow = {
  id: string;
  host_id: string;
  type: MeetType;
  sport: string | null;
  title: string;
  description: string;
  city: string | null;
  place_hint: string | null;
  online_url: string | null;
  start_at: string | null;
  max_people: number | null;
  max_foreigners: number | null;
  max_locals: number | null;
  is_closed: boolean;
  created_at: string;
  image_url: string | null;
  participant_count: number;
  foreigner_count: number;
  local_count: number;
};

type MyStatus = "none" | "pending" | "approved" | "rejected";

type Participant = {
  user_id: string;
  status: MyStatus;
  display_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
};

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

type MeetCommentRow = {
  id: string;
  meet_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author_name: string | null;
  is_hidden?: boolean | null;
};

function formatRelative(iso: string, tr?: (key: string) => string) {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return tr ? tr("post.justNow") : "Just now";
  if (min < 60) return `${min}${tr ? tr("post.mAgo") : "m ago"}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${tr ? tr("post.hAgo") : "h ago"}`;
  const day = Math.floor(hr / 24);
  return `${day}${tr ? tr("post.dAgo") : "d ago"}`;
}

function typeEmoji(t: MeetType) {
  switch (t) {
    case "hangout": return "🤝";
    case "study": return "📚";
    case "language": return "🗣️";
    case "meal": return "🍽️";
    case "sports": return "⚽";
    case "skill": return "🔧";
    case "party": return "🎉";
    case "project": return "🚀";
    default: return "📌";
  }
}

function typeLabelKey(t: MeetType) {
  switch (t) {
    case "hangout": return "meet.hangout";
    case "study": return "meet.study";
    case "skill": return "meetDetail.skillExchange";
    case "language": return "meetDetail.languageExchange";
    case "meal": return "meetDetail.mealBuddy";
    case "party": return "meetDetail.party";
    case "project": return "meetDetail.teamRecruit";
    case "sports": return "meet.sports";
    default: return "nav.meet";
  }
}

function isPast(start_at: string | null) {
  if (!start_at) return false;
  return new Date(start_at).getTime() < Date.now();
}

export default function MeetDetailPage() {
  const { t } = useT();
  const params = useParams();
  const router = useRouter();

  // Auto-redirect to group chat on approval: set false to disable
  const AUTO_GO_CHAT = false;

  const meetId = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [meet, setMeet] = useState<MeetRow | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [hostProfile, setHostProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [otherMeets, setOtherMeets] = useState<Array<{ id: string; type: MeetType; title: string; city: string | null; start_at: string | null; participant_count: number; host_display_name: string | null; host_avatar_url: string | null }>>([]);

  const [joining, setJoining] = useState(false);
  const [groupConversationId, setGroupConversationId] = useState<string | null>(null);

  const [myStatus, setMyStatus] = useState<MyStatus>("none");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinMsg, setJoinMsg] = useState<{ type: "error" | "info"; text: string } | null>(null);

  // Comments
  const [meetComments, setMeetComments] = useState<MeetCommentRow[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [replyOpenById, setReplyOpenById] = useState<Record<string, boolean>>({});
  const [replyBodyById, setReplyBodyById] = useState<Record<string, string>>({});
  const [repliesHiddenById, setRepliesHiddenById] = useState<Record<string, boolean>>({});

  const rootComments = useMemo(() => meetComments.filter((c) => !c.parent_id), [meetComments]);
  const childrenMap = useMemo(() => {
    const map: Record<string, MeetCommentRow[]> = {};
    for (const c of meetComments) {
      if (!c.parent_id) continue;
      if (!map[c.parent_id]) map[c.parent_id] = [];
      map[c.parent_id].push(c);
    }
    return map;
  }, [meetComments]);

  // Detect approval transition + banner
  const prevStatusRef = useRef<MyStatus>("none");
  const [approvedJustNow, setApprovedJustNow] = useState(false);

  const loadAll = useCallback(async () => {
    if (!meetId) return;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const uid = user?.id ?? null;
    setMeId(uid);

    // 1) meet + count (view)
    const { data: m, error: mErr } = await supabase
      .from("v_meet_with_count")
      .select("*")
      .eq("id", meetId)
      .maybeSingle();

    if (mErr) {
      if (process.env.NODE_ENV === "development") console.error(mErr);
      setMeet(null);
      setLoading(false);
      return;
    }
    const meetData = m as MeetRow;

    // Supplement fields that may not be in the view (place_hint, online_url)
    const { data: mp } = await supabase
      .from("meet_posts")
      .select("place_hint,online_url")
      .eq("id", meetId)
      .maybeSingle();
    if (mp) {
      if (meetData.place_hint == null && mp.place_hint) meetData.place_hint = mp.place_hint;
      meetData.online_url = mp.online_url ?? null;
    }

    setMeet(meetData);

    // Fetch host profile
    if (meetData?.host_id) {
      const { data: hp } = await supabase
        .from("profiles")
        .select("display_name,avatar_url")
        .eq("id", meetData.host_id)
        .maybeSingle();
      setHostProfile(hp ? { display_name: hp.display_name ?? null, avatar_url: hp.avatar_url ?? null } : null);
    }

    // 2) group chat id
    const { data: gc, error: gcErr } = await supabase
      .from("group_conversations")
      .select("conversation_id")
      .eq("meet_id", meetId)
      .maybeSingle();

    if (gcErr && process.env.NODE_ENV === "development") console.error(gcErr);
    setGroupConversationId(gc?.conversation_id ?? null);

    // 3) Check my status (fallback if status column missing)
    if (uid) {
      const r1 = await supabase
        .from("meet_participants")
        .select("status")
        .eq("meet_id", meetId)
        .eq("user_id", uid)
        .maybeSingle();

      if (!r1.error) {
        const st = (r1.data?.status as MyStatus | undefined) ?? "none";
        setMyStatus((st ?? "none") as MyStatus);
      } else {
        const r2 = await supabase
          .from("meet_participants")
          .select("meet_id")
          .eq("meet_id", meetId)
          .eq("user_id", uid)
          .maybeSingle();

        setMyStatus(r2.data ? "approved" : "none");
      }
    } else {
      setMyStatus("none");
    }

    // 4) Load participants: avoid join (prevents 400) -> map profiles via 2nd query
    const mp = await supabase
      .from("meet_participants")
      .select("user_id,status")
      .eq("meet_id", meetId);

    if (mp.error) {
      if (process.env.NODE_ENV === "development") console.error(mp.error);
      setParticipants([]);
      setLoading(false);
      return;
    }

    const mpRows = (mp.data ?? []).map((r: any) => ({
      user_id: r.user_id as string,
      status: ((r.status as MyStatus) ?? "approved") as MyStatus,
    }));

    const userIds = mpRows.map((x) => x.user_id).filter(Boolean);

    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; user_type: string | null }>();

    if (userIds.length > 0) {
      const pr = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url,user_type")
        .in("id", userIds);

      if (!pr.error) {
        for (const p of pr.data ?? []) {
          profileMap.set(p.id, {
            display_name: p.display_name ?? null,
            avatar_url: p.avatar_url ?? null,
            user_type: p.user_type ?? null,
          });
        }
      } else {
        if (process.env.NODE_ENV === "development") console.error(pr.error);
      }
    }

    const merged: Participant[] = mpRows.map((r) => {
      const prof = profileMap.get(r.user_id);
      return {
        user_id: r.user_id,
        status: r.status,
        display_name: prof?.display_name ?? null,
        avatar_url: prof?.avatar_url ?? null,
        user_type: prof?.user_type ?? null,
      };
    });

    // approved -> pending -> rejected
    const w = (s: MyStatus) => (s === "approved" ? 0 : s === "pending" ? 1 : 2);
    merged.sort((a, b) => w(a.status) - w(b.status));

    setParticipants(merged);

    // Load comments (read author_name directly from column)
    const { data: cmts, error: cmtErr } = await supabase
      .from("meet_comments")
      .select("id, meet_id, user_id, parent_id, content, created_at, is_hidden, author_name")
      .eq("meet_id", meetId)
      .or("is_hidden.eq.false,is_hidden.is.null")
      .order("created_at", { ascending: true });
    if (cmtErr) {
      if (process.env.NODE_ENV === "development") console.error("meet comments load error:", cmtErr);
    }

    // Fetch current display_name for each commenter and filter out users without a nickname
    const rawComments = cmts ?? [];
    const commentUserIds = [...new Set(rawComments.map((c) => c.user_id))];
    if (commentUserIds.length > 0) {
      const { data: commentProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", commentUserIds);
      const profileMap = new Map(commentProfiles?.map((p) => [p.id, p.display_name]) ?? []);
      const enrichedComments = rawComments
        .filter((c) => profileMap.get(c.user_id))
        .map((c) => ({ ...c, author_name: profileMap.get(c.user_id) ?? c.author_name }));
      setMeetComments(enrichedComments as MeetCommentRow[]);
    } else {
      setMeetComments([]);
    }

    setLoading(false);
  }, [meetId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addMeetComment = useCallback(async (parentId: string | null = null) => {
    if (!meetId || commentSaving) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const body = parentId ? (replyBodyById[parentId] ?? "").trim() : commentBody.trim();
    if (!body) return;

    setCommentSaving(true);
    const tempId = `temp-${Date.now()}`;

    const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    const author = (prof?.display_name as string | null) ?? null;
    if (!author) {
      setCommentSaving(false);
      return;
    }

    const optimistic: MeetCommentRow = {
      id: tempId, meet_id: meetId, user_id: user.id, parent_id: parentId,
      content: body, created_at: new Date().toISOString(),
      author_name: author, is_hidden: false,
    };
    setMeetComments((prev) => [...prev, optimistic]);

    if (parentId) {
      setReplyBodyById((p) => ({ ...p, [parentId]: "" }));
      setReplyOpenById((p) => ({ ...p, [parentId]: false }));
    } else {
      setCommentBody("");
    }

    try {
      const { data, error } = await supabase
        .from("meet_comments")
        .insert({ meet_id: meetId, user_id: user.id, parent_id: parentId, content: body, is_hidden: false, author_name: author })
        .select("id, meet_id, user_id, parent_id, content, created_at, is_hidden, author_name")
        .single();
      if (error) throw error;
      setMeetComments((prev) => prev.map((c) => (c.id === tempId ? { ...data, author_name: author } : c)));

      if (meet && meet.host_id !== user.id) {
        createNotification({
          userId: meet.host_id, type: "comment",
          title: "New comment on your meet",
          body: `${author ?? t("post.someone")} commented: ${body.slice(0, 80)}`,
          link: `/meet/${meetId}`, meta: { meet_id: meetId, title_key: "notif.tpl.meetCommentTitle", body_key: "notif.tpl.meetCommentBody", actor: author ?? t("post.someone"), content: body.slice(0, 80) },
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error("addMeetComment error:", err?.message ?? err, "code:", err?.code, "details:", err?.details, "hint:", err?.hint);
      setMeetComments((prev) => prev.filter((c) => c.id !== tempId));
      if (parentId) setReplyBodyById((p) => ({ ...p, [parentId]: body }));
      else setCommentBody(body);
    } finally {
      setCommentSaving(false);
    }
  }, [meetId, commentBody, commentSaving, replyBodyById, meet, router, t]);

  const deleteMeetComment = useCallback(async (commentId: string) => {
    if (deletingCommentId) return;
    if (!confirm(t("meet.deleteCommentConfirm"))) return;
    setDeletingCommentId(commentId);
    try {
      await supabase.from("meet_comments").delete().eq("id", commentId);
      setMeetComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId));
    } catch { /* realtime will sync */ }
    finally { setDeletingCommentId(null); }
  }, [deletingCommentId, t]);

  // Load other meets for upcoming/nearby sections
  useEffect(() => {
    if (!meet) return;
    let cancelled = false;

    const fetchOthers = async () => {
      const { data } = await supabase
        .from("v_meet_with_count")
        .select("id,type,title,city,start_at,participant_count,host_id")
        .neq("id", meet.id)
        .eq("is_closed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled || !data) return;

      const hostIds = [...new Set((data as any[]).map((m) => m.host_id).filter(Boolean))];
      const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      if (hostIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id,display_name,avatar_url").in("id", hostIds);
        for (const p of profiles ?? []) profileMap.set(p.id, { display_name: p.display_name ?? null, avatar_url: p.avatar_url ?? null });
      }

      if (cancelled) return;
      setOtherMeets(
        (data as any[]).map((m) => {
          const p = profileMap.get(m.host_id);
          return { ...m, host_display_name: p?.display_name ?? null, host_avatar_url: p?.avatar_url ?? null };
        })
      );
    };

    fetchOthers();
    return () => { cancelled = true; };
  }, [meet]);

  // Detect approval transition (pending -> approved)
  useEffect(() => {
    const prev = prevStatusRef.current;

    if (prev === "pending" && myStatus === "approved") {
      setApprovedJustNow(true);

      const t = setTimeout(() => setApprovedJustNow(false), 3000);

      if (AUTO_GO_CHAT && groupConversationId) {
        router.push(`/chats/${groupConversationId}`);
      }

      return () => clearTimeout(t);
    }

    prevStatusRef.current = myStatus;
  }, [myStatus, groupConversationId, router]);

  // Realtime subscription
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!meetId) return;
    let cancelled = false;
    let ch: ReturnType<typeof supabase.channel> | null = null;

    const refetchSoon = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { if (!cancelled) loadAll(); }, 200);
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) supabase.realtime.setAuth(token);
      if (cancelled) return;

      ch = supabase
        .channel(`meet-detail-${meetId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "meet_participants", filter: `meet_id=eq.${meetId}` },
          refetchSoon
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "meet_posts", filter: `id=eq.${meetId}` },
          refetchSoon
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "meet_comments", filter: `meet_id=eq.${meetId}` },
          refetchSoon
        )
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (ch) supabase.removeChannel(ch);
    };
  }, [meetId, loadAll]);

  const isHost = !!meet && meId === meet.host_id;
  const ended = isPast(meet?.start_at ?? null);

  const isFull =
    meet?.max_people != null &&
    (meet.participant_count ?? 0) >= (meet.max_people ?? 0);

  const isForeignerFull =
    meet?.max_foreigners != null &&
    (meet.foreigner_count ?? 0) >= (meet.max_foreigners ?? 0);

  const isLocalFull =
    meet?.max_locals != null &&
    (meet.local_count ?? 0) >= (meet.max_locals ?? 0);

  const isClosed = !!meet?.is_closed || ended || isFull;

  const capText =
    meet?.max_foreigners != null && meet?.max_locals != null
      ? `${t("createMeet.foreigners")} ${meet.foreigner_count ?? 0}/${meet.max_foreigners} · ${t("createMeet.locals")} ${meet.local_count ?? 0}/${meet.max_locals}`
      : meet?.max_people == null
        ? `${meet?.participant_count ?? 0} ${t("meet.joined_count")}`
        : `${meet?.participant_count ?? 0}/${meet?.max_people} ${t("meet.joined_count")}`;

  const remainText =
    meet?.max_foreigners != null && meet?.max_locals != null
      ? `${Math.max(0, (meet.max_foreigners ?? 0) - (meet.foreigner_count ?? 0))} ${t("meetDetail.foreignerSpots")} + ${Math.max(0, (meet.max_locals ?? 0) - (meet.local_count ?? 0))} ${t("meetDetail.localSpots")}`
      : meet?.max_people == null
        ? t("meetDetail.noCapLimit")
        : `${Math.max(0, (meet.max_people ?? 0) - (meet.participant_count ?? 0))} ${t("meetDetail.spotsLeft")}`;

  async function joinOrRequest() {
    if (!meet || !meId) return;

    // Prevent host from joining their own meet
    if (meet.host_id === meId) {
      setJoinMsg({ type: "error", text: t("meetDetail.cannotJoinOwnMeet") });
      return;
    }

    setJoining(true);
    setJoinMsg(null);

    // Check user_type and slot availability
    if (meet.max_foreigners != null && meet.max_locals != null) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", meId)
        .maybeSingle();

      const myType = myProfile?.user_type;

      if (myType === "foreigner" && isForeignerFull) {
        setJoinMsg({ type: "error", text: t("meetDetail.foreignerSlotsFull") });
        setJoining(false);
        return;
      }
      if (myType === "local" && isLocalFull) {
        setJoinMsg({ type: "error", text: t("meetDetail.localSlotsFull") });
        setJoining(false);
        return;
      }
      if (!myType || (myType !== "foreigner" && myType !== "local")) {
        setJoinMsg({ type: "info", text: t("meetDetail.setUserType") });
        setJoining(false);
        return;
      }
    }

    // Check for existing participation first
    const { data: existing } = await supabase
      .from("meet_participants")
      .select("user_id,status")
      .eq("meet_id", meet.id)
      .eq("user_id", meId)
      .maybeSingle();

    if (existing) {
      setJoinMsg({ type: "info", text: t("meetDetail.alreadyRequested") });
      setJoining(false);
      loadAll();
      return;
    }

    const { error } = await supabase.from("meet_participants").insert({
      meet_id: meet.id,
      user_id: meId,
      status: "pending",
    } as any);

    if (error) {
      const msg = error.message || "";
      if (msg.includes("full") || msg.includes("capacity")) {
        setJoinMsg({ type: "error", text: t("meetDetail.meetFull") });
      } else if (msg.includes("unique") || msg.includes("duplicate")) {
        setJoinMsg({ type: "info", text: t("meetDetail.alreadyRequested") });
      } else {
        setJoinMsg({ type: "error", text: msg });
      }
      setJoining(false);
      return;
    }

    // Notify the host about the join request
    const { data: myProf } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", meId)
      .maybeSingle();
    const requesterName = myProf?.display_name ?? "Someone";

    createNotification({
      userId: meet.host_id,
      type: "meet",
      title: "New join request",
      body: `${requesterName} wants to join "${meet.title}"`,
      link: `/meet/${meet.id}/manage`,
      meta: { title_key: "notif.tpl.meetRequestTitle", body_key: "notif.tpl.meetRequestBody", actor: requesterName, meet_title: meet.title },
    });

    setJoinMsg({ type: "info", text: t("meetDetail.requestSent") });
    setJoining(false);
    loadAll();
  }

  async function cancelRequestOrLeave() {
    if (!meet || !meId) return;

    setJoining(true);

    await supabase
      .from("meet_participants")
      .delete()
      .eq("meet_id", meet.id)
      .eq("user_id", meId);

    setJoining(false);
    loadAll();
  }

  async function goChat() {
    if (!groupConversationId) return;
    router.push(`/chats/${groupConversationId}`);
  }

  function primaryButtonText() {
    if (!meId) return t("meetDetail.loginRequired");
    if (isHost) return "";
    if (myStatus === "approved") return t("meet.leave");
    if (myStatus === "pending") return t("meetDetail.pendingCancel");
    if (myStatus === "rejected") return t("meetDetail.rejected");
    return t("meetDetail.requestToJoin");
  }

  function primaryDisabled() {
    if (!meId) return true;
    if (isHost) return true;
    if (myStatus === "rejected") return true;
    if (isClosed && myStatus === "none") return true;
    return false;
  }

  async function onPrimary() {
    if (!meId || isHost) return;
    if (myStatus === "approved" || myStatus === "pending") {
      await cancelRequestOrLeave();
      return;
    }
    await joinOrRequest();
  }

  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!meet || !meId) return;
    if (!confirm(t("meetDetail.deleteConfirm"))) return;

    setDeleting(true);
    const { error } = await supabase.from("meet_posts").delete().eq("id", meet.id);
    if (error) {
      alert(error.message);
      setDeleting(false);
      return;
    }
    router.push("/meet");
  }

  const approvedList = useMemo(() => participants.filter((p) => p.status === "approved"), [participants]);
  const pendingList = useMemo(() => participants.filter((p) => p.status === "pending"), [participants]);

  if (loading) return <div className="min-h-screen p-6" style={{ color: "var(--text-muted)" }}><div className="mx-auto max-w-2xl space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="b-skeleton h-24 w-full"/>)}</div></div>;
  if (!meet) return <div className="min-h-screen p-6" style={{ color: "var(--text-muted)" }}>{t("meetDetail.notFound")}</div>;

  const pendingBtn = myStatus === "pending";

  const primaryClass = (() => {
    if (primaryDisabled()) return "text-white" + " " + "opacity-50";
    if (pendingBtn) return "bg-[var(--bg-card)] border hover:bg-[var(--light-blue)]";
    return "text-white hover:opacity-90";
  })();

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24 b-animate-in">
        <div className="flex items-center justify-between">
          <Link href="/meet" className="rounded-2xl px-4 py-2 text-sm font-semibold hover:bg-[var(--light-blue)]" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>
            &larr; {t("meetDetail.list")}
          </Link>

          <button onClick={() => loadAll()} className="rounded-2xl px-3 py-2 text-sm font-semibold hover:bg-[var(--light-blue)]" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>
            {t("meetDetail.refresh")}
          </button>
        </div>

        <div className="b-card mt-4 p-4">
          {meet.image_url && (
            <div className="mb-4 overflow-hidden rounded-2xl" style={{ border: "1px solid var(--border-soft)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={meet.image_url} alt="cover" className="h-56 w-full object-cover" />
            </div>
          )}

          <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {typeEmoji(meet.type)} {t(typeLabelKey(meet.type))}
            {meet.type === "sports" && meet.sport ? ` · ${meet.sport}` : ""}
          </div>

          <h1 className="mt-2 text-xl font-bold">{meet.title}</h1>

          {/* Host profile */}
          {hostProfile && (
            <Link
              href={`/u/${meet.host_id}`}
              className="mt-2.5 flex items-center gap-2.5 no-underline group w-fit"
            >
              {hostProfile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={hostProfile.avatar_url}
                  alt={hostProfile.display_name ?? "Host"}
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                  style={{ border: "1.5px solid var(--border-soft)" }}
                />
              ) : (
                <div
                  className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                  style={{ background: "var(--primary)" }}
                >
                  {(hostProfile.display_name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Host</div>
                <div className="text-sm font-semibold group-hover:underline" style={{ color: "var(--deep-navy)" }}>
                  {hostProfile.display_name ?? t("common.unknown")}
                </div>
              </div>
            </Link>
          )}

          {/* Approval banner + shortcut */}
          {approvedJustNow && (
            <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <div>{t("meetDetail.approvedBanner")}</div>
              {groupConversationId && (
                <button onClick={goChat} className="rounded-2xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90" style={{ background: "var(--primary)" }}>
                  {t("meetDetail.enterNow")}
                </button>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {ended ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">{t("meet.ended")}</span>
            ) : meet.is_closed ? (
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ border: "1px solid var(--border-soft)", background: "var(--light-blue)", color: "var(--text-secondary)" }}>{t("meet.closed")}</span>
            ) : isFull ? (
              <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">{t("meet.full")}</span>
            ) : (
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">{t("meet.open")}</span>
            )}

            {meet.max_people != null && (
              <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ border: "1px solid var(--border-soft)", background: "var(--light-blue)", color: "var(--text-secondary)" }}>{remainText}</span>
            )}

            {myStatus !== "none" && !isHost && (
              <span className={cx(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                myStatus === "approved" ? "border-green-200 bg-green-50 text-green-700" :
                myStatus === "pending" ? "border-yellow-200 bg-yellow-50 text-yellow-700" :
                "border-red-200 bg-red-50 text-red-700"
              )}>
                {t("meetDetail.myStatus")}: {t(`meetDetail.status${myStatus.charAt(0).toUpperCase()}${myStatus.slice(1)}`)}
              </span>
            )}
          </div>

          <div className="mt-3 text-sm whitespace-pre-wrap">{meet.description}</div>

          <div className="mt-4 space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            <div>{t("meetDetail.time")}: {meet.start_at ? new Date(meet.start_at).toLocaleString() : t("meetDetail.tbd")}</div>
            <div>{t("meetDetail.place")}: {meet.place_hint || meet.city || t("meetDetail.tbd")}</div>
            {meet.online_url && (isHost || myStatus === "approved") && (
              <div className="flex items-center gap-1.5">
                <span>{t("meetDetail.onlineUrl")}:</span>
                <a
                  href={meet.online_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate max-w-xs font-medium hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {meet.online_url}
                </a>
              </div>
            )}
            <div>{capText}</div>
          </div>

          {/* Foreigner / Local quota bars */}
          {meet.max_foreigners != null && meet.max_locals != null && (
            <div className="mt-4 space-y-2">
              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1">
                  <span style={{ color: "#1D4ED8" }}>{t("createMeet.foreigners")}</span>
                  <span style={{ color: "var(--text-muted)" }}>{meet.foreigner_count ?? 0} / {meet.max_foreigners}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, ((meet.foreigner_count ?? 0) / meet.max_foreigners) * 100)}%`,
                    background: isForeignerFull ? "#22C55E" : "#3B82F6",
                  }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs font-medium mb-1">
                  <span style={{ color: "#92400E" }}>{t("createMeet.locals")}</span>
                  <span style={{ color: "var(--text-muted)" }}>{meet.local_count ?? 0} / {meet.max_locals}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-soft)" }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, ((meet.local_count ?? 0) / meet.max_locals) * 100)}%`,
                    background: isLocalFull ? "#22C55E" : "#F59E0B",
                  }} />
                </div>
              </div>
            </div>
          )}


          {/* Participant list */}
          <div className="b-card mt-6 p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t("meetDetail.participants")}</div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{approvedList.length}</div>
            </div>

            {approvedList.length === 0 ? (
              <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{t("meetDetail.noParticipants")}</div>
            ) : (
              <div className="mt-3 grid gap-2">
                {approvedList.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full overflow-hidden" style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="text-sm font-semibold truncate">
                        {p.display_name ?? p.user_id.slice(0, 8)}
                      </div>
                      {p.user_type && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                          background: p.user_type === "foreigner" ? "#DBEAFE" : "#FEF3C7",
                          color: p.user_type === "foreigner" ? "#1D4ED8" : "#92400E",
                        }}>
                          {p.user_type === "foreigner" ? t("createMeet.foreigners") : t("createMeet.locals")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pendingList.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{t("meetDetail.pending")}</div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{pendingList.length}</div>
                </div>

                <div className="mt-3 grid gap-2">
                  {pendingList.map((p) => (
                    <div key={p.user_id} className="flex items-center gap-3 opacity-80">
                      <div className="h-8 w-8 rounded-full overflow-hidden" style={{ border: "1px solid var(--border-soft)", background: "var(--bg-card)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex items-center gap-2">
                        <div className="text-sm font-semibold truncate">
                          {p.display_name ?? p.user_id.slice(0, 8)}
                        </div>
                        {p.user_type && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                            background: p.user_type === "foreigner" ? "#DBEAFE" : "#FEF3C7",
                            color: p.user_type === "foreigner" ? "#1D4ED8" : "#92400E",
                          }}>
                            {p.user_type === "foreigner" ? t("createMeet.foreigners") : t("createMeet.locals")}
                          </span>
                        )}
                        <span className="text-xs text-yellow-600">{t("meetDetail.pending")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {!isHost && myStatus === "pending" && (
                  <div className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>{t("meetDetail.chatOnceApproved")}</div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2 flex-wrap">
            {groupConversationId && myStatus === "approved" && (
              <button
                onClick={goChat}
                className={cx(
                  "rounded-2xl px-4 py-2 text-sm font-semibold",
                  approvedJustNow ? "text-white hover:opacity-90" : "hover:bg-[var(--light-blue)]"
                )}
                style={{ background: approvedJustNow ? "var(--primary)" : "var(--bg-card)", border: approvedJustNow ? "none" : "1px solid var(--border-soft)", color: approvedJustNow ? undefined : "var(--text-secondary)" }}
              >
                {t("meetDetail.groupChat")}
              </button>
            )}

            {isHost && (
              <Link href={`/meet/${meet.id}/manage`} className="rounded-2xl px-4 py-2 text-sm font-semibold hover:bg-[var(--light-blue)]" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}>
                {t("meetDetail.manageParticipants")}
              </Link>
            )}

            {isHost && (
              <Link
                href={`/meet/${meet.id}/edit`}
                className="rounded-2xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-[var(--light-blue)]"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
              >
                <Edit3 size={14} />
                {t("common.edit")}
              </Link>
            )}

            {isHost && (
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? t("meetDetail.deleting") : t("common.delete")}
              </button>
            )}

            {!isHost && (
              <button
                disabled={joining || primaryDisabled()}
                onClick={onPrimary}
                className={cx("rounded-2xl px-4 py-2 text-sm font-semibold", primaryClass)}
                style={{ background: primaryDisabled() ? "var(--text-muted)" : pendingBtn ? "var(--bg-card)" : "var(--primary)", border: pendingBtn ? "1px solid var(--border-soft)" : "none", color: pendingBtn ? "var(--text-secondary)" : undefined }}
              >
                {joining ? (
                  t("meetDetail.processing")
                ) : pendingBtn ? (
                  primaryButtonText()
                ) : (
                  primaryButtonText()
                )}
              </button>
            )}

            {joinMsg && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{
                  background: joinMsg.type === "error" ? "#FEF2F2" : "var(--light-blue)",
                  border: joinMsg.type === "error" ? "1px solid #FECACA" : "1px solid var(--border-soft)",
                  color: joinMsg.type === "error" ? "#B91C1C" : "var(--deep-navy)",
                }}
              >
                {joinMsg.text}
                {joinMsg.type === "info" && joinMsg.text === t("meetDetail.setUserType") && (
                  <button
                    type="button"
                    onClick={() => router.push("/settings")}
                    className="ml-2 underline font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {t("common.settings")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {/* ── Meet Comments ── */}
        <div className="mt-6">
          <div className="b-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-semibold" style={{ color: "var(--deep-navy)" }}>
                <MessageCircle className="h-5 w-5" style={{ color: "var(--primary)" }} />
                {t("meet.comments")}
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{meetComments.length}</span>
            </div>

            {/* Comment list */}
            <div className="mt-4 space-y-3">
              {rootComments.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl px-4 py-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}>
                  <MessageCircle className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("meet.noComments")}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("meet.beFirstComment")}</div>
                  </div>
                </div>
              ) : (
                rootComments.map((c) => {
                  const replies = childrenMap[c.id] ?? [];
                  const hidden = repliesHiddenById[c.id] ?? (replies.length > 2);
                  return (
                    <div key={c.id}>
                      {/* Root comment */}
                      <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                              <span className="font-semibold" style={{ color: "var(--deep-navy)" }}>{c.author_name ?? t("post.anonymous")}</span>
                              {meId === c.user_id && (
                                <span className="inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-semibold text-white" style={{ background: "var(--primary)" }}>You</span>
                              )}
                              <span>&middot;</span>
                              <span>{formatRelative(c.created_at, t)}</span>
                            </div>
                            <div className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{c.content}</div>
                            <div className="mt-2 flex items-center gap-3">
                              <button
                                onClick={() => setReplyOpenById((p) => ({ ...p, [c.id]: !p[c.id] }))}
                                className="flex items-center gap-1 text-xs font-medium transition hover:opacity-70"
                                style={{ color: "var(--primary)" }}
                              >
                                <Reply className="h-3.5 w-3.5" />
                                {t("meet.reply")}
                              </button>
                              {replies.length > 0 && (
                                <button
                                  onClick={() => setRepliesHiddenById((p) => ({ ...p, [c.id]: !hidden }))}
                                  className="flex items-center gap-1 text-xs font-medium transition hover:opacity-70"
                                  style={{ color: "var(--text-muted)" }}
                                >
                                  {hidden ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                                  {replies.length} {t("meet.replies")}
                                </button>
                              )}
                            </div>
                          </div>
                          {meId === c.user_id && (
                            <button onClick={() => deleteMeetComment(c.id)} disabled={deletingCommentId === c.id}
                              className="shrink-0 rounded-lg p-1.5 transition hover:bg-red-50" style={{ color: "var(--text-muted)" }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {!hidden && replies.length > 0 && (
                        <div className="ml-6 mt-2 space-y-2">
                          {replies.map((r) => (
                            <div key={r.id} className="rounded-xl p-3" style={{ background: "var(--bg-elevated)", borderLeft: "2px solid var(--border-soft)" }}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                                    <span className="font-semibold" style={{ color: "var(--deep-navy)" }}>{r.author_name ?? t("post.anonymous")}</span>
                                    {meId === r.user_id && (
                                      <span className="inline-flex h-5 items-center rounded-full px-1.5 text-[10px] font-semibold text-white" style={{ background: "var(--primary)" }}>You</span>
                                    )}
                                    <span>&middot;</span>
                                    <span>{formatRelative(r.created_at, t)}</span>
                                  </div>
                                  <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.content}</div>
                                </div>
                                {meId === r.user_id && (
                                  <button onClick={() => deleteMeetComment(r.id)} disabled={deletingCommentId === r.id}
                                    className="shrink-0 rounded-lg p-1.5 transition hover:bg-red-50" style={{ color: "var(--text-muted)" }}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      {replyOpenById[c.id] && (
                        <div className="ml-6 mt-2 flex gap-2">
                          <input
                            value={replyBodyById[c.id] ?? ""}
                            onChange={(e) => setReplyBodyById((p) => ({ ...p, [c.id]: e.target.value }))}
                            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); addMeetComment(c.id); } }}
                            placeholder={t("meet.replyPlaceholder")}
                            disabled={commentSaving}
                            className="flex-1 rounded-xl px-3 py-2 text-sm outline-none disabled:opacity-70"
                            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                          />
                          <button
                            onClick={() => addMeetComment(c.id)}
                            disabled={commentSaving || !(replyBodyById[c.id] ?? "").trim()}
                            className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                            style={{ background: "var(--primary)" }}
                          >
                            {t("meet.reply")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Root comment form */}
            <div className="mt-5 rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-soft)" }}>
              <div className="mb-2 text-sm font-medium" style={{ color: "var(--deep-navy)" }}>{t("meet.writeComment")}</div>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); addMeetComment(); } }}
                placeholder={t("meet.commentPlaceholder")}
                disabled={commentSaving}
                className="min-h-[80px] w-full resize-y rounded-xl p-3 text-sm outline-none disabled:opacity-70"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => addMeetComment()}
                  disabled={commentSaving || !commentBody.trim()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "var(--primary)" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {commentSaving ? t("meet.postingComment") : t("meet.postComment")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        {(() => {
          const upcoming = otherMeets
            .filter((m) => m.start_at && new Date(m.start_at).getTime() > Date.now())
            .sort((a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime())
            .slice(0, 8);
          if (!upcoming.length) return null;
          return (
            <div className="mt-8">
              <div className="mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <span className="text-base font-bold" style={{ color: "var(--deep-navy)" }}>Upcoming Events</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {upcoming.map((m) => (
                  <Link key={m.id} href={`/meet/${m.id}`} className="no-underline text-inherit shrink-0 w-52">
                    <div className="rounded-2xl p-3.5 h-full flex flex-col gap-1.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
                      <span className={`inline-flex h-5 w-fit items-center rounded-full px-2 text-[10px] font-semibold b-meet-${m.type}`}>
                        {typeEmoji(m.type)} {t(`meet.${m.type}`)}
                      </span>
                      <div className="text-sm font-semibold line-clamp-2 leading-snug" style={{ color: "var(--deep-navy)" }}>{m.title}</div>
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="truncate">{new Date(m.start_at!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                      {m.city && (
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{m.city}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[11px] mt-auto pt-1" style={{ color: "var(--text-secondary)" }}>
                        {m.host_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.host_avatar_url} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "var(--primary)" }}>
                            {(m.host_display_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">{m.host_display_name ?? t("common.unknown")}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Nearby Events */}
        {meet.city && (() => {
          const nearby = otherMeets
            .filter((m) => m.city && m.city.toLowerCase() === meet.city!.toLowerCase())
            .slice(0, 8);
          if (!nearby.length) return null;
          return (
            <div className="mt-6 mb-6">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" style={{ color: "var(--primary)" }} />
                <span className="text-base font-bold" style={{ color: "var(--deep-navy)" }}>Nearby Events</span>
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>· {meet.city}</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {nearby.map((m) => (
                  <Link key={m.id} href={`/meet/${m.id}`} className="no-underline text-inherit shrink-0 w-52">
                    <div className="rounded-2xl p-3.5 h-full flex flex-col gap-1.5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
                      <span className={`inline-flex h-5 w-fit items-center rounded-full px-2 text-[10px] font-semibold b-meet-${m.type}`}>
                        {typeEmoji(m.type)} {t(`meet.${m.type}`)}
                      </span>
                      <div className="text-sm font-semibold line-clamp-2 leading-snug" style={{ color: "var(--deep-navy)" }}>{m.title}</div>
                      {m.start_at && (
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span className="truncate">{new Date(m.start_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        <Users className="h-3 w-3 shrink-0" />
                        <span>{m.participant_count} {t("meet.joined_count")}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] mt-auto pt-1" style={{ color: "var(--text-secondary)" }}>
                        {m.host_avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.host_avatar_url} alt="" className="h-4 w-4 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold text-white" style={{ background: "var(--primary)" }}>
                            {(m.host_display_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="truncate">{m.host_display_name ?? t("common.unknown")}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
