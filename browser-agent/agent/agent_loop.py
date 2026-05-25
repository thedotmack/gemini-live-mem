"""Agent loop: Claude tool-use -> AG-UI events (with a no-key demo fallback).

The loop emits AG-UI events through an async `emit(event)` callback. Event
classes and field names are taken verbatim from the installed `ag_ui.core`
(verified, not from memory):

  - RunStartedEvent / RunFinishedEvent / RunErrorEvent
  - TextMessageStartEvent / TextMessageContentEvent / TextMessageEndEvent
  - ToolCallStartEvent / ToolCallArgsEvent / ToolCallEndEvent / ToolCallResultEvent
  - StateSnapshotEvent / StateDeltaEvent

AG-UI event reference: https://docs.ag-ui.com/concepts/events
AG-UI Python quickstart (SSE pattern): https://docs.ag-ui.com/quickstart/server
Anthropic tool-use + prompt caching:
  https://docs.anthropic.com/en/docs/build-with-claude/tool-use
  https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
"""

from __future__ import annotations

import json
import os
import uuid
from typing import Any, Awaitable, Callable

from ag_ui.core import (
    EventType,
    RunAgentInput,
    StateSnapshotEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    TextMessageStartEvent,
    ToolCallArgsEvent,
    ToolCallEndEvent,
    ToolCallResultEvent,
    ToolCallStartEvent,
)

from browser import BrowserController

# Do NOT use a "google/"-prefixed model with a native SDK client (repo bug #5).
MODEL = "claude-sonnet-4-6"

# When set, navigation is fail-closed: if the request carries no approval
# decision, the agent rejects rather than proceeding. Default off keeps the
# demo flow unblocked. See the HITL note in run loop / README known limitations.
REQUIRE_APPROVAL = os.getenv("BROWSER_AGENT_REQUIRE_APPROVAL", "0") == "1"

EmitFn = Callable[[Any], Awaitable[None]]

SYSTEM_PROMPT = (
    "You are Browser Pilot, an autonomous agent that drives a real web browser "
    "to accomplish a user's goal. You can navigate to URLs, click elements, type "
    "text into fields, and take screenshots. Work step by step: take a screenshot "
    "to see the page, then act. Before navigating to any URL you must call the "
    "navigate tool — the system will ask the human to approve it. When you have "
    "the answer, call the finish tool with a concise answer. Keep narration short."
)

# Anthropic tool schemas (JSON Schema). These mirror BrowserController methods.
TOOLS = [
    {
        "name": "navigate",
        "description": "Navigate the browser to a URL. Requires human approval.",
        "input_schema": {
            "type": "object",
            "properties": {"url": {"type": "string", "description": "Absolute URL to open"}},
            "required": ["url"],
        },
    },
    {
        "name": "click",
        "description": "Click an element matching a CSS selector.",
        "input_schema": {
            "type": "object",
            "properties": {"selector": {"type": "string"}},
            "required": ["selector"],
        },
    },
    {
        "name": "type_text",
        "description": "Type text into an element matching a CSS selector.",
        "input_schema": {
            "type": "object",
            "properties": {"selector": {"type": "string"}, "text": {"type": "string"}},
            "required": ["selector", "text"],
        },
    },
    {
        "name": "screenshot",
        "description": "Capture a screenshot of the current page.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "finish",
        "description": "Finish the task and return the final answer to the user.",
        "input_schema": {
            "type": "object",
            "properties": {"answer": {"type": "string"}},
            "required": ["answer"],
        },
    },
]

# A tiny inline SVG-as-PNG-less data URL used as the fake screenshot in demo
# mode, so chromium/playwright are not required to run the demo.
DEMO_SCREENSHOT = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='800'>"
    "<rect width='1280' height='800' fill='%23191034'/>"
    "<text x='64' y='120' fill='%23ba7bf0' font-family='monospace' font-size='40'>"
    "fly.io</text>"
    "<text x='64' y='200' fill='%23f5f3ff' font-family='monospace' font-size='28'>"
    "Fly Machines pricing</text>"
    "<rect x='64' y='260' width='560' height='120' rx='12' fill='%23221646'/>"
    "<text x='96' y='325' fill='%236EE5C2' font-family='monospace' font-size='26'>"
    "shared-cpu-1x 256MB - $1.94/mo</text>"
    "</svg>"
)


def _new_state(
    url: str = "",
    title: str = "",
    screenshot: str = "",
    status: str = "idle",
    steps: list | None = None,
) -> dict:
    return {
        "url": url,
        "title": title,
        "screenshot": screenshot,
        "status": status,
        "steps": steps or [],
    }


async def _emit_state(emit: EmitFn, state: dict) -> None:
    # StateSnapshotEvent.snapshot holds the full BrowserAgentState (matches the
    # frontend useCoAgent shared-state contract).
    await emit(StateSnapshotEvent(type=EventType.STATE_SNAPSHOT, snapshot=state))


