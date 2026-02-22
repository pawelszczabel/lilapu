# PRD: Lilapu — Prywatny Asystent Wiedzy
### Privacy-First NotebookLM Alternative · MVP v1.0

> **Kategoria konkursowa:** 4TECH — EEC Startup Challenge (nabór do 27.02.2026)
> **Repozytorium:** `/Users/pawelszczabel/Lilapu`

---

## 1. Wizja Produktu

**Webowa aplikacja** do transkrypcji audio na żywo i zarządzania notatkami, działająca jak NotebookLM. Użytkownik loguje się, nagrywa rozmowę, dostaje transkrypcję i może rozmawiać z AI o swoich notatkach. **Zero konfiguracji, zero instalacji.**

**Strategia:** Local-first → SaaS. Najpierw budujemy web app działającą na Twoim Macu (whisper.cpp + Bielik-7B lokalnie). Nagrywamy demo, zbieramy whitelist. Kiedy jest zainteresowanie → zmieniamy 1 URL i mamy SaaS na GPU serwerze.

Różnica od konkurencji:
- **Prywatność** — AI działa lokalnie lub na Twoim serwerze, zero danych do big-techów
- **Blockchain notaryzacja** — automatyczna, niewidoczna dla użytkownika
- **Organizacja per klient/projekt** — każda sprawa to osobny workspace z transkrypcjami i chatami

### Filozofia UX

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   Użytkownik widzi:   Zaloguj się → Wybierz klienta/projekt  │
│                       → Nagrywaj → Rozmawiaj z AI             │
│                                                               │
│   W tle działa:       Szyfrowanie + Blockchain + RAG pipeline │
│                                                               │
│   Użytkownik NIE widzi: nic technicznego. Po prostu działa.   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Dlaczego to ma sens?

| Problem | Rozwiązanie Lilapu |
|---------|---------------------------|
| NotebookLM = płaska lista dokumentów | Projekty per klient/sprawa |
| Transkrypcje łatwo sfałszować | Blockchain hash = dowód niezmienności |
| Otter/Fireflies = brak organizacji per klient | Workspace per projekt |
| Desktop apps = trudna instalacja | Web app — loguj się i działaj |
| Manualne kopiowanie transkrypcji | Live streaming → auto-zapis |
| Zapomniane hasło = utrata danych (E2EE) | Server-side encryption — reset hasła działa |

---

## 2. Grupa Docelowa

Profesjonaliści, którzy **nagrywają rozmowy** i potrzebują dowodu ich autentyczności:

- 🏛️ **Prawnicy** — poufność klient-adwokat, dowody w sprawach
- 🏥 **Lekarze** — dokumentacja wizyt, RODO
- 📰 **Dziennikarze** — ochrona źródeł, weryfikowalność cytatów
- 🔬 **R&D / konsultanci** — notatki ze spotkań, IP protection
- 📋 **Audytorzy** — niezaprzeczalność protokołów

---

## 3. Funkcje MVP

### 3.1 🔐 Logowanie — Jedno kliknięcie

- Logowanie przez Google / email+hasło
- Auth: Convex Auth
- Po zalogowaniu → dashboard z **listą projektów (klientów)**
- **Brak konfiguracji, brak onboardingu**

### 3.2 📁 Projekty / Klienci — Workspace per sprawa

Każdy klient lub sprawa to **osobny projekt** — jak folder z wszystkim w środku.

**Struktura:**
```
Projekt: "Klient X — Umowa dostawy"
├── 📝 Transkrypcje
│   ├── Spotkanie 12 lut 2026, 14:30  ✅
│   ├── Spotkanie 5 lut 2026, 10:00   ✅
│   └── Wywiad telefoniczny 2 lut     ✅
├── 💬 Rozmowy z AI
│   ├── "Podsumuj wszystkie spotkania" (12 lut)
│   ├── "Co ustaliliśmy o terminach?" (12 lut)
│   └── "Porównaj warunki z lutego i marca" (15 lut)
└── 📊 Status: 3 nagrania · 3 chaty · ✅ Zabezpieczone
```

