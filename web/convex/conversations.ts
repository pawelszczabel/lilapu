import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { validateStringLength, MAX_TITLE_LENGTH } from "./validation";

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

async function verifyConversationAccess(
    ctx: QueryCtx | MutationCtx,
    conversationId: Id<"conversations">
) {
    const conv = await ctx.db.get(conversationId);
    if (!conv) throw new Error("Conversation not found");
    await verifyProjectAccess(ctx, conv.projectId);
    return conv;
}

// ── Shape ───────────────────────────────────────────────────────────

const conversationShape = v.object({
    _id: v.id("conversations"),
    _creationTime: v.number(),
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    chatMode: v.optional(
        v.union(v.literal("transcription"), v.literal("project"))
    ),
    scopedTranscriptionIds: v.optional(v.array(v.id("transcriptions"))),
    scopedNoteIds: v.optional(v.array(v.id("notes"))),
    scopedConversationIds: v.optional(v.array(v.id("conversations"))),
});

// ── Queries & Mutations ─────────────────────────────────────────────

export const listByProject = query({
    args: { projectId: v.id("projects") },
    returns: v.array(conversationShape),
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);
        return await ctx.db
            .query("conversations")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

export const create = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.optional(v.string()),
        chatMode: v.optional(
            v.union(v.literal("transcription"), v.literal("project"))
        ),
        scopedTranscriptionIds: v.optional(v.array(v.id("transcriptions"))),
    },
    returns: v.id("conversations"),
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);
        validateStringLength(args.title, MAX_TITLE_LENGTH, "title");
        return await ctx.db.insert("conversations", {
            projectId: args.projectId,
            title: args.title,
            chatMode: args.chatMode ?? "project",
            scopedTranscriptionIds: args.scopedTranscriptionIds,
        });
    },
});

export const addTranscriptionScope = mutation({
    args: {
        conversationId: v.id("conversations"),
        transcriptionId: v.id("transcriptions"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const conv = await verifyConversationAccess(ctx, args.conversationId);

        const existing = conv.scopedTranscriptionIds ?? [];
        if (existing.includes(args.transcriptionId)) return null;

        await ctx.db.patch(args.conversationId, {
            scopedTranscriptionIds: [...existing, args.transcriptionId],
        });
        return null;
    },
});

export const addNoteScope = mutation({
    args: {
        conversationId: v.id("conversations"),
        noteId: v.id("notes"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const conv = await verifyConversationAccess(ctx, args.conversationId);

        const existing = conv.scopedNoteIds ?? [];
        if (existing.includes(args.noteId)) return null;

        await ctx.db.patch(args.conversationId, {
            scopedNoteIds: [...existing, args.noteId],
        });
        return null;
    },
});

export const addConversationScope = mutation({
    args: {
        conversationId: v.id("conversations"),
        targetConversationId: v.id("conversations"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const conv = await verifyConversationAccess(ctx, args.conversationId);

        // Prevent self-reference
        if (args.targetConversationId === args.conversationId) return null;

        const existing = conv.scopedConversationIds ?? [];
        if (existing.includes(args.targetConversationId)) return null;

        await ctx.db.patch(args.conversationId, {
            scopedConversationIds: [...existing, args.targetConversationId],
        });
        return null;
    },
});

export const updateTitle = mutation({
    args: {
        conversationId: v.id("conversations"),
        title: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await verifyConversationAccess(ctx, args.conversationId);
        validateStringLength(args.title, MAX_TITLE_LENGTH, "title");
        await ctx.db.patch(args.conversationId, { title: args.title });
        return null;
    },
});

export const remove = mutation({
    args: {
        conversationId: v.id("conversations"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await verifyConversationAccess(ctx, args.conversationId);

        // Delete all messages belonging to this conversation
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();
        for (const msg of messages) {
            await ctx.db.delete(msg._id);
        }
        // Delete the conversation itself
        await ctx.db.delete(args.conversationId);
        return null;
    },
});

export const get = query({
    args: { conversationId: v.id("conversations") },
    returns: v.union(conversationShape, v.null()),
    handler: async (ctx, args) => {
        const conv = await ctx.db.get(args.conversationId);
        if (!conv) return null;
        // Verify ownership via project
        const userId = await getAuthUserId(ctx);
        const project = await ctx.db.get(conv.projectId);
        if (!project || project.userId !== userId) return null;
        return conv;
    },
});

export const listByTranscription = query({
    args: { transcriptionId: v.id("transcriptions") },
    returns: v.array(conversationShape),
    handler: async (ctx, args) => {
        const transcription = await ctx.db.get(args.transcriptionId);
        if (!transcription) return [];

        // Verify ownership via project
        await verifyProjectAccess(ctx, transcription.projectId);

        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_projectId", (q) =>
                q.eq("projectId", transcription.projectId)
            )
            .collect();

        return conversations.filter(
            (c) => c.scopedTranscriptionIds?.includes(args.transcriptionId)
        );
    },
});
