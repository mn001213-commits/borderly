export type Locale = "en" | "ja";

const translations: Record<string, Record<Locale, string>> = {
  // Navigation
  "nav.home": { en: "Home", ja: "ホーム" },
  "nav.ngo": { en: "NGO", ja: "NGO" },
  "nav.meet": { en: "Meet", ja: "ミート" },
  "nav.chats": { en: "Chats", ja: "チャット" },
  "nav.profile": { en: "Profile", ja: "プロフィール" },

  // Common
  "common.loading": { en: "Loading...", ja: "読み込み中..." },
  "common.save": { en: "Save", ja: "保存" },
  "common.cancel": { en: "Cancel", ja: "キャンセル" },
  "common.delete": { en: "Delete", ja: "削除" },
  "common.edit": { en: "Edit", ja: "編集" },
  "common.search": { en: "Search", ja: "検索" },
  "common.back": { en: "Back", ja: "戻る" },
  "common.submit": { en: "Submit", ja: "送信" },
  "common.login": { en: "Log In", ja: "ログイン" },
  "common.signup": { en: "Sign Up", ja: "新規登録" },
  "common.logout": { en: "Log Out", ja: "ログアウト" },
  "common.settings": { en: "Settings", ja: "設定" },
  "common.create": { en: "Create", ja: "作成" },

  // Auth
  "auth.email": { en: "Email", ja: "メールアドレス" },
  "auth.password": { en: "Password", ja: "パスワード" },
  "auth.google": { en: "Continue with Google", ja: "Googleで続ける" },
  "auth.or": { en: "or", ja: "または" },
  "auth.forgotPassword": { en: "Forgot password?", ja: "パスワードを忘れた方" },
  "auth.noAccount": {
    en: "Don't have an account?",
    ja: "アカウントをお持ちでない方",
  },
  "auth.hasAccount": {
    en: "Already have an account?",
    ja: "アカウントをお持ちの方",
  },

  // Profile
  "profile.displayName": { en: "Display Name", ja: "表示名" },
  "profile.bio": { en: "Bio", ja: "自己紹介" },
  "profile.country": { en: "Country", ja: "国" },
  "profile.languages": { en: "Languages", ja: "言語" },
  "profile.followers": { en: "Followers", ja: "フォロワー" },
  "profile.following": { en: "Following", ja: "フォロー中" },
  "profile.posts": { en: "Posts", ja: "投稿" },

  // Meet
  "meet.create": { en: "Create Meet", ja: "ミートを作成" },
  "meet.join": { en: "Join", ja: "参加" },
  "meet.leave": { en: "Leave", ja: "退出" },
  "meet.full": { en: "Full", ja: "満員" },
  "meet.ended": { en: "Ended", ja: "終了" },
  "meet.open": { en: "Open", ja: "募集中" },

  // Chat
  "chat.newChat": { en: "New Chat", ja: "新規チャット" },
  "chat.typeMessage": {
    en: "Type a message...",
    ja: "メッセージを入力...",
  },
  "chat.noMessages": { en: "No messages yet", ja: "メッセージはありません" },
  "chat.send": { en: "Send", ja: "送信" },
};

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("borderly-locale");
  if (stored === "ja" || stored === "en") return stored;
  const browserLang = navigator.language?.slice(0, 2);
  return browserLang === "ja" ? "ja" : "en";
}

export function setLocale(locale: Locale) {
  localStorage.setItem("borderly-locale", locale);
  window.dispatchEvent(new Event("locale-change"));
}

export function t(key: string): string {
  const locale = getLocale();
  return translations[key]?.[locale] ?? translations[key]?.["en"] ?? key;
}
