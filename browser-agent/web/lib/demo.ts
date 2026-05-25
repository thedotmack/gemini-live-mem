// Seeded demo state for the screenshot deliverable.
// When NEXT_PUBLIC_DEMO !== "0" (default ON) the UI renders this fully-populated
// state so the whole experience looks great WITHOUT the Python backend or any API key.
// See PLAN.md "Demo mode (critical for the screenshot deliverable)".

import type { BrowserAgentState } from "./types";

// Self-contained inline SVG (base64 data URL) that mocks a fly.io-style pricing
// page in the violet/navy palette. No network image is fetched.
const MOCK_SCREENSHOT_SVG_BASE64 =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjgwIiBoZWlnaHQ9IjgwMCIgdmlld0JveD0iMCAwIDEyODAgODAwIj4KICA8ZGVmcz4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0iaGVybyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjNTA0NmU0Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNTUlIiBzdG9wLWNvbG9yPSIjOTk2YmVjIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2JhN2JmMCIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0icGFnZSIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWQxMjNmIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzE1MGQyYyIvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxmaWx0ZXIgaWQ9InNvZnQiIHg9Ii0yMCUiIHk9Ii0yMCUiIHdpZHRoPSIxNDAlIiBoZWlnaHQ9IjE0MCUiPgogICAgICA8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPSIxOCIvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIxMjgwIiBoZWlnaHQ9IjgwMCIgZmlsbD0idXJsKCNwYWdlKSIvPgogIDxjaXJjbGUgY3g9IjEwODAiIGN5PSIxMjAiIHI9IjIyMCIgZmlsbD0iIzdjM2FlZCIgb3BhY2l0eT0iMC4zNSIgZmlsdGVyPSJ1cmwoI3NvZnQpIi8+CiAgPGNpcmNsZSBjeD0iMjIwIiBjeT0iNzAwIiByPSIxODAiIGZpbGw9IiM1MDQ2ZTQiIG9wYWNpdHk9IjAuMzAiIGZpbHRlcj0idXJsKCNzb2Z0KSIvPgogIDwhLS0gdG9wIG5hdiAtLT4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MiIgZmlsbD0iIzE5MTAzNCIgb3BhY2l0eT0iMC44NSIvPgogIDxjaXJjbGUgY3g9IjU2IiBjeT0iMzYiIHI9IjE0IiBmaWxsPSJ1cmwoI2hlcm8pIi8+CiAgPHJlY3QgeD0iODAiIHk9IjI4IiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE2IiByeD0iOCIgZmlsbD0iI2Y1ZjNmZiIgb3BhY2l0eT0iMC45Ii8+CiAgPHJlY3QgeD0iOTAwIiB5PSIyNiIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiByeD0iMTAiIGZpbGw9IiMyYTFjNTQiLz4KICA8cmVjdCB4PSIxMDAwIiB5PSIyNiIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiByeD0iMTAiIGZpbGw9IiMyYTFjNTQiLz4KICA8cmVjdCB4PSIxMTEwIiB5PSIyNCIgd2lkdGg9IjEyMCIgaGVpZ2h0PSIyNCIgcng9IjEyIiBmaWxsPSJ1cmwoI2hlcm8pIi8+CiAgPCEtLSBoZXJvIGhlYWRpbmcgLS0+CiAgPHJlY3QgeD0iODAiIHk9IjE1MCIgd2lkdGg9IjUyMCIgaGVpZ2h0PSIzNCIgcng9IjgiIGZpbGw9IiNmNWYzZmYiLz4KICA8cmVjdCB4PSI4MCIgeT0iMjAwIiB3aWR0aD0iNDIwIiBoZWlnaHQ9IjM0IiByeD0iOCIgZmlsbD0iI2Y1ZjNmZiIgb3BhY2l0eT0iMC45MiIvPgogIDxyZWN0IHg9IjgwIiB5PSIyNjYiIHdpZHRoPSI1NjAiIGhlaWdodD0iMTQiIHJ4PSI3IiBmaWxsPSIjOTY5OEI2Ii8+CiAgPHJlY3QgeD0iODAiIHk9IjI5MiIgd2lkdGg9IjUwMCIgaGVpZ2h0PSIxNCIgcng9IjciIGZpbGw9IiM5Njk4QjYiLz4KICA8IS0tIHByaWNpbmcgY2FyZCBoaWdobGlnaHRlZCAtLT4KICA8cmVjdCB4PSI4MCIgeT0iMzYwIiB3aWR0aD0iMzYwIiBoZWlnaHQ9IjMwMCIgcng9IjIwIiBmaWxsPSIjMjIxNjQ2IiBzdHJva2U9IiM3YzNhZWQiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxyZWN0IHg9IjExMiIgeT0iMzk2IiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjIwIiByeD0iMTAiIGZpbGw9IiNiYTdiZjAiLz4KICA8dGV4dCB4PSIxMTIiIHk9IjQ3MCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSI1NiIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2Y1ZjNmZiI+JDAuMDAwMDAwODwvdGV4dD4KICA8cmVjdCB4PSIxMTIiIHk9IjQ5MiIgd2lkdGg9IjIyMCIgaGVpZ2h0PSIxNCIgcng9IjciIGZpbGw9IiM2NzZCODkiLz4KICA8dGV4dCB4PSIxMTIiIHk9IjUwMCIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMyIgZmlsbD0iIzk2OThCNiI+L3MgcGVyIHNoYXJlZC1jcHUtMXggwrcgMjU2TUI8L3RleHQ+CiAgPHJlY3QgeD0iMTEyIiB5PSI1NDAiIHdpZHRoPSIxODAiIGhlaWdodD0iMTQiIHJ4PSI3IiBmaWxsPSIjOTY5OEI2Ii8+CiAgPHJlY3QgeD0iMTEyIiB5PSI1NjYiIHdpZHRoPSIyMjAiIGhlaWdodD0iMTQiIHJ4PSI3IiBmaWxsPSIjOTY5OEI2Ii8+CiAgPHJlY3QgeD0iMTEyIiB5PSI2MTAiIHdpZHRoPSIyOTYiIGhlaWdodD0iMzQiIHJ4PSIxNyIgZmlsbD0idXJsKCNoZXJvKSIvPgogIDwhLS0gc2Vjb25kIGNhcmQgLS0+CiAgPHJlY3QgeD0iNDcwIiB5PSIzNjAiIHdpZHRoPSIzNjAiIGhlaWdodD0iMzAwIiByeD0iMjAiIGZpbGw9IiMxZDEyM2YiIHN0cm9rZT0iIzJiMWY1NSIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPHJlY3QgeD0iNTAyIiB5PSIzOTYiIHdpZHRoPSIxMjAiIGhlaWdodD0iMTgiIHJ4PSI5IiBmaWxsPSIjNkVFNUMyIi8+CiAgPHJlY3QgeD0iNTAyIiB5PSI0NDAiIHdpZHRoPSIyMDAiIGhlaWdodD0iMjYiIHJ4PSI4IiBmaWxsPSIjZjVmM2ZmIi8+CiAgPHJlY3QgeD0iNTAyIiB5PSI1MDAiIHdpZHRoPSIyODAiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjNjc2Qjg5Ii8+CiAgPHJlY3QgeD0iNTAyIiB5PSI1MjQiIHdpZHRoPSIyNDAiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjNjc2Qjg5Ii8+CiAgPCEtLSB0aGlyZCBjYXJkIC0tPgogIDxyZWN0IHg9Ijg2MCIgeT0iMzYwIiB3aWR0aD0iMzQwIiBoZWlnaHQ9IjMwMCIgcng9IjIwIiBmaWxsPSIjMWQxMjNmIiBzdHJva2U9IiMyYjFmNTUiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxyZWN0IHg9Ijg5MiIgeT0iMzk2IiB3aWR0aD0iMTIwIiBoZWlnaHQ9IjE4IiByeD0iOSIgZmlsbD0iI0ZGQzgzQSIvPgogIDxyZWN0IHg9Ijg5MiIgeT0iNDQwIiB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2IiByeD0iOCIgZmlsbD0iI2Y1ZjNmZiIvPgogIDxyZWN0IHg9Ijg5MiIgeT0iNTAwIiB3aWR0aD0iMjYwIiBoZWlnaHQ9IjEyIiByeD0iNiIgZmlsbD0iIzY3NkI4OSIvPgogIDxyZWN0IHg9Ijg5MiIgeT0iNTI0IiB3aWR0aD0iMjIwIiBoZWlnaHQ9IjEyIiByeD0iNiIgZmlsbD0iIzY3NkI4OSIvPgogIDwhLS0gZm9vdGVyIHN0cmlwIC0tPgogIDxyZWN0IHg9IjAiIHk9Ijc0MCIgd2lkdGg9IjEyODAiIGhlaWdodD0iNjAiIGZpbGw9IiMxOTEwMzQiIG9wYWNpdHk9IjAuODUiLz4KICA8cmVjdCB4PSI4MCIgeT0iNzYyIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE0IiByeD0iNyIgZmlsbD0iIzY3NkI4OSIvPgo8L3N2Zz4=";

