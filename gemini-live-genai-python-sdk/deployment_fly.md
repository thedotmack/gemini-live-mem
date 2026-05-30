# Deploying to Fly.io (app + claude-mem memory)

This deploys a **single Fly machine** that runs both:

1. the **Gemini Live app** (FastAPI, port 8080) — what your phone connects to, and
2. the **claude-mem worker** (port 37777, localhost-only) — the memory pipeline.

The observer runs on the **`gemini` provider** (the same `GEMINI_API_KEY` as the
app), so no Claude OAuth/keychain is needed — the only practical option in the
cloud. Memory is stored in SQLite on a **persistent volume**, so it survives
restarts and redeploys.

> WebSockets are why this runs on Fly and not Vercel: the live audio/video stream
> needs a long-lived WebSocket and a long-running worker process. Fly runs a
> persistent container with native WS support and automatic HTTPS on
> `*.fly.dev` (mobile browsers require HTTPS for microphone access).

## Prerequisites

- A [Fly.io](https://fly.io) account.
- `flyctl` installed: `curl -fsSL https://fly.io/install.sh | sh`
- Your Gemini API key from [Google AI Studio](https://aistudio.google.com/).

## Deploy

Run all commands from this directory (`gemini-live-genai-python-sdk/`):

```bash
# 1. Log in
fly auth login

# 2. Create the app. The name must be globally unique — if "gemini-live-mem" is
#    taken, pick another and update the `app` line in fly.toml to match.
fly apps create gemini-live-mem

# 3. Pick a region close to you (lower voice latency). List them: `fly platform regions`.
#    Default in fly.toml is "iad" (US East). Change `primary_region` if needed.

# 4. Create the persistent volume for the memory database (same name as the
#    [[mounts]] source in fly.toml, same region as primary_region).
fly volumes create claude_mem_data --region iad --size 1 -a gemini-live-mem

# 5. Set your Gemini key as a secret (used by the app AND the memory observer).
fly secrets set GEMINI_API_KEY=YOUR_KEY_HERE -a gemini-live-mem

# 6. Deploy (builds the image on Fly's remote builder).
fly deploy
```

Then open `https://gemini-live-mem.fly.dev` on your phone, allow mic/camera, and talk.

## Verify

```bash
fly logs -a gemini-live-mem            # look for "claude-mem worker healthy" then the app starting
fly ssh console -a gemini-live-mem -C "curl -s http://127.0.0.1:37777/api/health"
```

## Tuning (optional env / secrets)

Set with `fly secrets set KEY=value -a gemini-live-mem` (triggers a redeploy):

| Variable | Default | Purpose |
|---|---|---|
| `MODEL` | `gemini-3.1-flash-live-preview` | Live conversation model |
| `CLAUDE_MEM_GEMINI_MODEL` | `gemini-2.5-flash` | Observer/extraction model |
| `CLAUDE_MEM_VISION_ENABLED` | `true` | Autonomous video-frame captioning into memory |
| `CLAUDE_MEM_INVITATION_ENABLED` | `true` | Auto event-invitation image generation |
| `CLAUDE_MEM_CHROMA_ENABLED` | `true` | Semantic vector search (chroma-mcp via `uvx`, persistent index on the `/data` volume) — powers semantic memory recall |

## Notes & gotchas

- **Do not scale out.** The app and worker share `localhost`, and the volume
  attaches to one machine only. Keep it at a single machine
  (`min_machines_running = 1`, `auto_stop_machines = "off"` in fly.toml).
- **Memory persistence** lives on the `claude_mem_data` volume at `/data`.
  Destroying the volume wipes all observations.
- The memory sink is **fail-soft**: if the worker is down, the live session still
  works, it just won't record/recall.
