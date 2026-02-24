"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import TranscriptionView from "./TranscriptionView";
import { getSessionKeyOrThrow, encryptBlob, encryptString, decryptString } from "../crypto";

interface TranscriptionListProps {
    projectId: Id<"projects">;
    onStartChat?: (transcriptionId: Id<"transcriptions">) => void;
    onOpenExistingChat?: (conversationId: Id<"conversations">) => void;
}

// ── WAV encoder ──
function encodeWavFromFloat32(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); w(36, "data");
    view.setUint32(40, samples.length * 2, true);
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }
    return new Blob([buffer], { type: "audio/wav" });
}

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

/* ─── Dropdown sub-component ─── */
function TranscriptionChatDropdown({
    transcriptionId,
    onNewChat,
    onOpenChat,
    onClose,
}: {
    transcriptionId: Id<"transcriptions">;
    onNewChat: () => void;
    onOpenChat: (id: Id<"conversations">) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const conversations = useQuery(api.conversations.listByTranscription, {
        transcriptionId,
    });

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    return (
        <div ref={ref} className="transcription-chat-dropdown">
            <div
                className="transcription-chat-dropdown-item new-chat"
                onClick={(e) => {
                    e.stopPropagation();
                    onNewChat();
                }}
            >
                ➕ Rozpocznij nowy czat
            </div>
            {conversations && conversations.length > 0 && (
                <>
                    <div style={{ borderTop: "1px solid var(--border)" }} />
                    {conversations.map((conv) => (
                        <div
                            key={conv._id}
                            className="transcription-chat-dropdown-item"
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenChat(conv._id);
                            }}
                        >
                            📎 {conv.title || "Nowa rozmowa"}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

/* ─── Main list component ─── */
export default function TranscriptionList({
    projectId,
    onStartChat,
    onOpenExistingChat,
}: TranscriptionListProps) {
    const [viewingId, setViewingId] = useState<Id<"transcriptions"> | null>(null);
    const [dropdownId, setDropdownId] = useState<Id<"transcriptions"> | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const transcriptions = useQuery(api.transcriptions.listByProject, { projectId });

    const createTranscription = useMutation(api.transcriptions.create);
    const generateUploadUrl = useMutation(api.transcriptions.generateUploadUrl);
    const indexTranscription = useAction(api.rag.indexTranscription);
    const transcribeWithDiarization = useAction(api.ai.transcribeWithDiarization);

    const SAMPLE_RATE = 16000;

    const toggleDropdown = useCallback(
        (id: Id<"transcriptions">) => {
            setDropdownId((prev) => (prev === id ? null : id));
        },
        []
    );

    // ── File upload handler ──
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";

        setIsUploading(true);
        setUploadProgress("Dekodowanie audio...");

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            await audioCtx.close();

            const rawSamples = audioBuffer.getChannelData(0);
            const samples = new Float32Array(rawSamples.length);
            samples.set(rawSamples);
            const durationSeconds = Math.round(audioBuffer.duration);

            setUploadProgress("Transkrypcja z rozpoznawaniem mówców...");
            const wavBlob = encodeWavFromFloat32(samples, SAMPLE_RATE);
            const base64 = await blobToBase64(wavBlob);
            const diarResult = await transcribeWithDiarization({ audioBase64: base64 });
            const plaintextContent = diarResult.text?.trim() || "[Transkrypcja niedostępna]";

            setUploadProgress("Szyfrowanie i zapis...");
            const key = await getSessionKeyOrThrow();

            let audioStorageId: Id<"_storage"> | undefined;
            try {
                const encryptedBlob = await encryptBlob(key, wavBlob);
                const uploadUrl = await generateUploadUrl();
                const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: encryptedBlob,
                });
                if (uploadResponse.ok) {
                    const { storageId } = await uploadResponse.json();
                    audioStorageId = storageId;
                }
            } catch (err) {
                console.warn("Audio upload failed:", err);
            }

            const plaintextTitle = file.name.replace(/\.[^.]+$/, "") || `Nagranie ${new Date().toLocaleDateString("pl-PL")}`;

            // E2EE: encrypt text fields
            const encryptedContent = await encryptString(key, plaintextContent);
            const encryptedTitle = await encryptString(key, plaintextTitle);
            const encryptedDiarized = diarResult.contentWithSpeakers
                ? await encryptString(key, diarResult.contentWithSpeakers)
                : undefined;

            const transcriptionId = await createTranscription({
                projectId,
                title: encryptedTitle,
                content: encryptedContent,
                contentWithSpeakers: encryptedDiarized,
                speakerCount: diarResult.speakerCount,
                audioStorageId,
                durationSeconds,
            });

            // Pass plaintext to RAG indexer
            indexTranscription({ transcriptionId, plaintextContent }).catch((err: unknown) =>
                console.warn("RAG indexing skipped:", err)
            );
        } catch (err) {
            console.error("File upload error:", err);
            alert("Błąd przetwarzania pliku audio. Sprawdź format (WAV, MP3, M4A).");
        } finally {
            setIsUploading(false);
            setUploadProgress("");
        }
    }, [projectId, createTranscription, generateUploadUrl, indexTranscription, transcribeWithDiarization]);

    // ── Decrypt transcription titles and content for display ──
    const [decryptedMap, setDecryptedMap] = useState<Record<string, { title: string; content: string }>>({});

    useEffect(() => {
        if (!transcriptions || transcriptions.length === 0) return;
        let cancelled = false;

        (async () => {
            try {
                const key = await getSessionKeyOrThrow();
                const newMap: Record<string, { title: string; content: string }> = {};

                for (const t of transcriptions) {
                    let title = t.title || "Nagranie bez tytułu";
                    let content = t.content;

                    // Try to decrypt (legacy data will fail and fall through)
                    try {
                        title = await decryptString(key, t.title || "");
                    } catch {
                        // Legacy plaintext — use as-is
                    }
                    try {
                        content = await decryptString(key, t.content);
                    } catch {
                        // Legacy plaintext
                    }

                    newMap[t._id] = { title, content };
                }

                if (!cancelled) setDecryptedMap(newMap);
            } catch {
                // No encryption key — show encrypted text as-is
            }
        })();

        return () => { cancelled = true; };
    }, [transcriptions]);

    if (!transcriptions) {
        return (
            <div className="empty-state">
                <p>Ładowanie...</p>
            </div>
        );
    }

    if (viewingId) {
        const viewing = transcriptions.find((t) => t._id === viewingId);
        if (viewing) {
            return <TranscriptionView transcription={viewing} onClose={() => setViewingId(null)} />;
        }
    }

    if (transcriptions.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">🎙️</div>
                <h2>Brak nagrań</h2>
                <p>Przejdź do zakładki „Nagrywaj" aby nagrać pierwszą rozmowę.</p>
                <div style={{ marginTop: "var(--space-4)" }}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="btn btn-outline"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            color: "var(--accent)",
                            borderColor: "rgba(124, 92, 252, 0.3)",
                        }}
                    >
                        {isUploading ? `⏳ ${uploadProgress}` : "📎 Wgraj nagranie"}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="transcription-list">
            {/* Upload button at top */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-3)" }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn btn-outline"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        color: "var(--accent)",
                        borderColor: "rgba(124, 92, 252, 0.3)",
                        background: "transparent",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    {isUploading ? `⏳ ${uploadProgress}` : "📎 Wgraj nagranie"}
                </button>
            </div>

            {transcriptions.map((t) => {
                const date = new Date(t._creationTime);
                const dateStr = date.toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                });
                const timeStr = date.toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                });
                const duration = t.durationSeconds
                    ? `${Math.floor(t.durationSeconds / 60)}:${String(Math.floor(t.durationSeconds % 60)).padStart(2, "0")}`
                    : null;

                return (
                    <div
                        key={t._id}
                        className="transcription-card"
                        style={dropdownId === t._id ? { zIndex: 10, position: 'relative' } : undefined}
                    >
                        <div
                            className="transcription-card-clickable"
                            onClick={() => setViewingId(t._id)}
                        >
                            <div className="transcription-card-header">
                                <span className="transcription-card-title" style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {decryptedMap[t._id]?.title || t.title || "Nagranie bez tytułu"}
                                </span>
                                {t.blockchainVerified && (
                                    <span className="transcription-card-badge">✅ Zabezpieczone</span>
                                )}
                            </div>
                            <div className="transcription-card-meta" style={{ display: 'flex', gap: 'var(--space-4)', color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    {dateStr}, {timeStr}
                                </span>
                                {duration && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                        {duration}
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    {t.content.split(/\s+/).length} słów
                                </span>
                            </div>
                            <div className="transcription-card-preview" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.6
                            }}>
                                {decryptedMap[t._id]?.content || t.content}
                            </div>
                        </div>
                        {(onStartChat || onOpenExistingChat) && (
                            <div className="transcription-card-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                                <div className="transcription-chat-dropdown-wrapper">
                                    <button
                                        className="btn btn-outline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDropdown(t._id);
                                        }}
                                        title="Czaty o tej transkrypcji"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                            color: 'var(--accent)',
                                            borderColor: 'rgba(124, 92, 252, 0.3)',
                                            background: 'transparent'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(124, 92, 252, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                        Czat o transkrypcji
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px' }}>
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </button>
                                    {dropdownId === t._id && (
                                        <TranscriptionChatDropdown
                                            transcriptionId={t._id}
                                            onNewChat={() => {
                                                setDropdownId(null);
                                                onStartChat?.(t._id);
                                            }}
                                            onOpenChat={(convId) => {
                                                setDropdownId(null);
                                                onOpenExistingChat?.(convId);
                                            }}
                                            onClose={() => setDropdownId(null)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
