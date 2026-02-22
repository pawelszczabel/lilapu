"use client";

import React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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
                                    />
                                    <div className="notes-toolbar-actions">
                                        <button className="key-dialog-action" onClick={handleSave}>
                                            💾 Zapisz
                                        </button>
                                        <button className="key-management-btn" onClick={handleCancelEdit}>
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
