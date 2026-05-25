# Interactive Browser Agent — MVP v1 Plan

A web UI where a user chats with / steers an AI agent that drives a real browser in
real time. Built on **CopilotKit + the AG-UI protocol**, with **CopilotKit React UI**
components, themed with a **fly.io-inspired** dark/violet design kit.

> Scope discipline: this is an MVP. Build the thin vertical slice end-to-end, make the
> UI genuinely nice (it's the headline deliverable + the thing we screenshot), and stop.
> No auth, no multi-session, no persistence, no test harness beyond build/typecheck.

---

## Phase 0 — Documentation Discovery (DONE; copy from these, do not invent)

### Allowed APIs (verified against official sources)

**npm (frontend + runtime bridge):**
- `@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`
- `@ag-ui/client` — provides `HttpAgent`
- Provider: `<CopilotKit runtimeUrl="/api/copilotkit" agent="browser_agent">` (props: `runtimeUrl`, `agent`; `agent` string MUST equal the key in `CopilotRuntime({ agents: {...} })`).
- Chat component for a **custom split layout**: `<CopilotChat labels={{title, initial}} />` from `@copilotkit/react-ui` (plain in-flow panel, no chrome). Import `@copilotkit/react-ui/styles.css` once at root.
- Hooks (v1, from `@copilotkit/react-core`):
  - `useCoAgent<T>({ name, initialState })` → `{ state, setState, running, nodeName, start, stop, run }` (bidirectional shared state; backed by AG-UI `STATE_SNAPSHOT`/`STATE_DELTA`).
  - `useCoAgentStateRender<T>({ name, render })` → renders agent state inline in chat (live step feed).
  - `useCopilotAction({ name, parameters, render })` → generative UI. `render({ status, args, result })`, `status ∈ 'inProgress'|'executing'|'complete'`.
  - HITL: `useCopilotAction({ name, parameters, renderAndWaitForResponse })` → `({ status, args, respond }) => ReactElement`; call `respond(value)` to resolve (only when `status==='executing'`).

**Runtime route (Next.js App Router) — copy this shape exactly:**
```ts
// app/api/copilotkit/route.ts
import { CopilotRuntime, ExperimentalEmptyAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

const runtime = new CopilotRuntime({
  agents: { browser_agent: new HttpAgent({ url: process.env.AGENT_URL ?? "http://localhost:8000/" }) },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime, serviceAdapter: new ExperimentalEmptyAdapter(), endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

**pip (agent backend):**
- `ag-ui-protocol` (>=0.1.18) — imports `ag_ui.core` (event types: `EventType`, `RunStartedEvent`, `RunFinishedEvent`, `RunErrorEvent`, `TextMessageStartEvent`/`...ContentEvent`/`...EndEvent`, `ToolCallStartEvent`/`...ArgsEvent`/`...EndEvent`/`ToolCallResultEvent`, `StateSnapshotEvent`, `StateDeltaEvent`, `RunAgentInput`) and `ag_ui.encoder` (`EventEncoder`).
- `fastapi`, `uvicorn`, `playwright` (+ `playwright install chromium`), `anthropic`, `python-dotenv`.
- SSE endpoint shape — copy from https://docs.ag-ui.com/quickstart/server:
```python
@app.post("/")
async def endpoint(input_data: RunAgentInput, request: Request):
    encoder = EventEncoder(accept=request.headers.get("accept"))
    async def gen():
        yield encoder.encode(RunStartedEvent(type=EventType.RUN_STARTED, thread_id=input_data.thread_id, run_id=input_data.run_id))
        # ... stream TEXT_MESSAGE_* / TOOL_CALL_* / STATE_DELTA ...
        yield encoder.encode(RunFinishedEvent(type=EventType.RUN_FINISHED, thread_id=input_data.thread_id, run_id=input_data.run_id))
    return StreamingResponse(gen(), media_type="text/event-stream")
```

### Anti-patterns to avoid
- Do NOT use `CopilotSidebar`/`CopilotPopup` (wrong shape for split layout) — use `CopilotChat`.
- Do NOT invent an `INTERRUPT` AG-UI event. Model human approval as a **tool call** the frontend fulfills via `renderAndWaitForResponse` / `respond()`.
- Do NOT add a `publicApiKey` (that's CopilotKit Cloud) — we are self-hosted.
- Do NOT pass a `google/`-prefixed model name to a native SDK client (the bug from issue #5).
- Do NOT assume a font CSS variable exists in CopilotKit — it uses `font-family: inherit`; set fonts on the container.
- Theming is via CSS custom properties (`--copilot-kit-*`) + dark-mode selector `[data-theme="dark"]`/`.dark`.

### Design kit (fly.io-inspired, free-font substitutes)
```css
:root {
  --bg:        #191034;  /* fly navy */
  --surface:   #221646;  --surface-2: #2a1c54;
  --border:    #2b1f55;
  --primary:   #7c3aed;  --primary-hover: #6d28d9;
  --violet-1:  #996bec;  --violet-2: #ba7bf0;  --indigo: #5046e4;
  --text:      #f5f3ff;  --text-muted:#9698B6; --text-dim:#676B89;
  --mint:#6EE5C2; --pink:#FF008A; --amber:#FFC83A;
  --grad: linear-gradient(135deg,#5046e4 0%,#996bec 55%,#ba7bf0 100%);
  --radius:0.625rem; --radius-lg:1rem; --radius-full:9999px; --gap:2rem;
}
```
Fonts via `next/font/google`: headings **Fraunces** (serif), body **Space Grotesk**, mono **JetBrains Mono**.

---

## Architecture

```
browser-agent/
├── web/                              # Next.js 15 App Router + CopilotKit (TypeScript)
│   ├── app/
│   │   ├── layout.tsx                # fonts, <CopilotKit>, styles import, data-theme="dark"
│   │   ├── page.tsx                  # split-pane shell (chat | viewport)
│   │   ├── globals.css               # design tokens + CopilotKit --copilot-kit-* overrides
│   │   └── api/copilotkit/route.ts   # CopilotRuntime + HttpAgent bridge
│   ├── components/
│   │   ├── BrowserViewport.tsx       # right pane: URL bar + screenshot + status chip
│   │   ├── ActionFeed.tsx            # useCoAgentStateRender step feed (generative UI)
│   │   └── ApprovalCard.tsx          # HITL approve/reject (renderAndWaitForResponse)
│   ├── lib/types.ts                  # BrowserAgentState type
│   ├── lib/demo.ts                   # seeded mock state for design screenshots
│   └── package.json
├── agent/                            # Python FastAPI AG-UI agent + Playwright
│   ├── server.py                     # SSE endpoint, AG-UI event stream
│   ├── browser.py                    # Playwright async wrapper
│   ├── agent_loop.py                 # Claude tool-use loop → AG-UI events (+ demo fallback)
│   ├── requirements.txt
│   └── .env.example                  # ANTHROPIC_API_KEY=...
├── docs/screenshots/                 # design screenshots → posted to PR
└── README.md                         # run instructions
```

**Shared state contract** (`BrowserAgentState`): `{ url: string; title: string; screenshot: string /*base64 data url*/; status: "idle"|"thinking"|"acting"|"waiting_approval"|"done"; steps: {id, label, detail, state:"running"|"done"|"error"}[] }`.

**Demo mode (critical for the screenshot deliverable):** `web/lib/demo.ts` exports a fully populated `BrowserAgentState` + a sample assistant transcript. When `NEXT_PUBLIC_DEMO !== "0"` (default ON), `page.tsx` seeds the viewport + action feed from demo data so the whole UI renders beautifully **without** the backend or any API key. This is what we screenshot.

---

## Phase 1 — Frontend shell + fly.io design system (screenshot-ready)

**Implement (greenfield — create files, copy doc shapes):**
1. Scaffold Next.js app in `browser-agent/web` (App Router, TS, no Tailwind needed — plain CSS modules/`globals.css`). `package.json` deps: `next`, `react`, `react-dom`, `@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`, `@ag-ui/client`.
2. `app/globals.css`: paste the design-kit tokens above; add `[data-theme="dark"]` overrides of `--copilot-kit-background-color/-secondary-color/-primary-color/-contrast-color/-separator-color/-input-background-color` mapped to the fly palette; style the split-pane, URL bar, status chip, step feed, approval card.
3. `app/layout.tsx`: load fonts via `next/font/google` (Fraunces/Space Grotesk/JetBrains Mono), set them as CSS vars on `<body>`, `data-theme="dark"`, `import "@copilotkit/react-ui/styles.css"`, wrap children in `<CopilotKit runtimeUrl="/api/copilotkit" agent="browser_agent">`.
4. `app/page.tsx`: CSS-grid split-pane — left `<CopilotChat labels={{title:"Browser Pilot", initial:"Where should I go? 🛰️"}} />`, right `<BrowserViewport />`. Header bar with wordmark + violet gradient accent.
5. `components/BrowserViewport.tsx`: URL bar (mono font), big screenshot area (rounded, bordered), status chip; reads from `useCoAgent` state, falls back to `demo.ts` when empty/demo.
6. `lib/types.ts` + `lib/demo.ts` (seeded state + a believable browsing scenario, e.g. "find the price of a Fly Machine").

**Doc refs:** CopilotChat props & styles import (react-ui); `--copilot-kit-*` variables + `[data-theme="dark"]` selector (react-ui `colors.css`); next/font/google.

**Verification checklist:**
- `cd browser-agent/web && npm install && npm run build` succeeds.
- `npm run dev` renders the themed split-pane with demo data (no backend running).
- Grep: `grep -R "CopilotSidebar\|CopilotPopup\|publicApiKey" app components` returns nothing.

**Anti-pattern guards:** no sidebar/popup; no cloud key; theme only via documented `--copilot-kit-*` vars + container fonts.

---

## Phase 2 — Generative UI, live state & human-in-the-loop wiring

**Implement (copy hook signatures from Phase 0):**
1. `app/api/copilotkit/route.ts`: the runtime bridge exactly as in Phase 0 (`CopilotRuntime` + `HttpAgent` + `ExperimentalEmptyAdapter`).
2. In `page.tsx` (or a client wrapper): `useCoAgent<BrowserAgentState>({ name: "browser_agent", initialState })` — feed `state.url/screenshot/status` into `<BrowserViewport>`.
3. `components/ActionFeed.tsx`: `useCoAgentStateRender<BrowserAgentState>({ name: "browser_agent", render: ({state}) => <Steps steps={state.steps}/> })` — renders the live step feed inside the chat.
4. `components/ApprovalCard.tsx`: `useCopilotAction({ name: "request_approval", parameters:[{name:"action",type:"string"},{name:"url",type:"string"}], renderAndWaitForResponse: ({status,args,respond}) => <ApprovalCard ... onApprove={()=>respond?.("APPROVED")} onReject={()=>respond?.("REJECTED")} disabled={status!=="executing"} /> })`.
5. Optional polish action `highlight_finding` with a `render` (display-only generative UI card) to show the agent surfacing a result.

**Doc refs:** `useCoAgent`, `useCoAgentStateRender`, `useCopilotAction`/`renderAndWaitForResponse` signatures (Phase 0). Runtime route shape (Phase 0).

**Verification checklist:**
- `npm run build` still succeeds with hooks added.
- Grep: hooks imported from `@copilotkit/react-core`; `HttpAgent` from `@ag-ui/client`; `ExperimentalEmptyAdapter` from `@copilotkit/runtime`.
- The approval card and step feed render in demo mode (seed a `waiting_approval` state in `demo.ts`).

**Anti-pattern guards:** `respond()` only called from approve/reject handlers; no invented `INTERRUPT` event.

---

## Phase 3 — Python AG-UI agent + Playwright browser control

**Implement (copy SSE shape from Phase 0):**
1. `agent/requirements.txt`: `fastapi`, `uvicorn[standard]`, `ag-ui-protocol>=0.1.18`, `playwright`, `anthropic`, `python-dotenv`.
2. `agent/browser.py`: async Playwright wrapper — `class BrowserController` with `start()`, `navigate(url)`, `click(selector)`, `type_text(selector,text)`, `screenshot()->base64 data url`, `current()->(url,title)`, `close()`. Single chromium `Page`.
3. `agent/agent_loop.py`: Claude tool-use loop (Anthropic SDK, model `claude-sonnet-4-6`, with **prompt caching** on the system prompt). Tools: `navigate`, `click`, `type_text`, `screenshot`, `finish`. Loop: send messages+tools → for each `tool_use` block: (a) for `navigate`, first emit a `request_approval` TOOL_CALL and await the frontend's `TOOL_CALL_RESULT` (HITL); (b) execute via `BrowserController`; (c) emit `STATE_DELTA`/`STATE_SNAPSHOT` with new `{url,title,screenshot,status,steps}`; (d) emit `ToolCallResultEvent`. Stream the final answer as `TEXT_MESSAGE_*`. **Demo fallback:** if `ANTHROPIC_API_KEY` unset, run a deterministic canned script (navigate→screenshot→narrate) so the backend is runnable without keys.
4. `agent/server.py`: FastAPI `POST /` accepting `RunAgentInput`, `EventEncoder(accept=...)`, `StreamingResponse(..., media_type="text/event-stream")`, emits `RUN_STARTED` → loop events → `RUN_FINISHED` (or `RunErrorEvent`). CORS allow the web origin.
5. `agent/.env.example` + a short run note in README.

**Doc refs:** AG-UI Python quickstart SSE pattern + `ag_ui.core`/`ag_ui.encoder` (Phase 0). claude-api skill for the Anthropic tool-use loop + prompt caching. Repo tool-dispatch pattern at `gemini-live-genai-python-sdk/claude_mem_sink.py:425-461` (shape reference only).

**Verification checklist:**
- `python3 -m py_compile agent/*.py` passes.
- `pip install -r agent/requirements.txt` resolves (in a venv); imports succeed: `python3 -c "import ag_ui.core, ag_ui.encoder, fastapi, playwright"`.
- Start `uvicorn server:app` in demo mode (no key) and confirm it streams `text/event-stream` (curl the `/` with a minimal RunAgentInput JSON → see `data: {"type":"RUN_STARTED"...}`).

**Anti-pattern guards:** event field names match `ag_ui.core` exactly (verify against installed package, not memory); HITL via tool call + `ToolCallResultEvent`, not a made-up event; no `google/`-prefixed model strings.

---

## Phase 4 — Integration, demo seed & design screenshots

**Implement:**
1. End-to-end smoke: run `agent` (demo mode) + `web` together; confirm a chat turn drives the viewport. (If live LLM/Playwright can't run headlessly in this env, rely on demo mode for the deliverable.)
2. Ensure `web` demo mode renders a polished, populated UI: transcript, viewport screenshot, action feed, an approval card, a result card.
3. Capture screenshots with the browser/gstack tooling at desktop width (≥1440px): (a) full split-pane hero, (b) approval card close-up, (c) action-feed/generative-UI state. Save to `browser-agent/docs/screenshots/*.png`.
4. `browser-agent/README.md`: what it is, architecture diagram (the tree above), run instructions for both services, env vars, and an embed of the screenshots.

**Verification checklist:** screenshots exist in `docs/screenshots/`; README renders; both services have documented start commands.

---

## Phase 5 — Final verification & ship

1. `web`: `npm run build` clean; `npx tsc --noEmit` clean.
2. `agent`: `py_compile` clean; imports resolve.
3. Anti-pattern grep sweep: no `CopilotSidebar`/`CopilotPopup`/`publicApiKey`/`INTERRUPT`/`google/`-prefixed model; package/hook names match Phase 0 allowed list.
4. Commit per phase; push branch `copilotkit-browser-agent-mvp`; open PR to `main`; attach design screenshots to the PR; let Greptile review; babysit until ready to merge.

## Out of scope (do NOT build — rabbit holes)
Auth, user accounts, multi-tab/session management, persistence/DB, deployment configs, test suites, streaming token-level chat optimizations, v2 CopilotKit migration, mobile-native layout. Keep the slice thin.
