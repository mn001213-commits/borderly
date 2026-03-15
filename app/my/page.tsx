"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getFollowerCount, getFollowingCount } from "@/lib/followService";
import { useT } from "@/app/components/LangProvider";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
};

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function MyPostsPage() {
  const { t } = useT();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      const { data: u, error: uErr } = await supabase.auth.getUser();
      if (uErr) {
        setMsg(uErr.message);
        setLoading(false);
        return;
      }

      const myId = u.user?.id;
      if (!myId) {
        router.replace("/login");
        return;
      }

      // Follower/following counts
      const fc = await getFollowerCount(myId);
      const fg = await getFollowingCount(myId);
      setFollowers(fc);
      setFollowing(fg);

      // My posts
      const { data, error } = await supabase
        .from("posts")
        .select("id,created_at,title,content,author_name")
        .eq("user_id", myId)
        .order("created_at", { ascending: false });

      if (error) {
        setMsg(error.message);
        setPosts([]);
        setLoading(false);
        return;
      }

      setPosts((data ?? []) as Post[]);
      setLoading(false);
    };

    load();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
          >
            ← {t("nav.home")}
          </Link>

          <h1 className="text-xl font-bold">{t("myPage.myPosts")}</h1>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/my/followers"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
          >
            {t("profile.followers")}
          </Link>
          <Link
            href="/my/following"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
          >
            {t("profile.following")}
          </Link>
          <Link
            href="/notifications"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
          >
            {t("myPage.notifications")}
          </Link>
        </div>

        {/* Counts */}
        <div className="mt-3 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-gray-500">
          <div>
            {t("profile.followers")} <b className="text-gray-900">{followers}</b>
          </div>
          <div>
            {t("profile.following")} <b className="text-gray-900">{following}</b>
          </div>
        </div>

        {loading && (
          <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-gray-500">
            {t("common.loading")}
          </div>
        )}

        {msg && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {msg}
          </div>
        )}

        {/* List */}
        <div className="mt-3 grid gap-3">
          {!loading && posts.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-gray-500">
              {t("myPage.noPosts")}
              <div className="mt-3">
                <Link
                  href="/create"
                  className="inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
                >
                  {t("myPage.writeFirstPost")}
                </Link>
              </div>
            </div>
          )}

          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/posts/${p.id}`}
              className="no-underline text-inherit"
            >
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex justify-between gap-3">
                  <div className="text-base font-bold">{p.title}</div>
                  <div className="whitespace-nowrap text-xs text-gray-400">
                    {formatRelative(p.created_at)}
                  </div>
                </div>

                <div className="mt-2.5 leading-relaxed text-gray-500">
                  {p.content.length > 160 ? p.content.slice(0, 160) + "..." : p.content}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
