"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface RecordPanelProps {
    projectId: Id<"projects">;
    onRecordingComplete: () => void;
}

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
    const transcribeAudio = useAction(api.ai.transcribe);

    // Timer
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
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
     * Convert blob to base64 string.
     */
    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.split(",")[1]); // Strip data:...;base64, prefix
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    /**
     * Send audio chunk via Convex action → whisper.cpp (no CORS issues).
     */
    const transcribeChunk = useCallback(async (audioBlob: Blob) => {
        try {
            setIsTranscribing(true);
            const base64 = await blobToBase64(audioBlob);
            const text = await transcribeAudio({ audioBase64: base64 });
            const trimmed = text?.trim();
            if (trimmed && trimmed !== "[BLANK_AUDIO]" && trimmed.length > 1) {
                transcriptRef.current += (transcriptRef.current ? " " : "") + trimmed;
                setTranscript(transcriptRef.current);
            }
        } catch (err) {
            console.warn("Transcription error:", err);
        } finally {
            setIsTranscribing(false);
        }
    }, [transcribeAudio]);

    /**
     * Process pending audio chunks sequentially.
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
                    pendingChunksRef.current.push(event.data);
                    processQueue();
                }
            };

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

        mediaRecorderRef.current.stop();
        streamRef.current.getTracks().forEach((track) => track.stop());

        await new Promise<void>((resolve) => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = () => resolve();
            }
        });

        setIsRecording(false);

        // Wait for pending chunks
        while (pendingChunksRef.current.length > 0 || processingRef.current) {
            await new Promise((r) => setTimeout(r, 500));
        }

        // If no live transcript, try full-file transcription via Convex
        let finalTranscript = transcriptRef.current;
        if (!finalTranscript && chunksRef.current.length > 0) {
            try {
                const fullBlob = new Blob(chunksRef.current, { type: "audio/webm" });
                const base64 = await blobToBase64(fullBlob);
                finalTranscript = await transcribeAudio({ audioBase64: base64 });
                finalTranscript = finalTranscript?.trim() || "";
            } catch {
                console.warn("Full transcription failed, saving with placeholder");
            }
        }

        const durationSeconds = seconds;
        const content = finalTranscript || "[Transkrypcja niedostępna — sprawdź serwer AI]";

        try {
            const transcriptionId = await createTranscription({
                projectId,
                title: title || `Nagranie ${new Date().toLocaleDateString("pl-PL")}`,
                content,
                durationSeconds,
            });

            indexTranscription({ transcriptionId }).catch((err: unknown) =>
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
    }, [seconds, title, projectId, createTranscription, indexTranscription, transcribeAudio, onRecordingComplete]);

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
                    💡 Audio wysyłane co 5s do transkrypcji przez Convex
                </p>
            )}
        </div>
    );
}
