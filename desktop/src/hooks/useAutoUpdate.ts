/**
 * Auto-Update Hook
 * 
 * Checks for updates on app start, shows notification,
 * downloads + installs update, and relaunches the app.
 */

import { useState, useEffect, useCallback } from "react";

const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI__;

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "installing" | "restarting" | "error" | "up-to-date";

interface UpdateState {
    status: UpdateStatus;
    version: string | null;
    progress: number; // 0-100
    error: string | null;
}

export function useAutoUpdate() {
    const [state, setState] = useState<UpdateState>({
        status: "idle",
        version: null,
        progress: 0,
        error: null,
    });

    // Check for updates on mount
    useEffect(() => {
        if (!isTauri) return;

        const checkForUpdate = async () => {
            setState(s => ({ ...s, status: "checking" }));

            try {
                const { check } = await import("@tauri-apps/plugin-updater");
                const update = await check();

                if (update) {
                    console.log(`[Lilapu] Update available: v${update.version}`);
                    setState({
                        status: "available",
                        version: update.version,
                        progress: 0,
                        error: null,
                    });

                    // Store the update object globally so installUpdate can use it
                    (window as any).__lilapu_update = update;
                } else {
                    console.log("[Lilapu] App is up to date");
                    setState(s => ({ ...s, status: "up-to-date" }));
                }
            } catch (err) {
                console.error("[Lilapu] Update check failed:", err);
                setState(s => ({
                    ...s,
                    status: "error",
                    error: err instanceof Error ? err.message : "Błąd sprawdzania aktualizacji",
                }));
            }
        };

        // Check after 2s delay so app loads first
        const timer = setTimeout(checkForUpdate, 2000);
        return () => clearTimeout(timer);
    }, []);

    const installUpdate = useCallback(async () => {
        const update = (window as any).__lilapu_update;
        if (!update) return;

        try {
            setState(s => ({ ...s, status: "downloading", progress: 0 }));

            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event: any) => {
                switch (event.event) {
                    case "Started":
                        contentLength = event.data.contentLength ?? 0;
                        console.log(`[Lilapu] Download started: ${contentLength} bytes`);
                        break;
                    case "Progress":
                        downloaded += event.data.chunkLength;
                        const pct = contentLength > 0
                            ? Math.round((downloaded / contentLength) * 100)
                            : 0;
                        setState(s => ({ ...s, progress: pct }));
                        break;
                    case "Finished":
                        console.log("[Lilapu] Download complete, installing...");
                        setState(s => ({ ...s, status: "installing", progress: 100 }));
                        break;
                }
            });

            // Relaunch the app
            setState(s => ({ ...s, status: "restarting" }));
            const { relaunch } = await import("@tauri-apps/plugin-process");
            await relaunch();
        } catch (err) {
            console.error("[Lilapu] Update install failed:", err);
            setState(s => ({
                ...s,
                status: "error",
                error: err instanceof Error ? err.message : "Błąd instalacji aktualizacji",
            }));
        }
    }, []);

    const dismiss = useCallback(() => {
        setState(s => ({ ...s, status: "idle" }));
        (window as any).__lilapu_update = null;
    }, []);

    return { ...state, installUpdate, dismiss };
}
