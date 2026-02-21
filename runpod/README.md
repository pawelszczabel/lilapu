# RunPod — Bielik-11B Serverless Endpoint

## Setup (jednorazowo)

### 1. Konto RunPod
1. Zarejestruj się na [runpod.io](https://runpod.io)
2. Doładuj konto ($5-10 na start)
3. Wygeneruj API Key: **Settings → API Keys → Create**

### 2. Endpoint Whisper (gotowy template)
1. RunPod Console → **Serverless → New Endpoint**
2. Wyszukaj template: **"Faster Whisper"**
3. Konfiguracja:
   - GPU: **RTX 4090** (lub najtańsza dostępna)
   - Min Workers: **0** (płacisz tylko za użycie)
   - Max Workers: **1**
   - Idle Timeout: **30s**
4. **Create Endpoint** → zapisz `ENDPOINT_ID`

### 3. Endpoint Bielik (custom Docker)

#### Build & Push Docker image:
```bash
cd ~/Lilapu/runpod
docker build -f Dockerfile.bielik -t YOUR_DOCKER_USER/lilapu-bielik:latest .
docker push YOUR_DOCKER_USER/lilapu-bielik:latest
```

#### Utwórz endpoint:
1. RunPod Console → **Serverless → New Endpoint**
2. **Container Image**: `YOUR_DOCKER_USER/lilapu-bielik:latest`
3. Konfiguracja:
   - GPU: **RTX 4090**
   - Container Disk: **30 GB**
   - Min Workers: **0**
   - Max Workers: **1**
   - Idle Timeout: **60s**
4. **Create Endpoint** → zapisz `ENDPOINT_ID`

### 4. Połącz z Convex
```bash
cd ~/Lilapu/web
npx convex env set RUNPOD_API_KEY "rp_XXXXXXXXXX"
npx convex env set WHISPER_ENDPOINT_ID "abc123..."
npx convex env set BIELIK_ENDPOINT_ID "def456..."
```

### 5. GOTOWE! 🎉
Cloudflare tunnels i lokalne serwery AI **nie są już potrzebne**.

## Koszty
- Whisper: ~$0.0004/min transkrypcji (~0.002 PLN/min)
- Bielik: ~$0.0002/pytanie (~0.001 PLN/pytanie)
- Cold start: ~30-60s (pierwszy request po przerwie)

## Przejście na Secure Cloud
1. RunPod Console → Endpoint → **Edit**
2. Zmień Network Type na **Secure Cloud**
3. Koszt wzrasta o ~$0.10-0.40/hr, ale dane w certyfikowanym datacenter (SOC2)
