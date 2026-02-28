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

async function verifyFolderAccess(
    ctx: QueryCtx | MutationCtx,
    folderId: Id<"folders">
) {
    const userId = await getAuthUserId(ctx);
    const folder = await ctx.db.get(folderId);
    if (!folder || folder.userId !== userId) {
        throw new Error("Forbidden: folder not found or access denied");
    }
    return folder;
}

// ── Queries & Mutations ─────────────────────────────────────────────

export const list = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("folders"),
            _creationTime: v.number(),
            userId: v.string(),
            name: v.string(),
            archived: v.boolean(),
        })
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        return await ctx.db
            .query("folders")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("archived"), false))
            .collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
    },
    returns: v.id("folders"),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        validateStringLength(args.name, MAX_TITLE_LENGTH, "name");
        return await ctx.db.insert("folders", {
            userId,
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
        await verifyFolderAccess(ctx, args.folderId);
        validateStringLength(args.name, MAX_TITLE_LENGTH, "name");
        await ctx.db.patch(args.folderId, { name: args.name });
        return null;
    },
});

export const archive = mutation({
    args: { folderId: v.id("folders") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await verifyFolderAccess(ctx, args.folderId);
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
