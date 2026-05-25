#!/usr/bin/env bash
# Boot both services in one container:
#   1. the claude-mem worker (localhost:37777) — the memory pipeline
#   2. the FastAPI / Gemini Live app (0.0.0.0:$PORT) — what the phone connects to
#
# The observer runs on the `gemini` provider (same GEMINI_API_KEY as the app), so
# no Claude OAuth/keychain is needed — the only practical option in the cloud.
set -euo pipefail

: "${GEMINI_API_KEY:?GEMINI_API_KEY must be set}"

# --- claude-mem worker configuration -----------------------------------------
export CLAUDE_MEM_DATA_DIR="${CLAUDE_MEM_DATA_DIR:-/data/claude-mem}"
export CLAUDE_MEM_PROVIDER="${CLAUDE_MEM_PROVIDER:-gemini}"
export CLAUDE_MEM_GEMINI_API_KEY="$GEMINI_API_KEY"
export CLAUDE_MEM_GEMINI_MODEL="${CLAUDE_MEM_GEMINI_MODEL:-gemini-2.5-flash}"
export CLAUDE_MEM_MODE="${CLAUDE_MEM_MODE:-gemini-live}"
# Chroma (semantic search) is intentionally off: the live sink only reads back
# chronological context (recent + batch-by-id), which is SQLite-backed. This
# keeps the image lean and the worker boot deterministic. Flip to enable later.
export CLAUDE_MEM_CHROMA_ENABLED="${CLAUDE_MEM_CHROMA_ENABLED:-false}"
export CLAUDE_MEM_WORKER_HOST="${CLAUDE_MEM_WORKER_HOST:-127.0.0.1}"
export CLAUDE_MEM_WORKER_PORT="${CLAUDE_MEM_WORKER_PORT:-37777}"
export CLAUDE_MEM_LOG_LEVEL="${CLAUDE_MEM_LOG_LEVEL:-INFO}"

mkdir -p "$CLAUDE_MEM_DATA_DIR"
# A persisted volume keeps a stale worker.pid (recorded pid=1, always "alive" in
# a fresh container) which would make the worker's duplicate-guard refuse to
# boot. Clear it so the worker starts every time.
rm -f "$CLAUDE_MEM_DATA_DIR/worker.pid"

WORKER="$(npm root -g)/claude-mem/plugin/scripts/worker-service.cjs"

echo "[entrypoint] starting claude-mem worker (provider=$CLAUDE_MEM_PROVIDER, mode=$CLAUDE_MEM_MODE)"
bun "$WORKER" start &

echo "[entrypoint] waiting for claude-mem worker health on :${CLAUDE_MEM_WORKER_PORT} ..."
worker_ok=0
for _ in $(seq 1 60); do
  if curl -sf -m 2 "http://127.0.0.1:${CLAUDE_MEM_WORKER_PORT}/api/health" >/dev/null 2>&1; then
    worker_ok=1
    echo "[entrypoint] claude-mem worker healthy"
    break
  fi
  sleep 1
done
if [[ "$worker_ok" -ne 1 ]]; then
  # Fail-soft: the app must still serve even if memory never came up.
  echo "[entrypoint] WARNING: claude-mem worker not healthy after 60s; app will run without memory" >&2
fi

# --- app -> worker wiring -----------------------------------------------------
export CLAUDE_MEM_ENABLED=true
export CLAUDE_MEM_WORKER_URL="http://127.0.0.1:${CLAUDE_MEM_WORKER_PORT}"
export CLAUDE_MEM_PROJECT="${CLAUDE_MEM_PROJECT:-gemini-live-mem}"

echo "[entrypoint] starting Gemini Live app on :${PORT:-8080}"
exec python3 main.py
