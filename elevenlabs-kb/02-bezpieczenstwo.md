# Bezpieczeństwo danych w Lilapu

## 6 poziomów bezpieczeństwa

### Poziom 1: Weryfikacja tożsamości (MFA)
- Logowanie z dwuetapową weryfikacją — samo hasło nie wystarczy
- Rejestracja chroniona systemem Clerk, który blokuje boty
- Opcjonalna weryfikacja kodem z aplikacji (TOTP)

### Poziom 2: Szyfrowanie End-to-End (E2E)
- Wszystkie notatki, transkrypcje i rozmowy z AI są zaszyfrowane
- Szyfrowanie klasy bankowej (AES-256)
- Klucz szyfrowania znany TYLKO użytkownikowi — serwer nigdy go nie widzi
- Zapomniane hasło szyfrowania = brak dostępu do danych (nie da się go odzyskać)
- To samo hasło na każdym urządzeniu = dostęp do wszystkich danych

### Poziom 3: Dane w Unii Europejskiej
- Serwery Oracle Cloud zlokalizowane we Frankfurcie (Niemcy)
- Transkrypcje i rozmowy z AI nie opuszczają UE
- Pełna zgodność z RODO/GDPR

### Poziom 4: Confidential Computing
- Dane są zaszyfrowane nawet w pamięci RAM serwera podczas przetwarzania
- Administrator serwera nie widzi Twoich danych
- Technologia sprzętowa zapewniająca izolację danych

### Poziom 5: Zero-Retention
- Audio jest przetwarzane wyłącznie w pamięci RAM
- Usuwane natychmiast po transkrypcji
- Żadne nagranie nie jest zapisywane na dysku serwera — zero śladów
- Jedyna kopia audio to zaszyfrowana wersja w Twoim koncie

### Poziom 6: Blockchain Notaryzacja
- Każda notatka otrzymuje kryptograficzny "odcisk palca" zapisany na blockchainie
- Niezależny, niemożliwy do sfałszowania dowód autentyczności
- Przydatne na wypadek audytu lub sporu prawnego

## Certyfikaty infrastruktury
Certyfikaty dotyczą infrastruktury chmurowej Oracle Cloud, na której hostowane są dane Lilapu:
- SOC 2 Type II
- ISO 27001
- ISO 27017 (bezpieczeństwo chmury)
- ISO 27018 (ochrona danych osobowych w chmurze)
- HIPAA
- CSA STAR
- RODO/GDPR

## Architektura Zero-Knowledge
- Serwer Lilapu NIGDY nie widzi niezaszyfrowanych danych
- Szyfrowanie i deszyfrowanie odbywa się wyłącznie w przeglądarce użytkownika
- Nawet pracownicy Lilapu nie mają dostępu do treści notatek i transkrypcji
- Model AI przetwarza dane tylko w momencie zapytania, wyniki nie są przechowywane

## Najczęstsze pytania o bezpieczeństwo

### Czy moje nagrania są bezpieczne?
Tak. Audio jest szyfrowane w przeglądarce zanim trafi na serwer. Na serwerze przechowywana jest tylko zaszyfrowana wersja, której nikt nie może odsłuchać bez Twojego hasła szyfrowania.

### Czy AI może odczytać moje notatki?
AI przetwarza dane tylko w momencie gdy zadajesz pytanie. Wyniki nie są przechowywane na serwerze. Model AI NIE jest trenowany na Twoich danych.

### Co się stanie jeśli zapomnę hasło szyfrowania?
Niestety, dane będą niedostępne. To jest celowe zabezpieczenie — gdybyśmy mogli odzyskać hasło, cały system E2E byłby bezużyteczny.

### Czy Lilapu spełnia wymogi RODO?
Tak. Dane przechowywane w UE, szyfrowanie E2E, zero-retention, prawo do usunięcia danych — pełna zgodność z RODO.

### Czy mogę używać Lilapu do sesji terapeutycznych?
Tak. Lilapu jest zaprojektowane specjalnie z myślą o poufnych rozmowach. Szyfrowanie E2E + zero-retention + dane w UE zapewniają poziom bezpieczeństwa wymagany w pracy z wrażliwymi danymi klinicznymi.
