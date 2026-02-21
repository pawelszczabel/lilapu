import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByProject = query({
    args: { projectId: v.id("projects") },
    returns: v.array(
        v.object({
            _id: v.id("transcriptions"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.optional(v.string()),
            content: v.string(),
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

export const get = query({
    args: { transcriptionId: v.id("transcriptions") },
    returns: v.union(
        v.object({
            _id: v.id("transcriptions"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.optional(v.string()),
            content: v.string(),
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

export const create = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.optional(v.string()),
        content: v.string(),
        durationSeconds: v.optional(v.number()),
    },
    returns: v.id("transcriptions"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("transcriptions", {
            projectId: args.projectId,
            title: args.title,
            content: args.content,
            durationSeconds: args.durationSeconds,
            blockchainTxHash: undefined,
            blockchainVerified: false,
        });
    },
});
