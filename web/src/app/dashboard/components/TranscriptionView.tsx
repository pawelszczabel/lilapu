"use client";

import { useState, useMemo, useEffect } from "react";
import { Id } from "@convex/_generated/dataModel";
import { getSessionKeyOrThrow, decryptString } from "../crypto";

interface TranscriptionData {
    _id: Id<"transcriptions">;
    _creationTime: number;
    title?: string;
    content: string;
    durationSeconds?: number;
    blockchainVerified: boolean;
    blockchainTxHash?: string;
}

interface TranscriptionViewProps {
    transcription: TranscriptionData;
    onClose: () => void;
}

export default function TranscriptionView({
    transcription,
    onClose,
}: TranscriptionViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [copied, setCopied] = useState(false);

    // E2EE: Decrypted content
    const [decryptedTitle, setDecryptedTitle] = useState(transcription.title || "Nagranie bez tytułu");
    const [decryptedContent, setDecryptedContent] = useState("");
    const [isDecrypting, setIsDecrypting] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsDecrypting(true);

        (async () => {
            try {
                const key = await getSessionKeyOrThrow();

                let title = transcription.title || "Nagranie bez tytułu";
                let content = transcription.content;

                try {
                    title = await decryptString(key, transcription.title || "");
                } catch {
                    // Legacy plaintext
                }
                try {
                    content = await decryptString(key, transcription.content);
                } catch {
                    // Legacy plaintext
                }

                if (!cancelled) {
                    setDecryptedTitle(title);
                    setDecryptedContent(content);
                }
            } catch {
                // No encryption key — show as-is
                if (!cancelled) {
                    setDecryptedContent(transcription.content);
                }
            } finally {
                if (!cancelled) setIsDecrypting(false);
            }
        })();

        return () => { cancelled = true; };
    }, [transcription]);

    const date = new Date(transcription._creationTime);
    const dateStr = date.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const duration = transcription.durationSeconds
        ? `${Math.floor(transcription.durationSeconds / 60)}:${String(
            Math.floor(transcription.durationSeconds % 60)
        ).padStart(2, "0")}`
        : null;

    // Split content into paragraphs
    const paragraphs = useMemo(() => {
        return decryptedContent.split(/\n\n+/).filter((p) => p.trim());
    }, [decryptedContent]);

    // Highlight search matches
    const highlightText = (text: string) => {
        if (!searchQuery.trim()) return text;
        const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="search-highlight">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    const matchCount = useMemo(() => {
        if (!searchQuery.trim()) return 0;
        const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        return (decryptedContent.match(regex) || []).length;
    }, [searchQuery, decryptedContent]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(decryptedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExport = () => {
        const blob = new Blob([decryptedContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${decryptedTitle || "transkrypcja"}_${dateStr}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const wordCount = decryptedContent.split(/\s+/).filter(Boolean).length;

    if (isDecrypting) {
        return (
            <div className="transcription-view">
                <div className="empty-state">
                    <div className="empty-state-icon">🔓</div>
                    <p>Odszyfrowywanie transkrypcji...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="transcription-view">
            <div className="transcription-view-header">
                <div className="transcription-view-title-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                    <button
                        className="btn-icon-ghost"
                        onClick={onClose}
                        title="Wróć do listy"
                        style={{
                            width: 36,
                            height: 36,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            border: 'none',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-surface-hover)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {decryptedTitle}
                    </h2>
                    {transcription.blockchainVerified && (
                        <span className="transcription-card-badge" style={{ marginLeft: 'auto' }}>✅ Zabezpieczone</span>
                    )}
                </div>

                <div className="transcription-view-meta" style={{ display: 'flex', gap: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
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
                        {wordCount} słów
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        {paragraphs.length} akapitów
                    </span>
                </div>

                <div className="transcription-actions-row" style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-5)', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="transcription-search-wrapper" style={{ position: 'relative', width: '300px' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Szukaj w tekście..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="transcription-search"
                            style={{
                                paddingLeft: '36px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border)',
                                backdropFilter: 'blur(10px)',
                            }}
                        />
                        {searchQuery && (
                            <span className="transcription-search-count" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                {matchCount} {matchCount === 1 ? "wynik" : "wyników"}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <button className="btn btn-secondary btn-ghost" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {copied ? (
                                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Skopiowano</>
                            ) : (
                                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Kopiuj</>
                            )}
                        </button>
                        <button className="btn btn-secondary btn-ghost" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Eksportuj
                        </button>
                    </div>
                </div>
            </div>

            <div className="transcription-view-content" style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ maxWidth: '850px', width: '100%', padding: 'var(--space-6) 0' }}>
                    {paragraphs.map((paragraph, i) => (
                        <p key={i} className="transcription-paragraph" style={{ display: 'flex', lineHeight: 1.8, fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-6)' }}>
                            <span className="transcription-paragraph-index" style={{ opacity: 0.3, width: '40px', flexShrink: 0, textAlign: 'right', paddingRight: 'var(--space-4)', marginTop: '2px', userSelect: 'none' }}>
                                {i + 1}
                            </span>
                            <span style={{ flex: 1 }}>
                                {highlightText(paragraph)}
                            </span>
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
}
