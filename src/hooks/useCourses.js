import { useState, useEffect, useCallback } from 'react';
import { useCoursesContext } from '../context/CourseContext.jsx';
import {
    getCourses as serviceGetCourses,
    getCourse as serviceGetCourse,
    saveCourse as serviceSaveCourse,
    updateCourse as serviceUpdateCourse,
    deleteCourse as serviceDeleteCourse,
    deleteSubfolder as serviceDeleteSubfolder,
    reorderCourses as serviceReorderCourses,
    toggleCourseRating as serviceToggleCourseRating,
    toggleCourseIgnored as serviceToggleCourseIgnored,
    toggleCourseSplitView as serviceToggleCourseSplitView,
    updateCourseThumbnail as serviceUpdateCourseThumbnail,
    removeCourseThumbnail as serviceRemoveCourseThumbnail,
    updateCourseTitle as serviceUpdateCourseTitle,
    updateCourseFaculty as serviceUpdateCourseFaculty
} from '../services/courseService.js';

/**
 * React Hook for managing CourseFlix courses.
 * Provides loaded courses, lifecycle operations, and metadata mutation handlers.
 * Maintains synchronization with CourseContext, courseService and IndexedDB.
 */
export function useCourses() {
    const context = useCoursesContext();
    if (context) return context;

    return useStandaloneCourses();
}

