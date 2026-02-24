FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Python deps — NeMo ASR for Parakeet
RUN pip install --no-cache-dir \
    nemo_toolkit[asr]==2.2.0 \
    runpod \
    soundfile \
    ffmpeg-python

# Pre-download model on build (faster cold start)
RUN python -c "import nemo.collections.asr as nemo_asr; nemo_asr.models.ASRModel.from_pretrained('nvidia/parakeet-tdt-0.6b-v3')" || true

COPY handler.py /handler.py

CMD ["python", "/handler.py"]
