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
};

const SOCIAL = [
  { key: "worker", label: "직장인" },
  { key: "job_seeker", label: "구직중" },
  { key: "student", label: "학생" },
  { key: "homemaker", label: "주부" },
  { key: "freelancer", label: "프리랜서" },
  { key: "self_employed", label: "자영업" },
  { key: "retired", label: "은퇴" },
  { key: "other", label: "기타" },
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

    // ✅ 팔로워/팔로잉은 로그인 없어도 보여줄 수 있음
    const followerCount = await getFollowerCount(profileId);
    const followingCount = await getFollowingCount(profileId);
    setFollowers(followerCount);
    setFollowing(followingCount);

    // ✅ 팔로우 여부는 로그인 필요
    if (!myId) {
      setIsFollowed(false);
      return;
    }

    // ✅ 내 프로필이면 팔로우 상태는 false로 고정
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
        .select("id, display_name, avatar_url, country_code, languages, social_status, website")
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

    // ✅ 로그인 유도
    if (!myId) {
      router.push("/login");
      return;
    }

    // ✅ 내 자신은 팔로우 불가
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
      setErrorMsg(e?.message ?? "처리 중 오류가 발생했습니다.");
    }
  };

  if (loading) return <div style={{ padding: 20 }}>로딩중...</div>;
  if (errorMsg) return <div style={{ padding: 20 }}>{errorMsg}</div>;
  if (!p) return <div style={{ padding: 20 }}>사용자를 찾을 수 없습니다.</div>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <button onClick={() => router.back()} style={{ marginBottom: 16 }}>
        뒤로
      </button>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 16,
          padding: 20,
          background: "white",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 20,
              overflow: "hidden",
              background: "rgba(0,0,0,0.05)",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              fontSize: 28,
            }}
          >
            {p.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.avatar_url}
                alt={p.display_name ?? "user"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>{(p.display_name?.[0] ?? "?").toUpperCase()}</span>
            )}
          </div>

          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{p.display_name ?? "이름 없음"}</div>

            <div style={{ opacity: 0.75, marginTop: 4 }}>
              {displayCountry ? `${displayCountry}` : ""}
              {p.social_status ? ` · ${socialLabel(p.social_status)}` : ""}
            </div>

            <div style={{ opacity: 0.75, marginTop: 6 }}>
              <div>팔로워 {followers}</div>
              <div>팔로잉 {following}</div>
            </div>
          </div>
        </div>

        {myId !== profileId && (
          <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={handleFollowToggle}
              style={{
                display: "inline-block",
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                fontWeight: 700,
                background: "white",
                cursor: "pointer",
              }}
            >
              {isFollowed ? "언팔로우" : "팔로우"}
            </button>

            <Link
              href={`/chats?user=${p.id}`}
              style={{
                display: "inline-block",
                padding: "10px 16px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.15)",
                fontWeight: 700,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              채팅 보내기
            </Link>
          </div>
        )}

        {p.languages && p.languages.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, opacity: 0.6 }}>사용 언어</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.languages.map((lang) => (
                <span
                  key={lang}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.08)",
                    fontSize: 13,
                  }}
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>
        )}

        {p.website && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, opacity: 0.6 }}>웹사이트</div>
            <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 6 }}>
              {p.website}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}