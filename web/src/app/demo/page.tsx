"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import "./demo.css";

/* ═══════════════════════════════════════════════════
   SOUND EFFECTS (Web Audio API)
   ═══════════════════════════════════════════════════ */

function createAudioContext() {
    if (typeof window === "undefined") return null;
    return new (window.AudioContext || (window as any).webkitAudioContext)();
}

function playClickSound(audioCtx: AudioContext | null) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playSuccessSound(audioCtx: AudioContext | null) {
    if (!audioCtx) return;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.3);
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
    });
}

function playWhooshSound(audioCtx: AudioContext | null) {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * 0.15;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(2000, audioCtx.currentTime);
    bandpass.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.15);
    bandpass.Q.value = 1;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

/* ═══════════════════════════════════════════════════
   ONBOARDING STEPS DATA
   ═══════════════════════════════════════════════════ */

interface OnboardingStep {
    id: string;
    targetId: string;
    emoji: string;
    title: string;
    story: string;
    proTip: string;
    tab?: "record" | "transcriptions" | "notes" | "chat";
    cardPosition: "right" | "left" | "bottom" | "center";
}

const STEPS: OnboardingStep[] = [
    {
        id: "dashboard",
        targetId: "demo-dashboard",
        emoji: "🏠",
        title: "Twoje centrum dowodzenia",
        story: "To jest Lilapu — Twój prywatny asystent wiedzy. Wszystko w jednym miejscu: nagrywaj, transkrybuj, rób notatki i rozmawiaj z AI o swoich dokumentach.",
        proTip: "Lilapu działa jak natywna aplikacja desktopowa. Wszystkie dane szyfrowane — nawet my ich nie widzimy.",
        cardPosition: "center",
    },
    {
        id: "new-client",
        targetId: "demo-new-client-btn",
        emoji: "👤",
        title: "Nowy klient / projekt",
        story: "Każda osoba, sprawa lub projekt to oddzielny workspace. Tworzysz go jednym kliknięciem — i od razu masz osobne miejsce na nagrania, notatki i czaty z AI.",
        proTip: "Prawnik tworzy osobny projekt per sprawę. Lekarz per pacjenta. Zero bałaganu, pełna separacja danych.",
        cardPosition: "right",
    },
    {
        id: "new-folder",
        targetId: "demo-new-folder-btn",
        emoji: "📂",
        title: "Foldery — organizacja klientów",
        story: "Grupuj projekty w foldery. Nazwij folder imieniem klienta, a w środku umieść jego sprawy. Albo odwrotnie — jak wolisz.",
        proTip: "Kancelaria prawna? Folder = klient, projekty w środku = poszczególne sprawy. Klinika? Folder = oddział, projekty = pacjenci.",
        cardPosition: "right",
    },
    {
        id: "tab-record",
        targetId: "demo-tab-record",
        emoji: "🎙️",
        title: "Nagrywaj — transkrypcja na żywo",
        story: "Kliknij 'Nagrywaj' i mów. Twoje słowa zamieniają się w tekst w czasie rzeczywistym. Koniec z ręcznym spisywaniem notatek ze spotkań.",
        proTip: "Lilapu obsługuje nagrywanie przez mikrofon, a wkrótce także rozmowy online (Meet, Zoom). Latencja < 2 sekundy.",
        tab: "record",
        cardPosition: "bottom",
    },
    {
        id: "tab-transcriptions",
        targetId: "demo-tab-transcriptions",
        emoji: "📝",
        title: "Transkrypcje — Twoja pamięć",
        story: "Każde nagranie to automatyczna transkrypcja. Wracasz do niej kiedy chcesz — szukaj, czytaj, eksportuj. Nigdy więcej 'co on mówił na tamtym spotkaniu?'",
        proTip: "Każda transkrypcja jest zabezpieczona kryptograficznie. Badge ✅ oznacza, że nikt jej nie zmienił od momentu nagrania.",
        tab: "transcriptions",
        cardPosition: "bottom",
    },
    {
        id: "tab-notes",
        targetId: "demo-tab-notes",
        emoji: "📓",
        title: "Notatki — pisz, importuj, skanuj",
        story: "Pisz notatki w Markdown, importuj pliki .txt/.md/.docx, nagraj głosową notatkę, a nawet zeskanuj odręcznie pisane notatki aparatem. Wszystko w jednym miejscu.",
        proTip: "Treść notatek jest szyfrowana E2EE — Convex nigdy nie widzi odszyfrowanego tekstu. Nawet administrator serwera nie ma dostępu.",
        tab: "notes",
        cardPosition: "bottom",
    },
    {
        id: "tab-chat",
        targetId: "demo-tab-chat",
        emoji: "💬",
        title: "Czat AI — pytaj o swoje notatki",
        story: "Zapytaj AI: 'Co ustaliliśmy z klientem X?', 'Podsumuj ostatnie spotkanie', 'Znajdź wzmianki o budżecie'. AI odpowiada na podstawie TWOICH dokumentów.",
        proTip: "AI działa wyłącznie na Twoich notatkach z danego projektu. Zero halucynacji z internetu, zero cross-project leaks. Twoje dane nigdy nie trafiają do OpenAI.",
        tab: "chat",
        cardPosition: "bottom",
    },
    {
        id: "waitlist",
        targetId: "demo-waitlist",
        emoji: "🚀",
        title: "Odkryłeś Lilapu!",
        story: "Gratulacje! Teraz wiesz, jak działa Lilapu. Dołącz do wczesnego dostępu — startujemy wkrótce.",
        proTip: "Pierwsi użytkownicy dostaną dożywotni plan Pro za darmo. Bądź jednym z nich.",
        cardPosition: "center",
    },
];

