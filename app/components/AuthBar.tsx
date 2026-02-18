"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthBar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setEmail(data.user?.email ?? null);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      {email ? (
        <>
          <span style={{ fontSize: 13, color: "#555" }}>{email}</span>
          <button
            onClick={logout}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            로그아웃
          </button>
        </>
      ) : (
        <Link
          href="/login"
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid #111",
            textDecoration: "none",
            color: "#111",
          }}
        >
          로그인
        </Link>
      )}
    </div>
  );
}
