import { supabase } from "@/lib/supabaseClient";

const cache = new Map<string, string>();

export async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  const key = `${targetLang}::${text}`;

  const cached = cache.get(key);
  if (cached) return cached;

  // Get auth token for API authentication
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch("/api/translate", {
    method: "POST",
    headers,
    body: JSON.stringify({ text, targetLang }),
  });

  if (!res.ok) return text;

  const data = await res.json();
  const result = data.translatedText ?? text;

  cache.set(key, result);
  return result;
}

export function getBrowserLang(): string {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.split("-")[0] ?? "en";
  return lang;
}
