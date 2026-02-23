"""
RunPod Pod — Faster-Whisper WebSocket Server
Live streaming transcription with Silero-VAD and zero-retention.

Protocol:
  Client → Server: binary audio chunks (16kHz mono Int16 PCM)
  Server → Client: JSON {"text": "...", "is_final": false}
  Client → Server: text "STOP" to close
  Server → Client: JSON {"text": "full transcript", "is_final": true}

Zero-retention: audio never touches disk, cleared from RAM after processing.
"""

import asyncio
import json
import io
import logging
import os
import struct
import numpy as np
import torch
import websockets
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────
WS_HOST = "0.0.0.0"
WS_PORT = int(os.environ.get("WS_PORT", "8765"))
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "large-v3")
WHISPER_DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")
WHISPER_COMPUTE = os.environ.get("WHISPER_COMPUTE", "float16")
SAMPLE_RATE = 16000
# Minimum audio duration to attempt transcription (seconds)
MIN_AUDIO_SEC = 1.0
# Buffer duration before processing (longer = more accurate)
BUFFER_DURATION_SEC = 8.0
# VAD settings
VAD_THRESHOLD = 0.5

# ── Load models ──────────────────────────────────────────────────────

logger.info(f"Loading Whisper model: {WHISPER_MODEL} on {WHISPER_DEVICE}...")
whisper_model = WhisperModel(
    WHISPER_MODEL,
    device=WHISPER_DEVICE,
    compute_type=WHISPER_COMPUTE,
)
logger.info("Whisper model loaded!")

logger.info("Loading Silero-VAD...")
vad_model, vad_utils = torch.hub.load(
    repo_or_dir="snakers4/silero-vad",
    model="silero_vad",
    onnx=True,
)
(get_speech_timestamps, _, _, _, _) = vad_utils
logger.info("Silero-VAD loaded!")


def int16_to_float32(audio_bytes: bytes) -> np.ndarray:
    """Convert raw Int16 PCM bytes to float32 numpy array."""
    samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)
    samples /= 32768.0
    return samples


def has_speech(audio_float32: np.ndarray) -> bool:
    """Check if audio contains speech using Silero-VAD."""
    if len(audio_float32) < 512:
        return False
    tensor = torch.from_numpy(audio_float32)
    timestamps = get_speech_timestamps(tensor, vad_model, sampling_rate=SAMPLE_RATE)
    return len(timestamps) > 0


def transcribe(audio_float32: np.ndarray, previous_text: str = "") -> str:
    """Transcribe audio using Faster-Whisper. Zero-retention: audio stays in RAM only."""
    # Use last ~200 chars of previous transcript as context
    prompt = "Transkrypcja rozmowy po polsku."
    if previous_text:
        tail = previous_text[-200:].strip()
        prompt = f"{prompt} {tail}"

    segments, _ = whisper_model.transcribe(
        audio_float32,
        language="pl",
        initial_prompt=prompt,
        temperature=0.0,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(
            threshold=VAD_THRESHOLD,
            min_speech_duration_ms=250,
            min_silence_duration_ms=500,
            speech_pad_ms=300,
        ),
    )
    text = " ".join(seg.text.strip() for seg in segments)
    return text.strip()


# ── Hallucination filter ─────────────────────────────────────────────
HALLUCINATION_PATTERNS = [
    "wszelkie prawa zastrzeżone",
    "napisy stworzone przez",
    "napisy wykonał",
    "subskrybuj",
    "subscribe",
    "dziękuję za uwagę",
    "dziękuję za obejrzenie",
    "do zobaczenia",
    "thanks for watching",
    "copyright",
    "all rights reserved",
    "tłumaczenie",
    "amara.org",
]


def is_hallucination(text: str) -> bool:
    lower = text.lower().strip().rstrip(".")
    return lower in HALLUCINATION_PATTERNS


# ── WebSocket handler ────────────────────────────────────────────────

async def handle_client(websocket):
    """Handle one WebSocket client session."""
    client_id = id(websocket)
    logger.info(f"[{client_id}] Client connected")

    audio_buffer = bytearray()
    full_transcript = ""
    chunk_count = 0

    try:
        async for message in websocket:
            # Text message = control command
            if isinstance(message, str):
                if message.strip().upper() == "STOP":
                    # Final transcription of any remaining audio
                    if len(audio_buffer) > 0:
                        audio_float = int16_to_float32(bytes(audio_buffer))
                        if len(audio_float) / SAMPLE_RATE >= MIN_AUDIO_SEC:
                            text = transcribe(audio_float, previous_text=full_transcript)
                            if text and not is_hallucination(text):
                                full_transcript += (" " + text) if full_transcript else text
                        # ZERO-RETENTION: clear audio
                        audio_buffer.clear()
                        del audio_float

                    await websocket.send(json.dumps({
                        "text": full_transcript.strip(),
                        "is_final": True,
                    }))
                    logger.info(f"[{client_id}] Final transcript sent ({len(full_transcript)} chars)")
                    break
                continue

            # Binary message = audio chunk (Int16 PCM, 16kHz mono)
            audio_buffer.extend(message)
            chunk_count += 1

            # Process when we have enough audio (~5 seconds for accuracy)
            buffer_duration = len(audio_buffer) / 2 / SAMPLE_RATE  # Int16 = 2 bytes per sample
            if buffer_duration >= BUFFER_DURATION_SEC:
                audio_float = int16_to_float32(bytes(audio_buffer))

                # Transcribe (faster-whisper's built-in VAD handles silence)
                if len(audio_float) / SAMPLE_RATE >= MIN_AUDIO_SEC:
                    text = transcribe(audio_float, previous_text=full_transcript)
                    if text and not is_hallucination(text):
                        full_transcript += (" " + text) if full_transcript else text
                        await websocket.send(json.dumps({
                            "text": text,
                            "is_final": False,
                        }))
                        logger.info(f"[{client_id}] Chunk {chunk_count}: \"{text[:60]}...\"")

                # ZERO-RETENTION: clear audio from RAM
                audio_buffer.clear()
                del audio_float

    except websockets.exceptions.ConnectionClosed:
        logger.info(f"[{client_id}] Client disconnected")
    except Exception as e:
        logger.error(f"[{client_id}] Error: {e}")
        try:
            await websocket.send(json.dumps({"error": str(e)}))
        except:
            pass
    finally:
        # ZERO-RETENTION: ensure cleanup
        audio_buffer.clear()
        logger.info(f"[{client_id}] Session ended, audio cleared from RAM")


async def main():
    logger.info(f"Starting WebSocket server on ws://{WS_HOST}:{WS_PORT}")
    async with websockets.serve(
        handle_client,
        WS_HOST,
        WS_PORT,
        max_size=10 * 1024 * 1024,  # 10MB max message
        ping_interval=30,
        ping_timeout=10,
    ):
        logger.info("WebSocket server running. Waiting for connections...")
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
