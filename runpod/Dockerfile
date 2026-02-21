FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Install llama-cpp-python with CUDA support (prebuilt wheel, no compilation needed)
ENV CMAKE_ARGS="-DGGML_CUDA=on"
RUN pip install --no-cache-dir \
    llama-cpp-python==0.3.4 \
    runpod \
    huggingface-hub

# Download Bielik-11B v2.6 Q8_0 model
RUN python -c "from huggingface_hub import hf_hub_download; hf_hub_download('speakleash/Bielik-11B-v2.6-Instruct-GGUF', 'Bielik-11B-v2.6-Instruct-Q8_0.gguf', local_dir='/models')"

# Copy handler
COPY handler.py /handler.py

CMD ["python", "/handler.py"]
