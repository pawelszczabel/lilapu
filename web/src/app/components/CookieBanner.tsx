"use client";

import { useState, useEffect } from "react";

type CookieConsent = "all" | "essential" | null;

function getCookieConsent(): CookieConsent {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem("cookie-consent");
    if (v === "all" || v === "essential") return v;
    return null;
}

export default function CookieBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!getCookieConsent()) {
            // Slight delay so it doesn't flash on page load
            const t = setTimeout(() => setVisible(true), 800);
            return () => clearTimeout(t);
        }
    }, []);

    function accept(level: "all" | "essential") {
        localStorage.setItem("cookie-consent", level);
        setVisible(false);
    }

    if (!visible) return null;

    return (
        <div className="cookie-banner" role="dialog" aria-label="Baner ciasteczek">
            <div className="cookie-banner-content">
                <p>
                    Używamy plików cookie: niezbędnych do działania strony, analitycznych (Google Analytics)
                    oraz marketingowych (Google Ads, Meta Ads).
                    Możesz zaakceptować wszystkie lub wybrać tylko niezbędne.{" "}
                    <a href="/polityka-ciasteczek">Dowiedz się więcej</a>.
                </p>
                <div className="cookie-banner-actions">
                    <button
                        className="btn btn-primary cookie-btn-accept"
                        onClick={() => accept("all")}
                    >
                        Akceptuję wszystkie
                    </button>
                    <button
                        className="btn cookie-btn-reject"
                        onClick={() => accept("essential")}
                    >
                        Tylko niezbędne
                    </button>
                </div>
            </div>
        </div>
    );
}
