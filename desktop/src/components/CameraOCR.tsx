/**
 * CameraOCR — Live camera preview → capture frame → OCR
 * 
 * Uses getUserMedia for camera access (works in both Tauri WebView and browser).
 * Captures a frame to canvas, converts to base64 PNG, sends to GOT-OCR via Convex.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@convex/api";
import { Id } from "@convex/dataModel";
import { getSessionKeyOrThrow, encryptString } from "../crypto";

interface CameraOCRProps {
    projectId: Id<"projects">;
    onNoteCreated: () => void;
}

export default function CameraOCR({ projectId, onNoteCreated }: CameraOCRProps) {
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [ocrResult, setOcrResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const ocrHandwriting = useAction(api.ai.ocrHandwriting);
    const createNote = useMutation(api.notes.create);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const startCamera = useCallback(async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment", // Tylna kamera na mobilnych
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setIsCameraOn(true);
        } catch (err) {
            console.error("Camera error:", err);
            setError("Nie udało się uruchomić kamery. Sprawdź uprawnienia.");
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
    }, []);

    const captureFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsProcessing(true);
        setError(null);
        setOcrResult(null);

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context error");

            ctx.drawImage(video, 0, 0);

            // Convert to base64 PNG (strip data URL prefix)
            const dataUrl = canvas.toDataURL("image/png");
            const base64 = dataUrl.split(",")[1];

            // Send to GOT-OCR via Convex
            const text = await ocrHandwriting({ imageBase64: base64, postProcess: true });

            if (text && text.trim()) {
                setOcrResult(text);
            } else {
                setError("OCR nie rozpoznał tekstu na zdjęciu.");
            }
        } catch (err) {
            console.error("OCR error:", err);
            setError(`Błąd OCR: ${err}`);
        } finally {
            setIsProcessing(false);
        }
    }, [ocrHandwriting]);

    const saveAsNote = useCallback(async () => {
        if (!ocrResult) return;
        setIsSaving(true);

        try {
            const key = await getSessionKeyOrThrow();
            const encryptedContent = await encryptString(key, ocrResult);
            const title = `📷 Skan z kamery ${new Date().toLocaleDateString("pl-PL")}`;
            const encryptedTitle = await encryptString(key, title);

            await createNote({
                projectId,
                title: encryptedTitle,
                content: encryptedContent,
            });

            setOcrResult(null);
            stopCamera();
            onNoteCreated();
        } catch (err) {
            console.error("Save error:", err);
            setError(`Błąd zapisu: ${err}`);
        } finally {
            setIsSaving(false);
        }
    }, [ocrResult, projectId, createNote, stopCamera, onNoteCreated]);

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
            padding: "var(--space-4)",
        }}>
            {/* Camera preview */}
            <div style={{
                position: "relative",
                width: "100%",
                maxWidth: 640,
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                background: "#111",
                aspectRatio: "16/9",
                border: isCameraOn ? "2px solid var(--accent)" : "2px solid var(--border)",
            }}>
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: isCameraOn ? "block" : "none",
                    }}
                />
                {!isCameraOn && (
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "var(--text-muted)",
                        gap: "var(--space-2)",
                    }}>
                        <span style={{ fontSize: 48 }}>📷</span>
                        <span>Uruchom kamerę, aby zeskanować notatkę</span>
                    </div>
                )}

                {/* Capture overlay */}
                {isProcessing && (
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "var(--text-lg)",
                        fontWeight: 600,
                    }}>
                        ⏳ Rozpoznawanie tekstu...
                    </div>
                )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Controls */}
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", justifyContent: "center" }}>
                {!isCameraOn ? (
                    <button
                        onClick={startCamera}
                        style={{
                            padding: "var(--space-3) var(--space-6)",
                            borderRadius: "var(--radius-lg)",
                            border: "none",
                            background: "var(--accent)",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "var(--text-md)",
                            fontWeight: 600,
                            transition: "all 0.2s",
                        }}
                    >
                        📷 Uruchom kamerę
                    </button>
                ) : (
                    <>
                        <button
                            onClick={captureFrame}
                            disabled={isProcessing}
                            style={{
                                padding: "var(--space-3) var(--space-6)",
                                borderRadius: "var(--radius-lg)",
                                border: "none",
                                background: isProcessing ? "var(--text-muted)" : "var(--accent)",
                                color: "white",
                                cursor: isProcessing ? "wait" : "pointer",
                                fontSize: "var(--text-md)",
                                fontWeight: 600,
                                transition: "all 0.2s",
                            }}
                        >
                            {isProcessing ? "⏳ Przetwarzam..." : "📸 Zrób zdjęcie i OCR"}
                        </button>
                        <button
                            onClick={stopCamera}
                            style={{
                                padding: "var(--space-3) var(--space-6)",
                                borderRadius: "var(--radius-lg)",
                                border: "1px solid var(--border)",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "var(--text-md)",
                                transition: "all 0.2s",
                            }}
                        >
                            ✕ Zamknij kamerę
                        </button>
                    </>
                )}
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#ef4444",
                    fontSize: "var(--text-sm)",
                    width: "100%",
                    maxWidth: 640,
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* OCR Result */}
            {ocrResult && (
                <div style={{
                    width: "100%",
                    maxWidth: 640,
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-3)",
                }}>
                    <h3 style={{ margin: 0, color: "var(--text-primary)" }}>
                        📝 Rozpoznany tekst:
                    </h3>
                    <div style={{
                        padding: "var(--space-4)",
                        borderRadius: "var(--radius-lg)",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        whiteSpace: "pre-wrap",
                        fontSize: "var(--text-sm)",
                        lineHeight: 1.6,
                        color: "var(--text-primary)",
                        maxHeight: 300,
                        overflowY: "auto",
                    }}>
                        {ocrResult}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-3)" }}>
                        <button
                            onClick={saveAsNote}
                            disabled={isSaving}
                            style={{
                                flex: 1,
                                padding: "var(--space-3)",
                                borderRadius: "var(--radius-lg)",
                                border: "none",
                                background: "var(--accent)",
                                color: "white",
                                cursor: isSaving ? "wait" : "pointer",
                                fontSize: "var(--text-md)",
                                fontWeight: 600,
                            }}
                        >
                            {isSaving ? "⏳ Zapisywanie..." : "💾 Zapisz jako notatkę"}
                        </button>
                        <button
                            onClick={() => setOcrResult(null)}
                            style={{
                                padding: "var(--space-3) var(--space-4)",
                                borderRadius: "var(--radius-lg)",
                                border: "1px solid var(--border)",
                                background: "var(--bg-surface)",
                                color: "var(--text-primary)",
                                cursor: "pointer",
                                fontSize: "var(--text-md)",
                            }}
                        >
                            🗑️ Odrzuć
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
