"use client";

import type { VideoSource } from "@/hooks/useGeminiSession";

const BASE =
  "rounded-md px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export function MediaControls({
  micOn,
  videoSource,
  onToggleMic,
  onToggleCamera,
  onToggleScreen,
  onDisconnect,
}: {
  micOn: boolean;
  videoSource: VideoSource;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onToggleMic}
        className={`${BASE} ${
          micOn
            ? "bg-slate-700 text-white hover:bg-slate-800"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {micOn ? "Stop Mic" : "Start Mic"}
      </button>
      <button
        type="button"
        onClick={onToggleCamera}
        className={`${BASE} ${
          videoSource === "camera"
            ? "bg-slate-700 text-white hover:bg-slate-800"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {videoSource === "camera" ? "Stop Camera" : "Start Camera"}
      </button>
      <button
        type="button"
        onClick={onToggleScreen}
        className={`${BASE} ${
          videoSource === "screen"
            ? "bg-slate-700 text-white hover:bg-slate-800"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {videoSource === "screen" ? "Stop Sharing" : "Share Screen"}
      </button>
      <button
        type="button"
        onClick={onDisconnect}
        className={`${BASE} bg-red-500 text-white hover:bg-red-600`}
      >
        Disconnect
      </button>
    </div>
  );
}
