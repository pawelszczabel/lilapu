FROM runpod/pytorch:2.1.0-py3.10-cuda11.8.0-devel-ubuntu22.04

# Install dependencies for GOT-OCR 2.0
RUN pip install --no-cache-dir \
    transformers>=4.37.0 \
    tiktoken \
    verovio \
    accelerate \
    runpod \
    Pillow

# Copy handler (model will be downloaded on first cold start)
COPY handler.py /handler.py

CMD ["python", "/handler.py"]
