# Plan: Pepe head as the Gemini Live agent's avatar

Bring the floating talking Pepe head from the **pepe-hq** project (`/Users/alexnewman/.superset/projects/Pepe-Agent`) into the **gemini-live-mem** Next.js frontend (`web/`) so it becomes the visual avatar of the Gemini Live agent — it floats, blinks, eye-tracks the cursor, and **lip-syncs to the agent's real voice** via audio amplitude (decided: amplitude, not syllable-timing — Gemini Live gives no word/phoneme timing, so amplitude off the actual PCM playback is the only in-sync option).

## Source of truth (read before writing)

- **Source component:** `/Users/alexnewman/.superset/projects/Pepe-Agent/components/pepe-head/PepeHead.tsx` — the full, working component. Props: `volume` (0–1), `isSpeaking` (bool), `transcript` (string|null), `size` (px). Self-contained: float (sine RAF), blink (random timer), mouse eye-tracking, 5-level volume→mouth-frame map (thresholds 0.1 / 0.3 / 0.52 / 0.74), speaking scale-pulse, speech bubble.
- **Source assets:** `/Users/alexnewman/.superset/projects/Pepe-Agent/public/frames/` (`1-1..1-5.webp` + `*-blink.webp`) and `/Users/alexnewman/.superset/projects/Pepe-Agent/public/eyes/` (`eyes-base/-frame/-pupil-left/-pupil-right.webp`).
- **Target frontend:** `gemini-live-genai-python-sdk/web/` — Next 16.2.6, React 19.2.4, Tailwind v4, **static export** (`output:'export'`, `images:{unoptimized:true}`).
  - `web/hooks/useGeminiSession.ts` — owns the WebSocket + MediaHandler; `getMedia().playAudio()` is where agent PCM arrives (hook line ~201).
  - `web/lib/media-handler.ts` — `playAudio()` (lines 164–197) schedules 24 kHz PCM buffers via `nextStartTime`. **This is the lip-sync tap point.**
  - `web/app/page.tsx` — `phase==="live"` two-column grid; left column = VideoStage + MediaControls + MemoryFeed. **Avatar goes at top of left column.**
  - `web/components/VideoStage.tsx` — convention: plain `<img>` with `{/* eslint-disable-next-line @next/next/no-img-element */}`, NOT `next/image`.

## Allowed APIs / conventions (verified)

- **Animation lib:** `motion` v12, import `{ motion, AnimatePresence } from "motion/react"`. NOT yet a dependency — must `npm install motion` in `web/`.
- **Images:** use plain `<img src="/frames/1-1.webp">` (static export convention). Do NOT use `next/image` (the rest of the app avoids it; AGENTS.md warns Next 16 differs from training data).
- **Web Audio:** `AudioContext.createAnalyser()` → `analyser.getByteTimeDomainData(Uint8Array)` for RMS, or `getByteFrequencyData`. Standard, stable API.
- **`web/AGENTS.md` rule:** "This is NOT the Next.js you know" — before writing Next-specific code, consult `web/node_modules/next/dist/docs/`. (Our changes are plain React + Web Audio + a plain `<img>`, so low Next-API surface, but heed it.)
- **Anti-patterns to avoid:** do not add `next/image`; do not reintroduce any memory enable/disable flag (irrelevant here but per project CLAUDE.md); do not block or break the live session for avatar reasons (avatar is presentation-only, must be fail-soft).

---

## Phase 1 — Assets + dependency

**Do:**
1. Copy `Pepe-Agent/public/frames/*.webp` → `web/public/frames/` and `Pepe-Agent/public/eyes/*.webp` → `web/public/eyes/`.
2. `cd web && npm install motion` (adds `motion` ^12 to `web/package.json` dependencies).

**Verify:**
- `ls web/public/frames` shows 10 webp; `ls web/public/eyes` shows 4 webp.
- `grep '"motion"' web/package.json` succeeds.

---

## Phase 2 — Port the PepeHead component

**Do:** Create `web/components/PepeHead.tsx` by **copying** `Pepe-Agent/components/pepe-head/PepeHead.tsx` verbatim, with exactly these mechanical edits:
1. Remove `import Image from "next/image";`.
2. Replace every `<Image ... fill sizes="240px" .../>` with a plain `<img .../>`: drop `fill`/`sizes`/`priority`; add `className` with `absolute inset-0 h-full w-full object-contain pointer-events-none` (preserve existing `object-contain`, `pointer-events-none`, and the `style={{ objectPosition: "center 55%", ...}}`). Keep the `transform: translate(...)` styles on the pupils. Prefix each with `{/* eslint-disable-next-line @next/next/no-img-element */}`.
3. Keep `motion.img` for the blink overlay as-is (already an img). Add the eslint-disable line above it.
4. Leave all logic (volume thresholds, float, blink, eye-tracking, speech bubble, props interface) unchanged.

