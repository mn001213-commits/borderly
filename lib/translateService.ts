const cache = new Map<string, string>();

export async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  const key = `${targetLang}::${text}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
