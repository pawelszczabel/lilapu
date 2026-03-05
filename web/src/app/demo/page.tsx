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
        story: "To jest Lilapu — Twój prywatny asystent AI. Wszystko w jednym miejscu: nagrywaj i transkrybuj rozmowy z podsumowaniem, a jeśli nie chcesz nagrywać rozmów, to zeskanuj swoje notatki z zeszytu. Rób nowe notatki i rozmawiaj z AI o swoich dokumentach — tylko Ty masz dostęp do swoich danych. Rozmowy z AI są prywatne i bezpieczne!",
        proTip: "Lilapu to natywna aplikacja na macOS i Windows. Wszystkie dane są szyfrowane — nikt oprócz Ciebie nie ma do nich dostępu.",
        cardPosition: "center",
    },
    {
        id: "new-client",
        targetId: "demo-new-client-btn",
        emoji: "👤",
        title: "Nowy klient / pacjent",
        story: "Każda osoba, sprawa lub projekt to oddzielny workspace. Tworzysz go jednym kliknięciem — i od razu masz osobne miejsce na nagrania, notatki i czaty z AI.",
        proTip: "Dodajesz klienta raz, a potem wszystko co nagrasz, zapiszesz lub zapytasz AI — automatycznie trafia pod jego profil, widzisz tylko jego dane.",
        cardPosition: "right",
    },
    {
        id: "new-folder",
        targetId: "demo-new-folder-btn",
        emoji: "📂",
        title: "Foldery — tworzysz katalogi",
        story: "Grupuj klientów w folderach. Nazwij folder tak, żebyś mógł szybko odnaleźć odpowiednią osobę.",
        proTip: "Kancelaria prawna? Folder = temat sprawy, osoby w środku = osoby biorące udział w sprawie. Psycholog? Folder = miejsce pracy, osoby w środku = pacjenci których przyjmuje w danym miejscu.",
        cardPosition: "right",
    },
    {
        id: "tab-record",
        targetId: "demo-tab-record",
        emoji: "🎙️",
        title: "Nagrywaj — transkrypcja na żywo",
        story: "Kliknij 'Nagrywaj' i zacznij rozmowę. Twoja rozmowa z klientem zamienia się w tekst niemal w czasie rzeczywistym. Koniec z ręcznym spisywaniem notatek ze spotkań. Po zakończonej rozmowie możesz szybko wygenerować podsumowanie spotkania.",
        proTip: "Transkrypcję, podsumowanie i inne notatki możesz dodać jako kontekst do rozmowy z AI, korzystając ze znaku @. Możesz też ponownie odtworzyć nagraną rozmowę. Wszystkie rozmowy są szyfrowane i poufne.",
        tab: "record",
        cardPosition: "bottom",
    },
    {
        id: "tab-transcriptions",
        targetId: "demo-tab-transcriptions",
        emoji: "📝",
        title: "Transkrypcje — Twoja pamięć",
        story: "Każde nagranie to automatyczna transkrypcja. Wracasz do niej kiedy chcesz. Możesz je eksportować, oraz importować z dysku inne nagrania (dostaniesz ich transkrypcję z podsumowaniem). Transkrypcje to Twój drugi mózg.",
        proTip: "Każda transkrypcja jest zabezpieczona kryptograficznie — czyli zamieniona w zaszyfrowany kod, co oznacza, że tylko Ty widzisz treść transkrypcji.",
        tab: "transcriptions",
        cardPosition: "bottom",
    },
    {
        id: "tab-notes",
        targetId: "demo-tab-notes",
        emoji: "📓",
        title: "Notatki — pisz, nagrywaj, importuj, skanuj",
        story: "Pisz lub nagrywaj notatki, importuj pliki .txt/.md/.docx, a nawet zeskanuj odręcznie pisane notatki aparatem/kamerą komputera. Wszystko w jednym miejscu.",
        proTip: `Każda notatka otrzymuje kryptograficzny \u201Eodcisk palca\u201D zapisany na blockchainie (notaryzacja). Niezależny, niemożliwy do sfałszowania dowód autentyczności \u2014 dla bezpieczeństwa Twojego i klientów.`,
        tab: "notes",
        cardPosition: "bottom",
    },
    {
        id: "tab-chat",
        targetId: "demo-tab-chat",
        emoji: "💬",
        title: "Czat AI — pytaj o swoje notatki",
        story: "Kliknij @. Dodaj potrzebne notatki. Zapytaj AI: 'Co ustaliliśmy z klientem X?', 'Podsumuj ostatnie spotkanie', 'Znajdź wzmianki o Y'. AI odpowiada na podstawie TWOICH dokumentów. Rozmowę z AI możesz potem dodać do notatek.",
        proTip: "AI działa wyłącznie na Twoich notatkach dotyczących konkretnej osoby. Te rozmowy są prywatne, szyfrowane, nigdy nie trafią na serwery BigTechów.",
        tab: "chat",
        cardPosition: "bottom",
    },
    {
        id: "waitlist",
        targetId: "demo-waitlist",
        emoji: "🚀",
        title: "Tak działa Lilapu!",
        story: "Gratulacje! Ale to dopiero przedsmak. Dołącz do osób z wczesnym dostępem — startujemy wkrótce.",
        proTip: "Pierwsi użytkownicy przetestują Lilapu za darmo i dostaną najlepszą z możliwych ofert.",
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
function MockRecordContent({ activeStep }: { activeStep: string }) {
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
function MockTranscriptionsContent() {
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
function MockNotesContent({ activeStep }: { activeStep: string }) {
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
function MockChatContent({ activeStep }: { activeStep: string }) {
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
    transitioning,
}: {
    step: OnboardingStep;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    transitioning: boolean;
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

    const isFirstStep = stepIndex === 0;
    const isLastRealStep = stepIndex === totalSteps - 2; // before waitlist
    const remaining = totalSteps - stepIndex - 1;

    return (
        <div
            ref={cardRef}
            className={`demo-story-card ${transitioning ? "demo-story-card-exit" : "demo-story-card-enter"}`}
            style={{
                top: step.cardPosition === "center" ? "50%" : position.top,
                left: step.cardPosition === "center" ? "50%" : position.left,
                transform: step.cardPosition === "center" ? "translate(-50%, -50%)" : "none",
            }}
        >
            {isFirstStep && (
                <div className="demo-story-card-supertitle">POZNAJ LILAPU</div>
            )}
            <div className="demo-story-card-emoji">{step.emoji}</div>
            <h3 className="demo-story-card-title">{step.title}</h3>
            <p className="demo-story-card-story">{step.story}</p>
            <div className="demo-story-card-protip">
                <div className="demo-story-card-protip-label">💡 Pro Tip</div>
                {step.proTip}
            </div>
            {isFirstStep && (
                <div className="demo-story-card-subtitle">SPRAWDŹ W KILKU KROKACH JAK DZIAŁA LILAPU</div>
            )}
            <div className="demo-story-card-actions">
                <div>
                    {stepIndex > 0 && (
                        <button className="demo-story-card-back" onClick={onBack}>
                            ← Wstecz
                        </button>
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span className="demo-story-card-remaining">{remaining > 0 ? `${remaining} ${remaining === 1 ? "krok" : remaining <= 4 ? "kroki" : "kroków"} do mety` : ""}</span>
                    <button className="demo-story-card-next" onClick={onNext}>
                        {isFirstStep ? "Sprawdzam →" : isLastRealStep ? "Zakończ tour →" : "Dalej →"}
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
    const [gdprConsent, setGdprConsent] = useState(false);
    const [gdprError, setGdprError] = useState(false);
    const [apiError, setApiError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        // Validate GDPR checkbox
        if (!gdprConsent) {
            setGdprError(true);
            return;
        }

        setGdprError(false);
        setApiError("");
        setSubmitting(true);

        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emailAddress: email }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Błąd zapisu");
            }

            setSubmitted(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Błąd zapisu";
            if (msg.includes("already")) {
                setApiError("Ten e-mail jest już na liście oczekujących!");
            } else {
                setApiError("Błąd zapisu. Spróbuj ponownie.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="demo-waitlist-overlay">
            <Confetti />
            <div className="demo-waitlist-card">
                <div className="demo-waitlist-emoji">🎉</div>
                <h2 className="demo-waitlist-title">Tak działa Lilapu!</h2>
                <p className="demo-waitlist-desc">
                    Gratulacje! Ale to dopiero przedsmak. Dołącz do osób z wczesnym dostępem —
                    startujemy wkrótce. Pierwsi użytkownicy przetestują Lilapu za darmo i dostaną <strong>najlepszą z możliwych ofert</strong>.
                </p>

                {!submitted ? (
                    <>
                        <form className="demo-waitlist-form" onSubmit={handleSubmit}>
                            <div className="demo-waitlist-input-wrapper">
                                <input
                                    className="demo-waitlist-input"
                                    type="email"
                                    placeholder="twoj@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button className="demo-waitlist-submit" type="submit" disabled={submitting}>
                                {submitting ? "⏳" : "Dołącz do Waitlist"}
                            </button>
                        </form>

                        {/* GDPR Consent */}
                        <div className={`demo-waitlist-gdpr ${gdprError ? "demo-waitlist-gdpr-error" : ""}`}>
                            <label className="demo-waitlist-gdpr-label">
                                <input
                                    type="checkbox"
                                    checked={gdprConsent}
                                    onChange={(e) => {
                                        setGdprConsent(e.target.checked);
                                        if (e.target.checked) setGdprError(false);
                                    }}
                                    className="demo-waitlist-gdpr-checkbox"
                                />
                                <span>
                                    Wyrażam zgodę na przetwarzanie mojego adresu e‑mail
                                    w celu informowania o dostępności Lilapu, zgodnie
                                    z{" "}
                                    <a
                                        href="/polityka-prywatnosci"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Polityką Prywatności
                                    </a>
                                    . Mogę wycofać zgodę w dowolnym momencie.
                                </span>
                            </label>
                        </div>

                        {gdprError && (
                            <p className="demo-waitlist-error">
                                ⚠️ Zaznacz zgodę na przetwarzanie danych, aby dołączyć do waitlisty.
                            </p>
                        )}
                        {apiError && (
                            <p className="demo-waitlist-error">{apiError}</p>
                        )}
                    </>
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
   MAIN DEMO COMPONENT (reusable as overlay or standalone page)
   ═══════════════════════════════════════════════════ */

export function DemoContent({ onClose }: { onClose?: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [activeTab, setActiveTab] = useState<string>("notes");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
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
        if (transitioning) return;
        const ctx = ensureAudioCtx();
        if (soundEnabled) playClickSound(ctx);

        if (currentStep === STEPS.length - 2) {
            // Going to waitlist
            setTransitioning(true);
            setTimeout(() => {
                if (soundEnabled) playSuccessSound(ctx);
                setShowWaitlist(true);
                setCurrentStep(STEPS.length - 1);
                setTransitioning(false);
            }, 200);
        } else if (currentStep < STEPS.length - 1) {
            setTransitioning(true);
            setTimeout(() => {
                if (soundEnabled) playWhooshSound(ctx);
                setCurrentStep((s) => s + 1);
                setTransitioning(false);
            }, 200);
        }
    }, [currentStep, soundEnabled, ensureAudioCtx, transitioning]);

    const goBack = useCallback(() => {
        if (transitioning) return;
        const ctx = ensureAudioCtx();
        if (soundEnabled) playClickSound(ctx);
        if (currentStep > 0) {
            setTransitioning(true);
            setTimeout(() => {
                setCurrentStep((s) => s - 1);
                setShowWaitlist(false);
                setTransitioning(false);
            }, 200);
        }
    }, [currentStep, soundEnabled, ensureAudioCtx, transitioning]);

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
            else if (e.key === "Escape") {
                if (onClose) onClose();
                else skipToEnd();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [goNext, goBack, skipToEnd, onClose]);

    // Lock body scroll when demo is active
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const progress = ((currentStep + 1) / STEPS.length) * 100;

    return (
        <div className="demo-page" style={onClose ? { position: "fixed", inset: 0, zIndex: 50000 } : undefined}>
            {/* Ambient Glow */}
            <div className="demo-glow" />
            <div className="demo-glow-accent" />

            {/* Close button (when used as overlay) */}
            {onClose && (
                <button
                    className="demo-story-card-skip"
                    onClick={onClose}
                    style={{ top: 12, left: 20, right: "auto", bottom: "auto", zIndex: 50001 }}
                >
                    ← Zamknij demo
                </button>
            )}

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
                    <span className="demo-titlebar-text">Lilapu — Twój prywatny asystent AI</span>
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

            {/* Fog Overlay (step 0 only — covers background with soft mist) */}
            {!showWaitlist && currentStep === 0 && (
                <div className="demo-fog-overlay" />
            )}

            {/* Spotlight Overlay — blocks interaction with background, does NOT advance steps */}
            {!showWaitlist && (
                <div className="demo-spotlight-overlay" />
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
                    transitioning={transitioning}
                />
            )}

            {/* Skip Button */}
            {!showWaitlist && !onClose && (
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

            {/* Mobile — Desktop Only */}
            <div className="demo-mobile-block">
                <div className="demo-mobile-block-content">
                    <img src="/demo-mobile.png" alt="" className="demo-mobile-block-avatar" />
                    <h2 className="demo-mobile-block-title">Wersja demo działa tylko na desktop</h2>
                    <p className="demo-mobile-block-desc">Sprawdź Lilapu na komputerze.<br />Albo przeczytaj więcej tutaj: {onClose ? <button onClick={onClose} className="demo-mobile-block-link" style={{ background: "none", border: "none", cursor: "pointer" }}>Wróć do strony</button> : <a href="/" className="demo-mobile-block-link">lilapu.com</a>}.<br /><br />Dziękuję za wyrozumiałość! 🙏</p>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   PAGE COMPONENT (standalone /demo route)
   ═══════════════════════════════════════════════════ */

export default function DemoPage() {
    return <DemoContent />;
}
