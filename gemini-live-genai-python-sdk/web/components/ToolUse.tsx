"use client";

import { useEffect, useRef } from "react";
import type { ToolCall } from "@/lib/gemini-client";

const TOOL_LABELS: Record<string, string> = {
  get_memory_timeline: "🕒 Timeline lookup",
  get_memory_observations: "🔍 Detail lookup",
};

function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? `🔧 ${name}`;
}

// A live log of the memory-recall tool calls the agent made — i.e. what it
// actively looked up. Presentational only; auto-scrolls to the latest.
export function ToolUse({ toolCalls }: { toolCalls: ToolCall[] }) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [toolCalls]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 h-full">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-live-pulse" />
        <span>Memory Recall</span>
        {toolCalls.length > 0 && (
          <span className="ml-auto min-w-[1.4rem] rounded-full bg-slate-200 px-2 text-center text-[0.7rem] tabular-nums text-slate-600">
            {toolCalls.length}
          </span>
        )}
      </div>

      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3"
      >
        {toolCalls.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-slate-500">
            The agent hasn&apos;t looked anything up yet.
          </div>
        ) : (
          toolCalls.map((tc) => {
            const argsSummary = Object.entries(tc.args)
              .map(
                ([k, v]) =>
                  k +
                  ": " +
                  (Array.isArray(v) ? "[" + v.join(", ") + "]" : String(v))
              )
              .join(" · ");
            return (
              <div
                key={tc.id}
                className="rounded-md border border-slate-200 border-l-[3px] border-l-blue-500 bg-slate-50 px-2.5 py-2 animate-pop-in"
              >
                <div>
                  <span className="text-sm font-semibold text-slate-900">
                    {toolLabel(tc.name)}
                  </span>
                </div>
                {argsSummary && (
                  <div className="mt-0.5 text-xs text-slate-500 break-words">
                    {argsSummary}
                  </div>
                )}
                {tc.result && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-slate-500">
                      result
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-2 font-mono text-[0.7rem] text-slate-700">
                      {tc.result}
                    </pre>
                  </details>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
