"use client";

import React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getSessionKeyOrThrow, encryptString, decryptString } from "../crypto";

interface NotesPanelProps {
    projectId: Id<"projects">;
}

export default function NotesPanel({ projectId }: NotesPanelProps) {
    const [activeNoteId, setActiveNoteId] = useState<Id<"notes"> | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openDropdownId, setOpenDropdownId] = useState<Id<"notes"> | null>(null);
    const [noteToRename, setNoteToRename] = useState<{ _id: Id<"notes">; title: string } | null>(null);
    const [renameValue, setRenameValue] = useState("");

    // Decrypted content cache
    const [decryptedContent, setDecryptedContent] = useState<string>("");
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [decryptError, setDecryptError] = useState<string | null>(null);

    // Voice note recording
    const [isVoiceRecording, setIsVoiceRecording] = useState(false);
    const [isVoiceTranscribing, setIsVoiceTranscribing] = useState(false);
    const voiceStreamRef = useRef<MediaStream | null>(null);
    const voiceContextRef = useRef<AudioContext | null>(null);
    const voiceProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const voiceSamplesRef = useRef<Float32Array[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioFileInputRef = useRef<HTMLInputElement>(null);
    const ocrFileInputRef = useRef<HTMLInputElement>(null);
    const [isAudioImporting, setIsAudioImporting] = useState(false);
    const [audioImportProgress, setAudioImportProgress] = useState("");
    const [isScanning, setIsScanning] = useState(false);

    // Queries
    const notes = useQuery(api.notes.listByProject, { projectId });
    const activeNote = useQuery(
        api.notes.get,
        activeNoteId ? { noteId: activeNoteId } : "skip"
    );

    // Mutations
    const createNote = useMutation(api.notes.create);
    const updateNote = useMutation(api.notes.update);
    const removeNote = useMutation(api.notes.remove);
    const transcribeFast = useAction(api.ai.transcribeFast);
    const ocrHandwriting = useAction(api.ai.ocrHandwriting);

    // E2EE: Decrypt note titles for sidebar display
    const [decryptedTitles, setDecryptedTitles] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!notes || notes.length === 0) return;
        let cancelled = false;

        (async () => {
            try {
                const key = await getSessionKeyOrThrow();
                const newMap: Record<string, string> = {};

                for (const note of notes) {
                    try {
                        newMap[note._id] = await decryptString(key, note.title);
                    } catch {
                        newMap[note._id] = note.title;
                    }
                }

                if (!cancelled) setDecryptedTitles(newMap);
            } catch {
                // No key
            }
        })();

        return () => { cancelled = true; };
    }, [notes]);

    // ── Decrypt active note content ──
    useEffect(() => {
        if (!activeNote) {
            setDecryptedContent("");
            return;
        }

        // Empty content — no need to decrypt
        if (!activeNote.content) {
            setDecryptedContent("");
            return;
        }

        let cancelled = false;
        setIsDecrypting(true);
        setDecryptError(null);

        (async () => {
            try {
                const key = await getSessionKeyOrThrow();
                const plaintext = await decryptString(key, activeNote.content);
                if (!cancelled) {
                    setDecryptedContent(plaintext);
                    // Also decrypt title for editing
                    try {
                        const decTitle = await decryptString(key, activeNote.title);
                        setEditTitle(decTitle);
                    } catch {
                        setEditTitle(activeNote.title);
                    }
                }
            } catch {
                // Content might be unencrypted (legacy) — show as-is
                if (!cancelled) {
                    setDecryptedContent(activeNote.content);
                    setEditTitle(activeNote.title);
                    setDecryptError(null);
                }
            } finally {
                if (!cancelled) setIsDecrypting(false);
            }
        })();

        return () => { cancelled = true; };
    }, [activeNote]);

    // ── Create ──
    const handleCreate = useCallback(async () => {
        if (!newTitle.trim()) return;

        const key = await getSessionKeyOrThrow();
        const encryptedContent = await encryptString(key, "");
        const encryptedTitle = await encryptString(key, newTitle.trim());

        const id = await createNote({
            projectId,
            title: encryptedTitle,
            content: encryptedContent,
            format: "md",
        });
        setActiveNoteId(id);
        setIsCreating(false);
        setNewTitle("");
        setIsEditing(true);
        setEditTitle(newTitle.trim());
        setEditContent("");
    }, [projectId, newTitle, createNote]);

    // ── Edit ──
    const handleStartEdit = useCallback(() => {
        if (!activeNote) return;
        setEditTitle(activeNote.title);
        setEditContent(decryptedContent);
        setIsEditing(true);
    }, [activeNote, decryptedContent]);

    const handleSave = useCallback(async () => {
        if (!activeNoteId) return;

        // Encrypt content and title before saving
        const key = await getSessionKeyOrThrow();
        const encryptedContent = await encryptString(key, editContent);
        const encryptedTitle = await encryptString(key, editTitle.trim() || "Bez tytułu");

        await updateNote({
            noteId: activeNoteId,
            title: encryptedTitle,
            content: encryptedContent,
        });
        setIsEditing(false);
    }, [activeNoteId, editTitle, editContent, updateNote]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
    }, []);

    // ── Delete ──
    const handleDelete = useCallback(async () => {
        if (!activeNoteId) return;
        if (!confirm("Czy na pewno chcesz usunąć tę notatkę?")) return;
        await removeNote({ noteId: activeNoteId });
        setActiveNoteId(null);
        setIsEditing(false);
    }, [activeNoteId, removeNote]);

    // ── Import ──
    const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.split(".").pop()?.toLowerCase();
        let content = "";
        let format: "md" | "txt" = "txt";
        const title = file.name.replace(/\.(txt|md|docx?)$/, "");

        if (ext === "docx") {
            try {
                const mammoth = await import("mammoth");
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.default.extractRawText({ arrayBuffer });
                content = result.value;
            } catch (err) {
                console.error("DOCX import error:", err);
                alert("Błąd importu pliku DOCX.");
                return;
            }
        } else {
            content = await file.text();
            if (ext === "md") format = "md";
        }

        // Encrypt content and title before saving
        const key = await getSessionKeyOrThrow();
        const encryptedContent = await encryptString(key, content);
        const encryptedTitle = await encryptString(key, title);

        const id = await createNote({
            projectId,
            title: encryptedTitle,
            content: encryptedContent,
            format,
        });
        setActiveNoteId(id);
        setIsEditing(false);

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [projectId, createNote]);

    // ── Export (uses decrypted content) ──
    const handleExport = useCallback(async (exportFormat: "txt" | "md" | "docx") => {
        if (!activeNote) return;
        setShowExportMenu(false);

        const fileName = `${activeNote.title || "notatka"}`;
        const content = decryptedContent; // Already decrypted

        if (exportFormat === "txt" || exportFormat === "md") {
            const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${fileName}.${exportFormat}`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (exportFormat === "docx") {
            try {
                const { Document, Packer, Paragraph, TextRun } = await import("docx");
                const { saveAs } = await import("file-saver");

                const paragraphs = content.split("\n").map(
                    (line: string) => new Paragraph({
                        children: [new TextRun(line)],
                    })
                );

                const doc = new Document({
                    sections: [{ children: paragraphs }],
                });

                const blob = await Packer.toBlob(doc);
                saveAs(blob, `${fileName}.docx`);
            } catch (err) {
                console.error("DOCX export error:", err);
                alert("Błąd eksportu do DOCX.");
            }
        }
    }, [activeNote, decryptedContent]);

    // ── Voice note helpers ──
    const VOICE_SAMPLE_RATE = 16000;

    const encodeWavFromFloat32 = (samples: Float32Array, sampleRate: number): Blob => {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeString(0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, "WAVE");
        writeString(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, "data");
        view.setUint32(40, samples.length * 2, true);
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }
        return new Blob([buffer], { type: "audio/wav" });
    };

    const blobToBase64 = (blob: Blob): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

    const startVoiceRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: VOICE_SAMPLE_RATE, echoCancellation: true, noiseSuppression: true },
            });
            voiceStreamRef.current = stream;
            const ctx = new AudioContext({ sampleRate: VOICE_SAMPLE_RATE });
            voiceContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            voiceProcessorRef.current = processor;
            voiceSamplesRef.current = [];

            processor.onaudioprocess = (e) => {
                const data = e.inputBuffer.getChannelData(0);
                const copy = new Float32Array(data.length);
                copy.set(data);
                voiceSamplesRef.current.push(copy);
            };
            source.connect(processor);
            processor.connect(ctx.destination);
            setIsVoiceRecording(true);
        } catch (err) {
            console.error("Mic access denied:", err);
            alert("Nie udało się uzyskać dostępu do mikrofonu.");
        }
    }, []);

    const stopVoiceRecording = useCallback(async () => {
        setIsVoiceRecording(false);
        setIsVoiceTranscribing(true);

        // Stop audio
        voiceProcessorRef.current?.disconnect();
        voiceStreamRef.current?.getTracks().forEach((t) => t.stop());
        voiceContextRef.current?.close();

        try {
            const chunks = voiceSamplesRef.current;
            if (chunks.length === 0) { setIsVoiceTranscribing(false); return; }
            const totalLen = chunks.reduce((s, c) => s + c.length, 0);
            const merged = new Float32Array(totalLen);
            let off = 0;
            for (const c of chunks) { merged.set(c, off); off += c.length; }

            const wavBlob = encodeWavFromFloat32(merged, VOICE_SAMPLE_RATE);
            const base64 = await blobToBase64(wavBlob);
            const text = await transcribeFast({ audioBase64: base64 });
            const trimmed = text?.trim();

            if (trimmed && trimmed !== "[BLANK_AUDIO]" && trimmed.length > 1) {
                setEditContent((prev) => prev ? prev + "\n\n" + trimmed : trimmed);
            }
        } catch (err) {
            console.warn("Voice transcription error:", err);
        } finally {
            voiceSamplesRef.current = [];
            setIsVoiceTranscribing(false);
        }
    }, [transcribeFast]);

    // ── Audio file import (for notes) ──
    const AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "mp4", "ogg", "webm", "flac", "aac"];
    const VOICE_IMPORT_SAMPLE_RATE = 16000;

    const handleAudioImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";

        setIsAudioImporting(true);
        setAudioImportProgress("Dekodowanie audio...");

        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioCtx = new AudioContext({ sampleRate: VOICE_IMPORT_SAMPLE_RATE });
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            await audioCtx.close();

            const rawSamples = audioBuffer.getChannelData(0);
            const samples = new Float32Array(rawSamples.length);
            samples.set(rawSamples);

            setAudioImportProgress("Transkrypcja...");
            const wavBlob = encodeWavFromFloat32(samples, VOICE_IMPORT_SAMPLE_RATE);
            const base64 = await blobToBase64(wavBlob);
            const text = await transcribeFast({ audioBase64: base64 });
            const trimmed = text?.trim();

            if (trimmed && trimmed !== "[BLANK_AUDIO]" && trimmed.length > 1) {
                setEditContent((prev) => prev ? prev + "\n\n" + trimmed : trimmed);
            }
        } catch (err) {
            console.error("Audio import error:", err);
            alert("Błąd importu pliku audio. Sprawdź format (WAV, MP3, M4A).");
        } finally {
            setIsAudioImporting(false);
            setAudioImportProgress("");
        }
    }, [transcribeFast]);

    // ── OCR Scan Handler ──
    const handleScanNote = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";

        setIsScanning(true);

        try {
            // Read image as base64
            const arrayBuffer = await file.arrayBuffer();

            // Resize if too large (max 1024px) for faster upload
            const blob = new Blob([arrayBuffer], { type: file.type });
            const imageBitmap = await createImageBitmap(blob);
            const maxDim = 1024;
            let w = imageBitmap.width;
            let h = imageBitmap.height;
            if (w > maxDim || h > maxDim) {
                const scale = maxDim / Math.max(w, h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
            }
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(imageBitmap, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/png", 0.9);
            const base64 = dataUrl.split(",")[1];

            // Run OCR
            const text = await ocrHandwriting({ imageBase64: base64 });
            const trimmed = text?.trim();

            if (!trimmed) {
                alert("Nie udało się rozpoznać tekstu na zdjęciu. Spróbuj ponownie z lepszym oświetleniem.");
                return;
            }

            // Create new note with scanned content
            const key = await getSessionKeyOrThrow();
            const title = `Skan ${new Date().toLocaleDateString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`;
            const encryptedContent = await encryptString(key, trimmed);
            const encryptedTitle = await encryptString(key, title);

            const id = await createNote({
                projectId,
                title: encryptedTitle,
                content: encryptedContent,
                format: "md" as const,
            });
            setActiveNoteId(id);
            setIsEditing(false);
        } catch (err) {
            console.error("OCR scan error:", err);
            alert("Błąd skanowania. Sprawdź połączenie i spróbuj ponownie.");
        } finally {
            setIsScanning(false);
        }
    }, [ocrHandwriting, projectId, createNote]);

    // ── Simple markdown renderer ──
    const renderMarkdown = (text: string): React.ReactNode[] => {
        const lines = text.split("\n");
        const elements: React.ReactNode[] = [];

        let inCodeBlock = false;
        let codeLines: string[] = [];

        lines.forEach((line, i) => {
            if (line.startsWith("```")) {
                if (inCodeBlock) {
                    elements.push(
                        <pre key={`code-${i}`} className="note-code-block">
                            <code>{codeLines.join("\n")}</code>
                        </pre>
                    );
                    codeLines = [];
                }
                inCodeBlock = !inCodeBlock;
                return;
            }

            if (inCodeBlock) {
                codeLines.push(line);
                return;
            }

            if (line.startsWith("### ")) {
                elements.push(<h3 key={i} className="note-h3">{line.slice(4)}</h3>);
            } else if (line.startsWith("## ")) {
                elements.push(<h2 key={i} className="note-h2">{line.slice(3)}</h2>);
            } else if (line.startsWith("# ")) {
                elements.push(<h1 key={i} className="note-h1">{line.slice(2)}</h1>);
            } else if (line.startsWith("- ") || line.startsWith("* ")) {
                elements.push(
                    <div key={i} className="note-list-item">• {formatInline(line.slice(2))}</div>
                );
            } else if (line.trim() === "") {
                elements.push(<div key={i} className="note-spacer" />);
            } else {
                elements.push(<p key={i} className="note-paragraph">{formatInline(line)}</p>);
            }
        });

        return elements;
    };

    const formatInline = (text: string): React.ReactNode => {
        const parts: React.ReactNode[] = [];
        let remaining = text;
        let keyIdx = 0;

        while (remaining.length > 0) {
            const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
            const italicMatch = remaining.match(/\*(.+?)\*/);
            const codeMatch = remaining.match(/`(.+?)`/);

            const matches = [
                boldMatch ? { type: "bold", index: boldMatch.index!, length: boldMatch[0].length, content: boldMatch[1] } : null,
                italicMatch && (!boldMatch || italicMatch.index! < boldMatch.index!) ? { type: "italic", index: italicMatch.index!, length: italicMatch[0].length, content: italicMatch[1] } : null,
                codeMatch ? { type: "code", index: codeMatch.index!, length: codeMatch[0].length, content: codeMatch[1] } : null,
            ].filter(Boolean).sort((a, b) => a!.index - b!.index);

            if (matches.length === 0) {
                parts.push(remaining);
                break;
            }

            const match = matches[0]!;
            if (match.index > 0) {
                parts.push(remaining.slice(0, match.index));
            }

            if (match.type === "bold") {
                parts.push(<strong key={keyIdx++}>{match.content}</strong>);
            } else if (match.type === "italic") {
                parts.push(<em key={keyIdx++}>{match.content}</em>);
            } else if (match.type === "code") {
                parts.push(<code key={keyIdx++} className="note-inline-code">{match.content}</code>);
            }

            remaining = remaining.slice(match.index + match.length);
        }

        return <>{parts}</>;
    };

    return (
        <div className="notes-layout">
            {/* Notes Sidebar */}
            <div className={`notes-sidebar ${isSidebarOpen ? "" : "notes-sidebar-collapsed"}`}>
                <div className="chat-sidebar-header">
                    <h3>Notatki</h3>
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setIsSidebarOpen(false)}
                        title="Zwiń panel notatek"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </button>
                </div>

                <div style={{ padding: 'var(--space-2)' }}>
                    <button
                        onClick={() => setIsCreating(true)}
                        title="Nowa notatka"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-surface-hover)';
                            e.currentTarget.style.borderColor = 'rgba(124, 92, 252, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-surface)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <div className="sidebar-add-btn" style={{ width: 28, height: 28 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                        <span style={{ fontWeight: 500 }}>Nowa notatka</span>
                    </button>
                </div>

                <div style={{ padding: '0 var(--space-2)' }}>
                    <button
                        onClick={() => ocrFileInputRef.current?.click()}
                        disabled={isScanning}
                        title="Skanuj notatkę ze zdjęcia"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-2) var(--space-3)',
                            borderRadius: 'var(--radius-lg)',
                            background: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s',
                            cursor: isScanning ? 'wait' : 'pointer',
                            fontSize: 'var(--text-sm)',
                            opacity: isScanning ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isScanning) {
                                e.currentTarget.style.background = 'var(--bg-surface-hover)';
                                e.currentTarget.style.borderColor = 'rgba(124, 92, 252, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        {isScanning ? "⏳ Skanowanie..." : "📷 Skanuj notatkę"}
                    </button>
                </div>

                {isCreating && (
                    <div className="notes-create-form">
                        <input
                            type="text"
                            className="notes-create-input"
                            placeholder="Tytuł notatki..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                                if (e.key === "Escape") { setIsCreating(false); setNewTitle(""); }
                            }}
                            autoFocus
                        />
                        <div className="notes-create-actions">
                            <button className="key-dialog-action" onClick={handleCreate} disabled={!newTitle.trim()}>
                                Utwórz
                            </button>
                            <button
                                className="key-management-btn"
                                onClick={() => { setIsCreating(false); setNewTitle(""); }}
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                )}

                <div className="chat-sidebar-list">
                    {(!notes || notes.length === 0) && !isCreating && (
                        <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "var(--text-xs)", textAlign: "center" }}>
                            Brak notatek. Utwórz nową lub importuj plik.
                        </div>
                    )}
                    {notes?.map((note) => (
                        <div
                            key={note._id}
                            className={`chat-sidebar-item ${note._id === activeNoteId ? "active" : ""}`}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
                            onClick={() => {
                                setActiveNoteId(note._id);
                                setIsEditing(false);
                            }}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {decryptedTitles[note._id] || note.title}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === note._id ? null : note._id);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 'var(--radius-sm)',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </button>

                            {openDropdownId === note._id && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
                                    />
                                    <div className="mention-dropdown" style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '30px',
                                        width: '180px',
                                        zIndex: 50,
                                        left: 'auto',
                                        bottom: 'auto',
                                    }}>
                                        <div
                                            className="mention-option"
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const title = decryptedTitles[note._id] || note.title;
                                                setNoteToRename({ _id: note._id, title });
                                                setRenameValue(title);
                                                setOpenDropdownId(null);
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            Zmień temat
                                        </div>
                                        <div
                                            className="mention-option"
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#ef4444' }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                if (!confirm("Czy na pewno chcesz usunąć tę notatkę?")) return;
                                                await removeNote({ noteId: note._id });
                                                if (activeNoteId === note._id) {
                                                    setActiveNoteId(null);
                                                    setIsEditing(false);
                                                }
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            Usuń
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar toggle when collapsed */}
            {!isSidebarOpen && (
                <div style={{ display: 'flex', alignItems: 'flex-start', padding: 'var(--space-2)' }}>
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Rozwiń panel notatek"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </button>
                </div>
            )}

            {/* Main area */}
            <div className="notes-main">
                {/* Hidden file inputs for import */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.docx"
                    onChange={handleImport}
                    style={{ display: "none" }}
                />
                <input
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.wav,.m4a,.mp4,.ogg,.webm,.flac,.aac"
                    onChange={handleAudioImport}
                    style={{ display: "none" }}
                />
                <input
                    ref={ocrFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleScanNote}
                    style={{ display: "none" }}
                />
                {isScanning && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 'var(--space-3)',
                        zIndex: 100,
                        borderRadius: 'var(--radius-lg)',
                        backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{ fontSize: '2rem' }}>📷</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Rozpoznawanie pisma...</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>GOT-OCR 2.0 + korekta Bielik</div>
                        <div className="loading-spinner" style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    </div>
                )}
                {activeNote ? (
                    <>
                        {/* Toolbar */}
                        <div className="notes-toolbar">
                            {isEditing ? (
                                <>
                                    <input
                                        className="notes-title-edit"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Tytuł..."
                                        style={{ fontSize: "var(--text-md)", padding: "var(--space-2) var(--space-3)" }}
                                    />
                                    <div className="notes-toolbar-actions">
                                        <button
                                            className={isVoiceRecording ? "key-management-btn" : "key-dialog-action"}
                                            onClick={isVoiceRecording ? stopVoiceRecording : startVoiceRecording}
                                            disabled={isVoiceTranscribing}
                                            title={isVoiceRecording ? "Zatrzymaj nagrywanie" : "Nagraj notatkę głosową"}
                                            style={isVoiceRecording ? {
                                                color: "#ef4444",
                                                borderColor: "rgba(239, 68, 68, 0.4)",
                                                animation: "pulse 1.5s infinite",
                                            } : {}}
                                        >
                                            {isVoiceTranscribing ? "⏳" : isVoiceRecording ? "⏹️" : "🎤"}
                                        </button>
                                        <button className="key-dialog-action" onClick={handleSave} disabled={isVoiceRecording || isVoiceTranscribing}>
                                            💾 Zapisz
                                        </button>
                                        <button className="key-management-btn" onClick={handleCancelEdit} disabled={isVoiceRecording}>
                                            Anuluj
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="notes-title">{decryptedTitles[activeNoteId!] || activeNote.title}</h2>
                                    <div className="notes-toolbar-actions">
                                        <button className="key-dialog-action" onClick={handleStartEdit}>
                                            ✏️ Edytuj
                                        </button>
                                        <button
                                            className="key-dialog-action"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            📥 Importuj
                                        </button>
                                        <button
                                            className="key-dialog-action"
                                            onClick={() => audioFileInputRef.current?.click()}
                                            disabled={isAudioImporting}
                                            title="Wgraj plik audio do transkrypcji"
                                        >
                                            {isAudioImporting ? `⏳ ${audioImportProgress}` : "🎵 Wgraj audio"}
                                        </button>
                                        <div className="notes-export-wrapper">
                                            <button
                                                className="key-dialog-action"
                                                onClick={() => setShowExportMenu(!showExportMenu)}
                                            >
                                                📤 Eksportuj
                                            </button>
                                            {showExportMenu && (
                                                <div className="notes-export-menu">
                                                    <button onClick={() => handleExport("txt")}>.txt</button>
                                                    <button onClick={() => handleExport("md")}>.md</button>
                                                    <button onClick={() => handleExport("docx")}>.docx</button>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            className="key-management-btn"
                                            onClick={handleDelete}
                                            style={{ color: "var(--danger)" }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* E2EE badge */}
                        <div className="notes-e2ee-badge">
                            🔒 Treść zaszyfrowana E2EE — Convex nie widzi Twoich notatek
                        </div>

                        {/* Content */}
                        <div className="notes-content">
                            {isDecrypting ? (
                                <div className="notes-empty-hint">🔓 Odszyfrowywanie...</div>
                            ) : decryptError ? (
                                <div className="audio-player-error">🔒 {decryptError}</div>
                            ) : isEditing ? (
                                <textarea
                                    className="notes-editor"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="Pisz notatkę... (obsługuje Markdown)"
                                />
                            ) : (
                                <div className="notes-rendered">
                                    {decryptedContent ? (
                                        renderMarkdown(decryptedContent)
                                    ) : (
                                        <p className="notes-empty-hint">
                                            Notatka jest pusta. Kliknij ✏️ Edytuj aby dodać treść.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Meta */}
                        <div className="notes-meta">
                            {new Date(activeNote._creationTime).toLocaleDateString("pl-PL", {
                                day: "numeric", month: "long", year: "numeric",
                                hour: "2-digit", minute: "2-digit"
                            })}
                            {activeNote.format && ` · ${activeNote.format.toUpperCase()}`}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">📓</div>
                        <h2>Notatki</h2>
                        <p>
                            Wybierz notatkę z listy, utwórz nową lub zaimportuj plik .txt, .md lub .docx.
                        </p>
                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <button
                                className="btn btn-outline"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    color: 'var(--accent)',
                                    borderColor: 'rgba(124, 92, 252, 0.3)',
                                    background: 'transparent',
                                    margin: '0 auto',
                                }}
                            >
                                📥 Importuj plik
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => audioFileInputRef.current?.click()}
                                disabled={isAudioImporting}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    color: 'var(--accent)',
                                    borderColor: 'rgba(124, 92, 252, 0.3)',
                                    background: 'transparent',
                                    margin: '0 auto',
                                    marginTop: 'var(--space-2)',
                                }}
                            >
                                {isAudioImporting ? `⏳ ${audioImportProgress}` : "🎵 Wgraj audio"}
                            </button>
                            <button
                                className="btn btn-outline"
                                onClick={() => ocrFileInputRef.current?.click()}
                                disabled={isScanning}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    color: 'var(--accent)',
                                    borderColor: 'rgba(124, 92, 252, 0.3)',
                                    background: 'transparent',
                                    margin: '0 auto',
                                    marginTop: 'var(--space-2)',
                                }}
                            >
                                {isScanning ? "⏳ Skanowanie..." : "📷 Skanuj notatkę"}
                            </button>
                        </div>
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 'var(--space-3)' }}>
                            🔒 Treść notatek jest szyfrowana E2EE — Convex nigdy nie widzi odszyfrowanego tekstu.
                        </p>
                    </div>
                )}
            </div>

            {/* Rename modal */}
            {
                noteToRename && (
                    <div className="modal-overlay" onClick={() => setNoteToRename(null)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <h2>Zmień temat notatki</h2>
                            <input
                                type="text"
                                placeholder="Nowy temat notatki"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === "Enter" && renameValue.trim()) {
                                        const key = await getSessionKeyOrThrow();
                                        const encryptedTitle = await encryptString(key, renameValue.trim());
                                        await updateNote({ noteId: noteToRename._id, title: encryptedTitle });
                                        setNoteToRename(null);
                                        setRenameValue("");
                                    }
                                }}
                                autoFocus
                                style={{ width: "100%", marginBottom: "var(--space-4)" }}
                            />
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => { setNoteToRename(null); setRenameValue(""); }}>Anuluj</button>
                                <button className="btn btn-primary" onClick={async () => {
                                    if (renameValue.trim()) {
                                        const key = await getSessionKeyOrThrow();
                                        const encryptedTitle = await encryptString(key, renameValue.trim());
                                        await updateNote({ noteId: noteToRename._id, title: encryptedTitle });
                                        setNoteToRename(null);
                                        setRenameValue("");
                                    }
                                }}>Zapisz</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
