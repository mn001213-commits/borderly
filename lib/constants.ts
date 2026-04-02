export type Category = "info" | "question" | "daily" | "general" | "jobs" | "other";

export const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  general: { bg: "#F0F4FF", color: "#4361EE" },
  info:    { bg: "#FFF4EC", color: "#F77F00" },
  question:{ bg: "#F5F0FF", color: "#7B2FF2" },
  daily:   { bg: "#EEFBF3", color: "#06D6A0" },
  jobs:    { bg: "#FFF8EB", color: "#E6A817" },
  meet:    { bg: "#EBF3FF", color: "#4A8FE7" },
  skill:   { bg: "#EDF8FF", color: "#0096C7" },
  ngo:     { bg: "#F0FFF4", color: "#2D9F5D" },
  legal:   { bg: "#FFF5F5", color: "#C1292E" },
  other:   { bg: "#F5F5F3", color: "#737373" },
};
