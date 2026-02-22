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
        // Merge system prompt and context into one system message
        // (vLLM requires strict user/assistant alternation, no consecutive system messages)
        let systemContent = args.systemPrompt;
        if (args.context) {
            systemContent += `\n\nKontekst z notatek:\n${args.context}`;
        }

        const messages = [
            { role: "system", content: systemContent },
            { role: "user", content: args.userMessage },
        ];

        const chatPayload = {
            messages,
            max_tokens: 1024,
            temperature: 0.7,
            stream: false,
        };

        if (USE_RUNPOD && BIELIK_ENDPOINT_ID) {
            // RunPod vLLM endpoint
            const result = await runpodRequest(
                BIELIK_ENDPOINT_ID,
                {
                    messages,
                    sampling_params: {
                        max_tokens: 1024,
                        temperature: 0.7,
                    },
                },
                180_000
            );

            console.log("RunPod chat raw result:", JSON.stringify(result).slice(0, 2000));

            // vLLM RunPod worker returns:
            // [{choices:[{tokens:["token1","token2",...]}], usage:{...}}]
            // or sometimes just the inner object

            let parsed: unknown = result;

            // If it's an array, take the first element
            if (Array.isArray(parsed)) {
                parsed = parsed[0];
            }

            const obj = parsed as Record<string, unknown>;

            // Format: choices[0].tokens[] (vLLM native)
            if (Array.isArray(obj?.choices)) {
                const choice = (obj.choices as Array<Record<string, unknown>>)[0];
                if (choice) {
                    // tokens array → join
                    if (Array.isArray(choice.tokens)) {
                        return (choice.tokens as string[]).join("").trim();
                    }
                    // OpenAI format: message.content
                    const msg = choice.message as Record<string, unknown> | undefined;
                    if (msg?.content) return String(msg.content).trim();
                    // Alt: choice.text
                    if (typeof choice.text === "string") return choice.text.trim();
                }
            }

            // Fallback: text array or string
            if (Array.isArray(obj?.text)) {
                return ((obj.text as string[])[0] ?? "").trim();
            }
            if (typeof obj?.text === "string") {
                return obj.text.trim();
            }

            console.log("RunPod chat: unrecognized format, returning raw");
            return JSON.stringify(result);
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
            // RunPod vLLM embedding — pass text directly
            const result = await runpodRequest(BIELIK_ENDPOINT_ID, {
                input: args.text,
            });
            // vLLM returns { data: [{ embedding: [...] }] } or { embedding: [...] }
            const resAny = result as Record<string, unknown>;
            if (Array.isArray(resAny.data)) {
                const first = (resAny.data as Array<{ embedding?: number[] }>)[0];
                return first?.embedding ?? [];
            }
            return (resAny as { embedding?: number[] }).embedding ?? [];
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
