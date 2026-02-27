"use client";

import { useState, useEffect, useCallback } from "react";
import "./demo-presentation.css";

/* ═══════════════════════════════════════════════════
   SLIDES DATA
   ═══════════════════════════════════════════════════ */

interface Slide {
    id: string;
    type: "hero" | "problem" | "features" | "security" | "cta";
    image: string;
}

const SLIDES: Slide[] = [
    { id: "hero", type: "hero", image: "/presentation/slide-1-hero.png" },
    { id: "problem", type: "problem", image: "/presentation/slide-2-problem.png" },
    { id: "features", type: "features", image: "/presentation/slide-3-features.png" },
    { id: "security", type: "security", image: "/presentation/slide-4-security.png" },
    { id: "cta", type: "cta", image: "/presentation/slide-5-cta.png" },
];

/* ═══════════════════════════════════════════════════
   SLIDE 1 — HERO (growth.design title page)
   ═══════════════════════════════════════════════════ */

function SlideHero({ slide }: { slide: Slide }) {
    return (
        <div className="pres-slide pres-slide--hero">
            <div className="pres-hero-badge">🔒 Prywatny asystent AI</div>

            <h1 className="pres-hero-title">
                Bądź w 100% obecny<br />z klientem.
            </h1>

            <p className="pres-hero-subtitle">
                Lilapu robi transkrypcję rozmowy, a prywatny AI pomoże Ci szybko
                znaleźć potrzebne informacje. A jeśli nie nagrywasz rozmów — zeskanuj
                notatki ze swojego zeszytu i rozmawiaj o nich z AI.
            </p>

            <div className="pres-hero-duration">
                ⏱️ Czas prezentacji: 1 min
            </div>

            <div className="pres-hero-layout">
                <div className="pres-hero-image-wrap">
                    <img src={slide.image} alt="" className="pres-hero-image" />
                </div>

                <div className="pres-hero-keyboard-hint">
                    <div className="pres-hero-keys">
                        <div className="pres-hero-key pres-hero-key--spacer" />
                        <div className="pres-hero-key">▲</div>
                        <div className="pres-hero-key pres-hero-key--spacer" />
                        <div className="pres-hero-key">◄</div>
                        <div className="pres-hero-key">▼</div>
                        <div className="pres-hero-key pres-hero-key--active">►</div>
                    </div>
                    <div className="pres-hero-hint-text">
                        Użyj<br />
                        <strong>strzałek na klawiaturze</strong>
                        aby nawigować!
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SLIDE 2 — PROBLEM
   ═══════════════════════════════════════════════════ */

function SlideProblem({ slide }: { slide: Slide }) {
    return (
        <div className="pres-slide pres-slide--content">
            <div className="pres-content-supertitle">PROBLEM</div>
            <img src={slide.image} alt="" className="pres-content-image" />
            <h2 className="pres-content-title">Dokumentacja kradnie Twój czas</h2>
            <div className="pres-stats-row">
                <div className="pres-stat">
                    <span className="pres-stat-value">52%</span>
                    <span className="pres-stat-label">terapeutów doświadcza wypalenia zawodowego</span>
                </div>
                <div className="pres-stat">
                    <span className="pres-stat-value">30%</span>
                    <span className="pres-stat-label">czasu pracy idzie na dokumentację</span>
                </div>
                <div className="pres-stat">
                    <span className="pres-stat-value">55%</span>
                    <span className="pres-stat-label">wskazuje admin jako przyczynę burnoutu</span>
                </div>
            </div>
            <p className="pres-quote">
                „Spędzam 30–60 minut na każdej notatce po sesji. Wieczory na dokumentacji
                zamiast z rodziną. Szukam narzędzia, które to zmieni."
            </p>
            <p className="pres-quote-source">— komentarz psychologa na Reddit</p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SLIDE 3 — FEATURES
   ═══════════════════════════════════════════════════ */

function SlideFeatures({ slide }: { slide: Slide }) {
    return (
        <div className="pres-slide pres-slide--content">
            <div className="pres-content-supertitle">TWOJE SUPERMOCE</div>
            <img src={slide.image} alt="" className="pres-content-image" />
            <h2 className="pres-content-title">Co daje Ci Lilapu?</h2>
            <div className="pres-features-grid">
                <div className="pres-feature-chip">
                    <span className="pres-feature-chip-icon">🎙️</span>
                    <span className="pres-feature-chip-text">Automatyczna transkrypcja rozmów w czasie rzeczywistym</span>
                </div>
                <div className="pres-feature-chip">
                    <span className="pres-feature-chip-icon">🧠</span>
                    <span className="pres-feature-chip-text">Prywatny czat AI o Twoich klientach i notatkach</span>
                </div>
                <div className="pres-feature-chip">
                    <span className="pres-feature-chip-icon">📁</span>
                    <span className="pres-feature-chip-text">Oddzielny folder per klient z pełną historią</span>
                </div>
                <div className="pres-feature-chip">
                    <span className="pres-feature-chip-icon">📷</span>
                    <span className="pres-feature-chip-text">Skan odręcznych notatek z zeszytu aparatem</span>
                </div>
                <div className="pres-feature-chip">
                    <span className="pres-feature-chip-icon">🔐</span>
                    <span className="pres-feature-chip-text">Szyfrowanie end-to-end — tylko Ty masz dostęp</span>
                </div>
                <div className="pres-feature-chip">
                    <span className="pres-feature-chip-icon">🇪🇺</span>
                    <span className="pres-feature-chip-text">Dane nie opuszczają Unii Europejskiej</span>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SLIDE 4 — SECURITY
   ═══════════════════════════════════════════════════ */

function SlideSecurity({ slide }: { slide: Slide }) {
    const levels = [
        { num: 1, label: "MFA — weryfikacja tożsamości", icon: "📱" },
        { num: 2, label: "Szyfrowanie End-to-End", icon: "🔐" },
        { num: 3, label: "Dane w Unii Europejskiej", icon: "🇪🇺" },
        { num: 4, label: "Confidential Computing", icon: "🛡️" },
        { num: 5, label: "Zero-Retention audio", icon: "🗑️" },
        { num: 6, label: "Blockchain notaryzacja", icon: "⛓️" },
    ];

    return (
        <div className="pres-slide pres-slide--content">
            <div className="pres-content-supertitle">BEZPIECZEŃSTWO</div>
            <img src={slide.image} alt="" className="pres-content-image" />
            <h2 className="pres-content-title">6 poziomów ochrony Twoich danych</h2>
            <p className="pres-content-body">
                Żadne inne narzędzie na rynku nie łączy tylu warstw ochrony w jednym produkcie.
            </p>
            <div className="pres-security-list">
                {levels.map((l) => (
                    <div key={l.num} className="pres-security-item">
                        <div className="pres-security-num">{l.num}</div>
                        <span>{l.icon} {l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SLIDE 5 — CTA
   ═══════════════════════════════════════════════════ */

function SlideCTA({ slide, onStart }: { slide: Slide; onStart: () => void }) {
    return (
        <div className="pres-slide pres-slide--cta">
            <img src={slide.image} alt="" className="pres-content-image" style={{ width: 240, height: 240 }} />
            <h2 className="pres-content-title">Gotowy? Sprawdź jak działa Lilapu!</h2>
            <p className="pres-content-body">
                Teraz zobaczysz interaktywne demo aplikacji.<br />
                Przeprowadzę Cię przez wszystkie funkcje krok po kroku.
            </p>
            <button className="pres-cta-btn" onClick={onStart}>
                Sprawdź jak działa Lilapu →
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN PRESENTATION COMPONENT
   ═══════════════════════════════════════════════════ */

export default function DemoPresentation({
    onComplete,
}: {
    onComplete: () => void;
}) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState<"forward" | "back">("forward");
    const [exiting, setExiting] = useState(false);

    const slide = SLIDES[currentSlide];
    const isFirst = currentSlide === 0;
    const isLast = currentSlide === SLIDES.length - 1;

    const goNext = useCallback(() => {
        if (isLast) return;
        setDirection("forward");
        setCurrentSlide((s) => s + 1);
    }, [isLast]);

    const goBack = useCallback(() => {
        if (isFirst) return;
        setDirection("back");
        setCurrentSlide((s) => s - 1);
    }, [isFirst]);

    const handleComplete = useCallback(() => {
        setExiting(true);
        setTimeout(() => {
            onComplete();
        }, 400);
    }, [onComplete]);

    const handleSkip = useCallback(() => {
        handleComplete();
    }, [handleComplete]);

    // Keyboard navigation
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight" || e.key === "Enter") {
                if (isLast) {
                    handleComplete();
                } else {
                    goNext();
                }
            } else if (e.key === "ArrowLeft") {
                goBack();
            } else if (e.key === "Escape") {
                handleSkip();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [goNext, goBack, isLast, handleComplete, handleSkip]);

    const renderSlideContent = () => {
        const key = `slide-${currentSlide}-${direction}`;
        switch (slide.type) {
            case "hero":
                return <SlideHero key={key} slide={slide} />;
            case "problem":
                return <SlideProblem key={key} slide={slide} />;
            case "features":
                return <SlideFeatures key={key} slide={slide} />;
            case "security":
                return <SlideSecurity key={key} slide={slide} />;
            case "cta":
                return <SlideCTA key={key} slide={slide} onStart={handleComplete} />;
            default:
                return null;
        }
    };

    return (
        <div className={`pres-overlay ${exiting ? "pres-overlay-exit" : ""}`}>
            {/* Skip button */}
            <button className="pres-skip-btn" onClick={handleSkip}>
                Pomiń ⏭
            </button>

            {/* Slide (full-page) */}
            {renderSlideContent()}

            {/* Previous arrow */}
            {!isFirst && (
                <button
                    className="pres-nav-arrow pres-nav-prev"
                    onClick={goBack}
                    aria-label="Poprzedni slajd"
                >
                    ‹
                </button>
            )}

            {/* Next arrow */}
            {!isLast && (
                <button
                    className="pres-nav-arrow pres-nav-next"
                    onClick={goNext}
                    aria-label="Następny slajd"
                >
                    ›
                </button>
            )}

            {/* Bottom bar: progress dots + counter */}
            <div className="pres-bottom-bar">
                <div className="pres-progress-dots">
                    {SLIDES.map((_, i) => (
                        <div
                            key={i}
                            className={`pres-progress-dot ${i === currentSlide ? "active" : ""} ${i < currentSlide ? "completed" : ""}`}
                            onClick={() => {
                                setDirection(i > currentSlide ? "forward" : "back");
                                setCurrentSlide(i);
                            }}
                        />
                    ))}
                </div>
                <span className="pres-slide-counter">
                    {currentSlide + 1} / {SLIDES.length}
                </span>
            </div>
        </div>
    );
}