**Funkcje:**
- Tworzenie nowego projektu: nazwa + opcjonalny opis
- **Foldery** — grupowanie projektów w foldery (np. per klient)
- Wszystkie nagrania w projekcie → RAG chat ma kontekst **tylko z tego projektu**
- **1 transkrypcja = 1 czat** — każda transkrypcja ma dropdown z listą czatów:
  - "➕ Rozpocznij nowy czat" (zawsze na górze)
  - Lista istniejących czatów powiązanych z tą transkrypcją
- Historia chatów zapisywana jak w Gemini — w sidebarze, per projekt
- Archiwizacja starych projektów
- Wyszukiwanie across all projects (cross-project search)

### 3.2 🎙️ Transkrypcja na Żywo (Streaming STT)

Użytkownik klika "Nagrywaj" → tekst pojawia się na ekranie w czasie rzeczywistym.

**Przepływ:**
1. Kliknięcie przycisku **"● Nagrywaj"**
2. Mikrofon przeglądarki (Web Audio API / MediaRecorder)
3. Chunki audio (~5s) wysyłane na backend via Convex action
4. Backend: Whisper (self-hosted GPU) → tekst
5. Tekst streamowany z powrotem do UI w czasie rzeczywistym
6. Kliknięcie **"■ Stop"** → automatyczny zapis + blockchain notaryzacja w tle

**Tryby nagrywania:**

| Tryb | Źródło audio | Przypadek użycia |
|------|-------------|------------------|
| **Mikrofon** | Wbudowany/zewnętrzny mic | Spotkanie na żywo, wizyta |
| **Rozmowa online** | Mikrofon + system audio (`getDisplayMedia`) | Google Meet, Zoom, Teams |

**Nagrywanie rozmów online (Faza 2):**
- Chrome API `getDisplayMedia({ audio: true })` — przechwytuje audio z wybranej zakładki
- Miksowanie z mikrofonu (Ty) + system audio (rozmówca) → jeden strumień
- Użytkownik wybiera zakładkę Meet/Zoom → przeglądarka łapie jej audio
- Alternatywa: instrukcja dla użytkownika (BlackHole / Loopback na macOS)

**Speaker diarization (Faza 3):**
- `pyannote-audio` jako post-processing po Whisper
- Rozpoznawanie kto mówi: `[Lekarz]: ... [Pacjent]: ...`

**Wymagania techniczne:**
- Frontend: Web Audio API + `getDisplayMedia` (Chrome)
- Backend: `faster-whisper` (Python, self-hosted GPU)
- Modele: `whisper-large-v3` (najlepsza jakość, GPU serwer)
- Język MVP: **polski** (jedyny w MVP)
- Latencja: < 2s od wypowiedzi do tekstu

### 3.3 💬 Czat z Notatkami (RAG)

Konwersacyjny interfejs AI do zadawania pytań o swoje notatki.

**Funkcje:**
- "Podsumuj ostatnie spotkanie"
- "Co ustaliliśmy z klientem X?"
- "Znajdź wszystkie wzmianki o budżecie"
- Cytowanie źródeł (link do konkretnej notatki + timestamp)

**Wymagania techniczne:**
- LLM: **Bielik-7B-Instruct** (SpeakLeash, self-hosted, llama.cpp) — polski model językowy
- Embeddingi: `all-MiniLM-L6-v2` (self-hosted ONNX, ~25MB) — **zero danych do OpenAI**
- Vector DB: Convex vector search (wbudowany)
- Chunk size: 512 tokenów, 50-tokenowy overlap
- System prompt: ograniczony do kontekstu **danego projektu** (no cross-project leaks)
- **Każda rozmowa z AI zapisywana** w historii projektu (jak Gemini sidebar)

> **Kluczowe:** Dane nigdy nie opuszczają Twojego serwera. Żadne API do Claude/GPT/OpenAI.

### 3.4 🔗 Blockchain Notaryzacja (Automatyczna, Niewidoczna)

Użytkownik **nie wie** że blockchain istnieje. Po każdym "Stop":

1. Backend generuje SHA-256 hash transkrypcji
2. Backend wysyła hash na smart kontrakt (z **walleta serwera**)
3. Koszt: ~$0.005 per notaryzacja (płaci operator, nie user)
4. W UI: mały badge ✅ "Zabezpieczone" + opcjonalny link do dowodu
5. Użytkownik może kliknąć "Zweryfikuj autentyczność" → porównanie hashów

