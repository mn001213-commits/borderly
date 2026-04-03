"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import { useAuth } from "./AuthProvider";
import { User, Users, Home, FileText, Search, CalendarHeart, MessageCircle, ShieldAlert, ShieldCheck, Globe, ChevronRight, Settings } from "lucide-react";
import { countryName } from "@/lib/countries";
import { useT } from "./LangProvider";

type FollowingProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  residence_country: string | null;
};

export default function OnlineSidebar() {
  const { t } = useT();

  const getPageInfo = (p: string) => {
    const map: Record<string, { titleKey: string; descKey: string }> = {
      "/": { titleKey: "pageInfo.browse.title", descKey: "pageInfo.browse.desc" },
      "/browse": { titleKey: "pageInfo.home.title", descKey: "pageInfo.home.desc" },
      "/meet": { titleKey: "pageInfo.meet.title", descKey: "pageInfo.meet.desc" },
      "/ngo": { titleKey: "pageInfo.ngo.title", descKey: "pageInfo.ngo.desc" },
      "/chats": { titleKey: "pageInfo.chats.title", descKey: "pageInfo.chats.desc" },
      "/profile": { titleKey: "pageInfo.profile.title", descKey: "pageInfo.profile.desc" },
      "/settings": { titleKey: "pageInfo.settings.title", descKey: "pageInfo.settings.desc" },
      "/create": { titleKey: "pageInfo.create.title", descKey: "pageInfo.create.desc" },
      "/notifications": { titleKey: "pageInfo.notifications.title", descKey: "pageInfo.notifications.desc" },
    };
    let keys = map[p];
    if (!keys) {
      if (p.startsWith("/posts/")) keys = { titleKey: "pageInfo.post.title", descKey: "pageInfo.post.desc" };
      else if (p.startsWith("/u/")) keys = { titleKey: "pageInfo.user.title", descKey: "pageInfo.user.desc" };
      else if (p.startsWith("/meet/")) keys = { titleKey: "pageInfo.meet.title", descKey: "pageInfo.meet.desc" };
      else if (p.startsWith("/ngo/")) keys = { titleKey: "pageInfo.ngo.title", descKey: "pageInfo.ngo.desc" };
      else if (p.startsWith("/chats/")) keys = { titleKey: "pageInfo.chats.title", descKey: "pageInfo.chats.desc" };
      else keys = { titleKey: "pageInfo.default.title", descKey: "pageInfo.default.desc" };
    }
    return { title: t(keys.titleKey), desc: t(keys.descKey) };
  };

  const pathname = usePathname();
  const { user: authUser } = useAuth();
  const myId = authUser?.id ?? null;
  const isAdmin = authUser?.role === "admin";
  const [following, setFollowing] = useState<FollowingProfile[]>([]);
  const [q, setQ] = useState("");
  const onlineUserIds = useOnlinePresence(myId);

  useEffect(() => {
    if (!myId) return;
    let alive = true;

    async function load() {
      // Get people I follow
      const { data: myFollowing } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", myId);

      if (!myFollowing || myFollowing.length === 0 || !alive) return;

      const myFollowingIds = myFollowing.map((r: any) => r.following_id).filter(Boolean);

      // Get people who follow me back (mutual followers)
      const { data: followingMeBack } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", myId)
        .in("follower_id", myFollowingIds);

      if (!followingMeBack || followingMeBack.length === 0 || !alive) return;

      const mutualIds = followingMeBack.map((r: any) => r.follower_id).filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, residence_country")
        .in("id", mutualIds);

      if (alive) {
        setFollowing((profiles ?? []) as FollowingProfile[]);
      }
    }

    load();

    return () => { alive = false; };
  }, [myId]);

  if (!myId) return null;

  const onlineCount = following.filter((f) => onlineUserIds.has(f.id)).length;

  const filtered = following.filter((f) => {
    if (!q.trim()) return true;
    return (f.display_name ?? "").toLowerCase().includes(q.trim().toLowerCase());
  });

  // Online first, then alphabetical within each group
  const sorted = [...filtered].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.id) ? 0 : 1;
    const bOnline = onlineUserIds.has(b.id) ? 0 : 1;
    if (aOnline !== bOnline) return aOnline - bOnline;
    return (a.display_name ?? "").localeCompare(b.display_name ?? "");
  });

  const pageInfo = getPageInfo(pathname);

  return (
    <aside
      className="hidden xl:flex fixed right-0 top-14 h-[calc(100vh-56px)] w-[340px] flex-col gap-5 p-5 pb-20 overflow-y-auto scrollbar-hide"
      style={{ background: "transparent" }}
    >
      {/* Page Info Card */}
      <div className="b-card p-5">
        <div className="text-sm font-bold mb-1.5" style={{ color: "var(--deep-navy)", letterSpacing: "-0.01em" }}>
          {pageInfo.title}
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {pageInfo.desc}
        </p>
      </div>

      {/* Connected Now */}
      <div className="b-card p-5 flex-1 min-h-[200px] flex flex-col">
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "var(--light-blue)" }}
          >
            <Globe className="h-4.5 w-4.5" style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--deep-navy)" }}>
              {t("sidebar.connectedNow")}
            </div>
            <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {onlineCount > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--primary)" }} />
                  <span className="font-medium" style={{ color: "var(--primary)" }}>{onlineCount} {t("sidebar.online")}</span>
                  <span>· {following.length} {t("sidebar.mutualFriends")}</span>
                </span>
              ) : (
                <span>{following.length} {t("sidebar.mutualFriends")}</span>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        {following.length > 3 && (
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("sidebar.searchFriends")}
                className="w-full rounded-xl py-2 pl-9 pr-3 text-xs outline-none"
                style={{
                  background: "var(--light-blue)",
                  border: "1px solid var(--border-soft)",
                  color: "var(--deep-navy)",
                }}
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: "var(--light-blue)" }}
              >
                <Users className="h-5 w-5" style={{ color: "var(--border-soft)" }} />
              </div>
              <div className="mt-2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                {following.length === 0 ? t("sidebar.noFriendsYet") : t("sidebar.noMatchingFriends")}
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                {following.length === 0
                  ? t("sidebar.followToConnect")
                  : t("sidebar.appearWhenActive")}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {sorted.map((f) => {
                const isOnline = onlineUserIds.has(f.id);
                return (
                  <Link
                    key={f.id}
                    href={`/chats/new?to=${f.id}`}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 no-underline text-inherit b-list-item"
                  >
                    <div className="relative shrink-0">
                      {f.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.avatar_url}
                          alt={f.display_name ?? "User"}
                          className="h-9 w-9 rounded-full object-cover"
                          style={{
                            border: isOnline ? "2px solid var(--primary)" : "2px solid var(--border-soft)",
                            opacity: isOnline ? 1 : 0.7,
                          }}
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{
                            background: "var(--light-blue)",
                            border: isOnline ? "2px solid var(--primary)" : "2px solid var(--border-soft)",
                            opacity: isOnline ? 1 : 0.7,
                          }}
                        >
                          <User className="h-4 w-4" style={{ color: "var(--primary)" }} />
                        </div>
                      )}
                      {/* Online: filled blue dot, Offline: empty circle */}
                      {isOnline ? (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                          style={{
                            background: "var(--primary)",
                            border: "2px solid var(--bg-card)",
                            boxShadow: "0 0 0 1px color-mix(in srgb, var(--primary) 30%, transparent)",
                          }}
                        />
                      ) : (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                          style={{
                            background: "var(--bg-card)",
                            border: "2px solid var(--border-soft)",
                          }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-xs ${isOnline ? "font-bold" : "font-normal"}`}
                        style={{ color: isOnline ? "var(--deep-navy)" : "var(--text-secondary)" }}
                      >
                        {f.display_name ?? "User"}
                      </div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {f.residence_country ? countryName(f.residence_country, "en") : (isOnline ? t("sidebar.online") : t("sidebar.offline"))}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Explore */}
      <div className="b-card p-5">
        <div className="text-sm font-bold mb-3" style={{ color: "var(--deep-navy)" }}>
          {t("sidebar.explore")}
        </div>
        <div className="space-y-1">
          {[
            { href: "/", icon: Home, label: t("sidebar.exploreAll") },
            { href: "/browse", icon: FileText, label: t("sidebar.communityFeed") },
            { href: "/meet", icon: CalendarHeart, label: t("sidebar.iceBreaking") },
            { href: "/chats", icon: MessageCircle, label: t("sidebar.chats") },
            { href: "/ngo", icon: ShieldCheck, label: t("sidebar.ngoDirectory") },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium no-underline b-list-item"
              style={{ color: pathname === item.href ? "var(--primary)" : "var(--text-secondary)" }}
            >
              <span className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            </Link>
          ))}

          <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <Link
              href="/settings"
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium no-underline b-list-item"
              style={{ color: pathname === "/settings" ? "var(--primary)" : "var(--text-secondary)" }}
            >
              <span className="flex items-center gap-2">
                <Settings className="h-3.5 w-3.5" />
                {t("common.settings")}
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            </Link>
            {isAdmin && (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Admin
                </div>
                <Link
                  href="/admin/reports"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium no-underline b-list-item"
                  style={{ color: pathname === "/admin/reports" ? "var(--primary)" : "var(--text-secondary)" }}
                >
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    신고 관리
                  </span>
                  <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </Link>
                <Link
                  href="/admin/ngo"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium no-underline b-list-item"
                  style={{ color: pathname === "/admin/ngo" ? "var(--primary)" : "var(--text-secondary)" }}
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    협력단체 승인
                  </span>
                  <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-2 text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Borderly © {new Date().getFullYear()} · Connecting beyond borders
      </div>
    </aside>
  );
}
