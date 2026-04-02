"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AuthUser = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
} | null;

const AuthContext = createContext<{
  user: AuthUser;
  loading: boolean;
  needsOnboarding: boolean;
}>({ user: null, loading: true, needsOnboarding: false });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

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
        .select("display_name, avatar_url, residence_country, origin_country, languages, use_purpose")
        .eq("id", authUser.id)
        .maybeSingle();

      if (alive) {
        // Check if profile is complete
        const profileComplete = prof &&
          prof.display_name &&
          prof.residence_country &&
          prof.origin_country &&
          prof.languages && Array.isArray(prof.languages) && prof.languages.length > 0 &&
          prof.use_purpose;

        setNeedsOnboarding(!profileComplete);
        setUser({
          id: authUser.id,
          displayName: prof?.display_name ?? authUser.email ?? null,
          avatarUrl: prof?.avatar_url ?? null,
        });
        setLoading(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Event: ${event}`, session?.user?.id);

        if (event === "TOKEN_REFRESHED") {
          console.log("[Auth] Token refreshed successfully");
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
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, needsOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}
