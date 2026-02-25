"use client";

import { useState } from "react";
import { Waitlist } from "@clerk/nextjs";

export default function LandingPage() {
    const [showWaitlist, setShowWaitlist] = useState(false);
    const [gdprConsent, setGdprConsent] = useState(false);

    return (
        <div className="landing">
            {/* Waitlist Modal Overlay */}
            {showWaitlist && (
                <div
                    className="waitlist-modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowWaitlist(false);
                            setGdprConsent(false);
                        }
                    }}
                >
                    <div className="waitlist-modal">
                        <button
                            className="waitlist-modal-close"
                            onClick={() => {
                                setShowWaitlist(false);
                                setGdprConsent(false);
                            }}
                            aria-label="Zamknij"
                        >
                            ✕
                        </button>

                        {/* GDPR Consent */}
                        <div className="waitlist-gdpr">
                            <label className="waitlist-gdpr-label">
                                <input
                                    type="checkbox"
                                    checked={gdprConsent}
                                    onChange={(e) => setGdprConsent(e.target.checked)}
                                    className="waitlist-gdpr-checkbox"
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

                        {/* Clerk Waitlist — only if GDPR accepted */}
                        <div style={{ opacity: gdprConsent ? 1 : 0.3, pointerEvents: gdprConsent ? "auto" : "none", transition: "opacity 0.3s" }}>
                            <Waitlist
                                appearance={{
                                    elements: {
                                        rootBox: {
                                            width: "100%",
                                        },
                                        card: {
                                            background: "#2a2a48",
                                            border: "1px solid rgba(124, 92, 252, 0.3)",
                                            borderRadius: "20px",
                                            boxShadow: "none",
                                            padding: "24px",
                                            margin: "0 auto",
                                        },
                                        headerTitle: {
                                            color: "#e8e8f0",
                                            fontFamily: "var(--font-roboto), sans-serif",
                                        },
                                        headerSubtitle: {
                                            color: "#9898b0",
                                        },
                                        formFieldLabel: {
                                            color: "#9898b0",
                                        },
                                        formFieldInput: {
                                            background: "#35355a",
                                            color: "#e8e8f0",
                                            border: "1px solid rgba(255, 255, 255, 0.15)",
                                            borderRadius: "10px",
                                        },
                                        formButtonPrimary: {
                                            background: "#7c5cfc",
                                            borderRadius: "10px",
                                            fontWeight: "600",
                                            fontSize: "0.9375rem",
                                        },
                                        footerAction: {
                                            display: "none",
                                        },
                                        footer: {
                                            display: "none",
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Logo */}
            <div className="landing-logo">
                <img src="/logo.svg" alt="Lilapu" width={56} height={56} />
            </div>

            {/* Hero */}
            <section className="landing-hero">
                <div className="landing-hero-badge">🔒 5‑poziomowe bezpieczeństwo danych</div>

                <h1>Bądź w 100% obecny z klientem. Lilapu zrobi transkrypcję rozmowy.</h1>

                <p>
                    Koniec z pisaniem w trakcie, lub po spotkaniu z klientem.
                    Lilapu automatycznie robi transkrypcję rozmowy, a prywatny czat
                    AI pomoże Ci szybko znaleźć potrzebne informacje. Wszystkie Twoje
                    notatki i nagrania są szyfrowane i niedostępne dla nikogo oprócz Ciebie.
                </p>

                <div className="landing-hero-cta">
                    <button
                        className="btn btn-primary btn-waitlist-hero"
                        onClick={() => setShowWaitlist(true)}
                    >
                        Zapisuję się na waitlistę →
                    </button>
                    <p className="landing-hero-subinfo">
                        Otrzymasz możliwość darmowego testowania Lilapu, gdy aplikacja będzie gotowa.
                    </p>
                </div>

                <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
                    <img
                        src="/demo.gif"
                        alt="Demo aplikacji Lilapu"
                        style={{
                            maxWidth: "100%",
                            width: 700,
                            borderRadius: "16px",
                            boxShadow: "0 8px 40px rgba(124, 92, 252, 0.2)",
                            border: "1px solid rgba(124, 92, 252, 0.15)",
                        }}
                    />
                </div>

                <div className="landing-trust-hero">
                    <h3>Bezpieczeństwo potwierdzone certyfikatami</h3>
                    <p>
                        Bezpieczeństwo Twoich danych jest najważniejsze, dlatego korzystamy z infrastruktury, która spełnia najwyższe standardy bezpieczeństwa.
                    </p>

                    <div className="landing-trust-badges landing-trust-badges-hero">
                        <div className="landing-trust-badge">
                            <svg className="trust-badge-icon" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2L4 10V22C4 33.1 10.8 43.3 20 46C29.2 43.3 36 33.1 36 22V10L20 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M14 24L18 28L26 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="trust-badge-name">SOC 2</span>
                            <span className="trust-badge-type">Type II</span>
                        </div>
                        <div className="landing-trust-badge">
                            <svg className="trust-badge-icon" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2L4 10V22C4 33.1 10.8 43.3 20 46C29.2 43.3 36 33.1 36 22V10L20 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M14 24L18 28L26 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="trust-badge-name">ISO</span>
                            <span className="trust-badge-type">27001</span>
                        </div>
                        <div className="landing-trust-badge">
                            <svg className="trust-badge-icon" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2L4 10V22C4 33.1 10.8 43.3 20 46C29.2 43.3 36 33.1 36 22V10L20 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M14 24L18 28L26 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="trust-badge-name">ISO</span>
                            <span className="trust-badge-type">27017</span>
                        </div>
                        <div className="landing-trust-badge">
                            <svg className="trust-badge-icon" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2L4 10V22C4 33.1 10.8 43.3 20 46C29.2 43.3 36 33.1 36 22V10L20 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M14 24L18 28L26 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="trust-badge-name">ISO</span>
                            <span className="trust-badge-type">27018</span>
                        </div>
                        <div className="landing-trust-badge">
                            <svg className="trust-badge-icon" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2L4 10V22C4 33.1 10.8 43.3 20 46C29.2 43.3 36 33.1 36 22V10L20 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M15 20V18C15 15.2 17.2 13 20 13C22.8 13 25 15.2 25 18V20" stroke="currentColor" strokeWidth="1.5" />
                                <rect x="13" y="20" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="20" cy="25" r="1.5" fill="currentColor" />
                            </svg>
                            <span className="trust-badge-name">HIPAA</span>
                            <span className="trust-badge-type">Compliant</span>
                        </div>
                        <div className="landing-trust-badge">
                            <svg className="trust-badge-icon" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2L4 10V22C4 33.1 10.8 43.3 20 46C29.2 43.3 36 33.1 36 22V10L20 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                <circle cx="20" cy="22" r="6" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M16 22L20 18L24 22L20 26Z" fill="currentColor" opacity="0.6" />
                            </svg>
                            <span className="trust-badge-name">RODO</span>
                            <span className="trust-badge-type">GDPR</span>
                        </div>
                        <div className="landing-trust-badge">
                            <svg className="trust-badge-icon" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2L4 10V22C4 33.1 10.8 43.3 20 46C29.2 43.3 36 33.1 36 22V10L20 2Z" stroke="currentColor" strokeWidth="2" fill="none" />
                                <path d="M15 18L20 14L25 18V26L20 30L15 26Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                <path d="M20 14V30M15 18L25 26M25 18L15 26" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
                            </svg>
                            <span className="trust-badge-name">CSA</span>
                            <span className="trust-badge-type">STAR</span>
                        </div>
                    </div>
                    <p className="landing-trust-disclaimer">
                        Certyfikaty dotyczą infrastruktury chmurowej, na której hostowane są dane Lilapu.
                    </p>
                </div>
            </section>

            {/* Problem */}
            <section className="landing-section landing-problem">
                <h2>Dokumentacja zabiera czas, który powinien należeć do Ciebie, Twojej rodziny, klientów.</h2>
                <div className="landing-problem-stats">
                    <div className="landing-problem-stat">
                        <span className="landing-problem-stat-value">52%</span>
                        <span className="landing-problem-stat-label">
                            terapeutów doświadcza wypalenia zawodowego
                        </span>
                    </div>
                    <div className="landing-problem-stat">
                        <span className="landing-problem-stat-value">30%</span>
                        <span className="landing-problem-stat-label">
                            czasu pracy idzie na dokumentację zamiast na klientów
                        </span>
                    </div>
                    <div className="landing-problem-stat">
                        <span className="landing-problem-stat-value">55%</span>
                        <span className="landing-problem-stat-label">
                            wskazuje zadania administracyjne jako przyczynę burnoutu
                        </span>
                    </div>
                </div>
                <p className="landing-problem-quote">
                    „Spędzam 30–60 minut na każdej notatce po sesji. Wieczory na dokumentacji
                    zamiast z rodziną. Szukam narzędzia, które to zmieni."
                </p>
                <p className="landing-problem-quote-source">
                    — komentarz psychologa na Reddit
                </p>
            </section>

            {/* Dlaczego Lilapu */}
            <section className="landing-section">
                <h2>Dlaczego Lilapu?</h2>
                <p className="landing-section-subtitle">
                    Skup się na kliencie. Resztą zajmie się AI — bezpiecznie i prywatnie.
                </p>

                <div className="landing-features">
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🎙️</div>
                        <h3>Automatyczna transkrypcja sesji</h3>
                        <p>
                            Nagrywaj spotkanie, a Lilapu zamieni rozmowę w tekst w czasie
                            rzeczywistym. Oszczędź 30–60 minut po każdej sesji.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🧠</div>
                        <h3>Prywatny czat z AI o Twoich klientach</h3>
                        <p>
                            „Co ustaliliśmy z Anną o celach?" — pytaj AI, a otrzymasz
                            odpowiedź z dokładnymi cytatami z notatek. Model AI nie
                            jest trenowany na Twoich danych. To Twój prywatny, szyfrowany czat.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🔐</div>
                        <h3>Szyfrowanie end‑to‑end</h3>
                        <p>
                            Twoje notatki, transkrypcje, rozmowy z AI są zaszyfrowane.
                            Nikt nie ma do nich dostępu. Nikt poza Tobą ich nie przeczyta.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">📁</div>
                        <h3>Folder per klient</h3>
                        <p>
                            Każdy klient ma swój folder z pełną historią sesji,
                            transkrypcjami i notatkami. Pytaj AI tylko o konkretnego
                            klienta. Żadne inne narzędzie na rynku tego nie oferuje.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🇪🇺</div>
                        <h3>Zapisy rozmów nie opuszczają UE</h3>
                        <p>
                            Serwery Lilapu są w Unii Europejskiej. Ich działanie
                            jest w pełni zgodne z RODO. Twoje transkrypcje i rozmowy
                            z AI są niewidoczne dla administratora serwera.
                        </p>
                    </div>
                </div>
            </section>

            {/* 5 Poziomów Bezpieczeństwa */}
            <section className="landing-section landing-security">
                <h2>5 poziomów bezpieczeństwa Twoich danych</h2>
                <p className="landing-section-subtitle">
                    Żadne inne narzędzie na rynku nie łączy tylu warstw ochrony w jednym
                    produkcie.<br />
                    Twoje dane są chronione na każdym etapie.
                </p>

                <div className="landing-security-levels">
                    <div className="landing-security-level">
                        <div className="landing-security-level-number">1</div>
                        <div className="landing-security-level-content">
                            <h3>Weryfikacja tożsamości</h3>
                            <p>
                                Logowanie z 2‑etapową weryfikacją (MFA) —
                                samo hasło nie wystarczy. Rejestracja chroniona
                                weryfikacją Clerk, który blokuje boty.
                            </p>
                        </div>
                        <div className="landing-security-level-icon">📱</div>
                    </div>

                    <div className="landing-security-level">
                        <div className="landing-security-level-number">2</div>
                        <div className="landing-security-level-content">
                            <h3>Szyfrowanie End‑to‑End</h3>
                            <p>
                                Wszystkie notatki, transkrypcje i rozmowy z AI
                                są zaszyfrowane Twoim prywatnym hasłem. Zapomniane
                                hasło = brak dostępu do danych. Nie da się go odzyskać.
                            </p>
                        </div>
                        <div className="landing-security-level-icon">🔐</div>
                    </div>

                    <div className="landing-security-level">
                        <div className="landing-security-level-number">3</div>
                        <div className="landing-security-level-content">
                            <h3>Dane w Unii Europejskiej</h3>
                            <p>
                                Transkrypcje spotkań i rozmowy z AI nie opuszczają UE.
                                Serwery Oracle Cloud są w Europie, w pełni zgodne z RODO.
                            </p>
                        </div>
                        <div className="landing-security-level-icon">🇪🇺</div>
                    </div>

                    <div className="landing-security-level">
                        <div className="landing-security-level-number">4</div>
                        <div className="landing-security-level-content">
                            <h3>Confidential Computing</h3>
                            <p>
                                Dane są zaszyfrowane w pamięci RAM serwera
                                podczas tworzenia transkrypcji. Technologia AMD SEV
                                sprawia, że administrator serwera nie widzi Twoich danych.
                            </p>
                        </div>
                        <div className="landing-security-level-icon">🛡️</div>
                    </div>

                    <div className="landing-security-level">
                        <div className="landing-security-level-number">5</div>
                        <div className="landing-security-level-content">
                            <h3>Blockchain Notaryzacja</h3>
                            <p>
                                Każda notatka otrzymuje kryptograficzny „odcisk palca"
                                zapisany na blockchainie. Niezależny, niemożliwy do
                                sfałszowania dowód autentyczności — na wypadek audytu
                                lub sporu.
                            </p>
                        </div>
                        <div className="landing-security-level-icon">⛓️</div>
                    </div>
                </div>
            </section>

            {/* Dla kogo */}
            <section className="landing-section landing-personas">
                <h2>Dla kogo jest Lilapu?</h2>
                <p className="landing-section-subtitle">
                    Stworzone dla profesjonalistów, którzy prowadzą poufne rozmowy
                    i potrzebują bezpiecznej dokumentacji.
                </p>

                <div className="landing-persona-cards">
                    <div className="landing-persona-card">
                        <div className="landing-persona-icon">🧠</div>
                        <h3>Psychoterapeuci i psychologowie</h3>
                        <p className="landing-persona-pain">
                            „Wieczory spędzam na notatkach zamiast z rodziną.
                            Podczas sesji notuję zamiast słuchać."
                        </p>
                        <p className="landing-persona-solution">
                            Lilapu nagrywa sesję, tworzy transkrypcję i organizuje notatki
                            per klient. Ty skupiasz się na relacji terapeutycznej.
                        </p>
                    </div>

                    <div className="landing-persona-card">
                        <div className="landing-persona-icon">🎯</div>
                        <h3>Coachowie i mentorzy</h3>
                        <p className="landing-persona-pain">
                            „Mam 20 klientów. Nie pamiętam co ustaliliśmy 3 tygodnie temu.
                            Klient oczekuje spersonalizowanego follow‑upu."
                        </p>
                        <p className="landing-persona-solution">
                            Każdy klient ma folder z historią sesji. Pytasz AI „co Anna
                            powiedziała o swoich celach?" — i dostajesz odpowiedź.
                        </p>
                    </div>

                    <div className="landing-persona-card">
                        <div className="landing-persona-icon">⚖️</div>
                        <h3>Prawnicy i kancelarie</h3>
                        <p className="landing-persona-pain">
                            „Nie mogę używać zwykłych narzędzi AI — tajemnica adwokacka.
                            Manualna transkrypcja jest droga i wolna."
                        </p>
                        <p className="landing-persona-solution">
                            Szyfrowanie E2E + blockchain notaryzacja = niepodważalny dowód
                            autentyczności zapisu. Zgodne z wymogami poufności.
                        </p>
                    </div>
                </div>
            </section>

            {/* Waitlist CTA */}
            <section id="waitlist" className="landing-waitlist">
                <h2>Chcesz skupić się w 100% na klientach, a nie myśleć o robieniu notatek?</h2>
                <p>
                    Zapisz się na listę oczekujących i bądź wśród pierwszych, którzy
                    przetestują Lilapu.
                </p>
                <button
                    className="btn btn-primary btn-waitlist-hero"
                    onClick={() => setShowWaitlist(true)}
                >
                    Zapisuję się na waitlistę →
                </button>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>
                    © 2026 Lilapu ·{" "}
                    <a href="/polityka-prywatnosci">Polityka Prywatności</a> ·{" "}
                    <a href="/regulamin">Regulamin</a> ·{" "}
                    <a href="/polityka-ciasteczek">Polityka Ciasteczek</a>
                </p>
            </footer>
        </div>
    );
}
