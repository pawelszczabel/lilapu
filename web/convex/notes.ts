import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── List notes by project ───────────────────────────────────────────

export const listByProject = query({
    args: { projectId: v.id("projects") },
    returns: v.array(
        v.object({
            _id: v.id("notes"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.string(),
            content: v.string(),
            format: v.optional(v.union(v.literal("md"), v.literal("txt"))),
        })
    ),
    handler: async (ctx, args) => {
        return await ctx.db
            .query("notes")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

// ── Get single note ─────────────────────────────────────────────────

export const get = query({
    args: { noteId: v.id("notes") },
    returns: v.union(
        v.object({
            _id: v.id("notes"),
            _creationTime: v.number(),
            projectId: v.id("projects"),
            title: v.string(),
            content: v.string(),
            format: v.optional(v.union(v.literal("md"), v.literal("txt"))),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        return await ctx.db.get(args.noteId);
    },
});

// ── Create note ─────────────────────────────────────────────────────

export const create = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.string(),
        content: v.string(),
        format: v.optional(v.union(v.literal("md"), v.literal("txt"))),
    },
    returns: v.id("notes"),
    handler: async (ctx, args) => {
        return await ctx.db.insert("notes", {
            projectId: args.projectId,
            title: args.title,
            content: args.content,
            format: args.format,
        });
    },
});

// ── Update note ─────────────────────────────────────────────────────

export const update = mutation({
    args: {
        noteId: v.id("notes"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const { noteId, ...fields } = args;
        const updates: Record<string, string> = {};
        if (fields.title !== undefined) updates.title = fields.title;
        if (fields.content !== undefined) updates.content = fields.content;
        await ctx.db.patch(noteId, updates);
        return null;
    },
});

// ── Delete note ─────────────────────────────────────────────────────

export const remove = mutation({
    args: { noteId: v.id("notes") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.delete(args.noteId);
        return null;
    },
});
