# Plan: Bento-grid "everything the agent sees" UI

Redesign the live UI of the gemini-live-mem app into a responsive **bento grid** that makes
*everything the Gemini Live agent sees* first-class visible:

- **Startup context** — the claude-mem recent-session memory injected into the system instruction at session start (currently invisible to the UI).
- **Tool-use context** — `get_memory_timeline` / `get_memory_observations` calls + their results (already emitted over the WebSocket, currently dropped by the frontend).
- **Recent memories** — the live observation feed (already shown).

…alongside the existing agent face (Pepe), conversation, the exact frames sent to the model, and media controls.

**Working dir:** `gemini-live-genai-python-sdk/`
**Acceptance gate:** `cd web && npm run build` produces `web/out/` cleanly with **zero lint errors**.

---

## Phase 0 — Verified facts (Allowed APIs / exact locations)

> Confirmed by reading the actual source. Do not re-derive; rely on these.

### Backend event flow (`gemini_live.py`)
- `session_start_context = await memory_sink.fetch_session_start_context()` — **line 49**, inside the `if memory_sink:` block (lines 48–57). Used at lines 50–53 to build the system instruction.
- `event_queue = asyncio.Queue()` — **line 124**.
- `memory_sink.emit = event_queue.put` — **line 128** (inside `if memory_sink:`).
- `{"type": "tool_call", "name": func_name, "args": args, "result": result}` already put on the queue — **line 193**.
- Drain loop **lines 215–225** yields *every* event dict verbatim.
- **Python scope note:** `session_start_context` (line 49) is function-scoped, so it IS reachable at line 128. To be safe and explicit, initialize `session_start_context = ""` *before* the `if memory_sink:` block (so a falsy `memory_sink` can never cause a `NameError`). The emit MUST go at line 128 (not line 49) because `event_queue` doesn't exist until line 124.

### Backend forwarding (`main.py`)
- `await websocket.send_json(event)` — **line 150**. Forwards every yielded event verbatim; **no type whitelist**. ⇒ a new `session_context` event needs **no main.py change**.

### Backend read API (`claude_mem_sink.py`)
- `fetch_session_start_context()` (lines 658–668) always returns a **string** (markdown), `""` on failure (fail-soft). Never `None`.

### Frontend (`web/`, Next 16.2.6 + React 19.2.4 + Tailwind v4 + react-markdown ^10.1.0)
- **Static export:** `next.config.ts` → `output: "export"`, `images: { unoptimized: true }`, output dir `web/out/`. No Next server; no API routes — all logic client-side over the existing `/ws` WebSocket.
- **Tailwind v4 is CSS-first:** no `tailwind.config.js`. `globals.css` uses `@import "tailwindcss";` + `@theme inline { … }`. Custom classes + `@keyframes` (e.g. `.animate-live-pulse`, `.animate-pop-in`, `.markdown`) are plain CSS in `globals.css`. ⇒ **Add the `.bento` grid + area classes as plain CSS in `globals.css`** (NOT Tailwind arbitrary multi-line values, NOT a tailwind.config.js).
- **`"use client"` required** on any component using hooks/handlers (all interactive components already have it).
- **`<img>` precedent:** plain `<img>` with `data:` URIs + inline `{/* eslint-disable-next-line @next/next/no-img-element */}`. Do NOT use `next/image`.
- Build: `cd web && npm run build`. Lint: `npm run lint` (eslint-config-next core-web-vitals + typescript, `strict: true`, path alias `@/*`).
- **Read first (web/AGENTS.md mandate):** before editing frontend, skim `web/node_modules/next/dist/docs/` for any Next 16 static-export / App Router / "use client" notes.

### Copy-ready patterns
| Pattern | Source |
| --- | --- |
| Card header (pulse dot + title + count) | `components/MemoryFeed.tsx:19–26` |
| Scroll container + auto-scroll `useRef`/`useEffect` | `components/MemoryFeed.tsx:12–15,29–31` / `ChatPanel.tsx:38–43` |
| Empty state | `components/MemoryFeed.tsx:33–36` |
| ReactMarkdown import + usage + `.markdown` class | `components/ChatPanel.tsx:4,69` |
| Icon-map helper pattern | `lib/observation-icons.ts` (whole file) |
| `handleServerMessage` switch | `hooks/useGeminiSession.ts:116–160` |
| `nextId()` / `restart()` / return object | `hooks/useGeminiSession.ts:71,328–336,338–360` |
| Live-phase JSX to replace | `app/page.tsx:34–71` |
| Animations / `.markdown` to extend | `app/globals.css` (whole file) |

### Constraints (CLAUDE.md / web/AGENTS.md)
- Memory is **never** optional — only ADD read/emit paths, all fail-soft. **No** `CLAUDE_MEM_ENABLED`-style flag.
- All changes additive; must never disturb the live session.

---

## Phase 1 — Backend: emit startup context (`gemini_live.py`)

