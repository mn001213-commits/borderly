"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getFollowerCount, getFollowingCount } from "@/lib/followService";
import { countryName } from "@/lib/countries";
import { User, FileText, Mail, Trash2, QrCode, X, Pencil, MapPin, Bookmark, Menu, CalendarHeart } from "lucide-react";
import dynamic from "next/dynamic";
const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), { ssr: false });
import { langLabel } from "@/lib/languages";
import { useT } from "@/app/components/LangProvider";
import { isVideoUrl, formatRelative } from "@/lib/format";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  image_url: string | null;
};

type MeetPost = {
  id: string;
  created_at: string;
  title: string;
  type: string;
  city: string | null;
  start_at: string | null;
  is_closed: boolean;
};

export default function ProfilePage() {
  const { t } = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Unnamed User");
  const [email, setEmail] = useState<string | null>(null);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [posts, setPosts] = useState<Post[]>([]);
  const [meets, setMeets] = useState<MeetPost[]>([]);

  const [bio, setBio] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [residenceCountry, setResidenceCountry] = useState<string | null>(null);
  const [originCountry, setOriginCountry] = useState<string | null>(null);
  const [languages, setLanguages] = useState<string[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [tab, setTab] = useState<"posts" | "meets" | "about">("about");

  useEffect(() => {
    const load = async () => {
      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) {
        setMsg(uErr.message);
        setLoading(false);
        return;
      }

      const user = u.user;
      const myId = user?.id;

      if (!myId) {
        router.replace("/login");
        return;
      }

      setMeId(myId);
      setEmail(user?.email ?? null);

      // 캐시 확인
      const cacheKey = `profile-data-${myId}`;
      const cached = sessionStorage.getItem(cacheKey);

      if (cached) {
        try {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          // 5분 이내 캐시면 즉시 표시
          if (age < 5 * 60 * 1000) {
            setDisplayName(cachedData.displayName);
            setAvatarUrl(cachedData.avatarUrl);
            setBio(cachedData.bio);
            setResidenceCountry(cachedData.residenceCountry);
            setOriginCountry(cachedData.originCountry);
            setLanguages(cachedData.languages);
            setFollowers(cachedData.followers);
            setFollowing(cachedData.following);
            setPosts(cachedData.posts);
            setMeets(cachedData.meets);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Cache parse error:", e);
          sessionStorage.removeItem(cacheKey);
        }
      }

      // 캐시 없거나 만료됨 - 새 데이터 로드
      setLoading(true);
      setMsg(null);

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio, residence_country, origin_country, languages")
        .eq("id", myId)
        .maybeSingle();

      setDisplayName(prof?.display_name ?? user?.email ?? "Unnamed User");
      setAvatarUrl(prof?.avatar_url ?? null);
      setBio(prof?.bio ?? null);
      setResidenceCountry(prof?.residence_country ?? null);
      setOriginCountry(prof?.origin_country ?? null);
      setLanguages(prof?.languages ?? []);

      const fc = await getFollowerCount(myId);
      const fg = await getFollowingCount(myId);
      setFollowers(fc);
      setFollowing(fg);

      const [postsRes, meetsRes] = await Promise.all([
        supabase
          .from("posts")
          .select("id,created_at,title,content,author_name,image_url")
          .eq("user_id", myId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("meet_posts")
          .select("id,created_at,title,type,city,start_at,is_closed")
          .eq("host_id", myId)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (postsRes.error) {
        setMsg(postsRes.error.message);
        setPosts([]);
        setLoading(false);
        return;
      }

      const postsData = (postsRes.data ?? []) as Post[];
      const meetsData = (meetsRes.data ?? []) as MeetPost[];

      setPosts(postsData);
      setMeets(meetsData);

      // 캐시 저장
      try {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: {
              displayName: prof?.display_name ?? user?.email ?? "Unnamed User",
              avatarUrl: prof?.avatar_url ?? null,
              bio: prof?.bio ?? null,
              residenceCountry: prof?.residence_country ?? null,
              originCountry: prof?.origin_country ?? null,
              languages: prof?.languages ?? [],
              followers: fc,
              following: fg,
              posts: postsData,
              meets: meetsData,
            },
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        console.warn("Cache storage failed:", e);
      }

      setLoading(false);
    };

    load();
  }, [router]);

  const handleDeletePost = async (postId: string) => {
    if (!meId) return;

    const ok = confirm(t("profile.deleteConfirm"));
    if (!ok) return;

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", meId);

    if (error) {
      alert("Failed to delete post: " + error.message);
      return;
    }

    setPosts((prev) => prev.filter((p) => p.id !== postId));

    // 캐시 무효화
    sessionStorage.removeItem(`profile-data-${meId}`);
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <h1 className="text-xl font-bold">{t("profile.title")}</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/profile/edit"
              className="inline-flex h-10 items-center gap-2 rounded-2xl px-3 text-sm font-semibold no-underline transition hover:opacity-80"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
            >
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </Link>
            <Link
              href="/settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl no-underline transition hover:opacity-80"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
            >
              <Menu className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <section className="b-card b-animate-in">
            {loading ? (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-5">
                  <div className="b-skeleton h-20 w-20 shrink-0" style={{ borderRadius: "50%" }} />
                  <div className="flex-1 space-y-2">
                    <div className="b-skeleton h-5 w-3/4" style={{ borderRadius: 8 }} />
                    <div className="b-skeleton h-4 w-1/2" style={{ borderRadius: 8 }} />
                  </div>
                </div>
                <div className="b-skeleton h-9 w-full" style={{ borderRadius: 12 }} />
              </div>
            ) : msg ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            ) : (
              <div className="p-5">
                {/* Avatar + Stats row (Instagram style) */}
                <div className="flex items-center gap-5">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-20 w-20 shrink-0 rounded-full object-cover"
                      style={{ border: "2px solid var(--border-soft)" }}
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                      <User className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}

                  <div className="flex flex-1 justify-around text-center">
                    <div>
                      <div className="text-lg font-bold" style={{ color: "var(--deep-navy)" }}>{posts.length + meets.length}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("profile.posts")}</div>
                    </div>
                    <Link href="/profile/followers" className="no-underline text-inherit hover:opacity-70 transition">
                      <div className="text-lg font-bold" style={{ color: "var(--deep-navy)" }}>{followers}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("profile.followers")}</div>
                    </Link>
                    <Link href="/profile/following" className="no-underline text-inherit hover:opacity-70 transition">
                      <div className="text-lg font-bold" style={{ color: "var(--deep-navy)" }}>{following}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t("profile.following")}</div>
                    </Link>
                  </div>
                </div>

                {/* Name + Bio */}
                <div className="mt-4">
                  <div className="text-sm font-bold" style={{ color: "var(--deep-navy)" }}>{displayName}</div>
                  {bio && (
                    <div className="mt-1 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{bio}</div>
                  )}
                </div>

                {/* Action buttons: Edit Profile + QR + Saved */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQR(true)}
                    className="flex-1 inline-flex h-9 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition hover:opacity-80"
                    style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    {t("profile.shareQR")}
                  </button>
                  <Link
                    href="/bookmarks"
                    className="flex-1 inline-flex h-9 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition hover:opacity-80 no-underline"
                    style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    {t("profile.saved")}
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Tabs */}
          <div className="flex" style={{ borderBottom: "1px solid var(--border-soft)" }}>
            <button
              onClick={() => setTab("about")}
              className="flex-1 py-3 text-sm font-semibold text-center transition"
              style={{
                borderBottom: tab === "about" ? "2px solid var(--primary)" : "2px solid transparent",
                color: tab === "about" ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              <User className="mx-auto mb-1 h-5 w-5" />
              {t("profile.about")}
            </button>
            <button
              onClick={() => setTab("posts")}
              className="flex-1 py-3 text-sm font-semibold text-center transition"
              style={{
                borderBottom: tab === "posts" ? "2px solid var(--primary)" : "2px solid transparent",
                color: tab === "posts" ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              <FileText className="mx-auto mb-1 h-5 w-5" />
              {t("profile.posts")}
            </button>
            <button
              onClick={() => setTab("meets")}
              className="flex-1 py-3 text-sm font-semibold text-center transition"
              style={{
                borderBottom: tab === "meets" ? "2px solid var(--primary)" : "2px solid transparent",
                color: tab === "meets" ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              <CalendarHeart className="mx-auto mb-1 h-5 w-5" />
              Meets
            </button>
          </div>

          {/* Posts Tab */}
          {tab === "posts" && (
            <section>
              {!loading && !msg && posts.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center b-animate-in"
                  style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}
                >
                  <FileText className="mb-3 h-10 w-10" style={{ color: "var(--border-soft)" }} />
                  <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>{t("profile.noPostsYet")}</div>
                  <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    {t("profile.shareFirst")}
                  </div>
                  <Link
                    href="/create"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium text-white transition hover:opacity-90 no-underline"
                    style={{ background: "var(--primary)" }}
                  >
                    {t("profile.createPost")}
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  {posts.map((p, idx) => (
                    <Link
                      key={p.id}
                      href={`/posts/${p.id}`}
                      className="block no-underline text-inherit"
                    >
                      <article className="b-card b-card-hover b-animate-in overflow-hidden" style={{ animationDelay: `${idx * 0.05}s` }}>
                        {p.image_url && (
                          isVideoUrl(p.image_url) ? (
                            <video
                              src={p.image_url}
                              controls
                              preload="metadata"
                              className="w-full"
                              onClick={(e) => e.preventDefault()}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_url}
                              alt=""
                              className="w-full"
                            />
                          )
                        )}
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h2 className="line-clamp-2 text-sm font-semibold leading-5 sm:text-base" style={{ color: "var(--deep-navy)" }}>
                              {p.title}
                            </h2>

                            <div className="flex shrink-0 items-center gap-2">
                              <span className="whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                                {formatRelative(p.created_at)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeletePost(p.id);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-600"
                                style={{ color: "var(--text-muted)" }}
                                aria-label="Delete post"
                                title="Delete post"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="mt-3 line-clamp-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                            {p.content.length > 160 ? `${p.content.slice(0, 160)}...` : p.content}
                          </p>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Meets Tab */}
          {tab === "meets" && (
            <section>
              {!loading && !msg && meets.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center b-animate-in"
                  style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}
                >
                  <CalendarHeart className="mb-3 h-10 w-10" style={{ color: "var(--border-soft)" }} />
                  <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>No meets yet</div>
                  <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    Create your first meet event
                  </div>
                  <Link
                    href="/meet/new"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium text-white transition hover:opacity-90 no-underline"
                    style={{ background: "var(--primary)" }}
                  >
                    Create Meet
                  </Link>
                </div>
              ) : (
                <div className="grid gap-2">
                  {meets.map((m, idx) => (
                    <Link
                      key={m.id}
                      href={`/meet/${m.id}`}
                      className="block no-underline text-inherit"
                    >
                      <div
                        className="b-card b-card-hover b-animate-in flex items-center gap-3 px-4 py-3"
                        style={{ animationDelay: `${idx * 0.04}s` }}
                      >
                        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold shrink-0 b-meet-${m.type}`}>
                          {m.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: "var(--deep-navy)" }}>
                            {m.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                            {m.city && <span>{m.city}</span>}
                            {m.start_at && (
                              <span>{new Date(m.start_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
                            )}
                          </div>
                        </div>
                        {m.is_closed && (
                          <span className="shrink-0 inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium" style={{ background: "var(--border-soft)", color: "var(--text-muted)" }}>
                            Closed
                          </span>
                        )}
                        <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatRelative(m.created_at)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* About Tab */}
          {tab === "about" && (
            <section className="b-card b-animate-in">
              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.email")}</div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <Mail className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                    {email ?? t("profile.notSet")}
                  </div>
                </div>

                {bio && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.bio")}</div>
                    <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{bio}</div>
                  </div>
                )}

                {residenceCountry && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.residenceCountry")}</div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <MapPin className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      {countryName(residenceCountry, "en")}
                    </div>
                  </div>
                )}

                {originCountry && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.originCountry")}</div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <MapPin className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                      {countryName(originCountry, "en")}
                    </div>
                  </div>
                )}

                {languages.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>{t("profile.languages")}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {languages.map((lang) => (
                        <span key={lang} className="inline-flex h-7 items-center rounded-full px-3 text-xs font-medium" style={{ background: "var(--light-blue)", color: "var(--primary)" }}>
                          {langLabel(lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && meId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQR(false)}
        >
          <div
            className="relative mx-4 w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQR(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: "var(--deep-navy)" }}>{displayName}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{t("profile.scanToView")}</div>
            </div>

            <div className="mt-4 flex justify-center">
              <QRCodeSVG
                value={typeof window !== "undefined" ? `${window.location.origin}/u/${meId}` : `/u/${meId}`}
                size={192}
                bgColor="#ffffff"
                fgColor="#1E2A38"
                level="M"
                className="rounded-xl"
              />
            </div>

            <div className="mt-4 text-center text-xs break-all" style={{ color: "var(--text-muted)" }}>
              {typeof window !== "undefined" ? `${window.location.origin}/u/${meId}` : `/u/${meId}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
