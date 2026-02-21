"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface ChatPanelProps {
    projectId: Id<"projects">;
    initialTranscriptionId?: Id<"transcriptions"> | null;
    onTranscriptionUsed?: () => void;
}

export default function ChatPanel({
    projectId,
    initialTranscriptionId,
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

    // Mutations & Actions
    const createConversation = useMutation(api.conversations.create);
    const addTranscriptionScope = useMutation(api.conversations.addTranscriptionScope);
    const sendMessage = useMutation(api.messages.send);
    const addAssistant = useMutation(api.messages.addAssistant);
    const chatAction = useAction(api.ai.chat);
    const ragSearch = useAction(api.rag.search);
    const ragSearchByTranscriptions = useAction(api.rag.searchByTranscriptions);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Handle initialTranscriptionId — create scoped conversation
    useEffect(() => {
        if (!initialTranscriptionId) return;

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
    const scopedIds = activeConversation?.scopedTranscriptionIds ?? [];

    // Scoped transcription names for display
    const scopedNames = useMemo(() => {
        if (!transcriptions || scopedIds.length === 0) return [];
        return scopedIds
            .map((id) => {
                const t = transcriptions.find((tr) => tr._id === id);
                return t ? { id, title: t.title ?? "Bez tytułu" } : null;
            })
            .filter(Boolean) as Array<{ id: Id<"transcriptions">; title: string }>;
    }, [transcriptions, scopedIds]);

    // Filtered transcriptions for @mention dropdown
    const mentionOptions = useMemo(() => {
        if (!transcriptions) return [];
        return transcriptions
            .filter((t) => {
                // Don't show already-scoped transcriptions
                if (scopedIds.includes(t._id)) return false;
                // Filter by search query
                const title = (t.title ?? "").toLowerCase();
                return title.includes(mentionFilter.toLowerCase());
            })
            .slice(0, 8);
    }, [transcriptions, scopedIds, mentionFilter]);

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

            // Check if user is typing @mention
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
        async (transcriptionId: Id<"transcriptions">, title: string) => {
            setShowMentionDropdown(false);

            // Remove the @query from input
            const cursorPos = inputRef.current?.selectionStart ?? input.length;
            const beforeCursor = input.slice(0, cursorPos);
            const atIndex = beforeCursor.lastIndexOf("@");
            const afterCursor = input.slice(cursorPos);
            const newInput = beforeCursor.slice(0, atIndex) + `@${title} ` + afterCursor;
            setInput(newInput);

            // Add transcription to conversation scope
            if (activeConversationId) {
                await addTranscriptionScope({
                    conversationId: activeConversationId,
                    transcriptionId,
                });
            }
        },
        [input, activeConversationId, addTranscriptionScope]
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

            // RAG: search based on chat mode
            let context = "";
            let sources: Array<{
                transcriptionId: Id<"transcriptions">;
                quote: string;
            }> = [];

            try {
                const currentMode = chatMode;
                const currentScopedIds = scopedIds;

                let results: Array<{
                    chunkText: string;
                    transcriptionId: Id<"transcriptions">;
                    transcriptionTitle: string;
                    score: number;
                }> = [];

                if (
                    currentMode === "transcription" &&
                    currentScopedIds.length > 0
                ) {
                    // Transcription-scoped search
                    results = await ragSearchByTranscriptions({
                        projectId,
                        transcriptionIds: currentScopedIds,
                        query: userMsg,
                        topK: 5,
                    });
                } else {
                    // Project-level search
                    results = await ragSearch({
                        projectId,
                        query: userMsg,
                        topK: 5,
                    });
                }

                if (results.length > 0) {
                    context = results
                        .map(
                            (r, i) =>
                                `[Transkrypcja: "${r.transcriptionTitle}"]:\n${r.chunkText}`
                        )
                        .join("\n\n---\n\n");

                    sources = results.map((r) => ({
                        transcriptionId: r.transcriptionId,
                        quote: r.chunkText.slice(0, 80),
                    }));
                }
            } catch {
                // RAG unavailable — continue without context
            }

            // Build system prompt based on mode
            let systemPrompt: string;

            if (chatMode === "transcription") {
                const scopeNames = scopedNames
                    .map((s) => `"${s.title}"`)
                    .join(", ");
                systemPrompt = [
                    "Jesteś Lilapu — prywatny asystent wiedzy. ZASADY:",
                    "1. Odpowiadaj WYŁĄCZNIE po polsku.",
                    "2. Odpowiadaj wyczerpująco — tyle ile wymaga pytanie.",
                    `3. Masz dostęp TYLKO do tych transkrypcji: ${scopeNames}. Odpowiadaj WYŁĄCZNIE na podstawie podanego kontekstu.`,
                    "4. Jeśli kontekst nie zawiera odpowiedzi, powiedz: 'Nie znalazłem tej informacji w podanych transkrypcjach.'",
                    "5. Podawaj z jakiej transkrypcji pochodzi informacja.",
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

            // Call AI with RAG context
            let response: string;
            try {
                response = await chatAction({
                    systemPrompt,
                    userMessage: userMsg,
                    context: context || undefined,
                });
            } catch {
                response =
                    "⚠️ Serwer AI (Bielik-7B) nie jest uruchomiony. Uruchom `./scripts/start-ai.sh` aby połączyć się z lokalnym modelem.";
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
        input,
        isLoading,
        activeConversationId,
        projectId,
        chatMode,
        scopedIds,
        scopedNames,
        createConversation,
        sendMessage,
        chatAction,
        ragSearch,
        ragSearchByTranscriptions,
        addAssistant,
    ]);

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
                        style={{ width: 28, height: 28, fontSize: "0.875rem" }}
                    >
                        +
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
                {activeConversationId && chatMode === "transcription" && scopedNames.length > 0 && (
                    <div className="chat-scope-bar">
                        <span className="chat-scope-label">📎 Kontekst:</span>
                        {scopedNames.map((s) => (
                            <span key={s.id} className="chat-scope-chip">
                                {s.title}
                            </span>
                        ))}
                        <span className="chat-scope-hint">
                            Użyj @nazwa aby dołączyć więcej transkrypcji
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
                                💡 Możesz też rozpocząć czat z konkretną transkrypcją —
                                kliknij &quot;💬 Czat o transkrypcji&quot; na liście transkrypcji.
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
                                    {chatMode === "transcription"
                                        ? "Szukam w wybranych transkrypcjach..."
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
                        {/* @mention dropdown */}
                        {showMentionDropdown && mentionOptions.length > 0 && (
                            <div className="mention-dropdown">
                                {mentionOptions.map((t) => (
                                    <div
                                        key={t._id}
                                        className="mention-option"
                                        onClick={() =>
                                            handleMentionSelect(
                                                t._id,
                                                t.title ?? "Bez tytułu"
                                            )
                                        }
                                    >
                                        📝 {t.title ?? "Bez tytułu"}
                                    </div>
                                ))}
                            </div>
                        )}

                        <textarea
                            ref={inputRef}
                            className="chat-input"
                            placeholder={
                                chatMode === "transcription"
                                    ? "Zapytaj o tę transkrypcję... (@ dołącz kolejną)"
                                    : "Zapytaj o swoje notatki..."
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
