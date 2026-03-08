"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { countryName } from "@/lib/countries";

type User = {
  id: string;
  display_name: string | null;
  country_code: string | null;
  languages: string[] | null;
  social_status: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [country, setCountry] = useState("");
  const [social, setSocial] = useState("");

  useEffect(() => {
    load();
  }, [country, social]);

  const load = async () => {
    let q = supabase
      .from("profiles")
      .select("id, display_name, country_code, languages, social_status");

    if (country) q = q.eq("country_code", country);
    if (social) q = q.eq("social_status", social);

    const { data } = await q.limit(50);
    setUsers((data as User[]) ?? []);
  };

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>사용자 찾기</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <input
          placeholder="국가 코드 (KR, JP...)"
          value={country}
          onChange={(e) => setCountry(e.target.value.toUpperCase())}
        />

        <select value={social} onChange={(e) => setSocial(e.target.value)}>
          <option value="">전체</option>
          <option value="worker">사회인</option>
          <option value="job_seeker">구직자</option>
          <option value="student">학생</option>
          <option value="homemaker">주부</option>
          <option value="freelancer">프리랜서</option>
        </select>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/u/${u.id}`}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontWeight: 800 }}>{u.display_name}</div>
            <div style={{ opacity: 0.7 }}>
              {countryName(u.country_code, "ko")} · {u.social_status}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}