# RunPod Whisper WebSocket Server

Live streaming transkrypcja z Faster-Whisper + Silero-VAD.

## Deployment na RunPod Pod

### 1. Build i push Docker image

```bash
# Z katalogu runpod-whisper-ws/
docker build -t YOUR_DOCKERHUB/lilapu-whisper-ws:latest .
docker push YOUR_DOCKERHUB/lilapu-whisper-ws:latest
```

### 2. Utwórz RunPod Pod

1. Idź na [runpod.io/console/pods](https://www.runpod.io/console/pods)
2. **Create Pod** → wybierz GPU (np. RTX A4000 ~$0.20/h lub A40 ~$0.39/h)
3. **Docker Image**: `YOUR_DOCKERHUB/lilapu-whisper-ws:latest`
4. **Expose HTTP Ports**: `8765`
5. **Volume**: 20GB (na model Whisper large-v3)

### 3. Połącz z frontendem

Pod URL będzie: `wss://POD_ID-8765.proxy.runpod.net`

Ustaw tę wartość w env var `NEXT_PUBLIC_WHISPER_WS_URL`.

## Protokół WebSocket

```
Client → Server: binary (Int16 PCM, 16kHz mono)
Server → Client: {"text": "fragment", "is_final": false}
Client → Server: "STOP"
Server → Client: {"text": "pełna transkrypcja", "is_final": true}
```

## Zero-Retention

- Audio przetwarzane **wyłącznie w RAM**
- Po transkrypcji `audio_buffer.clear()`
- Brak zapisu na dysk
- Logi: tylko timestamp + długość audio
