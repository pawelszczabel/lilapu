import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { plPL } from "@clerk/localizations";
import App from "./App";
import "./globals.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// ── Tauri WebView: proxy Clerk FAPI requests through Rust backend ──
// Clerk's custom-domain FAPI (clerk.lilapu.com) rejects requests whose
// Origin header isn't *.lilapu.com. Tauri WebView sends tauri://localhost.
// Fix: intercept fetch() calls to clerk.lilapu.com and route them through
// a Tauri Rust command that makes the request WITHOUT the Origin header.
const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

if (IS_TAURI) {
  const { invoke } = await import("@tauri-apps/api/core");
  const originalFetch = window.fetch;

  window.fetch = async function (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;

    // Only proxy Clerk FAPI requests
    if (!url.includes("clerk.lilapu.com")) {
      return originalFetch.call(window, input, init);
    }

    // Extract headers from init
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { headers[k] = v; });
      } else if (Array.isArray(init.headers)) {
        init.headers.forEach(([k, v]) => { headers[k] = v; });
      } else {
        Object.entries(init.headers).forEach(([k, v]) => { headers[k] = v; });
      }
    }

    const body =
      init?.body != null
        ? typeof init.body === "string"
          ? init.body
          : JSON.stringify(init.body)
        : undefined;

    try {
      const result = await invoke<{
        status: number;
        headers: Record<string, string>;
        body: string;
      }>("proxy_request", {
        url,
        method: init?.method || "GET",
        headers,
        body: body || null,
      });

      return new Response(result.body, {
        status: result.status,
        headers: result.headers,
      });
    } catch (e) {
      console.error("[Lilapu] Proxy error:", e);
      // Fallback to direct fetch
      return originalFetch.call(window, input, init);
    }
  };
}

const convex = new ConvexReactClient(convexUrl);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={clerkPubKey}
      localization={{
        ...plPL,
        waitlist: {
          ...plPL.waitlist,
          success: {
            ...plPL.waitlist?.success,
            subtitle:
              "Skontaktujemy się z Tobą, gdy aplikacja będzie gotowa do testowania.",
            message: "",
          },
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  </React.StrictMode>
);
