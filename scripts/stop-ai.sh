#!/bin/bash
# Lilapu — Stop AI servers

LILAPU_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🛑 Stopping Lilapu AI servers..."

if [ -f "$LILAPU_DIR/scripts/.whisper.pid" ]; then
  kill "$(cat "$LILAPU_DIR/scripts/.whisper.pid")" 2>/dev/null && echo "   Whisper stopped"
  rm "$LILAPU_DIR/scripts/.whisper.pid"
fi

if [ -f "$LILAPU_DIR/scripts/.llama.pid" ]; then
  kill "$(cat "$LILAPU_DIR/scripts/.llama.pid")" 2>/dev/null && echo "   Bielik stopped"
  rm "$LILAPU_DIR/scripts/.llama.pid"
fi

# Also kill any stray processes
pkill -f "whisper-server" 2>/dev/null
pkill -f "llama-server" 2>/dev/null

echo "✅ Done"
