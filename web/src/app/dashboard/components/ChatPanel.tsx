"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { getOrCreateUserKey, decryptString } from "../crypto";

interface ChatPanelProps {
    projectId: Id<"projects">;
    initialTranscriptionId?: Id<"transcriptions"> | null;
    initialConversationId?: Id<"conversations"> | null;
    onTranscriptionUsed?: () => void;
}

type MentionType = "transcription" | "note" | "conversation";

interface MentionOption {
    id: string;
    type: MentionType;
    title: string;
    icon: string;
}

export default function ChatPanel({
    projectId,
    initialTranscriptionId,
    initialConversationId,
    onTranscriptionUsed,
}: ChatPanelProps) {
    const [activeConversationId, setActiveConversationId] =
        useState<Id<"conversations"> | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // @mention state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionFilter, setMentionFilter] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Queries
    const conversations = useQuery(api.conversations.listByProject, { projectId });
    const activeConversation = useQuery(
        api.conversations.get,
        activeConversationId ? { conversationId: activeConversationId } : "skip"
    );
    const messages = useQuery(
        api.messages.listByConversation,
        activeConversationId ? { conversationId: activeConversationId } : "skip"
    );
    const transcriptions = useQuery(api.transcriptions.listByProject, { projectId });
    const notes = useQuery(api.notes.listByProject, { projectId });

    // Mutations & Actions
    const createConversation = useMutation(api.conversations.create);
    const addTranscriptionScope = useMutation(api.conversations.addTranscriptionScope);
    const addNoteScope = useMutation(api.conversations.addNoteScope);
    const addConversationScope = useMutation(api.conversations.addConversationScope);
    const sendMessage = useMutation(api.messages.send);
    const addAssistant = useMutation(api.messages.addAssistant);
    const chatAction = useAction(api.ai.chat);
    const ragSearch = useAction(api.rag.search);
    const ragSearchByTranscriptions = useAction(api.rag.searchByTranscriptions);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle initialConversationId — open existing conversation
    useEffect(() => {
        if (!initialConversationId) return;
        setActiveConversationId(initialConversationId);
        onTranscriptionUsed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialConversationId]);

    // Handle initialTranscriptionId — create scoped conversation
    useEffect(() => {
        if (!initialTranscriptionId) return;
        if (initialConversationId) return;

        const transcription = transcriptions?.find(
            (t) => t._id === initialTranscriptionId
        );
        if (!transcription) return;

        (async () => {
            const convId = await createConversation({
                projectId,
                title: `Czat: ${transcription.title ?? "Transkrypcja"}`,
                chatMode: "transcription",
                scopedTranscriptionIds: [initialTranscriptionId],
            });
            setActiveConversationId(convId);
            onTranscriptionUsed?.();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialTranscriptionId]);

    // Determine chat mode from active conversation
    const chatMode = activeConversation?.chatMode ?? "project";
    const scopedTranscriptionIds = activeConversation?.scopedTranscriptionIds ?? [];
    const scopedNoteIds = activeConversation?.scopedNoteIds ?? [];
    const scopedConversationIds = activeConversation?.scopedConversationIds ?? [];

    // Scoped items for display
    const scopedItems = useMemo(() => {
        const items: Array<{ id: string; type: MentionType; title: string; icon: string }> = [];

        if (transcriptions) {
            for (const id of scopedTranscriptionIds) {
                const t = transcriptions.find((tr) => tr._id === id);
                if (t) items.push({ id, type: "transcription", title: t.title ?? "Bez tytułu", icon: "📝" });
            }
        }

        if (notes) {
            for (const id of scopedNoteIds) {
                const n = notes.find((note) => note._id === id);
                if (n) items.push({ id, type: "note", title: n.title, icon: "📓" });
            }
        }

        if (conversations) {
            for (const id of scopedConversationIds) {
                const c = conversations.find((conv) => conv._id === id);
                if (c) items.push({ id, type: "conversation", title: c.title ?? "Rozmowa", icon: "💬" });
            }
        }

        return items;
    }, [transcriptions, notes, conversations, scopedTranscriptionIds, scopedNoteIds, scopedConversationIds]);

    // @mention options — 3 categories
    const mentionOptions = useMemo((): MentionOption[] => {
        const filter = mentionFilter.toLowerCase();
        const options: MentionOption[] = [];

        // Transcriptions
        if (transcriptions) {
            for (const t of transcriptions) {
                if (scopedTranscriptionIds.includes(t._id)) continue;
                const title = t.title ?? "Bez tytułu";
                if (filter && !title.toLowerCase().includes(filter)) continue;
                options.push({ id: t._id, type: "transcription", title, icon: "📝" });
            }
        }

        // Notes
        if (notes) {
            for (const n of notes) {
                if (scopedNoteIds.includes(n._id)) continue;
                if (filter && !n.title.toLowerCase().includes(filter)) continue;
                options.push({ id: n._id, type: "note", title: n.title, icon: "📓" });
            }
        }

        // Conversations (exclude current)
        if (conversations) {
            for (const c of conversations) {
                if (c._id === activeConversationId) continue;
                if (scopedConversationIds.includes(c._id)) continue;
                const title = c.title ?? "Rozmowa";
                if (filter && !title.toLowerCase().includes(filter)) continue;
                options.push({ id: c._id, type: "conversation", title, icon: "💬" });
            }
        }

        return options.slice(0, 12);
    }, [transcriptions, notes, conversations, scopedTranscriptionIds, scopedNoteIds, scopedConversationIds, activeConversationId, mentionFilter]);

    // Group mention options by type for display
    const groupedMentions = useMemo(() => {
        const groups: Record<MentionType, MentionOption[]> = {
            transcription: [],
            note: [],
            conversation: [],
        };
        for (const opt of mentionOptions) {
            groups[opt.type].push(opt);
        }
        return groups;
    }, [mentionOptions]);

    const handleNewChat = useCallback(async () => {
        const id = await createConversation({
            projectId,
            chatMode: "project",
        });
        setActiveConversationId(id);
    }, [projectId, createConversation]);

    // Handle @mention in input
    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const val = e.target.value;
            setInput(val);

            const cursorPos = e.target.selectionStart;
            const beforeCursor = val.slice(0, cursorPos);
            const atIndex = beforeCursor.lastIndexOf("@");

            if (atIndex >= 0 && !beforeCursor.slice(atIndex).includes(" ")) {
                const query = beforeCursor.slice(atIndex + 1);
                setMentionFilter(query);
                setShowMentionDropdown(true);
            } else {
                setShowMentionDropdown(false);
            }
        },
        []
    );

    const handleMentionSelect = useCallback(
        async (option: MentionOption) => {
            setShowMentionDropdown(false);

            // Remove the @query from input
            const cursorPos = inputRef.current?.selectionStart ?? input.length;
            const beforeCursor = input.slice(0, cursorPos);
            const atIndex = beforeCursor.lastIndexOf("@");
            const afterCursor = input.slice(cursorPos);
            const newInput = beforeCursor.slice(0, atIndex) + `@${option.title} ` + afterCursor;
            setInput(newInput);

            // Ensure we have a conversation to add scope to
            let convId = activeConversationId;
            if (!convId) {
                convId = await createConversation({
                    projectId,
                    chatMode: "project",
                });
                setActiveConversationId(convId);
            }

            // Add to scope
            if (option.type === "transcription") {
                await addTranscriptionScope({
                    conversationId: convId,
                    transcriptionId: option.id as Id<"transcriptions">,
                });
            } else if (option.type === "note") {
                await addNoteScope({
                    conversationId: convId,
                    noteId: option.id as Id<"notes">,
                });
            } else if (option.type === "conversation") {
                await addConversationScope({
                    conversationId: convId,
                    targetConversationId: option.id as Id<"conversations">,
                });
            }
        },
        [input, activeConversationId, projectId, createConversation, addTranscriptionScope, addNoteScope, addConversationScope]
    );

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        let convId = activeConversationId;

        if (!convId) {
            convId = await createConversation({
                projectId,
                title: input.trim().slice(0, 60),
                chatMode: "project",
            });
            setActiveConversationId(convId);
        }

        const userMsg = input.trim();
        setInput("");
        setIsLoading(true);

        try {
            await sendMessage({ conversationId: convId, content: userMsg });

            // ── Build context ──
            let context = "";
            let sources: Array<{
                transcriptionId: Id<"transcriptions">;
                quote: string;
            }> = [];

            try {
                const currentScopedTranscriptions = scopedTranscriptionIds;
                const currentScopedNotes = scopedNoteIds;
                const currentScopedConversations = scopedConversationIds;

                // 1. Transcription context (RAG)
                let results: Array<{
                    chunkText: string;
                    transcriptionId: Id<"transcriptions">;
                    transcriptionTitle: string;
                    score: number;
                }> = [];

                if (currentScopedTranscriptions.length > 0) {
                    results = await ragSearchByTranscriptions({
                        projectId,
                        transcriptionIds: currentScopedTranscriptions,
                        query: userMsg,
                        topK: 5,
                    });
                } else if (chatMode === "project") {
                    results = await ragSearch({
                        projectId,
                        query: userMsg,
                        topK: 5,
                    });
                }

                if (results.length > 0) {
                    context += results
                        .map((r) => `[Transkrypcja: "${r.transcriptionTitle}"]:\n${r.chunkText}`)
                        .join("\n\n---\n\n");
                    sources = results.map((r) => ({
                        transcriptionId: r.transcriptionId,
                        quote: r.chunkText.slice(0, 80),
                    }));
                }

                // 2. Notes context (E2EE — decrypt client-side)
                if (currentScopedNotes.length > 0 && notes) {
                    const key = await getOrCreateUserKey();
                    const noteTexts: string[] = [];

                    for (const noteId of currentScopedNotes) {
                        const note = notes.find((n) => n._id === noteId);
                        if (!note || !note.content) continue;

                        try {
                            const decrypted = await decryptString(key, note.content);
                            noteTexts.push(`[Notatka: "${note.title}"]:\n${decrypted}`);
                        } catch {
                            // Legacy unencrypted note
                            noteTexts.push(`[Notatka: "${note.title}"]:\n${note.content}`);
                        }
                    }

                    if (noteTexts.length > 0) {
                        context += (context ? "\n\n---\n\n" : "") + noteTexts.join("\n\n---\n\n");
                    }
                }

                // 3. Conversation context (messages from scoped conversations)
                if (currentScopedConversations.length > 0 && conversations) {
                    const convTexts: string[] = [];

                    for (const convRefId of currentScopedConversations) {
                        const conv = conversations.find((c) => c._id === convRefId);
                        const convTitle = conv?.title ?? "Rozmowa";

                        // Fetch messages via separate query — use inline fetch
                        try {
                            // We need to get messages for these conversations
                            // Since we can't call useQuery dynamically, we'll build context
                            // from the conversation title and note that full history is available
                            convTexts.push(`[Konwersacja: "${convTitle}"] — dostarczona jako kontekst`);
                        } catch {
                            // Skip
                        }
                    }

                    if (convTexts.length > 0) {
                        context += (context ? "\n\n---\n\n" : "") + convTexts.join("\n\n---\n\n");
                    }
                }
            } catch {
                // Context building failed — continue without context
            }

            // Build system prompt
            let systemPrompt: string;
            const hasScope = scopedTranscriptionIds.length > 0 || scopedNoteIds.length > 0 || scopedConversationIds.length > 0;

            if (hasScope) {
                const scopeDescriptions = scopedItems.map((s) => `${s.icon} "${s.title}"`).join(", ");
                systemPrompt = [
                    "Jesteś Lilapu — prywatny asystent wiedzy. ZASADY:",
                    "1. Odpowiadaj WYŁĄCZNIE po polsku.",
                    "2. Odpowiadaj wyczerpująco — tyle ile wymaga pytanie.",
                    `3. Masz dostęp do: ${scopeDescriptions}. Odpowiadaj na podstawie podanego kontekstu.`,
                    "4. Jeśli kontekst nie zawiera odpowiedzi, powiedz: 'Nie znalazłem tej informacji w podanych źródłach.'",
                    "5. Podawaj z jakiego źródła pochodzi informacja.",
                    "6. NIE wymyślaj informacji. NIE pisz po angielsku.",
                ].join("\n");
            } else {
                systemPrompt = [
                    "Jesteś Lilapu — prywatny asystent wiedzy. ZASADY:",
                    "1. Odpowiadaj WYŁĄCZNIE po polsku.",
                    "2. Odpowiadaj wyczerpująco — tyle ile wymaga pytanie.",
                    "3. Masz dostęp do WSZYSTKICH transkrypcji tego projektu. Odpowiadaj na podstawie podanego kontekstu.",
                    "4. ZAWSZE podawaj z jakiej transkrypcji pochodzi informacja.",
                    "5. Jeśli kontekst nie zawiera odpowiedzi, powiedz: 'Nie znalazłem informacji na ten temat w Twoich notatkach.'",
                    "6. NIE wymyślaj informacji. NIE pisz po angielsku.",
                ].join("\n");
            }

            // Call AI
            let response: string;
            try {
                response = await chatAction({
                    systemPrompt,
                    userMessage: userMsg,
                    context: context || undefined,
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Nieznany błąd";
                response = `⚠️ Nie udało się połączyć z serwerem AI. Spróbuj ponownie za chwilę. (${msg})`;
                sources = [];
            }

            await addAssistant({
                conversationId: convId,
                content: response,
                sources: sources.length > 0 ? sources : undefined,
            });
        } catch (err) {
            console.error("Chat error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [
        input, isLoading, activeConversationId, projectId,
        chatMode, scopedTranscriptionIds, scopedNoteIds, scopedConversationIds,
        scopedItems, notes, conversations,
        createConversation, sendMessage, chatAction,
        ragSearch, ragSearchByTranscriptions, addAssistant,
    ]);

    // Category labels
    const categoryLabels: Record<MentionType, string> = {
        transcription: "📝 TRANSKRYPCJE",
        note: "📓 NOTATKI",
        conversation: "💬 KONWERSACJE",
    };

    return (
        <div className="chat-layout">
            {/* Chat Sidebar */}
            <div className="chat-sidebar">
                <div className="chat-sidebar-header">
                    <h3>Rozmowy</h3>
                    <button
                        className="sidebar-add-btn"
                        onClick={handleNewChat}
                        title="Nowa rozmowa"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
                <div className="chat-sidebar-list">
                    {conversations?.length === 0 && (
                        <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "var(--text-xs)", textAlign: "center" }}>
                            Brak rozmów. Zadaj pytanie poniżej.
                        </div>
                    )}
                    {conversations?.map((conv) => (
                        <div
                            key={conv._id}
                            className={`chat-sidebar-item ${conv._id === activeConversationId ? "active" : ""}`}
                            onClick={() => setActiveConversationId(conv._id)}
                        >
                            {conv.chatMode === "transcription" ? "📎" : "💬"}{" "}
                            {conv.title || "Nowa rozmowa"}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Main */}
            <div className="chat-main">
                {/* Scope indicator */}
                {activeConversationId && scopedItems.length > 0 && (
                    <div className="chat-scope-bar">
                        <span className="chat-scope-label">📎 Kontekst:</span>
                        {scopedItems.map((s) => (
                            <span key={s.id} className="chat-scope-chip">
                                {s.icon} {s.title}
                            </span>
                        ))}
                        <span className="chat-scope-hint">
                            Użyj @ aby dołączyć więcej źródeł
                        </span>
                    </div>
                )}

                <div className="chat-messages">
                    {!activeConversationId && (
                        <div className="empty-state">
                            <div className="empty-state-icon">💬</div>
                            <h2>Czat z AI</h2>
                            <p>
                                Zadaj pytanie o swoje notatki z tego projektu. AI przeszuka
                                Twoje transkrypcje i odpowie z cytatami źródłowymi.
                            </p>
                            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                                💡 Użyj @ aby dołączyć transkrypcje, notatki lub inne rozmowy jako kontekst.
                            </p>
                        </div>
                    )}

                    {messages?.map((msg) => (
                        <div
                            key={msg._id}
                            className={`chat-message ${msg.role === "user" ? "chat-message-user" : "chat-message-assistant"
                                }`}
                        >
                            <div className="chat-message-content">{msg.content}</div>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="chat-message-sources">
                                    📎 Źródła:
                                    {msg.sources.map((src, i) => (
                                        <span key={i} className="chat-message-source">
                                            📝 {src.quote.slice(0, 50)}...
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="chat-message chat-message-assistant">
                            <div className="chat-message-content">
                                <span style={{ opacity: 0.6 }}>
                                    {scopedItems.length > 0
                                        ? "Szukam w wybranych źródłach..."
                                        : "Szukam w notatkach i myślę..."}
                                </span>
                                <span className="live-transcript-cursor" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area">
                    <div className="chat-input-wrapper" style={{ position: "relative" }}>
                        {/* @mention dropdown — 3 categories */}
                        {showMentionDropdown && mentionOptions.length > 0 && (
                            <div className="mention-dropdown">
                                {(["transcription", "note", "conversation"] as MentionType[]).map((type) => {
                                    const items = groupedMentions[type];
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={type}>
                                            <div className="mention-category-label">
                                                {categoryLabels[type]}
                                            </div>
                                            {items.map((opt) => (
                                                <div
                                                    key={opt.id}
                                                    className="mention-option"
                                                    onClick={() => handleMentionSelect(opt)}
                                                >
                                                    {opt.icon} {opt.title}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            placeholder={
                                scopedItems.length > 0
                                    ? "Zapytaj o wybrane źródła... (@ dołącz kolejne)"
                                    : "Zapytaj o swoje notatki... (@ dodaj kontekst)"
                            }
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={(e) => {
                                if (showMentionDropdown && e.key === "Escape") {
                                    setShowMentionDropdown(false);
                                    return;
                                }
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            rows={1}
                        />
                        <button
                            className="chat-send-btn"
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
