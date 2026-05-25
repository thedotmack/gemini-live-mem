"use client";

// Right pane: a mock "browser viewport" — URL bar + screenshot + status chip,
// plus the agent activity feed below. Pure presentational; state is passed in
// from page.tsx (live useCoAgent state, or demo.ts fallback in demo mode).
import type { AgentStatus, BrowserAgentState } from "../lib/types";
import { StepFeedPanel } from "./ActionFeed";

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  thinking: "Thinking",
  acting: "Acting",
  waiting_approval: "Awaiting approval",
  done: "Done",
};

function StatusChip({ status }: { status: AgentStatus }) {
  return (
    <span className="statusChip" data-status={status}>
      <span className="statusDot" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function UrlBar({ url }: { url: string }) {
  // split scheme so we can dim it (mono font, browser-chrome look)
  const match = url.match(/^(https?:\/\/)(.*)$/);
  const scheme = match?.[1] ?? "";
  const rest = match?.[2] ?? url;
  return (
    <div className="urlBar">
      <span className="urlDots">
        <span />
        <span />
        <span />
      </span>
      <span className="urlLock">🔒</span>
      <span className="urlText">
        <span className="scheme">{scheme}</span>
        {rest}
      </span>
    </div>
  );
}

export function BrowserViewport({ state }: { state: BrowserAgentState }) {
  const { url, title, screenshot, status, steps } = state;
  return (
    <div className="viewport">
      <div className="viewportTop">
        <UrlBar url={url} />
        <StatusChip status={status} />
      </div>

      {title ? <h2 className="viewportTitle">{title}</h2> : null}

      <div className="screenshotFrame">
        {screenshot ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL screenshot, not an asset
          <img src={screenshot} alt={title || "Browser screenshot"} />
        ) : (
          <div className="screenshotEmpty">waiting for first screenshot…</div>
        )}
      </div>

      <StepFeedPanel steps={steps} />
    </div>
  );
}
