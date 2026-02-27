import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default clerkMiddleware(async (_auth, req: NextRequest) => {
    const response = NextResponse.next();

    // ── Generate CSP nonce per request ──────────────────────────────
    const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

    const csp = [
        `default-src 'self'`,
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://*.clerk.com https://clerk.lilapu.com https://challenges.cloudflare.com https://*.posthog.com`,
        `style-src 'self' 'unsafe-inline'`,
        `connect-src 'self' https://*.convex.cloud wss://*.convex.cloud wss://*.runpod.net https://*.clerk.com https://clerk.lilapu.com https://api.runpod.ai https://*.posthog.com https://eu.i.posthog.com`,
        `img-src 'self' data: blob: https://img.clerk.com`,
        `frame-src https://*.clerk.com https://clerk.lilapu.com https://challenges.cloudflare.com`,
        `font-src 'self' data:`,
        `worker-src 'self' blob:`,
        `media-src 'self' blob:`,
    ].join("; ");

    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("x-nonce", nonce);

    return response;
});

export const config = {
    matcher: [
        // Skip Next.js internals and static files
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
        // Always run for API routes
        "/(api|trpc)(.*)",
    ],
};
