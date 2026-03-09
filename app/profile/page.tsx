"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getFollowerCount, getFollowingCount } from "@/lib/followService";
import { ArrowLeft, User, Users, Bell, FileText, Mail, LogOut, Settings, Trash2 } from "lucide-react";

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

  const [bio, setBio] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
        .select("display_name, avatar_url, bio")
        .eq("id", myId)
        .maybeSingle();

      setDisplayName(prof?.display_name ?? user?.email ?? "Unnamed User");
      setAvatarUrl(prof?.avatar_url ?? null);
      setBio(prof?.bio ?? null);

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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleDeletePost = async (postId: string) => {
    if (!meId) return;

    const ok = confirm("Are you sure you want to delete this post?");
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
  };

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <header className="flex items-center justify-between gap-3 py-3">
          <h1 className="text-xl font-bold">Profile</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "..." : "Log Out"}
            </button>
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
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Avatar"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-full object-cover ring-1 ring-gray-200"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                      <User className="h-7 w-7 text-gray-400" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-semibold text-gray-900">{displayName}</div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{email ?? "No email"}</span>
                    </div>

                    {bio && (
                      <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{bio}</div>
                    )}

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
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
            >
              <Users className="h-4 w-4" />
              Followers
            </Link>

            <Link
              href="/profile/following"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
            >
              <Users className="h-4 w-4" />
              Following
            </Link>

            <Link
              href="/notifications"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
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
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-[#F0F7FF] px-6 py-12 text-center">
                  <FileText className="mb-3 h-10 w-10 text-gray-300" />
                  <div className="text-sm font-semibold text-gray-800">No posts yet</div>
                  <div className="mt-1 text-sm text-gray-500">
                    Share your first post with the community.
                  </div>
                  <Link
                    href="/create"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:opacity-90"
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

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="whitespace-nowrap text-xs text-gray-400">
                              {formatRelative(p.created_at)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeletePost(p.id);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete post"
                              title="Delete post"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
