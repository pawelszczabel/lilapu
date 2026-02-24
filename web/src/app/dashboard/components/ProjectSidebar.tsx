"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";

interface Project {
    _id: Id<"projects">;
    _creationTime: number;
    name: string;
    description?: string;
    folderId?: Id<"folders">;
    archived: boolean;
}

interface Folder {
    _id: Id<"folders">;
    _creationTime: number;
    name: string;
    archived: boolean;
}

interface ProjectSidebarProps {
    projects: Project[]; // Keep original Project[] type
    activeProjectId?: Id<"projects"> | null; // Changed to optional and allows null
    onSelectProject: (id: Id<"projects"> | null) => void; // Allows null
    userEmail: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ProjectSidebar({
    projects,
    activeProjectId,
    onSelectProject,
    userEmail,
    isOpen,
    onClose,
}: ProjectSidebarProps) {
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [openDropdownId, setOpenDropdownId] = useState<Id<"projects"> | Id<"folders"> | null>(null);
    const [projectToRename, setProjectToRename] = useState<Project | null>(null);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [folderToRename, setFolderToRename] = useState<Folder | null>(null);
    const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<Id<"folders">>>(new Set());
    const [projectToMove, setProjectToMove] = useState<Project | null>(null); // State for nesting "przenieś do" 

    const folders = useQuery(api.folders.list, { userId: userEmail });

    const createProject = useMutation(api.projects.create);
    const updateProject = useMutation(api.projects.update);
    const archiveProject = useMutation(api.projects.archive);

    const createFolder = useMutation(api.folders.create);
    const updateFolder = useMutation(api.folders.update);
    const archiveFolder = useMutation(api.folders.archive);

    const handleCreateProject = async () => {
        if (newName.trim()) {
            await createProject({ name: newName.trim(), userId: userEmail });
            setNewName("");
            setShowNewProjectModal(false);
        }
    };

    const handleCreateFolder = async () => {
        if (newName.trim()) {
            await createFolder({ name: newName.trim(), userId: userEmail });
            setNewName("");
            setShowNewFolderModal(false);
        }
    };

    const toggleFolder = (folderId: Id<"folders">) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const activeProjects = projects.filter((p) => !p.archived);
    const activeFolders = folders ? folders.filter(f => !f.archived) : [];

    const rootProjects = activeProjects.filter(p => !p.folderId);
    const getProjectsForFolder = (folderId: Id<"folders">) => activeProjects.filter(p => p.folderId === folderId);

    const renderProjectItem = (project: Project, isNested: boolean) => (
        <div
            key={project._id}
            className={`sidebar-item ${project._id === activeProjectId ? "active" : ""}`}
            onClick={() => onSelectProject(project._id)}
            style={{ position: 'relative', fontSize: isNested ? '13px' : 'inherit' }}
        >
            <span className="sidebar-item-name">{project.name}</span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdownId(openDropdownId === project._id ? null : project._id);
                    setProjectToMove(null); // Reset sub-menu when opening main menu
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
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>

            {openDropdownId === project._id && (
                <>
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); setProjectToMove(null); }}
                    />
                    <div className="mention-dropdown" style={{
                        position: 'absolute',
                        right: '10px',
                        top: '30px',
                        width: '180px',
                        zIndex: 50,
                        left: 'auto',
                        bottom: 'auto',
                        overflow: 'visible'
                    }}>
                        <div
                            className="mention-option"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setProjectToRename(project);
                                setNewName(project.name);
                                setOpenDropdownId(null);
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Zmień nazwę
                        </div>

                        {activeFolders.length > 0 && (
                            <div
                                style={{ display: 'flex', flexDirection: 'column' }}
                                onMouseEnter={() => setProjectToMove(project)}
                                onMouseLeave={() => setProjectToMove(null)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToMove(projectToMove?._id === project._id ? null : project);
                                }}
                            >
                                <div
                                    className="mention-option"
                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'space-between' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        Przenieś do
                                    </div>
                                    <svg
                                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                        style={{
                                            transform: projectToMove?._id === project._id ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s'
                                        }}
                                    >
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </div>

                                {projectToMove?._id === project._id && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 'var(--space-2)',
                                        width: '100%',
                                        marginTop: 'var(--space-2)',
                                        borderBottom: '1px solid var(--border)',
                                        paddingBottom: 'var(--space-2)'
                                    }}>
                                        {project.folderId && (
                                            <div
                                                style={{
                                                    padding: 'var(--space-2) var(--space-3)',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--text-sm)',
                                                    color: 'var(--text-secondary)',
                                                    transition: 'all 0.15s',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: 'var(--bg-surface)'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(124, 92, 252, 0.3)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await updateProject({ projectId: project._id, folderId: null });
                                                    setOpenDropdownId(null);
                                                    setProjectToMove(null);
                                                }}
                                            >
                                                Wypnij z folderu (Root)
                                            </div>
                                        )}
                                        {activeFolders.filter(f => f._id !== project.folderId).map(f => (
                                            <div
                                                key={f._id}
                                                style={{
                                                    padding: 'var(--space-2) var(--space-3)',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--text-sm)',
                                                    color: 'var(--text-secondary)',
                                                    transition: 'all 0.15s',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    background: 'var(--bg-surface)'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124, 92, 252, 0.08)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'rgba(124, 92, 252, 0.3)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await updateProject({ projectId: project._id, folderId: f._id });
                                                    setOpenDropdownId(null);
                                                    setProjectToMove(null);
                                                    // Auto expand the folder it was moved to
                                                    const newExpanded = new Set(expandedFolders);
                                                    newExpanded.add(f._id);
                                                    setExpandedFolders(newExpanded);
                                                }}
                                            >
                                                {f.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div
                            className="mention-option"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#ef4444' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project);
                                setOpenDropdownId(null);
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Usuń
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <>
            <aside className={`sidebar ${isOpen ? "" : "collapsed"}`}>
                <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <img src="/logo.svg" alt="Lilapu" style={{ height: 50, width: 'auto' }} />
                    <button
                        className="sidebar-toggle-btn"
                        onClick={onClose}
                        title="Zwiń pasek boczny"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
                    </button>
                </div>

                <div className="sidebar-list">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        <button
                            className="sidebar-new-project-btn"
                            onClick={() => setShowNewProjectModal(true)}
                            title="Nowy klient"
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
                            <span style={{ fontWeight: 500 }}>Nowy klient</span>
                        </button>

                        <button
                            className="sidebar-new-folder-btn"
                            onClick={() => setShowNewFolderModal(true)}
                            title="Nowy folder"
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
                            <span style={{ fontWeight: 500 }}>Nowy folder</span>
                        </button>
                    </div>

                    {activeProjects.length === 0 && activeFolders.length === 0 ? (
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
                        <>
                            {/* Render Folders First */}
                            {activeFolders.map((folder) => {
                                const isExpanded = expandedFolders.has(folder._id);
                                const folderProjects = getProjectsForFolder(folder._id);

                                return (
                                    <div key={folder._id} style={{ marginBottom: 'var(--space-2)' }}>
                                        <div
                                            className="sidebar-item"
                                            onClick={() => toggleFolder(folder._id)}
                                            style={{
                                                position: 'relative',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderRadius: 'var(--radius-md)',
                                                fontWeight: 500,
                                            }}
                                        >
                                            <svg
                                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                style={{
                                                    marginRight: '8px',
                                                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                    transition: 'transform 0.2s',
                                                    minWidth: '16px'
                                                }}
                                            >
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                            </svg>

                                            <span className="sidebar-item-name" style={{ flex: 1 }}>{folder.name}</span>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownId(openDropdownId === folder._id ? null : folder._id);
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
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                            </button>

                                            {openDropdownId === folder._id && (
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
                                                        bottom: 'auto'
                                                    }}>
                                                        <div
                                                            className="mention-option"
                                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFolderToRename(folder);
                                                                setNewName(folder.name);
                                                                setOpenDropdownId(null);
                                                            }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                                            Zmień nazwę
                                                        </div>
                                                        <div
                                                            className="mention-option"
                                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#ef4444' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFolderToDelete(folder);
                                                                setOpenDropdownId(null);
                                                            }}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                            Usuń
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Render Projects inside Folder */}
                                        {isExpanded && (
                                            <div style={{ marginLeft: '12px', paddingLeft: '8px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {folderProjects.length === 0 ? (
                                                    <div style={{ padding: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Pusty folder</div>
                                                ) : (
                                                    folderProjects.map(project => renderProjectItem(project, true))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Render Root Projects */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: activeFolders.length > 0 ? 'var(--space-4)' : 0 }}>
                                {rootProjects.map(project => renderProjectItem(project, false))}
                            </div>
                        </>
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
            </aside >

            {showNewProjectModal && (
                <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Nowy Klient</h2>
                        <input
                            type="text"
                            placeholder="Imię i nazwisko / ID klienta"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                            autoFocus
                            style={{ width: "100%" }}
                        />
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowNewProjectModal(false)}
                            >
                                Anuluj
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateProject}>
                                Utwórz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showNewFolderModal && (
                <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Nowy Folder</h2>
                        <input
                            type="text"
                            placeholder="Nazwa folderu, np. Gabinet Warszawa"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                            autoFocus
                            style={{ width: "100%" }}
                        />
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowNewFolderModal(false)}
                            >
                                Anuluj
                            </button>
                            <button className="btn btn-primary" onClick={handleCreateFolder}>
                                Utwórz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {projectToRename && (
                <div className="modal-overlay" onClick={() => setProjectToRename(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Zmień nazwę klienta</h2>
                        <input
                            type="text"
                            placeholder="Nowa nazwa klienta"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === "Enter" && newName.trim()) {
                                    await updateProject({ projectId: projectToRename._id, name: newName.trim() });
                                    setProjectToRename(null);
                                    setNewName("");
                                }
                            }}
                            autoFocus
                            style={{ width: "100%", marginBottom: "var(--space-4)" }}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => { setProjectToRename(null); setNewName(""); }}>Anuluj</button>
                            <button className="btn btn-primary" onClick={async () => {
                                if (newName.trim()) {
                                    await updateProject({ projectId: projectToRename._id, name: newName.trim() });
                                    setProjectToRename(null);
                                    setNewName("");
                                }
                            }}>Zapisz</button>
                        </div>
                    </div>
                </div>
            )}

            {projectToDelete && (
                <div className="modal-overlay" onClick={() => setProjectToDelete(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Usuń klienta</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                            Czy na pewno chcesz usunąć profil <strong>{projectToDelete.name}</strong>? Ta operacja jest nieodwracalna.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setProjectToDelete(null)}>Anuluj</button>
                            <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                                await archiveProject({ projectId: projectToDelete._id });
                                if (activeProjectId === projectToDelete._id) {
                                    onSelectProject(null);
                                }
                                setProjectToDelete(null);
                            }}>Usuń</button>
                        </div>
                    </div>
                </div>
            )}

            {folderToRename && (
                <div className="modal-overlay" onClick={() => setFolderToRename(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Zmień nazwę folderu</h2>
                        <input
                            type="text"
                            placeholder="Nowa nazwa folderu"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={async (e) => {
                                if (e.key === "Enter" && newName.trim()) {
                                    await updateFolder({ folderId: folderToRename._id, name: newName.trim() });
                                    setFolderToRename(null);
                                    setNewName("");
                                }
                            }}
                            autoFocus
                            style={{ width: "100%", marginBottom: "var(--space-4)" }}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => { setFolderToRename(null); setNewName(""); }}>Anuluj</button>
                            <button className="btn btn-primary" onClick={async () => {
                                if (newName.trim()) {
                                    await updateFolder({ folderId: folderToRename._id, name: newName.trim() });
                                    setFolderToRename(null);
                                    setNewName("");
                                }
                            }}>Zapisz</button>
                        </div>
                    </div>
                </div>
            )}

            {folderToDelete && (
                <div className="modal-overlay" onClick={() => setFolderToDelete(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Usuń folder</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                            Czy na pewno chcesz usunąć folder <strong>{folderToDelete.name}</strong>? Pacjenci w nim zapisani powrócą na listę główną.
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setFolderToDelete(null)}>Anuluj</button>
                            <button className="btn btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={async () => {
                                await archiveFolder({ folderId: folderToDelete._id });
                                setFolderToDelete(null);
                            }}>Usuń folder</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
