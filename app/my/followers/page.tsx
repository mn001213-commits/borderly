"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getFollowers } from "@/lib/followService";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowersPage() {
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const myId = auth.user?.id;
      if (!myId) {
        setItems([]);
        setLoading(false);
        return;
      }

      const followerRows = await getFollowers(myId);
      const ids = followerRows.map((r: any) => r.follower_id).filter(Boolean);

      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);

      setItems((profs ?? []) as Profile[]);
      setLoading(false);
    };
    run();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>팔로워</h2>
      {loading ? (
        <div>로딩중...</div>
      ) : items.length === 0 ? (
        <div>아직 팔로워가 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((p) => (
            <Link key={p.id} href={`/u/${p.id}`} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: "#f3f4f6", overflow: "hidden" }}>
                {p.avatar_url ? <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
              </div>
              <div style={{ fontWeight: 600 }}>{p.display_name ?? "이름 없음"}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