**Co widzi użytkownik:** ✅ "Notatka zabezpieczona kryptograficznie"
**Co NIE widzi:** walletów, gas fees, transakcji, kluczy prywatnych

**Wymagania techniczne:**
- Backend wallet: ethers.js + hot wallet serwera (private key w env)
- Sieć: Base L2 (niski gas)
- Kontrakt: NoteNotary.sol (auto-deploy)
- Bufor: batch notaryzacje co 5 min (optymalizacja gas)

### 3.5 � Szyfrowanie Server-Side (AES-256 at rest)

Dane szyfrowane **na serwerze** — użytkownik nigdy nie traci danych.

**Model:**
- Wszystkie dane szyfrowane AES-256 at rest w bazie danych (Convex encryption)
- HTTPS/TLS w tranzycie
- Row Level Security (RLS) — użytkownik widzi tylko swoje projekty
- Reset hasła = normalny flow, **zero utraty danych**
- Backupy szyfrowane automatycznie

**Co to oznacza:**
- Użytkownik zapomniał hasło? Reset przez email — **nic nie traci**
- Operator może robić backup/recovery — standard biznesowy
- Compliance z RODO: dane szyfrowane + user isolation via RLS

> **Kompromis:** Serwer technicznie "widzi" dane, ale jest to standard branżowy
> (tak samo działają Otter.ai, Fireflies, Google Docs). Za to: zero ryzyka
> utraty danych i prostszy stack technologiczny.

---

## 4. Architektura Techniczna

