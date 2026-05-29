"use client";

import { useGeminiSession } from "@/hooks/useGeminiSession";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiKeyGate } from "@/components/ApiKeyGate";
import { VideoStage } from "@/components/VideoStage";
import { MediaControls } from "@/components/MediaControls";
import { MemoryFeed } from "@/components/MemoryFeed";
import { ChatPanel } from "@/components/ChatPanel";
import { Composer } from "@/components/Composer";
import { SessionEnded } from "@/components/SessionEnded";

export default function Home() {
  const session = useGeminiSession();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-10">
      <header className="mb-8 flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Gemini Live · Memory Demo
        </h1>
        <StatusBadge status={session.status} text={session.statusText} />
      </header>

      {session.phase === "gate" && (
        <ApiKeyGate onConnect={session.connect} />
      )}

      {session.phase === "ended" && (
        <SessionEnded onRestart={session.restart} />
      )}

      {session.phase === "live" && (
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <VideoStage
              videoRef={session.videoElRef}
              videoSource={session.videoSource}
              modelFrame={session.modelFrame}
            />
            <MediaControls
              micOn={session.micOn}
              videoSource={session.videoSource}
              onToggleMic={session.toggleMic}
              onToggleCamera={session.toggleCamera}
              onToggleScreen={session.toggleScreen}
              onDisconnect={session.disconnect}
            />
            <MemoryFeed observations={session.observations} />
          </div>

          <div className="flex h-full min-h-[400px] flex-col gap-4">
            <ChatPanel chat={session.chat} />
            <Composer onSend={session.sendText} />
          </div>
        </div>
      )}
    </main>
  );
}
