"""
RunPod Serverless Handler for Bielik-11B (llama-cpp-python)
Supports: chat completions + embeddings
"""

import runpod
import os
from llama_cpp import Llama

MODEL_PATH = "/models/Bielik-11B-v2.6-Instruct-Q8_0.gguf"
N_GPU_LAYERS = int(os.environ.get("N_GPU_LAYERS", "-1"))
CTX_SIZE = int(os.environ.get("CTX_SIZE", "4096"))

# Load model on cold start
print(f"Loading model: {MODEL_PATH}")
llm = Llama(
    model_path=MODEL_PATH,
    n_gpu_layers=N_GPU_LAYERS,
    n_ctx=CTX_SIZE,
    embedding=True,
    verbose=False,
)
print("Model loaded!")


def handler(event):
    """RunPod handler — chat completions or embeddings."""
    input_data = event.get("input", {})
    route = input_data.get("openai_route", "/v1/chat/completions")
    payload = input_data.get("openai_input", input_data)

    try:
        if route == "/embedding" or route == "/v1/embeddings":
            # Embedding request
            text = payload.get("content", payload.get("input", ""))
            result = llm.create_embedding(text)
            embedding = result["data"][0]["embedding"]
            return {"embedding": embedding}

        else:
            # Chat completion request
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
