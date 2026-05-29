import type { NextConfig } from "next";

// Static export: `next build` emits plain HTML/CSS/JS into `out/`, which the
// FastAPI server (main.py) serves exactly like the old `frontend/` directory.
// This keeps the single-process, single-machine deployment intact — the whole
// app is client-side, the only backend interaction is the same-origin /ws
// WebSocket, so there is nothing for a Next server runtime to do.
const nextConfig: NextConfig = {
  output: "export",
  // No next/image optimization server exists in a static export; we render
  // base64 frames / generated invitations with plain <img>, so this is belt-
  // and-suspenders in case next/image ever sneaks in.
  images: { unoptimized: true },
};

export default nextConfig;
