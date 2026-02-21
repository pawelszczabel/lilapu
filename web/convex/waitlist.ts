import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
    args: {
        email: v.string(),
        source: v.optional(v.string()),
    },
    returns: v.union(v.literal("ok"), v.literal("exists")),
    handler: async (ctx, args) => {
        // Check if already signed up
        const existing = await ctx.db
            .query("waitlist")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) return "exists";

        await ctx.db.insert("waitlist", {
            email: args.email,
            source: args.source,
        });

        return "ok";
    },
});

export const count = query({
    args: {},
    returns: v.number(),
    handler: async (ctx) => {
        const all = await ctx.db.query("waitlist").collect();
        return all.length;
    },
});