```
┌──────────────────────────────────────────────────────────────┐
│                      PRZEGLĄDARKA                            │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
│  │ 🔐 E2EE  │  │ 🎙️ Audio │  │ 💬 Chat  │  │ 📄 Notes   │   │
│  │ Web      │  │ Capture  │  │ Panel    │  │  Manager   │   │
│  │ Crypto   │  │ WebSocket│  │          │  │            │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘   │
│       │              │             │              │          │
│  ┌────▼──────────────▼─────────────▼──────────────▼──────┐   │
│  │                HTTPS / WebSocket                      │   │
│  └───────────────────────┬───────────────────────────────┘   │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                       BACKEND                                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  Auth        │  │  Whisper     │  │  LLM (Bielik-7B) │   │
│  │  (Convex)    │  │  AI_SERVER   │  │  AI_SERVER_URL   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────────┘   │
│         │                 │                  │               │
│  ┌──────▼─────────────────▼──────────────────▼────────────┐  │
│  │          Convex (reactive document DB)                  │  │
│  │     (🔒 Notatki + vector search + real-time)           │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │         Blockchain Worker (cron / queue)                │  │
│  │    ethers.js → NoteNotary.sol (Base L2)                │  │
│  │    Server wallet → auto-notarize → ✅ badge            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 4.1 Stack Technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---------|------------|--------------|
| **Frontend** | Next.js 15 + TypeScript | SSR, routing, React ecosystem |
| **Styling** | Vanilla CSS (dark mode first) | Premium look, pełna kontrola |
| **Auth** | Convex Auth | Google login, email/password, zero config |
| **Baza danych** | Convex (reactive document DB) | Real-time, TypeScript schema, serverless functions |
| **STT** | faster-whisper (self-hosted GPU) | Najlepsza jakość, whisper-large-v3 |
| **LLM** | Bielik-7B-Instruct (llama.cpp, self-hosted) | Polski model, privacy-first, zero data leakage |
| **Embeddingi** | all-MiniLM-L6-v2 (ONNX, self-hosted) | Lekki, wielojęzyczny, prywatny |
| **Vector search** | Convex vector search (wbudowany) | Natywny, zero dodatkowej infra |
| **Realtime** | Convex reactive queries | Wbudowany real-time, zero konfiguracji |
| **Blockchain** | ethers.js + Solidity (Base L2) | Automatyczne, tanie notaryzacje |
| **Szyfrowanie** | AES-256 at rest (Convex) | Standard, zero data loss risk |
| **Hosting frontend** | Vercel | SSR, CDN, auto-deploy z GitHub |
| **Hosting AI (dev/test)** | RunPod Serverless | Testy, demo, benchmarki |
| **Hosting AI (produkcja)** | **Oracle Cloud (OCI)** | Confidential Computing (AMD SEV), GPU Bare Metal, RODO EU (Frankfurt), HIPAA/SOC 2 certified |

> **⚠️ Kluczowe:** RunPod = shared infrastructure, nie nadaje się do danych medycznych w produkcji.
> Oracle Cloud oferuje Confidential Computing (szyfrowanie RAM podczas przetwarzania) + dedykowane GPU + serwery w EU.
> Dane pacjentów **nigdy** nie trafiają na RunPod w produkcji.

### 4.2 Schema Bazy Danych (Convex TypeScript)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Foldery (grupowanie projektów)
  folders: defineTable({
    userId: v.string(),
    name: v.string(),
  }).index("by_userId", ["userId"]),

  // Projekty (klienci / sprawy)
  projects: defineTable({
    userId: v.string(),              // z Convex Auth
    name: v.string(),                // np. "Klient X — Umowa"
    description: v.optional(v.string()),
    archived: v.boolean(),
    folderId: v.optional(v.id("folders")),
  }).index("by_user", ["userId"]),

  // Transkrypcje (nagrania w projekcie)
  transcriptions: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),   // np. "Spotkanie 12 lut"
    content: v.string(),             // pełna transkrypcja
    durationSeconds: v.optional(v.number()),
    blockchainTxHash: v.optional(v.string()),
    blockchainVerified: v.boolean(),
  }).index("by_project", ["projectId"]),

  // Rozmowy z AI (chat history per projekt)
  conversations: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),   // auto-generowany
    chatMode: v.optional(
      v.union(v.literal("transcription"), v.literal("project"))
    ),
    scopedTranscriptionIds: v.optional(
      v.array(v.id("transcriptions"))
    ),
  }).index("by_projectId", ["projectId"]),

  // Wiadomości w rozmowie
  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    sources: v.optional(v.array(v.object({
      transcriptionId: v.id("transcriptions"),
      quote: v.string(),
      timestamp: v.optional(v.string()),
    }))),
  }).index("by_conversation", ["conversationId"]),

  // Embeddingi do RAG (vector search)
  embeddings: defineTable({
    projectId: v.id("projects"),
    transcriptionId: v.id("transcriptions"),
    chunkText: v.string(),
    chunkIndex: v.number(),
    embedding: v.array(v.float64()),  // wektor 384-dim
  })
    .index("by_transcription", ["transcriptionId"])
    .index("by_projectId", ["projectId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,               // all-MiniLM-L6-v2
      filterFields: ["projectId"],
    }),

  // Waitlist
  waitlist: defineTable({
    email: v.string(),
  }),
});
```

### 4.3 Wymagania Użytkownika (Minimalne)

- **Przeglądarka:** Chrome, Safari, Firefox (z Web Audio API)
- **Internet:** wymagany
- **Mikrofon:** wbudowany lub zewnętrzny
- **Nic więcej.** Brak instalacji, brak modeli, brak walletów.

---

## 5. UX / Interfejs Użytkownika

### 5.1 Przepływ użytkownika — 3 kroki

```
   ┌──────┐     ┌──────────┐     ┌──────────┐
   │LOGIN │ ──→ │ RECORD   │ ──→ │ CHAT     │
   │      │     │          │     │          │
   │Google│     │● Nagrywaj│     │"Podsumuj │
   │Email │     │■ Stop    │     │ spotkanie│
   └──────┘     └──────────┘     └──────────┘
```

### 5.2 Dashboard — Dwa-panelowy widok

