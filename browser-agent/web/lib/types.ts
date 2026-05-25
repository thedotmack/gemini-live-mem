// Shared agent state contract.
// This is the object synced bidirectionally between the Python AG-UI agent and
// the React UI via CopilotKit `useCoAgent` (AG-UI STATE_SNAPSHOT / STATE_DELTA events).
// See PLAN.md "Shared state contract".

export type AgentStatus =
  | "idle"
  | "thinking"
  | "acting"
  | "waiting_approval"
  | "done";

export type StepState = "running" | "done" | "error";

export interface AgentStep {
  id: string;
  label: string;
  detail: string;
  state: StepState;
}

export interface BrowserAgentState {
  /** Current URL shown in the viewport's address bar. */
  url: string;
  /** Page <title> of the current page. */
  title: string;
  /** base64 data URL of the latest browser screenshot. */
  screenshot: string;
  /** High-level agent status, drives the status chip. */
  status: AgentStatus;
  /** Ordered feed of agent steps (the live action feed). */
  steps: AgentStep[];
}
