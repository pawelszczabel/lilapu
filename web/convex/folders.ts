import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: { userId: v.string() },
    returns: v.array(
        v.object({
            _id: v.id("folders"),
            _creationTime: v.number(),
            userId: v.string(),
            name: v.string(),
            archived: v.boolean(),
        })
    ),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("folders")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .filter((q) => q.eq(q.field("archived"), false))
            .collect();
    },
});

export const create = mutation({
    args: {
        userId: v.string(),
        name: v.string(),
    },
    returns: v.id("folders"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("folders", {
            userId: args.userId,
            name: args.name,
            archived: false,
        });
    },
});

export const update = mutation({
    args: {
        folderId: v.id("folders"),
        name: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.folderId, { name: args.name });
        return null;
    },
});

export const archive = mutation({
    args: { folderId: v.id("folders") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.folderId, { archived: true });

        // Unlink projects that were in this folder
        const projectsInFolder = await ctx.db
            .query("projects")
            .filter((q) => q.eq(q.field("folderId"), args.folderId))
            .collect();

        for (const project of projectsInFolder) {
            await ctx.db.patch(project._id, { folderId: undefined });
        }

        return null;
    },
});
