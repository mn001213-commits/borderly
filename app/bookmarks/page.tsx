"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/app/components/LangProvider";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  MessageCircle,
} from "lucide-react";

const VIDEO_EXTS = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
function isVideoUrl(url: string) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTS.some((ext) => path.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

type Category = "info" | "question" | "daily" | "general" | "jobs" | "other";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  like_count: number;
  comment_count: number;
  image_url: string | null;
  category: Category | null;
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  general: { bg: "#E3F2FD", color: "#1565C0" },
  info: { bg: "#FFF3E0", color: "#EF6C00" },
  question: { bg: "#F3E5F5", color: "#8E24AA" },
  daily: { bg: "#E8F5E9", color: "#2E7D32" },
  jobs: { bg: "#FFF8E1", color: "#F57F17" },
  other: { bg: "#F5F5F5", color: "#616161" },
};

function getCatLabel(cat: string, tr?: (key: string) => string): string {
  if (!tr) {
    const map: Record<string, string> = { general: "General", info: "Info", question: "Question", daily: "Daily", jobs: "Jobs", other: "Other" };
    return map[cat] ?? "Other";
  }
  const keyMap: Record<string, string> = { general: "cat.general", info: "cat.info", question: "cat.question", daily: "cat.daily", jobs: "cat.jobs", other: "cat.other" };
  return tr(keyMap[cat] ?? "cat.other");
}

function formatRelative(iso: string, tr?: (key: string) => string) {
  const ts = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - ts);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}${tr ? tr("bookmarks.sAgo") : "s ago"}`;

  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}${tr ? tr("bookmarks.mAgo") : "m ago"}`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${tr ? tr("bookmarks.hAgo") : "h ago"}`;

  const day = Math.floor(hr / 24);
  return `${day}${tr ? tr("bookmarks.dAgo") : "d ago"}`;
}

export default function BookmarksPage() {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr || !u.user) {
        router.replace("/login");
        return;
      }

      const uid = u.user.id;

      // Fetch bookmark rows
      const { data: bookmarks } = await supabase
        .from("post_bookmarks")
        .select("post_id, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (!bookmarks || bookmarks.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = bookmarks.map((b) => b.post_id);

      // Fetch the actual posts
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, created_at, title, content, author_name, like_count, comment_count, image_url, category")
        .in("id", postIds)
        .eq("is_hidden", false);

      if (!postsData) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Reorder to match bookmark order
      const postMap = new Map(postsData.map((p) => [p.id, p]));
      const ordered = postIds
        .map((id) => postMap.get(id))
        .filter(Boolean) as Post[];

      setPosts(ordered);
      setLoading(false);
    };

    load();
  }, [router]);

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        {/* Header */}
        <header className="flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl transition hover:opacity-80"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
          </button>
          <h1 className="text-xl font-bold">{t("bookmarks.title")}</h1>
        </header>

        <div className="mt-4 space-y-4">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="b-skeleton h-48" />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div
              className="flex flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-16 text-center b-animate-in"
              style={{ borderColor: "var(--border-soft)", background: "var(--bg-card)" }}
            >
              <Bookmark className="mb-4 h-12 w-12" style={{ color: "var(--border-soft)" }} />
              <div className="text-sm font-semibold" style={{ color: "var(--deep-navy)" }}>
                {t("bookmarks.empty")}
              </div>
              <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("bookmarks.emptyDesc")}
              </div>
            </div>
          )}

          {/* Post cards */}
          {!loading && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((p, idx) => {
                const cat = (p.category ?? "general") as string;
                const catStyle = CAT_COLORS[cat] ?? CAT_COLORS.other;

                return (
                  <Link key={p.id} href={`/posts/${p.id}`} className="no-underline text-inherit">
                    <article
                      className="b-card b-card-hover b-animate-in p-5"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      {/* Author + time */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[13px] font-medium" style={{ color: "var(--text-secondary)" }}>
                          {p.author_name ?? t("bookmarks.anonymous")}
                        </span>
                        <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                          · {formatRelative(p.created_at, t)}
                        </span>
                      </div>

                      {/* Title */}
                      <h2
                        className="line-clamp-2 text-lg font-semibold leading-snug"
                        style={{ color: "var(--deep-navy)" }}
                      >
                        {p.title}
                      </h2>

                      {/* Category badge */}
                      <div className="mt-2.5">
                        <span
                          className="inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold"
                          style={{ background: catStyle.bg, color: catStyle.color }}
                        >
                          {getCatLabel(cat, t)}
                        </span>
                      </div>

                      {/* Content preview */}
                      <p
                        className="mt-3 line-clamp-3 text-[14px] leading-relaxed"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {p.content.length > 200 ? `${p.content.slice(0, 200)}...` : p.content}
                      </p>

                      {/* Media */}
                      {p.image_url && (
                        <div className="relative mt-4">
                          {isVideoUrl(p.image_url) ? (
                            <video
                              src={p.image_url}
                              controls
                              preload="metadata"
                              className="w-full rounded-2xl"
                              style={{ border: "1px solid var(--border-soft)" }}
                              onClick={(e) => e.preventDefault()}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image_url}
                              alt=""
                              className="w-full rounded-2xl"
                              style={{ border: "1px solid var(--border-soft)" }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-4 flex items-center gap-5">
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <Heart className="h-[18px] w-[18px]" />
                          <span className="text-[13px] font-medium">{p.like_count ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                          <MessageCircle className="h-[18px] w-[18px]" />
                          <span className="text-[13px] font-medium">{p.comment_count ?? 0}</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
