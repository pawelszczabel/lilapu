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
    // When a chat is started from a transcription
    const [chatInitTranscriptionId, setChatInitTranscriptionId] =
        useState<Id<"transcriptions"> | null>(null);

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
            setChatInitTranscriptionId(transcriptionId);
            setActiveTab("chat");
        },
        []
    );

    // Get active project
    const activeProject = projects?.find((p) => p._id === activeProjectId);

    if (!userId) return null;

    return (
        <div className="dashboard">
            <ProjectSidebar
                projects={projects ?? []}
                activeProjectId={activeProjectId}
                onSelectProject={(id) => {
                    setActiveProjectId(id);
                    setActiveTab("transcriptions");
                    setChatInitTranscriptionId(null);
                }}
                onCreateProject={handleCreateProject}
                userEmail={userId}
            />

            <div className="main">
                {activeProject ? (
                    <>
                        <div className="main-header">
                            <h1>{activeProject.name}</h1>
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
                                    onTranscriptionUsed={() => setChatInitTranscriptionId(null)}
                                />
                            )}
                        </div>
                    </>
                ) : (
                    <div className="empty-state">
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
