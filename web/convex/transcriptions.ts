import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { validateStringLength, MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH, MAX_DESCRIPTION_LENGTH } from "./validation";

// ── Auth helpers ────────────────────────────────────────────────────

async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const email = identity.email;
    if (!email) throw new Error("Unauthorized: no email in identity");
    return email;
}

async function verifyProjectAccess(
    ctx: QueryCtx | MutationCtx,
    projectId: Id<"projects">
) {
    const userId = await getAuthUserId(ctx);
    const project = await ctx.db.get(projectId);
    if (!project || project.userId !== userId) {
        throw new Error("Forbidden: project not found or access denied");
    }
    return project;
}

// ── Shape ───────────────────────────────────────────────────────────

const transcriptionShape = v.object({
    _id: v.id("transcriptions"),
    _creationTime: v.number(),
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    content: v.string(),
    contentWithSpeakers: v.optional(v.string()),
    speakerCount: v.optional(v.number()),
    audioStorageId: v.optional(v.id("_storage")),
    durationSeconds: v.optional(v.number()),
    summary: v.optional(v.string()),
    blockchainTxHash: v.optional(v.string()),
    blockchainVerified: v.boolean(),
});

// ── Upload URL for encrypted audio ──────────────────────────────────

export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        // Require authentication to generate upload URLs
        await getAuthUserId(ctx);
        return await ctx.storage.generateUploadUrl();
    },
});

// ── Get audio URL ───────────────────────────────────────────────────

export const getAudioUrl = query({
    args: { storageId: v.id("_storage") },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        // Ownership check: verify storageId belongs to user's transcription
        const transcription = await ctx.db
            .query("transcriptions")
            .filter((q) => q.eq(q.field("audioStorageId"), args.storageId))
            .first();
        if (!transcription) return null;
        const project = await ctx.db.get(transcription.projectId);
        if (!project || project.userId !== userId) return null;
        return await ctx.storage.getUrl(args.storageId);
    },
});

// ── List transcriptions by project ──────────────────────────────────

export const listByProject = query({
    args: { projectId: v.id("projects") },
    returns: v.array(transcriptionShape),
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);
        return await ctx.db
            .query("transcriptions")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

// ── Get single transcription ────────────────────────────────────────

export const get = query({
    args: { transcriptionId: v.id("transcriptions") },
    returns: v.union(transcriptionShape, v.null()),
    handler: async (ctx, args) => {
        const transcription = await ctx.db.get(args.transcriptionId);
        if (!transcription) return null;
        // Verify ownership via project
        const userId = await getAuthUserId(ctx);
        const project = await ctx.db.get(transcription.projectId);
        if (!project || project.userId !== userId) return null;
        return transcription;
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
        summary: v.optional(v.string()),
    },
    returns: v.id("transcriptions"),
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);
        validateStringLength(args.title, MAX_TITLE_LENGTH, "title");
        validateStringLength(args.content, MAX_CONTENT_LENGTH, "content");
        validateStringLength(args.contentWithSpeakers, MAX_CONTENT_LENGTH, "contentWithSpeakers");
        validateStringLength(args.summary, MAX_DESCRIPTION_LENGTH, "summary");
        return await ctx.db.insert("transcriptions", {
            projectId: args.projectId,
            title: args.title,
            content: args.content,
            contentWithSpeakers: args.contentWithSpeakers,
            speakerCount: args.speakerCount,
            audioStorageId: args.audioStorageId,
            durationSeconds: args.durationSeconds,
            summary: args.summary,
            blockchainTxHash: undefined,
            blockchainVerified: false,
        });
    },
});

// ── Update summary (async, after session save) ──────────────────────

export const updateSummary = mutation({
    args: {
        transcriptionId: v.id("transcriptions"),
        summary: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const transcription = await ctx.db.get(args.transcriptionId);
        if (!transcription) throw new Error("Transcription not found");
        // Verify ownership via project
        const userId = await getAuthUserId(ctx);
        const project = await ctx.db.get(transcription.projectId);
        if (!project || project.userId !== userId) {
            throw new Error("Forbidden");
        }
        validateStringLength(args.summary, MAX_DESCRIPTION_LENGTH, "summary");
        await ctx.db.patch(args.transcriptionId, {
            summary: args.summary,
        });
        return null;
    },
});
