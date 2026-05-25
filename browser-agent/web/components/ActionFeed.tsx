"use client";

// Live agent step feed.
// CopilotKit useCoAgentStateRender — renders agent shared-state inline in the chat
// thread; driven by AG-UI STATE_SNAPSHOT / STATE_DELTA events from the agent.
// Docs: PLAN.md Phase 0 hook list.
import { useCoAgentStateRender } from "@copilotkit/react-core";
import type { AgentStep, BrowserAgentState } from "../lib/types";

const STEP_GLYPH: Record<AgentStep["state"], string> = {
  done: "✓",
  running: "",
  error: "!",
};

/** Presentational, reusable step list — used both in-chat and in the viewport. */
export function Steps({ steps }: { steps: AgentStep[] }) {
  if (!steps?.length) return null;
  return (
    <ol className="steps">
      {steps.map((step) => (
        <li key={step.id} className="step" data-state={step.state}>
          <span className="stepIcon">{STEP_GLYPH[step.state]}</span>
          <div>
            <p className="stepLabel">{step.label}</p>
            {step.detail ? <p className="stepDetail">{step.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Titled panel wrapper around <Steps> for use inside the viewport / chat. */
export function StepFeedPanel({ steps }: { steps: AgentStep[] }) {
  return (
    <section className="panel">
      <p className="panelTitle">Agent activity</p>
      <Steps steps={steps} />
    </section>
  );
}

/**
 * Registers the live step feed with CopilotKit so the agent's shared state
 * renders directly inside the chat thread as it runs. Renders nothing itself.
 */
export function ActionFeed() {
  useCoAgentStateRender<BrowserAgentState>({
    name: "browser_agent",
    render: ({ state }) =>
      state?.steps?.length ? <StepFeedPanel steps={state.steps} /> : <></>,
  });
  return null;
}
