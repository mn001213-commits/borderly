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
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold">Access denied</div>
            <div className="mt-2 text-sm leading-relaxed text-gray-500">
              Only designated NGO accounts can create NGO posts.
            </div>

            <Link
              href="/ngo"
              className="mt-4 inline-block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
            >
              ← Back to NGO page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <Link
          href="/ngo"
          className="mb-4 inline-block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
        >
          ← Back
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xl font-bold">Create NGO Post</div>
          <div className="mt-2 text-sm leading-relaxed text-gray-500">
            Create a support post that residents can apply to.
          </div>

          {!!errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="grid gap-3.5">
              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">Title</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Job support for residents in Kyoto"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">
                  One-line summary
                </div>
                <input
                  value={oneLine}
                  onChange={(e) => setOneLine(e.target.value)}
                  placeholder="Consultation, daily life support, and job guidance"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">Location</div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kyoto"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">
                  Website
                </div>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://example.org"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">
                  Description
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what kind of support your organization can provide."
                  rows={6}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none resize-y focus:border-gray-400 min-h-[120px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-default"
            >
              {submitting ? "Creating..." : "Create NGO Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
