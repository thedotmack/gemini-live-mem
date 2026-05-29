"use client";

import { useGeminiSession } from "@/hooks/useGeminiSession";
import { StatusBadge } from "@/components/StatusBadge";
import { ApiKeyGate } from "@/components/ApiKeyGate";
import PepeHead from "@/components/PepeHead";
import { VideoStage } from "@/components/VideoStage";
import { MediaControls } from "@/components/MediaControls";
import { MemoryFeed } from "@/components/MemoryFeed";
import { ChatPanel } from "@/components/ChatPanel";
import { Composer } from "@/components/Composer";
import { SessionEnded } from "@/components/SessionEnded";

export default function Home() {
  const session = useGeminiSession();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-5 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-3 border-b border-slate-200 pb-4 sm:mb-8">
        <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
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
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 md:gap-8">
          <div className="flex flex-col gap-4">
            {/* The agent's face: the floating Pepe head lip-syncs to the model's
                voice. This — not the camera below — is what "talks back". */}
            <section className="relative flex flex-col items-center gap-1 overflow-hidden rounded-xl bg-slate-900 py-5 sm:py-6">
              <span className="absolute left-3 top-3 text-[11px] font-medium uppercase tracking-wide text-emerald-400/80">
                Agent
              </span>
              <PepeHead
                volume={session.agentVolume}
                isSpeaking={session.agentSpeaking}
                transcript={session.agentTranscript ?? null}
                size={200}
              />
            </section>
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
