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

// ── Timing-safe key comparison (pure JS — Convex HTTP runs in edge runtime) ──
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
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

// ── Rate limiting for upload endpoint ───────────────────────────────
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // max 10 uploads per minute per key
const uploadRateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = uploadRateMap.get(key);
    if (!entry || now > entry.resetAt) {
        uploadRateMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }
    entry.count++;
    return entry.count <= RATE_LIMIT_MAX_REQUESTS;
}

// Audio upload endpoint for transcription (requires API key)
http.route({
    path: "/upload-audio",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        // ── Auth: require API key (timing-safe comparison) ──
        const apiKey = req.headers.get("X-API-Key") ?? req.headers.get("Authorization")?.replace("Bearer ", "");
        const expectedKey = process.env.UPLOAD_API_KEY;
        if (!expectedKey || !apiKey || !timingSafeEqual(apiKey, expectedKey)) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // ── Rate limiting ──
        if (!checkRateLimit(apiKey)) {
            return new Response(JSON.stringify({ error: "Too many requests" }), {
                status: 429,
                headers: { "Content-Type": "application/json", "Retry-After": "60" },
            });
        }

        // ── CORS ──
        const corsOrigin = getCorsOrigin(req);

        // ── Payload size limit ──
        const contentLength = parseInt(req.headers.get("Content-Length") ?? "0", 10);
        if (contentLength > MAX_UPLOAD_BYTES) {
            return new Response(JSON.stringify({ error: "Payload too large" }), {
                status: 413,
                headers: { "Content-Type": "application/json" },
            });
        }

        const body = await req.bytes();
        if (body.length > MAX_UPLOAD_BYTES) {
            return new Response(JSON.stringify({ error: "Payload too large" }), {
                status: 413,
                headers: { "Content-Type": "application/json" },
            });
        }

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
