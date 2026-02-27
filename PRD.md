# PRD: Lilapu — Twój prywatny asystent AI
### Privacy-First Knowledge Assistant · v0.1.0

> **Kategoria konkursowa:** 4TECH — EEC Startup Challenge (nabór do 27.02.2026)
> **Repozytorium:** `/Users/pawelszczabel/Lilapu`

---

## 1. Wizja Produktu

**Natywna aplikacja desktop (macOS / Windows) + webowa strona z waitlistą** do transkrypcji audio na żywo, OCR notatek odręcznych, zarządzania notatkami i rozmów z AI. Privacy-first: szyfrowanie end-to-end w przeglądarce, polski model AI (Bielik), zero danych do big-techów.

**Strategia:** Desktop-first → SaaS. Natywna aplikacja Tauri zapewnia dostęp do mikrofonu, system audio i screenshot bez ograniczeń przeglądarki. Web app serwuje landing page z waitlistą.

Różnica od konkurencji:
- **Prywatność** — E2EE (AES-256-GCM), polski AI na infrastrukturze EU, zero-retention
- **Desktop natywny** — przechwytywanie audio systemowego (rozmowy online), screenshot OCR, tray menu
- **Organizacja per klient/projekt** — foldery, notatki, transkrypcje, czaty z AI
- **OCR notatek odręcznych** — skanowanie zdjęć i screenów (GOT-OCR 2.0)

### Filozofia UX

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│   Użytkownik widzi:   Zaloguj się → Wybierz folder/projekt   │
│                       → Nagrywaj / Notuj / Skanuj → Chat AI  │
│                                                               │
│   W tle działa:       E2EE + RAG pipeline + OCR + Diaryzacja │
│                                                               │
│   Użytkownik NIE widzi: nic technicznego. Po prostu działa.  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Grupa Docelowa

Profesjonaliści, którzy **nagrywają rozmowy** i potrzebują dowodu ich autentyczności:

- 🏛️ **Prawnicy** — poufność klient-adwokat, dowody w sprawach
- 🏥 **Lekarze** — dokumentacja wizyt, RODO
- 📰 **Dziennikarze** — ochrona źródeł, weryfikowalność cytatów
- 🔬 **R&D / konsultanci** — notatki ze spotkań, IP protection
- 📋 **Audytorzy** — niezaprzeczalność protokołów

---

## 3. Platformy i Architektura

### 3.1 Desktop App (Tauri v2)

Natywna aplikacja na **macOS** i **Windows**, zbudowana w **Tauri v2** (Rust backend + React 19 frontend + Vite bundler).

| Komponent | Technologia | Opis |
|-----------|------------|------|
| **Backend natywny** | Rust | Audio capture, screenshot, system tray, auto-updater |
| **Frontend** | React 19 + TypeScript + Vite | UI, logika biznesowa, E2EE crypto |
| **Audio (mikrofon)** | `cpal` (Rust) | Natywne przechwytywanie z mikrofonu |
| **Audio (system)** | ScreenCaptureKit (macOS) | Przechwytywanie audio z rozmów online (Meet, Zoom) |
| **Screenshot** | `xcap` (Rust) | Przechwytywanie ekranu do OCR |
| **Auth** | `tauri-plugin-clerk` | Clerk auth routowany przez Rust (FAPI bypass) |
| **Persistencja auth** | `tauri-plugin-store` | Zapamiętanie sesji po restarcie |
| **Auto-updater** | `tauri-plugin-updater` | Aktualizacje z GitHub Releases |
| **Global shortcuts** | `tauri-plugin-global-shortcut` | ⌘+Shift+S → Screenshot OCR |
| **System tray** | Tauri tray API | Menu: Nagrywaj / Pokaż / Zamknij |
| **Bundling** | Tauri CLI | `.dmg` (macOS), `.msi` (Windows) |
| **CI/CD** | GitHub Actions | `desktop-release.yml` → build + publish |

### 3.2 Web App (Next.js 16)

Strona internetowa na **lilapu.com**, służąca jako **landing page z waitlistą** i stronami prawnymi.

| Komponent | Technologia | Opis |
|-----------|------------|------|
| **Framework** | Next.js 16 + TypeScript | SSR, routing, React |
| **Styling** | Vanilla CSS (dark mode first) | Premium look, pełna kontrola |
| **Auth** | Clerk (`@clerk/nextjs`) | Waitlista, logowanie |
| **Baza danych** | Convex | Reactive document DB |
| **Hosting** | Vercel | SSR, CDN, auto-deploy z GitHub |
| **Analityka** | PostHog (serwery EU) | Product analytics na stronach publicznych (nie dashboard) |
| **Analityka (basic)** | Vercel Analytics | Page views |

