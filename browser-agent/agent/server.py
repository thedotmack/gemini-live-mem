"""FastAPI AG-UI server for the interactive browser agent.

Single SSE endpoint `POST /` accepting a RunAgentInput and streaming AG-UI
events. Demo mode (no ANTHROPIC_API_KEY) streams a deterministic canned run.

AG-UI Python quickstart / SSE pattern: https://docs.ag-ui.com/quickstart/server
EventEncoder(accept=...) negotiates SSE vs binary protobuf based on the
Accept header. Wire format is camelCase (e.g. {"type":"RUN_STARTED",
"threadId":...}) even though the Python model fields are snake_case.
"""

from __future__ import annotations

import os

from ag_ui.core import (
    EventType,
    RunAgentInput,
    RunErrorEvent,
    RunFinishedEvent,
    RunStartedEvent,
)
from ag_ui.encoder import EventEncoder
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agent_loop import run_agent

load_dotenv()

app = FastAPI(title="Browser Pilot Agent")

# Permissive CORS for the local Next.js dev server.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


def _is_demo() -> bool:
    return not os.environ.get("ANTHROPIC_API_KEY")


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "demo": _is_demo()}


@app.post("/")
async def endpoint(input_data: RunAgentInput, request: Request) -> StreamingResponse:
    encoder = EventEncoder(accept=request.headers.get("accept"))

    async def event_generator():
        # RUN_STARTED first, then delegate to the agent loop, ensuring a
        # RUN_FINISHED (or RUN_ERROR) terminal event no matter what.
        yield encoder.encode(
            RunStartedEvent(
                type=EventType.RUN_STARTED,
                thread_id=input_data.thread_id,
                run_id=input_data.run_id,
            )
        )
        try:
            # run_agent uses a push-style emit(event) callback; _drive adapts
            # it into this pull-style generator via an asyncio queue.
            async for encoded in _drive(encoder, input_data):
                yield encoded

            yield encoder.encode(
                RunFinishedEvent(
                    type=EventType.RUN_FINISHED,
                    thread_id=input_data.thread_id,
                    run_id=input_data.run_id,
                )
            )
        except Exception as exc:  # fail fast, but emit a terminal RUN_ERROR
            yield encoder.encode(
                RunErrorEvent(type=EventType.RUN_ERROR, message=str(exc))
            )

    return StreamingResponse(event_generator(), media_type="text/event-stream")


async def _drive(encoder: EventEncoder, input_data: RunAgentInput):
    """Adapt run_agent's push-style `emit` callback into a pull-style async
    generator of encoded SSE strings, using an asyncio queue."""
    import asyncio

    queue: asyncio.Queue = asyncio.Queue()
    _SENTINEL = object()

    async def emit(event):
        await queue.put(encoder.encode(event))

    async def runner():
        try:
            await run_agent(input_data, emit)
        finally:
            await queue.put(_SENTINEL)

    task = asyncio.create_task(runner())
    try:
        while True:
            item = await queue.get()
            if item is _SENTINEL:
                break
            yield item
        # surface any exception raised inside run_agent
        await task
    finally:
        if not task.done():
            task.cancel()
