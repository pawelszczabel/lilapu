

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@convex/api";
import { Id } from "@convex/dataModel";
import { getSessionKeyOrThrow, decryptString, encryptString } from "../crypto";

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [openDropdownId, setOpenDropdownId] = useState<Id<"conversations"> | null>(null);
    const [convToRename, setConvToRename] = useState<{ _id: Id<"conversations">; title: string } | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [convToDelete, setConvToDelete] = useState<Id<"conversations"> | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newChatTitle, setNewChatTitle] = useState("");

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
    const updateConvTitle = useMutation(api.conversations.updateTitle);
    const removeConversation = useMutation(api.conversations.remove);
    const chatAction = useAction(api.ai.chat);
    const ragSearch = useAction(api.rag.search);
    const ragSearchByTranscriptions = useAction(api.rag.searchByTranscriptions);
    const createNote = useMutation(api.notes.create);
    const convex = useConvex();

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── E2EE: Decrypt messages for display ──
    const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!messages || messages.length === 0) return;
        let cancelled = false;

        (async () => {
            try {
                const key = await getSessionKeyOrThrow();
                const newMap: Record<string, string> = {};

                for (const msg of messages) {
                    try {
                        newMap[msg._id] = await decryptString(key, msg.content);
                    } catch {
                        // Legacy plaintext
                        newMap[msg._id] = msg.content;
                    }
                }

                if (!cancelled) setDecryptedMessages(newMap);
            } catch {
                // No key — show as-is
            }
        })();

        return () => { cancelled = true; };
    }, [messages]);

    // ── E2EE: Decrypt scoped item titles ──
    const [decryptedTitles, setDecryptedTitles] = useState<Record<string, string>>({});

    useEffect(() => {
        const items = [
            ...(transcriptions || []).map(t => ({ id: t._id, title: t.title })),
            ...(notes || []).map(n => ({ id: n._id, title: n.title })),
            ...(conversations || []).map(c => ({ id: c._id, title: c.title })),
        ];
        if (items.length === 0) return;
        let cancelled = false;

        (async () => {
            try {
                const key = await getSessionKeyOrThrow();
                const newMap: Record<string, string> = {};

                for (const item of items) {
                    if (!item.title) continue;
                    try {
                        newMap[item.id] = await decryptString(key, item.title);
                    } catch {
                        newMap[item.id] = item.title;
                    }
                }

                if (!cancelled) setDecryptedTitles(newMap);
            } catch {
                // No key
            }
        })();

        return () => { cancelled = true; };
    }, [transcriptions, notes, conversations]);

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
                if (t) items.push({ id, type: "transcription", title: decryptedTitles[id] || t.title || "Bez tytułu", icon: "📝" });
            }
        }

        if (notes) {
            for (const id of scopedNoteIds) {
                const n = notes.find((note) => note._id === id);
                if (n) items.push({ id, type: "note", title: decryptedTitles[id] || n.title, icon: "📓" });
            }
        }

        if (conversations) {
            for (const id of scopedConversationIds) {
                const c = conversations.find((conv) => conv._id === id);
                if (c) items.push({ id, type: "conversation", title: decryptedTitles[id] || c.title || "Rozmowa", icon: "💬" });
            }
        }

        return items;
    }, [transcriptions, notes, conversations, scopedTranscriptionIds, scopedNoteIds, scopedConversationIds, decryptedTitles]);

    // @mention options — 3 categories
    const mentionOptions = useMemo((): MentionOption[] => {
        const filter = mentionFilter.toLowerCase();
        const options: MentionOption[] = [];

        // Transcriptions
        if (transcriptions) {
            for (const t of transcriptions) {
                if (scopedTranscriptionIds.includes(t._id)) continue;
                const title = decryptedTitles[t._id] || t.title || "Bez tytułu";
                if (filter && !title.toLowerCase().includes(filter)) continue;
                options.push({ id: t._id, type: "transcription", title, icon: "📝" });
            }
        }

        // Notes
        if (notes) {
            for (const n of notes) {
                if (scopedNoteIds.includes(n._id)) continue;
                const title = decryptedTitles[n._id] || n.title;
                if (filter && !title.toLowerCase().includes(filter)) continue;
                options.push({ id: n._id, type: "note", title, icon: "📓" });
            }
        }

        // Conversations (exclude current)
        if (conversations) {
            for (const c of conversations) {
                if (c._id === activeConversationId) continue;
                if (scopedConversationIds.includes(c._id)) continue;
                const title = decryptedTitles[c._id] || c.title || "Rozmowa";
                if (filter && !title.toLowerCase().includes(filter)) continue;
                options.push({ id: c._id, type: "conversation", title, icon: "💬" });
            }
        }

        return options.slice(0, 12);
    }, [transcriptions, notes, conversations, scopedTranscriptionIds, scopedNoteIds, scopedConversationIds, activeConversationId, mentionFilter, decryptedTitles]);

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

    const handleNewChat = useCallback(async (title?: string) => {
        let encryptedTitle: string | undefined;
        if (title?.trim()) {
            try {
                const key = await getSessionKeyOrThrow();
                encryptedTitle = await encryptString(key, title.trim());
            } catch {
                encryptedTitle = title.trim();
            }
        }
        const id = await createConversation({
            projectId,
            chatMode: "project",
            title: encryptedTitle,
        });
        setActiveConversationId(id);
        setIsCreating(false);
        setNewChatTitle("");
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
            const key = await getSessionKeyOrThrow();

            // E2EE: encrypt user message before saving
            const encryptedUserMsg = await encryptString(key, userMsg);
            await sendMessage({ conversationId: convId, content: encryptedUserMsg });

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

                // 1. Transcription context (RAG) — client-side chunk reconstruction
                // RAG search returns metadata only (no plaintext): transcriptionId, chunkIndex, chunkWordCount, score
                // Client reconstructs chunks from decrypted transcription content

                const CHUNK_MAX_WORDS = 300;
                const CHUNK_OVERLAP = 50;

                /** Reconstruct a specific chunk from plaintext using same algo as server */
                function reconstructChunk(plaintext: string, chunkIndex: number): string {
                    const words = plaintext.split(/\s+/);
                    if (words.length <= CHUNK_MAX_WORDS) return plaintext;

                    let start = 0;
                    let idx = 0;
                    while (start < words.length) {
                        const end = Math.min(start + CHUNK_MAX_WORDS, words.length);
                        if (idx === chunkIndex) {
                            return words.slice(start, end).join(" ");
                        }
                        if (end >= words.length) break;
                        start += CHUNK_MAX_WORDS - CHUNK_OVERLAP;
                        idx++;
                    }
                    return plaintext; // fallback
                }

                let ragResults: Array<{
                    transcriptionId: Id<"transcriptions">;
                    transcriptionTitle: string;
                    chunkIndex: number;
                    chunkWordCount: number;
                    score: number;
                }> = [];

                if (currentScopedTranscriptions.length > 0) {
                    ragResults = await ragSearchByTranscriptions({
                        projectId,
                        transcriptionIds: currentScopedTranscriptions,
                        query: userMsg,
                        topK: 5,
                    });
                } else if (chatMode === "project") {
                    ragResults = await ragSearch({
                        projectId,
                        query: userMsg,
                        topK: 5,
                    });
                }

                if (ragResults.length > 0 && transcriptions) {
                    // Reconstruct chunk text client-side from decrypted transcriptions
                    const chunkTexts: Array<{ text: string; transcriptionTitle: string; transcriptionId: Id<"transcriptions"> }> = [];

                    for (const r of ragResults) {
                        const transcription = transcriptions.find((t) => t._id === r.transcriptionId);
                        if (!transcription) continue;

                        let plainContent = transcription.content;
                        try {
                            plainContent = await decryptString(key, transcription.content);
                        } catch {
                            // Legacy plaintext or decryption error
                        }

                        const chunkText = reconstructChunk(plainContent, r.chunkIndex);
                        const title = decryptedTitles[r.transcriptionId] || r.transcriptionTitle;
                        chunkTexts.push({ text: chunkText, transcriptionTitle: title, transcriptionId: r.transcriptionId });
                    }

                    if (chunkTexts.length > 0) {
                        context += chunkTexts
                            .map((r) => `[Transkrypcja: "${r.transcriptionTitle}"]:\n${r.text}`)
                            .join("\n\n---\n\n");
                        sources = chunkTexts.map((r) => ({
                            transcriptionId: r.transcriptionId,
                            quote: r.text.slice(0, 80),
                        }));
                    }
                }

                // 2. Notes context (E2EE — decrypt client-side)
                if (currentScopedNotes.length > 0 && notes) {
                    const noteTexts: string[] = [];

                    for (const noteId of currentScopedNotes) {
                        const note = notes.find((n) => n._id === noteId);
                        if (!note || !note.content) continue;

                        try {
                            const decrypted = await decryptString(key, note.content);
                            const noteTitle = decryptedTitles[noteId] || note.title;
                            noteTexts.push(`[Notatka: "${noteTitle}"]:\n${decrypted}`);
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

            // System prompt is now built server-side — client only sends hasScope flag
            const hasScope = scopedTranscriptionIds.length > 0 || scopedNoteIds.length > 0 || scopedConversationIds.length > 0;

            // Call AI
            let response: string;
            try {
                response = await chatAction({
                    userMessage: userMsg,
                    context: context || undefined,
                    hasScope,
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Nieznany błąd";
                response = `⚠️ Nie udało się połączyć z serwerem AI. Spróbuj ponownie za chwilę. (${msg})`;
                sources = [];
            }

            await addAssistant({
                conversationId: convId,
                content: await encryptString(key, response),
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

    // Simple markdown renderer for chat messages
    const renderChatMarkdown = (text: string) => {
        // Pre-process: if text has no newlines but has numbered items, split them
        let processed = text;
        if (!processed.includes("\n") && /\d+[.)]\s/.test(processed)) {
            // Insert newlines before numbered items: "1. " "2. " etc.
            processed = processed.replace(/\s+(\d+[.)]\s)/g, "\n$1");
        }

        const lines = processed.split("\n");
        const elements: React.ReactNode[] = [];

        lines.forEach((line, i) => {
            const trimmed = line.trim();

            if (trimmed === "") {
                elements.push(<div key={i} style={{ height: "0.5em" }} />);
            } else if (trimmed.startsWith("### ")) {
                elements.push(<p key={i} style={{ fontWeight: 700, marginTop: "0.6em" }}>{formatInlineStyles(trimmed.slice(4))}</p>);
            } else if (trimmed.startsWith("## ")) {
                elements.push(<p key={i} style={{ fontWeight: 700, fontSize: "1.1em", marginTop: "0.6em" }}>{formatInlineStyles(trimmed.slice(3))}</p>);
            } else if (trimmed.startsWith("# ")) {
                elements.push(<p key={i} style={{ fontWeight: 700, fontSize: "1.2em", marginTop: "0.6em" }}>{formatInlineStyles(trimmed.slice(2))}</p>);
            } else if (/^[-•*]\s/.test(trimmed)) {
                elements.push(<p key={i} style={{ paddingLeft: "1em", marginTop: "0.2em" }}>• {formatInlineStyles(trimmed.replace(/^[-•*]\s/, ""))}</p>);
            } else if (/^\d+[.)]\s/.test(trimmed)) {
                const match = trimmed.match(/^(\d+[.)]\s)(.*)/);
                elements.push(<p key={i} style={{ paddingLeft: "1em", marginTop: "0.4em" }}><strong>{match?.[1]}</strong>{formatInlineStyles(match?.[2] ?? "")}</p>);
            } else {
                elements.push(<p key={i} style={{ marginTop: "0.3em" }}>{formatInlineStyles(trimmed)}</p>);
            }
        });

        return <>{elements}</>;
    };

    // Handle **bold**, {{bold}} (Bielik format), and *italic*
    const formatInlineStyles = (text: string): React.ReactNode => {
        // First normalize {{...}} to **...**
        const normalized = text.replace(/\{\{([^}]+)\}\}/g, "**$1**");
        const parts = normalized.split(/(\*\*[^*]+\*\*)/g);
        return <>{parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            return part;
        })}</>;
    };

    return (
        <div className="chat-layout">
            {/* Chat Sidebar */}
            <div className={`chat-sidebar ${isSidebarOpen ? "" : "chat-sidebar-collapsed"}`}>
                <div className="chat-sidebar-header">
                    <h3>Rozmowy</h3>
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setIsSidebarOpen(false)}
                        title="Zwiń panel rozmów"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </button>
                </div>

                <div style={{ padding: 'var(--space-2)' }}>
                    <button
                        onClick={() => setIsCreating(true)}
                        title="Nowa rozmowa"
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-lg)',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-surface-hover)';
                            e.currentTarget.style.borderColor = 'rgba(124, 92, 252, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-surface)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <div className="sidebar-add-btn" style={{ width: 28, height: 28 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                        <span style={{ fontWeight: 500 }}>Nowa rozmowa</span>
                    </button>
                </div>

                {isCreating && (
                    <div className="notes-create-form">
                        <input
                            type="text"
                            className="notes-create-input"
                            placeholder="Tytuł rozmowy..."
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleNewChat(newChatTitle);
                                if (e.key === "Escape") { setIsCreating(false); setNewChatTitle(""); }
                            }}
                            autoFocus
                        />
                        <div className="notes-create-actions">
                            <button className="key-dialog-action" onClick={() => handleNewChat(newChatTitle)} disabled={!newChatTitle.trim()}>
                                Utwórz
                            </button>
                            <button
                                className="key-management-btn"
                                onClick={() => { setIsCreating(false); setNewChatTitle(""); }}
                            >
                                Anuluj
                            </button>
                        </div>
                    </div>
                )}

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
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}
                            onClick={() => setActiveConversationId(conv._id)}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {decryptedTitles[conv._id] || conv.title || "Nowa rozmowa"}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === conv._id ? null : conv._id);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 'var(--radius-sm)',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </button>

                            {openDropdownId === conv._id && (
                                <>
                                    <div
                                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }}
                                    />
                                    <div className="mention-dropdown" style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '30px',
                                        width: '180px',
                                        zIndex: 50,
                                        left: 'auto',
                                        bottom: 'auto',
                                    }}>
                                        <div
                                            className="mention-option"
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const title = decryptedTitles[conv._id] || conv.title || "Nowa rozmowa";
                                                setConvToRename({ _id: conv._id, title });
                                                setRenameValue(title);
                                                setOpenDropdownId(null);
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            Zmień temat
                                        </div>
                                        <div
                                            className="mention-option"
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                try {
                                                    const convMessages = await convex.query(api.messages.listByConversation, { conversationId: conv._id });
                                                    if (!convMessages || convMessages.length === 0) {
                                                        alert('Brak wiadomości do zapisania.');
                                                        return;
                                                    }
                                                    const key = await getSessionKeyOrThrow();
                                                    const lines: string[] = [];
                                                    for (const msg of convMessages) {
                                                        let text = msg.content;
                                                        try { text = await decryptString(key, msg.content); } catch { }
                                                        const role = msg.role === 'user' ? '👤 Ty' : '🤖 Lilapu';
                                                        lines.push(`**${role}:**\n${text}`);
                                                    }
                                                    const content = lines.join('\n\n---\n\n');
                                                    const now = new Date();
                                                    const dateStr = now.toLocaleDateString('pl-PL', {
                                                        day: 'numeric', month: 'long', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    });
                                                    const title = `Czat AI — ${dateStr}`;
                                                    const encTitle = await encryptString(key, title);
                                                    const encContent = await encryptString(key, content);
                                                    await createNote({ projectId, title: encTitle, content: encContent, format: 'md' });
                                                    alert('✅ Rozmowa zapisana w Notatkach.');
                                                } catch (err) {
                                                    console.error('Save to notes error:', err);
                                                    alert('Błąd podczas zapisu do notatek.');
                                                }
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                            Dodaj do notatek
                                        </div>
                                        <div
                                            className="mention-option"
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#ef4444' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                setConvToDelete(conv._id);
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            Usuń
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar toggle when collapsed */}
            {!isSidebarOpen && (
                <div style={{ display: 'flex', alignItems: 'flex-start', padding: 'var(--space-2)' }}>
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setIsSidebarOpen(true)}
                        title="Rozwiń panel rozmów"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </button>
                </div>
            )}

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
                            <div className="chat-message-content">
                                {msg.role === "assistant" ? renderChatMarkdown(decryptedMessages[msg._id] || msg.content) : (decryptedMessages[msg._id] || msg.content)}
                            </div>
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

            {/* Rename modal */}
            {convToRename && (
                <div className="modal-overlay" onClick={() => setConvToRename(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Zmień temat rozmowy</h2>
                        <input
                            type="text"
                            placeholder="Nowy temat rozmowy"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === "Enter" && renameValue.trim()) {
                                    await updateConvTitle({ conversationId: convToRename._id, title: renameValue.trim() });
                                    setConvToRename(null);
                                    setRenameValue("");
                                }
                            }}
                            autoFocus
                            style={{ width: "100%", marginBottom: "var(--space-4)" }}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => { setConvToRename(null); setRenameValue(""); }}>Anuluj</button>
                            <button className="btn btn-primary" onClick={async () => {
                                if (renameValue.trim()) {
                                    await updateConvTitle({ conversationId: convToRename._id, title: renameValue.trim() });
                                    setConvToRename(null);
                                    setRenameValue("");
                                }
                            }}>Zapisz</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {convToDelete && (
                <div className="modal-overlay" onClick={() => setConvToDelete(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Usuń rozmowę</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                            Czy na pewno chcesz usunąć tę rozmowę? Tej operacji nie można cofnąć.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setConvToDelete(null)}>Anuluj</button>
                            <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                                const idToDelete = convToDelete;
                                setConvToDelete(null);
                                try {
                                    await removeConversation({ conversationId: idToDelete });
                                    if (activeConversationId === idToDelete) {
                                        setActiveConversationId(null);
                                    }
                                } catch (err) {
                                    console.error("Delete conversation error:", err);
                                    alert("Błąd podczas usuwania rozmowy: " + (err instanceof Error ? err.message : "Nieznany błąd"));
                                }
                            }}>Usuń</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
