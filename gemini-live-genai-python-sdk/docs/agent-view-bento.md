# The Agent-View Bento — show everything the agent sees

*Status: **implemented** on branch `mango-jargon` · 2026-05-30 · frontend (`web/`) + a 1-line emit in `gemini_live.py`*

The live UI is a **bento grid** whose job is a single claim: *you can see everything the Gemini Live agent sees.* Not a chat window with some memory decoration — a dashboard where every input that reaches the model has a card.

## The principle in one sentence

> If the model is given a piece of context, the UI shows that exact piece of context.

## The architectural truth this is built on

"The agent" is the Gemini Live model. Its real context window has four sources. Before this change, two of them were **invisible** even though the data already existed:

| What the model actually sees | Where it comes from | Shown before? |
|---|---|---|
| **System instruction → startup memory** | `memory_sink.fetch_session_start_context()` → `GET /api/context/recent`, injected into the system prompt at session start (`gemini_live.py`) | ❌ never surfaced |
| **Tool results** when it recalls | `get_memory_timeline` / `get_memory_observations` (the recall tools in `claude_mem_sink.live_tools()`) | ❌ emitted over the socket, **dropped** by the frontend |
| **Live multimodal stream** | your mic (PCM16 → server-side transcription), camera/screen JPEG frames, typed text | ✅ chat + video PiP |
| **Its own output** | model audio + output transcription | ✅ Pepe head + chat |

Plus one thing that is *not* in the model's context but is the whole point of the project, so it earns a card: **what claude-mem is extracting live** — the observation feed.

The redesign closes the two gaps and arranges all of it as one legible story.

## The story the layout tells: PERCEPTION │ DIALOGUE │ MEMORY

On a wide screen the bento reads left-to-right as a sentence about the agent's mind:

```
lg (≥1024px), 6 columns:
 ┌──────────┬───────────────┬──────────────┐
 │  FACE    │               │  STARTUP     │  ← what it knew when it woke up
 │ (Pepe)   │               │  MEMORY      │
 ├──────────┤ CONVERSATION  ├──────────────┤
 │  VIDEO   │  (dominant    │  MEMORY      │  ← what it actively looked up
 │ →model   │   2×4 block)  │  RECALL      │
 │  frames  │               ├──────────────┤
 ├──────────┤               │  RECENT      │  ← what it's writing down now
 │ CONTROLS │               │  MEMORIES    │
 └──────────┴───────────────┴──────────────┘
   perception     dialogue        memory
```

- **PERCEPTION (left rail):** the agent's face (Pepe, lip-syncs to the model's voice), the exact JPEG frames sent to the model, and the mic/cam/screen controls.
- **DIALOGUE (center, dominant):** the conversation. Your "user" bubbles are the **live transcription of your own audio** (the session enables `input_audio_transcription`), so this card literally is "what the agent heard you say + what it said back."
- **MEMORY (right rail):** the agent's mind, top-to-bottom in the order memory is experienced — *woke up knowing* → *looked up* → *writing down*.

It collapses honestly:
- **md (640–1023px):** two columns; conversation stays tall; the three memory cards drop to a band beneath.
- **base (<640px):** a single stack ordered by priority — face → controls → video → conversation → startup → tools → memories.

## How a piece of context becomes a card (data flow)

Everything rides the one event channel that already existed: the sink's `emit` → `event_queue` → `gemini_live.start_session()` yields → `main.py` `websocket.send_json(event)` (verbatim, no whitelist) → the browser.

```
gemini_live.py / claude_mem_sink.py            web/ (Next static export)
─────────────────────────────────             ─────────────────────────
fetch_session_start_context()  ──┐
  (markdown injected into the     │  {type:"session_context", markdown}
   system prompt)                 ├──── WS ───► useGeminiSession.handleServerMessage
get_memory_timeline / …          │             ├─ session_context → startupContext  ─► <StartupContext/>
  (model calls a recall tool)  ──┤  {type:"tool_call", name, args, result}
                                  │             ├─ tool_call       → toolCalls[]     ─► <ToolUse/>
worker extracts an observation ──┘  {type:"observation", observation}
  (memory feed poll)                            └─ observation     → observations[]  ─► <MemoryFeed/>
```

