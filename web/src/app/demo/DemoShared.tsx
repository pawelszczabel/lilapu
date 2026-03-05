"use client";

import { useState, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   SHARED HOOK — TYPING EFFECT
   ═══════════════════════════════════════════════════ */

export function useTypingEffect(text: string, speed: number = 30, active: boolean = true) {
    const [displayed, setDisplayed] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!active) {
            setDisplayed("");
            setDone(false);
            return;
        }
        setDisplayed("");
        setDone(false);
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayed(text.slice(0, i + 1));
                i++;
            } else {
                setDone(true);
                clearInterval(interval);
            }
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed, active]);

    return { displayed, done };
}

/* ═══════════════════════════════════════════════════
   MOCK SIDEBAR
   ═══════════════════════════════════════════════════ */

export function MockSidebar({ activeStep }: { activeStep: string }) {
    return (
        <div className="demo-sidebar" id="demo-sidebar">
            {/* Header */}
            <div className="demo-sidebar-header">
                <div className="demo-sidebar-brand">
                    <img src="/logo.svg" alt="Lilapu" className="demo-sidebar-brand-logo" />
                </div>
                <div className="demo-sidebar-toggle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="demo-sidebar-actions">
                <button
                    className={`demo-sidebar-action-btn ${activeStep === "new-client" ? "demo-highlight" : ""}`}
                    id="demo-new-client-btn"
                >
                    <div className="demo-sidebar-action-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <span style={{ fontWeight: 500 }}>Nowy klient</span>
                </button>
                <button
                    className={`demo-sidebar-action-btn ${activeStep === "new-folder" ? "demo-highlight" : ""}`}
                    id="demo-new-folder-btn"
                >
                    <div className="demo-sidebar-action-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <span style={{ fontWeight: 500 }}>Nowy folder</span>
                </button>
            </div>

            {/* Folder List */}
            <div className="demo-sidebar-list">
                <div className="demo-sidebar-folder">
                    <div className="demo-sidebar-folder-header">
                        <span className="demo-sidebar-folder-chevron open">˅</span>
                        <span>TESTOWY FOLDER</span>
                        <span className="demo-sidebar-folder-menu">⋮</span>
                    </div>
                    <div className="demo-sidebar-item active">
                        <span className="demo-sidebar-item-name">Paweł Szczabel</span>
                        <span className="demo-sidebar-folder-menu">⋮</span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="demo-sidebar-footer">
                <div className="demo-sidebar-user">
                    <div className="demo-sidebar-user-avatar">S</div>
                    <span>szczabelpawel@gmail.com</span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MOCK MAIN PANEL
   ═══════════════════════════════════════════════════ */

export function MockMainPanel({
    activeTab,
    onTabClick,
    activeStep,
}: {
    activeTab: string;
    onTabClick: (tab: string) => void;
    activeStep: string;
}) {
    return (
        <div className="demo-main" id="demo-main">
            <div className="demo-main-header">
                <h1>Paweł Szczabel</h1>
                <div className="demo-main-tabs">
                    <button
                        className={`demo-main-tab ${activeTab === "record" ? "active" : ""} ${activeStep === "tab-record" ? "demo-pulse-hint" : ""}`}
                        onClick={() => onTabClick("record")}
                        id="demo-tab-record"
                    >
                        🎙️ Nagrywaj
                    </button>
                    <button
                        className={`demo-main-tab ${activeTab === "transcriptions" ? "active" : ""} ${activeStep === "tab-transcriptions" ? "demo-pulse-hint" : ""}`}
                        onClick={() => onTabClick("transcriptions")}
                        id="demo-tab-transcriptions"
                    >
                        📝 Transkrypcje
                    </button>
                    <button
                        className={`demo-main-tab ${activeTab === "notes" ? "active" : ""} ${activeStep === "tab-notes" ? "demo-pulse-hint" : ""}`}
                        onClick={() => onTabClick("notes")}
                        id="demo-tab-notes"
                    >
                        📓 Notatki
                    </button>
                    <button
                        className={`demo-main-tab ${activeTab === "chat" ? "active" : ""} ${activeStep === "tab-chat" ? "demo-pulse-hint" : ""}`}
                        onClick={() => onTabClick("chat")}
                        id="demo-tab-chat"
                    >
                        💬 Czat AI
                    </button>
                </div>
            </div>

            <div className="demo-main-body">
                {activeTab === "record" && <MockRecordContent activeStep={activeStep} />}
                {activeTab === "transcriptions" && <MockTranscriptionsContent />}
                {activeTab === "notes" && <MockNotesContent activeStep={activeStep} />}
                {activeTab === "chat" && <MockChatContent activeStep={activeStep} />}
            </div>
        </div>
    );
}

/* ── Record Tab ── */
export function MockRecordContent({ activeStep }: { activeStep: string }) {
    const isActive = activeStep === "tab-record";
    const { displayed } = useTypingEffect(
        "— Jak się Pan czuje od naszego ostatniego spotkania? — Szczerze mówiąc, ten tydzień był ciężki. Znowu miałem problemy ze snem, budziłem się o trzeciej w nocy i nie mogłem zasnąć. — Rozumiem. Czy próbował Pan tych ćwiczeń oddechowych, o których rozmawialiśmy? — Tak, pomagają trochę, ale...",
        40,
        isActive
    );

    return (
        <div className="demo-record-panel">
            {isActive ? (
                <>
                    <div className="demo-record-status">
                        <div className="demo-record-dot animate" />
                        <span>Nagrywanie...</span>
                    </div>
                    <div className="demo-record-timer">● 00:14:32</div>

                    {/* Waveform */}
                    <div className="demo-waveform">
                        {Array.from({ length: 30 }, (_, i) => (
                            <div
                                key={i}
                                className="demo-waveform-bar animate"
                                style={{
                                    height: `${8 + Math.random() * 20}px`,
                                    animationDelay: `${i * 0.05}s`,
                                    opacity: 0.4 + Math.random() * 0.6,
                                }}
                            />
                        ))}
                    </div>

                    <div className="demo-live-transcript">
                        {displayed}
                        <span className="demo-typing-cursor" />
                    </div>

                    <button className="demo-record-btn demo-record-btn-stop">■</button>
                </>
            ) : (
                <>
                    <button className="demo-record-btn demo-record-btn-start">●</button>
                    <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                        Kliknij aby rozpocząć nagrywanie
                    </p>
                    <input
                        className="demo-record-title-input"
                        placeholder="Tytuł nagrania (opcjonalnie)"
                        readOnly
                    />
                </>
            )}
        </div>
    );
}

/* ── Transcriptions Tab ── */
export function MockTranscriptionsContent() {
    const transcriptions = [
        {
            title: "Sesja — problemy ze snem",
            date: "27 lut 2026, 14:30",
            duration: "45 min",
            preview: "— Jak się Pan czuje od naszego ostatniego spotkania? — Szczerze mówiąc, ten tydzień był ciężki. Znowu miałem problemy ze snem...",
            verified: true,
        },
        {
            title: "Sesja — lęk przed wystąpieniami",
            date: "20 lut 2026, 14:30",
            duration: "50 min",
            preview: "— Opowiedział Pan, że w pracy pojawiła się prezentacja. Jak się Pan z tym czuje? — Boję się, że znowu zapomnę co mówić...",
            verified: true,
        },
        {
            title: "Sesja wstępna — wywiad",
            date: "13 lut 2026, 14:00",
            duration: "1h 10min",
            preview: "— Cieszę się, że Pan przyszedł. Na początek chciałbym zapytać, co Pana skłoniło do szukania pomocy? — Od kilku miesięcy...",
            verified: true,
        },
    ];

    return (
        <div className="demo-transcription-list">
            {transcriptions.map((t, i) => (
                <div key={i} className="demo-transcription-card">
                    <div className="demo-transcription-card-header">
                        <span className="demo-transcription-card-title">{t.title}</span>
                        {t.verified && (
                            <span className="demo-transcription-card-badge">✅ Zabezpieczone</span>
                        )}
                    </div>
                    <div className="demo-transcription-card-meta">
                        <span>📅 {t.date}</span>
                        <span>⏱️ {t.duration}</span>
                    </div>
                    <div className="demo-transcription-card-preview">{t.preview}</div>
                </div>
            ))}
        </div>
    );
}

/* ── Notes Tab ── */
export function MockNotesContent({ activeStep }: { activeStep: string }) {
    const isActive = activeStep === "tab-notes";
    const { displayed } = useTypingEffect(
        "# Notatka po sesji — 27 lut 2026\n\nPacjent zgłasza nasilenie problemów ze snem (budzi się ok. 3:00). Nawracające myśli o pracy.\n- Ćwiczenia oddechowe — częściowa poprawa\n- Zlecono: dziennik snu do następnej sesji\n- Następna sesja: piątek 14:30",
        25,
        isActive
    );

    return (
        <div className="demo-notes-layout">
            {/* Left sidebar — notes list */}
            <div className="demo-notes-sidebar">
                <div className="demo-notes-sidebar-header">
                    <span className="demo-notes-sidebar-title">NOTATKI</span>
                    <button className="demo-sidebar-toggle" style={{ width: 24, height: 24 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </button>
                </div>
                <button className="demo-notes-new-btn" id="demo-new-note-btn">
                    <div className="demo-sidebar-action-icon" style={{ width: 28, height: 28 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <span style={{ fontWeight: 500 }}>Nowa notatka</span>
                </button>
                {isActive ? (
                    <div className="demo-notes-list-item">
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>Notatka po sesji</span>
                        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                    </div>
                ) : (
                    <p className="demo-notes-empty-text">
                        Brak notatek. Utwórz nową lub importuj plik.
                    </p>
                )}
            </div>

            {/* Right content area */}
            <div className="demo-notes-content-area">
                {isActive ? (
                    <>
                        {/* Editor header */}
                        <div className="demo-notes-editor-header">
                            <input
                                className="demo-notes-editor-title"
                                value="Notatka po sesji"
                                readOnly
                            />
                            <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>✏️</span>
                            <button className="demo-notes-editor-btn demo-notes-editor-save">
                                💾 Zapisz
                            </button>
                            <button className="demo-notes-editor-btn demo-notes-editor-cancel">
                                Anuluj
                            </button>
                        </div>
                        {/* E2EE banner */}
                        <div className="demo-notes-e2ee-banner">
                            🔒 Treść zaszyfrowana E2EE
                        </div>
                        {/* Editor body with typing */}
                        <div className="demo-notes-editor-body">
                            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: "var(--text-base)", lineHeight: 1.8, color: "var(--text-primary)", margin: 0 }}>
                                {displayed}
                                <span className="demo-typing-cursor" />
                            </pre>
                        </div>
                        {/* Footer */}
                        <div className="demo-notes-editor-footer">
                            27 lutego 2026 o 09:22 · MD
                        </div>
                    </>
                ) : (
                    <div className="demo-notes-content-empty">
                        <div className="demo-notes-content-empty-icon">📓</div>
                        <h2 className="demo-notes-content-empty-title">Notatki</h2>
                        <p className="demo-notes-content-empty-desc">
                            Wybierz notatkę z listy, utwórz nową lub zaimportuj plik .txt, .md lub .docx
                        </p>
                        <div className="demo-notes-content-empty-actions">
                            <div className="demo-notes-content-empty-action" id="demo-import-file">
                                📥 Importuj plik
                            </div>
                            <div className="demo-notes-content-empty-action" id="demo-record-audio">
                                🎵 Wgraj audio
                            </div>
                            <div className="demo-notes-content-empty-action" id="demo-scan-note">
                                📷 Skanuj notatkę
                            </div>
                        </div>
                        <div className="demo-notes-e2ee-badge">
                            🔒 Treść notatek jest szyfrowana E2EE
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Chat Tab ── */
export function MockChatContent({ activeStep }: { activeStep: string }) {
    const isActive = activeStep === "tab-chat";
    const { displayed: userMsg } = useTypingEffect(
        "Jakie techniki relaksacyjne omawialiśmy z pacjentem?",
        35,
        isActive
    );
    const { displayed: aiMsg } = useTypingEffect(
        "Na podstawie transkrypcji z sesji 27 lutego 2026:\n\n" +
        "Omawiane techniki:\n" +
        "- Ćwiczenia oddechowe (4-7-8) — pacjent stosuje, częściowa poprawa\n" +
        "- Dziennik snu — zlecony do następnej sesji\n" +
        "- Pacjent budzi się ok. 3:00, nawracające myśli o pracy\n" +
        "- Następna sesja: piątek, godz. 14:30\n\n" +
        "Źródło: Sesja — problemy ze snem (27 lut 2026, 14:30)",
        20,
        isActive
    );

    return (
        <div className="demo-chat-layout">
            {/* Chat Sidebar */}
            <div className="demo-chat-sidebar">
                <div className="demo-notes-sidebar-header">
                    <span className="demo-notes-sidebar-title">ROZMOWY</span>
                    <button className="demo-sidebar-toggle" style={{ width: 24, height: 24 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </button>
                </div>
                <div style={{ padding: 'var(--space-2)' }}>
                    <button className="demo-notes-new-btn" style={{ marginBottom: 'var(--space-2)' }}>
                        <div className="demo-sidebar-action-icon" style={{ width: 28, height: 28 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                        <span style={{ fontWeight: 500 }}>Nowa rozmowa</span>
                    </button>
                </div>
                {isActive ? (
                    <div className="demo-notes-list-item" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>Nowa rozmowa</span>
                        <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                        </button>
                    </div>
                ) : (
                    <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>
                        Brak rozmów. Zadaj pytanie poniżej.
                    </p>
                )}
            </div>

            {/* Chat Main */}
            <div className="demo-chat-panel">
                <div className="demo-chat-messages">
                    {isActive && userMsg && (
                        <div className="demo-chat-message user">
                            {userMsg}
                            {!userMsg.endsWith("?") && <span className="demo-typing-cursor" />}
                        </div>
                    )}
                    {isActive && userMsg.endsWith("?") && aiMsg && (
                        <div className="demo-chat-message assistant">
                            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
                                {aiMsg}
                                <span className="demo-typing-cursor" />
                            </pre>
                        </div>
                    )}
                    {!isActive && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, color: "var(--text-muted)", gap: "var(--space-3)" }}>
                            <span style={{ fontSize: "2rem" }}>💬</span>
                            <p style={{ fontSize: "var(--text-sm)" }}>Zapytaj AI o swoje notatki i transkrypcje</p>
                            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>💡 Użyj @ aby dołączyć transkrypcje, notatki lub inne rozmowy jako kontekst.</p>
                        </div>
                    )}
                </div>
                <div className="demo-chat-input-area">
                    <input className="demo-chat-input" placeholder="Zapytaj o swoje notatki... (@ dodaj kontekst)" readOnly />
                    <button className="demo-chat-send-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