### 3.3 Backend AI (RunPod Serverless)

| Model | Endpoint | Cel |
|-------|---------|-----|
| **Whisper** (faster-whisper) | RunPod WebSocket | Transkrypcja na żywo (streaming, polski) |
| **Parakeet** (NVIDIA) | RunPod Serverless | Szybka transkrypcja notatek głosowych |
| **Bielik** (SpeakLeash, vLLM) | RunPod Serverless | Chat AI, polerowanie transkrypcji, podsumowania |
| **GOT-OCR 2.0** | RunPod Serverless | OCR notatek odręcznych ze zdjęć |
| **all-MiniLM-L6-v2** | RunPod Serverless | Embeddingi do RAG (384-dim) |

---

## 4. Funkcje (stan aktualny)

### 4.1 🔐 Logowanie

- **Clerk** — Google login + email/password + MFA (2FA)
- Desktop: auth routowany przez Rust (tauri-plugin-clerk) → brak problemów z cookies WebView
- Persistencja sesji po restarcie (tauri-plugin-store)
- Lokalizacja: polski (plPL)

### 4.2 🔒 Szyfrowanie End-to-End (E2EE)

Prawdziwe szyfrowanie end-to-end — dane **szyfrowane w aplikacji** przed wysłaniem na serwer.

**Implementacja:**
- **Algorytm:** AES-256-GCM (Web Crypto API)
- **Derivacja klucza:** PBKDF2 (600 000 iteracji, SHA-256)
- **Salt:** SHA-256(email) — deterministyczny, ten sam klucz na każdym urządzeniu
- **IV:** 12 bajtów, losowy per operacja
- **Przechowywanie klucza:** sessionStorage (czyści się po zamknięciu)
- **Weryfikacja hasła:** token weryfikacyjny w bazie (`userKeys` table)

**Co jest szyfrowane:**
- ✅ Transkrypcje (tekst + tytuł)
- ✅ Nagrania audio (blob)
- ✅ Notatki (tekst + tytuł)
- ✅ Rozmowy z AI (wiadomości)
- ❌ Metadane (nazwy projektów, foldery) — nieszyfrowane

**Ważne:** Utrata hasła szyfrowania = nieodwracalna utrata danych. Brak mechanizmu recovery.

### 4.3 📁 Foldery i Projekty

- **Foldery** — grupowanie projektów (np. per klient, pacjent)
- **Projekty** — workspace z transkrypcjami, notatkami, czatami AI
- Archiwizacja folderów i projektów
- Sidebar z drzewem: Foldery → Projekty

### 4.4 🎙️ Transkrypcja na Żywo (Streaming STT)

**Desktop (Tauri):**
1. Kliknięcie "Nagrywaj" → Rust przechwytuje mikrofon (cpal)
2. Na macOS: jednoczesne przechwytywanie audio systemowego (ScreenCaptureKit)
3. Audio wysyłane przez WebSocket do RunPod (faster-whisper)
4. Tekst streamowany na żywo w UI
5. Stop → diaryzacja (osobne ścieżki: Ty + Rozmówca)
6. Audio szyfrowane E2EE → upload do Convex Storage
7. Transkrypcja szyfrowana → zapis do Convex

**Przetwarzanie po nagraniu:**
- Polerowanie transkrypcji (Bielik) — poprawia interpunkcję, gramatykę
- Auto-podsumowanie sesji (Bielik) — streszczenie tematów
- Embeddingi dla RAG (all-MiniLM-L6-v2) — indeksowanie do wyszukiwania

**Tryby diaryzacji:**
- **2 mówców (desktop):** osobne ścieżki mic + system audio → [Ty] / [Rozmówca]
- **Multi-speaker:** transkrypcja z diaryzacją via Whisper+pyannote

### 4.5 📝 Notatki

- Tworzenie notatek tekstowych (markdown)
- **Notatki głosowe** — nagranie → transkrypcja (Parakeet, szybka) → zapis jako notatka
- Import plików (DOCX via mammoth)
- Eksport do DOCX (docx + file-saver)
- Markdown rendering w UI
- E2EE — wszystko szyfrowane

### 4.6 📸 OCR Notatek Odręcznych

