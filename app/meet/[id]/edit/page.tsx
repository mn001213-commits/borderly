"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type MeetType =
  | "hangout"
  | "study"
  | "skill"
  | "language"
  | "meal"
  | "party"
  | "project"
  | "sports";

const BUCKET = "post-images";

export default function EditMeetPage() {
  const params = useParams();
  const router = useRouter();

  const meetId = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<MeetType>("hangout");
  const [sport, setSport] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [placeHint, setPlaceHint] = useState("");
  const [startAt, setStartAt] = useState("");
  const [maxPeople, setMaxPeople] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Cover image
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  useEffect(() => {
    if (!meetId) return;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/meet");
        return;
      }

      const { data: meet, error } = await supabase
        .from("meet_posts")
        .select("*")
        .eq("id", meetId)
        .maybeSingle();

      if (error || !meet) {
        router.push("/meet");
        return;
      }

      // Verify host
      if (meet.host_id !== user.id) {
        router.push("/meet");
        return;
      }

      setType(meet.type as MeetType);
      setSport(meet.sport ?? "");
      setTitle(meet.title ?? "");
      setDescription(meet.description ?? "");
      setCity(meet.city ?? "");
      setPlaceHint(meet.place_hint ?? "");
      setMaxPeople(meet.max_people != null ? String(meet.max_people) : "");
      setIsClosed(!!meet.is_closed);
      setExistingImageUrl(meet.image_url ?? null);

      // Format start_at for datetime-local input
      if (meet.start_at) {
        const d = new Date(meet.start_at);
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setStartAt(local);
      }

      setLoading(false);
    })();
  }, [meetId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert("Title and description are required.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Please log in first.");
        return;
      }

      // Upload new cover image if selected
      let image_url: string | null | undefined = undefined; // undefined = keep existing

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

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        image_url = data?.publicUrl ?? null;
      }

      const updatePayload: Record<string, unknown> = {
        type,
        sport: type === "sports" ? sport : null,
        title: title.trim(),
        description: description.trim(),
        city: city.trim() || null,
        place_hint: placeHint.trim() || null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        max_people: maxPeople ? Number(maxPeople) : null,
        is_closed: isClosed,
      };

      if (image_url !== undefined) {
        updatePayload.image_url = image_url;
      }

      const { error } = await supabase
        .from("meet_posts")
        .update(updatePayload)
        .eq("id", meetId);

      if (error) {
        alert(error.message);
        return;
      }

      router.push(`/meet/${meetId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="mx-auto max-w-xl p-4">
      <Link href={`/meet/${meetId}`} className="text-sm text-gray-500 hover:underline">
        ← Back to Meetup
      </Link>

      <h1 className="mt-4 text-xl font-bold mb-4">Edit Meetup</h1>

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
            <option value="skill">Skill Exchange</option>
            <option value="project">Team Recruit</option>
            <option value="party">Party</option>
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
          <label className="block text-sm font-medium mb-1">Cover Image</label>

          {existingImageUrl && !coverPreview && (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingImageUrl}
                alt="current cover"
                className="h-40 w-full rounded-2xl border object-cover"
              />
              <div className="mt-1 text-xs text-gray-500">Current cover image</div>
            </div>
          )}

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

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Closed</label>
          <button
            type="button"
            onClick={() => setIsClosed(!isClosed)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isClosed ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isClosed ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-xs text-gray-500">
            {isClosed ? "No new join requests" : "Open for requests"}
          </span>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
