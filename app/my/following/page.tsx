"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getFollowing } from "@/lib/followService";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function FollowingPage() {
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

      const rows = await getFollowing(myId);
      const ids = rows.map((r: any) => r.following_id).filter(Boolean);

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
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <h2 className="text-xl font-bold mb-3">Following</h2>
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500">Not following anyone yet.</div>
        ) : (
          <div className="grid gap-3">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/u/${p.id}`}
                className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm no-underline text-inherit"
              >
                <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gray-200 overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="font-semibold">{p.display_name ?? "No name"}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