**3 sposoby skanowania:**
1. **Screenshot** — ⌘+Shift+S → przechwycenie ekranu (xcap) → OCR
2. **Drag & Drop** — przeciągnięcie zdjęcia → OCR
3. **Kamera** — live preview z kamery → frame capture → OCR

**Model:** GOT-OCR 2.0 (RunPod Serverless)
**Post-processing:** Bielik poprawia wynik OCR
**Wynik:** Tworzona notatka z rozpoznanym tekstem (szyfrowana E2EE)

### 4.7 💬 Czat z AI (RAG)

- Chat z kontekstem notatek/transkrypcji projektu
- **Mentions** — @transkrypcja, @notatka, @rozmowa → scoping kontekstu
- RAG: Convex vector search (384-dim embeddings)
- LLM: Bielik (polski model, vLLM na RunPod)
- Historia rozmów per projekt
- Cytowanie źródeł

### 4.8 🖥️ System Tray + Global Shortcuts

- **Tray menu:** 🎙️ Nagrywaj rozmowę / Pokaż Lilapu / Zamknij
- **⌘+Shift+S:** Screenshot → OCR pipeline
- Tray toggle recording → emituje event do frontendu

### 4.9 🔄 Auto-updater

- Sprawdzanie aktualizacji z GitHub Releases
- Automatyczne pobieranie i instalacja
- Klucz publiczny: wbudowany w `tauri.conf.json`

---

## 5. Architektura Techniczna

```
┌──────────────────────────────────────────────────────────────────┐
│                    DESKTOP (Tauri v2)                             │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐   │
│  │ 🔐 E2EE  │  │ 🎙️ Audio │  │ 💬 Chat  │  │ 📝 Notatki     │   │
│  │ AES-256  │  │ cpal/SCK │  │ RAG+LLM  │  │ + Voice + OCR  │   │
│  │ PBKDF2   │  │ Rust     │  │          │  │                │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────────┘   │
│       │              │             │              │              │
│  ┌────▼──────────────▼─────────────▼──────────────▼──────────┐   │
│  │            Clerk Auth (tauri-plugin-clerk)                 │   │
│  │            + Convex (reactive DB)                          │   │
│  └───────────────────────┬───────────────────────────────────┘   │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                       BACKEND                                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │  Whisper     │  │  Bielik      │  │  GOT-OCR 2.0         │   │
│  │  (STT live)  │  │  (Chat/RAG)  │  │  (Handwriting OCR)   │   │
│  │  RunPod WS   │  │  RunPod vLLM │  │  RunPod Serverless   │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────────────┘   │
│         │                 │                  │                   │
│  ┌──────▼─────────────────▼──────────────────▼────────────────┐  │
│  │          Convex (reactive document DB)                      │  │
│  │     (🔒 zaszyfrowane E2EE + vector search + real-time)     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.1 Stack Technologiczny

| Warstwa | Technologia | Uzasadnienie |
|---------|------------|--------------| 
| **Desktop framework** | Tauri v2 (Rust) | Natywny, lekki, bezpieczny, cross-platform |
| **Desktop frontend** | React 19 + TypeScript + Vite | Szybki HMR, nowoczesny React |
| **Web frontend** | Next.js 16 + TypeScript | SSR, landing page, waitlista |
| **Styling** | Vanilla CSS (dark mode first) | Premium look, pełna kontrola |
| **Auth** | Clerk | Google login, email/password, MFA, waitlista |
| **Baza danych** | Convex (reactive document DB) | Real-time, TypeScript schema, serverless |
| **E2EE** | AES-256-GCM + PBKDF2 (Web Crypto API) | Prawdziwe E2EE, zero plaintext na serwerze |
| **STT (live)** | faster-whisper (RunPod WebSocket) | Streaming po polsku, whisper-large-v3 |
| **STT (fast)** | Parakeet (NVIDIA, RunPod) | Szybka transkrypcja notatek głosowych |
| **LLM** | Bielik (SpeakLeash, vLLM, RunPod) | Polski model, chat, podsumowania |
| **OCR** | GOT-OCR 2.0 (RunPod) | Notatki odręczne, wielojęzyczny |
| **Embeddingi** | all-MiniLM-L6-v2 (RunPod) | 384-dim, wielojęzyczny |
| **Vector search** | Convex vector search (wbudowany) | Natywny, zero dodatkowej infra |
| **Audio capture** | cpal (mic) + ScreenCaptureKit (system, macOS) | Natywny dostęp do audio |
| **Screenshot** | xcap (Rust) | Przechwytywanie ekranu |
| **Hosting web** | Vercel | SSR, CDN, auto-deploy |
| **Hosting AI** | RunPod Serverless / WebSocket | GPU on-demand |
| **Analityka** | PostHog (EU) + Vercel Analytics | RODO, tylko na stronach publicznych |
| **CI/CD** | GitHub Actions | Desktop build + release, OCR Docker build |

### 5.2 Schema Bazy Danych (Convex TypeScript)

```typescript
// convex/schema.ts

