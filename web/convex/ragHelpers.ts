import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const insertEmbedding = internalMutation({
    args: {
        projectId: v.id("projects"),
        transcriptionId: v.id("transcriptions"),
        chunkText: v.string(),
        chunkIndex: v.number(),
        embedding: v.array(v.float64()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("embeddings", args);
    },
});

export const deleteEmbeddingsForTranscription = internalMutation({
    args: { transcriptionId: v.id("transcriptions") },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("embeddings")
            .withIndex("by_transcriptionId", (q) =>
                q.eq("transcriptionId", args.transcriptionId)
            )
            .collect();
        for (const emb of existing) {
            await ctx.db.delete(emb._id);
        }
    },
});

export const getTranscriptionContent = internalQuery({
    args: { transcriptionId: v.id("transcriptions") },
    handler: async (ctx, args) => {
        const t = await ctx.db.get(args.transcriptionId);
        return t?.content ?? "";
    },
});

export const getTranscriptionProjectId = internalQuery({
    args: { transcriptionId: v.id("transcriptions") },
    handler: async (ctx, args) => {
        const t = await ctx.db.get(args.transcriptionId);
        return t?.projectId ?? null;
    },
});

export const getChunksByIds = internalQuery({
    args: { ids: v.array(v.id("embeddings")) },
    handler: async (ctx, args) => {
        const results = [];
        for (const id of args.ids) {
            const chunk = await ctx.db.get(id);
            if (chunk) results.push(chunk);
        }
        return results;
    },
});

export const getTranscriptionTitles = internalQuery({
    args: { ids: v.array(v.id("transcriptions")) },
    handler: async (ctx, args) => {
        const results: Record<string, string> = {};
        for (const id of args.ids) {
            const t = await ctx.db.get(id);
            if (t) results[id] = t.title ?? "Bez tytułu";
        }
        return results;
    },
});
