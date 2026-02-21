"use client";

import { useState } from "react";
import { Id } from "@convex/_generated/dataModel";

interface Project {
    _id: Id<"projects">;
    _creationTime: number;
    name: string;
    description?: string;
    archived: boolean;
}

interface ProjectSidebarProps {
    projects: Project[];
    activeProjectId: Id<"projects"> | null;
    onSelectProject: (id: Id<"projects">) => void;
    onCreateProject: (name: string) => void;
    userEmail: string;
}

export default function ProjectSidebar({
    projects,
    activeProjectId,
    onSelectProject,
    onCreateProject,
    userEmail,
}: ProjectSidebarProps) {
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState("");

    const handleCreate = () => {
        if (newName.trim()) {
            onCreateProject(newName.trim());
            setNewName("");
            setShowModal(false);
        }
    };

    const activeProjects = projects.filter((p) => !p.archived);

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-header">
                    <span className="sidebar-brand">Lilapu</span>
                    <button
                        className="sidebar-add-btn"
                        onClick={() => setShowModal(true)}
                        title="Nowy projekt"
                    >
                        +
                    </button>
                </div>

                <div className="sidebar-list">
                    {activeProjects.length === 0 ? (
                        <div
                            style={{
                                padding: "2rem 1rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                                fontSize: "var(--text-sm)",
                            }}
                        >
                            Brak projektów.
                            <br />
                            Kliknij + aby dodać.
                        </div>
                    ) : (
                        activeProjects.map((project) => (
                            <div
                                key={project._id}
                                className={`sidebar-item ${project._id === activeProjectId ? "active" : ""}`}
                                onClick={() => onSelectProject(project._id)}
                            >
                                <span className="sidebar-item-icon">📁</span>
                                <span className="sidebar-item-name">{project.name}</span>
                                <span className="sidebar-item-badge">✅</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            {userEmail[0].toUpperCase()}
                        </div>
                        <span>{userEmail}</span>
                    </div>
                </div>
            </aside>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Nowy Projekt</h2>
                        <input
                            type="text"
                            placeholder="Nazwa projektu, np. Klient X — Umowa"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                            autoFocus
                            style={{ width: "100%" }}
                        />
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowModal(false)}
                            >
                                Anuluj
                            </button>
                            <button className="btn btn-primary" onClick={handleCreate}>
                                Utwórz
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