async def _emit_tool_call(
    emit: EmitFn, tool_call_id: str, name: str, args: dict
) -> None:
    """Emit the TOOL_CALL_START / _ARGS / _END trio for one tool call."""
    await emit(
        ToolCallStartEvent(
            type=EventType.TOOL_CALL_START,
            tool_call_id=tool_call_id,
            tool_call_name=name,
        )
    )
    await emit(
        ToolCallArgsEvent(
            type=EventType.TOOL_CALL_ARGS,
            tool_call_id=tool_call_id,
            delta=json.dumps(args),
        )
    )
    await emit(ToolCallEndEvent(type=EventType.TOOL_CALL_END, tool_call_id=tool_call_id))


async def _emit_tool_result(
    emit: EmitFn, tool_call_id: str, content: str
) -> None:
    await emit(
        ToolCallResultEvent(
            type=EventType.TOOL_CALL_RESULT,
            message_id=str(uuid.uuid4()),
            tool_call_id=tool_call_id,
            content=content,
        )
    )


async def _emit_text(emit: EmitFn, text: str) -> None:
    """Stream one assistant text message as START / CONTENT / END."""
    message_id = str(uuid.uuid4())
    await emit(
        TextMessageStartEvent(
            type=EventType.TEXT_MESSAGE_START, message_id=message_id, role="assistant"
        )
    )
    await emit(
        TextMessageContentEvent(
            type=EventType.TEXT_MESSAGE_CONTENT, message_id=message_id, delta=text
        )
    )
    await emit(TextMessageEndEvent(type=EventType.TEXT_MESSAGE_END, message_id=message_id))


def _approval_from_input(input_data: RunAgentInput) -> bool | None:
    """Read a prior human approval decision from the incoming messages.

    HITL is modeled as a tool call the frontend fulfills with a TOOL_CALL_RESULT,
    which CopilotKit feeds back as a `tool` role message. We look for the most
    recent such message and interpret APPROVED / REJECTED. Returns None if there
    is no pending decision (MVP: caller then auto-approves for the demo).
    """
    for msg in reversed(input_data.messages):
        if getattr(msg, "role", None) == "tool":
            content = (getattr(msg, "content", "") or "").upper()
            if "APPROV" in content:
                return True
            if "REJECT" in content or "DENY" in content:
                return False
    return None


# --------------------------------------------------------------------------- #
# Demo fallback (no ANTHROPIC_API_KEY): deterministic canned script.
# --------------------------------------------------------------------------- #
async def _run_demo(input_data: RunAgentInput, emit: EmitFn) -> None:
    steps: list[dict] = []

    steps.append({"id": "s1", "label": "Navigate to fly.io", "detail": "", "state": "running"})
    await _emit_state(emit, _new_state(status="acting", steps=list(steps)))

    nav_id = str(uuid.uuid4())
    await _emit_tool_call(emit, nav_id, "navigate", {"url": "https://fly.io"})
    await _emit_tool_result(emit, nav_id, "navigated to https://fly.io")

    steps[-1]["state"] = "done"
    state = _new_state(
        url="https://fly.io",
        title="Fly.io",
        screenshot=DEMO_SCREENSHOT,
        status="acting",
        steps=list(steps),
    )
    await _emit_state(emit, state)

    steps.append({"id": "s2", "label": "Screenshot page", "detail": "", "state": "running"})
    await _emit_state(emit, _new_state(url="https://fly.io", title="Fly.io",
                                       screenshot=DEMO_SCREENSHOT, status="acting",
                                       steps=list(steps)))

    shot_id = str(uuid.uuid4())
    await _emit_tool_call(emit, shot_id, "screenshot", {})
    await _emit_tool_result(emit, shot_id, "captured screenshot (1280x800)")

    steps.append({"id": "s3", "label": "Open pricing page", "detail": "", "state": "running"})
    nav2_id = str(uuid.uuid4())
    await _emit_tool_call(emit, nav2_id, "navigate", {"url": "https://fly.io/docs/about/pricing/"})
    await _emit_tool_result(emit, nav2_id, "navigated to pricing")
    steps[-2]["state"] = "done"
    steps[-1]["state"] = "done"

    final_state = _new_state(
        url="https://fly.io/docs/about/pricing/",
        title="Fly.io · Pricing",
        screenshot=DEMO_SCREENSHOT,
        status="done",
        steps=list(steps),
    )
    await _emit_state(emit, final_state)

    await _emit_text(
        emit,
        "I opened fly.io and found Machine pricing: a shared-cpu-1x machine with "
        "256MB RAM runs about $1.94/month when always on, billed per second. "
        "(Demo mode — set ANTHROPIC_API_KEY to drive a live browser.)",
    )


