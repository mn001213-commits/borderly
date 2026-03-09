"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, HelpCircle } from "lucide-react";

type HelpCategory =
  | "housing"
  | "legal"
  | "medical"
  | "translation"
  | "daily"
  | "employment"
  | "other";

type Urgency = "low" | "medium" | "high" | "urgent";

function cx(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export default function NewHelpRequestPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<HelpCategory>("other");
  const [urgency, setUrgency] = useState<Urgency>("medium");
  const [city, setCity] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setUserId(data.user.id);
    });
  }, [router]);

  const handleSubmit = async () => {
    if (saving) return;
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Description is required.");
      return;
    }
    if (!userId) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    const { error } = await supabase.from("help_requests").insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      category,
      urgency,
      city: city.trim() || null,
      status: "open",
    });

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    router.push("/help");
  };

  const card = "rounded-2xl border border-gray-100 bg-white shadow-sm";
  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 transition";
  const selectClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-400 transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-[640px] px-4 pb-24 pt-4">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-[#F0F7FF]/90 backdrop-blur">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link
              href="/help"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <span className="text-lg font-semibold tracking-tight">New Help Request</span>
            </div>
          </div>
        </header>

        {/* Form */}
        <section className={cx(card, "mt-4 p-5")}>
          {errorMsg && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid gap-5">
            <div>
              <label htmlFor="title" className={labelClass}>
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Briefly describe what you need help with"
                className={inputClass}
                maxLength={200}
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about your situation and what kind of help you need..."
                className={cx(inputClass, "min-h-[140px] resize-y")}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className={labelClass}>
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as HelpCategory)}
                  className={selectClass}
                >
                  <option value="housing">Housing</option>
                  <option value="legal">Legal</option>
                  <option value="medical">Medical</option>
                  <option value="translation">Translation</option>
                  <option value="daily">Daily Life</option>
                  <option value="employment">Employment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="urgency" className={labelClass}>
                  Urgency
                </label>
                <select
                  id="urgency"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as Urgency)}
                  className={selectClass}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="city" className={labelClass}>
                City (optional)
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Seoul, Busan, Incheon"
                className={inputClass}
                maxLength={100}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Link
              href="/help"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-[#F0F7FF]"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
