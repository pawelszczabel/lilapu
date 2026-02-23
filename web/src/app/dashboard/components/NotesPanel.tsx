"use client";

import React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getOrCreateUserKey, encryptString, decryptString } from "../crypto";

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
    const transcribeAudio = useAction(api.ai.transcribe);

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
                const key = await getOrCreateUserKey();
                const plaintext = await decryptString(key, activeNote.content);
                if (!cancelled) setDecryptedContent(plaintext);
            } catch {
                // Content might be unencrypted (legacy) — show as-is
                if (!cancelled) {
                    setDecryptedContent(activeNote.content);
                    setDecryptError(null); // Don't show error for legacy notes
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

        const key = await getOrCreateUserKey();
        const encryptedContent = await encryptString(key, "");

        const id = await createNote({
            projectId,
            title: newTitle.trim(),
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

        // Encrypt content before saving
        const key = await getOrCreateUserKey();
        const encryptedContent = await encryptString(key, editContent);

        await updateNote({
            noteId: activeNoteId,
            title: editTitle.trim() || "Bez tytułu",
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

        // Encrypt content before saving
        const key = await getOrCreateUserKey();
        const encryptedContent = await encryptString(key, content);

        const id = await createNote({
            projectId,
            title,
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
            const text = await transcribeAudio({ audioBase64: base64 });
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
    }, [transcribeAudio]);

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
            <div className="notes-sidebar">
                <div className="chat-sidebar-header">
                    <h3>Notatki</h3>
                    <button
                        className="sidebar-add-btn"
                        onClick={() => setIsCreating(true)}
                        title="Nowa notatka"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                            onClick={() => {
                                setActiveNoteId(note._id);
                                setIsEditing(false);
                            }}
                        >
                            📝 {note.title}
                        </div>
                    ))}
                </div>

                {/* Import button in sidebar */}
                <div className="notes-sidebar-footer">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,.md,.docx"
                        onChange={handleImport}
                        style={{ display: "none" }}
                    />
                    <button
                        className="notes-import-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        📥 Importuj plik
                    </button>
                </div>
            </div>

            {/* Main area */}
            <div className="notes-main">
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
                                    <h2 className="notes-title">{activeNote.title}</h2>
                                    <div className="notes-toolbar-actions">
                                        <button className="key-dialog-action" onClick={handleStartEdit}>
                                            ✏️ Edytuj
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
                        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                            🔒 Treść notatek jest szyfrowana E2EE — Convex nigdy nie widzi odszyfrowanego tekstu.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
