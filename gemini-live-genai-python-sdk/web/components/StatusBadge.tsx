import type { ConnectionStatus } from "@/hooks/useGeminiSession";

const STYLES: Record<ConnectionStatus, string> = {
  disconnected: "bg-slate-200 text-slate-600",
  connecting: "bg-slate-200 text-slate-600",
  connected: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
};

export function StatusBadge({
  status,
  text,
}: {
  status: ConnectionStatus;
  text: string;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${STYLES[status]}`}
    >
      {text}
    </span>
  );
}
