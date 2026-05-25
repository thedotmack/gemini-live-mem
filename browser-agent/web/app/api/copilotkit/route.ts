// CopilotKit runtime bridge → AG-UI agent (self-hosted, no Cloud key).
// Shape copied verbatim from PLAN.md "Phase 0 — Runtime route (Next.js App Router)".
// CopilotRuntime/ExperimentalEmptyAdapter/copilotRuntimeNextJSAppRouterEndpoint: @copilotkit/runtime
// HttpAgent: @ag-ui/client (speaks the AG-UI SSE protocol to the Python FastAPI agent).
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

const runtime = new CopilotRuntime({
  // The key "browser_agent" MUST equal the `agent` prop on <CopilotKit>.
  agents: {
    browser_agent: new HttpAgent({
      url: process.env.AGENT_URL ?? "http://localhost:8000/",
    }),
  },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
