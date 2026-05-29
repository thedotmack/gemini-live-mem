/**
 * MediaHandler: manages audio/video capture and playback.
 *
 * Ported verbatim from the original vanilla-JS `frontend/media-handler.js` —
 * the audio math (16 kHz capture downsample, Int16 conversion, 24 kHz scheduled
 * playback) and the 1 FPS 640x480 JPEG-q0.7 frame capture are battle-tested, so
 * this is a typing pass, not a rewrite. The only behavioral change is the
 * AudioWorklet module URL: `/pcm-processor.js` (served from Next's `public/`).
 */
export class MediaHandler {
  audioContext: AudioContext | null = null;
  mediaStream: MediaStream | null = null;
  audioWorkletNode: AudioWorkletNode | null = null;
  videoStream: MediaStream | null = null;
  videoInterval: ReturnType<typeof setInterval> | null = null;
  nextStartTime = 0;
  scheduledSources: AudioBufferSourceNode[] = [];
  isRecording = false;
  private videoCanvas: HTMLCanvasElement;
  private canvasCtx: CanvasRenderingContext2D;
  // Playback-side amplitude tap for the agent avatar's lip-sync. The avatar is
  // purely presentational, so this must never alter the audio path or throw
  // into the session — every read is guarded and fail-soft.
  private analyser: AnalyserNode | null = null;
  private amplitudeData: Uint8Array<ArrayBuffer> | null = null;

  constructor() {
    this.videoCanvas = document.createElement("canvas");
    this.canvasCtx = this.videoCanvas.getContext("2d")!;
  }

  async initializeAudio(): Promise<void> {
    if (!this.audioContext) {
      const Ctx: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new Ctx();
      await this.audioContext.audioWorklet.addModule("/pcm-processor.js");
    }
    // Build the lip-sync analyser once. It sits inline on the playback graph
    // (source → analyser → destination) so it observes exactly the audio the
    // user hears without changing it.
    if (!this.analyser) {
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;
      this.amplitudeData = new Uint8Array(
        new ArrayBuffer(this.analyser.frequencyBinCount)
      );
      this.analyser.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  async startAudio(onAudioData: (pcm16: ArrayBuffer) => void): Promise<void> {
    await this.initializeAudio();
    const audioContext = this.audioContext!;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const source = audioContext.createMediaStreamSource(this.mediaStream);
      this.audioWorkletNode = new AudioWorkletNode(
        audioContext,
        "pcm-processor"
      );

      this.audioWorkletNode.port.onmessage = (event) => {
        if (this.isRecording) {
          const downsampled = this.downsampleBuffer(
            event.data,
            audioContext.sampleRate,
            16000
          );
          const pcm16 = this.convertFloat32ToInt16(downsampled);
          onAudioData(pcm16);
        }
      };

      source.connect(this.audioWorkletNode);
      // Mute local feedback
      const muteGain = audioContext.createGain();
      muteGain.gain.value = 0;
      this.audioWorkletNode.connect(muteGain);
      muteGain.connect(audioContext.destination);

      this.isRecording = true;
    } catch (e) {
      console.error("Error starting audio:", e);
      throw e;
    }
  }

  stopAudio(): void {
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
  }

  async startVideo(
    videoElement: HTMLVideoElement,
    onFrame: (base64: string) => void
  ): Promise<void> {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoElement.srcObject = this.videoStream;

      this.videoInterval = setInterval(() => {
        this.captureFrame(videoElement, onFrame);
      }, 1000); // 1 FPS
    } catch (e) {
      console.error("Error starting video:", e);
      throw e;
    }
  }

  async startScreen(
    videoElement: HTMLVideoElement,
    onFrame: (base64: string) => void,
    onEnded?: () => void
  ): Promise<void> {
    try {
      this.videoStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      videoElement.srcObject = this.videoStream;

      // Handle stream ending (e.g. user clicks "Stop sharing" in browser UI)
      this.videoStream.getVideoTracks()[0].onended = () => {
        this.stopVideo(videoElement);
        if (onEnded) onEnded();
      };

      this.videoInterval = setInterval(() => {
        this.captureFrame(videoElement, onFrame);
      }, 1000); // 1 FPS
    } catch (e) {
      console.error("Error starting screen share:", e);
      throw e;
    }
  }

  stopVideo(videoElement: HTMLVideoElement | null): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((t) => t.stop());
      this.videoStream = null;
    }
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  captureFrame(
    videoElement: HTMLVideoElement,
    onFrame: (base64: string) => void
  ): void {
    if (!this.videoStream) return;
    this.videoCanvas.width = 640;
    this.videoCanvas.height = 480;
    this.canvasCtx.drawImage(videoElement, 0, 0, 640, 480);
    const base64 = this.videoCanvas.toDataURL("image/jpeg", 0.7).split(",")[1];
    onFrame(base64);
  }

  playAudio(arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    const pcmData = new Int16Array(arrayBuffer);
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }

    const buffer = this.audioContext.createBuffer(
      1,
      float32Data.length,
      24000
    );
    buffer.getChannelData(0).set(float32Data);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    // Route through the analyser when present (it forwards to destination), so
    // the lip-sync tap sees the agent's voice. Falls back to a direct connect.
    source.connect(this.analyser ?? this.audioContext.destination);

    const now = this.audioContext.currentTime;
    this.nextStartTime = Math.max(now, this.nextStartTime);
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    this.scheduledSources.push(source);
    source.onended = () => {
      const idx = this.scheduledSources.indexOf(source);
      if (idx > -1) this.scheduledSources.splice(idx, 1);
    };
  }

  stopAudioPlayback(): void {
    this.scheduledSources.forEach((s) => {
      try {
        s.stop();
      } catch {
        // already stopped
      }
    });
    this.scheduledSources = [];
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    }
  }

  // ── Lip-sync taps (avatar only, fail-soft) ──────────────────────────────────
  // Real-time RMS amplitude (0-1) of the agent's playback, for mouth animation.
  getAgentAmplitude(): number {
    if (!this.analyser || !this.amplitudeData) return 0;
    this.analyser.getByteTimeDomainData(this.amplitudeData);
    let sumSquares = 0;
    for (let i = 0; i < this.amplitudeData.length; i++) {
      const v = (this.amplitudeData[i] - 128) / 128; // center & normalize to -1..1
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / this.amplitudeData.length);
    // Subtract a small noise floor, then scale so normal speech spans ~0-1.
    return Math.min(1, Math.max(0, (rms - 0.02) / 0.25));
  }

  // True while scheduled agent audio is still playing/queued ahead of "now".
  isAgentSpeaking(): boolean {
    return !!this.audioContext && this.audioContext.currentTime < this.nextStartTime - 0.05;
  }

  // Utils
  downsampleBuffer(
    buffer: Float32Array,
    sampleRate: number,
    outSampleRate: number
  ): Float32Array {
    if (outSampleRate === sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0,
        count = 0;
      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
    let l = buffer.length;
    const buf = new Int16Array(l);
    while (l--) {
      buf[l] = Math.min(1, Math.max(-1, buffer[l])) * 0x7fff;
    }
    return buf.buffer;
  }
}
