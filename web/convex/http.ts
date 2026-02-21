import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Health check
http.route({
    path: "/health",
    method: "GET",
    handler: httpAction(async () => {
        return new Response(JSON.stringify({ status: "ok" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }),
});

// Audio upload endpoint for transcription
http.route({
    path: "/upload-audio",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        const body = await req.bytes();
        const base64Audio = Buffer.from(body).toString("base64");

        // Run transcription action
        const text = await ctx.runAction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            "ai:transcribe" as any,
            { audioBase64: base64Audio }
        );

        return new Response(JSON.stringify({ text }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    }),
});

// CORS preflight
http.route({
    path: "/upload-audio",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }),
});

export default http;
