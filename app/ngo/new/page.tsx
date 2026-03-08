"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function NewNGOPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [me, setMe] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [oneLine, setOneLine] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const bg = "#E0F2FE";
  const card = "rgba(255,255,255,0.94)";
  const line = "rgba(0,0,0,0.12)";
  const text = "#111827";
  const sub = "rgba(17,24,39,0.72)";

  useEffect(() => {
    let alive = true;

    async function checkAccess() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!alive) return;

        const userId = user?.id ?? null;
        setMe(userId);

        if (!userId) {
          router.replace("/login");
          return;
        }

        const { data: ngoRow, error: ngoError } = await supabase
          .from("ngo_accounts")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (ngoError) throw ngoError;
        if (!alive) return;

        setAllowed(!!ngoRow);
      } catch (err: any) {
        console.error(err);
        if (!alive) return;
        setErrorMsg(err?.message || "Failed to check NGO account.");
      } finally {
        if (!alive) return;
        setChecking(false);
      }
    }

    checkAccess();

    return () => {
      alive = false;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (!me) {
      setErrorMsg("Please log in first.");
      return;
    }

    if (!allowed) {
      setErrorMsg("Only NGO accounts can create NGO posts.");
      return;
    }

    if (!title.trim() || !oneLine.trim() || !location.trim() || !description.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("ngo_posts").insert({
        owner_user_id: me,
        title: title.trim(),
        one_line: oneLine.trim(),
        location: location.trim(),
        website: website.trim() || null,
        description: description.trim(),
      });

      if (error) throw error;

      router.push("/ngo");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Failed to create NGO post.");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, padding: 20 }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>Checking access...</div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div style={{ minHeight: "100vh", background: bg, color: text, padding: 20 }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 18,
              background: card,
              border: `1px solid ${line}`,
              padding: 22,
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900 }}>Access denied</div>
            <div style={{ marginTop: 8, fontSize: 14, color: sub, lineHeight: 1.6 }}>
              Only designated NGO accounts can create NGO posts.
            </div>

            <Link
              href="/ngo"
              style={{
                display: "inline-block",
                marginTop: 18,
                textDecoration: "none",
                color: "#2563EB",
                fontWeight: 800,
              }}
            >
              ← Back to NGO page
            </Link>
          </div>
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
            textDecoration: "none",
            color: "#2563EB",
            fontWeight: 800,
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
          <div style={{ fontSize: 28, fontWeight: 900 }}>Create NGO Post</div>
          <div style={{ marginTop: 8, fontSize: 14, color: sub, lineHeight: 1.6 }}>
            Create a support post that residents can apply to.
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

          <form onSubmit={handleSubmit} style={{ marginTop: 18 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>Title</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Job support for residents in Kyoto"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: "0 12px",
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: text,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
                  One-line summary
                </div>
                <input
                  value={oneLine}
                  onChange={(e) => setOneLine(e.target.value)}
                  placeholder="Consultation, daily life support, and job guidance"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: "0 12px",
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: text,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>Location</div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kyoto"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: "0 12px",
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: text,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
                  Website
                </div>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.org"
                  style={{
                    width: "100%",
                    height: 44,
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: "0 12px",
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: text,
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <div style={{ marginBottom: 6, fontSize: 13, fontWeight: 800 }}>
                  Description
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what kind of support your organization can provide."
                  rows={6}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: `1px solid ${line}`,
                    padding: 12,
                    fontSize: 14,
                    background: "#FFFFFF",
                    color: text,
                    outline: "none",
                    resize: "vertical",
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
              {submitting ? "Creating..." : "Create NGO Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}