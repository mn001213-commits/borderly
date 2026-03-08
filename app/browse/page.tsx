"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

type PostRow = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  author_name: string | null;
  category: string;
};

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

export default function BrowsePage() {
  const [activeCat, setActiveCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cats = useMemo(
    () => [
      { id: "all", label: "전체" },
      { id: "general", label: "자유" },
      { id: "skill", label: "재능기부" },
      { id: "ngo", label: "NGO" },
      { id: "legal", label: "비자/법률" },
      { id: "etc", label: "기타" },
    ],
    []
  );

  const catBadge = useMemo(() => {
    const map: Record<string, string> = {
      general: "자유",
      skill: "재능기부",
      ngo: "NGO",
      legal: "비자/법률",
      etc: "기타",
    };
    return (k: string) => map[k] ?? k;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      let query = supabase
        .from("posts")
        .select("id, created_at, title, content, author_name, category")
        .order("created_at", { ascending: false })
        .limit(50);

      if (activeCat !== "all") query = query.eq("category", activeCat);

      // 간단 검색: title 기준 like (원하면 content까지 확장 가능)
      const keyword = q.trim();
      if (keyword) query = query.ilike("title", `%${keyword}%`);

      const { data, error } = await query;

      if (error) {
        setErrorMsg(error.message);
        setPosts([]);
        setLoading(false);
        return;
      }

      setPosts((data ?? []) as PostRow[]);
      setLoading(false);
    };

    load();
  }, [activeCat, q]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-sky-50 to-emerald-50 text-neutral-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-xl border bg-white px-3 py-2 text-sm font-bold hover:bg-neutral-50">
              ← 홈
            </Link>
            <div className="text-lg font-black">둘러보기</div>
          </div>
          <Link href="/create" className="rounded-xl border bg-white px-3 py-2 text-sm font-bold hover:bg-neutral-50">
            + 새 글
          </Link>
        </header>

        <section className="mt-6 rounded-[28px] border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const on = c.id === activeCat;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCat(c.id)}
                    className={cx(
                      "rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                      on ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white hover:bg-sky-50"
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="제목 검색"
              className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none md:w-72"
            />
          </div>
        </section>

        <section className="mt-5 space-y-4">
          {errorMsg && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600 shadow-sm">불러오는 중...</div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-neutral-600 shadow-sm">결과가 없어요.</div>
          ) : (
            posts.map((p) => (
              <Link
                key={p.id}
                href={`/posts/${p.id}`}
                className="block rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm hover:bg-neutral-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-lg font-extrabold">{p.title}</div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        {catBadge(p.category)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] text-neutral-500">
                      <span>{p.author_name ?? "익명"}</span>
                      <span>•</span>
                      <span>{formatRelative(p.created_at)}</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs font-bold text-neutral-500">자세히 보기 →</div>
                </div>

                <div className="mt-3 line-clamp-2 text-sm text-neutral-600">{p.content}</div>
              </Link>
            ))
          )}
        </section>
      </div>
    </div>
  );
}