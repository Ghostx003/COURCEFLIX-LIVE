// Progress Business Logic Service
// Owns lecture progress tracking, completion calculations, timestamp management, and cache invalidation.
// Interacts with IndexedDB strictly via progressRepository.

import {
    getAllProgress as repoGetAllProgress,
    getProgressById as repoGetProgressById,
    putProgress as repoPutProgress,
    deleteProgress as repoDeleteProgress,
    deleteProgressForCourse as repoDeleteProgressForCourse
} from '../db/progressRepository.js';
import { putCourse as repoPutCourse } from '../db/coursesRepository.js';
import { parseCourseId } from '../db/database.js';

// In-memory runtime map of lecture progress objects: { [progressId]: ProgressRecord }
export let courseProgress = {};

// In-memory cache for pre-calculated course summary statistics: Map<courseId, StatsObject>
export const courseProgressCache = new Map();

/**
 * Invalidates the cached progress calculation for a specific course or all courses.
 * @param {string|number|null} [courseId=null]
 */
export function invalidateCourseProgressCache(courseId = null) {
    if (courseId !== undefined && courseId !== null) {
        courseProgressCache.delete(String(courseId));
        courseProgressCache.delete(Number(courseId));
        if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
            const c = window.courses.find(x => String(x.id) === String(courseId));
            if (c) {
                delete c.stats;
                delete c.subCourseStats;
            }
        }
    } else {
        courseProgressCache.clear();
        if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
            window.courses.forEach(c => {
                delete c.stats;
                delete c.subCourseStats;
            });
        }
    }
}

let inFlightLoadPromise = null;
let isLoaded = false;

/**
 * Checks if the full progress map has been loaded into memory.
 * @returns {boolean}
 */
export function isProgressLoaded() {
    return isLoaded || Object.keys(courseProgress).length > 0;
}

/**
 * Loads all progress records from IndexedDB into memory, clears calculation caches,
 * and maintains backward compatibility with window.courseProgress.
 * Deduplicates simultaneous calls using a shared in-flight promise.
 * @param {boolean} [force=false]
 * @returns {Promise<Object>} Map of progress records
 */
export async function loadAllProgress(force = false) {
    if (!force && inFlightLoadPromise) {
        return inFlightLoadPromise;
    }

    inFlightLoadPromise = (async () => {
        try {
            const allProgressList = await repoGetAllProgress();
            courseProgress = {};
            (allProgressList || []).forEach(item => {
                if (item && item.id) {
                    courseProgress[item.id] = item;
                }
            });
            courseProgressCache.clear();
            isLoaded = true;

            // Maintain window.courseProgress compatibility for legacy consumers
            if (typeof window !== 'undefined') {
                window.courseProgress = courseProgress;
                window.invalidateCourseProgressCache = invalidateCourseProgressCache;
                if (Array.isArray(window.courses)) {
                    window.courses.forEach(c => calculateCourseProgress(c, true));
                }
                window.dispatchEvent(new CustomEvent('courseflix:progress-updated'));
            }

            return courseProgress;
        } finally {
            inFlightLoadPromise = null;
        }
    })();

    return inFlightLoadPromise;
}

/**
 * Retrieves all in-memory progress records.
 * @returns {Object}
 */
export function getAllProgress() {
    return courseProgress;
}

/**
 * Retrieves progress for a specific course and lecture.
 * Falls back to an empty progress structure if not yet recorded.
 * @param {string|number} courseId
 * @param {string|number} lectureId
 * @returns {Object}
 */
export function getLectureProgress(courseId, lectureId) {
    const progressId = `${courseId}_${lectureId}`;
    if (courseProgress[progressId]) {
        return courseProgress[progressId];
    }
    if (typeof window !== 'undefined' && window.courseProgress && window.courseProgress[progressId]) {
        return window.courseProgress[progressId];
    }
    return {
        courseId,
        lectureId,
        completed: false,
        currentTime: 0,
        duration: 0,
        bookmarks: []
    };
}

/**
 * Calculates progress statistics (completion %, total duration, remaining duration)
 * for a course or a specific subfolder within a course.
 * Uses cached course.stats / course.subCourseStats unless forceRecalculate is true.
 * @param {Object} course
 * @param {boolean} [forceRecalculate=false]
 * @param {string|null} [targetSubfolder=null]
 * @returns {Object} { completed, total, percentage, remainingDuration, totalDuration }
 */
