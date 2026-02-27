

import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@convex/api";
import { Id } from "@convex/dataModel";
import { getSessionKeyOrThrow, encryptBlob, decryptBlob, encryptString } from "../crypto";

interface RecordPanelProps {
    projectId: Id<"projects">;
    onRecordingComplete: () => void;
}

// ── Tauri detection ──────────────────────────────────────────────────
const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI__;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, args);
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

// ── Audio Player sub-component ───────────────────────────────────────

function AudioPlayer({ audioStorageId }: { audioStorageId: Id<"_storage"> }) {
    const audioUrl = useQuery(api.transcriptions.getAudioUrl, { storageId: audioStorageId });
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const updateProgress = useCallback(() => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            if (!audioRef.current.paused) {
                animFrameRef.current = requestAnimationFrame(updateProgress);
            }
        }
    }, []);

    const loadAndDecrypt = useCallback(async () => {
        if (!audioUrl) return;
        if (objectUrlRef.current) return; // Already loaded

        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(audioUrl);
            const encryptedBlob = await response.blob();

            const key = await getSessionKeyOrThrow();
            const decryptedBlob = await decryptBlob(key, encryptedBlob);

            const url = URL.createObjectURL(decryptedBlob);
            objectUrlRef.current = url;

            const audio = new Audio(url);
            audioRef.current = audio;

            audio.addEventListener("loadedmetadata", () => {
                setDuration(audio.duration);
            });
            audio.addEventListener("ended", () => {
                setIsPlaying(false);
                setCurrentTime(0);
            });

            // Wait for audio to be ready
            await new Promise<void>((resolve, reject) => {
                audio.addEventListener("canplaythrough", () => resolve(), { once: true });
                audio.addEventListener("error", () => reject(new Error("Audio load error")), { once: true });
            });
        } catch (err) {
            console.error("Decryption/load error:", err);
            setError("Nie udało się odszyfrować nagrania");
        } finally {
            setIsLoading(false);
        }
    }, [audioUrl]);

    const togglePlay = useCallback(async () => {
        if (!audioRef.current) {
            await loadAndDecrypt();
        }
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            await audioRef.current.play();
            setIsPlaying(true);
            animFrameRef.current = requestAnimationFrame(updateProgress);
        }
    }, [isPlaying, loadAndDecrypt, updateProgress]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audioRef.current.currentTime = ratio * duration;
        setCurrentTime(audioRef.current.currentTime);
    }, [duration]);

    const formatTime = (s: number) => {
        if (!isFinite(s)) return "00:00";
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60);
        return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (error) {
        return <div className="audio-player-error">🔒 {error}</div>;
    }

    return (
        <div className="audio-player">
            <button
                className={`audio-player-btn ${isPlaying ? "playing" : ""}`}
                onClick={togglePlay}
                disabled={isLoading || !audioUrl}
                title={isPlaying ? "Pauza" : "Odtwórz"}
            >
                {isLoading ? (
                    <span className="audio-player-spinner" />
                ) : isPlaying ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                )}
            </button>

            <span className="audio-player-time">{formatTime(currentTime)}</span>

            <div className="audio-player-track" onClick={handleSeek}>
                <div className="audio-player-progress" style={{ width: `${progress}%` }} />
                <div className="audio-player-thumb" style={{ left: `${progress}%` }} />
            </div>

            <span className="audio-player-time">{formatTime(duration)}</span>
        </div>
    );
}