**What to implement (additive, ~2 lines):**
1. Initialize `session_start_context = ""` immediately *before* the `if memory_sink:` block (just before line 48) so it is always bound.
2. Right after `memory_sink.emit = event_queue.put` (line 128), add — still inside that `if memory_sink:` block:
   ```python
   # Surface the startup memory the model was given (what it "woke up" knowing)
   # to the frontend so the UI can show exactly what the agent sees. Fail-soft:
   # this is just one more event on the same queue main.py already forwards.
   await event_queue.put({"type": "session_context", "markdown": session_start_context})
   ```
   Emit **even when empty** (`markdown == ""`) so the card can show an honest cold-start state.

**Do NOT:** touch `main.py`; add any enable/disable flag; change `fetch_session_start_context`; move the fetch.

**Verification:**
- `grep -n 'session_context' gemini_live.py` → shows the new put.
- `python -c "import ast; ast.parse(open('gemini_live.py').read())"` → parses clean.
- Confirm the put is positioned after `event_queue` is created (line 124) and after `emit` is wired (line 128), and before the drain loop (215).

---

## Phase 2 — Frontend types (`web/lib/gemini-client.ts`)

**What to implement:**
1. Extend the `ServerMessage` union (lines 32–44) with two variants:
   ```ts
   | { type: "session_context"; markdown: string }
   | { type: "tool_call"; name: string; args?: Record<string, unknown>; result?: string }
   ```
2. Add an exported type:
   ```ts
   export type ToolCall = {
     id: number;
     name: string;
     args: Record<string, unknown>;
     result: string;
   };
   ```
3. Update the inbound-contract comment block (lines 14–16) to list `session_context` and `tool_call`.

**Verification:** `npx tsc --noEmit` (or rely on `npm run build`) — no type errors; union members discriminated on `type`.

---

## Phase 3 — Frontend hook (`web/hooks/useGeminiSession.ts`)

**What to implement:**
1. Import `ToolCall` from `@/lib/gemini-client`.
2. Add state:
   ```ts
   const [startupContext, setStartupContext] = useState<string | null>(null);
   const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
   ```
3. In `handleServerMessage` (switch, lines 116–160) add two cases (mirror existing case style):
   ```ts
   case "session_context":
     setStartupContext(msg.markdown ?? "");
     break;
   case "tool_call":
     setToolCalls((prev) => [
       ...prev,
       {
         id: nextId(),
         name: msg.name,
         args: msg.args ?? {},
         result: typeof msg.result === "string" ? msg.result : JSON.stringify(msg.result ?? ""),
       },
     ]);
     break;
   ```
4. In `restart()` (lines 328–336) add: `setStartupContext(null); setToolCalls([]);`
5. Add `startupContext` and `toolCalls` to the returned state object (lines 338–360).

**Do NOT:** change WebSocket transport, the BYOK setup frame, or other cases.

**Verification:** grep the hook for `startupContext`, `toolCalls`, both new cases, the resets, and the return entries. `npm run build` type-checks.

---

## Phase 4 — New component `web/components/StartupContext.tsx`

**What to implement** (mirror `MemoryFeed.tsx` visual language; `"use client"` at top):
- Props: `{ markdown: string | null }`.
- Header bar (copy `MemoryFeed.tsx:19–26`): pulse dot + title **"Startup Memory"** + a subtle badge "injected into system prompt" (e.g. a small slate pill on the right instead of a count).
- Body: scrollable container (`min-h-0 overflow-y-auto`, `flex-1`); when `markdown` is non-empty, render `<div className="markdown"><ReactMarkdown>{markdown}</ReactMarkdown></div>` (import per `ChatPanel.tsx:4`).
- Empty state when `!markdown` (null or `""`): centered muted text **"No prior memory — this is our first session."** plus a one-line hint that memory builds as you talk.
- Root: `flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 h-full` so it fills its grid cell.

**Do NOT:** fetch anything; use `next/image`; add a disable toggle.

**Verification:** renders with a long markdown string (scrolls) and with `null`/`""` (empty state). Lint clean.

---

## Phase 5 — New component `web/components/ToolUse.tsx`

**What to implement** (`"use client"`; mirror MemoryFeed structure + ChatPanel auto-scroll):
- Props: `{ toolCalls: ToolCall[] }`.
- Header bar: pulse dot + title **"Memory Recall"** + count pill (`toolCalls.length`) like MemoryFeed.
- Auto-scroll: `useRef` + `useEffect` on `[toolCalls]` (copy `MemoryFeed.tsx:12–15`).
- Per item (`key={tc.id}`, `animate-pop-in`):
  - A friendly tool chip: map `get_memory_timeline` → "🕒 Timeline lookup", `get_memory_observations` → "🔍 Detail lookup", fallback "🔧 " + raw name. (Inline map object in the file — small; or extend `lib/observation-icons.ts`. Keep it local unless trivial to share.)
  - An args summary line, e.g. `limit: 20` or `ids: [12, 18]` (compactly stringify `tc.args`).
  - A collapsible `<details>` (label "result") whose body shows `tc.result` in a mono, `max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs` block. Default collapsed (results can be large).
