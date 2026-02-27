"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";

/** Paths where PostHog should NOT track anything */
const BLOCKED_PREFIXES = ["/dashboard"];

function isTrackable(path: string) {
    return !BLOCKED_PREFIXES.some((p) => path.startsWith(p));
}

export default function PostHogTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const identifiedRef = useRef(false);

    // Identify Clerk user in PostHog (once)
    useEffect(() => {
        if (user && !identifiedRef.current) {
            posthog.identify(user.id, {
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName,
            });
            identifiedRef.current = true;
        }
    }, [user]);

    // Track pageviews only on allowed paths
    useEffect(() => {
        if (isTrackable(pathname)) {
            const url = window.origin + pathname;
            const search = searchParams.toString();
            posthog.capture("$pageview", {
                $current_url: search ? `${url}?${search}` : url,
            });
        }
    }, [pathname, searchParams]);

    return null;
}
