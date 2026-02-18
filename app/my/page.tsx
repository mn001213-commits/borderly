"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Post = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
};

export default function MyPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMsg(null);

      const { data: u } = await supabase.auth.getUser();
      const myId = u.user?.id;

      if (!myId) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("id,created_at,title,content,author_name")
        .eq("user_id", myId)
        .order("created_at", { ascending: false });

      setLoading(false);

      if (error) {
        setMsg(error.message);
        return;
      }

      setPosts((data ?? []) as Post[]);
    };

    load();
  }, [router]);

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          ← 홈
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>내 글</h1>
      </div>

      {loading && <div>불러오는 중...</div>}
      {msg && <div style={{ color: "crimson" }}>{msg}</div>}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {posts.map((p) => (
          <Link key={p.id} href={`/posts/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ border: "1px solid #e5e5e5", borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{p.title}</div>
              <div style={{ marginTop: 10, color: "#333", lineHeight: 1.55 }}>
                {p.content.length > 120 ? p.content.slice(0, 120) + "..." : p.content}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          </Link>
        ))}

        {!loading && posts.length === 0 && <div style={{ color: "#666" }}>아직 내 글이 없어.</div>}
      </div>
    </div>
  );
}
