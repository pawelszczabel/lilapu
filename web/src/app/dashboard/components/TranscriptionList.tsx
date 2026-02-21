"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import TranscriptionView from "./TranscriptionView";

interface TranscriptionListProps {
    projectId: Id<"projects">;
}

export default function TranscriptionList({ projectId }: TranscriptionListProps) {
    const [viewingId, setViewingId] = useState<Id<"transcriptions"> | null>(null);

    const transcriptions = useQuery(api.transcriptions.listByProject, { projectId });

    if (!transcriptions) {
        return (
            <div className="empty-state">
                <p>Ładowanie...</p>
            </div>
        );
    }

    // Full transcription viewer
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
            </div>
        );
    }

    return (
        <div className="transcription-list">
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
                        onClick={() => setViewingId(t._id)}
                    >
                        <div className="transcription-card-header">
                            <span className="transcription-card-title">
                                {t.title || "Nagranie bez tytułu"}
                            </span>
                            {t.blockchainVerified && (
                                <span className="transcription-card-badge">✅ Zabezpieczone</span>
                            )}
                        </div>
                        <div className="transcription-card-meta">
                            <span>📅 {dateStr}, {timeStr}</span>
                            {duration && <span>⏱️ {duration}</span>}
                            <span>📝 {t.content.split(/\s+/).length} słów</span>
                        </div>
                        <div className="transcription-card-preview">{t.content}</div>
                    </div>
                );
            })}
        </div>
    );
}
