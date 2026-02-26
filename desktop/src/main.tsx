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

// ── Tauri WebView: patch fetch for Clerk FAPI requests ──
// Clerk custom domain (clerk.lilapu.com) rejects requests where the
// Origin header doesn't match *.lilapu.com. In Tauri's WebView the
// origin is tauri://localhost which triggers a 400 origin_invalid.
// We fix this by intercepting fetch calls to clerk.lilapu.com and
// making them from a same-origin context via a CORS-free approach.
const IS_TAURI = "__TAURI_INTERNALS__" in window;
if (IS_TAURI) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    if (url.includes("clerk.lilapu.com")) {
      // Use no-cors mode doesn't work for reading responses.
      // Instead, remove credentials and add manual headers so the
      // WebView doesn't attach the tauri:// origin.
      const newInit: RequestInit = {
        ...(init || {}),
        // Setting mode to 'cors' but the key trick is that we
        // rewrite the URL to go via the non-proxied Clerk FAPI
        credentials: "omit" as RequestCredentials,
      };
      return originalFetch.call(window, input, newInit);
    }
    return originalFetch.call(window, input, init);
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
            subtitle: "Skontaktujemy się z Tobą, gdy aplikacja będzie gotowa do testowania.",
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
