import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// ── Auth helpers ────────────────────────────────────────────────────

async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const email = identity.email;
    if (!email) throw new Error("Unauthorized: no email in identity");
    return email;
}

/** Verify that a project belongs to the authenticated user. Returns the project. */
export async function verifyProjectAccess(
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

// ── Queries & Mutations ─────────────────────────────────────────────

export const list = query({
    args: {},
    returns: v.array(
        v.object({
            _id: v.id("projects"),
            _creationTime: v.number(),
            userId: v.string(),
            folderId: v.optional(v.id("folders")),
            name: v.string(),
            description: v.optional(v.string()),
            archived: v.boolean(),
        })
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        return await ctx.db
            .query("projects")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
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
            folderId: v.optional(v.id("folders")),
            name: v.string(),
            description: v.optional(v.string()),
            archived: v.boolean(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== userId) return null;
        return project;
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        folderId: v.optional(v.id("folders")),
    },
    returns: v.id("projects"),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        return await ctx.db.insert("projects", {
            userId,
            name: args.name,
            description: args.description,
            folderId: args.folderId,
            archived: false,
        });
    },
});

export const update = mutation({
    args: {
        projectId: v.id("projects"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        folderId: v.optional(v.union(v.id("folders"), v.null())),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);
        const { projectId, folderId, ...updates } = args;

        const patchData: any = { ...updates };
        if (folderId !== undefined) {
            patchData.folderId = folderId === null ? undefined : folderId;
        }

        await ctx.db.patch(projectId, patchData);
        return null;
    },
});

export const archive = mutation({
    args: { projectId: v.id("projects") },
    returns: v.null(),
    handler: async (ctx, args) => {
        await verifyProjectAccess(ctx, args.projectId);
        await ctx.db.patch(args.projectId, { archived: true });
        return null;
    },
});
