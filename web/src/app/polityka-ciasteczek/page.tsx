export default function PolitykaCiasteczek() {
    return (
        <div className="landing" style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
            <div style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.7 }}>
                <a href="/" style={{ color: "var(--accent)", display: "inline-block", marginBottom: "2rem", fontSize: "0.95rem" }}>← Wróć na stronę główną</a>

                <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    Polityka Plików Cookie
                </h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", fontSize: "0.95rem" }}>
                    Ostatnia aktualizacja: 27 lutego 2026
                </p>

                {/* 1. Czym są cookies */}
                <Section title="1. Czym są pliki cookie?">
                    <p>
                        Pliki cookie to małe pliki tekstowe zapisywane na Twoim urządzeniu przez przeglądarkę.
                        Służą do zapamiętywania preferencji, utrzymywania sesji logowania oraz analizy
                        sposobu korzystania z aplikacji.
                    </p>
                </Section>

                {/* 2. Jakich cookies używamy */}
                <Section title="2. Jakich plików cookie używamy">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)", textAlign: "left" }}>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Kategoria</th>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Dostawca</th>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Cel</th>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Czas</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: "var(--text-secondary)" }}>
                            {/* Niezbędne */}
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }} rowSpan={2}><strong>Niezbędne</strong></td>
                                <td style={{ padding: "8px 12px" }}>Clerk</td>
                                <td style={{ padding: "8px 12px" }}>Sesja logowania, uwierzytelnianie</td>
                                <td style={{ padding: "8px 12px" }}>Sesja</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Lilapu</td>
                                <td style={{ padding: "8px 12px" }}>Zapamiętanie zgody na cookies, preferencje interfejsu</td>
                                <td style={{ padding: "8px 12px" }}>1 rok</td>
                            </tr>
                            {/* Analityczne */}
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}><strong>Analityczne</strong></td>
                                <td style={{ padding: "8px 12px" }}>PostHog (serwery UE)</td>
                                <td style={{ padding: "8px 12px" }}>Analiza ruchu na stronach publicznych (landing, demo). Nie działa wewnątrz aplikacji (dashboard).</td>
                                <td style={{ padding: "8px 12px" }}>1 rok</td>
                            </tr>
                            {/* Marketingowe */}
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }} rowSpan={2}><strong>Marketingowe</strong></td>
                                <td style={{ padding: "8px 12px" }}>Google Ads</td>
                                <td style={{ padding: "8px 12px" }}>Remarketing, śledzenie konwersji z reklam Google</td>
                                <td style={{ padding: "8px 12px" }}>Do 2 lat</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Meta Ads (Facebook/Instagram)</td>
                                <td style={{ padding: "8px 12px" }}>Remarketing, śledzenie konwersji z reklam Meta</td>
                                <td style={{ padding: "8px 12px" }}>Do 2 lat</td>
                            </tr>
                        </tbody>
                    </table>
                </Section>

                {/* 3. Zgoda */}
                <Section title="3. Zgoda na pliki cookie">
                    <p>
                        Przy pierwszej wizycie wyświetlamy baner z możliwością wyboru:
                    </p>
                    <ul>
                        <li><strong>„Akceptuję wszystkie"</strong> — włącza cookies niezbędne, analityczne i marketingowe.</li>
                        <li><strong>„Tylko niezbędne"</strong> — włącza wyłącznie cookies niezbędne do działania aplikacji. PostHog, Google Ads i Meta Ads nie są ładowane.</li>
                    </ul>
                    <p>
                        Pliki cookie niezbędne nie wymagają zgody — są konieczne do prawidłowego działania aplikacji.
                        Pliki cookie analityczne i marketingowe są ładowane <strong>wyłącznie po wyrażeniu zgody</strong>.
                    </p>
                </Section>

                {/* 4. PostHog */}
                <Section title="4. PostHog">
                    <p>
                        PostHog (PostHog Inc.) służy do analizy ruchu na stronach publicznych Lilapu (landing page, demo).
                        <strong> PostHog nie działa wewnątrz aplikacji (dashboard)</strong> — Twoja aktywność w aplikacji nie jest śledzona.
                    </p>
                    <p>
                        Dane są przetwarzane na serwerach w <strong>UE (Frankfurt)</strong> — dane analityczne nie
                        opuszczają Europejskiego Obszaru Gospodarczego. Ładowane wyłącznie po wyrażeniu zgody.
                    </p>
                    <p>
                        Więcej informacji: <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Polityka prywatności PostHog</a>.
                    </p>
                </Section>

                {/* 5. Google Ads */}
                <Section title="5. Google Ads">
                    <p>
                        Google Ads (Google LLC) umożliwia śledzenie konwersji i remarketing — wyświetlanie reklam Lilapu
                        osobom, które wcześniej odwiedziły stronę.
                    </p>
                    <p>
                        Dane są przetwarzane przez Google LLC (USA). Możesz zarządzać preferencjami reklam w{" "}
                        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>ustawieniach reklam Google</a>.
                    </p>
                </Section>

                {/* 6. Meta Ads */}
                <Section title="6. Meta Ads (Facebook / Instagram)">
                    <p>
                        Meta Pixel (Meta Platforms Inc.) umożliwia śledzenie konwersji i remarketing — wyświetlanie reklam Lilapu
                        na Facebooku i Instagramie osobom, które odwiedziły stronę.
                    </p>
                    <p>
                        Dane są przetwarzane przez Meta Platforms Inc. (USA) zgodnie z{" "}
                        <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Polityką prywatności Meta</a>.
                        Meta uczestniczy w EU-US Data Privacy Framework.
                    </p>
                </Section>

                {/* 6. Zmiana ustawień */}
                <Section title="6. Jak zmienić ustawienia cookies?">
                    <p>Możesz zmienić ustawienia plików cookie na kilka sposobów:</p>
                    <ul>
                        <li><strong>Usunięcie cookies z przeglądarki</strong> — przy następnej wizycie baner pojawi się ponownie.</li>
                        <li><strong>Ustawienia przeglądarki</strong> — w każdej przeglądarce można zablokować lub usunąć pliki cookie (Chrome, Firefox, Safari, Edge).</li>
                        <li><strong>Narzędzia dostawców</strong> — Google i Meta oferują dedykowane ustawienia prywatności (linki powyżej).</li>
                    </ul>
                </Section>

                {/* 7. Kontakt */}
                <Section title="7. Kontakt">
                    <p>
                        W razie pytań dotyczących plików cookie skontaktuj się z nami:{" "}
                        <a href="mailto:pawelszczabel@gmail.com" style={{ color: "var(--accent)" }}>pawelszczabel@gmail.com</a>.
                    </p>
                </Section>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "3rem", paddingTop: "2rem", textAlign: "center" }}>
                    <a href="/" style={{ color: "var(--accent)", fontSize: "0.95rem" }}>← Wróć na stronę główną</a>
                </div>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.75rem" }}>{title}</h2>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{children}</div>
        </section>
    );
}
