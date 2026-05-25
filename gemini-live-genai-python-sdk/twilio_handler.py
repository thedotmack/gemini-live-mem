import asyncio
import base64
import json
import logging
import audioop
from gemini_live import GeminiLive
from prompts import PROMPTS

logger = logging.getLogger(__name__)

class TwilioHandler:
    def __init__(self, gemini_api_key, model):
        self.gemini_client = GeminiLive(
            api_key=gemini_api_key,
            model=model,
            input_sample_rate=16000
        )
        self.stream_sid = None
        logger.info(f"TwilioHandler initialized with model={model}")

    async def handle_media_stream(self, websocket):
        """Processes the Twilio Media Stream."""
        audio_input_queue = asyncio.Queue()
        video_input_queue = asyncio.Queue() # Not used for Twilio but required by GeminiLive
        text_input_queue = asyncio.Queue()

        # Buffer for accumulating output audio before sending to Twilio
        # Twilio works best with consistent 20ms frames (160 bytes of mulaw at 8kHz)
        MULAW_FRAME_SIZE = 160  # 20ms at 8kHz, 1 byte per sample (mulaw)
        output_buffer = bytearray()

        async def send_buffered_audio(websocket, stream_sid):
            """Send buffered audio in consistent 160-byte (20ms) mulaw frames."""
            nonlocal output_buffer
            while len(output_buffer) >= MULAW_FRAME_SIZE:
                frame = bytes(output_buffer[:MULAW_FRAME_SIZE])
                del output_buffer[:MULAW_FRAME_SIZE]
                payload = base64.b64encode(frame).decode("utf-8")
                message = {
                    "event": "media",
                    "streamSid": stream_sid,
                    "media": {"payload": payload},
                }
                await websocket.send_text(json.dumps(message))

        async def audio_output_callback(data):
            """Callback for Gemini audio output."""
            nonlocal output_buffer
            if not self.stream_sid:
                return

            # Gemini sends 24kHz 16-bit PCM. Twilio expects 8kHz mulaw.
            # Two-step resampling for better quality: 24kHz → 16kHz → 8kHz
            try:
                # Step 1: 24kHz → 16kHz (3:2 ratio)
                intermediate, _ = audioop.ratecv(data, 2, 1, 24000, 16000, None)
                # Step 2: 16kHz → 8kHz (2:1 ratio)
                resampled_data, _ = audioop.ratecv(intermediate, 2, 1, 16000, 8000, None)
                # Convert PCM to mulaw
                mulaw_data = audioop.lin2ulaw(resampled_data, 2)

                # Buffer and send in consistent frame sizes
                output_buffer.extend(mulaw_data)
                await send_buffered_audio(websocket, self.stream_sid)
            except Exception as e:
                logger.error(f"Error sending audio to Twilio: {e}", exc_info=True)

        async def audio_interrupt_callback():
            """Callback for Gemini audio interruption."""
            nonlocal output_buffer
            output_buffer.clear()  # Discard buffered audio
            if self.stream_sid:
                # Clear Twilio's buffer
                await websocket.send_text(json.dumps({
                    "event": "clear",
                    "streamSid": self.stream_sid
                }))

        # Start Gemini session in the background
        logger.info("Starting Gemini session task for Twilio call...")
        gemini_task = asyncio.create_task(self._run_gemini_session(
            audio_input_queue, video_input_queue, text_input_queue, 
            audio_output_callback, audio_interrupt_callback
        ))

        try:
            async for message in websocket.iter_text():
                data = json.loads(message)
                event = data.get("event")

                if event == "start":
                    self.stream_sid = data["start"]["streamSid"]
                    call_sid = data["start"].get("callSid", "unknown")
                    logger.info(f"Twilio Stream started — streamSid={self.stream_sid}, callSid={call_sid}")
                    logger.info(f"Stream metadata: {json.dumps(data['start'], indent=2)}")
                    # Send initial prompt so the agent greets the caller
                    await text_input_queue.put(PROMPTS["telephony"]["greeting_prompt"])
                elif event == "media":
                    payload = data["media"]["payload"]
                    mulaw_data = base64.b64decode(payload)
                    # Convert mulaw to PCM (8kHz)
                    pcm_data = audioop.ulaw2lin(mulaw_data, 2)
                    # Two-step resampling: 8kHz → 16kHz (clean 1:2 ratio)
                    resampled_data, _ = audioop.ratecv(pcm_data, 2, 1, 8000, 16000, None)
                    await audio_input_queue.put(resampled_data)
                elif event == "stop":
                    logger.info(f"Twilio Stream stopped: {self.stream_sid}")
                    break
        except Exception as e:
            logger.error(f"Error in Twilio media stream: {e}", exc_info=True)
        finally:
            # Check if the Gemini task failed
            if gemini_task.done() and not gemini_task.cancelled():
                exc = gemini_task.exception()
                if exc:
                    logger.error(f"Gemini task failed with exception: {exc}", exc_info=exc)
            gemini_task.cancel()
            logger.info("Twilio handler finished — cleaning up")

    async def _run_gemini_session(self, audio_input_queue, video_input_queue, text_input_queue, output_callback, interrupt_callback):
        try:
            logger.info("Gemini session connecting...")
            async for event in self.gemini_client.start_session(
                audio_input_queue=audio_input_queue,
                video_input_queue=video_input_queue,
                text_input_queue=text_input_queue,
                audio_output_callback=output_callback,
                audio_interrupt_callback=interrupt_callback,
            ):
                if event:
                    event_type = event.get("type", "unknown") if isinstance(event, dict) else type(event).__name__
                    logger.info(f"Gemini event: {event_type}")
                    if isinstance(event, dict) and event.get("type") == "error":
                        logger.error(f"Gemini returned error event: {event}")
            logger.info("Gemini session ended normally")
        except asyncio.CancelledError:
            logger.info("Gemini session cancelled (expected on call end)")
        except Exception as e:
            logger.error(f"Error in Gemini session (Twilio): {e}", exc_info=True)
