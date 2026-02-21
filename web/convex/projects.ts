import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: { userId: v.string() },
    returns: v.array(
        v.object({
            _id: v.id("projects"),
            _creationTime: v.number(),
            userId: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            archived: v.boolean(),
        })
    ),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("projects")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
    },
});

export const get = query({
    args: { projectId: v.id("projects") },
    returns: v.union(
        v.object({
            _id: v.id("projects"),
            _creationTime: v.number(),
            userId: v.string(),
            name: v.string(),
            description: v.optional(v.string()),
            archived: v.boolean(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.projectId);
    },
});

export const create = mutation({
    args: {
        userId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
    },
    returns: v.id("projects"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("projects", {
            userId: args.userId,
            name: args.name,
            description: args.description,
            archived: false,
        });
    },
});

export const archive = mutation({
    args: { projectId: v.id("projects") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.projectId, { archived: true });
        return null;
    },
});
