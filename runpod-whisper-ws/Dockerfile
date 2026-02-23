FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip git ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python deps
RUN pip3 install --no-cache-dir \
    faster-whisper==1.0.3 \
    websockets==12.0 \
    torch==2.1.2 \
    numpy \
    onnxruntime \
    pyannote.audio==3.3.2 \
    speechbrain \
    soundfile

# Copy server
COPY server.py /app/server.py
WORKDIR /app

# Expose WebSocket port
EXPOSE 8765

# Pre-download Whisper model on build (faster cold start)
RUN python3 -c "from faster_whisper import WhisperModel; WhisperModel('large-v3', device='cpu', compute_type='int8')" || true

CMD ["python3", "server.py"]
