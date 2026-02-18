"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const e2 = email.trim();
    const p2 = password.trim();

    if (!e2 || !p2) {
      setMsg("이메일/비밀번호를 입력해줘.");
      return;
    }

    setLoading(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: e2,
        password: p2,
      });
      setLoading(false);

      if (error) {
        setMsg(error.message);
        return;
      }

      setMsg("회원가입 완료. 로그인해줘.");
      setMode("login");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: e2,
      password: p2,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div style={{ maxWidth: 520, margin: "50px auto", padding: 16 }}>
      <Link href="/" style={{ textDecoration: "none" }}>
        ← 홈으로
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 900, marginTop: 14 }}>
        {mode === "login" ? "로그인" : "회원가입"}
      </h1>

      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          type="email"
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
          style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}
        />

        {msg && <div style={{ color: "#b00020" }}>{msg}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #111",
            background: loading ? "#ddd" : "#111",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "회원가입으로 전환" : "로그인으로 전환"}
        </button>
      </form>
    </div>
  );
}
