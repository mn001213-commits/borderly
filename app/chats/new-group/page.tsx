"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Users } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  createGroupConversation,
  searchUsers,
} from "@/lib/groupChatService";

type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function NewGroupPage() {
  const router = useRouter();

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
      setError("Group name is required.");
      return;
    }
    if (selectedMembers.length === 0) {
      setError("Add at least one member.");
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
      setError("Failed to create group chat.");
      setCreating(false);
      return;
    }

    router.push(`/chats/${conversationId}`);
  };

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-[#F0F7FF]/90 backdrop-blur">
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/chats")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="text-base font-semibold tracking-tight">
                  New Group Chat
                </div>
                <div className="text-xs text-gray-500">
                  Add members and start chatting
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-4 space-y-4">
          {/* Group Name */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Group Name
            </label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full rounded-xl border border-gray-200 bg-[#F0F7FF] px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
              maxLength={100}
            />
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-3">
                <Users className="h-4 w-4" />
                Selected ({selectedMembers.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((m) => (
                  <div
                    key={m.id}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-[#F0F7FF] px-3 py-1.5"
                  >
                    <span className="text-sm text-gray-800">
                      {m.display_name ?? "User"}
                    </span>
                    <button
                      onClick={() => removeMember(m.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Users */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Add Members
            </label>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-[#F0F7FF] px-3 py-2.5">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Search by name..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF] disabled:opacity-50"
              >
                {searching ? "..." : "Search"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2 max-h-60 overflow-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addMember(user)}
                    className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-[#F0F7FF] p-3 text-left transition hover:bg-white"
                  >
                    <div className="h-9 w-9 rounded-full border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {(user.display_name ?? "U")[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.display_name ?? "User"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !groupName.trim() || selectedMembers.length === 0}
            className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Group Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}
