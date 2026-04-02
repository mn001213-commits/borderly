import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
      global: {
        headers: {
          "x-client-info": "borderly-web@1.0.0",
        },
      },
    }
  );
}

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();

    // Proactive refresh: 50분마다 토큰 갱신 (만료 10분 전)
    if (typeof window !== "undefined") {
      setInterval(async () => {
        try {
          const { data: { session } } = await supabaseInstance!.auth.getSession();
          if (session) {
            const { error } = await supabaseInstance!.auth.refreshSession();
            if (error) {
              console.warn("[Auth] Token refresh failed:", error.message);
            } else {
              console.log("[Auth] Token refreshed proactively");
            }
          }
        } catch (err) {
          console.error("[Auth] Refresh interval error:", err);
        }
      }, 50 * 60 * 1000); // 50분
    }
  }

  return supabaseInstance;
})();
