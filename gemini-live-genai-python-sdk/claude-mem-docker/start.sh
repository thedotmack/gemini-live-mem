#!/usr/bin/env bash
# Launch an ISOLATED claude-mem worker in Docker for the Gemini Live pipeline.
#
# Why isolated: the host already runs a claude-mem worker on :37777 in the
# global "code" mode, capturing your normal dev work. We do NOT touch it. This
# is a second, standalone worker — own data dir, own port, own mode — so the
# gemini-live-mem sink can POST conversation/visual turns without affecting it.
#
#   Image:     claude-mem:basic
#   Mode:      gemini-live   (mounted into the image's modes dir)
#   Provider:  claude        (Anthropic Claude WRITES the observations, same as
#                             the host worker — see AUTH below)
#   Reachable: http://127.0.0.1:${HOST_PORT:-37778}   (host :37777 is the real worker)
#
# MODE NAME != PROVIDER (this is the trap that kept biting us):
#   "gemini-live" is only the MODE — it describes WHAT we observe (a Gemini Live
#   session). It does NOT mean the observer should run on Gemini. The observer
#   PROVIDER is `claude` (CLAUDE_MEM_MODEL=claude-sonnet-4-6 in settings.json),
#   exactly like the host worker. Do not "fix" this back to gemini.
#
# DO NOT CONFLATE THE TWO MODELS:
#   * The Gemini Live CONVERSATION model lives in ../.env (MODEL=...) and powers
#     the live voice/video app. This script never touches it.
#   * The OBSERVER/EXTRACTION model is claude-mem's concern: CLAUDE_MEM_MODEL.
#
# AUTH: the `claude` provider uses Claude Code subscription (OAuth), not an API
# key. The container has no keychain, so we extract the host's OAuth creds
# (keychain 'Claude Code-credentials', else ~/.claude/.credentials.json), mount
# them read-only, and the image entrypoint copies them into ~/.claude. This
# mirrors claude-mem's shipped docker/claude-mem/run.sh. NOTE: OAuth tokens
# expire — re-run this script to refresh the creds before a long idle gap.
# (GEMINI_API_KEY from ../.env is still injected, for the Python vision captioner.)

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA="$DIR/data"
ENV_FILE="$DIR/../.env"
NAME="${CONTAINER_NAME:-gemini-live-mem-worker}"
TAG="${TAG:-claude-mem:basic}"
HOST_PORT="${HOST_PORT:-37778}"

# --- single source of truth for the API key: ../.env -------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[start] ERROR: $ENV_FILE not found (need GEMINI_API_KEY)" >&2
  exit 1
fi
GEMINI_API_KEY="$(grep -E '^GEMINI_API_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [[ -z "$GEMINI_API_KEY" ]]; then
  echo "[start] ERROR: GEMINI_API_KEY is empty in $ENV_FILE" >&2
  exit 1
fi
echo "[start] using GEMINI_API_KEY from .env (…${GEMINI_API_KEY: -6})"

# --- Claude subscription auth: extract the host OAuth creds for the worker -----
# The `claude` provider authenticates via Claude Code's OAuth token. The isolated
# container has no keychain, so extract the host creds and mount them in (same
# approach as claude-mem's shipped docker/claude-mem/run.sh). The host filename is
# irrelevant — it is mounted to /auth/.credentials.json and the entrypoint copies
# it to ~/.claude/.credentials.json inside the container.
AUTH_DIR="$DIR/.auth"
mkdir -p "$AUTH_DIR" && chmod 700 "$AUTH_DIR"
CREDS_FILE="$(mktemp "$AUTH_DIR/creds.XXXXXX")"
trap 'rm -f "$CREDS_FILE"' EXIT
creds_ok=0
if [[ "$(uname)" == "Darwin" ]] \
   && security find-generic-password -s 'Claude Code-credentials' -w > "$CREDS_FILE" 2>/dev/null \
   && [[ -s "$CREDS_FILE" ]]; then
  creds_ok=1
elif [[ -f "$HOME/.claude/.credentials.json" ]]; then
  cp "$HOME/.claude/.credentials.json" "$CREDS_FILE" && creds_ok=1
fi
if [[ "$creds_ok" -ne 1 ]]; then
  echo "[start] ERROR: no Claude OAuth creds (keychain 'Claude Code-credentials' or ~/.claude/.credentials.json)." >&2
  echo "        Run 'claude login' on the host, or set CLAUDE_MEM_PROVIDER=gemini in settings.json to fall back." >&2
  exit 1
fi
chmod 600 "$CREDS_FILE"
echo "[start] extracted Claude OAuth creds for provider=claude (subscription auth)"

mkdir -p "$DATA"