```
┌─────────────────────────────────────────────────────┐
│  Lilapu                           👤 Jan Kowalski ▼  │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│  📄 Moje Notatki     │   📝 Spotkanie z klientem X  │
│                      │   12 lut 2026, 14:30         │
│  🔍 Szukaj...        │   ✅ Zabezpieczone           │
│                      │                              │
│  ┌────────────────┐  │   Transkrypcja:              │
│  │ Spotkanie X ✅ │  │   "Omówiliśmy warunki        │
│  │ 12 lut, 14:30  │  │    umowy na dostawę..."      │
│  ├────────────────┤  │                              │
│  │ Wywiad Y   ✅  │  │   ──────────────────         │
│  │ 10 lut, 09:00  │  │                              │
│  ├────────────────┤  │   💬 Zapytaj AI o tę notatkę │
│  │ Wizyta Z   ✅  │  │   ┌──────────────────────┐   │
│  │ 8 lut, 11:15   │  │   │ "Co ustaliliśmy o    │   │
│  └────────────────┘  │   │  terminach?"          │   │
│                      │   └──────────────────────┘   │
│  [● Nowe nagranie]   │                              │
│                      │   > Na podstawie notatki:    │
│                      │     Ustalono termin           │
│                      │     dostawy na 15 marca...   │
├──────────────────────┴──────────────────────────────┤
│  🟢 Online · ✅ 3 notatki zabezpieczone              │
└─────────────────────────────────────────────────────┘
```

### 5.3 Ekran Nagrywania (Live)

```
┌─────────────────────────────────────────────────────┐
│  Lilapu — Nagrywanie                                │
├─────────────────────────────────────────────────────┤
│                                                     │
│         🔴 Nagrywanie...  ● 00:14:32                │
│         ████████████████░░░░░ (audio waveform)      │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │  "Dzisiaj omawiamy warunki kontraktu        │    │
│  │   na dostawę komponentów elektronicznych.   │    │
│  │   Pan Nowak proponuje termin realizacji     │    │
│  │   na 15 marca, z opcją przedłużenia do..."  │    │
│  │                                             │    │
│  │   ▍ (kursor — tekst pojawia się na żywo)    │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│            [■ Zakończ nagrywanie]                    │
│                                                     │
│  Tytuł: [Spotkanie z klientem X      ]              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.4 Kluczowe elementy UI

- **Przycisk "Nagrywaj"** — duży, czerwony, animacja pulsowania
- **Live Transcript** — tekst w czasie rzeczywistym, streaming efekt
- **✅ Badge** — "Zabezpieczone" (blockchain w tle, user tego nie widzi)
- **Chat** — prosty input pod notatką, odpowiedzi z cytatami
- **Dark Mode** — domyślny, premium estetyka
- **Mobile responsive** — działa na telefonie z przeglądarki

---

## 6. Smart Kontrakt — `NoteNotary.sol`

Działa **całkowicie na backendzie**. Użytkownik nie wie że istnieje.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NoteNotary {
    struct NoteProof {
        bytes32 contentHash;
        uint256 timestamp;
        address author;
    }

    mapping(bytes32 => NoteProof) public proofs;
    mapping(bytes32 => bytes32[]) public auditTrail;

    event NoteNotarized(bytes32 indexed contentHash, uint256 timestamp);

    function notarize(bytes32 _contentHash) external {
        require(proofs[_contentHash].timestamp == 0, "Exists");
        proofs[_contentHash] = NoteProof(_contentHash, block.timestamp, msg.sender);
        emit NoteNotarized(_contentHash, block.timestamp);
    }

    function addVersion(bytes32 _noteId, bytes32 _versionHash) external {
        auditTrail[_noteId].push(_versionHash);
        proofs[_versionHash] = NoteProof(_versionHash, block.timestamp, msg.sender);
    }

    function verify(bytes32 _contentHash) external view returns (uint256, address) {
        NoteProof memory p = proofs[_contentHash];
        require(p.timestamp != 0, "Not found");
        return (p.timestamp, p.author);
    }

    function getAuditTrail(bytes32 _noteId) external view returns (bytes32[] memory) {
        return auditTrail[_noteId];
    }
}
```

---

## 6.1 Model Bezpieczeństwa — 3 Warstwy

