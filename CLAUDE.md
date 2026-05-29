# gemini-live-mem

A Gemini Live voice/video web app fused with [claude-mem](https://github.com/thedotmack/claude-mem) so a real-time AI builds a persistent, structured memory of the people it sees and talks to. Live demo: https://gemini-live-mem.fly.dev

The app lives in `gemini-live-genai-python-sdk/`. The repo started as a fork of Google's Gemini Live API examples, so the root `README.md` is upstream docs, and `command-line/`, `gemini-live-ephemeral-tokens-websocket/`, and `browser-agent/` are leftover examples — not part of this project.

## Key files

- `gemini-live-genai-python-sdk/claude_mem_sink.py` — the claude-mem integration (start here)
- `gemini-live-genai-python-sdk/gemini_live.py` — Gemini Live session lifecycle
- `gemini-live-genai-python-sdk/main.py` — FastAPI server + bring-your-own-key intake
- `gemini-live-genai-python-sdk/claude-mem-docker/gemini-live.json` — the memory taxonomy
- `gemini-live-genai-python-sdk/prompts.json` — all prompts
- `gemini-live-genai-python-sdk/{Dockerfile,docker-entrypoint.sh,fly.toml}` — deploy (one image, two processes, Fly)

## How it works

A live audio/video stream is cheaply turned into text (transcripts + frame captions), then POSTed into claude-mem's existing tool-use observation API. A swappable mode JSON (`gemini-live.json`) defines what gets remembered. Memory is opt-in and fail-soft — it must never disturb the live session.

The public demo runs on each visitor's own Gemini key (sent as the first WebSocket frame), and the key derives a per-visitor memory namespace, so no server quota is spent and returning visitors recover their own memory.
