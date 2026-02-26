/**
 * Tauri Desktop Hooks
 * 
 * - ⌘+Shift+S: Capture screenshot → OCR pipeline
 * - Drag & Drop: Drop image file → OCR pipeline
 * - Tray events: Listen for tray-toggle-recording
 * 
 * These hooks only activate when running in Tauri (window.__TAURI__)
 */

import { useEffect, useRef } from "react";

const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI__;

/**
 * Register ⌘+Shift+S global shortcut for screenshot OCR
 */
export function useScreenshotShortcut(onScreenshot: (base64Png: string) => void) {
    useEffect(() => {
        if (!isTauri) return;

        let cleanup: (() => void) | null = null;

        (async () => {
            try {
                const { register, unregister } = await import("@tauri-apps/plugin-global-shortcut");
                const { invoke } = await import("@tauri-apps/api/core");

                await register("CommandOrControl+Shift+S", async () => {
                    try {
                        const base64: string = await invoke("capture_screenshot");
                        onScreenshot(base64);
                    } catch (err) {
                        console.error("Screenshot capture error:", err);
                    }
                });

                cleanup = () => {
                    unregister("CommandOrControl+Shift+S").catch(() => { });
                };
            } catch (err) {
                console.warn("Global shortcut registration failed:", err);
            }
        })();

        return () => {
            cleanup?.();
        };
    }, [onScreenshot]);
}

/**
 * Listen for file drop events (drag & drop images for OCR)
 */
export function useFileDrop(onFileDrop: (filePath: string, base64: string) => void) {
    const callbackRef = useRef(onFileDrop);
    callbackRef.current = onFileDrop;

    useEffect(() => {
        if (!isTauri) return;

        let unlisten: (() => void) | null = null;

        (async () => {
            try {
                const { getCurrentWebview } = await import("@tauri-apps/api/webview");
                const { invoke } = await import("@tauri-apps/api/core");

                const webview = getCurrentWebview();
                const unlistenFn = await webview.onDragDropEvent(async (event) => {
                    if (event.payload.type === "drop") {
                        const paths = event.payload.paths;
                        // Only process image files
                        const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"];

                        for (const filePath of paths) {
                            const ext = filePath.toLowerCase().slice(filePath.lastIndexOf("."));
                            if (imageExtensions.includes(ext)) {
                                try {
                                    const base64: string = await invoke("read_file_as_base64", { path: filePath });
                                    callbackRef.current(filePath, base64);
                                } catch (err) {
                                    console.error("File read error:", err);
                                }
                            }
                        }
                    }
                });

                unlisten = unlistenFn;
            } catch (err) {
                console.warn("File drop listener setup failed:", err);
            }
        })();

        return () => {
            unlisten?.();
        };
    }, []);
}

/**
 * Listen for tray toggle recording events
 */
export function useTrayRecording(onToggle: () => void) {
    const callbackRef = useRef(onToggle);
    callbackRef.current = onToggle;

    useEffect(() => {
        if (!isTauri) return;

        let unlisten: (() => void) | null = null;

        (async () => {
            try {
                const { listen } = await import("@tauri-apps/api/event");
                const unlistenFn = await listen("tray-toggle-recording", () => {
                    callbackRef.current();
                });
                unlisten = unlistenFn;
            } catch (err) {
                console.warn("Tray event listener failed:", err);
            }
        })();

        return () => {
            unlisten?.();
        };
    }, []);
}
