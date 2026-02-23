import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Upload URL for encrypted audio ──────────────────────────────────

export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// ── Get audio URL ───────────────────────────────────────────────────

export const getAudioUrl = query({
    args: { storageId: v.id("_storage") },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

// ── List transcriptions by project ──────────────────────────────────

export const listByProject = query({
    args: { projectId: v.id("projects") },
    returns: v.array(
        v.object({
            _id: v.id("transcriptions"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.optional(v.string()),
            content: v.string(),
            contentWithSpeakers: v.optional(v.string()),
            speakerCount: v.optional(v.number()),
            audioStorageId: v.optional(v.id("_storage")),
            durationSeconds: v.optional(v.number()),
            blockchainTxHash: v.optional(v.string()),
            blockchainVerified: v.boolean(),
        })
    ),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("transcriptions")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

// ── Get single transcription ────────────────────────────────────────

export const get = query({
    args: { transcriptionId: v.id("transcriptions") },
    returns: v.union(
        v.object({
            _id: v.id("transcriptions"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.optional(v.string()),
            content: v.string(),
            contentWithSpeakers: v.optional(v.string()),
            speakerCount: v.optional(v.number()),
            audioStorageId: v.optional(v.id("_storage")),
            durationSeconds: v.optional(v.number()),
            blockchainTxHash: v.optional(v.string()),
            blockchainVerified: v.boolean(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.transcriptionId);
    },
});

// ── Create transcription ────────────────────────────────────────────

export const create = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.optional(v.string()),
        content: v.string(),
        contentWithSpeakers: v.optional(v.string()),
        speakerCount: v.optional(v.number()),
        audioStorageId: v.optional(v.id("_storage")),
        durationSeconds: v.optional(v.number()),
    },
    returns: v.id("transcriptions"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("transcriptions", {
            projectId: args.projectId,
            title: args.title,
            content: args.content,
            contentWithSpeakers: args.contentWithSpeakers,
            speakerCount: args.speakerCount,
            audioStorageId: args.audioStorageId,
            durationSeconds: args.durationSeconds,
            blockchainTxHash: undefined,
            blockchainVerified: false,
        });
    },
});