export default defineSchema({
  // Foldery / Gabinety
  folders: defineTable({
    userId: v.string(),
    name: v.string(),
    archived: v.boolean(),
  }).index("by_userId", ["userId"]),

  // Projekty (klienci / pacjenci)
  projects: defineTable({
    userId: v.string(),
    folderId: v.optional(v.id("folders")),
    name: v.string(),
    description: v.optional(v.string()),
    archived: v.boolean(),
  }).index("by_userId", ["userId"]),

  // Transkrypcje (nagrania w projekcie)
  transcriptions: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),          // szyfrowane E2EE
    content: v.string(),                     // szyfrowane E2EE
    contentWithSpeakers: v.optional(v.string()), // diaryzacja
    speakerCount: v.optional(v.number()),
    audioStorageId: v.optional(v.id("_storage")), // szyfrowany blob
    durationSeconds: v.optional(v.number()),
    summary: v.optional(v.string()),         // szyfrowane E2EE
    blockchainTxHash: v.optional(v.string()),
    blockchainVerified: v.boolean(),
  }).index("by_projectId", ["projectId"]),

  // Notatki per projekt
  notes: defineTable({
    projectId: v.id("projects"),
    title: v.string(),                       // szyfrowane E2EE
    content: v.string(),                     // szyfrowane E2EE
    format: v.optional(v.union(v.literal("md"), v.literal("txt"))),
  }).index("by_projectId", ["projectId"]),

  // Rozmowy z AI
  conversations: defineTable({
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    chatMode: v.optional(v.union(v.literal("transcription"), v.literal("project"))),
    scopedTranscriptionIds: v.optional(v.array(v.id("transcriptions"))),
    scopedNoteIds: v.optional(v.array(v.id("notes"))),
    scopedConversationIds: v.optional(v.array(v.id("conversations"))),
  }).index("by_projectId", ["projectId"]),

  // Wiadomości w rozmowie
  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),                     // szyfrowane E2EE
    sources: v.optional(v.array(v.object({
      transcriptionId: v.id("transcriptions"),
      quote: v.string(),
      timestamp: v.optional(v.string()),
    }))),
  }).index("by_conversationId", ["conversationId"]),

  // Embeddingi do RAG — ZERO PLAINTEXT
  embeddings: defineTable({
    projectId: v.id("projects"),
    transcriptionId: v.id("transcriptions"),
    chunkIndex: v.number(),
    chunkWordCount: v.number(),
    embedding: v.array(v.float64()),         // wektor 384-dim
  })
    .index("by_transcriptionId", ["transcriptionId"])
    .index("by_projectId", ["projectId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["projectId"],
    }),

  // E2EE password verification tokens
  userKeys: defineTable({
    userId: v.string(),
    verificationToken: v.string(),
  }).index("by_userId", ["userId"]),

  // Waitlist (landing page signups)
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
  }).index("by_email", ["email"]),
});
```

---

## 6. Model Bezpieczeństwa — 3 Warstwy

```
┌───────────────────────────────────────────────────┐
│  WARSTWA 3: E2EE (Poufność treści)                │
│  • AES-256-GCM w przeglądarce/aplikacji           │
│  • PBKDF2 600K iteracji (email + hasło)           │
│  • Serwer przechowuje TYLKO ciphertext            │
│  • Utrata hasła = utrata danych (brak recovery)   │
├───────────────────────────────────────────────────┤
│  WARSTWA 2: ZERO-RETENTION AI (Prywatność)        │
│  • Audio przetwarzane w RAM, usuwane natychmiast  │
│  • Modele AI nie trenowane na danych              │
│  • Embeddingi bez plaintext (ZERO PLAINTEXT)      │
├───────────────────────────────────────────────────┤
│  WARSTWA 1: AUTH + INFRA (Dostęp)                 │
│  • Clerk Auth (Google / email + MFA)              │
│  • User isolation w Convex functions              │
│  • HTTPS everywhere + CSP                         │
│  • Tauri: sandboxed WebView                       │
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
| **OCR** | 10 skanów/mies. | ♾️ Bez limitu | ♾️ Bez limitu |
| **E2EE** | ✅ | ✅ | ✅ |
| **Eksport** | TXT | TXT, PDF, DOCX | + API, webhooks |
| **Storage** | 1 GB | 50 GB | Custom |
| **Wsparcie** | Community | Email 48h | Dedykowany 4h SLA |

