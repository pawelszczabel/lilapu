"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ── Config ───────────────────────────────────────────────────────────
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY ?? "";
const BIELIK_ENDPOINT_ID = process.env.BIELIK_ENDPOINT_ID ?? "";
const LOCAL_AI_URL = process.env.AI_SERVER_URL ?? "http://localhost:8080";
const USE_RUNPOD = !!(RUNPOD_API_KEY && BIELIK_ENDPOINT_ID);

// ── Helpers ──────────────────────────────────────────────────────────

const CHUNK_MAX_WORDS = 300;
const CHUNK_OVERLAP = 50;

function chunkText(text: string, maxWords = CHUNK_MAX_WORDS, overlap = CHUNK_OVERLAP): string[] {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return [text];

    const chunks: string[] = [];
    let start = 0;
    while (start < words.length) {
        const end = Math.min(start + maxWords, words.length);
        chunks.push(words.slice(start, end).join(" "));
        if (end >= words.length) break;
        start += maxWords - overlap;
    }
    return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
    if (USE_RUNPOD) {
        const url = `https://api.runpod.ai/v2/${BIELIK_ENDPOINT_ID}/runsync`;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RUNPOD_API_KEY}`,
            },
            body: JSON.stringify({
                input: { openai_route: "/embedding", openai_input: { content: text } },
            }),
        });
        if (!response.ok) {
            throw new Error(`RunPod embedding error: ${response.status}`);
        }
        const result = await response.json();
        const output = result.output ?? result;
        return output.embedding ?? [];
    }

    // Local fallback
    const response = await fetch(`${LOCAL_AI_URL}/embedding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
    });

    if (!response.ok) {
        throw new Error(`Embedding error: ${response.status}`);
    }

    const result = await response.json();
    return result.embedding ?? [];
}

// ── Public Actions ──────────────────────────────────────────────────

export const indexTranscription = action({
    args: {
        transcriptionId: v.id("transcriptions"),
        plaintextContent: v.optional(v.string()),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        // Use plaintext from client if provided (E2EE: content in DB is encrypted)
        // Fall back to reading from DB for legacy unencrypted transcriptions
        const content = args.plaintextContent || await ctx.runQuery(
            internal.ragHelpers.getTranscriptionContent,
            { transcriptionId: args.transcriptionId }
        );
        const projectId = await ctx.runQuery(
            internal.ragHelpers.getTranscriptionProjectId,
            { transcriptionId: args.transcriptionId }
        );

        if (!content || !projectId) return 0;

        // Delete old embeddings
        await ctx.runMutation(
            internal.ragHelpers.deleteEmbeddingsForTranscription,
            { transcriptionId: args.transcriptionId }
        );

        const chunks = chunkText(content);
        let indexed = 0;

        for (let i = 0; i < chunks.length; i++) {
            try {
                const embedding = await generateEmbedding(chunks[i]);
                if (embedding.length > 0) {
                    // ZERO PLAINTEXT: store only embedding + metadata, NOT the chunk text
                    await ctx.runMutation(internal.ragHelpers.insertEmbedding, {
                        projectId,
                        transcriptionId: args.transcriptionId,
                        chunkIndex: i,
                        chunkWordCount: chunks[i].split(/\s+/).length,
                        embedding,
                    });
                    indexed++;
                }
            } catch (err) {
                console.error(`Failed to embed chunk ${i}:`, err);
            }
        }

        return indexed;
    },
});

/**
 * Search across ALL transcriptions in a project.
 * Returns metadata only — client reconstructs chunk text from decrypted transcriptions.
 */
