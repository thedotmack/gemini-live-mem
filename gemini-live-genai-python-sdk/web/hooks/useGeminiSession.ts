"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MediaHandler } from "@/lib/media-handler";
import {
  GeminiClient,
  type InvitationDetails,
  type Observation,
  type ServerMessage,
} from "@/lib/gemini-client";

export type SessionPhase = "gate" | "live" | "ended";
export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
export type VideoSource = "none" | "camera" | "screen";

export type ChatItem =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "gemini"; text: string }
  | {
      id: number;
      kind: "invitation";
      imageBase64: string;
      mimeType: string;
      details: InvitationDetails;
    };

export type ModelFrame = { src: string; count: number; kb: number } | null;

// The hidden kick-off instruction sent right after connect — same text the
// original frontend sent so Gemini opens with a self-introduction.
const INTRO_PROMPT = `System: Introduce yourself as a demo of the Gemini Live API.
       Keep the intro concise and friendly.`;

export function useGeminiSession() {
  const [phase, setPhase] = useState<SessionPhase>("gate");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [statusText, setStatusText] = useState("Disconnected");
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [modelFrame, setModelFrame] = useState<ModelFrame>(null);
  const [micOn, setMicOn] = useState(false);
  const [videoSource, setVideoSource] = useState<VideoSource>("none");
  // Drives the agent avatar's lip-sync. `agentVolume` is the live amplitude of
  // the model's audio playback; `agentSpeaking` is true while audio is playing.
  const [agentVolume, setAgentVolume] = useState(0);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  // Reserved: the agent's in-flight transcript for a speech bubble (off for v1).
  const agentTranscript: string | null = null;
  const rafRef = useRef<number | null>(null);

  const clientRef = useRef<GeminiClient | null>(null);
  const mediaRef = useRef<MediaHandler | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // A rejected/invalid key sets this so onClose returns to the gate (with the
  // error visible) instead of the generic "Session Ended" screen.
  const sessionErrorRef = useRef<string | null>(null);
  // Ids of the in-flight streaming bubbles being appended to this turn.
  const currentUserIdRef = useRef<number | null>(null);
  const currentGeminiIdRef = useRef<number | null>(null);
  const idRef = useRef(0);
  const frameCountRef = useRef(0);

  const getMedia = () => {
    if (!mediaRef.current) mediaRef.current = new MediaHandler();
    return mediaRef.current;
  };
  const nextId = () => ++idRef.current;

  const resetTurn = () => {
    currentUserIdRef.current = null;
    currentGeminiIdRef.current = null;
  };

  // Poll the playback amplitude tap on a RAF loop while live, so the avatar
  // lip-syncs to the agent's voice. Reads mediaRef directly (never constructs a
  // handler) and no-ops if there's none — purely presentational, fail-soft.
  useEffect(() => {
    if (phase !== "live") return;
    const tick = () => {
      const media = mediaRef.current;
      setAgentVolume(media ? media.getAgentAmplitude() : 0);
      setAgentSpeaking(media ? media.isAgentSpeaking() : false);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [phase]);

  const appendStreaming = useCallback(
    (kind: "user" | "gemini", text: string) => {
      const ref =
        kind === "user" ? currentUserIdRef : currentGeminiIdRef;
      setChat((prev) => {
        if (ref.current !== null) {
          return prev.map((item) =>
            item.id === ref.current && item.kind === kind
              ? { ...item, text: item.text + text }
              : item
          );
        }
        const id = nextId();
        ref.current = id;
        return [...prev, { id, kind, text }];
      });
    },
    []
  );

  const handleServerMessage = useCallback(
    (msg: ServerMessage) => {
      switch (msg.type) {
        case "interrupted":
          getMedia().stopAudioPlayback();
          resetTurn();
          break;
        case "turn_complete":
          resetTurn();
          break;
        case "user":
          appendStreaming("user", msg.text);
          break;
        case "gemini":
          appendStreaming("gemini", msg.text);
          break;
        case "event_invitation":
          setChat((prev) => [
            ...prev,
            {
              id: nextId(),
              kind: "invitation",
              imageBase64: msg.image_base64,
              mimeType: msg.mime_type || "image/png",
              details: msg.details || {},
            },
          ]);
          break;
        case "observation":
          if (msg.observation?.title) {
            setObservations((prev) => [...prev, msg.observation]);
          }
          break;
        case "error":
          // BYOK: surface a missing/invalid key (e.g. a key without Gemini Live
          // access) instead of a silent dead session. onClose reads the ref to
          // restore the gate.
          sessionErrorRef.current = msg.error || "Connection error.";
          setStatus("error");
          setStatusText(sessionErrorRef.current);
          break;
      }
    },
    [appendStreaming]
  );

  // Send a captured frame to Gemini AND mirror it in the PiP feed so you can see
  // exactly what the model receives. Shared by camera + screen.
  const sendFrameToModel = useCallback((base64Data: string) => {
    const client = clientRef.current;
    if (!client || !client.isConnected()) return;
    client.sendImage(base64Data);
    frameCountRef.current += 1;
    const kb = Math.round((base64Data.length * 3) / 4 / 1024);
    setModelFrame({ src: base64Data, count: frameCountRef.current, kb });
  }, []);

  const clearModelFrame = () => {
    frameCountRef.current = 0;
    setModelFrame(null);
  };

  const stopAllMedia = useCallback(() => {
    const media = mediaRef.current;
    if (media) {
      media.stopAudio();
      media.stopVideo(videoElRef.current);
    }
    setMicOn(false);
    setVideoSource("none");
    clearModelFrame();
  }, []);

  const connect = useCallback(
    async (apiKey: string) => {
      if (!apiKey) {
        setStatus("error");
        setStatusText("Enter your Gemini API key to connect.");
        return;
      }
      setStatus("connecting");
      setStatusText("Connecting...");
      sessionErrorRef.current = null;

      try {
        // Unlock the AudioContext on the user gesture before opening the socket.
        await getMedia().initializeAudio();
      } catch (e) {
        setStatus("error");
        setStatusText(
          "Connection Failed: " + (e as Error).message
        );
        return;
      }

      const client = new GeminiClient({
        onOpen: () => {
          setStatus("connected");
          setStatusText("Connected");
          setPhase("live");
          client.sendText(INTRO_PROMPT);
        },
        onMessage: (event) => {
          if (typeof event.data === "string") {
            try {
              handleServerMessage(JSON.parse(event.data) as ServerMessage);
            } catch (err) {
              console.error("Parse error:", err);
            }
          } else {
            getMedia().playAudio(event.data as ArrayBuffer);
          }
        },
        onClose: () => {
          if (sessionErrorRef.current) {
            // Rejected/invalid key: return to the gate with the error visible.
            setPhase("gate");
            sessionErrorRef.current = null;
            return;
          }
          setStatus("disconnected");
          setStatusText("Disconnected");
          stopAllMedia();
          setPhase("ended");
        },
        onError: (err) => {
          console.error("WS Error:", err);
          setStatus("error");
          setStatusText("Connection Error");
        },
      });
      clientRef.current = client;
      client.connect(apiKey);
    },
    [handleServerMessage, stopAllMedia]
  );

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
  }, []);

  const sendText = useCallback((text: string) => {
    const client = clientRef.current;
    if (text && client?.isConnected()) {
      client.sendText(text);
      setChat((prev) => [
        ...prev,
        { id: ++idRef.current, kind: "user", text },
      ]);
    }
  }, []);

  const toggleMic = useCallback(async () => {
    const media = getMedia();
    if (media.isRecording) {
      media.stopAudio();
      setMicOn(false);
      return;
    }
    try {
      await media.startAudio((pcm16) => {
        if (clientRef.current?.isConnected()) clientRef.current.send(pcm16);
      });
      setMicOn(true);
    } catch {
      alert("Could not start audio capture");
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    const media = getMedia();
    const videoEl = videoElRef.current;
    if (!videoEl) return;
    if (videoSource === "camera") {
      media.stopVideo(videoEl);
      clearModelFrame();
      setVideoSource("none");
      return;
    }
    if (media.videoStream) media.stopVideo(videoEl); // stop screen first
    try {
      await media.startVideo(videoEl, sendFrameToModel);
      setVideoSource("camera");
    } catch {
      alert("Could not access camera");
    }
  }, [videoSource, sendFrameToModel]);

  const toggleScreen = useCallback(async () => {
    const media = getMedia();
    const videoEl = videoElRef.current;
    if (!videoEl) return;
    if (videoSource === "screen") {
      media.stopVideo(videoEl);
      clearModelFrame();
      setVideoSource("none");
      return;
    }
    if (media.videoStream) media.stopVideo(videoEl); // stop camera first
    try {
      await media.startScreen(videoEl, sendFrameToModel, () => {
        clearModelFrame();
        setVideoSource("none");
      });
      setVideoSource("screen");
    } catch {
      alert("Could not share screen");
    }
  }, [videoSource, sendFrameToModel]);

  // Return to the gate for a fresh session (the "Start New Session" button).
  const restart = useCallback(() => {
    stopAllMedia();
    setChat([]);
    setObservations([]);
    resetTurn();
    setStatus("disconnected");
    setStatusText("Disconnected");
    setPhase("gate");
  }, [stopAllMedia]);

  return {
    // state
    phase,
    status,
    statusText,
    chat,
    observations,
    modelFrame,
    micOn,
    videoSource,
    videoElRef,
    agentVolume,
    agentSpeaking,
    agentTranscript,
    // actions
    connect,
    disconnect,
    sendText,
    toggleMic,
    toggleCamera,
    toggleScreen,
    restart,
  };
}
