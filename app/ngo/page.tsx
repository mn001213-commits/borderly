"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type NGOPost = {
  id: string;
  title: string;
  one_line: string;
  location: string;
  website: string | null;
  description: string;
  owner_user_id: string;
  created_at: string;
};

export default function NGOPage() {
  const [posts, setPosts] = useState<NGOPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNGOUser, setIsNGOUser] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      const userId = user?.id;

      if (userId) {
        const { data: ngoRow } = await supabase
          .from("ngo_accounts")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (ngoRow) {
          setIsNGOUser(true);
        }
      }

      const { data } = await supabase
        .from("ngo_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!alive) return;

      setPosts(data || []);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xl font-bold">Support Organizations</div>

            <div className="mt-2 text-sm text-gray-500">
              Find trusted organizations that provide help with jobs, housing,
              daily life, education, and other support.
            </div>
          </div>

          {isNGOUser && (
            <div className="flex gap-2.5">
              <Link
                href="/ngo/applications"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
              >
                View Applications
              </Link>

              <Link
                href="/ngo/new"
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
              >
                Create NGO Post
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-lg font-bold">
              No NGO posts yet
            </div>

            <div className="mt-2 text-sm text-gray-500">
              Once an NGO account creates a post, it will appear here.
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/ngo/${post.id}`}
                className="no-underline text-inherit"
              >
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="text-lg font-bold">
                    {post.title}
                  </div>

                  <div className="mt-1.5 text-sm text-gray-500">
                    {post.one_line}
                  </div>

                  <div className="mt-2.5 text-xs text-gray-500">
                    📍 {post.location}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
