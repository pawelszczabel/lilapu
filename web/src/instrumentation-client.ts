import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_TOKEN!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    // We handle pageviews manually via PostHogTracker (skips /dashboard/*)
    capture_pageview: false,
    capture_pageleave: false,
    persistence: "localStorage+cookie",
    // GDPR: disabled by default, enabled on cookie consent "all"
    opt_out_capturing_by_default: true,
});
