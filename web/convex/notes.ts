import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { validateStringLength, MAX_TITLE_LENGTH, MAX_CONTENT_LENGTH } from "./validation";

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

async function verifyNoteAccess(
    ctx: QueryCtx | MutationCtx,
    noteId: Id<"notes">
) {
    const note = await ctx.db.get(noteId);
    if (!note) throw new Error("Note not found");
    await verifyProjectAccess(ctx, note.projectId);
    return note;
}

// ── Shape ───────────────────────────────────────────────────────────

const noteShape = v.object({
    _id: v.id("notes"),
    _creationTime: v.number(),
    projectId: v.id("projects"),
    title: v.string(),
    content: v.string(),
    format: v.optional(v.union(v.literal("md"), v.literal("txt"))),
});

// ── List notes by project ───────────────────────────────────────────

export const listByProject = query({
    args: { projectId: v.id("projects") },
    returns: v.array(noteShape),
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);
        return await ctx.db
            .query("notes")
            .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

// ── Get single note ─────────────────────────────────────────────────

export const get = query({
    args: { noteId: v.id("notes") },
    returns: v.union(noteShape, v.null()),
    handler: async (ctx, args) => {
        const note = await ctx.db.get(args.noteId);
        if (!note) return null;
        // Verify ownership via project
        const userId = await getAuthUserId(ctx);
        const project = await ctx.db.get(note.projectId);
        if (!project || project.userId !== userId) return null;
        return note;
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
        await verifyProjectAccess(ctx, args.projectId);
        validateStringLength(args.title, MAX_TITLE_LENGTH, "title");
        validateStringLength(args.content, MAX_CONTENT_LENGTH, "content");
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
        await verifyNoteAccess(ctx, args.noteId);
        validateStringLength(args.title, MAX_TITLE_LENGTH, "title");
        validateStringLength(args.content, MAX_CONTENT_LENGTH, "content");
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
        await verifyNoteAccess(ctx, args.noteId);
        await ctx.db.delete(args.noteId);
        return null;
    },
});
