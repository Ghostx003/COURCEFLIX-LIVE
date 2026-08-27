import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
    loadAllProgress,
    getAllProgress,
    getLectureProgress,
    saveLectureProgress as serviceSaveLectureProgress,
    markLectureCompleted as serviceMarkLectureCompleted,
    updatePlaybackPosition as serviceUpdatePlaybackPosition,
    calculateCourseProgress,
    invalidateCourseProgressCache,
    deleteProgressForCourse as serviceDeleteProgressForCourse,
    isProgressLoaded
} from '../services/progressService.js';

export const ProgressContext = createContext(null);

/**
 * ProgressProvider provides canonical React progress state and methods,
 * backed by progressService and progressRepository.
 * Maintains compatibility with legacy window.courseProgress.
 */
export function ProgressProvider({ children }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(() => isProgressLoaded());
    const [progressVersion, setProgressVersion] = useState(0);

    // Subscribe to progress update events dispatched by progressService / legacy callers
    useEffect(() => {
        const handleProgressUpdated = () => {
            setProgressVersion(v => v + 1);
            setIsLoaded(true);
        };

        const handleDataUpdated = () => {
            setProgressVersion(v => v + 1);
        };

        window.addEventListener('courseflix:progress-updated', handleProgressUpdated);
        window.addEventListener('courseflix:data-updated', handleDataUpdated);

        return () => {
            window.removeEventListener('courseflix:progress-updated', handleProgressUpdated);
            window.removeEventListener('courseflix:data-updated', handleDataUpdated);
        };
    }, []);

    // Ensure progress is loaded lazily (only when a consumer requests it)
    const ensureProgressLoaded = useCallback(async () => {
        if (isProgressLoaded()) {
            setIsLoaded(true);
            return getAllProgress();
        }
        setIsLoading(true);
        try {
            const data = await loadAllProgress();
            setIsLoaded(true);
            setProgressVersion(v => v + 1);
            return data;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Force reload progress from IndexedDB
    const refreshProgress = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await loadAllProgress(true);
            setIsLoaded(true);
            setProgressVersion(v => v + 1);
            return data;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Reactive lecture progress getter
    const getLectureProgressReactive = useCallback((courseId, lectureId) => {
        // progressVersion ensures reactivity
        return getLectureProgress(courseId, lectureId);
    }, [progressVersion]);

    // Reactive course progress statistics calculator
    const getCourseProgressReactive = useCallback((course, forceRecalculate = false, targetSubfolder = null) => {
        // progressVersion ensures reactivity
        return calculateCourseProgress(course, forceRecalculate, targetSubfolder);
    }, [progressVersion]);

    // Reactive study logs getter
    const getStudyLogs = useCallback(() => {
        try {
            return JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
        } catch (e) {
            return [];
        }
    }, [progressVersion]);

    // Save lecture progress mutation
    const saveLectureProgress = useCallback(async (data) => {
        const result = await serviceSaveLectureProgress(data);
        setProgressVersion(v => v + 1);
        return result;
    }, []);

    // Mark lecture completed mutation
    const markLectureCompleted = useCallback(async (courseId, lectureId, isCompleted, metadata = {}) => {
        const result = await serviceMarkLectureCompleted(courseId, lectureId, isCompleted, metadata);
        setProgressVersion(v => v + 1);
        return result;
    }, []);

    // Update playback position mutation
    const updatePlaybackPosition = useCallback(async (courseId, lectureId, currentTime, duration = 0) => {
        const result = await serviceUpdatePlaybackPosition(courseId, lectureId, currentTime, duration);
        setProgressVersion(v => v + 1);
        return result;
    }, []);

    // Delete progress for a course
    const deleteProgressForCourse = useCallback(async (courseId) => {
        await serviceDeleteProgressForCourse(courseId);
        setProgressVersion(v => v + 1);
    }, []);

    // Invalidate cache helper
    const invalidateCache = useCallback((courseId = null) => {
        invalidateCourseProgressCache(courseId);
        setProgressVersion(v => v + 1);
    }, []);

    const value = useMemo(() => ({
        isLoading,
        isLoaded,
        progressVersion,
        ensureProgressLoaded,
        refreshProgress,
        getAllProgress,
        getLectureProgress: getLectureProgressReactive,
        getCourseProgress: getCourseProgressReactive,
        getStudyLogs,
        saveLectureProgress,
        markLectureCompleted,
        updatePlaybackPosition,
        deleteProgressForCourse,
        invalidateCache
    }), [
        isLoading,
        isLoaded,
        progressVersion,
        ensureProgressLoaded,
        refreshProgress,
        getLectureProgressReactive,
        getCourseProgressReactive,
        getStudyLogs,
        saveLectureProgress,
        markLectureCompleted,
        updatePlaybackPosition,
        deleteProgressForCourse,
        invalidateCache
    ]);

    return (
        <ProgressContext.Provider value={value}>
            {children}
        </ProgressContext.Provider>
    );
}
