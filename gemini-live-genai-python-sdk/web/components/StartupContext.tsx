"use client";

// What the agent knew when it woke up: the claude-mem startup memory injected
// into the live model's system prompt at session start. This is the exact
// recent-context *timeline* claude-mem's SessionStart hook renders — a Legend
// plus an `ID TIME TYPE TITLE` index of recent observations — so we show it
// verbatim in a monospace, line-preserving block rather than reflowing it as
// prose (markdown collapses the per-observation lines into one run-on blob).
// Presentational only — no fetching, no toggle.
export function StartupContext({ markdown }: { markdown: string | null }) {
  const hasMemory = typeof markdown === "string" && markdown.trim().length > 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 h-full">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-live-pulse" />
        <span>Startup Memory</span>
        <span className="ml-auto rounded-full bg-slate-200 px-2 py-0.5 text-[0.6rem] font-medium normal-case tracking-normal text-slate-600">
          injected into system prompt
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {hasMemory ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[0.7rem] leading-relaxed text-slate-700">
            {markdown}
          </pre>
        ) : (
          <div className="px-2 py-6 text-center text-sm text-slate-500">
            No prior memory — this is our first session.
            <div className="mt-1 text-xs text-slate-400">
              Memory builds as you talk; next session, the agent wakes up
              knowing this.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