- Empty state: **"The agent hasn't looked anything up yet."**
- Root: same card shell as StartupContext (`h-full`, scrollable list region with `min-h-0`).

**Do NOT:** render the result eagerly expanded; assume `args`/`result` shapes beyond the `ToolCall` type.

**Verification:** renders empty state, one timeline call, one observations call; `<details>` toggles; long result scrolls within the card. Lint clean.

---

## Phase 6 — Bento grid CSS (`web/app/globals.css`)

**What to implement** — append plain CSS (Tailwind v4 CSS-first; no config file). Define `.bento` + area classes with **three** breakpoints via `grid-template-areas`:

```css
/* Bento dashboard: groups cards into PERCEPTION | DIALOGUE | MEMORY. */
.bento {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;            /* base: single column */
  grid-template-areas:
    "face"
    "ctrl"
    "video"
    "convo"
    "startup"
    "tools"
    "memory";
}
.area-face { grid-area: face; }
.area-video { grid-area: video; }
.area-controls { grid-area: ctrl; }
.area-convo { grid-area: convo; }
.area-startup { grid-area: startup; }
.area-tools { grid-area: tools; }
.area-memory { grid-area: memory; }

/* md: two columns; conversation tall, memory cards band below. */
@media (min-width: 640px) {
  .bento {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "face   convo"
      "video  convo"
      "ctrl   convo"
      "startup tools"
      "memory memory";
  }
}

/* lg: six-column bento — perception | dialogue | memory. */
@media (min-width: 1024px) {
  .bento {
    grid-template-columns: repeat(6, 1fr);
    grid-auto-rows: minmax(0, auto);
    grid-template-areas:
      "face  face  convo convo startup startup"
      "video video convo convo tools   tools"
      "video video convo convo memory  memory"
      "ctrl  ctrl  convo convo memory  memory";
  }
}
```

Notes:
- Scrollable cells (convo, startup, tools, memory, video) must use `min-h-0` + internal `overflow-y-auto` so the grid doesn't grow unbounded.
- Wrap the grid in a viewport-height dashboard container (e.g. `min-h-[calc(100dvh-…)]` / `lg:h-[calc(100dvh-…)]`) decided in Phase 7.

**Do NOT:** create `tailwind.config.js`; use inline arbitrary multi-line area strings in className.

**Verification:** classes present; `npm run build` compiles CSS without error.

---

## Phase 7 — Wire the bento into `web/app/page.tsx`

**What to implement:** replace the live-phase block (lines 34–71) with the `.bento` grid. Assign area classes; keep all existing components; add the two new cards.

- Outer: `<div className="bento ...">` inside a dashboard-height wrapper.
- **Agent face** (`.area-face`): existing PepeHead `<section>` (keep the "Agent" label + Pepe wiring).
- **Video** (`.area-video`): `<VideoStage … />`.
- **Controls** (`.area-controls`): `<MediaControls … />` (its root is `flex flex-wrap gap-3`; wrap in a card cell if needed for visual parity).
- **Conversation** (`.area-convo`): a flex column containing `<ChatPanel chat={session.chat} />` (flex-1, `min-h-0`) + `<Composer onSend={session.sendText} />`.
- **Startup** (`.area-startup`): `<StartupContext markdown={session.startupContext} />`.
- **Tools** (`.area-tools`): `<ToolUse toolCalls={session.toolCalls} />`.
- **Memory** (`.area-memory`): `<MemoryFeed observations={session.observations} />` (it already caps at `max-h-80`; in-grid let it fill — verify it doesn't overflow the cell; adjust to `h-full`/`min-h-0` if needed).
- Import the two new components.

**Do NOT:** remove any existing card; change the gate/ended phases; alter PepeHead props.

**Verification:** `npm run build` clean; visually confirm all 7 cards render in their regions at lg/md/base widths.

---

## Phase 8 — Final verification

1. `cd web && npm run build` → completes, emits `web/out/`, **zero errors/lint warnings**. (Run `npm run lint` too.)
2. `python -c "import ast; ast.parse(open('gemini_live.py').read())"` → clean.
3. Grep guards:
   - `grep -rn "CLAUDE_MEM_ENABLED" .` → no new occurrences (flag must not be reintroduced).
   - `grep -n "session_context" gemini_live.py web/lib/gemini-client.ts web/hooks/useGeminiSession.ts` → present in all three.
   - `grep -n "tool_call" web/hooks/useGeminiSession.ts` → handler present.
4. Confirm new files exist: `web/components/StartupContext.tsx`, `web/components/ToolUse.tsx`.
5. Confirm `.bento` + 3 breakpoints in `web/app/globals.css`.
6. Sanity: the live session path is unchanged except additive emit — memory pipeline still always-on, fail-soft.

**Anti-pattern guards:** no `tailwind.config.js`; no `next/image`; no API routes; no main.py change; no enable/disable flag; new client components start with `"use client"`.
