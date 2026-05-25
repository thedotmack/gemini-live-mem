"use client";

// Split-pane shell: left = CopilotKit chat, right = the browser viewport.
import { CopilotChat } from "@copilotkit/react-ui";
// useCoAgent — bidirectional shared state with the AG-UI agent
// (backed by STATE_SNAPSHOT / STATE_DELTA events). Docs: PLAN.md Phase 0.
import { useCoAgent } from "@copilotkit/react-core";
import type { BrowserAgentState } from "../lib/types";
import { demoState, demoApproval } from "../lib/demo";
import { BrowserViewport } from "../components/BrowserViewport";
import { ActionFeed } from "../components/ActionFeed";
import { ApprovalCard, ApprovalCardView } from "../components/ApprovalCard";

// Demo mode is ON unless NEXT_PUBLIC_DEMO === "0". When on, the viewport falls
// back to seeded demo state so the whole UI renders without a backend/API key.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO !== "0";

const EMPTY_STATE: BrowserAgentState = {
  url: "",
  title: "",
  screenshot: "",
  status: "idle",
  steps: [],
};

export default function Page() {
  // Live shared state from the agent (empty until the backend connects).
  const { state } = useCoAgent<BrowserAgentState>({
    name: "browser_agent",
    initialState: EMPTY_STATE,
  });

  // Register the in-chat generative-UI hooks (live step feed + HITL approval).
  ActionFeed();
  ApprovalCard();

  // If the agent hasn't populated state yet (or demo mode is on), use demo data.
  const hasLiveState = Boolean(state?.url || state?.steps?.length);
  const viewState: BrowserAgentState =
    !hasLiveState || DEMO_MODE ? demoState : state;

  return (
    <div className="app">
      <header className="appHeader">
        <div className="brand">
          <div className="brandMark">🛰️</div>
          <div>
            <h1 className="wordmark">Browser Pilot</h1>
            <div className="tagline">interactive browser agent</div>
          </div>
        </div>
        <span className="protocolTag">AG-UI · CopilotKit</span>
      </header>

      <div className="split">
        <div className="chatPane">
          <CopilotChat
            labels={{
              title: "Browser Pilot",
              initial: "Where should I go? 🛰️",
            }}
          />
        </div>

        <div className="viewportPane">
          <BrowserViewport state={viewState} />

          {/* In demo mode, statically render the HITL approval card below the
              viewport so the screenshot shows the human-in-the-loop UI without
              an agent run. The live card renders in-chat via ApprovalCard(). */}
          {DEMO_MODE ? (
            <div style={{ maxWidth: 1100, margin: "1.25rem auto 0" }}>
              <ApprovalCardView
                action={demoApproval.action}
                url={demoApproval.url}
                disabled={false}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