### 7.2 Przewaga Konkurencyjna

| Konkurent | E2EE | Desktop natywny | OCR | Polski AI | Cena |
|-----------|------|----------------|-----|-----------|------|
| **NotebookLM** | ❌ | ❌ | ❌ | ❌ | $0 |
| **Otter.ai** | ❌ | ❌ | ❌ | ❌ | $17/mies. |
| **Fireflies.ai** | ❌ | ❌ | ❌ | ❌ | $19/mies. |
| **Lilapu** | ✅ | ✅ macOS+Win | ✅ | ✅ Bielik | **$19/mies.** |

---

## 8. Metryki Sukcesu MVP

| Metryka | Cel |
|---------|-----|
| Czas od logowania do pierwszego nagrania | < 30s |
| Latencja transkrypcji (chunk → tekst) | < 2s |
| Czas odpowiedzi RAG chat | < 3s |
| Czas OCR (zdjęcie → tekst) | < 10s |
| Uptime | > 99.5% |

---

## 9. Ryzyka i Mitygacje

| Ryzyko | Wpływ | Mitygacja |
|--------|-------|-----------| 
| Koszty GPU (RunPod) | Wysoki | Serverless (pay-per-use), limity na free tier |
| Jakość transkrypcji PL | Średni | whisper-large-v3 (najlepsza), polerowanie Bielik |
| Utrata hasła E2EE | Wysoki | Wyraźne ostrzeżenia w UI, brak alternatywy (design decision) |
| RODO compliance | Niski | E2EE + PostHog EU + zero-retention AI + serwery EU |
| ScreenCaptureKit permissions | Średni | Instrukcja w UI + fallback mic-only |

---

## 10. Struktura Repozytorium

```
/Users/pawelszczabel/Lilapu/
├── desktop/                    # Tauri v2 Desktop App
│   ├── src/                    # React 19 frontend
│   │   ├── components/         # ProjectSidebar, RecordPanel, ChatPanel,
│   │   │                       # NotesPanel, CameraOCR, TranscriptionView/List,
│   │   │                       # EncryptionPasswordDialog
│   │   ├── hooks/              # useTauriDesktop (shortcuts, drag&drop, tray)
│   │   ├── crypto.ts           # E2EE module (AES-256-GCM + PBKDF2)
│   │   └── main.tsx            # Entry point (Tauri/Web detection)
│   ├── src-tauri/              # Rust backend
│   │   ├── src/
│   │   │   ├── lib.rs          # Tauri commands, app state
│   │   │   ├── audio.rs        # Mic capture (cpal)
│   │   │   ├── system_audio.rs # System audio (ScreenCaptureKit, macOS)
│   │   │   ├── screenshot.rs   # Screen capture (xcap)
│   │   │   └── tray.rs         # System tray menu
│   │   └── tauri.conf.json     # App config, CSP, updater
│   └── package.json
├── web/                        # Next.js 16 Web App
│   ├── src/app/                # Pages
│   │   ├── page.tsx            # Landing page + waitlista
│   │   ├── demo/               # Interactive demo
│   │   ├── login/              # Login page
│   │   ├── dashboard/          # Web dashboard
│   │   ├── polityka-*/         # Legal pages
│   │   └── components/         # CookieBanner, PostHogTracker
│   ├── convex/                 # Convex backend (shared with desktop via symlink)
│   │   ├── schema.ts           # Database schema
│   │   ├── ai.ts               # AI actions (transcribe, chat, OCR, embed)
│   │   ├── rag.ts              # RAG pipeline
│   │   └── ...                 # mutations, queries
│   └── package.json
├── .github/workflows/
│   ├── desktop-release.yml     # Build + publish desktop app
│   └── build-ocr.yml           # Build OCR Docker for RunPod
├── runpod*/                    # RunPod endpoint configs
└── PRD.md                      # Ten dokument
```

---

> **Dokument przygotowany dla EEC Startup Challenge 2026 — Kategoria 4TECH**
> **Ostatnia aktualizacja: 27 lutego 2026**
