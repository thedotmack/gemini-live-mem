// Observation type -> emoji + left-border accent, matching the worker's
// gemini-live.json memory taxonomy.
export const OBS_EMOJI: Record<string, string> = {
  person: "🧑",
  companion: "👥",
  behavior: "🎭",
  appearance: "👤",
  environment: "🏠",
  conversation: "💬",
  security_alert: "🚨",
  security_note: "🔐",
  "tool-call": "🔧",
};

// Tailwind border-color class per observation type for the memory feed accent.
export const OBS_ACCENT: Record<string, string> = {
  security_alert: "border-l-red-500",
  behavior: "border-l-amber-400",
  environment: "border-l-emerald-500",
  companion: "border-l-purple-500",
};

export function obsEmoji(type?: string): string {
  return (type && OBS_EMOJI[type]) || "🧠";
}

export function obsAccent(type?: string): string {
  return (type && OBS_ACCENT[type]) || "border-l-blue-500";
}