```
┌───────────────────────────────────────────────────┐
│  WARSTWA 3: BLOCKCHAIN (Integralność)             │
│  • Automatyczny hash każdej notatki               │
│  • Niewidoczny dla użytkownika                    │
│  • Dowód niezmienności na żądanie                 │
├───────────────────────────────────────────────────┤
│  WARSTWA 2: ENCRYPTION AT REST (Poufność)         │
│  • AES-256 szyfrowanie w Convex                   │
│  • User isolation via index + auth                │
│  • Reset hasła NIE powoduje utraty danych         │
├───────────────────────────────────────────────────┤
│  WARSTWA 1: AUTH + INFRA (Dostęp)                 │
│  • Convex Auth (Google / email)                   │
│  • User isolation w serverless functions            │
│  • HTTPS everywhere                               │
└───────────────────────────────────────────────────┘
```

---

## 7. Model Biznesowy

### 7.1 Strategia: Freemium → Pro → Enterprise

| | 🆓 **Free** | 💼 **Pro** | 🏢 **Enterprise** |
|---|---|---|---|
| **Cena** | $0 | $19/mies. lub $149/rok | $49/mies./użytkownik |
| **Transkrypcja** | 3 godz./mies. | ♾️ Bez limitu | ♾️ Bez limitu |
| **RAG Chat** | 20 pytań/dzień | ♾️ Bez limitu | ♾️ Bez limitu |
| **Blockchain Notary** | ✅ Auto (basic) | ✅ + weryfikacja + PDF | ✅ + compliance dashboard |
| **E2EE** | ❌ (server-side) | ❌ (server-side) | ❌ (server-side + central mgmt) |
| **Eksport** | TXT | TXT, PDF, DOCX | + API, webhooks |
| **Storage** | 1 GB | 50 GB | Custom |
| **Wsparcie** | Community | Email 48h | Dedykowany 4h SLA |

### 7.2 Koszty Operacyjne

**FAZA LOCAL (demo / marketing / whitelist):**

| Pozycja | Koszt / mies. | Uwagi |
|---------|-------------|-------|
| **Convex** (DB + Auth) | $0 | Free tier |
| **Vercel** (frontend) | $0 | Free tier |
| **AI (Whisper + Bielik)** | **$0** | Działa na Twoim Macu |
| **Domena** | ~$1 | lilapu.com |
| **RAZEM** | **~$1/mies.** | |

**FAZA SaaS (po walidacji, kiedy są użytkownicy):**

| Pozycja | Koszt / mies. | Uwagi |
|---------|-------------|-------|
| **Convex** (DB + Auth) | $0–25 | Free tier → Pro |
| **Vercel** (frontend) | $0–20 | Free tier → Pro |
| **GPU server** (Whisper + Bielik) | $100–300 | Railway/Fly.io |
| **Blockchain gas** (Base L2) | $1–10 | ~$0.005 per notaryzacja |
| **RAZEM SaaS** | **~$100–355/mies.** | |

**Kluczowe:** Zaczynasz od **$1/mies.** Wydajesz na GPU dopiero kiedy masz płacących userów.

| Scenariusz | Monthly cost |
|-----------|-------------|
| **Demo / whitelist** | **~$1/mies.** |
| **Pierwsi użytkownicy** | **~$100–200/mies.** |
| **100 userów** | **~$200–400/mies.** |
| **1000 userów** | **~$600–1200/mies.** |

### 7.3 Przewaga Konkurencyjna

| Konkurent | Prywatność | Blockchain | E2EE | Cena |
|-----------|-----------|-----------|------|------|
| **NotebookLM** | ❌ Google cloud | ❌ | ❌ | $0 |
| **Otter.ai** | ❌ US servers | ❌ | ❌ | $17/mies. |
| **Fireflies.ai** | ❌ US servers | ❌ | ❌ | $19/mies. |
| **Lilapu** | ✅ **Encrypted** | ✅ **Auto** | ✅ **Per-projekt** | **$19/mies.** |

### 7.4 Go-to-Market

1. **EEC Startup Challenge** → MVP demo, PR, walidacja
2. **Product Hunt** → Privacy & Productivity
3. **Content marketing** → "Dlaczego Twoje notatki ze spotkań nie są bezpieczne"
4. **Direct sales** → kancelarie prawne, kliniki
5. **Enterprise** → Big4 audytorzy, R&D

---

## 8. Roadmap MVP

### Faza 0: Local Dev Mode — testuj za $0 na swoim Macu 🆓

