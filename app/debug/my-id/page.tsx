"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function MyIdPage() {
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      setUserId(user?.id ?? "");
      setEmail(user?.email ?? "");
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
        <div className="text-xl font-bold">My Account Info</div>

        {loading ? (
          <div className="mt-4 text-gray-500">Loading...</div>
        ) : (
          <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-gray-800">Email</div>
            <div className="mt-1.5 text-sm">{email || "-"}</div>

            <div className="mt-4 text-sm font-semibold text-gray-800">User ID</div>
            <div className="mt-1.5 break-all rounded-xl bg-[#F0F7FF] p-3 text-sm">
              {userId || "Not logged in"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
