import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
    args: { projectId: v.id("projects") },
    returns: v.array(
        v.object({
            _id: v.id("conversations"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.optional(v.string()),
            chatMode: v.optional(
                v.union(v.literal("transcription"), v.literal("project"))
            ),
            scopedTranscriptionIds: v.optional(
                v.array(v.id("transcriptions"))
            ),
        })
    ),
    handler: async (ctx, args) => {
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
        const conv = await ctx.db.get(args.conversationId);
        if (!conv) throw new Error("Conversation not found");

        const existing = conv.scopedTranscriptionIds ?? [];
        if (existing.includes(args.transcriptionId)) return null;

        await ctx.db.patch(args.conversationId, {
            scopedTranscriptionIds: [...existing, args.transcriptionId],
        });
        return null;
    },
});

export const get = query({
    args: { conversationId: v.id("conversations") },
    returns: v.union(
        v.object({
            _id: v.id("conversations"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.optional(v.string()),
            chatMode: v.optional(
                v.union(v.literal("transcription"), v.literal("project"))
            ),
            scopedTranscriptionIds: v.optional(
                v.array(v.id("transcriptions"))
            ),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.conversationId);
    },
});

export const listByTranscription = query({
    args: { transcriptionId: v.id("transcriptions") },
    returns: v.array(
        v.object({
            _id: v.id("conversations"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.optional(v.string()),
            chatMode: v.optional(
                v.union(v.literal("transcription"), v.literal("project"))
            ),
            scopedTranscriptionIds: v.optional(
                v.array(v.id("transcriptions"))
            ),
        })
    ),
    handler: async (ctx, args) => {
        const transcription = await ctx.db.get(args.transcriptionId);
        if (!transcription) return [];

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