> **Cel:** Przetestuj Whisper + SLM na swoim komputerze zanim wydasz złotówkę na GPU serwer.
> **Koszt:** $0. **Wymagania:** Mac z Apple Silicon (M1/M2/M3) lub PC z 16GB RAM.

**Co testujesz lokalnie:**
- ✅ Whisper.cpp — transkrypcja audio offline
- ✅ llama.cpp — chat z Bielik-7B (polski model) offline
- ✅ Jakość transkrypcji PL i EN
- ✅ Jakość odpowiedzi RAG na Twoich notatkach
- ❌ Nie testujesz: web app, auth, blockchain (to w Fazie 1+)

**Setup krok po kroku:**

```bash
# 1. Zainstaluj whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp && make -j
# Pobierz model (whisper-small = 466MB, dobry na testy PL)
bash models/download-ggml-model.sh small

# 2. Przetestuj transkrypcję z pliku audio
./main -m models/ggml-small.bin -f samples/test.wav -l pl
# Lub nagraj z mikrofonu (5 sekund):
arecord -f S16_LE -r 16000 -d 5 test.wav  # Linux
# Na Mac: użyj QuickTime → New Audio Recording → eksport WAV

# 3. Zainstaluj llama.cpp
cd ..
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp && cmake -B build -DGGML_METAL=ON && cmake --build build -j

# 4. Pobierz Bielik-7B (polski model, ~4.2GB skwantyzowany Q4)
curl -L "https://huggingface.co/speakleash/Bielik-7B-Instruct-v0.1-GGUF/resolve/main/bielik-7b-instruct-v0.1.Q4_K_M.gguf" \
  -o models/bielik-7b-instruct-v0.1.Q4_K_M.gguf

# 5. Przetestuj chat z modelem (po polsku!)
./build/bin/llama-cli -m models/bielik-7b-instruct-v0.1.Q4_K_M.gguf \
  -p "Na podstawie poniższej notatki odpowiedz na pytanie.
Notatka: Spotkanie z klientem X, ustalono termin dostawy na 15 marca.
Pytanie: Jaki jest termin dostawy?" \
  -n 256
```

**Czego się dowiesz:**
- Czy **whisper-small** wystarczy dla polskiego (jeśli nie → whisper-medium)
- Czy **Bielik-7B** dobrze odpowiada po polsku na pytania o notatki
- Jaki jest czas odpowiedzi na Twoim sprzęcie
- Czy to w ogóle działa jak chcesz — **zanim napiszesz linijkę kodu web appu**

**Wydajność na Apple Silicon:**

| Model | Mac M1 (8GB) | Mac M2 Pro (16GB) | Mac M3 Max (36GB) |
|-------|-------------|-------------------|-------------------|
| whisper-small | ~12x realtime ✅ | ~15x realtime ✅ | ~25x realtime ✅ |
| whisper-medium | ~3x realtime ✅ | ~5x realtime ✅ | ~10x realtime ✅ |
| Bielik-7B (Q4) | ~10 tok/s ✅ | ~18 tok/s ✅ | ~35 tok/s ✅ |

> **Przetestowane na M1 8GB:** whisper-small transkrybuje 51 min PL audio w 4:18 (12x realtime).
> Bielik-7B odpowiada po polsku poprawnie (nazwy, gramatyka, cytaty). Jakość potwierdzona.

### Faza 1: Local Web App (Tydzień 1–2) 🏠
- [ ] Next.js 15 + TypeScript + Vanilla CSS boilerplate
- [ ] Convex setup (schema.ts + Auth + vector search)
- [ ] Auth flow: Google login + email/password (Convex Auth)
- [ ] Dashboard UI: sidebar z projektami + widok projektu
- [ ] Dark mode premium styling
- [ ] **whisper.cpp server** na localhost (HTTP API)
- [ ] **llama.cpp server** z Bielik-7B na localhost (HTTP API)
- [ ] `AI_SERVER_URL=http://localhost` — jeden env variable

