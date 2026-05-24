"""Single source of truth for every prompt the running app uses.

All LLM-facing instructions, tool descriptions, and spoken/greeting strings live
in prompts.json next to this module. Import PROMPTS and read from it — never
hard-code prompt text in the app code again.

Fail-fast on purpose: a missing or malformed prompts.json is a deploy error, so
we let json.load raise rather than silently falling back to baked-in defaults.
"""
import json
from pathlib import Path

PROMPTS_PATH = Path(__file__).with_name("prompts.json")

with PROMPTS_PATH.open(encoding="utf-8") as prompts_file:
    PROMPTS = json.load(prompts_file)
