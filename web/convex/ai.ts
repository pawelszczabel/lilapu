"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// ── Config ───────────────────────────────────────────────────────────
// RunPod Serverless (production) — set env vars in Convex dashboard
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY ?? "";
const WHISPER_ENDPOINT_ID = process.env.WHISPER_ENDPOINT_ID ?? "";
const PARAKEET_ENDPOINT_ID = process.env.PARAKEET_ENDPOINT_ID ?? "";
const BIELIK_ENDPOINT_ID = process.env.BIELIK_ENDPOINT_ID ?? "";

// Whisper WebSocket server HTTP endpoint (for diarized transcription of uploads)
const WHISPER_WS_HTTP_URL = process.env.WHISPER_WS_HTTP_URL ?? "";

// Local fallback (dev) — used when RunPod env vars are not set
const LOCAL_AI_URL = process.env.AI_SERVER_URL ?? "http://localhost:8080";
const LOCAL_WHISPER_URL =
    process.env.WHISPER_SERVER_URL ?? "http://localhost:8081";

const USE_RUNPOD = !!(RUNPOD_API_KEY && WHISPER_ENDPOINT_ID);
const USE_PARAKEET = !!(RUNPOD_API_KEY && PARAKEET_ENDPOINT_ID);

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
            // RunPod Faster Whisper endpoint — optimized for anti-hallucination
            const result = await runpodRequest(WHISPER_ENDPOINT_ID, {
                audio_base64: args.audioBase64,
                language: "pl",
                model: "large-v3",
                word_timestamps: false,
                // Anti-hallucination: contextual prompt guides transcription
                initial_prompt: "Transkrypcja rozmowy po polsku.",
                // Anti-hallucination: deterministic output
                temperature: 0,
            });

            // DEBUG: log raw Whisper response
            // Sensitive data — do not log raw transcription results

            // Faster Whisper worker returns { text: "..." } or { transcription: "..." }
            const resAny = result as Record<string, unknown>;
            let text = "";
            if (typeof resAny.text === "string") {
                text = resAny.text;
            } else if (typeof resAny.transcription === "string") {
                text = resAny.transcription;
            } else if (Array.isArray(resAny.segments)) {
                // Some workers return { segments: [{ text: "..." }] }
                text = (resAny.segments as Array<{ text?: string }>)
                    .map((s) => s.text ?? "")
                    .join(" ");
            }

            // Anti-hallucination: post-processing blacklist
            const HALLUCINATION_PATTERNS = [
                "wszelkie prawa zastrzeżone",
                "napisy stworzone przez",
                "napisy wykonał",
                "subskrybuj",
                "subscribe",
                "dziękuję za uwagę",
                "dziękuję za obejrzenie",
                "do zobaczenia",
                "thanks for watching",
                "copyright",
                "all rights reserved",
                "tłumaczenie",
                "amara.org",
            ];

            const lowerText = text.toLowerCase().trim();
            for (const pattern of HALLUCINATION_PATTERNS) {
                if (lowerText === pattern || lowerText === pattern + ".") {
                    // Hallucination filtered (no content logged for privacy)
                    return "";
                }
            }

            return text;
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

// ── Transcribe Fast (Parakeet — for notes) ──────────────────────────

