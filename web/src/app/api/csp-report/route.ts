import { NextResponse } from "next/server";

/**
 * CSP violation report collector.
 * Browsers send POST requests here when Content-Security-Policy is violated.
 * Logs violations server-side for security monitoring.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const report = body["csp-report"] ?? body;

        // Log violation for monitoring (shows up in Vercel/server logs)
        console.warn("[CSP Violation]", JSON.stringify({
            blockedUri: report["blocked-uri"] ?? report.blockedURL,
            violatedDirective: report["violated-directive"] ?? report.effectiveDirective,
            documentUri: report["document-uri"] ?? report.documentURL,
            sourceFile: report["source-file"] ?? report.sourceFile,
            lineNumber: report["line-number"] ?? report.lineNumber,
        }));
    } catch {
        // Silently ignore malformed reports
    }

    return NextResponse.json({ ok: true }, { status: 204 });
}
