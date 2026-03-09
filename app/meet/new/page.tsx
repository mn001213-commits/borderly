"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type MeetType =
  | "hangout"
  | "study"
  | "language"
  | "meal"
  | "sports";

// Storage bucket name (matches current setup)
const BUCKET = "post-images";

export default function NewMeetPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<MeetType>("hangout");
  const [sport, setSport] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [placeHint, setPlaceHint] = useState("");
  const [startAt, setStartAt] = useState("");
  const [maxPeople, setMaxPeople] = useState("");

  // Cover image
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Title and description are required.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in first.");
        return;
      }

      // Upload cover image (optional)
      let image_url: string | null = null;

      if (coverFile) {
        const ext = coverFile.name.split(".").pop() || "jpg";
        const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `meet/covers/${user.id}_${Date.now()}.${safeExt}`;

        const up = await supabase.storage.from(BUCKET).upload(path, coverFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: coverFile.type || "image/jpeg",
        });

        if (up.error) {
          alert(up.error.message);
          return;
        }

        // Use publicUrl for public buckets
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        image_url = data?.publicUrl ?? null;
      }

      // 1) Create meet_posts (get id back)
      const { data: createdMeet, error: e1 } = await supabase
        .from("meet_posts")
        .insert({
          host_id: user.id,
          type,
          sport: type === "sports" ? sport : null,
          title: title.trim(),
          description: description.trim(),
          city: city.trim() || null,
          place_hint: placeHint.trim() || null,
          start_at: startAt ? new Date(startAt).toISOString() : null,
          max_people: maxPeople ? Number(maxPeople) : null,
          image_url,
        })
        .select("id")
        .single();

      if (e1 || !createdMeet) {
        alert(e1?.message || "Failed to create meetup");
        return;
      }

      const meetId = createdMeet.id as string;

      // 2) Create conversation (prevents FK issues)
      // If your conversations table columns differ, adjust the insert columns here
      const { data: conv, error: eConv } = await supabase
        .from("conversations")
        .insert({
          type: "group",
          name: title.trim(),
          created_by: user.id,
        })
        .select("id")
        .single();

      if (eConv || !conv) {
        alert(eConv?.message || "Failed to create conversation");
        return;
      }

      const conversationId = conv.id as string;

      // 3) group_conversations upsert (prevent 409 Conflict)
      const { error: e2 } = await supabase
        .from("group_conversations")
        .upsert(
          { meet_id: meetId, conversation_id: conversationId },
          { onConflict: "meet_id" }
        );

      if (e2) {
        alert(e2.message || "Failed to map group chat");
        return;
      }

      // 4) Add host to conversation_members
      const { error: e3 } = await supabase.from("conversation_members").upsert(
        [{ conversation_id: conversationId, user_id: user.id }],
        { onConflict: "conversation_id,user_id" }
      );

      if (e3) {
        alert(e3.message);
        return;
      }

      router.push(`/meet/${meetId}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="text-xl font-bold mb-4">Create a Meetup</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Meetup Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MeetType)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="hangout">Hangout</option>
            <option value="study">Study</option>
            <option value="language">Language Exchange</option>
            <option value="meal">Meal Buddy</option>
            <option value="sports">Sports</option>
          </select>
        </div>

        {type === "sports" && (
          <div>
            <label className="block text-sm font-medium mb-1">Sport</label>
            <input
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="e.g. Soccer, Basketball, Running"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 h-32"
            maxLength={4000}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">City (optional)</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Seoul, Tokyo"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Place Hint (optional)</label>
          <input
            value={placeHint}
            onChange={(e) => setPlaceHint(e.target.value)}
            placeholder="e.g. Near Hongdae"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium mb-1">Cover Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;

              if (coverPreview) URL.revokeObjectURL(coverPreview);

              setCoverFile(f);

              if (f) setCoverPreview(URL.createObjectURL(f));
              else setCoverPreview(null);
            }}
            className="w-full border rounded-lg px-3 py-2 bg-white"
          />

          {coverPreview ? (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="preview"
                className="h-40 w-full rounded-2xl border object-cover"
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date/Time (optional)</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max People (optional)</label>
          <input
            type="number"
            value={maxPeople}
            onChange={(e) => setMaxPeople(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            min={2}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:opacity-90"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </form>
    </div>
  );
}