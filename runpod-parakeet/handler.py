"""
RunPod Serverless Handler — NVIDIA Parakeet TDT 0.6B v3
Fast speech-to-text for notes. Zero-retention: audio in RAM only.

Input:  { "audio_base64": "...", "language": "pl" }
Output: { "text": "..." }
"""

import base64
import io
import logging
import os
import re
import tempfile

import runpod
import soundfile as sf
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

# ── Load model at startup ────────────────────────────────────────────
logger.info("Loading Parakeet TDT 0.6B v3...")
import nemo.collections.asr as nemo_asr

MODEL = nemo_asr.models.ASRModel.from_pretrained("nvidia/parakeet-tdt-0.6b-v3")
logger.info("Parakeet model loaded!")


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


# ── Cleanup ──────────────────────────────────────────────────────────
FILLER_PATTERNS = [
    r'\b(no|noo|nooo)\b(?![\w-])',
    r'\b(znaczy)\b',
    r'\b(wiesz)\b',
    r'\b(tak jakby)\b',
    r'\b(ee+|yyy+|hmm+|aaa+|eee+)\b',
]


def clean_transcript(text: str) -> str:
    """Basic regex cleanup: remove filler words, fix capitalization."""
    if not text:
        return text
    for pattern in FILLER_PATTERNS:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    # Remove repeated words
    text = re.sub(r'\b(\w+)(\s+\1){1,}\b', r'\1', text, flags=re.IGNORECASE)
    # Clean up spaces/commas
    text = re.sub(r'\s*,\s*,', ',', text)
    text = re.sub(r'\s{2,}', ' ', text).strip()
    # Capitalize after period
    text = re.sub(r'\.\s+([a-ząćęłńóśźż])', lambda m: '. ' + m.group(1).upper(), text)
    if text:
        text = text[0].upper() + text[1:]
    if text and text[-1] not in '.!?':
        text += '.'
    return text


# ── Handler ──────────────────────────────────────────────────────────

def handler(event):
    """RunPod serverless handler."""
    try:
        input_data = event.get("input", {})
        audio_base64 = input_data.get("audio_base64", "")

        if not audio_base64:
            return {"error": "Missing audio_base64"}

        # Decode base64 → bytes
        audio_bytes = base64.b64decode(audio_base64)
        logger.info(f"Received audio: {len(audio_bytes)} bytes")

        # Write to temp file (NeMo requires file path)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()

            # Transcribe
            result = MODEL.transcribe([tmp.name])

        # ZERO-RETENTION: audio_bytes cleared after this scope
        del audio_bytes

        # Extract text from result
        # NeMo returns list of transcriptions
        if isinstance(result, list) and len(result) > 0:
            # NeMo 2.x returns list of Hypothesis objects or strings
            text = str(result[0])
            # If it's a Hypothesis object, get the text
            if hasattr(result[0], 'text'):
                text = result[0].text
        else:
            text = str(result)

        text = text.strip()

        # Post-processing
        if is_hallucination(text):
            logger.info(f"Hallucination filtered: \"{text}\"")
            return {"text": ""}

        text = clean_transcript(text)
        logger.info(f"Transcription: \"{text[:100]}...\"")

        return {"text": text}

    except Exception as e:
        logger.error(f"Error: {e}")
        return {"error": str(e)}


runpod.serverless.start({"handler": handler})
