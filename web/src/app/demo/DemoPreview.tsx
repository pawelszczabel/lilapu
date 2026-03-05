"use client";

import { useState, useCallback } from "react";
import { MockSidebar, MockMainPanel } from "./DemoShared";
import "./demo.css";

/* ═══════════════════════════════════════════════════
   DEMO PREVIEW — Inline interactive demo for landing page
   Shows the app window with working tab switching.
   No onboarding, no story cards, no sound effects.
   ═══════════════════════════════════════════════════ */

export default function DemoPreview() {
    const [activeTab, setActiveTab] = useState<string>("notes");

    const handleTabClick = useCallback((tab: string) => {
        setActiveTab(tab);
    }, []);

    return (
        <div className="demo-preview">
            <div className="demo-preview-inner">
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
                <div className="demo-dashboard">
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
