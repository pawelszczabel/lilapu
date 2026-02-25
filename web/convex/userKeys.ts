import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// ── Auth helpers ────────────────────────────────────────────────────

async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const email = identity.email;
    if (!email) throw new Error("Unauthorized: no email in identity");
    return email;
}

// ── Get verification token for the authenticated user ───────────────

export const getVerificationToken = query({
    args: {},
    returns: v.union(v.string(), v.null()),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        const row = await ctx.db
            .query("userKeys")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();
        return row?.verificationToken ?? null;
    },
});

// ── Set (upsert) verification token for the authenticated user ──────

export const setVerificationToken = mutation({
    args: {
        verificationToken: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        const existing = await ctx.db
            .query("userKeys")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                verificationToken: args.verificationToken,
            });
        } else {
            await ctx.db.insert("userKeys", {
                userId,
                verificationToken: args.verificationToken,
            });
        }
        return null;
    },
});
