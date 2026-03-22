"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/app/components/LangProvider";

type NGOPost = {
  id: string;
  title: string;
  one_line: string;
  location: string;
  website: string | null;
  description: string;
  owner_user_id: string;
};

export default function EditNGOPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id);
  const { t } = useT();

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [title, setTitle] = useState("");
  const [oneLine, setOneLine] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setChecking(true);
        setErrorMsg("");

        const [
          authResult,
          postResult,
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("ngo_posts")
            .select("id,title,one_line,location,website,description,owner_user_id")
            .eq("id", id)
            .single(),
        ]);

        if (!alive) return;

        const user = authResult.data.user ?? null;
        if (!user) {
          router.replace("/login");
          return;
        }

        if (postResult.error) throw postResult.error;

        const post = postResult.data;
        const isOwner = user.id === post.owner_user_id;

        setAllowed(isOwner);

        if (!isOwner) {
          setChecking(false);
          setLoading(false);
          return;
        }

        setTitle(post.title ?? "");
        setOneLine(post.one_line ?? "");
        setLocation(post.location ?? "");
        setWebsite(post.website ?? "");
        setDescription(post.description ?? "");
      } catch (err: any) {
        if (process.env.NODE_ENV === "development") console.error(err);
        if (!alive) return;
        setErrorMsg(err?.message || "Failed to load partner post.");
      } finally {
        if (!alive) return;
        setChecking(false);
        setLoading(false);
      }
    }

    if (id) load();

    return () => {
      alive = false;
    };
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    if (!allowed) {
      setErrorMsg(t("editNgo.onlyOwner"));
      return;
    }

    if (!title.trim() || !oneLine.trim() || !location.trim() || !description.trim()) {
      setErrorMsg(t("editNgo.fillRequired"));
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("ngo_posts")
        .update({
          title: title.trim(),
          one_line: oneLine.trim(),
          location: location.trim(),
          website: website.trim() || null,
          description: description.trim(),
        })
        .eq("id", id);

      if (error) throw error;

      router.push(`/ngo/${id}`);
    } catch (err: any) {
      if (process.env.NODE_ENV === "development") console.error(err);
      setErrorMsg(err?.message || "Failed to update partner post.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="text-sm text-gray-500">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="text-xl font-bold">{t("editNgo.accessDenied")}</div>
            <div className="mt-2 text-sm leading-relaxed text-gray-500">
              {t("editNgo.onlyOwner")}
            </div>

            <Link
              href={`/ngo/${id}`}
              className="mt-4 inline-block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
            >
              {`← ${t("editNgo.backToPost")}`}
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
          href={`/ngo/${id}`}
          className="mb-4 inline-block rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
        >
          {`← ${t("common.back")}`}
        </Link>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="text-xl font-bold">{t("editNgo.title")}</div>
          <div className="mt-2 text-sm leading-relaxed text-gray-500">
            {t("editNgo.subtitle")}
          </div>

          {!!errorMsg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="grid gap-3.5">
              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">{t("editNgo.titleLabel")}</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Job support for residents in Kyoto"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">
                  {t("editNgo.oneLineSummary")}
                </div>
                <input
                  value={oneLine}
                  onChange={(e) => setOneLine(e.target.value)}
                  placeholder="Consultation, daily life support, and job guidance"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">{t("editNgo.location")}</div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Kyoto"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <div className="mb-1.5 text-sm font-medium text-gray-700">
                  {t("editNgo.website")}
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
                  {t("editNgo.description")}
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
              {submitting ? t("editNgo.saving") : t("editNgo.saveChanges")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
