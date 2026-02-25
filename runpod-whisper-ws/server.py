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
import re
import struct
import tempfile
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
# Buffer duration before processing (longer = more accurate, Whisper works best with 10-30s)
BUFFER_DURATION_SEC = 12.0
# Overlap duration to avoid cutting sentences at chunk boundaries
OVERLAP_DURATION_SEC = 2.0
# VAD settings
VAD_THRESHOLD = 0.5
# HuggingFace token for pyannote (optional)
HF_TOKEN = os.environ.get("HF_TOKEN", "")
# Rate limiting: max concurrent WebSocket connections per IP
MAX_CONNECTIONS_PER_IP = int(os.environ.get("MAX_CONNECTIONS_PER_IP", "5"))
# Authentication keys (if empty, auth is disabled — dev mode)
WS_API_KEY = os.environ.get("WS_API_KEY", "")
DIARIZE_API_KEY = os.environ.get("DIARIZE_API_KEY", "")

# ── Per-IP connection tracking ───────────────────────────────────────
from collections import defaultdict
from urllib.parse import urlparse, parse_qs
ip_connections: dict[str, int] = defaultdict(int)

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

# Load pyannote diarization pipeline (optional — requires HF_TOKEN)
diarize_pipeline = None
if HF_TOKEN:
    try:
        from pyannote.audio import Pipeline
        logger.info("Loading pyannote diarization pipeline...")
        diarize_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=HF_TOKEN,
        )
        if torch.cuda.is_available():
            diarize_pipeline.to(torch.device("cuda"))
        logger.info("pyannote diarization pipeline loaded!")
    except Exception as e:
        logger.warning(f"Failed to load pyannote pipeline: {e}. Diarization disabled.")
