/**
 * GeminiClient: WebSocket transport to the FastAPI backend.
 *
 * Ported from `frontend/gemini-client.js`. The wire contract is unchanged and
 * MUST stay in lockstep with `main.py` / `gemini_live.py`:
 *
 *   outbound (client -> server):
 *     1. FIRST frame, always: {type:"setup", api_key}  (BYOK — see note below)
 *     2. binary PCM16 audio bytes
 *     3. {text}
 *     4. {type:"image", mime_type, data}  (base64 JPEG)
 *
 *   inbound (server -> client):
 *     - binary  -> 24 kHz PCM audio to play
 *     - JSON {type} in: interrupted | turn_complete | user | gemini |
 *                       event_invitation | observation | error
 */

export type InvitationDetails = {
  title?: string;
  date?: string;
  time?: string;
  location?: string;
};

export type Observation = {
  title: string;
  subtitle?: string;
  obs_type?: string;
};

export type ServerMessage =
  | { type: "interrupted" }
  | { type: "turn_complete" }
  | { type: "user"; text: string }
  | { type: "gemini"; text: string }
  | {
      type: "event_invitation";
      image_base64: string;
      mime_type?: string;
      details?: InvitationDetails;
    }
  | { type: "observation"; observation: Observation }
  | { type: "error"; error: string };

export type GeminiClientConfig = {
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
};

// In production this is unset and we connect to the same-origin /ws (FastAPI
// serves both the static export and the socket). In `next dev`, .env.development
// points it at the FastAPI dev port.
function resolveWsUrl(): string {
  const override = process.env.NEXT_PUBLIC_WS_URL;
  if (override) return override;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export class GeminiClient {
  private websocket: WebSocket | null = null;
  private apiKey = "";
  private readonly onOpen?: () => void;
  private readonly onMessage?: (event: MessageEvent) => void;
  private readonly onClose?: (event: CloseEvent) => void;
  private readonly onError?: (event: Event) => void;

  constructor(config: GeminiClientConfig) {
    this.onOpen = config.onOpen;
    this.onMessage = config.onMessage;
    this.onClose = config.onClose;
    this.onError = config.onError;
  }

  connect(apiKey: string): void {
    this.apiKey = apiKey;
    this.websocket = new WebSocket(resolveWsUrl());
    this.websocket.binaryType = "arraybuffer";

    this.websocket.onopen = () => {
      // BYOK: the visitor's key MUST be the very first frame. The backend reads
      // it before building the Gemini client and the memory sink, and rejects
      // the connection if it's missing. WS preserves order, so this lands before
      // the intro text the onOpen callback sends next.
      this.websocket!.send(
        JSON.stringify({ type: "setup", api_key: this.apiKey })
      );
      this.onOpen?.();
    };

    this.websocket.onmessage = (event) => this.onMessage?.(event);
    this.websocket.onclose = (event) => this.onClose?.(event);
    this.websocket.onerror = (event) => this.onError?.(event);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(data as never);
    }
  }

  sendText(text: string): void {
    this.send(JSON.stringify({ text }));
  }

  sendImage(base64Data: string, mimeType = "image/jpeg"): void {
    this.send(
      JSON.stringify({ type: "image", mime_type: mimeType, data: base64Data })
    );
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  isConnected(): boolean {
    return (
      this.websocket !== null &&
      this.websocket.readyState === WebSocket.OPEN
    );
  }
}
