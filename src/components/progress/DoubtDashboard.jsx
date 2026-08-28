import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useCourses } from '../../hooks/useCourses.js';
import {
    calculateDoubtStats,
    createDefaultDoubt,
    DEFAULT_DOUBT_SUBJECTS,
    extractUniqueDoubtSubjects,
    filterAndSortDoubts,
    formatDoubtDate,
    getNextDoubtStatus
} from '../../utils/doubtAnalytics.js';

/**
 * Pure React Doubt Resolution Dashboard Component
 * Provides complete Doubt Management, Search, Subject Filter, Status Cycle,
 * and In-Place Multi-Section Visual Rich Editor.
 */
export default function DoubtDashboard({ className = '', onNavigateToLecture = null }) {
    const { courses } = useCourses();

    // --- State ---
    const [doubts, setDoubts] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('doubtsDashboard')) || [];
        } catch {
            return [];
        }
    });

    const [customSubjects, setCustomSubjects] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('doubtsSubjects')) || [...DEFAULT_DOUBT_SUBJECTS];
        } catch {
            return [...DEFAULT_DOUBT_SUBJECTS];
        }
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [editingDoubtId, setEditingDoubtId] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    // Modal Form State
    const [newTitle, setNewTitle] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [newStatus, setNewStatus] = useState('Unsolved');

    // Editor Local State
    const [editorTitle, setEditorTitle] = useState('');
    const [editorStatus, setEditorStatus] = useState('Unsolved');
    const [editorSections, setEditorSections] = useState([]);
    const [saveFeedback, setSaveFeedback] = useState(false);

    // Sync storage changes from other tabs/windows
    useEffect(() => {
        const handleStorage = (e) => {
            if (e.key === 'doubtsDashboard') {
                try {
                    setDoubts(JSON.parse(e.newValue) || []);
                } catch {}
            } else if (e.key === 'doubtsSubjects') {
                try {
                    setCustomSubjects(JSON.parse(e.newValue) || [...DEFAULT_DOUBT_SUBJECTS]);
                } catch {}
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // Persist doubts
    const persistDoubts = useCallback((newDoubts) => {
        setDoubts(newDoubts);
        try {
            localStorage.setItem('doubtsDashboard', JSON.stringify(newDoubts));
        } catch (err) {
            console.error('Failed to save doubts to localStorage:', err);
        }
    }, []);

    // Unique Subject Options
    const availableSubjects = useMemo(() => {
        return extractUniqueDoubtSubjects(doubts, customSubjects, courses);
    }, [doubts, customSubjects, courses]);

    // Set initial modal subject if none selected
    useEffect(() => {
        if (!newSubject && availableSubjects.length > 0) {
            setNewSubject(availableSubjects[0]);
        }
    }, [availableSubjects, newSubject]);

    // Filtered and Sorted Doubts
    const displayedDoubts = useMemo(() => {
        return filterAndSortDoubts(doubts, searchTerm, selectedSubject);
    }, [doubts, searchTerm, selectedSubject]);

    // Stats
    const stats = useMemo(() => {
        return calculateDoubtStats(doubts);
    }, [doubts]);

    // --- Status Cycle Handler ---
    const handleCycleStatus = (e, doubtId) => {
        e.stopPropagation();
        const updated = doubts.map(d => {
            if (d.id === doubtId) {
                return { ...d, status: getNextDoubtStatus(d.status) };
            }
            return d;
        });
        persistDoubts(updated);
    };

    // --- Delete Doubt Handler ---
    const handleDeleteDoubt = (doubtId) => {
        const updated = doubts.filter(d => d.id !== doubtId);
        persistDoubts(updated);
        setDeleteConfirmId(null);

        // Also clean up in IndexedDB if present
        try {
            const req = window.indexedDB?.open('CourseFlixDB');
            if (req) {
                req.onsuccess = (ev) => {
                    const db = ev.target.result;
                    db.onversionchange = () => { try { db.close(); } catch {} };
                    if (db.objectStoreNames.contains('doubts')) {
                        const tx = db.transaction('doubts', 'readwrite');
                        const store = tx.objectStore('doubts');
                        store.getAll().onsuccess = (ge) => {
                            const all = ge.target.result || [];
                            const match = all.find(item => item.id === Number(doubtId) || item.createdAt === Number(doubtId));
                            if (match?.id) store.delete(match.id);
                            try { db.close(); } catch {}
                        };
                    } else {
                        try { db.close(); } catch {}
                    }
                };
            }
        } catch {}
    };

    // --- Open Editor ---
    const openEditor = (doubt) => {
        setEditingDoubtId(doubt.id);
        setEditorTitle(doubt.title || '');
        setEditorStatus(doubt.status || 'Unsolved');
        const sections = Array.isArray(doubt.editors) && doubt.editors.length > 0
            ? doubt.editors.map(s => ({ ...s }))
            : [
                { title: 'Question', content: doubt.questionContent || '' },
                { title: 'Solution', content: doubt.solutionContent || '' }
            ];
        setEditorSections(sections);
    };

    // --- Save Current Edited Doubt ---
    const handleSaveEditor = () => {
        if (!editingDoubtId) return;

        const updated = doubts.map(d => {
            if (d.id === editingDoubtId) {
                return {
                    ...d,
                    title: editorTitle.trim() || d.title,
                    status: editorStatus,
                    editors: editorSections
                };
            }
            return d;
        });

        persistDoubts(updated);
        setSaveFeedback(true);
        setTimeout(() => {
            setSaveFeedback(false);
            setEditingDoubtId(null);
        }, 400);
    };

    // --- Create Doubt Modal Confirmation ---
    const handleConfirmAddDoubt = (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return alert('Please enter a doubt title.');

        const newDoubt = createDefaultDoubt(newTitle, newSubject || availableSubjects[0] || 'General', newStatus);
        const updated = [newDoubt, ...doubts];
        persistDoubts(updated);
        setIsAddModalOpen(false);
        setNewTitle('');
        openEditor(newDoubt);
    };

    // Current editing doubt object
    const currentEditingDoubt = useMemo(() => {
        return doubts.find(d => d.id === editingDoubtId);
    }, [doubts, editingDoubtId]);

    // Status colors
    const getStatusStyle = (status) => {
        switch (status) {
            case 'Solved':
                return { bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: 'rgba(52, 211, 153, 0.4)' };
            case 'Doubt':
                return { bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' };
            case 'Error':
                return { bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: 'rgba(248, 113, 113, 0.4)' };
            default: // Unsolved
                return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.4)' };
        }
    };

    return (
        <div 
            className={`doubt-dashboard-wrapper flex flex-col gap-6 ${className}`}
            style={{
                width: '100%',
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '24px 16px'
            }}
        >
            {/* ======================================================== */}
            {/* VIEW 1: DOUBT LIST & DASHBOARD */}
            {/* ======================================================== */}
            {!editingDoubtId && (
                <>
                    {/* Header Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-circle-question" style={{ color: '#fbbf24', fontSize: '1.25rem' }}></i>
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                    Doubt Dashboard
                                </h2>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Solved {stats.solved} / {stats.total} ({stats.resolutionRate}% resolution rate)
                                </div>
                            </div>
                        </div>

                        {/* Search & Subject Filter Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="search"
                                    placeholder="Search doubts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        color: 'var(--text-primary)',
                                        padding: '8px 12px 8px 32px',
                                        borderRadius: '10px',
                                        fontSize: '0.85rem',
                                        width: '200px'
                                    }}
                                />
                                <i className="fas fa-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}></i>
                            </div>

                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    color: 'var(--text-primary)',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">All Subjects ({doubts.length})</option>
                                {availableSubjects.map(sub => (
                                    <option key={sub} value={sub}>
                                        {sub} {stats.bySubject[sub] ? `(${stats.bySubject[sub]})` : ''}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                style={{
                                    background: 'var(--accent-primary)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(var(--accent-glow, 16, 185, 129), 0.3)'
                                }}
                            >
                                <i className="fas fa-plus"></i>
                                <span>Add Doubt</span>
                            </button>
                        </div>
                    </div>

                    {/* Doubts Grid */}
                    {displayedDoubts.length === 0 ? (
                        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '48px 16px', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', margin: '0 auto 12px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-folder-open" style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}></i>
                            </div>
                            <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>No Doubts Logged</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Get started by adding a new doubt.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                            {displayedDoubts.map((doubt, idx) => {
                                const statusStyle = getStatusStyle(doubt.status);
                                const isConfirming = deleteConfirmId === doubt.id;
                                const isFirstSolved = doubt.status === 'Solved' && (idx === 0 || displayedDoubts[idx - 1].status !== 'Solved');

                                return (
                                    <React.Fragment key={doubt.id || idx}>
                                        {/* Solved Section Separator Banner */}
                                        {isFirstSolved && (
                                            <div style={{ gridColumn: '1 / -1', padding: '8px 0', marginTop: '8px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#34d399' }}>Solved ⭐</span>
                                            </div>
                                        )}

                                        <div
                                            onClick={() => !isConfirming && openEditor(doubt)}
                                            style={{
                                                background: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: '14px',
                                                padding: '16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '160px',
                                                cursor: isConfirming ? 'default' : 'pointer',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {/* Top Metadata Row */}
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '6px' }}>
                                                    {doubt.subject}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCycleStatus(e, doubt.id)}
                                                    style={{
                                                        background: statusStyle.bg,
                                                        color: statusStyle.color,
                                                        border: `1px solid ${statusStyle.border}`,
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: '800',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Click to cycle status"
                                                >
                                                    {doubt.status}
                                                </button>
                                            </div>

                                            {/* Doubt Title */}
                                            <div style={{ margin: '12px 0', flexGrow: 1 }}>
                                                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                                                    {doubt.title}
                                                </h4>
                                            </div>

                                            {/* Bottom Timestamp & Delete */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', marginTop: '6px' }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {formatDoubtDate(doubt.createdAt)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirmId(doubt.id);
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--accent-danger, #ef4444)',
                                                        fontSize: '0.78rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px'
                                                    }}
                                                >
                                                    <i className="fas fa-trash-can"></i>
                                                    <span>Delete</span>
                                                </button>
                                            </div>

                                            {/* Confirmation Overlay */}
                                            {isConfirming && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        background: 'rgba(0,0,0,0.85)',
                                                        backdropFilter: 'blur(2px)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '12px',
                                                        padding: '16px',
                                                        zIndex: 10
                                                    }}
                                                >
                                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#fff', textAlign: 'center' }}>
                                                        Delete this doubt?
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDoubt(doubt.id)}
                                                            style={{
                                                                background: '#ef4444',
                                                                color: '#fff',
                                                                border: 'none',
                                                                padding: '4px 12px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteConfirmId(null)}
                                                            style={{
                                                                background: 'var(--bg-tertiary)',
                                                                color: 'var(--text-primary)',
                                                                border: '1px solid var(--border-secondary)',
                                                                padding: '4px 12px',
                                                                borderRadius: '6px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* ======================================================== */}
            {/* VIEW 2: VISUAL DOUBT EDITOR */}
            {/* ======================================================== */}
            {editingDoubtId && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Editor Action Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setEditingDoubtId(null)}
                            style={{
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-secondary)',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <i className="fas fa-arrow-left"></i>
                            <span>Back</span>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {currentEditingDoubt?.metadata?.courseId && currentEditingDoubt?.metadata?.lectureId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onNavigateToLecture) {
                                            onNavigateToLecture(currentEditingDoubt.metadata);
                                        } else if (window.parent && window.self !== window.top) {
                                            window.parent.postMessage({
                                                action: 'playLecture',
                                                courseId: currentEditingDoubt.metadata.courseId,
                                                lectureId: currentEditingDoubt.metadata.lectureId,
                                                currentTime: currentEditingDoubt.metadata.timestamp || 0,
                                                lastView: 'progress-doubts',
                                                subfolder: currentEditingDoubt.metadata.subfolder || ''
                                            }, '*');
                                        }
                                    }}
                                    style={{
                                        background: 'rgba(96, 165, 250, 0.15)',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(96, 165, 250, 0.4)',
                                        padding: '8px 14px',
                                        borderRadius: '10px',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <i className="fas fa-play"></i>
                                    <span>Jump to Lecture</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setEditorStatus(getNextDoubtStatus(editorStatus))}
                                style={{
                                    ...getStatusStyle(editorStatus),
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                }}
                            >
                                Status: {editorStatus}
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveEditor}
                                style={{
                                    background: saveFeedback ? '#34d399' : 'var(--accent-primary)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 18px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(var(--accent-glow, 16, 185, 129), 0.3)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <i className={saveFeedback ? 'fas fa-check' : 'fas fa-floppy-disk'}></i>
                                <span>{saveFeedback ? 'Saved ✓' : 'Save'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Title Input */}
                    <div>
                        <input
                            type="text"
                            value={editorTitle}
                            onChange={(e) => setEditorTitle(e.target.value)}
                            placeholder="Doubt Title..."
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: '2px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                                fontSize: '1.4rem',
                                fontWeight: '800',
                                padding: '8px 0',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Multi-Section Editors */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {editorSections.map((sec, idx) => (
                            <div
                                key={idx}
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-secondary)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <input
                                        type="text"
                                        value={sec.title}
                                        onChange={(e) => {
                                            const updated = [...editorSections];
                                            updated[idx].title = e.target.value;
                                            setEditorSections(updated);
                                        }}
                                        placeholder="Section Title..."
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-primary)',
                                            fontSize: '1rem',
                                            fontWeight: '700',
                                            outline: 'none',
                                            flex: 1
                                        }}
                                    />
                                    {editorSections.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm('Delete this section?')) {
                                                    setEditorSections(editorSections.filter((_, i) => i !== idx));
                                                }
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            title="Delete Section"
                                        >
                                            <i className="fas fa-trash-can"></i>
                                        </button>
                                    )}
                                </div>

                                <textarea
                                    value={sec.content}
                                    onChange={(e) => {
                                        const updated = [...editorSections];
                                        updated[idx].content = e.target.value;
                                        setEditorSections(updated);
                                    }}
                                    placeholder={`Write your ${sec.title.toLowerCase()} notes, code, or explanation here...`}
                                    rows={5}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                        padding: '10px',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={() => {
                                setEditorSections([...editorSections, { title: `Section ${editorSections.length + 1}`, content: '' }]);
                            }}
                            style={{
                                background: 'transparent',
                                border: '2px dashed var(--border-primary)',
                                color: 'var(--text-secondary)',
                                padding: '10px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                        >
                            <i className="fas fa-plus"></i>
                            <span>Add Another Section</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ======================================================== */}
            {/* ADD DOUBT MODAL */}
            {/* ======================================================== */}
            {isAddModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '16px'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '18px',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '440px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}
                    >
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Add New Doubt
                        </h3>

                        <form onSubmit={handleConfirmAddDoubt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Doubt Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="e.g. Page Replacement in OS"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Subject
                                </label>
                                <select
                                    value={newSubject}
                                    onChange={(e) => setNewSubject(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {availableSubjects.map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Initial Status
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="Unsolved">Unsolved</option>
                                    <option value="Solved">Solved</option>
                                    <option value="Doubt">Doubt</option>
                                    <option value="Error">Error</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-secondary)',
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        background: 'var(--accent-primary)',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '8px 18px',
                                        borderRadius: '8px',
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Create & Edit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
