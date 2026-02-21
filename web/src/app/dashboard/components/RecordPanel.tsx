"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface RecordPanelProps {
    projectId: Id<"projects">;
    onRecordingComplete: () => void;
}

const WHISPER_URL = process.env.NEXT_PUBLIC_WHISPER_URL ?? "http://localhost:8081";

export default function RecordPanel({
    projectId,
    onRecordingComplete,
}: RecordPanelProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [title, setTitle] = useState("");
    const [seconds, setSeconds] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const transcriptRef = useRef("");
    const pendingChunksRef = useRef<Blob[]>([]);
    const processingRef = useRef(false);

    const createTranscription = useMutation(api.transcriptions.create);
    const indexTranscription = useAction(api.rag.indexTranscription);

    // Timer
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    /**
     * Send an audio chunk directly to local whisper.cpp server.
     * This runs in the browser → localhost:8081 (no Convex round-trip).
     */
    const transcribeChunk = useCallback(async (audioBlob: Blob) => {
        try {
            setIsTranscribing(true);
            const formData = new FormData();
            formData.append("file", audioBlob, "chunk.wav");
            formData.append("language", "pl");
            formData.append("response_format", "json");

            const response = await fetch(`${WHISPER_URL}/inference`, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                const text = result.text?.trim();
                if (text && text !== "[BLANK_AUDIO]" && text.length > 1) {
                    transcriptRef.current += (transcriptRef.current ? " " : "") + text;
                    setTranscript(transcriptRef.current);
                }
            }
        } catch (err) {
            console.warn("Whisper chunk error (server may be offline):", err);
        } finally {
            setIsTranscribing(false);
        }
    }, []);

    /**
     * Process pending audio chunks sequentially to avoid overwhelming whisper.
     */
    const processQueue = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;

        while (pendingChunksRef.current.length > 0) {
            const chunk = pendingChunksRef.current.shift()!;
            await transcribeChunk(chunk);
        }

        processingRef.current = false;
    }, [transcribeChunk]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm;codecs=opus",
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            transcriptRef.current = "";

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                    // Queue chunk for live transcription
                    pendingChunksRef.current.push(event.data);
                    processQueue();
                }
            };

            // Every 5s, send a chunk to whisper.cpp for live transcription
            mediaRecorder.start(5000);
            setIsRecording(true);
            setSeconds(0);
            setTranscript("");
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia.");
        }
    }, [processQueue]);

    const stopRecording = useCallback(async () => {
        if (!mediaRecorderRef.current || !streamRef.current) return;

        setIsSaving(true);

        // Stop recording
        mediaRecorderRef.current.stop();
        streamRef.current.getTracks().forEach((track) => track.stop());

        // Wait for final chunks
        await new Promise<void>((resolve) => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = () => resolve();
            }
        });

        setIsRecording(false);

        // Process any remaining chunks
        while (pendingChunksRef.current.length > 0 || processingRef.current) {
            await new Promise((r) => setTimeout(r, 500));
        }

        // If no transcript from live streaming, try full-file transcription
        let finalTranscript = transcriptRef.current;
        if (!finalTranscript && chunksRef.current.length > 0) {
            try {
                const fullBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                const formData = new FormData();
                formData.append("file", fullBlob, "recording.wav");
                formData.append("language", "pl");
                formData.append("response_format", "json");

                const response = await fetch(`${WHISPER_URL}/inference`, {
                    method: "POST",
                    body: formData,
                });
                if (response.ok) {
                    const result = await response.json();
                    finalTranscript = result.text?.trim() || "";
                }
            } catch {
                console.warn("Full transcription failed, saving with placeholder");
            }
        }

        const durationSeconds = seconds;
        const content = finalTranscript || "[Transkrypcja niedostępna — uruchom whisper.cpp]";

        try {
            const transcriptionId = await createTranscription({
                projectId,
                title: title || `Nagranie ${new Date().toLocaleDateString("pl-PL")}`,
                content,
                durationSeconds,
            });

            // Index for RAG (async, don't block)
            indexTranscription({ transcriptionId }).catch((err) =>
                console.warn("RAG indexing skipped:", err)
            );

            setTranscript("");
            setTitle("");
            onRecordingComplete();
        } catch (err) {
            console.error("Failed to save:", err);
            alert("Błąd zapisu transkrypcji.");
        } finally {
            setIsSaving(false);
        }
    }, [seconds, title, projectId, createTranscription, indexTranscription, onRecordingComplete]);

    return (
        <div className="record-panel">
            {isRecording ? (
                <>
                    <div className="record-status">
                        <span className="record-dot" />
                        Nagrywanie...
                    </div>
                    <div className="record-timer">{formatTime(seconds)}</div>
                </>
            ) : (
                <div className="record-status" style={{ color: "var(--text-muted)" }}>
                    {isSaving ? "Zapisywanie..." : "Gotowy do nagrywania"}
                </div>
            )}

            <button
                className={`record-btn ${isRecording ? "record-btn-stop" : "record-btn-start"}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSaving}
            >
                {isSaving ? "⏳" : isRecording ? "■" : "●"}
            </button>

            {!isRecording && !isSaving && (
                <input
                    className="record-title-input"
                    type="text"
                    placeholder="Tytuł nagrania (opcjonalny)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            )}

            {(isRecording || transcript) && (
                <div className="live-transcript">
                    {transcript ? (
                        <>
                            {transcript}
                            {isRecording && <span className="live-transcript-cursor" />}
                        </>
                    ) : (
                        <span className="live-transcript-placeholder">
                            {isTranscribing
                                ? "⏳ Przetwarzam audio..."
                                : "🎙️ Mów — tekst pojawi się na żywo..."}
                        </span>
                    )}
                </div>
            )}

            {isRecording && (
                <p style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", textAlign: "center" }}>
                    💡 Audio jest przesyłane do whisper.cpp co 5s. Upewnij się, że serwer działa na :8081
                </p>
            )}
        </div>
    );
}
