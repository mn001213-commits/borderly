import countries from "i18n-iso-countries";
import ko from "i18n-iso-countries/langs/ko.json";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(ko);
countries.registerLocale(en);

export type CountryItem = { code: string; name: string };

export function getCountryList(lang: "ko" | "en" = "ko"): CountryItem[] {
  const names = countries.getNames(lang, { select: "official" }) as Record<string, string>;

  return Object.entries(names)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function countryName(code: string | null | undefined, lang: "ko" | "en" = "ko") {
  if (!code) return "";
  return countries.getName(code, lang, { select: "official" }) ?? code;
}