# --------------------------------------------------------------------------- #
# Live mode: Claude tool-use loop driving Playwright.
# --------------------------------------------------------------------------- #
async def _run_live(input_data: RunAgentInput, emit: EmitFn) -> None:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic()
    browser = BrowserController()
    steps: list[dict] = []

    # Seed the conversation from the user's latest message.
    user_text = ""
    for msg in input_data.messages:
        if getattr(msg, "role", None) == "user":
            content = getattr(msg, "content", "")
            if isinstance(content, str):
                user_text = content
    messages: list[dict] = [{"role": "user", "content": user_text or "Browse the web."}]

    await _emit_state(emit, _new_state(status="thinking", steps=list(steps)))

    try:
        for _ in range(12):  # hard step cap for the MVP
            # prompt caching on the system block (cache_control on the system text)
            response = await client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                tools=TOOLS,
                messages=messages,
            )

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            assistant_text = "".join(
                b.text for b in response.content if b.type == "text"
            )

            # Record the assistant turn (with tool_use blocks) for the next call.
            messages.append({"role": "assistant", "content": response.content})

            if not tool_uses:
                if assistant_text:
                    await _emit_text(emit, assistant_text)
                break

            tool_results: list[dict] = []
            finished = False
            for tu in tool_uses:
                name = tu.name
                args = tu.input or {}
                tool_call_id = tu.id

                if name == "finish":
                    await _emit_state(
                        emit,
                        _new_state(
                            **{**(await _safe_current(browser)), "status": "done", "steps": list(steps)}
                        ),
                    )
                    await _emit_text(emit, args.get("answer", "Done."))
                    finished = True
                    break

                # HITL: navigate surfaces a `request_approval` tool call so the UI
                # renders the approve/reject card, then reads any decision the
                # client already echoed back in the incoming messages.
                #
                # MVP limitation: one SSE run can't block on a click that only
                # happens after the stream starts — true pause/resume needs
                # cross-run state (follow-up; see README "Known limitations"). So:
                #   explicit REJECT in request          -> reject
                #   no decision + REQUIRE_APPROVAL set   -> fail closed (reject)
                #   otherwise (approve, or no decision)  -> proceed (demo-friendly)
                if name == "navigate":
                    approval_id = str(uuid.uuid4())
                    await _emit_tool_call(
                        emit,
                        approval_id,
                        "request_approval",
                        {"action": "navigate", "url": args.get("url", "")},
                    )
                    await _emit_state(
                        emit,
                        _new_state(status="waiting_approval", steps=list(steps)),
                    )
                    decision = _approval_from_input(input_data)
                    rejected = decision is False or (decision is None and REQUIRE_APPROVAL)
                    if rejected:
                        await _emit_tool_result(emit, approval_id, "REJECTED")
                        reason = (
                            "User rejected navigation."
                            if decision is False
                            else "Navigation blocked: approval required but not granted."
                        )
                        tool_results.append(
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_call_id,
                                "content": reason,
                            }
                        )
                        continue
                    await _emit_tool_result(emit, approval_id, "APPROVED")

                step_id = str(uuid.uuid4())
                steps.append({"id": step_id, "label": f"{name}", "detail": json.dumps(args), "state": "running"})
                await _emit_tool_call(emit, tool_call_id, name, args)
                await _emit_state(emit, _new_state(status="acting", steps=list(steps)))

                result_text = await _execute_tool(browser, name, args)

                steps[-1]["state"] = "done"
                cur = await _safe_current(browser)
                shot = await _safe_screenshot(browser)
                await _emit_state(
                    emit,
                    _new_state(
                        url=cur.get("url", ""),
                        title=cur.get("title", ""),
                        screenshot=shot,
                        status="acting",
                        steps=list(steps),
                    ),
                )
                await _emit_tool_result(emit, tool_call_id, result_text)
                # Feed the captured page image back to Claude for the screenshot
                # tool so the model can actually SEE the page (Anthropic
                # tool_result image block). `shot` is a data URL:
                # data:<media_type>;base64,<data>.
                if name == "screenshot" and shot.startswith("data:") and ";base64," in shot:
                    header, b64 = shot.split(";base64,", 1)
                    media_type = header[len("data:"):] or "image/png"
                    result_content: Any = [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64,
                            },
                        },
                        {"type": "text", "text": result_text},
                    ]
                else:
                    result_content = result_text
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_call_id,
                        "content": result_content,
                    }
                )

            if finished:
                break

            messages.append({"role": "user", "content": tool_results})
    finally:
        await browser.close()


async def _execute_tool(browser: BrowserController, name: str, args: dict) -> str:
    if name == "navigate":
        await browser.navigate(args["url"])
        return f"navigated to {args['url']}"
    if name == "click":
        await browser.click(args["selector"])
        return f"clicked {args['selector']}"
    if name == "type_text":
        await browser.type_text(args["selector"], args["text"])
        return f"typed into {args['selector']}"
    if name == "screenshot":
        await browser.screenshot()
        return "captured screenshot"
    return f"unknown tool {name}"


async def _safe_current(browser: BrowserController) -> dict:
    try:
        return await browser.current()
    except Exception:
        return {"url": "", "title": ""}


async def _safe_screenshot(browser: BrowserController) -> str:
    try:
        return await browser.screenshot()
    except Exception:
        return ""


async def run_agent(input_data: RunAgentInput, emit: EmitFn) -> None:
    """Drive the agent, emitting AG-UI events via `emit`.

    Demo fallback: with no ANTHROPIC_API_KEY, run the deterministic canned
    script (no Claude, no chromium required).
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        await _run_demo(input_data, emit)
    else:
        await _run_live(input_data, emit)
