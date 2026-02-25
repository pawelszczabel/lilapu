import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// ── Allowed origins for CORS ────────────────────────────────────────
const ALLOWED_ORIGINS = [
    "https://lilapu.com",
    "https://www.lilapu.com",
];

function getCorsOrigin(req: Request): string {
    const origin = req.headers.get("Origin") ?? "";
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    // Allow Convex preview/dev domains
    if (origin.endsWith(".convex.cloud") || origin.endsWith(".convex.site")) return origin;
    // Allow localhost in development
    if (origin.startsWith("http://localhost:")) return origin;
    return "";
}

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

// Audio upload endpoint for transcription (requires API key)
http.route({
    path: "/upload-audio",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        // ── Auth: require API key ──
        const apiKey = req.headers.get("X-API-Key") ?? req.headers.get("Authorization")?.replace("Bearer ", "");
        const expectedKey = process.env.UPLOAD_API_KEY;
        if (!expectedKey || !apiKey || apiKey !== expectedKey) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // ── CORS ──
        const corsOrigin = getCorsOrigin(req);

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
                ...(corsOrigin && { "Access-Control-Allow-Origin": corsOrigin }),
            },
        });
    }),
});

// CORS preflight
http.route({
    path: "/upload-audio",
    method: "OPTIONS",
    handler: httpAction(async (_ctx, req) => {
        const corsOrigin = getCorsOrigin(req);
        return new Response(null, {
            status: 204,
            headers: {
                ...(corsOrigin && { "Access-Control-Allow-Origin": corsOrigin }),
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
            },
        });
    }),
});

export default http;
