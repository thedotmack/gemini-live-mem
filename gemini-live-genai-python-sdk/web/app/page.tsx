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
import { StartupContext } from "@/components/StartupContext";
import { ToolUse } from "@/components/ToolUse";

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
        <div className="bento lg:h-[calc(100dvh-9rem)]">
          {/* PERCEPTION: the agent's face */}
          <section className="area-face relative flex flex-col items-center gap-1 overflow-hidden rounded-xl bg-slate-900 py-5 sm:py-6">
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

          {/* PERCEPTION: the exact frames sent to the model */}
          <div className="area-video min-h-0">
            <VideoStage
              videoRef={session.videoElRef}
              videoSource={session.videoSource}
              modelFrame={session.modelFrame}
            />
          </div>

          {/* PERCEPTION: media controls */}
          <div className="area-controls flex items-center">
            <MediaControls
              micOn={session.micOn}
              videoSource={session.videoSource}
              onToggleMic={session.toggleMic}
              onToggleCamera={session.toggleCamera}
              onToggleScreen={session.toggleScreen}
              onDisconnect={session.disconnect}
            />
          </div>

          {/* DIALOGUE: conversation (what the agent heard + said) */}
          <div className="area-convo flex min-h-0 flex-col gap-4">
            <ChatPanel chat={session.chat} />
            <Composer onSend={session.sendText} />
          </div>

          {/* MEMORY: what it knew when it woke up */}
          <div className="area-startup min-h-0">
            <StartupContext markdown={session.startupContext} />
          </div>

          {/* MEMORY: what it actively looked up */}
          <div className="area-tools min-h-0">
            <ToolUse toolCalls={session.toolCalls} />
          </div>

          {/* MEMORY: what it's writing down live */}
          <div className="area-memory min-h-0">
            <MemoryFeed observations={session.observations} />
          </div>
        </div>
      )}
    </main>
  );
}
