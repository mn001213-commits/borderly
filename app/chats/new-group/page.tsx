"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  createGroupConversation,
  searchUsers,
} from "@/lib/groupChatService";
import { useT } from "@/app/components/LangProvider";

type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function NewGroupPage() {
  const router = useRouter();
  const { t } = useT();

  const [meId, setMeId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setMeId(data.user?.id ?? null);
    });
  }, []);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q || !meId) return;

    setSearching(true);
    const excludeIds = [meId, ...selectedMembers.map((m) => m.id)];
    const results = await searchUsers(q, excludeIds);
    setSearchResults(results as UserProfile[]);
    setSearching(false);
  };

  const addMember = (user: UserProfile) => {
    if (selectedMembers.find((m) => m.id === user.id)) return;
    setSelectedMembers((prev) => [...prev, user]);
    setSearchResults((prev) => prev.filter((r) => r.id !== user.id));
  };

  const removeMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== userId));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError(t("chatGroup.nameRequired"));
      return;
    }
    if (selectedMembers.length === 0) {
      setError(t("chatGroup.addAtLeastOne"));
      return;
    }

    setCreating(true);
    setError(null);

    const memberIds = selectedMembers.map((m) => m.id);
    const conversationId = await createGroupConversation(
      groupName.trim(),
      memberIds
    );

    if (!conversationId) {
      setError(t("chatGroup.createFailed"));
      setCreating(false);
      return;
    }

    router.push(`/chats/${conversationId}`);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 backdrop-blur" style={{ borderBottom: "1px solid var(--border-soft)", background: "var(--bg-snow)" }}>
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/chats")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="text-base font-semibold tracking-tight">
                  {t("chatGroup.newGroupChat")}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {t("chatGroup.addMembersAndStart")}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 space-y-4">
          {/* Group Name */}
          <div className="b-card p-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--deep-navy)" }}>
              {t("chatGroup.groupName")}
            </label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("chatGroup.enterGroupName")}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)", color: "var(--deep-navy)" }}
              maxLength={100}
            />
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="b-card p-4">
              <div className="flex items-center gap-2 text-sm font-medium mb-3" style={{ color: "var(--deep-navy)" }}>
                <Users className="h-4 w-4" />
                {t("chatGroup.selected")} ({selectedMembers.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
                    style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--deep-navy)" }}>
                      {m.display_name ?? t("chat.user")}
                    </span>
                    <button
                      onClick={() => removeMember(m.id)}
                      style={{ color: "var(--text-muted)" }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div className="b-card p-4">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--deep-navy)" }}>
              {t("chatGroup.addMembers")}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}>
                <Search className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder={t("chat.searchByName")}
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: "var(--deep-navy)" }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium transition disabled:opacity-50"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)", color: "var(--text-secondary)" }}
              >
                {searching ? "..." : t("common.search")}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-60 overflow-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addMember(user)}
                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition"
                    style={{ background: "var(--light-blue)", border: "1px solid var(--border-soft)" }}
                  >
                    <div className="h-9 w-9 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-soft)" }}>
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {(user.display_name ?? "U")[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium" style={{ color: "var(--deep-navy)" }}>
                      {user.display_name ?? t("chat.user")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedMembers.length === 0}
            className="w-full inline-flex h-12 items-center justify-center rounded-2xl text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--primary)" }}
          >
            {creating ? t("chatGroup.creating") : t("chatGroup.createGroupChat")}
          </button>
        </div>
      </div>
    </div>
  );
}
