import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Get verification token for a user ───────────────────────────────

export const getVerificationToken = query({
    args: { userId: v.string() },
    returns: v.union(v.string(), v.null()),
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query("userKeys")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();
        return row?.verificationToken ?? null;
    },
});

// ── Set (upsert) verification token ─────────────────────────────────

export const setVerificationToken = mutation({
    args: {
        userId: v.string(),
        verificationToken: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userKeys")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                verificationToken: args.verificationToken,
            });
        } else {
            await ctx.db.insert("userKeys", {
                userId: args.userId,
                verificationToken: args.verificationToken,
            });
        }
        return null;
    },
});