**Verify:**
- `grep -n "next/image" web/components/PepeHead.tsx` → no matches.
- `grep -c "no-img-element" web/components/PepeHead.tsx` → one per `<img>` (5 base/eye imgs + 1 blink = 6).
- TypeScript: component still exports `default function PepeHead({volume, transcript, isSpeaking, size})`.

---

## Phase 3 — Tap agent audio for amplitude + speaking state

Goal: `useGeminiSession()` exposes `agentVolume: number` (0–1) and `isAgentSpeaking: boolean`, driven by the real PCM playback. Avatar-only; must never affect audio output or the session.

**Do — `web/lib/media-handler.ts`:**
1. Add fields: `private analyser: AnalyserNode | null = null;` and `private amplitudeData: Uint8Array | null = null;`.
2. In `initializeAudio()`, after the context exists, create the analyser once: `this.analyser = this.audioContext.createAnalyser(); this.analyser.fftSize = 256; this.analyser.smoothingTimeConstant = 0.6; this.amplitudeData = new Uint8Array(this.analyser.frequencyBinCount); this.analyser.connect(this.audioContext.destination);`
3. In `playAudio()`, change `source.connect(this.audioContext.destination)` → `source.connect(this.analyser ?? this.audioContext.destination)`. (Analyser already connects to destination, so audio still reaches speakers unchanged. Fail-soft: if analyser missing, connect direct.)
4. Add `getAgentAmplitude(): number` — `getByteTimeDomainData` on `amplitudeData`, compute RMS around 128 center, normalize to ~0–1 (e.g. `Math.min(1, rms / 0.25)` with a small noise floor). Return 0 if no analyser.
5. Add `isAgentSpeaking(): boolean` — `return !!this.audioContext && this.audioContext.currentTime < this.nextStartTime - 0.05;` (audio still scheduled/playing). `stopAudioPlayback()` already resets `nextStartTime` so interrupts read false immediately.

**Do — `web/hooks/useGeminiSession.ts`:**
6. Add state `const [agentVolume, setAgentVolume] = useState(0); const [agentSpeaking, setAgentSpeaking] = useState(false);` and a `rafRef`.
7. Add a `useEffect` (runs once) that RAF-loops: `const m = mediaRef.current; if (m) { setAgentVolume(m.getAgentAmplitude()); setAgentSpeaking(m.isAgentSpeaking()); }` — guard so it only polls while `phase==="live"`; `cancelAnimationFrame` on cleanup. (useEffect import: add `useEffect` to the existing `react` import.)
8. Optionally expose `agentTranscript`: the text of the current streaming `gemini` bubble (look up `currentGeminiIdRef.current` in `chat`). Keep simple — can pass `null` for v1 and skip the bubble.
9. Add `agentVolume`, `agentSpeaking` (and `agentTranscript` if done) to the hook's returned object.

**Verify:**
- `npm run build` in `web/` typechecks (no TS errors).
- Grep: `getAgentAmplitude` and `isAgentSpeaking` defined in media-handler and called in the hook.
- Audio path unchanged: analyser → destination still present (agent voice must still play).

---

## Phase 4 — Wire the avatar into the UI as the agent's face

**Do — `web/app/page.tsx`:**
1. Import `PepeHead from "@/components/PepeHead"`.
2. At the **top of the left column** (before `<VideoStage>`), add an agent stage: a centered container (e.g. `flex justify-center rounded-xl bg-slate-900 py-6`) rendering
   `<PepeHead volume={session.agentVolume} isSpeaking={session.agentSpeaking} transcript={session.agentTranscript ?? null} size={220} />`.
3. Keep VideoStage (the user's own camera feed sent to Gemini) below it — it's the user's video, distinct from the agent avatar. Optionally relabel headings so it reads "Agent" (Pepe) vs "You" (camera).

**Verify:**
- App builds; in a live session the Pepe head renders, floats, blinks, eye-tracks the cursor, and the mouth moves while the agent talks, going still when it stops.

---

## Phase 5 — Verification (run it for real, memory live)

Per project CLAUDE.md, "run it" = worker live + observations flowing. Do NOT disable memory.

1. `cd web && npm run build` — confirm static export succeeds (writes `web/out/`).
2. `cd web && npm run lint` — zero errors.
3. Boot the worker + app the canonical local way (worker on :37778, `CLAUDE_MEM_WORKER_URL` overridden — see prior session notes / `claude-mem-docker/start.sh`), serving `web/out` via `main.py` on :8080.
4. Use the `browse` skill: open the app, enter a Gemini key, connect, let the agent introduce itself. Confirm:
   - Pepe head visible as the agent avatar, floating + blinking.
   - Mouth animates in sync while agent audio plays; returns to closed/idle when silent.
   - Speaking scale-pulse + indicator dot appear during speech.
   - Eyes track the cursor.
   - Memory feed still flows (avatar did not disturb the session).
5. Screenshot evidence of the talking head mid-speech.

## Done when

The Gemini Live agent is represented by the floating Pepe head, whose mouth lip-syncs to the agent's actual voice, with float/blink/eye-tracking, and the live session + memory pipeline are unaffected.
