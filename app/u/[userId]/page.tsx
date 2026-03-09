"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { countryName } from "@/lib/countries";
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowerCount,
  getFollowingCount,
} from "@/lib/followService";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  languages: string[] | null;
  social_status: string | null;
  website: string | null;
  bio: string | null;
};

const SOCIAL = [
  { key: "worker", label: "Employee" },
  { key: "job_seeker", label: "Job seeker" },
  { key: "student", label: "Student" },
  { key: "homemaker", label: "Homemaker" },
  { key: "freelancer", label: "Freelancer" },
  { key: "self_employed", label: "Self-employed" },
  { key: "retired", label: "Retired" },
  { key: "other", label: "Other" },
] as const;

function socialLabel(key: string | null | undefined) {
  return SOCIAL.find((s) => s.key === key)?.label ?? (key ?? "");
}

export default function UserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const router = useRouter();

  const [p, setP] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [me, setMe] = useState<string | null>(null);

  const [isFollowed, setIsFollowed] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const myId = me;
  const profileId = p?.id ?? userId;

  const displayCountry = useMemo(() => {
    return countryName(p?.country_code, "ko");
  }, [p?.country_code]);

  const loadFollowData = async () => {
    if (!profileId) return;

    // Follower/following counts are visible without login
    const followerCount = await getFollowerCount(profileId);
    const followingCount = await getFollowingCount(profileId);
    setFollowers(followerCount);
    setFollowing(followingCount);

    // Follow status requires login
    if (!myId) {
      setIsFollowed(false);
      return;
    }

    // Cannot follow your own profile
    if (myId === profileId) {
      setIsFollowed(false);
      return;
    }

    const followState = await isFollowing(myId, profileId);
    setIsFollowed(followState);
  };

  useEffect(() => {
    if (!userId) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data: authData } = await supabase.auth.getUser();
      setMe(authData.user?.id ?? null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, country_code, languages, social_status, website, bio")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setP(data as Profile);
      setLoading(false);
    })();
  }, [userId]);

  useEffect(() => {
    loadFollowData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, profileId]);

  const handleFollowToggle = async () => {
    if (!profileId) return;

    // Redirect to login
    if (!myId) {
      router.push("/login");
      return;
    }

    // Cannot follow yourself
    if (myId === profileId) return;

    setErrorMsg(null);

    try {
      if (isFollowed) {
        const { error } = await unfollowUser(myId, profileId);
        if (error) throw error;
      } else {
        const { error } = await followUser(myId, profileId);
        if (error) throw error;
      }

      await loadFollowData();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "An error occurred.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6 pb-24">Loading...</div>
      </div>
    );
  if (errorMsg)
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6 pb-24">{errorMsg}</div>
      </div>
    );
  if (!p)
    return (
      <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
        <div className="mx-auto max-w-2xl px-4 py-6 pb-24">User not found.</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F0F7FF] text-gray-900">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <button
          onClick={() => router.back()}
          className="mb-4 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF]"
        >
          ← Back
        </button>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-gray-200 grid place-items-center text-2xl font-bold">
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar_url}
                  alt={p.display_name ?? "user"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{(p.display_name?.[0] ?? "?").toUpperCase()}</span>
              )}
            </div>

            <div>
              <div className="text-xl font-bold">{p.display_name ?? "No name"}</div>

              <div className="mt-1 text-sm text-gray-500">
                {displayCountry ? `${displayCountry}` : ""}
                {p.social_status ? ` · ${socialLabel(p.social_status)}` : ""}
              </div>

              {p.bio && (
                <div className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">{p.bio}</div>
              )}

              <div className="mt-1.5 text-sm text-gray-500">
                <div>Followers {followers}</div>
                <div>Following {following}</div>
              </div>
            </div>
          </div>

          {myId !== profileId && (
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={handleFollowToggle}
                className={
                  isFollowed
                    ? "rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#F0F7FF] cursor-pointer"
                    : "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 cursor-pointer"
                }
              >
                {isFollowed ? "Unfollow" : "Follow"}
              </button>

              <Link
                href={`/chats?user=${p.id}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 no-underline hover:bg-[#F0F7FF]"
              >
                Send message
              </Link>
            </div>
          )}

          {p.languages && p.languages.length > 0 && (
            <div className="mt-5">
              <div className="text-xs text-gray-400">Languages</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.languages.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full bg-gray-100 px-3 py-1.5 text-xs"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}

          {p.website && (
            <div className="mt-5">
              <div className="text-xs text-gray-400">Website</div>
              <a
                href={p.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 block text-sm font-medium text-gray-900 hover:underline"
              >
                {p.website}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
