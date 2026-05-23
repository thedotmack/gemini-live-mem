"""Fail-soft sink that forwards Gemini Live conversation data into the normal
claude-mem ingestion pipeline.

Each completed turn (and each Gemini tool call) is sent to the claude-mem worker
as a tool-use observation via POST /api/sessions/observations -- the exact path a
Claude Code PostToolUse hook uses. The worker queues it, runs its LLM extraction
generator, and stores a structured observation. We invent no new storage; we just
feed the existing pipeline.

Entirely opt-in (CLAUDE_MEM_ENABLED) and entirely fail-soft: a missing/unreachable
worker, or any error here, must never disturb the live audio session.
"""
import logging
import os
import uuid

import httpx

logger = logging.getLogger(__name__)

# The synthetic tool name a conversational turn is recorded under.
TURN_TOOL_NAME = "GeminiLiveTurn"
PLATFORM_SOURCE = "gemini-live"


def make_memory_sink_if_enabled():
    """Return a MemorySink when CLAUDE_MEM_ENABLED is truthy, else None.

    This is the only symbol gemini_live.py needs to import, keeping claude-mem
    coupling to a single call site.
    """
    if os.getenv("CLAUDE_MEM_ENABLED", "false").lower() not in ("1", "true", "yes", "on"):
        return None
    return MemorySink()


class MemorySink:
    def __init__(self):
        self.worker_url = os.getenv("CLAUDE_MEM_WORKER_URL", "http://127.0.0.1:37777").rstrip("/")
        self.project = os.getenv("CLAUDE_MEM_PROJECT", "gemini-live-mem")
        self.cwd = os.getcwd()
        self.content_session_id = f"gemini-live-{uuid.uuid4()}"
        self._client = httpx.AsyncClient(timeout=10.0)
        # Per-turn transcript buffers; flushed on turn_complete / interrupted.
        self._user_text = []
        self._gemini_text = []

    async def on_session_start(self):
        """Create the claude-mem session row (POST /api/sessions/init)."""
        await self._post(
            "/api/sessions/init",
            {
                "contentSessionId": self.content_session_id,
                "project": self.project,
                "prompt": "Gemini Live session",
                "platformSource": PLATFORM_SOURCE,
            },
        )

    async def on_event(self, event):
        """Consume one event from the GeminiLive drain loop."""
        if not isinstance(event, dict):
            return
        event_type = event.get("type")
        if event_type == "user":
            self._user_text.append(event.get("text", ""))
        elif event_type == "gemini":
            self._gemini_text.append(event.get("text", ""))
        elif event_type in ("turn_complete", "interrupted"):
            await self._flush_turn()
        elif event_type == "tool_call":
            # Flush pending transcript first so observations stay in chronological order.
            await self._flush_turn()
            # A real Gemini tool use maps 1:1 onto a claude-mem tool-use observation.
            await self._post_observation(
                tool_name=event.get("name", "tool_call"),
                tool_input=event.get("args", {}),
                tool_response={"result": event.get("result")},
            )

    async def on_session_end(self):
        """Flush any trailing partial turn and close the HTTP client."""
        await self._flush_turn()
        try:
            await self._client.aclose()
        except Exception as e:
            logger.debug(f"claude-mem sink close failed: {e}")

    async def _flush_turn(self):
        user_text = "".join(self._user_text).strip()
        gemini_text = "".join(self._gemini_text).strip()
        self._user_text = []
        self._gemini_text = []
        if not user_text and not gemini_text:
            return
        await self._post_observation(
            tool_name=TURN_TOOL_NAME,
            tool_input={"user": user_text},
            tool_response={"gemini": gemini_text},
        )

    async def _post_observation(self, tool_name, tool_input, tool_response):
        await self._post(
            "/api/sessions/observations",
            {
                "contentSessionId": self.content_session_id,
                "tool_name": tool_name,
                "tool_input": tool_input,
                "tool_response": tool_response,
                "cwd": self.cwd,
                "platformSource": PLATFORM_SOURCE,
            },
        )

    async def _post(self, path, body):
        """POST to the worker, swallowing every error. Never disturbs the session."""
        try:
            response = await self._client.post(f"{self.worker_url}{path}", json=body)
            if response.status_code >= 400:
                logger.warning(f"claude-mem {path} -> {response.status_code}: {response.text[:200]}")
            else:
                logger.debug(f"claude-mem {path} -> {response.status_code}")
        except Exception as e:
            logger.debug(f"claude-mem {path} failed: {e}")
