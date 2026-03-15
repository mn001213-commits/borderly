"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { unblockUser } from "@/lib/blockService";
import { ArrowLeft, User, ShieldOff } from "lucide-react";
import { useT } from "@/app/components/LangProvider";

type BlockedUser = {
  id: string;
  blocked_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function BlockedUsersPage() {
  const { t } = useT();
  const router = useRouter();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      // Get blocked user IDs
      const { data: blocks } = await supabase
        .from("blocks")
        .select("id, blocked_id")
        .eq("blocker_id", user.id);

      if (blocks && blocks.length > 0) {
        const blockedIds = blocks.map((b: any) => b.blocked_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", blockedIds);

        const result = blocks.map((b: any) => {
          const prof = (profiles ?? []).find((p: any) => p.id === b.blocked_id);
          return {
            id: b.id,
            blocked_id: b.blocked_id,
            display_name: prof?.display_name ?? null,
            avatar_url: prof?.avatar_url ?? null,
          };
        });
        setUsers(result);
      }
      setLoading(false);
    })();
  }, [router]);

  const handleUnblock = async (blockId: string, blockedId: string) => {
    setBusy(blockId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await unblockUser(user.id, blockedId);
        setUsers(prev => prev.filter(u => u.id !== blockId));
      }
    } catch {}
    setBusy(null);
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--deep-navy)" }}>
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:opacity-70" style={{ background: "var(--light-blue)" }}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">{t("blocked.title")}</h1>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="b-skeleton h-16" />)}</div>
        ) : users.length === 0 ? (
          <div className="b-card b-animate-in flex flex-col items-center justify-center px-6 py-12 text-center">
            <ShieldOff className="mb-3 h-10 w-10" style={{ color: "var(--border-soft)" }} />
            <div className="text-sm font-semibold">{t("blocked.empty")}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{t("blocked.emptyDesc")}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u, idx) => (
              <div key={u.id} className="b-card b-animate-in p-4 flex items-center gap-3" style={{ animationDelay: `${idx * 0.04}s` }}>
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full" style={{ background: "var(--light-blue)", border: "2px solid var(--border-soft)" }}>
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/u/${u.blocked_id}`} className="truncate text-sm font-semibold no-underline" style={{ color: "var(--deep-navy)" }}>
                    {u.display_name ?? t("userProfile.user")}
                  </Link>
                </div>
                <button
                  onClick={() => handleUnblock(u.id, u.blocked_id)}
                  disabled={busy === u.id}
                  className="inline-flex h-9 items-center gap-1.5 rounded-2xl px-4 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: "#E53935" }}
                >
                  {t("blocked.unblock")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
