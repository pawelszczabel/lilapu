"use client";

import { useState, useCallback } from "react";
import { MockSidebar, MockMainPanel } from "./DemoShared";
import "./demo.css";

/* ═══════════════════════════════════════════════════
   DEMO PREVIEW — Inline interactive demo for landing page
   Shows the app window with working tab switching.
   No onboarding, no story cards, no sound effects.
   All heights enforced via inline styles to prevent
   content-dependent resizing.
   ═══════════════════════════════════════════════════ */

const PREVIEW_HEIGHT = 720;

export default function DemoPreview() {
    const [activeTab, setActiveTab] = useState<string>("notes");

    const handleTabClick = useCallback((tab: string) => {
        setActiveTab(tab);
    }, []);

    return (
        <div
            className="demo-preview"
            style={{ height: PREVIEW_HEIGHT, minHeight: PREVIEW_HEIGHT, maxHeight: PREVIEW_HEIGHT }}
        >
            <div
                className="demo-preview-inner"
                style={{ height: "100%", minHeight: 0, maxHeight: "100%", overflow: "hidden" }}
            >
                {/* macOS Title Bar */}
                <div className="demo-titlebar">
                    <div className="demo-traffic-lights">
                        <span className="demo-traffic-light close" />
                        <span className="demo-traffic-light minimize" />
                        <span className="demo-traffic-light maximize" />
                    </div>
                    <span className="demo-titlebar-text">Lilapu — Twój prywatny asystent AI</span>
                </div>

                {/* Dashboard */}
                <div
                    className="demo-dashboard"
                    style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
                >
                    <MockSidebar activeStep="" />
                    <MockMainPanel
                        activeTab={activeTab}
                        onTabClick={handleTabClick}
                        activeStep=""
                    />
                </div>
            </div>
        </div>
    );
}
