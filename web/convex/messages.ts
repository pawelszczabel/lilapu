import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const sourceValidator = v.object({
    transcriptionId: v.id("transcriptions"),
    quote: v.string(),
    timestamp: v.optional(v.string()),
});

export const listByConversation = query({
    args: { conversationId: v.id("conversations") },
    returns: v.array(
        v.object({
            _id: v.id("messages"),
            _creationTime: v.number(),
            conversationId: v.id("conversations"),
            role: v.union(v.literal("user"), v.literal("assistant")),
            content: v.string(),
            sources: v.optional(v.array(sourceValidator)),
        })
    ),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("messages")
            .withIndex("by_conversationId", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();
    },
});

export const send = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
    },
    returns: v.id("messages"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            role: "user" as const,
            content: args.content,
        });
    },
});

export const addAssistant = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
        sources: v.optional(v.array(sourceValidator)),
    },
    returns: v.id("messages"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            role: "assistant" as const,
            content: args.content,
            sources: args.sources,
        });
    },
});
