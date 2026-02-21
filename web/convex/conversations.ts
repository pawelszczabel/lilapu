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
    },
    returns: v.id("conversations"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("conversations", {
            projectId: args.projectId,
            title: args.title,
        });
    },
});
