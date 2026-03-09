"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type NGOApplicationRow = {
  id: string;
  ngo_post_id: string;
  user_id: string;
  conversation_id: string | null;
  situation: string;
  help_needed: string;
  country: string;
  language: string;
  status: string;
  created_at: string;
  ngo_posts: {
    id: string;
    title: string;
    location: string;
    owner_user_id: string;
  } | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function NGOApplicationsPage() {
  const router = useRouter();

  const [me, setMe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState<NGOApplicationRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const applicantIds = useMemo(() => {
    return Array.from(new Set(items.map((item) => item.user_id).filter(Boolean)));
  }, [items]);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErrorMsg("");

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/login");
          return;
        }

        if (!alive) return;
        setMe(user.id);

        const { data, error } = await supabase
          .from("ngo_applications")
          .select(`
            id,
            ngo_post_id,
            user_id,
            conversation_id,
            situation,
            help_needed,
            country,
            language,
            status,
            created_at,
            ngo_posts:ngo_post_id (
              id,
              title,
              location,
              owner_user_id
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!alive) return;

        const rows = (data ?? []).filter(
          (row: any) => {
            const ngo = Array.isArray(row.ngo_posts) ? row.ngo_posts[0] : row.ngo_posts;
            return ngo?.owner_user_id === user.id;
          }
        ) as unknown as NGOApplicationRow[];

        setItems(rows);
      } catch (err: any) {
        console.error(err);
        if (!alive) return;
        setErrorMsg(err?.message || "Failed to load applications.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    let alive = true;

    async function loadProfiles() {
      if (applicantIds.length === 0) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", applicantIds);

      if (error) {
        console.error(error);
        return;
      }

      if (!alive) return;

      const nextMap: Record<string, ProfileRow> = {};
      for (const row of data ?? []) {
        nextMap[row.id] = row;
      }
      setProfiles(nextMap);
    }

    loadProfiles();

    return () => {
      alive = false;
    };
  }, [applicantIds]);

  async function updateStatus(
    applicationId: string,
    nextStatus: "pending" | "accepted" | "rejected"
  ) {
    try {
      setUpdatingId(applicationId);
      setErrorMsg("");

      const { error } = await supabase
        .from("ngo_applications")
        .update({ status: nextStatus })
        .eq("id", applicationId);

      if (error) throw error;

      setItems((prev) =>
        prev.map((item) =>
          item.id === applicationId ? { ...item, status: nextStatus } : item
        )
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to update application status.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/ngo"
              className="mb-3 inline-block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
            >
              ← Back
            </Link>

            <div className="text-xl font-bold">NGO Applications</div>
            <div className="mt-2 text-sm leading-relaxed text-gray-500">
              Review applications submitted to your NGO posts.
            </div>
          </div>

          {!!me && (
            <Link
              href="/ngo/new"
              className="self-start rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
            >
              Create NGO Post
            </Link>
          )}
        </div>

        {!!errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-lg font-bold">No applications yet</div>
            <div className="mt-2 text-sm leading-relaxed text-gray-500">
              Applications submitted to your NGO posts will appear here.
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-3.5">
            {items.map((item) => {
              const profile = profiles[item.user_id];
              const displayName = profile?.display_name?.trim() || "Unknown user";

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold">
                        {item.ngo_posts?.title || "Untitled NGO Post"}
                      </div>
                      <div className="mt-1.5 text-xs text-gray-500">
                        Applicant: {displayName}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Submitted: {formatDateTime(item.created_at)}
                      </div>
                    </div>

                    <div
                      className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${
                        item.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : item.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {item.status}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Current situation</div>
                      <div className="mt-1.5 text-sm leading-relaxed text-gray-500">
                        {item.situation}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700">Help needed</div>
                      <div className="mt-1.5 text-sm leading-relaxed text-gray-500">
                        {item.help_needed}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <div>
                        <span className="font-bold text-gray-900">Country:</span> {item.country}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900">Language:</span> {item.language}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900">Location:</span>{" "}
                        {item.ngo_posts?.location || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "accepted")}
                      disabled={updatingId === item.id}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "rejected")}
                      disabled={updatingId === item.id}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "pending")}
                      disabled={updatingId === item.id}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF] disabled:opacity-50 disabled:cursor-default"
                    >
                      Reset to Pending
                    </button>

                    {item.conversation_id && (
                      <Link
                        href={`/chat/${item.conversation_id}`}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:opacity-90"
                      >
                        Open Chat
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
