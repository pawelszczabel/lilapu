FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Install llama-cpp-python with CUDA support + dependencies
ENV CMAKE_ARGS="-DGGML_CUDA=on"
RUN pip install --no-cache-dir \
    llama-cpp-python==0.3.4 \
    runpod \
    huggingface-hub

# Copy handler (model will be downloaded on first cold start)
COPY handler.py /handler.py

CMD ["python", "/handler.py"]