export const transcribeFast = action({
    args: {
        audioBase64: v.string(),
    },
    returns: v.string(),
    handler: async (_ctx, args) => {
        if (USE_PARAKEET) {
            const result = await runpodRequest(PARAKEET_ENDPOINT_ID, {
                audio_base64: args.audioBase64,
                language: "pl",
            });

            // Sensitive data — do not log raw transcription results

            const resAny = result as Record<string, unknown>;
            const text = typeof resAny.text === "string" ? resAny.text : "";

            return text;
        }

        // Fallback: use regular Whisper transcription
        console.log("Parakeet not configured, falling back to Whisper");
        // Delegate to Whisper inline
        if (USE_RUNPOD) {
            const result = await runpodRequest(WHISPER_ENDPOINT_ID, {
                audio_base64: args.audioBase64,
                language: "pl",
                model: "large-v3",
                word_timestamps: false,
                initial_prompt: "Transkrypcja rozmowy po polsku.",
                temperature: 0,
            });
            const resAny = result as Record<string, unknown>;
            if (typeof resAny.text === "string") return resAny.text;
            if (typeof resAny.transcription === "string") return resAny.transcription;
            return "";
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

// ── Transcribe with Diarization (for uploaded audio files) ──────────

export const transcribeWithDiarization = action({
    args: {
        audioBase64: v.string(),
    },
    returns: v.object({
        text: v.string(),
        contentWithSpeakers: v.optional(v.string()),
        speakerCount: v.optional(v.number()),
    }),
    handler: async (_ctx, args) => {
        if (WHISPER_WS_HTTP_URL) {
            // Use the HTTP diarization endpoint on the Whisper WS server
            const diarizeApiKey = process.env.DIARIZE_API_KEY ?? "";
            const response = await fetch(`${WHISPER_WS_HTTP_URL}/transcribe-diarize`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(diarizeApiKey ? { "X-API-Key": diarizeApiKey } : {}),
                },
                body: JSON.stringify({
                    audio_base64: args.audioBase64,
                    language: "pl",
                }),
                signal: AbortSignal.timeout(300_000), // 5 min for long files
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Diarization error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            // Sensitive data — do not log raw diarization results

            const text = result.text ?? "";
            const diarizedText = result.diarized_text ?? undefined;
            const speakerCount = result.speaker_count ?? undefined;

            return {
                text,
                contentWithSpeakers: diarizedText,
                speakerCount,
            };
        }

        // Fallback: regular transcription without diarization
        if (USE_RUNPOD) {
            const result = await runpodRequest(WHISPER_ENDPOINT_ID, {
                audio_base64: args.audioBase64,
                language: "pl",
                model: "large-v3",
                word_timestamps: false,
                initial_prompt: "Transkrypcja rozmowy po polsku.",
                temperature: 0,
            });

            const resAny = result as Record<string, unknown>;
            let text = "";
            if (typeof resAny.text === "string") text = resAny.text;
            else if (typeof resAny.transcription === "string") text = resAny.transcription;

            return { text, contentWithSpeakers: undefined, speakerCount: undefined };
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
        return { text: result.text ?? "", contentWithSpeakers: undefined, speakerCount: undefined };
    },
});

// ── Chat ─────────────────────────────────────────────────────────────

export const chat = action({
    args: {
        userMessage: v.string(),
        context: v.optional(v.string()),
        hasScope: v.optional(v.boolean()),
    },
    returns: v.string(),
    handler: async (_ctx, args) => {
        // Server-side system prompt — NOT client-controlled (prevents prompt injection)
        const formatRule = "FORMATOWANIE: Używaj akapitów, wypunktowań (- lub •), numeracji i pogrubionych nagłówków. NIE pisz ścian tekstu. Oddzielaj sekcje pustą linią.";

        const systemPrompt = args.hasScope
            ? [
                "Jesteś Lilapu — prywatny asystent wiedzy dla profesjonalistów (terapeutów, coachów, prawników). ZASADY:",
                "1. Odpowiadaj WYŁĄCZNIE po polsku.",
                "2. Odpowiadaj wyczerpująco — tyle ile wymaga pytanie.",
                "3. Odpowiadaj na podstawie podanego kontekstu.",
                "4. ZAWSZE podawaj z jakiej transkrypcji lub notatki pochodzi informacja.",
                "5. Jeśli kontekst nie zawiera odpowiedzi, powiedz: 'Nie znalazłem tej informacji w podanych źródłach.'",
                "6. NIE wymyślaj informacji. NIE pisz po angielsku.",
                formatRule,
            ].join("\n")
            : [
                "Jesteś Lilapu — prywatny asystent wiedzy dla profesjonalistów (terapeutów, coachów, prawników). ZASADY:",
                "1. Odpowiadaj WYŁĄCZNIE po polsku.",
                "2. Odpowiadaj wyczerpująco — tyle ile wymaga pytanie.",
                "3. Masz dostęp do WSZYSTKICH transkrypcji i notatek tego klienta. Odpowiadaj na podstawie podanego kontekstu.",
                "4. ZAWSZE podawaj z jakiej transkrypcji lub notatki pochodzi informacja.",
                "5. Jeśli kontekst nie zawiera odpowiedzi, powiedz: 'Nie znalazłem informacji na ten temat w danych tego klienta.'",
                "6. NIE wymyślaj informacji. NIE pisz po angielsku.",
                formatRule,
            ].join("\n");

        // Merge system prompt and context into one system message
        let systemContent = systemPrompt;
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

            // Sensitive data — do not log raw AI chat results

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

            console.log("RunPod chat: unrecognized format, returning raw (content redacted)");
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
