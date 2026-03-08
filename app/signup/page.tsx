"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getCountryList, countryName } from "@/lib/countries";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid rgba(0,0,0,0.15)",
        background: active ? "rgba(0,0,0,0.08)" : "white",
        borderRadius: 999,
        padding: "8px 12px",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function CountrySelect({
  value,
  onChange,
  lang = "ko",
}: {
  value: string;
  onChange: (code: string) => void;
  lang?: "ko" | "en";
}) {
  const all = useMemo(() => getCountryList(lang), [lang]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return all.slice(0, 50);
    return all.filter((c) => c.name.toLowerCase().includes(t)).slice(0, 120);
  }, [q, all]);

  const selectedName = countryName(value, lang);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>국가</div>

      <input
        value={open ? q : selectedName}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQ("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder="국가 검색 (예: 한국, Japan, Indonesia...)"
        style={{
          width: "100%",
          border: "1px solid rgba(0,0,0,0.15)",
          borderRadius: 12,
          padding: "10px 12px",
          outline: "none",
        }}
      />

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 50,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            maxHeight: 260,
            overflow: "auto",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 12,
            background: "white",
            boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, opacity: 0.7 }}>검색 결과 없음</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: c.code === value ? "rgba(0,0,0,0.06)" : "white",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                {c.name} <span style={{ opacity: 0.5 }}>({c.code})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const LANGS = [
  { key: "ko", label: "한국어 (ko)" },
  { key: "ja", label: "日本語 (ja)" },
  { key: "en", label: "English (en)" },
  { key: "id", label: "Bahasa Indonesia (id)" },
  { key: "zh", label: "中文 (zh)" },
  { key: "es", label: "Español (es)" },
  { key: "ar", label: "العربية (ar)" },
  { key: "fr", label: "Français (fr)" },
] as const;

// ✅ 사회 속성(역할) - 단일 선택 추천
const SOCIAL = [
  { key: "worker", label: "사회인" },
  { key: "job_seeker", label: "구직자" },
  { key: "student", label: "학생" },
  { key: "homemaker", label: "주부" },
  { key: "freelancer", label: "프리랜서" },
  { key: "self_employed", label: "자영업" },
  { key: "retired", label: "은퇴" },
  { key: "other", label: "기타" },
] as const;

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [displayName, setDisplayName] = useState("");

  // ✅ 선택형 프로필(가입 때)
  const [countryCode, setCountryCode] = useState("KR");
  const [languages, setLanguages] = useState<string[]>(["ko"]);
  const [socialStatus, setSocialStatus] = useState<(typeof SOCIAL)[number]["key"]>("worker");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      email.trim().length > 3 &&
      pw.length >= 6 &&
      displayName.trim().length >= 1 &&
      countryCode.trim().length === 2 &&
      languages.length >= 1 &&
      !!socialStatus
    );
  }, [email, pw, displayName, countryCode, languages, socialStatus]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const onSignup = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setErrorMsg(null);
    setOkMsg(null);

    // 1) auth 가입
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
      options: {
        data: { display_name: displayName.trim() },
      },
    });

    if (error) {
      setBusy(false);
      setErrorMsg(error.message);
      return;
    }

    const uid = data.user?.id;
    if (!uid) {
      setBusy(false);
      setErrorMsg("회원가입은 되었지만 사용자 정보를 가져오지 못했어요.");
      return;
    }

    // 2) profiles 저장 (선택형: country_code/languages/social_status)
    const { error: pErr } = await supabase.from("profiles").upsert(
      {
        id: uid,
        display_name: displayName.trim(),
        country_code: countryCode,
        languages,
        social_status: socialStatus,
      },
      { onConflict: "id" }
    );

    if (pErr) {
      setBusy(false);
      setErrorMsg(pErr.message);
      return;
    }

    setBusy(false);
    setOkMsg("가입 완료! 이동 중...");

    // 필요하면 원하는 경로로 바꿔도 됨
    router.push("/");
  };

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>회원가입</h1>
        <Link href="/" style={{ fontSize: 14, opacity: 0.8 }}>
          홈
        </Link>
      </header>

      {errorMsg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.05)",
            fontSize: 13,
          }}
        >
          {errorMsg}
        </div>
      )}

      {okMsg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(0,0,0,0.03)",
            fontSize: 13,
          }}
        >
          {okMsg}
        </div>
      )}

      <section style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>이메일</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            disabled={busy}
            style={{
              width: "100%",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 12,
              padding: "10px 12px",
              outline: "none",
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>비밀번호</div>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="6자 이상"
            disabled={busy}
            style={{
              width: "100%",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 12,
              padding: "10px 12px",
              outline: "none",
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>표시 이름</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="예: borderly_user"
            disabled={busy}
            style={{
              width: "100%",
              border: "1px solid rgba(0,0,0,0.15)",
              borderRadius: 12,
              padding: "10px 12px",
              outline: "none",
            }}
          />
        </div>

        <CountrySelect value={countryCode} onChange={setCountryCode} lang="ko" />

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>사용 언어 (1개 이상)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LANGS.map((l) => (
              <Chip
                key={l.key}
                active={languages.includes(l.key)}
                onClick={() => setLanguages((prev) => toggle(prev, l.key))}
              >
                {l.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>사회 속성</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SOCIAL.map((s) => (
              <Chip key={s.key} active={socialStatus === s.key} onClick={() => setSocialStatus(s.key)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={onSignup}
          style={{
            marginTop: 6,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.15)",
            background: busy ? "rgba(0,0,0,0.06)" : "white",
            fontWeight: 900,
            cursor: !canSubmit || busy ? "not-allowed" : "pointer",
          }}
        >
          가입하기
        </button>

        <div style={{ fontSize: 13, opacity: 0.75 }}>
          이미 계정이 있으면 <Link href="/login">로그인</Link>
        </div>
      </section>
    </main>
  );
}