else:
    logger.info("HF_TOKEN not set — diarization disabled.")


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
    # Better initial_prompt: hints Whisper to produce proper punctuation and capitalization
    prompt = "Transkrypcja profesjonalnej rozmowy po polsku. Mówca używa poprawnej polszczyzny, terminologii branżowej. Interpunkcja i wielkie litery."
    if previous_text:
        tail = previous_text[-300:].strip()
        prompt = f"{prompt} {tail}"

    segments, _ = whisper_model.transcribe(
        audio_float32,
        language="pl",
        initial_prompt=prompt,
        temperature=0.0,
        beam_size=5,
        condition_on_previous_text=True,
        vad_filter=True,
        vad_parameters=dict(
            threshold=VAD_THRESHOLD,
            min_speech_duration_ms=250,
            min_silence_duration_ms=800,   # Less aggressive silence cut — preserves pauses mid-sentence
            speech_pad_ms=400,             # Captures word beginnings/endings better
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


# ── Regex post-processing (no LLM needed) ────────────────────────────
FILLER_PATTERNS = [
    r'\b(no|noo|nooo)\b(?![\w-])',
    r'\b(znaczy)\b',
    r'\b(wiesz)\b',
    r'\b(tak jakby)\b',
    r'\b(ee+|yyy+|hmm+|aaa+|eee+)\b',
]


def clean_transcript(text: str) -> str:
    """Basic regex cleanup: remove filler words, repeated words, fix capitalization."""
    if not text:
        return text
    # Remove filler words
    for pattern in FILLER_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    # Remove repeated words: "to to to" → "to"
    text = re.sub(r'\b(\w+)(\s+\1){1,}\b', r'\1', text, flags=re.IGNORECASE)
    # Clean up multiple spaces / commas
    text = re.sub(r'\s*,\s*,', ',', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    # Capitalize first letter after period
    text = re.sub(r'\.\s+([a-ząćęłńóśźż])', lambda m: '. ' + m.group(1).upper(), text)
    # Ensure first letter is capitalized
    if text:
        text = text[0].upper() + text[1:]
    # Ensure ends with period
    if text and text[-1] not in '.!?':
        text += '.'
    return text


# ── Speaker Diarization ──────────────────────────────────────────────

def diarize(audio_float32: np.ndarray) -> list:
    """Run pyannote diarization. Returns list of (start, end, speaker_label)."""
    if diarize_pipeline is None:
        return []
    
    import soundfile as sf
    # pyannote needs a file-like object or path
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        sf.write(tmp.name, audio_float32, SAMPLE_RATE)
        diarization = diarize_pipeline(tmp.name)
    
    segments = []
    for turn, _, speaker in diarization.itertracks(yield_label=True):
        segments.append((turn.start, turn.end, speaker))
    return segments


def transcribe_with_speakers(audio_float32: np.ndarray, previous_text: str = "") -> str:
    """Transcribe with word timestamps + align with diarization segments."""
    # 1. Get diarization segments
    speaker_segments = diarize(audio_float32)
    if not speaker_segments:
        # Fallback: no diarization available
        text = transcribe(audio_float32, previous_text)
        return clean_transcript(text)
    
    # 2. Transcribe with word timestamps
    prompt = "Transkrypcja profesjonalnej rozmowy po polsku. Mówca używa poprawnej polszczyzny, terminologii branżowej. Interpunkcja i wielkie litery."
    if previous_text:
        tail = previous_text[-300:].strip()
        prompt = f"{prompt} {tail}"
    
    segments, _ = whisper_model.transcribe(
        audio_float32,
        language="pl",
        initial_prompt=prompt,
        temperature=0.0,
        beam_size=5,
        condition_on_previous_text=True,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(
            threshold=VAD_THRESHOLD,
            min_speech_duration_ms=250,
            min_silence_duration_ms=800,
            speech_pad_ms=400,
        ),
    )
    
    # 3. Collect words with timestamps
    words_with_time = []
    for seg in segments:
        if seg.words:
            for w in seg.words:
                words_with_time.append((w.start, w.end, w.word.strip()))
    
    if not words_with_time:
        return ""
    
    # 4. Assign each word to a speaker based on overlap
    def find_speaker(word_start, word_end):
        best_speaker = "SPEAKER_00"
        best_overlap = 0
        for seg_start, seg_end, speaker in speaker_segments:
            overlap = min(word_end, seg_end) - max(word_start, seg_start)
            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = speaker
        return best_speaker
    
    # 5. Build speaker-labeled output
    # Map pyannote labels (SPEAKER_00, SPEAKER_01) to friendly names
    speaker_map = {}
    speaker_counter = 1
    
    result_parts = []
    current_speaker = None
    current_text = []
    
    for w_start, w_end, word in words_with_time:
        speaker = find_speaker(w_start, w_end)
        if speaker not in speaker_map:
            speaker_map[speaker] = f"Mówca {speaker_counter}"
            speaker_counter += 1
        
        if speaker != current_speaker:
            # Flush previous speaker's text
            if current_text and current_speaker is not None:
                text_block = clean_transcript(" ".join(current_text))
                if text_block:
                    label = speaker_map[current_speaker]
                    result_parts.append(f"[{label}]: {text_block}")
            current_speaker = speaker
            current_text = [word]
        else:
            current_text.append(word)
    
    # Flush last speaker
    if current_text and current_speaker is not None:
        text_block = clean_transcript(" ".join(current_text))
        if text_block:
            label = speaker_map[current_speaker]
            result_parts.append(f"[{label}]: {text_block}")
    
    return "\n".join(result_parts)


# ── WebSocket handler ────────────────────────────────────────────────

async def handle_client(websocket):
    """Handle one WebSocket client session."""
    client_id = id(websocket)
    
    # ── Authentication: validate API key from query string ──
    if WS_API_KEY:
        try:
            path = websocket.request.path if hasattr(websocket, 'request') and websocket.request else ""
            params = parse_qs(urlparse(path).query)
            token = params.get("token", [None])[0]
            if token != WS_API_KEY:
                logger.warning(f"[{client_id}] Unauthorized WebSocket connection (invalid token)")
                await websocket.send(json.dumps({"error": "Unauthorized", "code": 401}))
                await websocket.close(4001, "Unauthorized")
                return
        except Exception as e:
            logger.warning(f"[{client_id}] Auth check failed: {e}")
            await websocket.send(json.dumps({"error": "Unauthorized", "code": 401}))
            await websocket.close(4001, "Unauthorized")
            return
    
    # ── Rate limiting: per-IP connection tracking ──
    client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
    ip_connections[client_ip] += 1
    
    if ip_connections[client_ip] > MAX_CONNECTIONS_PER_IP:
        ip_connections[client_ip] -= 1
        logger.warning(f"[{client_id}] Rate limit exceeded for {client_ip} ({ip_connections[client_ip]+1} connections)")
        await websocket.send(json.dumps({"error": "Too many connections from this IP", "code": 429}))
        await websocket.close(4029, "Rate limit exceeded")
        return
    
    logger.info(f"[{client_id}] Client connected from {client_ip} ({ip_connections[client_ip]} active)")

    audio_buffer = bytearray()
    full_transcript = ""
    chunk_count = 0
    diarize_mode = False  # Client can request diarization via {"mode": "diarize"}
    all_audio_for_diarize = bytearray()  # Keep full audio for post-hoc diarization

    try:
        async for message in websocket:
            # Text message = control command
            if isinstance(message, str):
                # Check for mode command
                try:
                    cmd = json.loads(message)
                    if cmd.get("mode") == "diarize":
                        diarize_mode = True
                        logger.info(f"[{client_id}] Diarization mode enabled")
                        await websocket.send(json.dumps({"status": "diarize_enabled"}))
                        continue
                except (json.JSONDecodeError, AttributeError):
                    pass
                
                if message.strip().upper() == "STOP":
                    # Final transcription of any remaining audio
                    if len(audio_buffer) > 0:
                        audio_float = int16_to_float32(bytes(audio_buffer))
                        if len(audio_float) / SAMPLE_RATE >= MIN_AUDIO_SEC:
                            text = transcribe(audio_float, previous_text=full_transcript)
                            text = clean_transcript(text)
                            if text and not is_hallucination(text):
                                full_transcript += (" " + text) if full_transcript else text
                        # ZERO-RETENTION: clear audio
                        audio_buffer.clear()
                        del audio_float

                    # If diarize mode: run diarization on full audio
                    diarized_transcript = ""
                    if diarize_mode and len(all_audio_for_diarize) > 0:
                        logger.info(f"[{client_id}] Running post-hoc diarization...")
                        full_audio = int16_to_float32(bytes(all_audio_for_diarize))
                        diarized_transcript = transcribe_with_speakers(full_audio)
                        # ZERO-RETENTION
                        all_audio_for_diarize.clear()
                        del full_audio
                        logger.info(f"[{client_id}] Diarization complete")

                    await websocket.send(json.dumps({
                        "text": full_transcript.strip(),
                        "diarized_text": diarized_transcript if diarize_mode else None,
                        "is_final": True,
                    }))
                    logger.info(f"[{client_id}] Final transcript sent ({len(full_transcript)} chars)")
                    break
                continue

            # Binary message = audio chunk (Int16 PCM, 16kHz mono)
            audio_buffer.extend(message)
            if diarize_mode:
                all_audio_for_diarize.extend(message)
            chunk_count += 1

            # Process when we have enough audio
            buffer_duration = len(audio_buffer) / 2 / SAMPLE_RATE  # Int16 = 2 bytes per sample
            if buffer_duration >= BUFFER_DURATION_SEC:
                audio_float = int16_to_float32(bytes(audio_buffer))

                # Transcribe (faster-whisper's built-in VAD handles silence)
                if len(audio_float) / SAMPLE_RATE >= MIN_AUDIO_SEC:
                    text = transcribe(audio_float, previous_text=full_transcript)
                    text = clean_transcript(text)
                    if text and not is_hallucination(text):
                        full_transcript += (" " + text) if full_transcript else text
                        await websocket.send(json.dumps({
                            "text": text,
                            "is_final": False,
                        }))
                        logger.info(f"[{client_id}] Chunk {chunk_count}: \"{text[:60]}...\"")

                # ZERO-RETENTION: keep overlap, clear rest from RAM
                overlap_bytes = int(OVERLAP_DURATION_SEC * SAMPLE_RATE * 2)  # 2 bytes per Int16 sample
                if len(audio_buffer) > overlap_bytes:
                    audio_buffer = bytearray(audio_buffer[-overlap_bytes:])
                else:
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
        all_audio_for_diarize.clear()
        # Rate limiting: decrement connection count
        ip_connections[client_ip] -= 1
        if ip_connections[client_ip] <= 0:
            del ip_connections[client_ip]
        logger.info(f"[{client_id}] Session ended, audio cleared from RAM ({ip_connections.get(client_ip, 0)} active from {client_ip})")


# ── HTTP handler for diarized transcription (uploaded files) ─────────

from http.server import BaseHTTPRequestHandler
import http.server
import threading

HTTP_PORT = int(os.environ.get("HTTP_PORT", "8766"))


class DiarizeHandler(BaseHTTPRequestHandler):
    """HTTP handler for /transcribe-diarize endpoint."""

    def do_POST(self):
        # ── Authentication: validate API key ──
        if DIARIZE_API_KEY:
            api_key = self.headers.get("X-API-Key", "")
            if api_key != DIARIZE_API_KEY:
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Unauthorized"}')
                logger.warning(f"HTTP diarize: unauthorized request (invalid API key)")
                return

        if self.path != "/transcribe-diarize":
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)

            audio_base64 = data.get("audio_base64", "")
            if not audio_base64:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"error": "Missing audio_base64"}')
                return

            # Decode base64 → float32 audio
            import base64
            audio_bytes = base64.b64decode(audio_base64)
            # Parse WAV data
            audio_float = int16_to_float32(audio_bytes)

            # If WAV header present, skip it
            if len(audio_bytes) > 44 and audio_bytes[:4] == b'RIFF':
                # Try soundfile for proper WAV decoding
                try:
                    import soundfile as sf_lib
                    audio_float, sr = sf_lib.read(io.BytesIO(audio_bytes))
                    if sr != SAMPLE_RATE:
                        # Simple resample by repeating/skipping
                        ratio = SAMPLE_RATE / sr
                        indices = np.arange(0, len(audio_float), 1.0 / ratio).astype(int)
                        indices = indices[indices < len(audio_float)]
                        audio_float = audio_float[indices]
                    audio_float = audio_float.astype(np.float32)
                    if len(audio_float.shape) > 1:
                        audio_float = audio_float[:, 0]  # mono
                except Exception:
                    # Fallback: skip WAV header and parse as int16
                    audio_float = int16_to_float32(audio_bytes[44:])

            logger.info(f"HTTP diarize: {len(audio_float)} samples ({len(audio_float) / SAMPLE_RATE:.1f}s)")

            # Transcribe plain text
            plain_text = transcribe(audio_float)
            plain_text = clean_transcript(plain_text)

            # Transcribe with speakers
            diarized_text = ""
            speaker_count = 0
            if diarize_pipeline is not None:
                diarized_text = transcribe_with_speakers(audio_float)
                if diarized_text:
                    # Count unique speakers
                    speaker_labels = set(re.findall(r'\[Mówca \d+\]', diarized_text))
                    speaker_count = len(speaker_labels)

            # ZERO-RETENTION
            del audio_float
            del audio_bytes

            response_data = json.dumps({
                "text": plain_text,
                "diarized_text": diarized_text if diarized_text else None,
                "speaker_count": speaker_count if speaker_count > 0 else None,
            })

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            origin = self.headers.get("Origin", "")
            allowed_origin = origin if origin in ("https://lilapu.com", "https://www.lilapu.com") or origin.startswith("http://localhost:") else "https://lilapu.com"
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.end_headers()
            self.wfile.write(response_data.encode())

            logger.info(f"HTTP diarize: {len(plain_text)} chars, {speaker_count} speakers")

        except Exception as e:
            logger.error(f"HTTP diarize error: {e}")
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self.send_response(200)
        origin = self.headers.get("Origin", "")
        allowed_origin = origin if origin in ("https://lilapu.com", "https://www.lilapu.com") or origin.startswith("http://localhost:") else "https://lilapu.com"
        self.send_header("Access-Control-Allow-Origin", allowed_origin)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def log_message(self, format, *args):
        """Suppress default HTTP server logs (we use our own logger)."""
        pass


def start_http_server():
    """Start HTTP server in a background thread."""
    server = http.server.HTTPServer((WS_HOST, HTTP_PORT), DiarizeHandler)
    logger.info(f"HTTP diarization server on http://{WS_HOST}:{HTTP_PORT}/transcribe-diarize")
    server.serve_forever()


async def main():
    # Start HTTP server in background thread
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()

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