### Gap #1 — startup context (the only backend change)
`fetch_session_start_context()` returns the same recent-session markdown the SessionStart hook injects (fail-soft: `""` when there is none). It was already concatenated into the system instruction; now `gemini_live.py` also pushes it to the UI as one event, right after the emit channel is wired:

```python
# gemini_live.py, just after `memory_sink.emit = event_queue.put`
await event_queue.put({"type": "session_context", "markdown": session_start_context})
```

That's it — `main.py` forwards it like any other event, so there is **no `main.py` change**. It is additive and fail-soft, and it fires even when the markdown is empty so the card can show an honest cold-start state.

### Gap #2 — tool-use context (frontend only)
`gemini_live.py` already put `{type:"tool_call", name, args, result}` on the queue for every mapped tool (today that's exactly the two memory-recall tools), and `main.py` already forwarded it. The frontend simply had no handler, so it was dropped. The fix is one `case "tool_call"` in the hook.

## Component inventory

| Card | File | Source of truth |
|---|---|---|
| Agent face | `web/components/PepeHead.tsx` | `agentVolume`, `agentSpeaking` |
| Video → model | `web/components/VideoStage.tsx` | `modelFrame` (the exact JPEG sent) |
| Controls | `web/components/MediaControls.tsx` | mic/cam/screen/disconnect |
| Conversation | `web/components/ChatPanel.tsx` + `Composer.tsx` | `chat` (user transcription + model) |
| **Startup Memory** *(new)* | `web/components/StartupContext.tsx` | `startupContext` |
| **Memory Recall** *(new)* | `web/components/ToolUse.tsx` | `toolCalls[]` |
| Recent Memories | `web/components/MemoryFeed.tsx` | `observations[]` |

**`StartupContext`** renders the injected markdown via `react-markdown` with a subtle "injected into system prompt" badge, and an honest empty state ("No prior memory — this is our first session") on a cold start.

**`ToolUse`** is a live log: a friendly tool chip (`🕒 Timeline lookup`, `🔍 Detail lookup`), a one-line args summary, and a default-collapsed `<details>` holding the raw result (which can be large markdown), auto-scrolling to the newest call.

## The grid is plain CSS, on purpose

This is Tailwind v4 (CSS-first, **no `tailwind.config.js`**). The bento lives in `web/app/globals.css` as a `.bento` grid plus named `.area-*` classes, with three `grid-template-areas` breakpoints. Multi-line area strings are painful as Tailwind arbitrary values, so they are plain CSS — consistent with how `.animate-*` and `.markdown` are already declared there. `page.tsx` just assigns `area-face`, `area-convo`, etc. to each card.

Scrollable cells use `min-h-0 + overflow-y-auto` and the grid is wrapped in a viewport-height container (`lg:h-[calc(100dvh-9rem)]`), so it behaves as a dashboard rather than an ever-growing page.

## Invariants kept (see the repo `CLAUDE.md`)

- **Memory is never optional.** This change only *adds* read/emit paths. No `CLAUDE_MEM_ENABLED`-style flag was introduced, nothing is gated.
- **Fail-soft.** The startup-context emit is one more event on a queue that already swallows failures; an unreachable worker degrades to empty cards, never a broken session.
- **Static export.** All new logic is client-side (`"use client"` components + the hook); it builds into `web/out/` with `next build` and is served by `main.py` — no Next server.

## Running it locally

```bash
# 1. a claude-mem worker on :37777 (memory always-on, fail-soft if absent)
# 2. build the frontend + serve via FastAPI:
cd web && npm run build           # → web/out/
cd .. && PORT=8080 python main.py  # serves web/out + /ws on :8080
# open http://127.0.0.1:8080, paste a Gemini key (with Live access) in the gate
```

The **Memory Recall** card stays empty until you prompt recall — ask the agent *"what do you remember about me?"* and watch it call `get_memory_timeline`, with the result rendered in the card the instant it lands.
