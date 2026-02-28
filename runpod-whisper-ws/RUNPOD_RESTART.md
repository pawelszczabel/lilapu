# RunPod Whisper WS — Restart Guide

## Pierwszy raz po nowym podzie

Na podzie w web terminalu utwórz skrypt startowy:

```bash
cat > /workspace/start.sh << 'EOF'
#!/bin/bash
export WS_TOKEN_SECRET=3c36011f30118b7268ac45180fe57c4590e8ea5f927b697150764d5703676a12
pip install -q websockets faster-whisper 2>/dev/null
cd /workspace && nohup python server.py > server.log 2>&1 &
echo "✅ Server starting... check: tail -f /workspace/server.log"
EOF
chmod +x /workspace/start.sh
```

## Po każdym restarcie poda

```bash
bash /workspace/start.sh
```

Poczekaj ~30 sekund na załadowanie modeli Whisper + Silero-VAD.

### Sprawdzenie statusu

```bash
tail -f /workspace/server.log
```

Powinno pokazać:
```
Whisper model loaded!
Silero-VAD loaded!
WebSocket server started on port 8765
```

### Port 8765 → „Not ready"

Status w RunPod Connect może pokazywać „Not ready" przez chwilę po starcie — to normalne, serwer działa.
Otworzenie linku HTTP Service w przeglądarce pokaże błąd „missing Connection header" — to **oczekiwane** (WebSocket serwer, nie HTTP).
