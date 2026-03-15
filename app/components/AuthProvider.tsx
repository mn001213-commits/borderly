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
}>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!alive) return;

      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      if (alive) {
        setUser({
          id: authUser.id,
          displayName: prof?.display_name ?? authUser.email ?? null,
          avatarUrl: prof?.avatar_url ?? null,
        });
        setLoading(false);
      }
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
