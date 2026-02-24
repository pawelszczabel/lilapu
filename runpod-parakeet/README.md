# RunPod Parakeet — Fast Speech-to-Text

Ultra-szybka transkrypcja z NVIDIA Parakeet TDT 0.6B v3.
Używana dla notatek głosowych (nie wymaga diaryzacji).

## Deployment na RunPod Serverless

### 1. Build i push Docker image

```bash
# Z katalogu runpod-parakeet/
docker build -t YOUR_DOCKERHUB/lilapu-parakeet:latest .
docker push YOUR_DOCKERHUB/lilapu-parakeet:latest
```

### 2. Utwórz RunPod Serverless Endpoint

1. Idź na [runpod.io/console/serverless](https://www.runpod.io/console/serverless)
2. **New Endpoint** → Custom Docker Image
3. **Docker Image**: `YOUR_DOCKERHUB/lilapu-parakeet:latest`
4. **GPU**: RTX A4000 lub A40 (16GB+ VRAM)
5. **Min Workers**: 0, **Max Workers**: 3

### 3. Podłącz do Lilapu

```bash
npx convex env set PARAKEET_ENDPOINT_ID "twój-endpoint-id"
```

## API

```json
// Input
{ "input": { "audio_base64": "base64...", "language": "pl" } }

// Output
{ "output": { "text": "Transkrypcja tekstu..." } }
```

## Zero-Retention

- Audio przetwarzane **wyłącznie w RAM**
- Blok `with tempfile` automatycznie kasuje plik tymczasowy
- Brak zapisu na dysk permanentny
