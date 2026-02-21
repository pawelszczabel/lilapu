"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

const AI_SERVER_URL = process.env.AI_SERVER_URL ?? "http://localhost:8080";
const WHISPER_SERVER_URL =
    process.env.WHISPER_SERVER_URL ?? "http://localhost:8081";

// Transcribe audio via whisper.cpp server
export const transcribe = action({
    args: {
        audioBase64: v.string(),
    },
    returns: v.string(),
    handler: async (_ctx, args) => {
        const audioBuffer = Buffer.from(args.audioBase64, "base64");

        const formData = new FormData();
        formData.append(
            "file",
            new Blob([audioBuffer], { type: "audio/wav" }),
            "audio.wav"
        );
        formData.append("language", "pl");
        formData.append("response_format", "json");

        const response = await fetch(`${WHISPER_SERVER_URL}/inference`, {
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

// Chat with Bielik-7B via llama.cpp server (OpenAI-compatible API)
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

        const response = await fetch(`${AI_SERVER_URL}/v1/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages,
                max_tokens: 1024,
                temperature: 0.7,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM error: ${response.status}`);
        }

        const result = await response.json();
        return result.choices?.[0]?.message?.content ?? "";
    },
});

// Generate embeddings (placeholder — will use local ONNX model in Faza 2)
export const embed = action({
    args: {
        text: v.string(),
    },
    returns: v.array(v.float64()),
    handler: async (_ctx, args) => {
        // For now, call llama.cpp embedding endpoint
        const response = await fetch(`${AI_SERVER_URL}/embedding`, {
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