### Faza 2: Działająca Appka + Marketing (Tydzień 3–4) 🎬
- [ ] WebSocket audio streaming (przeglądarka → local whisper)
- [ ] Live text rendering w UI (streaming)
- [ ] Record/Stop workflow w kontekście projektu
- [ ] Auto-zapis do Convex (transcriptions table)
- [ ] RAG: embeddingi transkrypcji per projekt (Convex vector search)
- [ ] Chat UI z historią rozmów (Gemini-style sidebar)
- [ ] Cytowanie źródeł (link do transkrypcji + timestamp)
- [ ] **Nagraj wideo demo** z działającej appki
- [ ] **Landing page** z whitelist signup
- [ ] **Screeny** pod marketing i social media

### Faza 3: SaaS — tylko po walidacji (Tydzień 5–6) 🚀
- [ ] **Migracja AI z RunPod → Oracle Cloud (OCI)**
  - [ ] Instancja GPU (A10/V100) w OCI Frankfurt (EU)
  - [ ] Confidential Computing (AMD SEV) — szyfrowanie RAM
  - [ ] VCN (prywatna sieć) — kontener AI niedostępny publicznie
- [ ] Multi-user support (wielu użytkowników jednocześnie)
- [ ] Pricing page + Stripe integration
- [ ] System prompt anti-hallucination (project-scoped)
- [ ] **Nagrywanie rozmów online** (`getDisplayMedia` + mikrofon)
- [ ] **Speaker diarization** (pyannote-audio)

### Faza 4: Blockchain (Tydzień 7)
- [ ] Deploy NoteNotary.sol na Base Sepolia
- [ ] Backend worker: auto-notarize po zapisie transkrypcji
- [ ] Server wallet (hot wallet w env vars)
- [ ] Badge ✅ "Zabezpieczone" w UI
- [ ] Strona weryfikacji autentyczności

### Faza 5: Polish & Demo (Tydzień 8–9)
- [ ] Mobile responsive
- [ ] Row Level Security audit
- [ ] Animacje i micro-interactions
- [ ] Landing page + pricing
- [ ] Demo video na EEC Startup Challenge
- [ ] README + dokumentacja

---

## 9. Metryki Sukcesu MVP

| Metryka | Cel |
|---------|-----|
| Czas od logowania do pierwszego nagrania | < 30s |
| Latencja transkrypcji (chunk → tekst) | < 2s |
| Czas odpowiedzi RAG chat | < 3s |
| Czas notaryzacji (po Stop) | < 30s |
| Uptime | > 99.5% |
| Konwersja Free → Pro | > 5% |

---

## 10. Ryzyka i Mitygacje

| Ryzyko | Wpływ | Mitygacja |
|--------|-------|-----------|
| Koszty GPU serwera (Whisper) | Wysoki | Batch processing, auto-scaling, limits na free tier |
| Koszty LLM API | Średni | Cache odpowiedzi, limity pytań na free tier |
| Jakość transkrypcji PL | Średni | whisper-large-v3 (najlepsza), testy z nagraniami PL |
| Blockchain gas spikes | Niski | Batch notaryzacje, Base L2 → ultra tani gas |
| RODO compliance | Niski | Encryption at rest + user isolation + serwery EU |
| Cross-project data leak | Średni | User isolation w Convex functions + scoped RAG queries |

---

## 11. Agent Workflow (Antigravity Orchestration)

### Agent 1: Frontend & Auth
> Zbuduj Next.js 15 app z dark mode UI: login (Convex Auth), sidebar z projektami (jak Gemini), widok projektu z transkrypcjami i chatami, widok nagrywania z live transcription, chat z historią rozmów. Mobile responsive.

### Agent 2: Backend AI (STT + RAG)
> Setup faster-whisper + Bielik-7B na GPU serwerze (llama.cpp server). WebSocket pipeline: audio chunks → transcription → streaming. RAG: Convex vector search embeddingi per projekt → Bielik-7B z kontekstem notatek danego projektu. Zero danych do zewnętrznych API.

### Agent 3: Blockchain & Infrastructure
> Deploy NoteNotary.sol na Base Sepolia. Backend worker auto-notaryzujący z server walleta. Convex schema z user isolation. Badge ✅ w UI.

---

> **Dokument przygotowany dla EEC Startup Challenge 2026 — Kategoria 4TECH**
> **Deadline zgłoszenia: 27 lutego 2026**
