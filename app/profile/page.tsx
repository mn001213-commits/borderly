"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getFollowerCount, getFollowingCount } from "@/lib/followService";
import { ArrowLeft, User, Users, Bell, FileText, Mail } from "lucide-react";

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

  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [meId, setMeId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Unnamed User");
  const [email, setEmail] = useState<string | null>(null);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [posts, setPosts] = useState<Post[]>([]);

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

      const user = u.user;
      const myId = user?.id;

      if (!myId) {
        router.replace("/login");
        return;
      }

      setMeId(myId);
      setEmail(user?.email ?? null);

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", myId)
        .maybeSingle();

      setDisplayName(prof?.display_name ?? user?.email ?? "Unnamed User");

      const fc = await getFollowerCount(myId);
      const fg = await getFollowingCount(myId);
      setFollowers(fc);
      setFollowing(fg);

      const { data, error } = await supabase
        .from("posts")
        .select("id,created_at,title,content,author_name")
        .eq("user_id", myId)
        .order("created_at", { ascending: false })
        .limit(50);

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

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[980px] px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-gray-50/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-100">
                <User className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-semibold tracking-tight">Profile</div>
                <div className="text-xs text-gray-500">Your account and activity</div>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </header>

        <div className="mt-4 space-y-4">
          <section className={card}>
            {loading ? (
              <div className="p-5 text-sm text-gray-500">Loading...</div>
            ) : msg ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {msg}
              </div>
            ) : (
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                    <User className="h-7 w-7 text-gray-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-gray-900">{displayName}</div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{email ?? "No email"}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div>
                        Followers <span className="font-medium text-gray-900">{followers}</span>
                      </div>
                      <div>
                        Following <span className="font-medium text-gray-900">{following}</span>
                      </div>
                      <div>
                        Posts <span className="font-medium text-gray-900">{posts.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            <Link
              href="/profile/followers"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Users className="h-4 w-4" />
              Followers
            </Link>

            <Link
              href="/profile/following"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Users className="h-4 w-4" />
              Following
            </Link>

            <Link
              href="/profile/notifications"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </Link>
          </section>

          <section className={card}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <div className="text-base font-semibold text-gray-900">My Posts</div>
                {!loading && !msg ? (
                  <div className="mt-1 text-xs text-gray-500">{posts.length} total</div>
                ) : null}
              </div>
            </div>

            <div className="p-5">
              {!loading && !msg && posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                  <FileText className="mb-3 h-10 w-10 text-gray-300" />
                  <div className="text-sm font-semibold text-gray-800">No posts yet</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Share your first post with the community.
                  </div>
                  <Link
                    href="/create"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Create Post
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3">
                  {posts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/posts/${p.id}`}
                      className="block no-underline text-inherit"
                    >
                      <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="line-clamp-2 text-sm font-semibold leading-5 text-gray-900 sm:text-base">
                            {p.title}
                          </h2>

                          <div className="shrink-0 whitespace-nowrap text-xs text-gray-400">
                            {formatRelative(p.created_at)}
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">
                          {p.content.length > 160 ? `${p.content.slice(0, 160)}...` : p.content}
                        </p>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {!loading && !msg && (
            <div className="text-xs text-gray-400">user_id: {meId}</div>
          )}
        </div>
      </div>
    </div>
  );
}