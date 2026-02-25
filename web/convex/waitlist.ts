import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
    args: {
        email: v.string(),
        source: v.optional(v.string()),
    },
    returns: v.union(v.literal("ok"), v.literal("exists")),
    handler: async (ctx, args) => {
        // Rate limiting: max 5 signups in the last 10 minutes
        const TEN_MINUTES = 10 * 60 * 1000;
        const cutoff = Date.now() - TEN_MINUTES;
        const recentEntries = await ctx.db
            .query("waitlist")
            .order("desc")
            .filter((q) => q.gt(q.field("_creationTime"), cutoff))
            .collect();

        if (recentEntries.length >= 5) {
            throw new Error("Zbyt wiele prób rejestracji. Spróbuj ponownie za kilka minut.");
        }

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