function useStandaloneCourses() {
    const [courses, setCourses] = useState(() => {
        if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
            return window.courses;
        }
        return [];
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const reloadCourses = useCallback(async () => {
        try {
            setLoading(true);
            const fetched = await serviceGetCourses();
            setCourses(fetched || []);
            setError(null);
            return fetched;
        } catch (err) {
            console.error('[useCourses] Error loading courses:', err);
            setError(err);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Only hit IndexedDB once on initial mount
        reloadCourses();

        const handleCoursesLoaded = (e) => {
            if (e && e.detail && Array.isArray(e.detail)) {
                setCourses([...e.detail]);
                setLoading(false);
            }
        };

        const handleDataUpdated = () => {
            // Use window.courses in-memory — don't re-fetch from IndexedDB
            if (Array.isArray(window.courses)) {
                setCourses([...window.courses]);
            }
        };

        window.addEventListener('courseflix:courses-loaded', handleCoursesLoaded);
        window.addEventListener('courseflix:data-updated', handleDataUpdated);

        return () => {
            window.removeEventListener('courseflix:courses-loaded', handleCoursesLoaded);
            window.removeEventListener('courseflix:data-updated', handleDataUpdated);
        };
    }, [reloadCourses]);

    const updateCourse = useCallback(async (courseId, updates) => {
        try {
            const updated = await serviceUpdateCourse(courseId, updates);
            setCourses(prev => prev.map(c => String(c.id) === String(courseId) ? { ...c, ...updates } : c));
            return updated;
        } catch (err) {
            console.error(`[useCourses] Error updating course ${courseId}:`, err);
            throw err;
        }
    }, []);

    const deleteCourse = useCallback(async (courseId) => {
        try {
            await serviceDeleteCourse(courseId);
            setCourses(prev => prev.filter(c => String(c.id) !== String(courseId)));
        } catch (err) {
            console.error(`[useCourses] Error deleting course ${courseId}:`, err);
            throw err;
        }
    }, []);

    const deleteSubfolder = useCallback(async (courseId, subfolder) => {
        try {
            const updated = await serviceDeleteSubfolder(courseId, subfolder);
            setCourses(prev => prev.map(c => String(c.id) === String(courseId) ? { ...updated } : c));
            return updated;
        } catch (err) {
            console.error(`[useCourses] Error deleting subfolder ${subfolder} in course ${courseId}:`, err);
            throw err;
        }
    }, []);


    const reorderCourses = useCallback(async (orderedCourseIds) => {
        try {
            await serviceReorderCourses(orderedCourseIds);
            setCourses(prev => {
                const map = new Map();
                prev.forEach(c => map.set(String(c.id), c));
                const reordered = [];
                orderedCourseIds.forEach((id, idx) => {
                    const c = map.get(String(id));
                    if (c) {
                        reordered.push({ ...c, order: idx });
                    }
                });
                return reordered;
            });
        } catch (err) {
            console.error('[useCourses] Error reordering courses:', err);
            throw err;
        }
    }, []);

    const setCourseRating = useCallback(async (courseId, rating, subfolder = null) => {
        try {
            const newRating = await serviceToggleCourseRating(courseId, rating, subfolder);
            setCourses(prev => prev.map(c => {
                if (String(c.id) !== String(courseId)) return c;
                if (subfolder) {
                    const subData = { ...(c.subCourseData || {}) };
                    subData[subfolder] = { ...(subData[subfolder] || {}), rating: newRating };
                    return { ...c, subCourseData: subData };
                }
                return { ...c, rating: newRating };
            }));
            return newRating;
        } catch (err) {
            console.error(`[useCourses] Error setting course rating for ${courseId}:`, err);
            throw err;
        }
    }, []);

    const toggleCourseIgnored = useCallback(async (courseId, isIgnored, subfolder = null) => {
        // 1. Optimistic immediate state update so UI responds instantly on first click
        setCourses(prev => prev.map(c => {
            if (String(c.id) !== String(courseId)) return c;
            if (subfolder) {
                const subData = { ...(c.subCourseData || {}) };
                subData[subfolder] = { ...(subData[subfolder] || {}), isIgnored: !!isIgnored };
                const updated = { ...c, subCourseData: subData };
                delete updated.stats;
                return updated;
            }
            const updated = { ...c, isIgnored: !!isIgnored };
            delete updated.stats;
            return updated;
        }));

        // 2. Optimistically sync window.courses
        if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
            const idx = window.courses.findIndex(c => String(c.id) === String(courseId));
            if (idx !== -1) {
                const target = window.courses[idx];
                if (subfolder) {
                    target.subCourseData = target.subCourseData || {};
                    target.subCourseData[subfolder] = target.subCourseData[subfolder] || {};
                    target.subCourseData[subfolder].isIgnored = !!isIgnored;
                } else {
                    target.isIgnored = !!isIgnored;
                }
                delete target.stats;
            }
        }

        // 3. Immediately update time left display
        if (typeof window.updateTotalTimeLeftDisplay === 'function') {
            window.updateTotalTimeLeftDisplay();
        }

        // 4. Persist to IndexedDB in background
        try {
            await serviceToggleCourseIgnored(courseId, isIgnored, subfolder);
        } catch (err) {
            console.error(`[useCourses] Error toggling course ignored for ${courseId}:`, err);
            reloadCourses();
            throw err;
        }
    }, [reloadCourses]);

    const toggleCourseSplitView = useCallback(async (courseId, isSplitView, subfolder = null) => {
        try {
            await serviceToggleCourseSplitView(courseId, isSplitView, subfolder);
            setCourses(prev => prev.map(c => {
                if (String(c.id) !== String(courseId)) return c;
                if (subfolder) {
                    const subData = { ...(c.subCourseData || {}) };
                    subData[subfolder] = { ...(subData[subfolder] || {}), isSplitView: !!isSplitView };
                    return { ...c, subCourseData: subData };
                }
                return { ...c, isSplitView: !!isSplitView };
            }));
        } catch (err) {
            console.error(`[useCourses] Error toggling split view for ${courseId}:`, err);
            throw err;
        }
    }, []);

    const updateCourseThumbnail = useCallback(async (courseId, thumbnailDataUrl, subfolder = null) => {
        try {
            const updated = await serviceUpdateCourseThumbnail(courseId, thumbnailDataUrl, subfolder);
            setCourses(prev => prev.map(c => String(c.id) === String(courseId) ? { ...updated } : c));
        } catch (err) {
            console.error(`[useCourses] Error setting thumbnail for ${courseId}:`, err);
            throw err;
        }
    }, []);

    const removeCourseThumbnail = useCallback(async (courseId, subfolder = null) => {
        try {
            const updated = await serviceRemoveCourseThumbnail(courseId, subfolder);
            setCourses(prev => prev.map(c => String(c.id) === String(courseId) ? { ...updated } : c));
        } catch (err) {
            console.error(`[useCourses] Error removing thumbnail for ${courseId}:`, err);
            throw err;
        }
    }, []);

    const updateCourseTitle = useCallback(async (courseId, newTitle, subfolder = null) => {
        try {
            const updated = await serviceUpdateCourseTitle(courseId, newTitle, subfolder);
            setCourses(prev => prev.map(c => String(c.id) === String(courseId) ? { ...updated } : c));
        } catch (err) {
            console.error(`[useCourses] Error updating course title for ${courseId}:`, err);
            throw err;
        }
    }, []);

    const updateCourseFaculty = useCallback(async (courseId, newFaculty, subfolder = null) => {
        try {
            const updated = await serviceUpdateCourseFaculty(courseId, newFaculty, subfolder);
            setCourses(prev => prev.map(c => String(c.id) === String(courseId) ? { ...updated } : c));
        } catch (err) {
            console.error(`[useCourses] Error updating course faculty for ${courseId}:`, err);
            throw err;
        }
    }, []);

    return {
        courses,
        loading,
        error,
        reloadCourses,
        updateCourse,
        deleteCourse,
        deleteSubfolder,
        reorderCourses,
        setCourseRating,
        toggleCourseIgnored,
        toggleCourseSplitView,
        updateCourseThumbnail,
        removeCourseThumbnail,
        updateCourseTitle,
        updateCourseFaculty
    };
}