export const DEMO_SCREENSHOT = `data:image/svg+xml;base64,${MOCK_SCREENSHOT_SVG_BASE64}`;

// Fully-populated agent state: "find the price of a Fly Machine" scenario,
// paused at a human approval gate (status: waiting_approval).
export const demoState: BrowserAgentState = {
  url: "https://fly.io/docs/about/pricing/",
  title: "Pricing · Fly Docs",
  screenshot: DEMO_SCREENSHOT,
  status: "waiting_approval",
  steps: [
    {
      id: "s1",
      label: "Understood the goal",
      detail: "Find the per-second price of a shared-cpu-1x Fly Machine.",
      state: "done",
    },
    {
      id: "s2",
      label: "Navigated to fly.io",
      detail: "Opened https://fly.io and dismissed the cookie banner.",
      state: "done",
    },
    {
      id: "s3",
      label: "Followed “Pricing” nav link",
      detail: "Landed on /docs/about/pricing/ — found the Machines table.",
      state: "done",
    },
    {
      id: "s4",
      label: "Reading the pricing table",
      detail: "Extracting the shared-cpu-1x · 256MB per-second rate.",
      state: "running",
    },
    {
      id: "s5",
      label: "Awaiting approval to open the billing calculator",
      detail: "Wants to navigate to fly.io/calculator to confirm monthly cost.",
      state: "running",
    },
  ],
};

// Sample assistant transcript used for static screenshots / context.
export const demoTranscript = [
  "On it — I’ll find the price of a Fly Machine. 🛰️",
  "I opened fly.io and followed the **Pricing** link. The Machines table lists",
  "**shared-cpu-1x · 256MB at about $0.0000008/s** (≈ $1.94/mo if always-on).",
  "To double-check the monthly total I’d like to open the billing calculator at",
  "`fly.io/calculator`. Approve the navigation below and I’ll confirm the number.",
].join("\n");

/** The action + URL the demo approval card asks the user to approve. */
export const demoApproval = {
  action: "Navigate to the Fly billing calculator",
  url: "https://fly.io/calculator",
};
