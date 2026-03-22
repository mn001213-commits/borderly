export type Category = "info" | "question" | "daily" | "general" | "jobs" | "other";

export const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  general: { bg: "#E3F2FD", color: "#1565C0" },
  info: { bg: "#FFF3E0", color: "#EF6C00" },
  question: { bg: "#F3E5F5", color: "#8E24AA" },
  daily: { bg: "#E8F5E9", color: "#2E7D32" },
  jobs: { bg: "#FFF8E1", color: "#F57F17" },
  meet: { bg: "#E3F2FD", color: "#1565C0" },
  skill: { bg: "#F3E5F5", color: "#8E24AA" },
  ngo: { bg: "#E8F5E9", color: "#2E7D32" },
  legal: { bg: "#FFF3E0", color: "#EF6C00" },
  other: { bg: "#F5F5F5", color: "#616161" },
};
