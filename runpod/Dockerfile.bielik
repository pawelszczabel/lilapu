FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    cmake build-essential git curl \
    && rm -rf /var/lib/apt/lists/*

# Build llama.cpp with CUDA
RUN git clone https://github.com/ggerganov/llama.cpp /llama.cpp && \
    cd /llama.cpp && \
    cmake -B build -DGGML_CUDA=ON && \
    cmake --build build --config Release -j$(nproc)

# Download Bielik-11B v2.6 Q8_0
RUN mkdir -p /models && \
    curl -L -o /models/bielik-11b-v2.6-instruct-q8_0.gguf \
    "https://huggingface.co/speakleash/Bielik-11B-v2.6-Instruct-GGUF/resolve/main/Bielik-11B-v2.6-Instruct-Q8_0.gguf"

# Install RunPod Python SDK
RUN pip install runpod requests

# Copy handler
COPY handler.py /handler.py

# llama-server will be started by the handler
EXPOSE 8080

CMD ["python", "/handler.py"]