export function calculateCourseProgress(course, forceRecalculate = false, targetSubfolder = null) {
    if (!course) {
        return { completed: 0, total: 0, percentage: 0, remainingDuration: 0, totalDuration: 0 };
    }

    const cId = String(course.id);

    // Fast-path: return cached subfolder stats if valid
    if (targetSubfolder) {
        if (!forceRecalculate && course.subCourseStats && course.subCourseStats[targetSubfolder]) {
            return course.subCourseStats[targetSubfolder];
        }
    } else {
        // Fast-path: return memory-cached stats
        if (!forceRecalculate && courseProgressCache.has(cId)) {
            return courseProgressCache.get(cId);
        }
    }

    // Default structure for empty courses
    if (!course.lectures || course.lectures.length === 0) {
        const totalDur = course.totalDuration || 0;
        const res = { completed: 0, total: course.videoCount || 0, percentage: 0, remainingDuration: totalDur, totalDuration: totalDur };
        if (!targetSubfolder) {
            course.stats = res;
            courseProgressCache.set(cId, res);
        }
        return res;
    }

    let completed = 0;
    let timeCompleted = 0;
    let activeTotalLectures = 0;
    let activeTotalDuration = 0;

    const hasIgnoredSubs = !!(course.subCourseData && Object.values(course.subCourseData).some(s => s && s.isIgnored));
    const subCourseStatsMap = {};

    const lecs = course.lectures;
    const len = lecs.length;

    for (let i = 0; i < len; i++) {
        const lecture = lecs[i];
        let isSubfolderIgnored = false;

        if (hasIgnoredSubs && lecture.chapter) {
            for (const sub in course.subCourseData) {
                if (course.subCourseData[sub]?.isIgnored && (lecture.chapter === sub || lecture.chapter.startsWith(sub + '/'))) {
                    isSubfolderIgnored = true;
                    break;
                }
            }
        }

        const dur = lecture.duration || 0;
        const actualCourseId = lecture.overrideCourseId || course.id;
        const prog = getLectureProgress(actualCourseId, lecture.id);
        const isLecCompleted = !!(prog && prog.completed);

        // Course-wide tally
        if (!isSubfolderIgnored) {
            activeTotalLectures++;
            activeTotalDuration += dur;
            if (isLecCompleted) {
                completed++;
                timeCompleted += dur;
            }
        }

        // Subfolder tally
        if (lecture.chapter) {
            const ch = lecture.chapter;
            const parts = ch.split('/');
            for (let p = 1; p <= parts.length; p++) {
                const subPath = parts.slice(0, p).join('/');
                if (!subCourseStatsMap[subPath]) {
                    subCourseStatsMap[subPath] = { total: 0, completed: 0, totalDuration: 0, timeCompleted: 0 };
                }
                const subSt = subCourseStatsMap[subPath];
                subSt.total++;
                subSt.totalDuration += dur;
                if (isLecCompleted) {
                    subSt.completed++;
                    subSt.timeCompleted += dur;
                }
            }
        }
    }

    const effectiveTotalDuration = activeTotalDuration > 0 ? activeTotalDuration : (course.totalDuration || 0);
    const percentage = activeTotalLectures > 0 ? (completed / activeTotalLectures) * 100 : 0;

    if (activeTotalDuration === 0 && effectiveTotalDuration > 0 && activeTotalLectures > 0) {
        timeCompleted = (completed / activeTotalLectures) * effectiveTotalDuration;
    }

    const remainingDuration = effectiveTotalDuration - timeCompleted;

    const courseResult = {
        completed,
        total: activeTotalLectures,
        percentage,
        remainingDuration: Math.max(0, remainingDuration),
        totalDuration: effectiveTotalDuration
    };

    // Finalize subCourseStats
    course.subCourseStats = {};
    for (const subPath in subCourseStatsMap) {
        const s = subCourseStatsMap[subPath];
        const subRem = Math.max(0, s.totalDuration - s.timeCompleted);
        const subPct = s.total > 0 ? (s.completed / s.total) * 100 : 0;
        course.subCourseStats[subPath] = {
            total: s.total,
            completed: s.completed,
            percentage: subPct,
            totalDuration: s.totalDuration,
            remainingDuration: subRem
        };
    }

    course.stats = courseResult;
    courseProgressCache.set(cId, courseResult);

    if (targetSubfolder) {
        return course.subCourseStats[targetSubfolder] || { completed: 0, total: 0, percentage: 0, remainingDuration: 0, totalDuration: 0 };
    }

    return courseResult;
}

/**
 * Saves or updates a lecture progress record in IndexedDB and memory.
 * Recomputes course stats and maintains legacy sync.
 * @param {Object} data
 * @returns {Promise<Object>} The saved progress record
 */