/* ═══════════════════════════════════════════════════
   CONFETTI COMPONENT
   ═══════════════════════════════════════════════════ */

function Confetti() {
    const colors = ["#7c5cfc", "#a78bfa", "#c4b5fd", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4"];
    const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
    }));

    return (
        <div className="demo-confetti-container">
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className="demo-confetti-piece"
                    style={{
                        left: `${p.left}%`,
                        width: p.size,
                        height: p.size * 0.6,
                        background: p.color,
                        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                        animationDuration: `${p.duration}s`,
                        animationDelay: `${p.delay}s`,
                        transform: `rotate(${p.rotation}deg)`,
                    }}
                />
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   TYPING EFFECT HOOK
   ═══════════════════════════════════════════════════ */

function useTypingEffect(text: string, speed: number = 30, active: boolean = true) {
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

function MockSidebar({ activeStep }: { activeStep: string }) {
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
                    <span className="demo-sidebar-action-icon">+</span>
                    Nowy klient
                </button>
                <button
                    className={`demo-sidebar-action-btn ${activeStep === "new-folder" ? "demo-highlight" : ""}`}
                    id="demo-new-folder-btn"
                >
                    <span className="demo-sidebar-action-icon">+</span>
                    Nowy folder
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

function MockMainPanel({
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
                <h1>Klient X — Umowa dostawy</h1>
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
function MockRecordContent({ activeStep }: { activeStep: string }) {
    const isActive = activeStep === "tab-record";
    const { displayed } = useTypingEffect(
        "Dzisiaj omawiamy warunki kontraktu na dostawę komponentów elektronicznych. Pan Nowak proponuje termin realizacji na 15 marca, z opcją przedłużenia do końca kwartału...",
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
function MockTranscriptionsContent() {
    const transcriptions = [
        {
            title: "Spotkanie z klientem X",
            date: "27 lut 2026, 14:30",
            duration: "45 min",
            preview: "Omówiliśmy warunki umowy na dostawę komponentów elektronicznych. Pan Nowak proponuje termin realizacji...",
            verified: true,
        },
        {
            title: "Wywiad telefoniczny",
            date: "25 lut 2026, 10:00",
            duration: "22 min",
            preview: "Rozmowa z panem Kowalskim o nowym projekcie badawczym. Wstępne ustalenia dotyczące budżetu i harmonogramu...",
            verified: true,
        },
        {
            title: "Wizyta w kancelarii",
            date: "22 lut 2026, 11:15",
            duration: "1h 12min",
            preview: "Spotkanie dotyczące due diligence prawnego. Przegląd dokumentacji korporacyjnej i umów handlowych...",
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
function MockNotesContent({ activeStep }: { activeStep: string }) {
    const isActive = activeStep === "tab-notes";
    const { displayed } = useTypingEffect(
        "# Notatki ze spotkania\n\nKlient X potwierdził budżet na Q2. Kluczowe ustalenia:\n- Termin dostawy: 15 marca\n- Budżet: 450k PLN\n- Kolejne spotkanie: piątek 10:00",
        25,
        isActive
    );

    return (
        <div className="demo-notes-layout">
            {/* Left sidebar — notes list */}
            <div className="demo-notes-sidebar">
                <div className="demo-notes-sidebar-header">
                    <span className="demo-notes-sidebar-title">NOTATKI</span>
                    <span className="demo-notes-sidebar-icon">📋</span>
                </div>
                <button className="demo-notes-new-btn" id="demo-new-note-btn">
                    <span className="demo-notes-new-icon">+</span>
                    Nowa notatka
                </button>
                {isActive ? (
                    <div className="demo-notes-list-item">
                        <span>Notatki ze spotkania</span>
                        <span className="demo-notes-list-item-menu">⋮</span>
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
                                value="Notatki ze spotkania"
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
                            🔒 Treść zaszyfrowana E2EE — Convex nie widzi Twoich notatek
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
                            🔒 Treść notatek jest szyfrowana E2EE — Convex nigdy nie widzi odszyfrowanego tekstu.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Chat Tab ── */
function MockChatContent({ activeStep }: { activeStep: string }) {
    const isActive = activeStep === "tab-chat";
    const { displayed: userMsg } = useTypingEffect(
        "Co ustaliliśmy z klientem X na ostatnim spotkaniu?",
        35,
        isActive
    );
    const { displayed: aiMsg } = useTypingEffect(
        "Na podstawie transkrypcji ze spotkania z 27 lutego 2026:\n\n" +
        "Kluczowe ustalenia:\n" +
        "- Termin dostawy komponentow: 15 marca 2026\n" +
        "- Budzet projektu: 450 000 PLN\n" +
        "- Pan Nowak podtrzymal opcje przedluzenia do konca Q1\n" +
        "- Kolejne spotkanie: piatek, godz. 10:00\n\n" +
        "Zrodlo: Spotkanie z klientem X (27 lut 2026, 14:30)",
        20,
        isActive
    );

    return (
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
                    </div>
                )}
            </div>
            <div className="demo-chat-input-area">
                <input className="demo-chat-input" placeholder="Zapytaj AI o swoje notatki..." readOnly />
                <button className="demo-chat-send-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   STORY CARD
   ═══════════════════════════════════════════════════ */

function StoryCard({
    step,
    stepIndex,
    totalSteps,
    onNext,
    onBack,
    onSkip,
}: {
    step: OnboardingStep;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
}) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: "50%", left: "50%" });

    useEffect(() => {
        const target = document.getElementById(step.targetId);
        if (!target || step.cardPosition === "center") {
            setPosition({ top: "50%", left: "50%" });
            return;
        }

        const rect = target.getBoundingClientRect();
        const cardW = 380;
        const cardH = 350;
        const pad = 20;

        let top = 0;
        let left = 0;

        if (step.cardPosition === "right") {
            top = Math.max(pad, rect.top);
            left = Math.min(rect.right + pad, window.innerWidth - cardW - pad);
        } else if (step.cardPosition === "left") {
            top = Math.max(pad, rect.top);
            left = Math.max(pad, rect.left - cardW - pad);
        } else if (step.cardPosition === "bottom") {
            top = Math.min(rect.bottom + pad, window.innerHeight - cardH - pad);
            left = Math.max(pad, Math.min(rect.left, window.innerWidth - cardW - pad));
        }

        setPosition({ top: `${top}px`, left: `${left}px` });
    }, [step]);

    const isLastRealStep = stepIndex === totalSteps - 2; // before waitlist
    const remaining = totalSteps - stepIndex - 1;

    return (
        <div
            ref={cardRef}
            className="demo-story-card"
            style={{
                top: step.cardPosition === "center" ? "50%" : position.top,
                left: step.cardPosition === "center" ? "50%" : position.left,
                transform: step.cardPosition === "center" ? "translate(-50%, -50%)" : "none",
            }}
        >
            <div className="demo-story-card-emoji">{step.emoji}</div>
            <h3 className="demo-story-card-title">{step.title}</h3>
            <p className="demo-story-card-story">{step.story}</p>
            <div className="demo-story-card-protip">
                <div className="demo-story-card-protip-label">💡 Pro Tip</div>
                {step.proTip}
            </div>
            <div className="demo-story-card-actions">
                <div>
                    {stepIndex > 0 && (
                        <button className="demo-story-card-back" onClick={onBack}>
                            ← Wstecz
                        </button>
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span className="demo-story-card-remaining">{remaining > 0 ? `Zostało ${remaining}` : ""}</span>
                    <button className="demo-story-card-next" onClick={onNext}>
                        {isLastRealStep ? "Zakończ tour →" : "Dalej →"}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   WAITLIST CTA COMPONENT
   ═══════════════════════════════════════════════════ */

function WaitlistCTA({ onRestart }: { onRestart: () => void }) {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setSubmitting(true);
        // Simulate API call
        await new Promise((r) => setTimeout(r, 1000));
        setSubmitted(true);
        setSubmitting(false);
    };

    return (
        <div className="demo-waitlist-overlay">
            <Confetti />
            <div className="demo-waitlist-card">
                <div className="demo-waitlist-emoji">🎉</div>
                <h2 className="demo-waitlist-title">Odkryłeś Lilapu!</h2>
                <p className="demo-waitlist-desc">
                    Gratulacje! Teraz wiesz, jak działa Lilapu. Dołącz do wczesnego dostępu —
                    startujemy wkrótce. Pierwsi użytkownicy dostaną <strong>dożywotni plan Pro za darmo</strong>.
                </p>

                {!submitted ? (
                    <form className="demo-waitlist-form" onSubmit={handleSubmit}>
                        <input
                            className="demo-waitlist-input"
                            type="email"
                            placeholder="twoj@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button className="demo-waitlist-submit" type="submit" disabled={submitting}>
                            {submitting ? "⏳" : "Dołącz →"}
                        </button>
                    </form>
                ) : (
                    <p className="demo-waitlist-success">
                        ✅ Świetnie! Damy Ci znać, gdy Lilapu będzie gotowe.
                    </p>
                )}

                <button className="demo-waitlist-restart" onClick={onRestart}>
                    ↺ Przejdź onboarding ponownie
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════ */

export default function DemoPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [activeTab, setActiveTab] = useState<string>("notes");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showWaitlist, setShowWaitlist] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Initialize audio context on first interaction
    const ensureAudioCtx = useCallback(() => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = createAudioContext();
        }
        if (audioCtxRef.current?.state === "suspended") {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    }, []);

    const step = STEPS[currentStep];

    // Sync tab with step
    useEffect(() => {
        if (step?.tab) {
            setActiveTab(step.tab);
        }
    }, [step]);

    const goNext = useCallback(() => {
        const ctx = ensureAudioCtx();
        if (soundEnabled) playClickSound(ctx);

        if (currentStep === STEPS.length - 2) {
            // Going to waitlist
            if (soundEnabled) playSuccessSound(ctx);
            setShowWaitlist(true);
            setCurrentStep(STEPS.length - 1);
        } else if (currentStep < STEPS.length - 1) {
            if (soundEnabled) playWhooshSound(ctx);
            setCurrentStep((s) => s + 1);
        }
    }, [currentStep, soundEnabled, ensureAudioCtx]);

    const goBack = useCallback(() => {
        const ctx = ensureAudioCtx();
        if (soundEnabled) playClickSound(ctx);
        if (currentStep > 0) {
            setCurrentStep((s) => s - 1);
            setShowWaitlist(false);
        }
    }, [currentStep, soundEnabled, ensureAudioCtx]);

    const skipToEnd = useCallback(() => {
        const ctx = ensureAudioCtx();
        if (soundEnabled) playSuccessSound(ctx);
        setShowWaitlist(true);
        setCurrentStep(STEPS.length - 1);
    }, [soundEnabled, ensureAudioCtx]);

    const restart = useCallback(() => {
        setCurrentStep(0);
        setActiveTab("notes");
        setShowWaitlist(false);
    }, []);

    const handleTabClick = useCallback((tab: string) => {
        setActiveTab(tab);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "Enter") goNext();
            else if (e.key === "ArrowLeft") goBack();
            else if (e.key === "Escape") skipToEnd();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [goNext, goBack, skipToEnd]);

    const progress = ((currentStep + 1) / STEPS.length) * 100;

    return (
        <div className="demo-page">
            {/* Ambient Glow */}
            <div className="demo-glow" />
            <div className="demo-glow-accent" />

            {/* Progress Bar */}
            <div className="demo-progress-bar">
                <div className="demo-progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* Progress Info */}
            <div className="demo-progress-info">
                <div className="demo-progress-dots">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`demo-progress-dot ${i < currentStep ? "completed" : ""} ${i === currentStep ? "current" : ""}`}
                        />
                    ))}
                </div>
                <span className="demo-progress-step-count">
                    {currentStep + 1}/{STEPS.length}
                </span>
            </div>

            {/* Native Window Frame */}
            <div className="demo-window">
                {/* macOS Title Bar */}
                <div className="demo-titlebar">
                    <div className="demo-traffic-lights">
                        <button className="demo-traffic-light close" onClick={(e) => e.stopPropagation()} />
                        <button className="demo-traffic-light minimize" onClick={(e) => e.stopPropagation()} />
                        <button className="demo-traffic-light maximize" onClick={(e) => e.stopPropagation()} />
                    </div>
                    <span className="demo-titlebar-text">Lilapu — Prywatny Asystent Wiedzy</span>
                </div>

                {/* Dashboard UI */}
                <div className="demo-dashboard" id="demo-dashboard">
                    <MockSidebar activeStep={step.id} />
                    <MockMainPanel
                        activeTab={activeTab}
                        onTabClick={handleTabClick}
                        activeStep={step.id}
                    />
                </div>
            </div>

            {/* Spotlight Overlay */}
            {!showWaitlist && (
                <div
                    className="demo-spotlight-overlay"
                    onClick={goNext}
                />
            )}

            {/* Story Card */}
            {!showWaitlist && step && (
                <StoryCard
                    step={step}
                    stepIndex={currentStep}
                    totalSteps={STEPS.length}
                    onNext={goNext}
                    onBack={goBack}
                    onSkip={skipToEnd}
                />
            )}

            {/* Skip Button */}
            {!showWaitlist && (
                <button className="demo-story-card-skip" onClick={skipToEnd}>
                    Pomiń tour ⏭
                </button>
            )}

            {/* Waitlist CTA */}
            {showWaitlist && <WaitlistCTA onRestart={restart} />}

            {/* Sound Toggle */}
            <button
                className="demo-sound-toggle"
                onClick={() => {
                    ensureAudioCtx();
                    setSoundEnabled((s) => !s);
                }}
                title={soundEnabled ? "Wyłącz dźwięk" : "Włącz dźwięk"}
            >
                {soundEnabled ? "🔊" : "🔇"}
            </button>
        </div>
    );
}
