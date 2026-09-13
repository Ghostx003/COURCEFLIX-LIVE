import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CourseGrid from '../dashboard/CourseGrid.jsx';
import { useCourses } from '../../hooks/useCourses.js';
import { useRouter } from '../../hooks/useRouter.js';
import { refreshCourse } from '../../services/courseService.js';

const SORT_OPTIONS = [
    { value: 'custom', label: 'Custom (Drag & Drop)' },
    { value: 'completion_asc', label: 'Completion (Low to High)' },
    { value: 'completion_desc', label: 'Completion (High to Low)' },
    { value: 'duration_desc', label: 'Duration (High to Low)' },
    { value: 'duration_asc', label: 'Duration (Low to High)' },
    { value: 'duration_left_desc', label: 'Duration Left (High to Low)' },
    { value: 'duration_left_asc', label: 'Duration Left (Low to High)' }
];

export default function DashboardViewElView() {
    const {
        courses,
        loading,
        error,
        reloadCourses,
        deleteCourse,
        reorderCourses,
        setCourseRating,
        toggleCourseIgnored,
        toggleCourseSplitView,
        updateCourseThumbnail,
        removeCourseThumbnail,
        updateCourseTitle,
        updateCourseFaculty
    } = useCourses();

    const { currentView } = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [sortPref, setSortPref] = useState(() => localStorage.getItem('courseSortPref') || 'custom');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [hideIgnored, setHideIgnored] = useState(() => localStorage.getItem('courseflix_hide_ignored') === 'true');
    const [completionGroups, setCompletionGroups] = useState(() => {
        try {
            const raw = localStorage.getItem('courseflix_completion_groups');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    });

    // Custom dashboard button configs
    const [customBtnConfig, setCustomBtnConfig] = useState(() => ({
        text: localStorage.getItem('customDashboardBtnText') || '',
        link: localStorage.getItem('customDashboardBtnLink') || ''
    }));

    // Listen to global changes (hide ignored, completion groups, custom dashboard button, settings)
    useEffect(() => {
        const handleHideIgnoredChange = (e) => {
            if (e && e.detail && e.detail.hideIgnored !== undefined) {
                setHideIgnored(e.detail.hideIgnored);
            } else {
                setHideIgnored(localStorage.getItem('courseflix_hide_ignored') === 'true');
            }
        };

        const handleStorageChange = (e) => {
            if (e.key === 'courseSortPref') {
                setSortPref(e.newValue || 'custom');
            } else if (e.key === 'courseflix_hide_ignored') {
                setHideIgnored(e.newValue === 'true');
            } else if (e.key === 'courseflix_completion_groups') {
                try {
                    setCompletionGroups(e.newValue ? JSON.parse(e.newValue) : []);
                } catch (err) {}
            } else if (e.key === 'customDashboardBtnText' || e.key === 'customDashboardBtnLink') {
                setCustomBtnConfig({
                    text: localStorage.getItem('customDashboardBtnText') || '',
                    link: localStorage.getItem('customDashboardBtnLink') || ''
                });
            }
        };

        window.addEventListener('courseflix-hide-ignored-changed', handleHideIgnoredChange);
        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('courseflix-hide-ignored-changed', handleHideIgnoredChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Close sort dropdown when clicking outside
    useEffect(() => {
        const handleDocumentClick = (e) => {
            if (!e.target.closest('.glass-sort-container')) {
                setIsSortMenuOpen(false);
            }
        };
        document.addEventListener('click', handleDocumentClick);
        return () => document.removeEventListener('click', handleDocumentClick);
    }, []);

    const handleSelectSort = (val) => {
        setSortPref(val);
        localStorage.setItem('courseSortPref', val);
        setIsSortMenuOpen(false);
    };

    const currentSortLabel = useMemo(() => {
        if (sortPref.startsWith('group_')) {
            const grpId = sortPref.replace('group_', '');
            const grp = completionGroups.find(g => String(g.id) === String(grpId));
            return grp ? `Group: ${grp.name}` : 'Group';
        }
        const opt = SORT_OPTIONS.find(o => o.value === sortPref);
        return opt ? opt.label : 'Custom (Drag & Drop)';
    }, [sortPref, completionGroups]);

    // Action handlers for Course Cards
    const handleEnterCourse = useCallback((courseId) => {
        const course = courses.find(c => String(c.id) === String(courseId));
        if (!course) return;

        const viewEl = document.getElementById('subcourse-view');
        if (viewEl) {
            viewEl.dataset.origin = 'dashboard-view';
            delete viewEl.dataset.resumePath;
        }

        if (course.isSplitView && course.isLinked) {
            if (typeof window.renderSubcourseView === 'function') {
                window.renderSubcourseView(course.id, '');
            }
        } else {
            if (typeof window.playLectureFromAnywhere === 'function') {
                window.playLectureFromAnywhere(course.id, null);
            }
        }
    }, [courses]);

    const handleRefreshCourse = useCallback(async (courseId, btnElement) => {
        try {
            await refreshCourse(courseId, btnElement);
        } catch (e) {
            console.error('Failed to refresh course', e);
        }
    }, []);

    const handleRelocateCourse = useCallback(async (courseId) => {
        const course = courses.find(c => String(c.id) === String(courseId));
        if (!course) return;

        try {
            if (typeof window.showDirectoryPicker === 'function') {
                const newHandle = await window.showDirectoryPicker();
                course.handle = newHandle;
                if (typeof window.showToast === 'function') {
                    window.showToast(`Relocated main course: ${course.title}`);
                }
                if (typeof window.refreshCourse === 'function') {
                    await window.refreshCourse(courseId);
                }
                reloadCourses();
            }
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Relocate failed', err);
        }
    }, [courses, reloadCourses]);

    const handleRemoveCourse = useCallback((courseId) => {
        const course = courses.find(c => String(c.id) === String(courseId));
        const courseTitle = course ? course.title : 'this course';

        const doDelete = async () => {
            try {
                await deleteCourse(courseId);
                if (typeof window.purgeAllDataForDeletedCoursesAndSubfolders === 'function') {
                    await window.purgeAllDataForDeletedCoursesAndSubfolders();
                }
                if (typeof window.purgeEmptyDppAndNotesEngine === 'function') {
                    await window.purgeEmptyDppAndNotesEngine();
                }
                if (typeof window.showToast === 'function') {
                    window.showToast('Course deleted successfully');
                }
            } catch (err) {
                console.error('Failed to delete course:', err);
            }
        };

        if (typeof window.showDeleteConfirmModal === 'function') {
            window.showDeleteConfirmModal({
                title: 'Delete Course',
                message: `Do you really want to delete "${courseTitle}"?`,
                onConfirm: doDelete
            });
        } else {
            if (window.confirm(`Do you really want to delete "${courseTitle}"?`)) {
                doDelete();
            }
        }
    }, [courses, deleteCourse]);

    const handleUploadThumbnail = useCallback((courseId) => {
        const uploader = document.getElementById('thumbnail-uploader');
        if (uploader) {
            uploader.dataset.courseId = String(courseId);
            uploader.dataset.subfolder = '';
            uploader.click();
        }
    }, []);

    const handleOpenSettings = () => {
        if (typeof window.openSettingsModal === 'function') {
            window.openSettingsModal();
        } else {
            const overlay = document.getElementById('settings-modal-overlay');
            if (overlay) overlay.classList.remove('hidden');
        }
    };

    return (
        <div id="dashboard-view-el" className={`view ${currentView === 'dashboard-view' ? 'active' : ''}`}>
            <div style={{
                padding: '12px 28px',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '14px',
                borderBottom: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                flexWrap: 'wrap',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                position: 'relative',
                zIndex: 1000,
                overflow: 'visible'
            }}>
                <div id="search-bar-container" style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '24px',
                    padding: '7px 16px',
                    width: '250px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginRight: 'auto',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <i className="fas fa-search" style={{ color: 'var(--accent-primary)', marginRight: '10px', fontSize: '0.9rem' }}></i>
                    <input 
                        type="text" 
                        id="global-search-input" 
                        placeholder="Search courses..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            fontSize: '0.88rem',
                            fontWeight: '500',
                            width: '100%',
                            outline: 'none'
                        }} 
                        autoComplete="off" 
                    />
                </div>

                {customBtnConfig.text && customBtnConfig.link ? (
                    <a
                        id="custom-dashboard-btn"
                        href={customBtnConfig.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="primary-btn"
                        style={{
                            padding: '7px 14px',
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            borderRadius: '10px'
                        }}
                    >
                        <i className="fas fa-link" style={{ marginRight: '6px' }}></i>
                        <span id="custom-dashboard-btn-text" style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {customBtnConfig.text}
                        </span>
                    </a>
                ) : null}

                <div className="glass-sort-container" style={{ position: 'relative' }}>
                    <select id="course-sort-select" value={sortPref} onChange={(e) => handleSelectSort(e.target.value)} style={{ display: 'none' }}>
                        {SORT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <div
                        id="glass-sort-trigger"
                        className={`glass-sort-btn ${isSortMenuOpen ? 'active' : ''}`}
                        title="Sort & Filter Courses"
                        onClick={() => setIsSortMenuOpen(prev => !prev)}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="glass-sort-label">Sort by: <strong>{currentSortLabel}</strong></span>
                        <i className="fas fa-chevron-down glass-sort-arrow"></i>
                    </div>

                    {isSortMenuOpen && (
                        <div id="glass-sort-dropdown-menu" className="glass-sort-menu" style={{ display: 'block', position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 1100 }}>
                            <div className="glass-sort-option-header">
                                <i className="fas fa-sort-amount-down"></i> Sort Orders
                            </div>
                            {SORT_OPTIONS.map(opt => {
                                const isSelected = sortPref === opt.value;
                                return (
                                    <div
                                        key={opt.value}
                                        className={`glass-sort-option ${isSelected ? 'selected' : ''}`}
                                        data-value={opt.value}
                                        onClick={() => handleSelectSort(opt.value)}
                                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                    >
                                        <span>{opt.label}</span>
                                        {isSelected && <i className="fas fa-check option-check-icon"></i>}
                                    </div>
                                );
                            })}

                            {completionGroups && completionGroups.length > 0 && (
                                <>
                                    <div className="glass-sort-option-header">
                                        <i className="fas fa-layer-group"></i> Groups
                                    </div>
                                    {completionGroups.map((g, idx) => {
                                        const val = `group_${g.id}`;
                                        const label = `Group: ${g.name || `Group ${idx + 1}`}`;
                                        const isSelected = sortPref === val;
                                        return (
                                            <div
                                                key={val}
                                                className={`glass-sort-option ${isSelected ? 'selected' : ''}`}
                                                data-value={val}
                                                onClick={() => handleSelectSort(val)}
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                            >
                                                <span>{label}</span>
                                                {isSelected && <i className="fas fa-check option-check-icon"></i>}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <button 
                    id="open-settings-btn" 
                    type="button"
                    onClick={handleOpenSettings}
                    style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        transition: 'all 0.25s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }} 
                    title="Settings"
                >
                    <i className="fas fa-gear"></i>
                </button>
            </div>

            {/* React CourseGrid rendering */}
            <CourseGrid
                courses={courses}
                hideIgnored={hideIgnored}
                sortPref={sortPref}
                searchQuery={searchQuery}
                onEnterCourse={handleEnterCourse}
                onRefreshCourse={handleRefreshCourse}
                onRelocateCourse={handleRelocateCourse}
                onRemoveCourse={handleRemoveCourse}
                onRemoveThumbnail={removeCourseThumbnail}
                onUploadThumbnail={handleUploadThumbnail}
                onToggleIgnore={toggleCourseIgnored}
                onToggleSplitView={toggleCourseSplitView}
                onSetRating={setCourseRating}
                onUpdateTitle={updateCourseTitle}
                onUpdateFaculty={updateCourseFaculty}
                onReorderCourses={reorderCourses}
            />

            <div id="dashboard-drop-overlay" className="dashboard-drop-overlay hidden">
                <div className="dashboard-drop-content">
                    <i className="fas fa-folder-plus dashboard-drop-icon"></i>
                    <h3 className="dashboard-drop-title">Drop Course Folder Here</h3>
                    <p className="dashboard-drop-subtitle">Drop one or more course folders to import them into Courseflix</p>
                </div>
            </div>
        </div>
    );
}
