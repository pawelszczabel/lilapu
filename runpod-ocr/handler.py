"""
RunPod Serverless Handler for GOT-OCR 2.0
VLM-based OCR for handwritten + printed text → Markdown
Model: stepfun-ai/GOT-OCR2_0 (Apache 2.0)
"""

import runpod
import base64
import torch
from transformers import AutoModel, AutoTokenizer
from PIL import Image
import io
import tempfile
import os

MODEL_NAME = "stepfun-ai/GOT-OCR2_0"

# Pre-load model on cold start
print(f"Loading {MODEL_NAME}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModel.from_pretrained(
    MODEL_NAME,
    trust_remote_code=True,
    low_cpu_mem_usage=True,
    device_map="cuda",
    torch_dtype=torch.bfloat16,
)
model = model.eval()
print("GOT-OCR 2.0 model loaded!")


def handler(event):
    """
    RunPod handler for OCR.

    Input:
        image_base64: str - base64-encoded image (JPEG/PNG)
        ocr_type: str - "ocr" (plain text) or "format" (Markdown structured)

    Output:
        text: str - recognized text
        ocr_type: str - echo of input ocr_type
    """
    input_data = event.get("input", {})
    image_base64 = input_data.get("image_base64", "")
    ocr_type = input_data.get("ocr_type", "format")  # default: Markdown

    if not image_base64:
        return {"error": "No image_base64 provided"}

    # Decode image → save to temp file (GOT requires file path)
    try:
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        return {"error": f"Invalid image: {str(e)}"}

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        image.save(f, format="PNG")
        temp_path = f.name

    try:
        # Run OCR
        # ocr_type="ocr" → plain text output
        # ocr_type="format" → Markdown structured output
        result = model.chat(
            tokenizer,
            temp_path,
            ocr_type=ocr_type,
        )

        return {
            "text": result,
            "ocr_type": ocr_type,
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        os.unlink(temp_path)


runpod.serverless.start({"handler": handler})
