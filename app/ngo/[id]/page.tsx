"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type NGOPost = {
  id: string;
  title: string;
  one_line: string;
  location: string;
  website: string | null;
  description: string;
  owner_user_id: string;
  created_at: string;
};

export default function NGODetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);

  const [ngo, setNgo] = useState<NGOPost | null>(null);
  const [loading, setLoading] = useState(true);

  const [situation, setSituation] = useState("");
  const [helpNeeded, setHelpNeeded] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const bg = "#E0F2FE";
  const card = "rgba(255,255,255,0.94)";
  const line = "rgba(0,0,0,0.12)";
  const text = "#111827";
  const sub = "rgba(17,24,39,0.72)";

  useEffect(() => {
    let alive = true;

    async function loadDetail() {
      try {
        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase
          .from("ngo_posts")
          .select("id,title,one_line,location,website,description,owner_user_id,created_at")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!alive) return;

        setNgo(data);
      } catch (err: any) {
        console.error(err);
        if (!alive) return;
        setNgo(null);
        setErrorMsg(err?.message || "Failed to load NGO post.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) loadDetail();

    return () => {
      alive = false;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (!ngo) {
      setErrorMsg("NGO information was not found.");
      return;
    }

    if (!situation.trim() || !helpNeeded.trim() || !country.trim() || !language.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (!ngo.owner_user_id) {
      setErrorMsg("NGO account is not connected yet.");
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        alert("Please log in first.");
        router.push("/login");
        return;
      }

      if (user.id === ngo.owner_user_id) {
        setErrorMsg("You cannot apply to your own NGO post.");
        return;
      }

      // 1) Find existing conversation
      const { data: existingRows, error: existingError } = await supabase
        .from("conversations")
        .select("id,user_one,user_two")
        .or(
          `and(user_one.eq.${user.id},user_two.eq.${ngo.owner_user_id}),and(user_one.eq.${ngo.owner_user_id},user_two.eq.${user.id})`
        )
        .limit(1);

      if (existingError) throw existingError;

      let conversationId: string | null = existingRows?.[0]?.id ?? null;

      // 2) Create conversation if not exists
      if (!conversationId) {
        const { data: insertedConversation, error: conversationInsertError } = await supabase
          .from("conversations")
          .insert({
            user_one: user.id,
            user_two: ngo.owner_user_id,
          })
          .select("id")
          .single();

        if (conversationInsertError) throw conversationInsertError;
        conversationId = insertedConversation.id;
      }

      if (!conversationId) {
        throw new Error("Conversation could not be created.");
      }

      // 3) Build first message
      const applicationBody = [
        "NGO Application",
        "",
        `Post: ${ngo.title}`,
        `Location: ${ngo.location}`,
        `Current situation: ${situation.trim()}`,
        `Help needed: ${helpNeeded.trim()}`,
        `Current country: ${country.trim()}`,
        `Preferred language: ${language.trim()}`,
      ].join("\n");

      // 4) Optional application row
      // If ngo_applications table is not ready yet, this block is ignored.
      try {
        await supabase.from("ngo_applications").insert({
          ngo_post_id: ngo.id,
          ngo_id: ngo.id,
          user_id: user.id,
          conversation_id: conversationId,
          situation: situation.trim(),
          help_needed: helpNeeded.trim(),
          country: country.trim(),
          language: language.trim(),
          status: "pending",
        });
      } catch (applicationErr) {
        console.error("ngo_applications insert skipped:", applicationErr);
      }

      // 5) First message
      const { error: firstMessageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        body: applicationBody,
        image_url: null,
      });

      if (firstMessageError) throw firstMessageError;

      // 6) Redirect to chat
      router.push(`/chat/${conversationId}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Something went wrong while creating the chat.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, padding: 20 }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 18,
              border: `1px solid ${line}`,
              background: card,
              padding: 22,
            }}
          >
            Loading NGO post...
          </div>
        </div>
      </div>
    );
  }

  if (!ngo) {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, padding: 20 }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ fontSize: 24, fontWeight: 900 }}>Organization not found</div>

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

          <Link
            href="/ngo"
            style={{
              display: "inline-block",
              marginTop: 16,
              color: "#2563EB",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            ← Back to NGO page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: text }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px 60px" }}>
        <Link
          href="/ngo"
          style={{
            display: "inline-block",
            marginBottom: 16,
            color: "#2563EB",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          ← Back
        </Link>

        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${line}`,
            background: card,
            padding: 22,
            boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900 }}>{ngo.title}</div>

          <div style={{ marginTop: 8, fontSize: 14, color: sub, lineHeight: 1.6 }}>
            {ngo.one_line}
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: sub }}>📍 {ngo.location}</div>

          {ngo.website && (
            <a
              href={ngo.website}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-block",
                marginTop: 12,
                color: "#2563EB",
                fontWeight: 800,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Visit website
            </a>
          )}

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Description</div>
            <div style={{ marginTop: 8, fontSize: 14, color: sub, lineHeight: 1.7 }}>
              {ngo.description}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Application Form</div>
            <div style={{ marginTop: 8, fontSize: 13, color: sub, lineHeight: 1.6 }}>
              Please share the information needed before starting the conversation.
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

            <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
                  Your current situation
                </div>
                <textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="Please briefly explain your current situation."
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: 12,
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                    background: "#FFFFFF",
                    color: text,
                  }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
                  What kind of help do you need?
                </div>
                <textarea
                  value={helpNeeded}
                  onChange={(e) => setHelpNeeded(e.target.value)}
                  placeholder="For example: job support, housing, daily life, legal help..."
                  rows={4}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: 12,
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                    background: "#FFFFFF",
                    color: text,
                  }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
                  Current country
                </div>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Japan"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: "0 12px",
                    fontSize: 14,
                    outline: "none",
                    background: "#FFFFFF",
                    color: text,
                  }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
                  Preferred language
                </div>
                <input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="English"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: "0 12px",
                    fontSize: 14,
                    outline: "none",
                    background: "#FFFFFF",
                    color: text,
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 18,
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "none",
                background: submitting ? "#93C5FD" : "#2563EB",
                color: "#FFFFFF",
                fontWeight: 900,
                fontSize: 14,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? "Creating chat..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}