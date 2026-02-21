"""
RunPod Serverless Handler for Bielik-11B (llama.cpp)
Supports: /v1/chat/completions, /embedding
"""

import runpod
import subprocess
import time
import requests
import os
import signal

LLAMA_SERVER_PORT = 8080
MODEL_PATH = "/models/bielik-11b-v2.6-instruct-q8_0.gguf"
N_GPU_LAYERS = int(os.environ.get("N_GPU_LAYERS", "-1"))
CTX_SIZE = int(os.environ.get("CTX_SIZE", "4096"))

server_process = None


def start_llama_server():
    """Start llama-server in background."""
    global server_process

    cmd = [
        "/llama.cpp/build/bin/llama-server",
        "-m", MODEL_PATH,
        "--host", "0.0.0.0",
        "--port", str(LLAMA_SERVER_PORT),
        "-ngl", str(N_GPU_LAYERS),
        "-c", str(CTX_SIZE),
        "--embeddings",
    ]

    server_process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Wait for server to be ready
    for _ in range(60):
        try:
            resp = requests.get(f"http://localhost:{LLAMA_SERVER_PORT}/health", timeout=2)
            if resp.ok:
                print("llama-server is ready!")
                return True
        except Exception:
            pass
        time.sleep(1)

    raise RuntimeError("llama-server failed to start within 60s")


def handler(event):
    """RunPod handler — routes to llama-server endpoints."""
    input_data = event.get("input", {})
    route = input_data.get("openai_route", "/v1/chat/completions")
    payload = input_data.get("openai_input", input_data)

    url = f"http://localhost:{LLAMA_SERVER_PORT}{route}"

    try:
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120,
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"error": str(e)}


# Start llama-server on cold start
start_llama_server()

# Register handler
runpod.serverless.start({"handler": handler})
