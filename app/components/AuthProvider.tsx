"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthUser = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string | null;
  ngoVerified: boolean;
  guideTourCompleted: boolean;
} | null;

const AuthContext = createContext<{
  user: AuthUser;
  loading: boolean;
  needsOnboarding: boolean;
  completeOnboarding: () => void;
  completeGuideTour: () => void;
  refreshProfile: () => void;
}>({ user: null, loading: true, needsOnboarding: false, completeOnboarding: () => {}, completeGuideTour: () => {}, refreshProfile: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  function completeOnboarding() {
    setNeedsOnboarding(false);
  }

  function completeGuideTour() {
    setUser((prev) => prev ? { ...prev, guideTourCompleted: true } : prev);
    // Persist to Supabase user metadata so it's account-bound across devices
    supabase.auth.updateUser({ data: { guide_tour_completed: true } }).catch(() => {});
  }

  function refreshProfile() {
    setRefreshTick((n) => n + 1);
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!alive) return;

      if (!authUser) {
        setUser(null);
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, residence_country, origin_country, languages, use_purpose, role, ngo_verified, user_type, ngo_activity_countries")
        .eq("id", authUser.id)
        .maybeSingle();

      if (alive) {
        // Check if profile is complete
        const isNgo = prof?.user_type === "ngo";
        const hasCountry = isNgo
          ? (prof.ngo_activity_countries && Array.isArray(prof.ngo_activity_countries) && prof.ngo_activity_countries.length > 0)
          : (prof?.residence_country && prof?.origin_country);
        const profileComplete = prof &&
          prof.display_name &&
          hasCountry &&
          prof.languages && Array.isArray(prof.languages) && prof.languages.length > 0 &&
          prof.use_purpose;

        setNeedsOnboarding(!profileComplete);
        setUser({
          id: authUser.id,
          displayName: prof?.display_name ?? authUser.email ?? null,
          avatarUrl: prof?.avatar_url ?? null,
          role: prof?.role ?? null,
          ngoVerified: prof?.ngo_verified === true,
          guideTourCompleted: authUser.user_metadata?.guide_tour_completed === true,
        });
        setLoading(false);
      }
    }

    load();

    // Listen for manual profile refresh trigger from other pages
    const onRefresh = () => load();
    window.addEventListener("borderly-profile-updated", onRefresh);

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Auth] Event: ${event}`, session?.user?.id);
        }

        if (event === "TOKEN_REFRESHED") {
          // token refreshed silently
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setNeedsOnboarding(false);
          setLoading(false);
        } else if (event === "USER_UPDATED") {
          // 프로필 재로드
          load();
        } else {
          // SIGNED_IN, INITIAL_SESSION 등
          load();
        }
      }
    );

    return () => {
      alive = false;
      window.removeEventListener("borderly-profile-updated", onRefresh);
      sub.subscription.unsubscribe();
    };
  }, [refreshTick]);

  return (
    <AuthContext.Provider value={{ user, loading, needsOnboarding, completeOnboarding, completeGuideTour, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
