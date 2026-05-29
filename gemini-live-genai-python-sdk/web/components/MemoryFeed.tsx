"use client";

import { useEffect, useRef } from "react";
import type { Observation } from "@/lib/gemini-client";
import { obsAccent, obsEmoji } from "@/lib/observation-icons";

// The live memory feed: observations claude-mem extracts from the session,
// streamed in as they form. Auto-scrolls to the latest.
export function MemoryFeed({ observations }: { observations: Observation[] }) {
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [observations]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-live-pulse" />
        <span>Memory</span>
        {observations.length > 0 && (
          <span className="ml-auto min-w-[1.4rem] rounded-full bg-slate-200 px-2 text-center text-[0.7rem] tabular-nums text-slate-600">
            {observations.length}
          </span>
        )}
      </div>

      <div
        ref={listRef}
        className="flex max-h-80 flex-col gap-2 overflow-y-auto p-3"
      >
        {observations.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-slate-500">
            Watching… memories appear here as the session unfolds.
          </div>
        ) : (
          observations.map((obs, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-md border border-slate-200 border-l-[3px] bg-slate-50 px-2.5 py-2 animate-pop-in ${obsAccent(
                obs.obs_type
              )}`}
            >
              <span className="flex-shrink-0 text-base leading-tight">
                {obsEmoji(obs.obs_type)}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-snug text-slate-900">
                  {obs.title}
                </div>
                {obs.subtitle && (
                  <div className="mt-0.5 text-xs leading-snug text-slate-500">
                    {obs.subtitle}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
