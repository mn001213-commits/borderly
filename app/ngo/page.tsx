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

  const bg = "#E0F2FE";
  const card = "rgba(255,255,255,0.92)";
  const line = "rgba(0,0,0,0.12)";
  const text = "#111827";
  const sub = "rgba(17,24,39,0.72)";

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
    <div style={{ minHeight: "100vh", background: bg, color: text }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px 60px" }}>
        <div
          style={{
            marginBottom: 18,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>Support Organizations</div>

            <div style={{ marginTop: 8, fontSize: 14, color: sub }}>
              Find trusted organizations that provide help with jobs, housing,
              daily life, education, and other support.
            </div>
          </div>

          {isNGOUser && (
            <div style={{ display: "flex", gap: 10 }}>
              <Link
                href="/ngo/applications"
                style={{
                  textDecoration: "none",
                  background: "#0F172A",
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: 14,
                  padding: "12px 16px",
                  borderRadius: 12,
                }}
              >
                View Applications
              </Link>

              <Link
                href="/ngo/new"
                style={{
                  textDecoration: "none",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  fontWeight: 900,
                  fontSize: 14,
                  padding: "12px 16px",
                  borderRadius: 12,
                }}
              >
                Create NGO Post
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : posts.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${line}`,
              background: card,
              padding: 22,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              No NGO posts yet
            </div>

            <div style={{ marginTop: 8, fontSize: 14, color: sub }}>
              Once an NGO account creates a post, it will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/ngo/${post.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${line}`,
                    background: card,
                    padding: 18,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900 }}>
                    {post.title}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 14, color: sub }}>
                    {post.one_line}
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: sub }}>
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