// ── Main RecordPanel ─────────────────────────────────────────────────

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
    const [isPolishing, setIsPolishing] = useState(false);
    const [audioMode, setAudioMode] = useState<"mic" | "mic+system">("mic+system");

    // Browser-only refs (not used in Tauri mode)
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const transcriptRef = useRef("");
    const processingRef = useRef(false);
    const pendingChunksRef = useRef<Float32Array[]>([]);
    const allSamplesRef = useRef<Float32Array[]>([]);

    // WebSocket live transcription (browser mode only)
    const wsRef = useRef<WebSocket | null>(null);
    const useWebSocket = !isTauri && !!import.meta.env.VITE_WHISPER_WS_URL;

    // WS auth token
    const generateWsToken = useAction(api.wsToken.generateWsToken);

    // Accumulate samples for chunked sending (browser mode only)
    const chunkBufferRef = useRef<Float32Array[]>([]);
    const chunkSampleCountRef = useRef(0);

    const SAMPLE_RATE = 16000;
    const CHUNK_DURATION_SEC = 5;
    const CHUNK_SAMPLE_THRESHOLD = SAMPLE_RATE * CHUNK_DURATION_SEC;

    const createTranscription = useMutation(api.transcriptions.create);
    const generateUploadUrl = useMutation(api.transcriptions.generateUploadUrl);
    const indexTranscription = useAction(api.rag.indexTranscription);
    const transcribeAudio = useAction(api.ai.transcribe);
    const polishText = useAction(api.ai.polishTranscription);
    const summarizeText = useAction(api.ai.summarizeSession);
    const updateSummary = useMutation(api.transcriptions.updateSummary);

    // Fetch recordings for this project (only those with audio)
    const transcriptions = useQuery(api.transcriptions.listByProject, { projectId });
    const recordings = transcriptions?.filter((t) => t.audioStorageId) ?? [];

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

    const processQueue = useCallback(async () => {
        if (processingRef.current) return;
        processingRef.current = true;

        while (pendingChunksRef.current.length > 0) {
            const chunk = pendingChunksRef.current.shift()!;
            await transcribeChunk(chunk);
        }

        processingRef.current = false;
    }, [transcribeChunk]);

    // ── START RECORDING ──────────────────────────────────────────────

    const startRecording = useCallback(async () => {
        transcriptRef.current = "";

        // ── TAURI MODE: Use Rust audio capture (mic + system audio) ──
        if (isTauri) {
            try {
                await tauriInvoke("start_recording");
                setIsRecording(true);
                setSeconds(0);
                setTranscript("");
            } catch (err) {
                console.error("Tauri recording error:", err);
                alert(`Nie udało się uruchomić nagrywania: ${err}`);
            }
            return;
        }

        // ── BROWSER MODE: Use getUserMedia (original logic) ──
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: SAMPLE_RATE,
                    echoCancellation: false,
                    noiseSuppression: false,
                },
            });
            streamRef.current = stream;

            const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);

            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            chunkBufferRef.current = [];
            chunkSampleCountRef.current = 0;
            allSamplesRef.current = [];

            // Connect WebSocket for live transcription
            if (useWebSocket) {
                const wsUrl = import.meta.env.VITE_WHISPER_WS_URL!;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.text && !data.is_final) {
                            transcriptRef.current += (transcriptRef.current ? " " : "") + data.text;
                            setTranscript(transcriptRef.current);
                        }
                    } catch {
                        // ignore
                    }
                };

                ws.onerror = (err) => {
                    console.warn("WebSocket error:", err);
                };

                // Wait for connection, then authenticate with HMAC token
                await new Promise<void>(async (resolve, reject) => {
                    ws.onopen = async () => {
                        try {
                            const token = await generateWsToken();
                            ws.send(JSON.stringify({ auth: token }));
                        } catch (err) {
                            reject(new Error("Failed to get WS auth token"));
                        }
                    };
                    ws.onerror = () => reject(new Error("WebSocket connection failed"));

                    const origOnMessage = ws.onmessage;
                    ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.status === "authenticated") {
                                ws.onmessage = origOnMessage;
                                ws.send(JSON.stringify({ mode: "diarize" }));
                                resolve();
                            } else if (data.error) {
                                reject(new Error(data.error));
                            }
                        } catch {
                            // ignore
                        }
                    };

                    setTimeout(() => reject(new Error("WebSocket auth timeout")), 10000);
                });
            }

            processor.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const copy = new Float32Array(inputData.length);
                copy.set(inputData);

                allSamplesRef.current.push(copy);

                // WebSocket mode: stream PCM directly
                if (useWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
                    const int16 = new Int16Array(copy.length);
                    for (let i = 0; i < copy.length; i++) {
                        const s = Math.max(-1, Math.min(1, copy[i]));
                        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                    }
                    wsRef.current.send(int16.buffer);
                } else {
                    // REST fallback: buffer for chunked sending
                    chunkBufferRef.current.push(copy);
                    chunkSampleCountRef.current += copy.length;

                    if (chunkSampleCountRef.current >= CHUNK_SAMPLE_THRESHOLD) {
                        const merged = mergeFloat32Arrays(chunkBufferRef.current);
                        pendingChunksRef.current.push(merged);
                        chunkBufferRef.current = [];
                        chunkSampleCountRef.current = 0;
                        processQueue();
                    }
                }
            };

            source.connect(processor);
            const silentGain = audioContext.createGain();
            silentGain.gain.value = 0;
            processor.connect(silentGain);
            silentGain.connect(audioContext.destination);

            setIsRecording(true);
            setSeconds(0);
            setTranscript("");
        } catch (err) {
            console.error("Microphone access denied:", err);
            alert("Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia.");
        }
    }, [processQueue, useWebSocket]);

    // ── STOP RECORDING ───────────────────────────────────────────────

    const stopRecording = useCallback(async () => {
        setIsSaving(true);
        setIsRecording(false);

        let wavBase64: string | null = null;
        let wavBlob: Blob | null = null;
        let tauriDiarizedText: string | undefined;
        let tauriSpeakerCount: number | undefined;

        // ── TAURI MODE: Stop Rust recording and get diarized tracks ──
        if (isTauri) {
            try {
                // In mic+system mode, use diarized stop to get separate tracks
                if (audioMode === "mic+system") {
                    interface DiarizedResult {
                        mixed_wav_b64: string;
                        mic_wav_b64: string;
                        system_wav_b64: string | null;
                        has_system_audio: boolean;
                    }
                    const result = await tauriInvoke<DiarizedResult>("stop_recording_diarized");
                    wavBase64 = result.mixed_wav_b64;

                    // Decode mixed WAV for upload
                    const binaryString = atob(result.mixed_wav_b64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    wavBlob = new Blob([bytes], { type: "audio/wav" });

                    // If system audio was captured, transcribe both tracks in parallel
                    if (result.has_system_audio && result.system_wav_b64) {
                        setIsTranscribing(true);
                        setTranscript("⏳ Transkrypcja dwóch ścieżek...");

                        const [micText, systemText] = await Promise.all([
                            transcribeAudio({ audioBase64: result.mic_wav_b64 })
                                .then(t => t?.trim() || "")
                                .catch(() => ""),
                            transcribeAudio({ audioBase64: result.system_wav_b64 })
                                .then(t => t?.trim() || "")
                                .catch(() => ""),
                        ]);

                        setIsTranscribing(false);

                        // Build diarized transcript
                        const parts: string[] = [];
                        if (micText && micText !== "[BLANK_AUDIO]") {
                            parts.push(`[Ty] ${micText}`);
                        }
                        if (systemText && systemText !== "[BLANK_AUDIO]") {
                            parts.push(`[Rozmówca] ${systemText}`);
                        }

                        if (parts.length > 0) {
                            tauriDiarizedText = parts.join("\n\n");
                            tauriSpeakerCount = parts.length;
                            // Use combined as the main transcript
                            const combined = [micText, systemText].filter(Boolean).join(" ");
                            transcriptRef.current = combined;
                            setTranscript(combined);
                        }
                    }
                } else {
                    // Mic-only mode: just get mixed (which is mic only)
                    wavBase64 = await tauriInvoke<string>("stop_recording");
                    const binaryString = atob(wavBase64);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    wavBlob = new Blob([bytes], { type: "audio/wav" });
                }
            } catch (err) {
                console.error("Tauri stop_recording error:", err);
                alert(`Błąd zatrzymywania nagrywania: ${err}`);
                setIsSaving(false);
                return;
            }
        } else {
            // ── BROWSER MODE: Stop audio processing ──
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

            // WebSocket mode: send STOP and get final transcript
            if (useWebSocket && wsRef.current) {
                try {
                    if (wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send("STOP");

                        const finalResponse = await new Promise<{ text: string; diarized_text?: string }>((resolve) => {
                            const ws = wsRef.current!;
                            const handler = (event: MessageEvent) => {
                                try {
                                    const data = JSON.parse(event.data);
                                    if (data.is_final) {
                                        ws.removeEventListener("message", handler);
                                        resolve({ text: data.text || "", diarized_text: data.diarized_text || undefined });
                                    }
                                } catch {
                                    // ignore
                                }
                            };
                            ws.addEventListener("message", handler);
                            setTimeout(() => resolve({ text: transcriptRef.current }), 10000);
                        });

                        if (finalResponse.text) {
                            transcriptRef.current = finalResponse.text;
                            setTranscript(finalResponse.text);
                        }
                        (wsRef as any)._diarizedText = finalResponse.diarized_text;
                    }
                    wsRef.current.close();
                    wsRef.current = null;
                } catch {
                    console.warn("WebSocket STOP failed");
                }
            } else {
                // REST fallback: queue remaining samples
                if (chunkBufferRef.current.length > 0) {
                    const merged = mergeFloat32Arrays(chunkBufferRef.current);
                    pendingChunksRef.current.push(merged);
                    chunkBufferRef.current = [];
                    chunkSampleCountRef.current = 0;
                    processQueue();
                }

                while (pendingChunksRef.current.length > 0 || processingRef.current) {
                    await new Promise((r) => setTimeout(r, 500));
                }
            }

            // Create WAV blob from browser-recorded samples
            if (allSamplesRef.current.length > 0) {
                const allSamples = mergeFloat32Arrays(allSamplesRef.current);
                wavBlob = encodeWavFromFloat32(allSamples, SAMPLE_RATE);
                wavBase64 = await blobToBase64(wavBlob);
            }
        }

        // ── COMMON: Transcribe + Polish + Save ──

        // Transcribe the full audio
        let finalTranscript = transcriptRef.current;
        if (!finalTranscript && wavBase64) {
            try {
                setIsTranscribing(true);
                finalTranscript = await transcribeAudio({ audioBase64: wavBase64 });
                finalTranscript = finalTranscript?.trim() || "";
                setTranscript(finalTranscript);
            } catch {
                console.warn("Full transcription failed");
            } finally {
                setIsTranscribing(false);
            }
        }

        const durationSeconds = seconds;
        let plaintextContent = finalTranscript || "[Transkrypcja niedostępna — serwer AI nie zwrócił tekstu]";
        const plaintextTitle = title || `Nagranie ${new Date().toLocaleDateString("pl-PL")}`;

        // ── Bielik post-processing ──
        if (finalTranscript && finalTranscript.length > 10) {
            try {
                setIsPolishing(true);
                const polished = await polishText({ rawText: finalTranscript });
                if (polished && polished.trim().length > 5) {
                    plaintextContent = polished;
                    setTranscript(polished);
                }
            } catch (err) {
                console.warn("Bielik polishing failed:", err);
            } finally {
                setIsPolishing(false);
            }
        }

        try {
            const key = await getSessionKeyOrThrow();

            // ── Encrypt and upload audio ──
            let audioStorageId: Id<"_storage"> | undefined;
            if (wavBlob) {
                try {
                    const encryptedBlob = await encryptBlob(key, wavBlob);
                    const uploadUrl = await generateUploadUrl();
                    const uploadResponse = await fetch(uploadUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/octet-stream" },
                        body: encryptedBlob,
                    });
                    if (!uploadResponse.ok) throw new Error("Upload failed");
                    const { storageId } = await uploadResponse.json();
                    audioStorageId = storageId;
                } catch (err) {
                    console.warn("Audio upload failed:", err);
                }
            }

            // Get diarized text — from Tauri (dual-track) or browser (WebSocket)
            const diarizedText = tauriDiarizedText || (wsRef as any)?._diarizedText as string | undefined;
            const speakerCountFromText = tauriSpeakerCount || (
                diarizedText
                    ? new Set(diarizedText.match(/\[(?:Ty|Rozmówca|Mówca \d+)\]/g) || []).size
                    : undefined
            );

            // ── Encrypt text fields ──
            const encryptedContent = await encryptString(key, plaintextContent);
            const encryptedTitle = await encryptString(key, plaintextTitle);
            const encryptedDiarized = diarizedText ? await encryptString(key, diarizedText) : undefined;

            const transcriptionId = await createTranscription({
                projectId,
                title: encryptedTitle,
                content: encryptedContent,
                contentWithSpeakers: encryptedDiarized,
                speakerCount: speakerCountFromText,
                audioStorageId,
                durationSeconds,
            });

            indexTranscription({ transcriptionId, plaintextContent }).catch((err: unknown) =>
                console.warn("RAG indexing skipped:", err)
            );

            // ── Async summary ──
            (async () => {
                try {
                    const summaryText = await summarizeText({
                        content: plaintextContent,
                        title: plaintextTitle,
                    });
                    if (summaryText && summaryText.trim()) {
                        const key = await getSessionKeyOrThrow();
                        const encryptedSummary = await encryptString(key, summaryText);
                        await updateSummary({
                            transcriptionId,
                            summary: encryptedSummary,
                        });
                    }
                } catch (err) {
                    console.warn("Summary generation failed:", err);
                }
            })();

            setTranscript("");
            setTitle("");
            onRecordingComplete();
        } catch (err) {
            console.error("Failed to save:", err);
            alert("Błąd zapisu transkrypcji.");
        } finally {
            setIsSaving(false);
        }
    }, [seconds, title, projectId, createTranscription, generateUploadUrl, indexTranscription, transcribeAudio, polishText, summarizeText, updateSummary, onRecordingComplete, processQueue]);



    return (
        <div className="record-panel">
            {isRecording ? (
                <>
                    <div className="record-status">
                        <span className="record-dot" />
                        Nagrywanie...
                        {isTauri && audioMode === "mic+system" && (
                            <span style={{ marginLeft: 8, fontSize: "var(--text-xs)", color: "var(--accent)" }}>
                                🖥️ + 🎤
                            </span>
                        )}
                    </div>
                    <div className="record-timer">{formatTime(seconds)}</div>
                </>
            ) : (
                <div className="record-status" style={{ color: "var(--text-muted)" }}>
                    {isSaving
                        ? isTranscribing
                            ? "⏳ Transkrypcja..."
                            : isPolishing
                                ? "✨ Polerowanie tekstu..."
                                : "💾 Zapisywanie..."
                        : "Gotowy do nagrywania"}
                </div>
            )}

            {/* Audio mode selector — only in Tauri mode, before recording */}
            {isTauri && !isRecording && !isSaving && (
                <div style={{
                    display: "flex",
                    gap: "var(--space-2)",
                    justifyContent: "center",
                    marginBottom: "var(--space-2)",
                }}>
                    <button
                        onClick={() => setAudioMode("mic")}
                        style={{
                            padding: "var(--space-2) var(--space-4)",
                            borderRadius: "var(--radius-lg)",
                            border: audioMode === "mic" ? "2px solid var(--accent)" : "1px solid var(--border)",
                            background: audioMode === "mic" ? "rgba(124, 92, 252, 0.15)" : "var(--bg-surface)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            fontSize: "var(--text-sm)",
                            fontWeight: audioMode === "mic" ? 600 : 400,
                            transition: "all 0.2s",
                        }}
                    >
                        🎤 Mikrofon
                    </button>
                    <button
                        onClick={() => setAudioMode("mic+system")}
                        style={{
                            padding: "var(--space-2) var(--space-4)",
                            borderRadius: "var(--radius-lg)",
                            border: audioMode === "mic+system" ? "2px solid var(--accent)" : "1px solid var(--border)",
                            background: audioMode === "mic+system" ? "rgba(124, 92, 252, 0.15)" : "var(--bg-surface)",
                            color: "var(--text-primary)",
                            cursor: "pointer",
                            fontSize: "var(--text-sm)",
                            fontWeight: audioMode === "mic+system" ? 600 : 400,
                            transition: "all 0.2s",
                        }}
                    >
                        🖥️ Mikrofon + System Audio
                    </button>
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
                                : isPolishing
                                    ? "✨ Polerowanie tekstu..."
                                    : isTauri
                                        ? "🎙️ Nagrywanie mikrofon + system audio... Transkrypcja po zakończeniu."
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
                            <path d="M50 85 Q45 60 50 45" stroke="#7c5cfc" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                            <path d="M50 65 Q40 55 35 45" stroke="#7c5cfc" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                            <path d="M50 70 Q60 60 65 50" stroke="#7c5cfc" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                            <path d="M50 80 Q35 70 30 55 Q45 60 50 80" fill="#4B0082" opacity="0.7" />
                            <path d="M50 80 Q65 70 70 55 Q55 60 50 80" fill="#4B0082" opacity="0.7" />
                            <circle cx="40" cy="50" r="6" fill="#a78bfa" className="lilac-petal" style={{ animationDelay: '0s' }} />
                            <circle cx="50" cy="52" r="7" fill="#c4b5fd" className="lilac-petal" style={{ animationDelay: '0.5s' }} />
                            <circle cx="60" cy="50" r="6" fill="#8b5cf6" className="lilac-petal" style={{ animationDelay: '1s' }} />
                            <circle cx="43" cy="40" r="6.5" fill="#c4b5fd" className="lilac-petal" style={{ animationDelay: '0.2s' }} />
                            <circle cx="57" cy="40" r="6.5" fill="#a78bfa" className="lilac-petal" style={{ animationDelay: '0.7s' }} />
                            <circle cx="50" cy="42" r="8" fill="#ddd6fe" className="lilac-petal" style={{ animationDelay: '1.2s' }} />
                            <circle cx="46" cy="30" r="5.5" fill="#8b5cf6" className="lilac-petal" style={{ animationDelay: '0.4s' }} />
                            <circle cx="54" cy="30" r="5.5" fill="#c4b5fd" className="lilac-petal" style={{ animationDelay: '0.9s' }} />
                            <circle cx="50" cy="22" r="5" fill="#ddd6fe" className="lilac-petal" style={{ animationDelay: '1.4s' }} />
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
                    {isTauri
                        ? "🖥️ Audio przechwytywane przez Rust (mikrofon + system audio)"
                        : "💡 Audio wysyłane co 5s do transkrypcji (format WAV)"}
                </p>
            )}

            {/* ── Recording History ─── */}
            {!isRecording && !isSaving && recordings.length > 0 && (
                <div className="recordings-history">
                    <h3 className="recordings-history-title">🎧 Nagrane rozmowy</h3>
                    {recordings.map((rec) => (
                        <div key={rec._id} className="recording-item">
                            <div className="recording-item-header">
                                <span className="recording-item-title">
                                    {rec.title || "Nagranie"}
                                </span>
                                <span className="recording-item-meta">
                                    {new Date(rec._creationTime).toLocaleDateString("pl-PL", {
                                        day: "numeric", month: "short", year: "numeric",
                                        hour: "2-digit", minute: "2-digit"
                                    })}
                                    {rec.durationSeconds ? ` · ${formatTime(rec.durationSeconds)}` : ""}
                                </span>
                            </div>
                            {rec.audioStorageId && (
                                <AudioPlayer audioStorageId={rec.audioStorageId} />
                            )}
                        </div>
                    ))}
                </div>
            )}


        </div>
    );
}
