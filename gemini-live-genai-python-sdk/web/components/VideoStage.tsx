"use client";

import type { RefObject } from "react";
import type { ModelFrame, VideoSource } from "@/hooks/useGeminiSession";

// The camera/screen preview plus the picture-in-picture feed showing the exact
// JPEG frames being sent to Gemini.
export function VideoStage({
  videoRef,
  videoSource,
  modelFrame,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSource: VideoSource;
  modelFrame: ModelFrame;
}) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      {videoSource === "none" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800 text-lg text-white">
          Start camera to send video
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
      />

      {modelFrame && (
        <div className="absolute bottom-2.5 right-2.5 z-20 w-[32%] max-w-[200px] overflow-hidden rounded-md border-2 border-white/85 bg-black shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${modelFrame.src}`}
            alt="Frame sent to Gemini"
            className="block h-auto w-full"
          />
          <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 bg-gradient-to-b from-black/65 to-transparent px-1.5 py-1 font-mono text-[10px] text-white">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500 animate-live-pulse" />
            <span>
              → model · #{modelFrame.count} · {modelFrame.kb} KB
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
