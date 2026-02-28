import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { validateStringLength, MAX_MESSAGE_LENGTH } from "./validation";

// ── Auth helpers ────────────────────────────────────────────────────

async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const email = identity.email;
    if (!email) throw new Error("Unauthorized: no email in identity");
    return email;
}

async function verifyConversationAccess(
    ctx: QueryCtx | MutationCtx,
    conversationId: Id<"conversations">
) {
    const userId = await getAuthUserId(ctx);
    const conv = await ctx.db.get(conversationId);
    if (!conv) throw new Error("Conversation not found");
    const project = await ctx.db.get(conv.projectId);
    if (!project || project.userId !== userId) {
        throw new Error("Forbidden: access denied");
    }
    return conv;
}

// ── Shape ───────────────────────────────────────────────────────────

const sourceValidator = v.object({
    transcriptionId: v.id("transcriptions"),
    quote: v.string(),
    timestamp: v.optional(v.string()),
});

const messageShape = v.object({
    _id: v.id("messages"),
    _creationTime: v.number(),
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    sources: v.optional(v.array(sourceValidator)),
});

// ── Queries & Mutations ─────────────────────────────────────────────

export const listByConversation = query({
    args: { conversationId: v.id("conversations") },
    returns: v.array(messageShape),
    handler: async (ctx, args) => {
        await verifyConversationAccess(ctx, args.conversationId);
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
        await verifyConversationAccess(ctx, args.conversationId);
        validateStringLength(args.content, MAX_MESSAGE_LENGTH, "content");
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
        await verifyConversationAccess(ctx, args.conversationId);
        validateStringLength(args.content, MAX_MESSAGE_LENGTH, "content");
        return await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            role: "assistant" as const,
            content: args.content,
            sources: args.sources,
        });
    },
});

export const listByConversations = query({
    args: { conversationIds: v.array(v.id("conversations")) },
    returns: v.array(messageShape),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const allMessages = [];
        for (const convId of args.conversationIds) {
            // Verify each conversation belongs to the user
            const conv = await ctx.db.get(convId);
            if (!conv) continue;
            const project = await ctx.db.get(conv.projectId);
            if (!project || project.userId !== userId) continue;

            const msgs = await ctx.db
                .query("messages")
                .withIndex("by_conversationId", (q) =>
                    q.eq("conversationId", convId)
                )
                .collect();
            allMessages.push(...msgs);
        }
        return allMessages;
    },
});