export async function saveLectureProgress(data) {
    if (!data || data.courseId === undefined || data.lectureId === undefined) {
        throw new Error('[progressService] saveLectureProgress requires courseId and lectureId');
    }

    const progressId = data.id || `${data.courseId}_${data.lectureId}`;
    const existing = courseProgress[progressId] || getLectureProgress(data.courseId, data.lectureId);

    // Manage completion timestamps
    if (data.completed && !existing.completed) {
        data.completedAt = new Date().toISOString();
    } else if (data.completed === false) {
        data.completedAt = null;
    } else if (data.completed && existing.completed) {
        data.completedAt = existing.completedAt || existing.lastStudiedAt || new Date().toISOString();
    }

    data.lastStudiedAt = new Date().toISOString();

    const progressRecord = { ...existing, ...data, id: progressId };
    await repoPutProgress(progressRecord);

    // Update in-memory stores
    courseProgress[progressId] = progressRecord;
    if (typeof window !== 'undefined') {
        window.courseProgress = courseProgress;
    }

    // Invalidate and recompute course stats
    invalidateCourseProgressCache(data.courseId);

    if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
        const targetCourse = window.courses.find(c => String(c.id) === String(data.courseId));
        if (targetCourse) {
            calculateCourseProgress(targetCourse, true);
            try {
                await repoPutCourse(targetCourse);
            } catch (err) {
                console.warn('[progressService] Error persisting course stats:', err);
            }
        }
    }

    // Sync study logs in localStorage for performance/progress view
    if (data.completed !== undefined) {
        try {
            let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
            const logIndex = cfLogs.findIndex(log => log.lectureId === progressId);

            if (data.completed) {
                if (logIndex === -1) {
                    let faculty = data.faculty || 'Unknown';
                    let chapter = data.chapter || 'Unknown';

                    if (typeof window !== 'undefined' && window.currentCourse && window.currentCourse.id === data.courseId) {
                        if (window.currentCourse.subCourseData && window.currentSubfolder && window.currentCourse.subCourseData[window.currentSubfolder]?.facultyName) {
                            faculty = window.currentCourse.subCourseData[window.currentSubfolder].facultyName;
                        } else if (window.currentCourse.facultyName) {
                            faculty = window.currentCourse.facultyName;
                        }

                        if (window.currentCourse.lectures) {
                            const lec = window.currentCourse.lectures.find(l => l.id === data.lectureId);
                            if (lec && lec.chapter) chapter = lec.chapter;
                        }
                    }

                    cfLogs.push({
                        date: data.completedAt || new Date().toISOString(),
                        course: data.courseTitle || 'Unknown Course',
                        subject: data.courseTitle || 'Unknown Subject',
                        teacher: faculty,
                        chapter: chapter,
                        duration: data.lectureDuration || 0,
                        lectureId: progressId
                    });
                }
            } else {
                if (logIndex !== -1) {
                    cfLogs.splice(logIndex, 1);
                }
            }
            localStorage.setItem('courseflix_logs', JSON.stringify(cfLogs));
        } catch (e) {
            console.warn('[progressService] Error updating courseflix_logs:', e);
        }
    }

    // Dispatch progress updated custom event
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('courseflix:progress-updated', {
            detail: {
                courseId: data.courseId,
                lectureId: data.lectureId,
                progress: progressRecord
            }
        }));

        window.dispatchEvent(new CustomEvent('courseflix:data-updated'));

        if (typeof window.syncCourseflixSubjects === 'function') {
            window.syncCourseflixSubjects();
        }
    }

    return progressRecord;
}

/**
 * Marks a lecture as completed or uncompleted.
 * @param {string|number} courseId
 * @param {string|number} lectureId
 * @param {boolean} isCompleted
 * @param {Object} [metadata={}]
 * @returns {Promise<Object>}
 */
export async function markLectureCompleted(courseId, lectureId, isCompleted, metadata = {}) {
    return saveLectureProgress({
        courseId,
        lectureId,
        completed: !!isCompleted,
        ...metadata
    });
}

/**
 * Updates playback position (currentTime, duration) for a lecture.
 * @param {string|number} courseId
 * @param {string|number} lectureId
 * @param {number} currentTime
 * @param {number} [duration=0]
 * @returns {Promise<Object>}
 */
export async function updatePlaybackPosition(courseId, lectureId, currentTime, duration = 0) {
    const existing = getLectureProgress(courseId, lectureId);
    return saveLectureProgress({
        ...existing,
        courseId,
        lectureId,
        currentTime: Math.max(0, currentTime),
        duration: duration || existing.duration || 0,
        lastPlayed: new Date().toISOString()
    });
}

/**
 * Deletes all progress records belonging to a course.
 * @param {string|number} courseId
 * @returns {Promise<void>}
 */
export async function deleteProgressForCourse(courseId) {
    const parsedId = String(parseCourseId(courseId));
    await repoDeleteProgressForCourse(parsedId);

    // Update in-memory map
    const prefix = `${parsedId}_`;
    for (const key in courseProgress) {
        if (key.startsWith(prefix) || String(courseProgress[key].courseId) === parsedId) {
            delete courseProgress[key];
        }
    }
    invalidateCourseProgressCache(courseId);

    if (typeof window !== 'undefined') {
        window.courseProgress = courseProgress;
    }
}

// Bind to window for backward compatibility with unmigrated legacy code
if (typeof window !== 'undefined') {
    window.progressService = {
        loadAllProgress,
        getAllProgress,
        getLectureProgress,
        saveLectureProgress,
        markLectureCompleted,
        updatePlaybackPosition,
        calculateCourseProgress,
        invalidateCourseProgressCache,
        deleteProgressForCourse
    };
    window.loadAllProgress = loadAllProgress;
    window.getLectureProgress = getLectureProgress;
    window.saveLectureProgress = saveLectureProgress;
    window.calculateCourseProgress = calculateCourseProgress;
    window.invalidateCourseProgressCache = invalidateCourseProgressCache;
}