# Render the runtime settings.json into the data dir, injecting the Gemini key
# from .env and the Telegram security_alert brainbeat keys from the host's
# ~/.claude-mem/settings.json (single source of truth). The repo's settings.json
# keeps placeholders so no key or bot token is ever committed. If no Telegram
# creds are found on the host, the notifier stays disabled (no junk requests).
HOST_CM_SETTINGS="${HOME}/.claude-mem/settings.json"
GEMINI_API_KEY="$GEMINI_API_KEY" HOST_CM_SETTINGS="$HOST_CM_SETTINGS" \
  python3 - "$DIR/settings.json" "$DATA/settings.json" <<'PY'
import json, os, sys
src, dst = sys.argv[1], sys.argv[2]
cfg = json.load(open(src))
cfg["CLAUDE_MEM_GEMINI_API_KEY"] = os.environ["GEMINI_API_KEY"]

# Inherit the Telegram brainbeat config from the host claude-mem so the
# isolated worker pushes security_alert observations to the same chat.
host = os.environ.get("HOST_CM_SETTINGS", "")
host_cfg = {}
if host and os.path.exists(host):
    try:
        host_cfg = json.load(open(host))
    except Exception:
        host_cfg = {}
for key in (
    "CLAUDE_MEM_TELEGRAM_ENABLED",
    "CLAUDE_MEM_TELEGRAM_BOT_TOKEN",
    "CLAUDE_MEM_TELEGRAM_CHAT_ID",
    "CLAUDE_MEM_TELEGRAM_TRIGGER_TYPES",
    "CLAUDE_MEM_TELEGRAM_TRIGGER_CONCEPTS",
):
    value = host_cfg.get(key)
    if value not in (None, "", "__INJECTED_FROM_ENV__"):
        cfg[key] = value

# Fail safe: only enable the notifier if a real bot token + chat id landed.
token = cfg.get("CLAUDE_MEM_TELEGRAM_BOT_TOKEN", "")
chat = cfg.get("CLAUDE_MEM_TELEGRAM_CHAT_ID", "")
if token in ("", "__INJECTED_FROM_ENV__") or chat in ("", "__INJECTED_FROM_ENV__"):
    cfg["CLAUDE_MEM_TELEGRAM_ENABLED"] = "false"

json.dump(cfg, open(dst, "w"), indent=2)
print("telegram_wired" if cfg.get("CLAUDE_MEM_TELEGRAM_ENABLED") == "true" else "telegram_disabled")
PY

if grep -q '"CLAUDE_MEM_TELEGRAM_ENABLED": "true"' "$DATA/settings.json"; then
  echo "[start] Telegram security_alert brainbeat wired from ~/.claude-mem"
else
  echo "[start] Telegram notifier disabled (no creds in ~/.claude-mem/settings.json)"
fi

# Clear the stale PID file from a previous container. It records pid=1, and
# pid 1 is always "alive" in a fresh container, so the worker's duplicate-guard
# would refuse to start and exit 0. Removing it lets the server boot.
rm -f "$DATA/worker.pid"

docker rm -f "$NAME" >/dev/null 2>&1 || true

# Optional: override the image's bundled worker scripts with a newer local build
# (e.g. a 12.3.x worktree that has the Telegram notifier the baked image lacks).
#   WORKER_SCRIPTS_DIR=/path/to/claude-mem/plugin/scripts ./start.sh
SCRIPTS_MOUNT=()
if [[ -n "${WORKER_SCRIPTS_DIR:-}" ]]; then
  echo "[start] overriding worker scripts with $WORKER_SCRIPTS_DIR (telegram-capable build)"
  SCRIPTS_MOUNT=(-v "${WORKER_SCRIPTS_DIR}:/opt/claude-mem/scripts:ro")
fi

echo "[start] launching $NAME ($TAG) -> http://127.0.0.1:${HOST_PORT}"
docker run -d --name "$NAME" \
  -p "${HOST_PORT}:37777" \
  -e CLAUDE_MEM_CREDENTIALS_FILE=/auth/.credentials.json \
  -v "$CREDS_FILE:/auth/.credentials.json:ro" \
  -v "$DATA:/home/node/.claude-mem" \
  -v "$DIR/gemini-live.json:/opt/claude-mem/modes/gemini-live.json:ro" \
  ${SCRIPTS_MOUNT[@]+"${SCRIPTS_MOUNT[@]}"} \
  "$TAG" \
  bun /opt/claude-mem/scripts/worker-service.cjs --daemon

echo "[start] waiting for worker health ..."
for i in $(seq 1 30); do
  if curl -sf -m 2 "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null 2>&1; then
    echo "[start] worker healthy on http://127.0.0.1:${HOST_PORT}"
    exit 0
  fi
  sleep 1
done

echo "[start] WARNING: health check did not pass in 30s. Recent logs:" >&2
docker logs --tail 60 "$NAME" >&2 || true
exit 1
