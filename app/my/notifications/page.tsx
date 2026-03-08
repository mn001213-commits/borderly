"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Noti = {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  created_at: string;
  is_read: boolean;
};

type Profile = {
  id: string;
  display_name: string | null;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Noti[]>([]);
  const [actors, setActors] = useState<Record<string, Profile>>({});
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

      const { data: notis } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", myId)
        .order("created_at", { ascending: false })
        .limit(50);

      const list = (notis ?? []) as Noti[];
      setItems(list);

      const actorIds = Array.from(new Set(list.map((n) => n.actor_id).filter(Boolean)));
      if (actorIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", actorIds);

        const map: Record<string, Profile> = {};
        (profs ?? []).forEach((p: any) => {
          map[p.id] = p;
        });
        setActors(map);
      }

      setLoading(false);
    };
    run();
  }, []);

  const readOne = async (id: string) => {
    const { data: auth } = await supabase.auth.getUser();
    const myId = auth.user?.id;
    if (!myId) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", myId);

    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>알림</h2>
      {loading ? (
        <div>로딩중...</div>
      ) : items.length === 0 ? (
        <div>알림이 없습니다.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((n) => {
            const actor = actors[n.actor_id];
            const name = actor?.display_name ?? "누군가";
            const text = n.type === "follow" ? `${name} 님이 팔로우했습니다.` : `${name} 알림`;
            return (
              <div key={n.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, opacity: n.is_read ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{text}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(n.created_at).toLocaleString()}</div>
                    {n.actor_id ? <Link href={`/u/${n.actor_id}`} style={{ fontSize: 12, textDecoration: "underline" }}>프로필 보기</Link> : null}
                  </div>
                  {!n.is_read ? (
                    <button onClick={() => readOne(n.id)} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "6px 10px" }}>
                      읽음
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
