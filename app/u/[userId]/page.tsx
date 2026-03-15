"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { countryName } from "@/lib/countries";
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowerCount,
  getFollowingCount,
} from "@/lib/followService";
import { ArrowLeft, User, MessageCircle, FileText, MapPin } from "lucide-react";
import { langLabel } from "@/lib/languages";
import { useT } from "@/app/components/LangProvider";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  residence_country: string | null;
  origin_country: string | null;
  languages: string[] | null;
  bio: string | null;
};

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  image_url: string | null;
};

function formatRelative(iso: string) {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function UserProfilePage() {
  const { t } = useT();
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const router = useRouter();

  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [me, setMe] = useState<string | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<"posts" | "about">("posts");

  const profileId = p?.id ?? userId;
  const isMe = me === profileId;

  const displayResidence = useMemo(() => countryName(p?.residence_country, "en"), [p?.residence_country]);
  const displayOrigin = useMemo(() => countryName(p?.origin_country, "en"), [p?.origin_country]);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: authData } = await supabase.auth.getUser();
      const myId = authData.user?.id ?? null;
      setMe(myId);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, residence_country, origin_country, languages, bio")
        .eq("id", userId)
        .maybeSingle();

      if (error) { setErrorMsg(error.message); setLoading(false); return; }
      if (!data) { setErrorMsg(t("userProfile.notFound")); setLoading(false); return; }

      setP(data as Profile);

      // Counts
      const fc = await getFollowerCount(userId);
      const fg = await getFollowingCount(userId);
      setFollowerCount(fc);
      setFollowingCount(fg);

      // Follow state
      if (myId && myId !== userId) {
        const state = await isFollowing(myId, userId);
        setIsFollowed(state);
      }

      // Posts
      const { data: postData } = await supabase
        .from("posts")
        .select("id, created_at, title, content, image_url")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      setPosts((postData ?? []) as Post[]);
      setLoading(false);
    })();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!profileId) return;
    if (!me) { router.push("/login"); return; }
    if (isMe || followBusy) return;

    setFollowBusy(true);
    try {
      if (isFollowed) {
        await unfollowUser(me, profileId);
        setIsFollowed(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followUser(me, profileId);
        setIsFollowed(true);
        setFollowerCount((c) => c + 1);
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Error");
    }
    setFollowBusy(false);
  };

  const handleDM = async () => {
    if (!me) { router.push("/login"); return; }
    if (!profileId || isMe) return;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("v_chat_list")
      .select("conversation_id")
      .eq("me_id", me)
      .eq("other_id", profileId)
      .maybeSingle();

    if (existing?.conversation_id) {
      router.push(`/chats/${existing.conversation_id}`);
    } else {
      router.push(`/chats/new?to=${profileId}`);
    }
  };

  const postImages = useMemo(() => posts.filter((p) => p.image_url), [posts]);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
        <div className="mx-auto max-w-2xl px-4 py-6 pb-24 space-y-4">
          {/* Skeleton header */}
          <div className="flex items-center gap-3 py-3">
            <div className="b-skeleton h-10 w-20" />
            <div className="b-skeleton h-6 w-40" />
          </div>
          {/* Skeleton profile card */}
          <div className="b-card b-animate-in p-5">
            <div className="flex items-center gap-5">
              <div className="b-skeleton h-20 w-20 shrink-0 rounded-full" />
              <div className="flex flex-1 justify-around">
                <div className="b-skeleton h-10 w-14" />
                <div className="b-skeleton h-10 w-14" />
                <div className="b-skeleton h-10 w-14" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="b-skeleton h-4 w-32" />
              <div className="b-skeleton h-4 w-48" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg || !p) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
        <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
          <button
            onClick={() => router.back()}
            className="mb-4 rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            ← {t("common.back")}
          </button>
          <div className="b-animate-in rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg ?? t("userProfile.notFound")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <header className="flex items-center gap-3 py-3 b-animate-in">
          <button
            onClick={() => router.back()}
            className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-medium transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
          <h1 className="text-xl font-bold truncate" style={{ color: "var(--deep-navy)" }}>{p.display_name ?? t("userProfile.user")}</h1>
        </header>

        {/* Profile Card */}
        <section className="mt-2 b-card b-animate-in">
          <div className="p-5">
            {/* Avatar + Stats */}
            <div className="flex items-center gap-5">
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar_url}
                  alt={p.display_name ?? t("userProfile.user")}
                  className="h-20 w-20 shrink-0 rounded-full object-cover"
                  style={{ border: "2px solid var(--border-soft)" }}
                />
              ) : (
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}
                >
                  <User className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
                </div>
              )}

              <div className="flex flex-1 justify-around text-center">
                <div>
                  <div className="text-lg font-bold" style={{ color: "var(--deep-navy)" }}>{posts.length}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("profile.posts")}</div>
                </div>
                <div>
                  <div className="text-lg font-bold" style={{ color: "var(--deep-navy)" }}>{followerCount}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("profile.followers")}</div>
                </div>
                <div>
                  <div className="text-lg font-bold" style={{ color: "var(--deep-navy)" }}>{followingCount}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("profile.following")}</div>
                </div>
              </div>
            </div>

            {/* Name + Bio */}
            <div className="mt-4">
              <div className="text-sm font-bold" style={{ color: "var(--deep-navy)" }}>{p.display_name ?? t("userProfile.user")}</div>
              {p.bio && (
                <div className="mt-1 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{p.bio}</div>
              )}
            </div>

            {/* Action buttons */}
            {!isMe && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleFollowToggle}
                  disabled={followBusy}
                  className="flex-1 inline-flex h-9 items-center justify-center rounded-2xl text-sm font-semibold transition disabled:opacity-50"
                  style={
                    isFollowed
                      ? { background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }
                      : { background: "var(--primary)", border: "1px solid var(--primary)", color: "#FFFFFF" }
                  }
                >
                  {isFollowed ? t("userProfile.following") : t("userProfile.follow")}
                </button>
                <button
                  onClick={handleDM}
                  className="flex-1 inline-flex h-9 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition hover:opacity-80"
                  style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {t("userProfile.message")}
                </button>
              </div>
            )}

            {isMe && (
              <div className="mt-4">
                <Link
                  href="/settings"
                  className="inline-flex h-9 w-full items-center justify-center rounded-2xl text-sm font-semibold transition hover:opacity-80 no-underline"
                  style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                >
                  {t("profile.editProfile")}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Tabs */}
        <div className="mt-4 flex" style={{ borderBottom: "1px solid var(--border-soft)" }}>
          <button
            onClick={() => setTab("posts")}
            className="flex-1 py-3 text-sm font-semibold text-center transition"
            style={
              tab === "posts"
                ? { borderBottom: "2px solid var(--primary)", color: "var(--primary)" }
                : { color: "var(--text-muted)" }
            }
          >
            <FileText className="mx-auto mb-1 h-5 w-5" />
            {t("profile.posts")}
          </button>
          <button
            onClick={() => setTab("about")}
            className="flex-1 py-3 text-sm font-semibold text-center transition"
            style={
              tab === "about"
                ? { borderBottom: "2px solid var(--primary)", color: "var(--primary)" }
                : { color: "var(--text-muted)" }
            }
          >
            <User className="mx-auto mb-1 h-5 w-5" />
            {t("profile.about")}
          </button>
        </div>

        {/* Posts Tab */}
        {tab === "posts" && (
          <div className="mt-4">
            {posts.length === 0 ? (
              <div
                className="b-card b-animate-in flex flex-col items-center justify-center px-6 py-12 text-center"
                style={{ borderStyle: "dashed" }}
              >
                <FileText className="mb-3 h-10 w-10" style={{ color: "var(--text-muted)" }} />
                <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("profile.noPostsYet")}</div>
              </div>
            ) : (
              <div className="grid gap-3">
                {posts.map((post, i) => (
                  <Link key={post.id} href={`/posts/${post.id}`} className="block no-underline text-inherit">
                    <article
                      className="b-card b-card-hover b-animate-in overflow-hidden"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {post.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.image_url}
                          alt=""
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="line-clamp-2 text-sm font-semibold leading-5 sm:text-base" style={{ color: "var(--deep-navy)" }}>
                            {post.title}
                          </h2>
                          <span className="whitespace-nowrap text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                            {formatRelative(post.created_at)}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                          {post.content.length > 160 ? `${post.content.slice(0, 160)}...` : post.content}
                        </p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About Tab */}
        {tab === "about" && (
          <div className="mt-4">
            <section className="b-card b-animate-in">
              <div className="p-5 space-y-4">
                {p.bio && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.bio")}</div>
                    <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{p.bio}</div>
                  </div>
                )}

                {displayResidence && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.residenceCountry")}</div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <MapPin className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      {displayResidence}
                    </div>
                  </div>
                )}

                {displayOrigin && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.originCountry")}</div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <MapPin className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      {displayOrigin}
                    </div>
                  </div>
                )}

                {p.languages && p.languages.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.languages")}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.languages.map((lang) => (
                        <span
                          key={lang}
                          className="inline-flex h-7 items-center rounded-full px-3 text-xs font-medium"
                          style={{ background: "var(--light-blue)", color: "var(--primary)" }}
                        >
                          {langLabel(lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!p.bio && !displayResidence && !displayOrigin && (!p.languages || p.languages.length === 0) && (
                  <div className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>{t("userProfile.noInfo")}</div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
