"use client";

import { useState, useMemo } from "react";
import { Id } from "@convex/_generated/dataModel";

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
        return transcription.content.split(/\n\n+/).filter((p) => p.trim());
    }, [transcription.content]);

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
        return (transcription.content.match(regex) || []).length;
    }, [searchQuery, transcription.content]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(transcription.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExport = () => {
        const blob = new Blob([transcription.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${transcription.title || "transkrypcja"}_${dateStr}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const wordCount = transcription.content.split(/\s+/).length;

    return (
        <div className="transcription-view">
            <div className="transcription-view-header">
                <div className="transcription-view-title-row">
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: "var(--space-2) var(--space-3)" }}>
                        ← Wróć
                    </button>
                    <h2>{transcription.title || "Nagranie bez tytułu"}</h2>
                    {transcription.blockchainVerified && (
                        <span className="transcription-card-badge">✅ Zabezpieczone</span>
                    )}
                </div>

                <div className="transcription-view-meta">
                    <span>📅 {dateStr}, {timeStr}</span>
                    {duration && <span>⏱️ {duration}</span>}
                    <span>📝 {wordCount} słów</span>
                    <span>📄 {paragraphs.length} akapitów</span>
                </div>

                <div className="transcription-view-actions">
                    <div className="transcription-search-wrapper">
                        <input
                            type="text"
                            placeholder="🔍 Szukaj w transkrypcji..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="transcription-search"
                        />
                        {searchQuery && (
                            <span className="transcription-search-count">
                                {matchCount} {matchCount === 1 ? "wynik" : "wyników"}
                            </span>
                        )}
                    </div>

                    <button className="btn btn-secondary" onClick={handleCopy}>
                        {copied ? "✅ Skopiowano!" : "📋 Kopiuj"}
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        📥 Eksportuj .txt
                    </button>
                </div>
            </div>

            <div className="transcription-view-content">
                {paragraphs.map((paragraph, i) => (
                    <p key={i} className="transcription-paragraph">
                        <span className="transcription-paragraph-index">{i + 1}</span>
                        {highlightText(paragraph)}
                    </p>
                ))}
            </div>
        </div>
    );
}
