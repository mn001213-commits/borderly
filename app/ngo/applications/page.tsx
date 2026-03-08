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

  const bg = "#E0F2FE";
  const card = "rgba(255,255,255,0.94)";
  const line = "rgba(0,0,0,0.12)";
  const text = "#111827";
  const sub = "rgba(17,24,39,0.72)";

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
          (row: NGOApplicationRow) => row.ngo_posts?.owner_user_id === user.id
        );

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
      <div style={{ minHeight: "100vh", background: bg, color: text, padding: 20 }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 18,
              border: `1px solid ${line}`,
              background: card,
              padding: 22,
            }}
          >
            Loading applications...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "18px 14px 60px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Link
              href="/ngo"
              style={{
                display: "inline-block",
                marginBottom: 12,
                color: "#2563EB",
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              ← Back
            </Link>

            <div style={{ fontSize: 28, fontWeight: 900 }}>NGO Applications</div>
            <div style={{ marginTop: 8, fontSize: 14, color: sub, lineHeight: 1.6 }}>
              Review applications submitted to your NGO posts.
            </div>
          </div>

          {!!me && (
            <Link
              href="/ngo/new"
              style={{
                alignSelf: "flex-start",
                textDecoration: "none",
                background: "#2563EB",
                color: "#FFFFFF",
                fontWeight: 900,
                fontSize: 14,
                padding: "12px 16px",
                borderRadius: 12,
              }}
            >
              Create NGO Post
            </Link>
          )}
        </div>

        {!!errorMsg && (
          <div
            style={{
              marginTop: 16,
              borderRadius: 12,
              padding: "12px 14px",
              background: "#FEE2E2",
              color: "#991B1B",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {errorMsg}
          </div>
        )}

        {items.length === 0 ? (
          <div
            style={{
              marginTop: 18,
              borderRadius: 18,
              border: `1px solid ${line}`,
              background: card,
              padding: 22,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>No applications yet</div>
            <div style={{ marginTop: 8, fontSize: 14, color: sub, lineHeight: 1.6 }}>
              Applications submitted to your NGO posts will appear here.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
            {items.map((item) => {
              const profile = profiles[item.user_id];
              const displayName = profile?.display_name?.trim() || "Unknown user";

              return (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 18,
                    border: `1px solid ${line}`,
                    background: card,
                    padding: 20,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>
                        {item.ngo_posts?.title || "Untitled NGO Post"}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, color: sub }}>
                        Applicant: {displayName}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: sub }}>
                        Submitted: {formatDateTime(item.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        background:
                          item.status === "accepted"
                            ? "#DCFCE7"
                            : item.status === "rejected"
                            ? "#FEE2E2"
                            : "#DBEAFE",
                        color:
                          item.status === "accepted"
                            ? "#166534"
                            : item.status === "rejected"
                            ? "#991B1B"
                            : "#1D4ED8",
                        fontSize: 13,
                        fontWeight: 900,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.status}
                    </div>
                  </div>

                  <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900 }}>Current situation</div>
                      <div style={{ marginTop: 6, fontSize: 14, color: sub, lineHeight: 1.7 }}>
                        {item.situation}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 13, fontWeight: 900 }}>Help needed</div>
                      <div style={{ marginTop: 6, fontSize: 14, color: sub, lineHeight: 1.7 }}>
                        {item.help_needed}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 13, color: sub }}>
                        <span style={{ fontWeight: 900, color: text }}>Country:</span> {item.country}
                      </div>
                      <div style={{ fontSize: 13, color: sub }}>
                        <span style={{ fontWeight: 900, color: text }}>Language:</span> {item.language}
                      </div>
                      <div style={{ fontSize: 13, color: sub }}>
                        <span style={{ fontWeight: 900, color: text }}>Location:</span>{" "}
                        {item.ngo_posts?.location || "-"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 18,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "accepted")}
                      disabled={updatingId === item.id}
                      style={{
                        border: "none",
                        background: "#16A34A",
                        color: "#FFFFFF",
                        fontWeight: 900,
                        fontSize: 13,
                        padding: "10px 14px",
                        borderRadius: 10,
                        cursor: updatingId === item.id ? "default" : "pointer",
                      }}
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "rejected")}
                      disabled={updatingId === item.id}
                      style={{
                        border: "none",
                        background: "#DC2626",
                        color: "#FFFFFF",
                        fontWeight: 900,
                        fontSize: 13,
                        padding: "10px 14px",
                        borderRadius: 10,
                        cursor: updatingId === item.id ? "default" : "pointer",
                      }}
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(item.id, "pending")}
                      disabled={updatingId === item.id}
                      style={{
                        border: `1px solid ${line}`,
                        background: "#FFFFFF",
                        color: text,
                        fontWeight: 900,
                        fontSize: 13,
                        padding: "10px 14px",
                        borderRadius: 10,
                        cursor: updatingId === item.id ? "default" : "pointer",
                      }}
                    >
                      Reset to Pending
                    </button>

                    {item.conversation_id && (
                      <Link
                        href={`/chat/${item.conversation_id}`}
                        style={{
                          textDecoration: "none",
                          background: "#2563EB",
                          color: "#FFFFFF",
                          fontWeight: 900,
                          fontSize: 13,
                          padding: "10px 14px",
                          borderRadius: 10,
                        }}
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