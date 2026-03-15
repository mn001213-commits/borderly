"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/app/components/LangProvider";

type Profile = {
  id: string;
  display_name: string | null;
};

type DirectConversation = {
  conversation_id: string;
  user_low: string;
  user_high: string;
  created_at: string;
};

export default function NewChatPage() {
  const router = useRouter();
  const { t } = useT();

  const [me, setMe] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1) Check auth + load initial user list
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;

      if (!uid) {
        router.push("/login");
        return;
      }

      setMe(uid);

      // Load recent 20 users
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .neq("id", uid)
        .order("id", { ascending: false })
        .limit(20);

      if (error) setErrorMsg(error.message);
      setProfiles((data as Profile[] | null) ?? []);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return profiles;

    return profiles.filter((p) => {
      const name = (p.display_name ?? "").toLowerCase();
      const id8 = p.id.slice(0, 8).toLowerCase();
      return name.includes(term) || id8.includes(term);
    });
  }, [profiles, q]);

  const refreshSearch = async () => {
    if (!me) return;

    setLoading(true);
    setErrorMsg(null);

    // Search by display_name (ilike)
    const term = q.trim();
    if (!term) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .neq("id", me)
        .order("id", { ascending: false })
        .limit(20);

      if (error) setErrorMsg(error.message);
      setProfiles((data as Profile[] | null) ?? []);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .neq("id", me)
      .ilike("display_name", `%${term}%`)
      .limit(30);

    if (error) setErrorMsg(error.message);
    setProfiles((data as Profile[] | null) ?? []);
    setLoading(false);
  };

  const getOrCreateConversation = async (otherId: string) => {
    if (!me) return;

    setErrorMsg(null);

    const userLow = me < otherId ? me : otherId;
    const userHigh = me < otherId ? otherId : me;

    // 1) Find existing 1:1 conversation
    const { data: existing, error: findErr } = await supabase
      .from("direct_conversations")
      .select("conversation_id, user_low, user_high, created_at")
      .eq("user_low", userLow)
      .eq("user_high", userHigh)
      .maybeSingle();

    if (findErr) {
      setErrorMsg(findErr.message);
      return;
    }

    let conversationId = (existing as DirectConversation | null)?.conversation_id ?? null;

    // 2) Create new if not found
    if (!conversationId) {
      conversationId = crypto.randomUUID();

      const { error: insErr } = await supabase.from("direct_conversations").insert({
        conversation_id: conversationId,
        user_low: userLow,
        user_high: userHigh,
      });

      if (insErr) {
        setErrorMsg(insErr.message);
        return;
      }
    }

    // 3) Upsert conversation_members
    const { error: memErr } = await supabase.from("conversation_members").upsert(
      [
        { conversation_id: conversationId, user_id: me, last_read_at: new Date().toISOString() },
        { conversation_id: conversationId, user_id: otherId, last_read_at: null },
      ],
      { onConflict: "conversation_id,user_id" }
    );

    if (memErr) {
      // Duplicate insert may fail but conversation is already created
      console.warn(memErr);
    }

    // 4) Navigate to chat room
    router.push(`/chats/${conversationId}`);
  };

  if (!me) return <div className="p-4 text-sm text-gray-500">{t("common.loading")}</div>;

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/chats")}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
          >
            ← {t("common.back")}
          </button>
          <h2 className="text-xl font-bold">{t("chat.newChat")}</h2>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("chat.searchByName")}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") refreshSearch();
            }}
          />
          <button
            onClick={refreshSearch}
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            {t("common.search")}
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="text-sm text-gray-500">{t("common.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-500">{t("chat.noResults")}</div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold">
                    {p.display_name ?? t("chat.unnamed")}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    @{p.id.slice(0, 8)}...
                  </div>
                </div>

                <button
                  onClick={() => getOrCreateConversation(p.id)}
                  className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  {t("chat.chat")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
