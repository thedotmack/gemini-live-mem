"use client";

// CopilotKit provider must run on the client. Self-hosted runtime via runtimeUrl;
// `agent` MUST match the key in CopilotRuntime({ agents: { browser_agent } }).
// No cloud API key — this is self-hosted, not CopilotKit Cloud (PLAN anti-patterns).
import { CopilotKit } from "@copilotkit/react-core";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="browser_agent">
      {children}
    </CopilotKit>
  );
}