export const search = action({
    args: {
        projectId: v.id("projects"),
        query: v.string(),
        topK: v.optional(v.number()),
    },
    returns: v.array(
        v.object({
            transcriptionId: v.id("transcriptions"),
            transcriptionTitle: v.string(),
            chunkIndex: v.number(),
            chunkWordCount: v.number(),
            score: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const k = args.topK ?? 5;

        let queryEmbedding: number[];
        try {
            queryEmbedding = await generateEmbedding(args.query);
        } catch {
            return [];
        }

        if (queryEmbedding.length === 0) return [];

        // CRITICAL FIX: filter by projectId to prevent cross-project leakage
        const results = await ctx.vectorSearch("embeddings", "by_embedding", {
            vector: queryEmbedding,
            limit: k * 3,
            filter: (q) => q.eq("projectId", args.projectId),
        });

        const chunks = await ctx.runQuery(internal.ragHelpers.getChunksByIds, {
            ids: results.map((r) => r._id),
        });

        // Collect unique transcription IDs for title lookup
        const transcriptionIds = [
            ...new Set(chunks.map((c: { transcriptionId: Id<"transcriptions"> }) => c.transcriptionId)),
        ];
        const titles = await ctx.runQuery(
            internal.ragHelpers.getTranscriptionTitles,
            { ids: transcriptionIds as Id<"transcriptions">[] }
        );

        const projectChunks: Array<{
            transcriptionId: Id<"transcriptions">;
            transcriptionTitle: string;
            chunkIndex: number;
            chunkWordCount: number;
            score: number;
        }> = [];

        for (const result of results) {
            const chunk = chunks.find(
                (c: { _id: typeof result._id }) => c._id === result._id
            );
            if (!chunk) continue;

            projectChunks.push({
                transcriptionId: chunk.transcriptionId,
                transcriptionTitle:
                    (titles as Record<string, string>)[chunk.transcriptionId] ??
                    "Bez tytułu",
                chunkIndex: chunk.chunkIndex,
                chunkWordCount: chunk.chunkWordCount,
                score: result._score,
            });

            if (projectChunks.length >= k) break;
        }

        return projectChunks;
    },
});

/**
 * Search only within specific transcriptions.
 * Returns metadata only — client reconstructs chunk text from decrypted transcriptions.
 */
export const searchByTranscriptions = action({
    args: {
        projectId: v.id("projects"),
        transcriptionIds: v.array(v.id("transcriptions")),
        query: v.string(),
        topK: v.optional(v.number()),
    },
    returns: v.array(
        v.object({
            transcriptionId: v.id("transcriptions"),
            transcriptionTitle: v.string(),
            chunkIndex: v.number(),
            chunkWordCount: v.number(),
            score: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const k = args.topK ?? 5;

        let queryEmbedding: number[];
        try {
            queryEmbedding = await generateEmbedding(args.query);
        } catch {
            return [];
        }

        if (queryEmbedding.length === 0) return [];

        // Search within project, then filter by transcription IDs
        const results = await ctx.vectorSearch("embeddings", "by_embedding", {
            vector: queryEmbedding,
            limit: k * 5,
            filter: (q) => q.eq("projectId", args.projectId),
        });

        const chunks = await ctx.runQuery(internal.ragHelpers.getChunksByIds, {
            ids: results.map((r) => r._id),
        });

        // Resolve titles
        const titles = await ctx.runQuery(
            internal.ragHelpers.getTranscriptionTitles,
            { ids: args.transcriptionIds }
        );

        // Only include chunks from scoped transcriptions
        const scopedSet = new Set(args.transcriptionIds);
        const scopedChunks: Array<{
            transcriptionId: Id<"transcriptions">;
            transcriptionTitle: string;
            chunkIndex: number;
            chunkWordCount: number;
            score: number;
        }> = [];

        for (const result of results) {
            const chunk = chunks.find(
                (c: { _id: typeof result._id }) => c._id === result._id
            );
            if (!chunk) continue;
            if (!scopedSet.has(chunk.transcriptionId)) continue;

            scopedChunks.push({
                transcriptionId: chunk.transcriptionId,
                transcriptionTitle:
                    (titles as Record<string, string>)[chunk.transcriptionId] ??
                    "Bez tytułu",
                chunkIndex: chunk.chunkIndex,
                chunkWordCount: chunk.chunkWordCount,
                score: result._score,
            });

            if (scopedChunks.length >= k) break;
        }

        return scopedChunks;
    },
});
