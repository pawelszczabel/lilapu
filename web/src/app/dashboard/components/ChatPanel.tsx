"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface ChatPanelProps {
    projectId: Id<"projects">;
}

export default function ChatPanel({ projectId }: ChatPanelProps) {
    const [activeConversationId, setActiveConversationId] =
        useState<Id<"conversations"> | null>(null);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Queries
    const conversations = useQuery(api.conversations.listByProject, { projectId });
    const messages = useQuery(
        api.messages.listByConversation,
        activeConversationId ? { conversationId: activeConversationId } : "skip"
    );

    // Mutations & Actions
    const createConversation = useMutation(api.conversations.create);
    const sendMessage = useMutation(api.messages.send);
    const addAssistant = useMutation(api.messages.addAssistant);
    const chatAction = useAction(api.ai.chat);
    const ragSearch = useAction(api.rag.search);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleNewChat = useCallback(async () => {
        const id = await createConversation({ projectId });
        setActiveConversationId(id);
    }, [projectId, createConversation]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isLoading) return;

        let convId = activeConversationId;

        if (!convId) {
            convId = await createConversation({
                projectId,
                title: input.trim().slice(0, 60),
            });
            setActiveConversationId(convId);
        }

        const userMsg = input.trim();
        setInput("");
        setIsLoading(true);

        try {
            await sendMessage({ conversationId: convId, content: userMsg });

            // RAG: search for relevant context from project transcriptions
            let context = "";
            let sources: Array<{
                transcriptionId: Id<"transcriptions">;
                quote: string;
            }> = [];

            try {
                const results = await ragSearch({
                    projectId,
                    query: userMsg,
                    topK: 5,
                });

                if (results.length > 0) {
                    context = results
                        .map((r, i) => `[Źródło ${i + 1}]: ${r.chunkText}`)
                        .join("\n\n");

                    sources = results.map((r) => ({
                        transcriptionId: r.transcriptionId,
                        quote: r.chunkText.slice(0, 80),
                    }));
                }
            } catch {
                // RAG unavailable — continue without context
            }

            // Call AI with RAG context
            let response: string;
            try {
                response = await chatAction({
                    systemPrompt: [
                        "Jesteś Lilapu — prywatny asystent wiedzy. ZASADY:",
                        "1. Odpowiadaj WYŁĄCZNIE po polsku.",
                        "2. Odpowiadaj wyczerpująco — tyle ile wymaga pytanie.",
                        "3. Jeśli poniżej jest kontekst z notatek, odpowiadaj TYLKO na jego podstawie.",
                        "4. Jeśli nie ma kontekstu lub kontekst nie zawiera odpowiedzi, powiedz: 'Nie znalazłem informacji na ten temat w Twoich notatkach.'",
                        "5. NIE wymyślaj cytatów. NIE dodawaj komentarzy w nawiasach kwadratowych.",
                        "6. NIE pisz po angielsku. NIE dodawaj [Source:] ani [Źródło:].",
                    ].join("\n"),
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
        createConversation,
        sendMessage,
        chatAction,
        ragSearch,
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
                            💬 {conv.title || "Nowa rozmowa"}
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Main */}
            <div className="chat-main">
                <div className="chat-messages">
                    {!activeConversationId && (
                        <div className="empty-state">
                            <div className="empty-state-icon">💬</div>
                            <h2>Czat z AI</h2>
                            <p>
                                Zadaj pytanie o swoje notatki z tego projektu. AI przeszuka
                                Twoje transkrypcje i odpowie z cytatami źródłowymi.
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
                                <span style={{ opacity: 0.6 }}>Szukam w notatkach i myślę...</span>
                                <span className="live-transcript-cursor" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area">
                    <div className="chat-input-wrapper">
                        <textarea
                            className="chat-input"
                            placeholder="Zapytaj o swoje notatki..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
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
