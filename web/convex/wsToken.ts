"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import crypto from "node:crypto";

const WS_TOKEN_SECRET = process.env.WS_TOKEN_SECRET ?? "";

/**
 * Generate a short-lived HMAC-signed token for WebSocket authentication.
 * Requires Clerk auth — only authenticated users can get a token.
 *
 * Token format: base64(timestamp:email):base64(HMAC-SHA256 signature)
 * Valid for 60 seconds.
 */
export const generateWsToken = action({
    args: {},
    returns: v.string(),
    handler: async (ctx) => {
        // Require authentication
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthorized");
        const email = identity.email;
        if (!email) throw new Error("Unauthorized: no email");

        if (!WS_TOKEN_SECRET) {
            throw new Error("WS_TOKEN_SECRET not configured");
        }

        // Payload: timestamp:email
        const timestamp = Math.floor(Date.now() / 1000);
        const payload = `${timestamp}:${email}`;

        // Sign with HMAC-SHA256
        const signature = crypto
            .createHmac("sha256", WS_TOKEN_SECRET)
            .update(payload)
            .digest();

        // Return: base64(payload):base64(signature)
        const payloadB64 = Buffer.from(payload).toString("base64");
        const sigB64 = signature.toString("base64");

        return `${payloadB64}:${sigB64}`;
    },
});
