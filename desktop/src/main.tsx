import React, { Suspense, use } from "react";
import ReactDOM from "react-dom/client";
import type { Clerk } from "@clerk/clerk-js";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { plPL } from "@clerk/localizations";
import App from "./App";
import "./globals.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// ── Tauri: initialise Clerk via plugin (routes FAPI through Rust) ──
const IS_TAURI = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let clerkPromise: Promise<Clerk> | null = null;

if (IS_TAURI) {
  // Dynamic import so web builds never pull in the Tauri dependency
  clerkPromise = import("tauri-plugin-clerk").then(({ initClerk }) =>
    initClerk()
  );
}

const convex = new ConvexReactClient(convexUrl);

const clerkLocalization = {
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
};

// ── Tauri App: uses initClerk() from plugin ──
function TauriApp({ promise }: { promise: Promise<Clerk> }) {
  const clerk = use(promise);
  return (
    <ClerkProvider
      publishableKey={clerk.publishableKey}
      Clerk={clerk}
      localization={clerkLocalization}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

// ── Web App: standard ClerkProvider (fallback, should not be used in desktop) ──
function WebApp() {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      localization={clerkLocalization}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <App />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {IS_TAURI && clerkPromise ? (
      <Suspense
        fallback={
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <p>Łączenie z Clerk...</p>
          </div>
        }
      >
        <TauriApp promise={clerkPromise} />
      </Suspense>
    ) : (
      <WebApp />
    )}
  </React.StrictMode>
);
