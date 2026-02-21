"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// ── Config ───────────────────────────────────────────────────────────
// RunPod Serverless (production) — set env vars in Convex dashboard
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY ?? "";
const WHISPER_ENDPOINT_ID = process.env.WHISPER_ENDPOINT_ID ?? "";
const BIELIK_ENDPOINT_ID = process.env.BIELIK_ENDPOINT_ID ?? "";

// Local fallback (dev) — used when RunPod env vars are not set
const LOCAL_AI_URL = process.env.AI_SERVER_URL ?? "http://localhost:8080";
const LOCAL_WHISPER_URL =
    process.env.WHISPER_SERVER_URL ?? "http://localhost:8081";

const USE_RUNPOD = !!(RUNPOD_API_KEY && WHISPER_ENDPOINT_ID);

// ── RunPod helpers ───────────────────────────────────────────────────

async function runpodRequest(
    endpointId: string,
    input: Record<string, unknown>,
    timeoutMs = 120_000
): Promise<Record<string, unknown>> {
    const url = `https://api.runpod.ai/v2/${endpointId}/runsync`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RUNPOD_API_KEY}`,
        },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`RunPod error ${response.status}: ${text}`);
    }

    const result = await response.json();

    if (result.status === "FAILED") {
        throw new Error(`RunPod job failed: ${JSON.stringify(result.error)}`);
    }

    return result.output ?? result;
}

// ── Transcribe ───────────────────────────────────────────────────────

export const transcribe = action({
    args: {
        audioBase64: v.string(),
    },
    returns: v.string(),
    handler: async (_ctx, args) => {
        if (USE_RUNPOD) {
            // RunPod Faster Whisper endpoint
            const result = await runpodRequest(WHISPER_ENDPOINT_ID, {
                audio_base64: args.audioBase64,
                language: "pl",
                model: "large-v3",
                word_timestamps: false,
            });
            // Faster Whisper worker returns { text: "..." } or { transcription: "..." }
            return (
                (result as { text?: string; transcription?: string }).text ??
                (result as { transcription?: string }).transcription ??
                ""
            );
        }

        // Local whisper.cpp fallback
        const audioBuffer = Buffer.from(args.audioBase64, "base64");
        const formData = new FormData();
        formData.append(
            "file",
            new Blob([audioBuffer], { type: "audio/wav" }),
            "audio.wav"
        );
        formData.append("language", "pl");
        formData.append("response_format", "json");

        const response = await fetch(`${LOCAL_WHISPER_URL}/inference`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Whisper error: ${response.status}`);
        }

        const result = await response.json();
        return result.text ?? "";
    },
});

// ── Chat ─────────────────────────────────────────────────────────────

export const chat = action({
    args: {
        systemPrompt: v.string(),
        userMessage: v.string(),
        context: v.optional(v.string()),
    },
    returns: v.string(),
    handler: async (_ctx, args) => {
        const messages = [
            { role: "system", content: args.systemPrompt },
        ];

        if (args.context) {
            messages.push({
                role: "system",
                content: `Kontekst z notatek:\n${args.context}`,
            });
        }

        messages.push({ role: "user", content: args.userMessage });

        const chatPayload = {
            messages,
            max_tokens: 1024,
            temperature: 0.7,
            stream: false,
        };

        if (USE_RUNPOD && BIELIK_ENDPOINT_ID) {
            // RunPod llama.cpp endpoint (OpenAI-compatible)
            const result = await runpodRequest(
                BIELIK_ENDPOINT_ID,
                { openai_route: "/v1/chat/completions", openai_input: chatPayload },
                180_000
            );
            // Extract response from RunPod wrapper
            const choices = (result as { choices?: Array<{ message?: { content?: string } }> }).choices;
            return choices?.[0]?.message?.content ?? "";
        }

        // Local llama.cpp fallback
        const response = await fetch(`${LOCAL_AI_URL}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chatPayload),
        });

        if (!response.ok) {
            throw new Error(`LLM error: ${response.status}`);
        }

        const result = await response.json();
        return result.choices?.[0]?.message?.content ?? "";
    },
});

// ── Embeddings ───────────────────────────────────────────────────────

export const embed = action({
    args: {
        text: v.string(),
    },
    returns: v.array(v.float64()),
    handler: async (_ctx, args) => {
        if (USE_RUNPOD && BIELIK_ENDPOINT_ID) {
            // RunPod llama.cpp embedding endpoint
            const result = await runpodRequest(BIELIK_ENDPOINT_ID, {
                openai_route: "/embedding",
                openai_input: { content: args.text },
            });
            return (result as { embedding?: number[] }).embedding ?? [];
        }

        // Local llama.cpp fallback
        const response = await fetch(`${LOCAL_AI_URL}/embedding`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: args.text }),
        });

        if (!response.ok) {
            throw new Error(`Embedding error: ${response.status}`);
        }

        const result = await response.json();
        return result.embedding ?? [];
    },
});
