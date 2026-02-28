import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/api";
import { Id } from "@convex/dataModel";
import { useUser, SignInButton } from "@clerk/clerk-react";
import ProjectSidebar from "./components/ProjectSidebar";
import TranscriptionList from "./components/TranscriptionList";
import RecordPanel from "./components/RecordPanel";
import NotesPanel from "./components/NotesPanel";
import ChatPanel from "./components/ChatPanel";

import EncryptionPasswordDialog from "./components/EncryptionPasswordDialog";
import { hasSessionKey } from "./crypto";
import { useScreenshotShortcut, useFileDrop, useTrayRecording } from "./hooks/useTauriDesktop";
import { useAutoUpdate } from "./hooks/useAutoUpdate";

type Tab = "transcriptions" | "notes" | "record" | "chat";

export default function App() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const userId = user?.primaryEmailAddress?.emailAddress ?? null;
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [activeProjectId, setActiveProjectId] =
    useState<Id<"projects"> | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("transcriptions");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatInitTranscriptionId, setChatInitTranscriptionId] =
    useState<Id<"transcriptions"> | null>(null);
  const [chatInitConversationId, setChatInitConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [ocrImageBase64, setOcrImageBase64] = useState<string | null>(null);

  // Auto-update
  const { status: updateStatus, version: updateVersion, progress: updateProgress, error: updateError, installUpdate, dismiss: dismissUpdate } = useAutoUpdate();

  useEffect(() => {
    if (hasSessionKey()) {
      setEncryptionReady(true);
    }
  }, []);

  // ── Tauri Desktop Hooks ──
  // Screenshot OCR: ⌘+Shift+S → capture → switch to Notes for OCR
  useScreenshotShortcut(useCallback((base64: string) => {
    setOcrImageBase64(base64);
    setActiveTab("notes");
  }, []));

  // Drag & Drop OCR: drop image → switch to Notes for OCR
  useFileDrop(useCallback((_path: string, base64: string) => {
    setOcrImageBase64(base64);
    setActiveTab("notes");
  }, []));

  // Tray recording toggle: click tray → switch to Record tab
  useTrayRecording(useCallback(() => {
    setActiveTab("record");
  }, []));

  const projects = useQuery(
    api.projects.list,
    userId ? {} : "skip"
  );



  const handleStartTranscriptionChat = useCallback(
    (transcriptionId: Id<"transcriptions">) => {
      setChatInitConversationId(null);
      setChatInitTranscriptionId(transcriptionId);
      setActiveTab("chat");
    },
    []
  );

  const handleOpenExistingChat = useCallback(
    (conversationId: Id<"conversations">) => {
      setChatInitTranscriptionId(null);
      setChatInitConversationId(conversationId);
      setActiveTab("chat");
    },
    []
  );

  const activeProject = projects?.find((p) => p._id === activeProjectId);

  if (!isClerkLoaded) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <p>Ładowanie...</p>
      </div>
    );
  }

  if (!user || !userId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <h2>Zaloguj się do Lilapu</h2>
        <p>Zaloguj się, aby uzyskać dostęp do swoich nagrań i notatek.</p>
        <SignInButton mode="modal">
          <button className="encryption-submit" style={{ marginTop: '16px', maxWidth: '280px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}>
            🔑 Zaloguj się
          </button>
        </SignInButton>
      </div>
    );
  }

  if (!encryptionReady) {
    return (
      <EncryptionPasswordDialog
        email={userId}
        onKeyReady={() => setEncryptionReady(true)}
      />
    );
  }

  return (
    <>
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
                    className={`main-tab ${activeTab === "record" ? "active" : ""}`}
                    onClick={() => setActiveTab("record")}
                  >
                    🎙️ Nagrywaj
                  </button>
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
                    className={`main-tab ${activeTab === "notes" ? "active" : ""}`}
                    onClick={() => setActiveTab("notes")}
                  >
                    📓 Notatki
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
                {activeTab === "notes" && (
                  <NotesPanel
                    projectId={activeProject._id}
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

      {/* Auto-Update Dialog */}
      {(updateStatus === "available" || updateStatus === "downloading" || updateStatus === "installing" || updateStatus === "restarting" || updateStatus === "error") && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            {updateStatus === "available" && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🚀</div>
                  <h2 style={{ margin: 0 }}>Nowa wersja dostępna</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                    Lilapu <strong>v{updateVersion}</strong> jest gotowa do instalacji.
                  </p>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={dismissUpdate}>Później</button>
                  <button className="btn btn-primary" onClick={installUpdate}>
                    ⬇️ Zainstaluj i uruchom ponownie
                  </button>
                </div>
              </>
            )}
            {updateStatus === "downloading" && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>⬇️</div>
                <h2 style={{ margin: 0 }}>Pobieranie aktualizacji...</h2>
                <div style={{
                  marginTop: 'var(--space-4)',
                  height: 8,
                  borderRadius: 4,
                  background: 'var(--bg-surface)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${updateProgress}%`,
                    background: 'linear-gradient(90deg, #7c5cfc, #a78bfa)',
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                  {updateProgress}%
                </p>
              </div>
            )}
            {updateStatus === "installing" && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>⚙️</div>
                <h2 style={{ margin: 0 }}>Instalowanie...</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>Za chwilę aplikacja uruchomi się ponownie.</p>
              </div>
            )}
            {updateStatus === "restarting" && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>🔄</div>
                <h2 style={{ margin: 0 }}>Restartowanie...</h2>
              </div>
            )}
            {updateStatus === "error" && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>⚠️</div>
                  <h2 style={{ margin: 0 }}>Błąd aktualizacji</h2>
                  <p style={{ color: '#ef4444', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    {updateError}
                  </p>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={dismissUpdate}>Zamknij</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
