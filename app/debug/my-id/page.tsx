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
    <div style={{ minHeight: "100vh", padding: 24, background: "#F8FAFC", color: "#0F172A" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ fontSize: 28, fontWeight: 900 }}>My Account Info</div>

        {loading ? (
          <div style={{ marginTop: 16 }}>Loading...</div>
        ) : (
          <div
            style={{
              marginTop: 20,
              border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 16,
              background: "#FFFFFF",
              padding: 20,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>Email</div>
            <div style={{ marginTop: 6, fontSize: 14 }}>{email || "-"}</div>

            <div style={{ marginTop: 18, fontSize: 14, fontWeight: 800 }}>User ID</div>
            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                wordBreak: "break-all",
                padding: 12,
                borderRadius: 12,
                background: "#F1F5F9",
              }}
            >
              {userId || "Not logged in"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}