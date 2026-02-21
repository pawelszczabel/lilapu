#!/bin/bash
# Lilapu — Start local AI servers
# whisper.cpp on port 8081, llama.cpp (Bielik-7B) on port 8080

LILAPU_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🚀 Starting Lilapu AI servers..."
echo "   Directory: $LILAPU_DIR"

# Check if models exist
if [ ! -f "$LILAPU_DIR/whisper.cpp/models/ggml-medium.bin" ]; then
  echo "❌ Whisper model not found. Run:"
  echo "   cd $LILAPU_DIR/whisper.cpp && bash models/download-ggml-model.sh small"
  exit 1
fi

BIELIK_MODEL="$LILAPU_DIR/llama.cpp/models/bielik-7b-instruct-v0.1.Q4_K_M.gguf"
if [ ! -f "$BIELIK_MODEL" ]; then
  echo "❌ Bielik model not found at: $BIELIK_MODEL"
  echo "   Download from HuggingFace: speakleash/Bielik-7B-Instruct-v0.1-GGUF"
  exit 1
fi

# Start Whisper server
echo "🎙️  Starting whisper.cpp server on :8081..."
"$LILAPU_DIR/whisper.cpp/build/bin/whisper-server" \
  -m "$LILAPU_DIR/whisper.cpp/models/ggml-medium.bin" \
  --host 0.0.0.0 --port 8081 --language pl &
WHISPER_PID=$!

# Start Bielik/llama.cpp server
echo "🧠 Starting Bielik-7B (llama.cpp) on :8080..."
"$LILAPU_DIR/llama.cpp/build/bin/llama-server" \
  -m "$BIELIK_MODEL" \
  --host 0.0.0.0 --port 8080 \
  -ngl 0 -c 2048 --embeddings &
# TODO: Zwiększ -ngl do 99 kiedy będzie więcej GPU VRAM (np. RunPod RTX A5000 24GB)
# Na M1 8GB: -ngl 25 = kompromis z whisper-medium. Na GPU serwerze: -ngl 99 = pełna prędkość.
LLAMA_PID=$!

echo ""
echo "✅ AI servers starting:"
echo "   Whisper: http://localhost:8081 (PID: $WHISPER_PID)"
echo "   Bielik:  http://localhost:8080 (PID: $LLAMA_PID)"
echo ""
echo "💡 To stop: ./scripts/stop-ai.sh"
echo ""

# Save PIDs for stop script
echo "$WHISPER_PID" > "$LILAPU_DIR/scripts/.whisper.pid"
echo "$LLAMA_PID" > "$LILAPU_DIR/scripts/.llama.pid"

wait
