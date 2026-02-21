"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import ProjectSidebar from "./components/ProjectSidebar";
import TranscriptionList from "./components/TranscriptionList";
import RecordPanel from "./components/RecordPanel";
import ChatPanel from "./components/ChatPanel";

type Tab = "transcriptions" | "record" | "chat";

export default function DashboardPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [activeProjectId, setActiveProjectId] =
        useState<Id<"projects"> | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    // When a chat is started from a transcription
    const [chatInitTranscriptionId, setChatInitTranscriptionId] =
        useState<Id<"transcriptions"> | null>(null);
    // When opening an existing conversation
    const [chatInitConversationId, setChatInitConversationId] =
        useState<Id<"conversations"> | null>(null);

    // Auth check
    useEffect(() => {
        const user = localStorage.getItem("lilapu_user");
        if (!user) {
            window.location.href = "/";
            return;
        }
        const parsed = JSON.parse(user);
        setUserId(parsed.email);
    }, []);

    // Fetch projects
    const projects = useQuery(
        api.projects.list,
        userId ? { userId } : "skip"
    );

    const createProject = useMutation(api.projects.create);

    const handleCreateProject = useCallback(
        async (name: string) => {
            if (!userId) return;
            const id = await createProject({
                userId,
                name,
            });
            setActiveProjectId(id);
            setActiveTab("transcriptions");
        },
        [userId, createProject]
    );

    // Start chat from a specific transcription
    const handleStartTranscriptionChat = useCallback(
        (transcriptionId: Id<"transcriptions">) => {
            setChatInitConversationId(null);
            setChatInitTranscriptionId(transcriptionId);
            setActiveTab("chat");
        },
        []
    );

    // Open an existing conversation
    const handleOpenExistingChat = useCallback(
        (conversationId: Id<"conversations">) => {
            setChatInitTranscriptionId(null);
            setChatInitConversationId(conversationId);
            setActiveTab("chat");
        },
        []
    );

    // Get active project
    const activeProject = projects?.find((p) => p._id === activeProjectId);

    if (!userId) return null;

    return (
        <div className={`dashboard ${isSidebarOpen ? "" : "sidebar-collapsed"}`}>
            <ProjectSidebar
                projects={projects ?? []}
                activeProjectId={activeProjectId}
                onSelectProject={(id) => {
                    setActiveProjectId(id);
                    setActiveTab("transcriptions");
                    setChatInitTranscriptionId(null);
                }}
                userEmail={userId}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <div className="main">
                {activeProject ? (
                    <>
                        <div className="main-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {!isSidebarOpen && (
                                    <button
                                        className="sidebar-toggle-btn"
                                        onClick={() => setIsSidebarOpen(true)}
                                        title="Rozwiń pasek boczny"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                                    </button>
                                )}
                                <h1>{activeProject.name}</h1>
                            </div>
                            <div className="main-tabs">
                                <button
                                    className={`main-tab ${activeTab === "transcriptions" ? "active" : ""}`}
                                    onClick={() => {
                                        setActiveTab("transcriptions");
                                        setChatInitTranscriptionId(null);
                                    }}
                                >
                                    📝 Transkrypcje
                                </button>
                                <button
                                    className={`main-tab ${activeTab === "record" ? "active" : ""}`}
                                    onClick={() => setActiveTab("record")}
                                >
                                    🎙️ Nagrywaj
                                </button>
                                <button
                                    className={`main-tab ${activeTab === "chat" ? "active" : ""}`}
                                    onClick={() => {
                                        setChatInitTranscriptionId(null);
                                        setActiveTab("chat");
                                    }}
                                >
                                    💬 Czat AI
                                </button>
                            </div>
                        </div>

                        <div className="main-body">
                            {activeTab === "transcriptions" && (
                                <TranscriptionList
                                    projectId={activeProject._id}
                                    onStartChat={handleStartTranscriptionChat}
                                    onOpenExistingChat={handleOpenExistingChat}
                                />
                            )}
                            {activeTab === "record" && (
                                <RecordPanel
                                    projectId={activeProject._id}
                                    onRecordingComplete={() => setActiveTab("transcriptions")}
                                />
                            )}
                            {activeTab === "chat" && (
                                <ChatPanel
                                    projectId={activeProject._id}
                                    initialTranscriptionId={chatInitTranscriptionId}
                                    initialConversationId={chatInitConversationId}
                                    onTranscriptionUsed={() => {
                                        setChatInitTranscriptionId(null);
                                        setChatInitConversationId(null);
                                    }}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-state" style={{ position: 'relative' }}>
                        {!isSidebarOpen && (
                            <button
                                className="sidebar-toggle-btn"
                                onClick={() => setIsSidebarOpen(true)}
                                title="Rozwiń pasek boczny"
                                style={{ position: 'absolute', top: '16px', left: '16px' }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                            </button>
                        )}
                        <div className="empty-state-icon">📁</div>
                        <h2>Witaj w Lilapu</h2>
                        <p>
                            Wybierz projekt z bocznego panelu lub utwórz nowy, aby rozpocząć
                            nagrywanie i rozmowę z AI.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
