export default function PolitykaPrywatnosci() {
    return (
        <div className="landing" style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
            <div style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.7 }}>
                <a href="/" style={{ color: "var(--accent)", display: "inline-block", marginBottom: "2rem", fontSize: "0.95rem" }}>← Wróć na stronę główną</a>

                <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    Polityka Prywatności
                </h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", fontSize: "0.95rem" }}>
                    Ostatnia aktualizacja: 25 lutego 2026
                </p>

                {/* 1. Administrator */}
                <Section title="1. Administrator danych osobowych">
                    <p>
                        Administratorem Twoich danych osobowych jest:
                    </p>
                    <p style={{ marginTop: "0.5rem" }}>
                        <strong>Paweł Szczabel</strong><br />
                        NIP: 9910361892<br />
                        ul. Wygonowa 51/2A, 45-402 Opole<br />
                        E-mail: <a href="mailto:pawelszczabel@gmail.com" style={{ color: "var(--accent)" }}>pawelszczabel@gmail.com</a>
                    </p>
                </Section>

                {/* 2. Jakie dane zbieramy */}
                <Section title="2. Jakie dane zbieramy">
                    <p>W zależności od sposobu korzystania z Lilapu, przetwarzamy następujące dane:</p>
                    <ul>
                        <li><strong>Dane konta</strong> — adres e-mail, imię (podane przy rejestracji przez Clerk).</li>
                        <li><strong>Dane sesji</strong> — adres IP, typ przeglądarki i urządzenia (automatycznie, w celach bezpieczeństwa).</li>
                        <li><strong>Treści użytkownika</strong> — notatki, transkrypcje sesji, nagrania audio, rozmowy z czatem AI. Wszystkie te dane są <strong>szyfrowane end-to-end</strong> (AES-256-GCM) i niedostępne dla Administratora.</li>
                        <li><strong>Pliki cookie</strong> — niezbędne do działania aplikacji (sesja, preferencje). Szczegóły w sekcji 8.</li>
                    </ul>
                </Section>

                {/* 3. Cele i podstawy prawne */}
                <Section title="3. Cele i podstawy prawne przetwarzania">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)", textAlign: "left" }}>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Cel</th>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Podstawa prawna (RODO)</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: "var(--text-secondary)" }}>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Świadczenie usługi (konto, transkrypcja, czat AI)</td>
                                <td style={{ padding: "8px 12px" }}>Art. 6 ust. 1 lit. b — wykonanie umowy</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Bezpieczeństwo (logi, ochrona przed nadużyciami)</td>
                                <td style={{ padding: "8px 12px" }}>Art. 6 ust. 1 lit. f — prawnie uzasadniony interes</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Lista oczekujących (waitlista)</td>
                                <td style={{ padding: "8px 12px" }}>Art. 6 ust. 1 lit. a — zgoda</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Obowiązki prawne (np. rachunkowość)</td>
                                <td style={{ padding: "8px 12px" }}>Art. 6 ust. 1 lit. c — obowiązek prawny</td>
                            </tr>
                        </tbody>
                    </table>
                </Section>

                {/* 4. Szyfrowanie */}
                <Section title="4. Szyfrowanie end-to-end">
                    <p>
                        Wszystkie treści użytkownika (notatki, transkrypcje, rozmowy z AI) są <strong>szyfrowane w przeglądarce</strong> przed
                        wysłaniem na serwer, z wykorzystaniem algorytmu <strong>AES-256-GCM</strong>. Klucz szyfrowania jest
                        wyprowadzany z Twojego prywatnego hasła szyfrowania (PBKDF2, 100 000 iteracji).
                    </p>
                    <p>
                        <strong>Administrator nie zna Twojego hasła szyfrowania i nie ma możliwości odszyfrowania Twoich danych.</strong>
                    </p>
                    <p>
                        ⚠️ Utrata hasła szyfrowania oznacza nieodwracalną utratę dostępu do zaszyfrowanych danych.
                        Nie istnieje mechanizm odzyskiwania hasła szyfrowania.
                    </p>
                </Section>

                {/* 5. Podmioty przetwarzające */}
                <Section title="5. Odbiorcy danych i podmioty przetwarzające">
                    <p>W celu świadczenia usługi korzystamy z następujących podmiotów:</p>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", marginTop: "0.5rem" }}>
                        <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)", textAlign: "left" }}>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Usługa</th>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Dostawca</th>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Lokalizacja danych</th>
                                <th style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>Cel</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: "var(--text-secondary)" }}>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Infrastruktura (serwery, AI, transkrypcja)</td>
                                <td style={{ padding: "8px 12px" }}>Oracle Cloud</td>
                                <td style={{ padding: "8px 12px" }}>UE (Frankfurt)</td>
                                <td style={{ padding: "8px 12px" }}>Hosting modeli AI, przetwarzanie transkrypcji i czatu AI (zero-retention — dane przetwarzane wyłącznie w RAM)</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Baza danych</td>
                                <td style={{ padding: "8px 12px" }}>Convex</td>
                                <td style={{ padding: "8px 12px" }}>USA</td>
                                <td style={{ padding: "8px 12px" }}>Przechowywanie zaszyfrowanych danych</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Uwierzytelnianie i ochrona przed botami</td>
                                <td style={{ padding: "8px 12px" }}>Clerk</td>
                                <td style={{ padding: "8px 12px" }}>USA</td>
                                <td style={{ padding: "8px 12px" }}>Logowanie, MFA, zarządzanie kontem, weryfikacja przy rejestracji</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Analityka i reklamy</td>
                                <td style={{ padding: "8px 12px" }}>Google LLC</td>
                                <td style={{ padding: "8px 12px" }}>USA</td>
                                <td style={{ padding: "8px 12px" }}>Google Analytics (analiza ruchu), Google Ads (remarketing, konwersje). Ładowane wyłącznie po wyrażeniu zgody.</td>
                            </tr>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <td style={{ padding: "8px 12px" }}>Reklamy</td>
                                <td style={{ padding: "8px 12px" }}>Meta Platforms Inc.</td>
                                <td style={{ padding: "8px 12px" }}>USA</td>
                                <td style={{ padding: "8px 12px" }}>Meta Pixel (remarketing, konwersje na Facebooku i Instagramie). Ładowane wyłącznie po wyrażeniu zgody.</td>
                            </tr>
                        </tbody>
                    </table>
                    <p style={{ marginTop: "1rem" }}>
                        <strong>Ważne:</strong> Dane przechowywane w Convex są <strong>zaszyfrowane end-to-end</strong> — dostawca
                        nie ma dostępu do treści Twoich notatek, transkrypcji ani rozmów z AI.
                    </p>
                </Section>

                {/* 6. Modele AI */}
                <Section title="6. Modele AI wykorzystywane w usłudze">
                    <ul>
                        <li>
                            <strong>Bielik</strong> (SpeakLeash / ACK Cyfronet AGH) — polski model językowy (LLM) używany w czacie AI.
                            Model open-source (Apache 2.0), hostowany na infrastrukturze Oracle Cloud w UE. <strong>Model nie jest trenowany na Twoich danych.</strong>
                        </li>
                        <li>
                            <strong>Faster Whisper</strong> (large-v3, bazujący na OpenAI Whisper) — transkrypcja sesji w czasie rzeczywistym.
                            Hostowany na infrastrukturze Oracle Cloud w UE, zero-retention.
                        </li>
                        <li>
                            <strong>NVIDIA Parakeet TDT 0.6B</strong> — szybka transkrypcja notatek głosowych.
                            Hostowany na infrastrukturze Oracle Cloud w UE, zero-retention.
                        </li>
                        <li>
                            <strong>pyannote</strong> — rozpoznawanie mówców (diaryzacja) w nagraniach.
                            Hostowany na infrastrukturze Oracle Cloud w UE, zero-retention.
                        </li>
                    </ul>
                    <p>
                        Wszystkie modele AI działają na infrastrukturze Oracle Cloud w UE.
                        Audio jest przetwarzane wyłącznie w pamięci RAM i usuwane natychmiast po transkrypcji.
                        Żadne dane nie są używane do trenowania tych modeli.
                    </p>
                </Section>

                {/* 7. Transfer danych poza EOG */}
                <Section title="7. Transfer danych poza Europejski Obszar Gospodarczy">
                    <p>
                        Korzystamy z usług Clerk, Convex, Google LLC i Meta Platforms Inc., których serwery
                        znajdują się w USA. Transfer danych odbywa się na podstawie <strong>Standardowych
                            Klauzul Umownych (SCC)</strong> zatwierdzonych przez Komisję Europejską oraz w oparciu
                        o <strong>EU-US Data Privacy Framework</strong>, zapewniając odpowiedni poziom ochrony danych.
                    </p>
                    <p>
                        Treści użytkownika (notatki, transkrypcje, rozmowy) przechowywane w Convex są zaszyfrowane
                        end-to-end — Convex przechowuje wyłącznie zaszyfrowane dane, do których nie ma dostępu.
                    </p>
                </Section>

                {/* 8. Cookies */}
                <Section title="8. Pliki cookie">
                    <p>Lilapu używa następujących kategorii plików cookie:</p>
                    <ul>
                        <li><strong>Niezbędne</strong> — sesja logowania (Clerk), preferencje interfejsu, zgoda na cookies. Nie wymagają zgody.</li>
                        <li><strong>Analityczne</strong> — Google Analytics (Google LLC) — analiza ruchu na stronie. Ładowane wyłącznie po wyrażeniu zgody.</li>
                        <li><strong>Marketingowe</strong> — Google Ads (Google LLC) i Meta Ads (Meta Platforms Inc.) — remarketing i śledzenie konwersji. Ładowane wyłącznie po wyrażeniu zgody.</li>
                    </ul>
                    <p>
                        Przy pierwszej wizycie wyświetlamy baner z możliwością wyboru: „Akceptuję wszystkie"
                        lub „Tylko niezbędne". Szczegółowe informacje o używanych plikach cookie znajdziesz
                        w <a href="/polityka-ciasteczek" style={{ color: "var(--accent)" }}>Polityce plików cookie</a>.
                    </p>
                </Section>

                {/* 9. Okres przechowywania */}
                <Section title="9. Okres przechowywania danych">
                    <ul>
                        <li><strong>Oracle Cloud (transkrypcja, AI)</strong> — zero-retention. Nieszyfrowane audio jest przetwarzane wyłącznie w pamięci RAM serwera na czas transkrypcji i usuwane natychmiast po jej zakończeniu. Żadne dane użytkownika nie są trwale zapisywane na serwerach Oracle.</li>
                        <li><strong>Convex (baza danych)</strong> — zaszyfrowane dane przechowywane przez czas posiadania konta:
                            <ul style={{ marginTop: "0.5rem" }}>
                                <li>Zaszyfrowane pliki audio nagrań (szyfrowane w przeglądarce przed uploadem)</li>
                                <li>Zaszyfrowane teksty transkrypcji i tytuły</li>
                                <li>Zaszyfrowane notatki i rozmowy z AI</li>
                            </ul>
                            Możesz je usunąć w dowolnym momencie z poziomu aplikacji. Convex przechowuje wyłącznie zaszyfrowane dane — nie ma dostępu do ich treści.
                        </li>
                        <li><strong>Dane konta</strong> — przez czas posiadania konta w Lilapu. Po usunięciu konta dane są usuwane w ciągu 30 dni.</li>
                        <li><strong>Dane waitlisty</strong> — do momentu wycofania zgody lub uruchomienia usługi.</li>
                        <li><strong>Logi bezpieczeństwa</strong> — do 90 dni.</li>
                    </ul>
                </Section>

                {/* 10. Prawa użytkownika */}
                <Section title="10. Twoje prawa">
                    <p>Zgodnie z RODO przysługują Ci następujące prawa:</p>
                    <ul>
                        <li><strong>Prawo dostępu</strong> — możesz zażądać informacji o przetwarzanych danych.</li>
                        <li><strong>Prawo do sprostowania</strong> — możesz poprawić nieprawidłowe dane.</li>
                        <li><strong>Prawo do usunięcia</strong> („prawo do bycia zapomnianym") — możesz zażądać usunięcia swoich danych.</li>
                        <li><strong>Prawo do ograniczenia przetwarzania</strong> — możesz ograniczyć sposób przetwarzania danych.</li>
                        <li><strong>Prawo do przenoszenia danych</strong> — możesz otrzymać swoje dane w ustrukturyzowanym formacie.</li>
                        <li><strong>Prawo do sprzeciwu</strong> — możesz sprzeciwić się przetwarzaniu opartemu na prawnie uzasadnionym interesie.</li>
                        <li><strong>Prawo do wycofania zgody</strong> — jeśli przetwarzanie opiera się na zgodzie, możesz ją wycofać w dowolnym momencie.</li>
                    </ul>
                    <p>
                        W celu realizacji swoich praw skontaktuj się z nami: <a href="mailto:pawelszczabel@gmail.com" style={{ color: "var(--accent)" }}>pawelszczabel@gmail.com</a>.
                        Odpowiemy w ciągu 30 dni.
                    </p>
                    <p>
                        <strong>Uwaga:</strong> Ze względu na szyfrowanie end-to-end, Administrator nie ma technicznej możliwości
                        odczytania zaszyfrowanych treści. Prawo dostępu do treści zaszyfrowanych realizujesz samodzielnie
                        przez aplikację, korzystając ze swojego hasła szyfrowania.
                    </p>
                </Section>

                {/* 11. Skarga */}
                <Section title="11. Prawo do skargi">
                    <p>
                        Masz prawo wniesienia skargi do <strong>Prezesa Urzędu Ochrony Danych Osobowych</strong> (PUODO),
                        jeśli uznasz, że przetwarzanie Twoich danych narusza przepisy RODO.
                    </p>
                    <p style={{ marginTop: "0.5rem" }}>
                        Prezes Urzędu Ochrony Danych Osobowych<br />
                        ul. Stawki 2, 00-193 Warszawa<br />
                        <a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>uodo.gov.pl</a>
                    </p>
                </Section>

                {/* 12. Bezpieczeństwo */}
                <Section title="12. Zabezpieczenia techniczne i organizacyjne">
                    <ul>
                        <li>Szyfrowanie end-to-end (AES-256-GCM) — dane szyfrowane w przeglądarce przed wysłaniem na serwer.</li>
                        <li>Szyfrowanie w trakcie transferu (TLS/HTTPS).</li>
                        <li>2-etapowa weryfikacja (MFA) przy logowaniu.</li>
                        <li>Ochrona przed botami przy rejestracji (Clerk).</li>
                        <li>Confidential Computing (AMD SEV) — dane zaszyfrowane nawet w pamięci RAM serwera.</li>
                        <li>Zero-retention na serwerach AI — audio przetwarzane wyłącznie w RAM, natychmiast usuwane.</li>
                        <li>Infrastruktura w Unii Europejskiej (Oracle Cloud, Frankfurt), zgodna z RODO.</li>
                    </ul>
                </Section>

                {/* 13. Zmiany */}
                <Section title="13. Zmiany w polityce prywatności">
                    <p>
                        Polityka prywatności może być aktualizowana w związku ze zmianami w funkcjonalności Lilapu
                        lub w przepisach prawa. O istotnych zmianach poinformujemy za pośrednictwem aplikacji
                        lub e-mail. Aktualna wersja jest zawsze dostępna pod adresem{" "}
                        <a href="/polityka-prywatnosci" style={{ color: "var(--accent)" }}>lilapu.com/polityka-prywatnosci</a>.
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
