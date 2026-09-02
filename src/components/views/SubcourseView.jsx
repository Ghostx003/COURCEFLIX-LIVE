import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../hooks/useRouter.js';
import { useCourses } from '../../hooks/useCourses.js';
import SubcourseHeader from '../subcourse/SubcourseHeader.jsx';
import SubcourseGrid from '../subcourse/SubcourseGrid.jsx';
import {
    getImmediateSubfolders,
    getParentPath,
    isSubfolderPathHidden
} from '../../utils/subcourseUtils.js';
import { saveCourse } from '../../services/courseService.js';
import { showToast } from '../../services/utils.js';

export default function SubcourseView() {
    const { currentView, params, navigate } = useRouter();
    const {
        courses,
        loading,
        updateCourseTitle,
        updateCourseFaculty,
        setCourseRating,
        toggleCourseIgnored,
        toggleCourseSplitView,
        removeCourseThumbnail
    } = useCourses();

    const courseId = params?.courseId;
    const basePath = params?.path || '';

    const [hideIgnored, setHideIgnored] = useState(() => {
        return typeof localStorage !== 'undefined'
            ? localStorage.getItem('courseflix_hide_ignored') === 'true'
            : false;
    });

    // Listen to hide-ignored toggle events from Navbar
    useEffect(() => {
        const handleIgnoredToggle = (e) => {
            if (e.detail && typeof e.detail.hideIgnored === 'boolean') {
                setHideIgnored(e.detail.hideIgnored);
            } else {
                setHideIgnored(localStorage.getItem('courseflix_hide_ignored') === 'true');
            }
        };

        window.addEventListener('courseflix-hide-ignored-changed', handleIgnoredToggle);
        return () => window.removeEventListener('courseflix-hide-ignored-changed', handleIgnoredToggle);
    }, []);

    // Find target course
    const course = useMemo(() => {
        if (!courseId || !Array.isArray(courses)) return null;
        return courses.find(c => String(c.id) === String(courseId)) || null;
    }, [courses, courseId]);

    // Extract immediate child subfolders
    const immediateSubfolders = useMemo(() => {
        if (!course) return [];
        return getImmediateSubfolders(course.chapters, basePath);
    }, [course, basePath]);

    // Leaf folder auto-jump to player if there are 0 subfolders
    useEffect(() => {
        if (currentView === 'subcourse-view' && course && !loading) {
            if (immediateSubfolders.length === 0) {
                if (typeof window.playLectureFromAnywhere === 'function') {
                    window.playLectureFromAnywhere(course.id, null, 'subcourse-view', basePath);
                }
            }
        }
    }, [currentView, course, loading, immediateSubfolders.length, basePath]);

    // Check directory permissions if needed when entering unlinked course
    useEffect(() => {
        if (currentView === 'subcourse-view' && course && !course.isLinked && !course.isCustomCourse && course.handle) {
            (async () => {
                try {
                    if (await course.handle.queryPermission({ mode: 'read' }) !== 'granted') {
                        if (await course.handle.requestPermission({ mode: 'read' }) === 'granted') {
                            course.isLinked = true;
                            await saveCourse(course);
                        }
                    }
                } catch (err) {
                    console.warn('[SubcourseView] Directory permission check:', err);
                }
            })();
        }
    }, [currentView, course]);

    // Actions & Mutations
    const handleTitleChange = async (fullPath, newTitle) => {
        if (!course) return;
        try {
            await updateCourseTitle(course.id, newTitle, fullPath);
            showToast('Title updated');
        } catch (e) {
            console.error('Failed to update subfolder title', e);
        }
    };

    const handleFacultyChange = async (fullPath, newFaculty) => {
        if (!course) return;
        try {
            await updateCourseFaculty(course.id, newFaculty, fullPath);
            showToast('Faculty updated');
        } catch (e) {
            console.error('Failed to update faculty', e);
        }
    };

    const handleRatingChange = async (fullPath, starValue) => {
        if (!course) return;
        try {
            await setCourseRating(course.id, starValue, fullPath);
        } catch (e) {
            console.error('Failed to update rating', e);
        }
    };

    const handleIgnoreToggle = async (fullPath, isIgnored) => {
        if (!course) return;
        try {
            await toggleCourseIgnored(course.id, isIgnored, fullPath);
        } catch (e) {
            console.error('Failed to toggle ignore', e);
        }
    };

    const handleSplitToggle = async (fullPath, isSplit) => {
        if (!course) return;
        try {
            await toggleCourseSplitView(course.id, isSplit, fullPath);
        } catch (e) {
            console.error('Failed to toggle split further', e);
        }
    };

    const handleThumbnailClick = (cId, fullPath) => {
        const uploader = document.getElementById('thumbnail-uploader');
        if (uploader) {
            uploader.dataset.courseId = String(cId);
            uploader.dataset.subfolder = fullPath || '';
            uploader.click();
        }
    };

    const handleRemoveThumbnail = async (cId, fullPath) => {
        try {
            await removeCourseThumbnail(cId, fullPath);
            showToast('Thumbnail removed');
        } catch (e) {
            console.error('Failed to remove thumbnail', e);
        }
    };

    const handleDeleteSubfolder = (cId, fullPath) => {
        if (typeof window.showDeleteConfirmModal === 'function') {
            window.showDeleteConfirmModal({
                title: 'Delete Subfolder',
                message: 'Do you really want to delete this subfolder?',
                onConfirm: async () => {
                    if (!course) return;
                    const updated = { ...course };
                    updated.subCourseData = updated.subCourseData || {};
                    updated.subCourseData[fullPath] = updated.subCourseData[fullPath] || {};

                    if (updated.subCourseData[fullPath].isCustom) {
                        updated.lectures = (updated.lectures || []).filter(
                            l => l.chapter !== fullPath && !l.chapter.startsWith(fullPath + '/')
                        );
                        updated.chapters = (updated.chapters || []).filter(
                            ch => ch.name !== fullPath && !ch.name.startsWith(fullPath + '/')
                        );
                        delete updated.subCourseData[fullPath];
                        updated.videoCount = updated.lectures.length;
                    } else {
                        updated.subCourseData[fullPath].hidden = true;
                        updated.subCourseData[fullPath].isIgnored = true;
                    }

                    await saveCourse(updated);
                    showToast('Subfolder deleted successfully');
                }
            });
        }
    };

    const handleRefreshSubfolder = async (cId, fullPath) => {
        if (typeof window.refreshCourse === 'function') {
            await window.refreshCourse(cId);
        }
    };

    const handleRelocateSubfolder = async (cId, fullPath) => {
        if (typeof window.showDirectoryPicker === 'function' && course) {
            try {
                const newHandle = await window.showDirectoryPicker();
                const updated = { ...course };
                updated.subCourseData = updated.subCourseData || {};
                updated.subCourseData[fullPath] = updated.subCourseData[fullPath] || {};
                updated.subCourseData[fullPath].handle = newHandle;
                await saveCourse(updated);
                showToast(`Relocated subfolder: ${fullPath.split('/').pop()}`);
                if (typeof window.refreshCourse === 'function') {
                    await window.refreshCourse(cId);
                }
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Relocate failed', err);
            }
        }
    };

    const handleEnter = (targetCourse, fullPath) => {
        const subData = targetCourse.subCourseData?.[fullPath] || {};
        if (subData.isSplitView) {
            navigate('#subcourse/' + targetCourse.id + '/' + encodeURIComponent(fullPath));
        } else {
            if (typeof window.playLectureFromAnywhere === 'function') {
                window.playLectureFromAnywhere(targetCourse.id, null, 'subcourse-view', fullPath);
            }
        }
    };

    const handleBack = () => {
        const viewEl = document.getElementById('subcourse-view');
        const origin = viewEl?.dataset?.origin || 'dashboard-view';
        const resumePath = viewEl?.dataset?.resumePath;

        if (origin === 'home-view' && basePath === '') {
            navigate('home-view');
            if (viewEl) viewEl.dataset.origin = 'dashboard-view';
        } else if (origin === 'faculty-view' && basePath === (resumePath || '')) {
            const facultyToLoad = window.lastViewedFaculty;
            window.lastViewedFaculty = null;
            navigate('faculty-view');
            if (facultyToLoad && typeof window.renderFacultyProfile === 'function') {
                window.renderFacultyProfile(facultyToLoad);
            }
            if (viewEl) {
                viewEl.dataset.origin = 'dashboard-view';
                delete viewEl.dataset.resumePath;
            }
        } else if (origin === 'search-results-view') {
            navigate('search-results-view');
            if (viewEl) {
                viewEl.dataset.origin = 'dashboard-view';
                delete viewEl.dataset.resumePath;
            }
        } else if (origin === 'continue-view' && basePath === (resumePath || '')) {
            if (typeof window.renderContinueView === 'function') window.renderContinueView();
            navigate('continue-view');
            if (viewEl) {
                viewEl.dataset.origin = 'dashboard-view';
                delete viewEl.dataset.resumePath;
            }
        } else if (basePath === '') {
            navigate('dashboard-view');
            if (viewEl) viewEl.dataset.origin = 'dashboard-view';
        } else {
            const parentPath = getParentPath(basePath);
            navigate('#subcourse/' + course.id + (parentPath ? '/' + encodeURIComponent(parentPath) : ''));
        }
    };

    // Store dataset on container element for legacy caller compatibility
    useEffect(() => {
        const viewEl = document.getElementById('subcourse-view');
        if (viewEl) {
            viewEl.dataset.currentPath = basePath;
            if (courseId) viewEl.dataset.courseId = String(courseId);
        }
    }, [basePath, courseId]);

    return (
        <div id="subcourse-view" className={`view ${currentView === 'subcourse-view' ? 'active' : ''}`}>
            <SubcourseHeader
                course={course}
                basePath={basePath}
                origin={typeof document !== 'undefined' ? document.getElementById('subcourse-view')?.dataset?.origin : 'dashboard-view'}
                resumePath={typeof document !== 'undefined' ? document.getElementById('subcourse-view')?.dataset?.resumePath : undefined}
                onBack={handleBack}
            />
            <SubcourseGrid
                course={course}
                subfolders={immediateSubfolders}
                hideIgnored={hideIgnored}
                onEnter={handleEnter}
                onTitleChange={handleTitleChange}
                onFacultyChange={handleFacultyChange}
                onRatingChange={handleRatingChange}
                onIgnoreToggle={handleIgnoreToggle}
                onSplitToggle={handleSplitToggle}
                onThumbnailClick={handleThumbnailClick}
                onRemoveThumbnail={handleRemoveThumbnail}
                onDeleteSubfolder={handleDeleteSubfolder}
                onRefreshSubfolder={handleRefreshSubfolder}
                onRelocateSubfolder={handleRelocateSubfolder}
            />
        </div>
    );
}
