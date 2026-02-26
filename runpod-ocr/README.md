# RunPod OCR Worker — GOT-OCR 2.0

Serverless OCR worker for handwritten + printed text recognition, powered by [GOT-OCR 2.0](https://huggingface.co/stepfun-ai/GOT-OCR2_0) (Apache 2.0).

## Features
- **VLM end-to-end** — image → structured Markdown in one step
- **Handwriting support** — recognizes handwritten notes from notebooks
- **Polish language** — native support via Qwen2.5 language model core
- **Two modes:** plain text (`ocr`) or Markdown formatted (`format`)

## Build & Deploy

```bash
# Build Docker image
docker build -t lilapu-ocr-got .

# Push to Docker Hub (for RunPod)
docker tag lilapu-ocr-got <your-dockerhub>/lilapu-ocr-got:latest
docker push <your-dockerhub>/lilapu-ocr-got:latest
```

Then create a RunPod Serverless endpoint with:
- **Docker image:** `<your-dockerhub>/lilapu-ocr-got:latest`
- **GPU:** A10 (24GB VRAM) — minimum required
- **Volume:** 20GB (for model cache)

## API

**Input:**
```json
{
  "input": {
    "image_base64": "<base64-encoded-image>",
    "ocr_type": "format"
  }
}
```

**Output:**
```json
{
  "text": "# Sesja 26.02\n\nPacjent opisuje nasilenie...",
  "ocr_type": "format"
}
```

## Requirements
- GPU: NVIDIA A10 (24GB VRAM) or better
- Model size: ~1.2GB (downloaded on first cold start)
- Cold start: ~30-40s (model download + load)
- Inference: ~3-5s per image
