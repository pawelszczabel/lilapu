"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const AI_SERVER_URL = process.env.AI_SERVER_URL ?? "http://localhost:8080";

// ── Helpers ──────────────────────────────────────────────────────────

function chunkText(text: string, maxWords = 300, overlap = 50): string[] {
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
    const response = await fetch(`${AI_SERVER_URL}/embedding`, {
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
    args: { transcriptionId: v.id("transcriptions") },
    returns: v.number(),
    handler: async (ctx, args) => {
        // Get content and projectId
        const content = await ctx.runQuery(
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
                    await ctx.runMutation(internal.ragHelpers.insertEmbedding, {
                        projectId,
                        transcriptionId: args.transcriptionId,
                        chunkText: chunks[i],
                        chunkIndex: i,
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
 * Used by project-level chat (tab "Czat AI").
 */
export const search = action({
    args: {
        projectId: v.id("projects"),
        query: v.string(),
        topK: v.optional(v.number()),
    },
    returns: v.array(
        v.object({
            chunkText: v.string(),
            transcriptionId: v.id("transcriptions"),
            transcriptionTitle: v.string(),
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
            chunkText: string;
            transcriptionId: Id<"transcriptions">;
            transcriptionTitle: string;
            score: number;
        }> = [];

        for (const result of results) {
            const chunk = chunks.find(
                (c: { _id: typeof result._id }) => c._id === result._id
            );
            if (!chunk) continue;

            projectChunks.push({
                chunkText: chunk.chunkText,
                transcriptionId: chunk.transcriptionId,
                transcriptionTitle:
                    (titles as Record<string, string>)[chunk.transcriptionId] ??
                    "Bez tytułu",
                score: result._score,
            });

            if (projectChunks.length >= k) break;
        }

        return projectChunks;
    },
});

/**
 * Search only within specific transcriptions.
 * Used by transcription-scoped chat (started from a transcription).
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
            chunkText: v.string(),
            transcriptionId: v.id("transcriptions"),
            transcriptionTitle: v.string(),
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
            chunkText: string;
            transcriptionId: Id<"transcriptions">;
            transcriptionTitle: string;
            score: number;
        }> = [];

        for (const result of results) {
            const chunk = chunks.find(
                (c: { _id: typeof result._id }) => c._id === result._id
            );
            if (!chunk) continue;
            if (!scopedSet.has(chunk.transcriptionId)) continue;

            scopedChunks.push({
                chunkText: chunk.chunkText,
                transcriptionId: chunk.transcriptionId,
                transcriptionTitle:
                    (titles as Record<string, string>)[chunk.transcriptionId] ??
                    "Bez tytułu",
                score: result._score,
            });

            if (scopedChunks.length >= k) break;
        }

        return scopedChunks;
    },
});
