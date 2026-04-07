"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, User, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type LikerProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  postId: string;
  t: (key: string) => string;
};

export default function LikersModal({ open, onClose, postId, t }: Props) {
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !postId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const { data: likesData, error: likesErr } = await supabase
        .from("post_likes")
        .select("user_id")
        .eq("post_id", postId);

      if (cancelled) return;

      if (likesErr) {
        setError(t("likes.error"));
        setLoading(false);
        return;
      }

      const userIds = (likesData ?? []).map((row) => row.user_id as string);

      if (userIds.length === 0) {
        setLikers([]);
        setLoading(false);
        return;
      }

      const { data: profilesData, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      if (cancelled) return;

      if (profilesErr) {
        setError(t("likes.error"));
      } else {
        setLikers(profilesData ?? []);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, postId, t]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="b-animate-in w-full max-w-md rounded-2xl p-6 flex flex-col"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-soft)",
          maxHeight: "70vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: "var(--light-blue)" }}
            >
              <Heart className="h-5 w-5" style={{ color: "var(--primary)" }} />
            </div>
            <div className="text-base font-bold" style={{ color: "var(--deep-navy)" }}>
              {t("likes.title")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 transition hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading && (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {t("common.loading")}
            </div>
          )}

          {!loading && error && (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {error}
            </div>
          )}

          {!loading && !error && likers.length === 0 && (
            <div
              className="py-8 text-center text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {t("likes.noLikes")}
            </div>
          )}

          {!loading && !error && likers.length > 0 && (
            <div className="space-y-1">
              {likers.map((liker) => (
                <Link
                  key={liker.id}
                  href={`/u/${liker.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-2xl p-3 transition no-underline text-inherit"
                  style={{ color: "inherit" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-elevated)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {liker.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={liker.avatar_url}
                      alt={liker.display_name ?? t("userProfile.user")}
                      className="h-11 w-11 rounded-full object-cover shrink-0"
                      style={{ border: "1px solid var(--border-soft)" }}
                    />
                  ) : (
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full shrink-0"
                      style={{
                        background: "var(--light-blue)",
                        border: "1px solid var(--border-soft)",
                      }}
                    >
                      <User className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                    </div>
                  )}
                  <div
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--deep-navy)" }}
                  >
                    {liker.display_name ?? t("userProfile.user")}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
