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
