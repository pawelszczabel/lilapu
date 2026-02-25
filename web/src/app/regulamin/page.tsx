export default function Regulamin() {
    return (
        <div className="landing" style={{ minHeight: "100vh", padding: "2rem 1rem" }}>
            <div style={{ maxWidth: 760, margin: "0 auto", lineHeight: 1.7 }}>
                <a href="/" style={{ color: "var(--accent)", display: "inline-block", marginBottom: "2rem", fontSize: "0.95rem" }}>← Wróć na stronę główną</a>

                <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                    Regulamin
                </h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2.5rem", fontSize: "0.95rem" }}>
                    Ostatnia aktualizacja: 25 lutego 2026
                </p>

                {/* 1. Postanowienia ogólne */}
                <Section title="1. Postanowienia ogólne">
                    <ol>
                        <li>Niniejszy Regulamin określa zasady korzystania z aplikacji internetowej <strong>Lilapu</strong> dostępnej pod adresem <a href="https://lilapu.com" style={{ color: "var(--accent)" }}>lilapu.com</a>.</li>
                        <li>Usługodawcą jest <strong>Paweł Szczabel</strong>, NIP: 9910361892, ul. Wygonowa 51/2A, 45-402 Opole, e-mail: <a href="mailto:pawelszczabel@gmail.com" style={{ color: "var(--accent)" }}>pawelszczabel@gmail.com</a>.</li>
                        <li>Korzystanie z Lilapu oznacza akceptację niniejszego Regulaminu.</li>
                        <li>Regulamin jest udostępniany nieodpłatnie w formie umożliwiającej jego pobranie, utrwalenie i wydrukowanie.</li>
                    </ol>
                </Section>

                {/* 2. Definicje */}
                <Section title="2. Definicje">
                    <ul>
                        <li><strong>Usługodawca</strong> — Paweł Szczabel, prowadzący aplikację Lilapu.</li>
                        <li><strong>Użytkownik</strong> — osoba fizyczna korzystająca z Lilapu po utworzeniu konta.</li>
                        <li><strong>Usługa</strong> — usługa świadczona drogą elektroniczną przez Usługodawcę za pośrednictwem Lilapu.</li>
                        <li><strong>Konto</strong> — indywidualny profil Użytkownika, chroniony loginem i hasłem, umożliwiający korzystanie z Usług.</li>
                        <li><strong>Hasło szyfrowania</strong> — osobne hasło ustawiane przez Użytkownika, służące do szyfrowania end-to-end treści w aplikacji.</li>
                    </ul>
                </Section>

                {/* 3. Rodzaje i zakres usług */}
                <Section title="3. Rodzaje i zakres świadczonych usług">
                    <p>Lilapu świadczy następujące usługi drogą elektroniczną:</p>
                    <ol>
                        <li><strong>Transkrypcja sesji</strong> — nagrywanie i automatyczna transkrypcja rozmów w czasie rzeczywistym z rozpoznawaniem mówców.</li>
                        <li><strong>Notatki</strong> — tworzenie, edycja i przechowywanie zaszyfrowanych notatek tekstowych i głosowych.</li>
                        <li><strong>Czat AI</strong> — prywatny asystent oparty na modelu językowym Bielik, działający na infrastrukturze Oracle Cloud w UE.</li>
                        <li><strong>Szyfrowanie end-to-end</strong> — szyfrowanie treści Użytkownika (AES-256-GCM) kluczem wyprowadzanym z hasła szyfrowania.</li>
                        <li><strong>Organizacja w foldery</strong> — grupowanie transkrypcji i notatek w foldery (np. per klient/pacjent).</li>
                    </ol>
                </Section>

                {/* 4. Wymagania techniczne */}
                <Section title="4. Wymagania techniczne">
                    <p>Do korzystania z Lilapu niezbędne są:</p>
                    <ul>
                        <li>Urządzenie z dostępem do internetu (komputer, tablet, smartfon).</li>
                        <li>Aktualna przeglądarka internetowa obsługująca JavaScript (Chrome, Firefox, Safari, Edge).</li>
                        <li>Mikrofon — do funkcji nagrywania i transkrypcji.</li>
                        <li>Aktywny adres e-mail — do rejestracji konta.</li>
                    </ul>
                </Section>

                {/* 5. Rejestracja i konto */}
                <Section title="5. Rejestracja i konto">
                    <ol>
                        <li>Rejestracja odbywa się przez formularz na stronie lub logowanie kontem Google, za pośrednictwem usługi Clerk.</li>
                        <li>Użytkownik zobowiązuje się podać prawdziwe dane.</li>
                        <li>Po pierwszym zalogowaniu Użytkownik ustawia <strong>hasło szyfrowania</strong>, które służy do szyfrowania end-to-end treści w aplikacji.</li>
                        <li>Hasło szyfrowania jest znane wyłącznie Użytkownikowi. <strong>Usługodawca nie ma możliwości jego odzyskania ani zresetowania.</strong> Utrata hasła szyfrowania oznacza nieodwracalną utratę dostępu do zaszyfrowanych danych.</li>
                        <li>Użytkownik ponosi odpowiedzialność za poufność swoich danych logowania i hasła szyfrowania.</li>
                        <li>Użytkownik może usunąć konto, kontaktując się z Usługodawcą na adres e-mail podany w § 1.</li>
                    </ol>
                </Section>

                {/* 6. Zasady korzystania */}
                <Section title="6. Zasady korzystania z usługi">
                    <ol>
                        <li>Użytkownik zobowiązuje się korzystać z Lilapu zgodnie z prawem i niniejszym Regulaminem.</li>
                        <li>Zabrania się dostarczania treści o charakterze bezprawnym.</li>
                        <li>Zabrania się podejmowania działań mogących zakłócić działanie aplikacji, w tym prób nieautoryzowanego dostępu do systemów Usługodawcy.</li>
                        <li>Użytkownik ponosi wyłączną odpowiedzialność za treści, które tworzy, przechowuje i przetwarza w Lilapu.</li>
                        <li>Lilapu jest narzędziem wspomagającym pracę. Nie stanowi porady prawnej, medycznej ani psychologicznej.</li>
                    </ol>
                </Section>

                {/* 7. Szyfrowanie */}
                <Section title="7. Szyfrowanie end-to-end">
                    <ol>
                        <li>Treści Użytkownika (notatki, transkrypcje, rozmowy z AI) są szyfrowane w przeglądarce Użytkownika przed wysłaniem na serwer, algorytmem AES-256-GCM.</li>
                        <li>Usługodawca nie ma technicznej możliwości odszyfrowania treści Użytkownika.</li>
                        <li>Utrata hasła szyfrowania skutkuje nieodwracalną utratą dostępu do zaszyfrowanych danych. Usługodawca nie ponosi odpowiedzialności za skutki utraty hasła szyfrowania.</li>
                        <li>To samo hasło szyfrowania na różnych urządzeniach zapewnia dostęp do tych samych danych.</li>
                    </ol>
                </Section>

                {/* 8. Przetwarzanie audio */}
                <Section title="8. Przetwarzanie nagrań audio">
                    <ol>
                        <li>Podczas transkrypcji nieszyfrowane audio jest przetwarzane w pamięci RAM serwera (Oracle Cloud, UE) i usuwane natychmiast po zakończeniu transkrypcji (zero-retention).</li>
                        <li>Po zakończeniu transkrypcji nagranie audio jest <strong>szyfrowane w przeglądarce Użytkownika</strong> (AES-256-GCM) i przesyłane w formie zaszyfrowanej do bazy danych (Convex), gdzie jest przechowywane razem z zaszyfrowaną transkrypcją.</li>
                        <li>Usługodawca nie ma technicznej możliwości odsłuchania zaszyfrowanych nagrań.</li>
                        <li>Użytkownik może usunąć nagrania w dowolnym momencie z poziomu aplikacji.</li>
                        <li>Użytkownik jest odpowiedzialny za uzyskanie zgody osób, których głos jest nagrywany, zgodnie z obowiązującym prawem.</li>
                    </ol>
                </Section>

                {/* 9. Odpowiedzialność */}
                <Section title="9. Odpowiedzialność">
                    <ol>
                        <li>Usługodawca dokłada starań, aby Lilapu działała prawidłowo i nieprzerwanie, lecz nie gwarantuje nieprzerwanej dostępności usługi.</li>
                        <li>Usługodawca nie ponosi odpowiedzialności za:
                            <ul style={{ marginTop: "0.5rem" }}>
                                <li>przerwy w działaniu wynikające z przyczyn technicznych, konserwacji lub siły wyższej;</li>
                                <li>utratę danych spowodowaną utratą hasła szyfrowania przez Użytkownika;</li>
                                <li>treści tworzone i przechowywane przez Użytkownika;</li>
                                <li>dokładność transkrypcji generowanych przez modele rozpoznawania mowy;</li>
                                <li>skutki korzystania z odpowiedzi czatu AI.</li>
                            </ul>
                        </li>
                        <li>Usługodawca zastrzega prawo do czasowego zawieszenia usługi w celu przeprowadzenia prac konserwacyjnych. O planowanych przerwach Użytkownicy zostaną poinformowani drogą mailową z co najmniej <strong>48-godzinnym</strong> wyprzedzeniem. W przypadku awarii lub pilnych aktualizacji bezpieczeństwa przerwa może nastąpić bez wcześniejszego powiadomienia.</li>
                    </ol>
                </Section>

                {/* 10. Własność intelektualna */}
                <Section title="10. Własność intelektualna">
                    <ol>
                        <li>Aplikacja Lilapu, jej kod, projekt graficzny i nazwa są własnością Usługodawcy.</li>
                        <li>Treści tworzone przez Użytkownika pozostają jego własnością.</li>
                        <li>Usługodawca nie nabywa żadnych praw do treści Użytkownika, w tym zaszyfrowanych danych.</li>
                    </ol>
                </Section>

                {/* 11. Reklamacje */}
                <Section title="11. Reklamacje">
                    <ol>
                        <li>Użytkownik może składać reklamacje dotyczące działania Lilapu drogą elektroniczną na adres: <a href="mailto:pawelszczabel@gmail.com" style={{ color: "var(--accent)" }}>pawelszczabel@gmail.com</a>.</li>
                        <li>Reklamacja powinna zawierać: dane kontaktowe Użytkownika, opis problemu oraz oczekiwany sposób rozwiązania.</li>
                        <li>Usługodawca rozpatrzy reklamację w terminie <strong>14 dni</strong> od daty otrzymania i poinformuje Użytkownika o wyniku drogą elektroniczną.</li>
                    </ol>
                </Section>

                {/* 12. Rozwiązanie umowy */}
                <Section title="12. Zawarcie i rozwiązanie umowy">
                    <ol>
                        <li>Umowa o świadczenie usług drogą elektroniczną zostaje zawarta z chwilą utworzenia konta w Lilapu.</li>
                        <li>Użytkownik może w każdej chwili rozwiązać umowę, usuwając swoje konto lub kontaktując się z Usługodawcą.</li>
                        <li>Usługodawca może rozwiązać umowę ze skutkiem natychmiastowym w przypadku rażącego naruszenia Regulaminu przez Użytkownika.</li>
                        <li>Po rozwiązaniu umowy dane Użytkownika zostaną usunięte w ciągu 30 dni, z zastrzeżeniem obowiązków wynikających z przepisów prawa.</li>
                    </ol>
                </Section>

                {/* 13. Pozasądowe rozwiązywanie sporów */}
                <Section title="13. Pozasądowe rozwiązywanie sporów">
                    <ol>
                        <li>Użytkownik będący konsumentem ma prawo skorzystać z pozasądowych sposobów rozstrzygania sporów, w tym mediacji lub arbitrażu.</li>
                        <li>Szczegółowe informacje o pozasądowych sposobach rozwiązywania sporów dostępne są na stronie <a href="https://www.uokik.gov.pl" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>UOKiK</a>.</li>
                    </ol>
                </Section>

                {/* 14. Zmiany regulaminu */}
                <Section title="14. Zmiany regulaminu">
                    <ol>
                        <li>Usługodawca zastrzega sobie prawo do zmiany Regulaminu w przypadku zmian w funkcjonalności Lilapu lub zmian w przepisach prawa.</li>
                        <li>O istotnych zmianach Użytkownik zostanie poinformowany za pośrednictwem aplikacji lub e-mail z co najmniej <strong>14-dniowym</strong> wyprzedzeniem.</li>
                        <li>Korzystanie z Lilapu po wejściu w życie zmian oznacza ich akceptację.</li>
                        <li>Aktualna wersja Regulaminu jest zawsze dostępna pod adresem <a href="/regulamin" style={{ color: "var(--accent)" }}>lilapu.com/regulamin</a>.</li>
                    </ol>
                </Section>

                {/* 15. Postanowienia końcowe */}
                <Section title="15. Postanowienia końcowe">
                    <ol>
                        <li>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu Cywilnego, Ustawy o świadczeniu usług drogą elektroniczną oraz Ustawy o prawach konsumenta.</li>
                        <li>Wszelkie spory wynikłe z korzystania z Lilapu będą rozstrzygane przez sąd właściwy dla siedziby Usługodawcy, z zastrzeżeniem praw konsumentów do wyboru sądu właściwego dla ich miejsca zamieszkania.</li>
                        <li>Regulamin wchodzi w życie z dniem 25 lutego 2026.</li>
                    </ol>
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
