"""
RunPod Serverless Handler for Bielik-11B (llama-cpp-python)
Supports: chat completions + embeddings
Model downloaded on first cold start, then cached.
"""

import runpod
import os
from huggingface_hub import hf_hub_download

MODEL_DIR = "/models"
MODEL_REPO = "speakleash/Bielik-11B-v2.6-Instruct-GGUF"
MODEL_FILE = "Bielik-11B-v2.6-Instruct-Q8_0.gguf"
MODEL_PATH = os.path.join(MODEL_DIR, MODEL_FILE)

N_GPU_LAYERS = int(os.environ.get("N_GPU_LAYERS", "-1"))
CTX_SIZE = int(os.environ.get("CTX_SIZE", "4096"))


def download_model():
    """Download model if not already cached."""
    if os.path.exists(MODEL_PATH):
        print(f"Model already cached at {MODEL_PATH}")
        return
    print(f"Downloading {MODEL_FILE} from {MODEL_REPO}...")
    os.makedirs(MODEL_DIR, exist_ok=True)
    hf_hub_download(
        repo_id=MODEL_REPO,
        filename=MODEL_FILE,
        local_dir=MODEL_DIR,
    )
    print("Download complete!")


def load_model():
    """Load model into GPU."""
    from llama_cpp import Llama
    print(f"Loading model: {MODEL_PATH}")
    model = Llama(
        model_path=MODEL_PATH,
        n_gpu_layers=N_GPU_LAYERS,
        n_ctx=CTX_SIZE,
        embedding=True,
        verbose=False,
    )
    print("Model loaded!")
    return model


# Download + load on cold start
download_model()
llm = load_model()


def handler(event):
    """RunPod handler — chat completions or embeddings."""
    input_data = event.get("input", {})
    route = input_data.get("openai_route", "/v1/chat/completions")
    payload = input_data.get("openai_input", input_data)

    try:
        if route == "/embedding" or route == "/v1/embeddings":
            text = payload.get("content", payload.get("input", ""))
            result = llm.create_embedding(text)
            embedding = result["data"][0]["embedding"]
            return {"embedding": embedding}

        else:
            messages = payload.get("messages", [])
            max_tokens = payload.get("max_tokens", 1024)
            temperature = payload.get("temperature", 0.7)

            result = llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return result

    except Exception as e:
        return {"error": str(e)}


runpod.serverless.start({"handler": handler})
