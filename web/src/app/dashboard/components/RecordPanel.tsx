"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface RecordPanelProps {
    projectId: Id<"projects">;
    onRecordingComplete: () => void;
}

// ── WAV encoder (PCM → WAV) ─────────────────────────────────────────

function encodeWavFromFloat32(samples: Float32Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataLength = samples.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, "WAVE");

    // fmt chunk
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, "data");
    view.setUint32(40, dataLength, true);

    // PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
    }
}

// ─────────────────────────────────────────────────────────────────────

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

    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transcriptRef = useRef("");
    const processingRef = useRef(false);
    const pendingChunksRef = useRef<Float32Array[]>([]);
    const allSamplesRef = useRef<Float32Array[]>([]);

    // Accumulate samples for chunked sending
    const chunkBufferRef = useRef<Float32Array[]>([]);
    const chunkSampleCountRef = useRef(0);

    const SAMPLE_RATE = 16000;
    const CHUNK_DURATION_SEC = 5;
    const CHUNK_SAMPLE_THRESHOLD = SAMPLE_RATE * CHUNK_DURATION_SEC;

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

    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                resolve(dataUrl.split(",")[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    /**
     * Merge Float32Array chunks into a single array.
     */
    const mergeFloat32Arrays = (arrays: Float32Array[]): Float32Array => {
        const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
        const result = new Float32Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    };

    /**
     * Transcribe a WAV blob via Convex action.
     */
    const transcribeChunk = useCallback(
        async (samples: Float32Array) => {
            try {
                setIsTranscribing(true);
                const wavBlob = encodeWavFromFloat32(samples, SAMPLE_RATE);
                const base64 = await blobToBase64(wavBlob);
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
        },
        [transcribeAudio]
    );

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
                    sampleRate: SAMPLE_RATE,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });
            streamRef.current = stream;

            const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);

            // ScriptProcessorNode to capture raw PCM
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            chunkBufferRef.current = [];
            chunkSampleCountRef.current = 0;
            allSamplesRef.current = [];
            transcriptRef.current = "";

            processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const copy = new Float32Array(inputData.length);
                copy.set(inputData);

                allSamplesRef.current.push(copy);
                chunkBufferRef.current.push(copy);
                chunkSampleCountRef.current += copy.length;

                // When we have enough samples for a chunk, queue it
                if (chunkSampleCountRef.current >= CHUNK_SAMPLE_THRESHOLD) {
                    const merged = mergeFloat32Arrays(chunkBufferRef.current);
                    pendingChunksRef.current.push(merged);
                    chunkBufferRef.current = [];
                    chunkSampleCountRef.current = 0;
                    processQueue();
                }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

            setIsRecording(true);
            setSeconds(0);
            setTranscript("");
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia.");
        }
    }, [processQueue]);

    const stopRecording = useCallback(async () => {
        setIsSaving(true);

        // Stop audio processing
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);

        // Queue any remaining samples in the chunk buffer
        if (chunkBufferRef.current.length > 0) {
            const merged = mergeFloat32Arrays(chunkBufferRef.current);
            pendingChunksRef.current.push(merged);
            chunkBufferRef.current = [];
            chunkSampleCountRef.current = 0;
            processQueue();
        }

        // Wait for all pending chunks to finish
        while (pendingChunksRef.current.length > 0 || processingRef.current) {
            await new Promise((r) => setTimeout(r, 500));
        }

        // If no live transcript, try full-file transcription
        let finalTranscript = transcriptRef.current;
        if (!finalTranscript && allSamplesRef.current.length > 0) {
            try {
                const allSamples = mergeFloat32Arrays(allSamplesRef.current);
                const wavBlob = encodeWavFromFloat32(allSamples, SAMPLE_RATE);
                const base64 = await blobToBase64(wavBlob);
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
    }, [seconds, title, projectId, createTranscription, indexTranscription, transcribeAudio, onRecordingComplete, processQueue]);

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

            {!isRecording && !isSaving && (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-2)" }}>
                    <input
                        className="record-title-input"
                        type="text"
                        placeholder="O czym będziesz mówić? Wpisz temat..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        style={{
                            fontSize: "var(--text-lg)",
                            padding: "var(--space-4)",
                            border: "1px solid rgba(124, 92, 252, 0.3)",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                            fontWeight: 500
                        }}
                    />
                    <label style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>Tytuł nagrania (opcjonalny)</label>
                </div>
            )}

            <button
                className={`record-btn ${isRecording ? "record-btn-stop" : "record-btn-start"}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isSaving}
                style={{ marginTop: isRecording ? 0 : "var(--space-4)" }}
            >
                {isSaving ? "⏳" : isRecording ? "■" : "●"}
            </button>

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

            {!isRecording && !isSaving && !transcript && (
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', opacity: 0.8 }}>
                    <svg
                        width="120"
                        height="120"
                        viewBox="0 0 100 100"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ filter: 'drop-shadow(0 0 24px rgba(124, 92, 252, 0.5))' }}
                    >
                        <style>
                            {`
                                @keyframes floatLilac {
                                    0% { transform: translateY(0px) rotate(0deg); }
                                    25% { transform: translateY(-3px) rotate(1deg); }
                                    50% { transform: translateY(-6px) rotate(0deg); }
                                    75% { transform: translateY(-3px) rotate(-1deg); }
                                    100% { transform: translateY(0px) rotate(0deg); }
                                }
                                @keyframes pulseGlow {
                                    0% { fill-opacity: 0.8; }
                                    50% { fill-opacity: 1; }
                                    100% { fill-opacity: 0.8; }
                                }
                                .lilac-animated {
                                    transform-origin: center;
                                    animation: floatLilac 4s ease-in-out infinite;
                                }
                                .lilac-petal {
                                    animation: pulseGlow 3s ease-in-out infinite alternate;
                                }
                            `}
                        </style>
                        <g className="lilac-animated">
                            {/* Stem */}
                            <path d="M50 85 Q45 60 50 45" stroke="#7c5cfc" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                            <path d="M50 65 Q40 55 35 45" stroke="#7c5cfc" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                            <path d="M50 70 Q60 60 65 50" stroke="#7c5cfc" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

                            {/* Bottom Leaves */}
                            <path d="M50 80 Q35 70 30 55 Q45 60 50 80" fill="#4B0082" opacity="0.7" />
                            <path d="M50 80 Q65 70 70 55 Q55 60 50 80" fill="#4B0082" opacity="0.7" />

                            {/* Main Flower Cluster */}
                            {/* Bottom row */}
                            <circle cx="40" cy="50" r="6" fill="#a78bfa" className="lilac-petal" style={{ animationDelay: '0s' }} />
                            <circle cx="50" cy="52" r="7" fill="#c4b5fd" className="lilac-petal" style={{ animationDelay: '0.5s' }} />
                            <circle cx="60" cy="50" r="6" fill="#8b5cf6" className="lilac-petal" style={{ animationDelay: '1s' }} />

                            {/* Middle row */}
                            <circle cx="43" cy="40" r="6.5" fill="#c4b5fd" className="lilac-petal" style={{ animationDelay: '0.2s' }} />
                            <circle cx="57" cy="40" r="6.5" fill="#a78bfa" className="lilac-petal" style={{ animationDelay: '0.7s' }} />
                            <circle cx="50" cy="42" r="8" fill="#ddd6fe" className="lilac-petal" style={{ animationDelay: '1.2s' }} />

                            {/* Top row */}
                            <circle cx="46" cy="30" r="5.5" fill="#8b5cf6" className="lilac-petal" style={{ animationDelay: '0.4s' }} />
                            <circle cx="54" cy="30" r="5.5" fill="#c4b5fd" className="lilac-petal" style={{ animationDelay: '0.9s' }} />

                            {/* Apex */}
                            <circle cx="50" cy="22" r="5" fill="#ddd6fe" className="lilac-petal" style={{ animationDelay: '1.4s' }} />

                            {/* Core dark spots (details) */}
                            <circle cx="40" cy="50" r="1.5" fill="#4c1d95" opacity="0.8" />
                            <circle cx="50" cy="52" r="2" fill="#4c1d95" opacity="0.8" />
                            <circle cx="60" cy="50" r="1.5" fill="#4c1d95" opacity="0.8" />
                            <circle cx="50" cy="42" r="2" fill="#4c1d95" opacity="0.8" />
                            <circle cx="50" cy="22" r="1.5" fill="#4c1d95" opacity="0.8" />
                        </g>
                    </svg>
                </div>
            )}

            {isRecording && (
                <p style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", textAlign: "center" }}>
                    💡 Audio wysyłane co 5s do transkrypcji (format WAV)
                </p>
            )}
        </div>
    );
}
