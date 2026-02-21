"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";

export default function LandingPage() {
    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "success" | "exists" | "error">(
        "idle"
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const joinWaitlist = useMutation(api.waitlist.join);
    const waitlistCount = useQuery(api.waitlist.count);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const result = await joinWaitlist({ email: email.trim(), source: "landing" });
            setStatus(result === "ok" ? "success" : "exists");
            if (result === "ok") setEmail("");
        } catch {
            setStatus("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="landing">
            {/* Hero */}
            <section className="landing-hero">
                <div className="landing-hero-badge">🔒 100% Prywatność — Zero Chmury</div>

                <h1>Twój prywatny asystent wiedzy z notatek głosowych</h1>

                <p>
                    Nagrywaj spotkania, rozmowy z klientami i notatki. Lilapu transkrybuje
                    je lokalnie na Twoim komputerze i pozwala pytać AI o ich treść. Żadne
                    dane nie opuszczają Twojego urządzenia.
                </p>

                <div className="landing-hero-cta">
                    <Link href="/dashboard" className="btn btn-primary">
                        ✨ Wypróbuj za darmo
                    </Link>
                    <a href="#waitlist" className="btn btn-secondary">
                        📩 Dołącz do waitlisty
                    </a>
                </div>

                <div className="landing-stats">
                    <div className="landing-stat">
                        <div className="landing-stat-value">$0</div>
                        <div className="landing-stat-label">koszt infrastruktury</div>
                    </div>
                    <div className="landing-stat">
                        <div className="landing-stat-value">100%</div>
                        <div className="landing-stat-label">lokalne AI</div>
                    </div>
                    <div className="landing-stat">
                        <div className="landing-stat-value">
                            {waitlistCount !== undefined ? waitlistCount + "+" : "..."}
                        </div>
                        <div className="landing-stat-label">osób na waitliście</div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="landing-section">
                <h2>Dlaczego Lilapu?</h2>
                <p className="landing-section-subtitle">
                    Wszystko czego potrzebujesz od AI asystenta — bez subskrypcji, bez chmury, bez śledzenia.
                </p>

                <div className="landing-features">
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🎙️</div>
                        <h3>Transkrypcja na żywo</h3>
                        <p>
                            Nagrywaj w przeglądarce, a whisper.cpp zamieni Twój głos w tekst
                            w czasie rzeczywistym. Po polsku, po angielsku, po niemiecku.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🧠</div>
                        <h3>Czat z AI o notatkach</h3>
                        <p>
                            Zadaj pytanie, a Bielik-7B przeszuka Twoje notatki i odpowie
                            z precyzyjnymi cytatami źródłowymi. Jak ChatGPT, ale po polsku
                            i na Twoim sprzęcie.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🔐</div>
                        <h3>Zero danych w chmurze</h3>
                        <p>
                            Cała obróbka AI dzieje się lokalnie na Twoim Macu. Twoje nagrania,
                            transkrypcje i rozmowy z AI nigdy nie opuszczają Twojego komputera.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">⚡</div>
                        <h3>$0 miesięcznie</h3>
                        <p>
                            Żadnych subskrypcji, żadnych ukrytych kosztów. Lilapu działa na
                            open-source modelach AI, które uruchamiasz bezpłatnie na swoim sprzęcie.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">📁</div>
                        <h3>Projekty i organizacja</h3>
                        <p>
                            Organizuj notatki w projekty: klienci, sprawy, sesje terapeutyczne.
                            Każdy projekt ma własną bazę wiedzy do przeszukiwania.
                        </p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon">🇵🇱</div>
                        <h3>Stworzony po polsku</h3>
                        <p>
                            Interfejs, transkrypcja i AI są zoptymalizowane pod język polski.
                            Pierwszy tego typu narzędzie w Polsce — stworzone przez Polaka,
                            dla Polaków.
                        </p>
                    </div>
                </div>
            </section>

            {/* Waitlist */}
            <section id="waitlist" className="landing-waitlist">
                <h2>Zapisz się na waitlistę</h2>
                <p>
                    Bądź pierwszym który wypróbuje Lilapu. Otrzymasz wczesny dostęp
                    i ekskluzywne aktualizacje.
                </p>

                {status === "success" ? (
                    <div className="waitlist-success">
                        ✅ Dziękuję! Jesteś na liście. Odezwiemy się wkrótce.
                    </div>
                ) : status === "exists" ? (
                    <div className="waitlist-success" style={{ color: "var(--accent)" }}>
                        💜 Już jesteś na liście! Dziękuję za cierpliwość.
                    </div>
                ) : (
                    <form className="waitlist-form" onSubmit={handleSubmit}>
                        <input
                            type="email"
                            placeholder="twój@email.pl"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "⏳" : "Dołącz"}
                        </button>
                    </form>
                )}
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>
                    © 2026 Lilapu · <a href="https://lilapu.com" style={{ color: "var(--accent)" }}>lilapu.com</a> ·
                    Prywatność-first, zawsze.
                </p>
            </footer>
        </div>
    );
}
