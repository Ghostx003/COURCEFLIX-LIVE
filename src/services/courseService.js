// Course Business Logic Service
// Owns business operations, metadata mutations, sorting, and caching for courses.
// Interacts with IndexedDB strictly via coursesRepository.

import {
    getAllCourses as repoGetAllCourses,
    getCourseById as repoGetCourseById,
    putCourse as repoPutCourse,
    deleteCourse as repoDeleteCourse,
    bulkPutCourses as repoBulkPutCourses
} from '../db/coursesRepository.js';
import { parseCourseId } from '../db/database.js';

/**
 * Normalizes a course entity, ensuring calculated runtime flags like `isLinked` are present.
 * @param {Object} course
 * @returns {Object}
 */
export function normalizeCourse(course) {
    if (!course) return course;
    course.isLinked = !!(course.handle || course.isCustomCourse);
    return course;
}

/**
 * Loads all courses from IndexedDB via coursesRepository, normalizes them,
 * and maintains backward compatibility with window.courses.
 * @returns {Promise<Array<Object>>}
 */
export async function getCourses() {
    const courses = await repoGetAllCourses();
    const normalized = (courses || []).map(normalizeCourse);

    // Maintain window.courses compatibility for legacy consumers
    if (typeof window !== 'undefined') {
        window.courses = normalized;
    }

    return normalized;
}

/**
 * Loads a single course by its ID.
 * @param {string|number} id
 * @returns {Promise<Object|undefined>}
 */
export async function getCourse(id) {
    const parsedId = parseCourseId(id);
    const course = await repoGetCourseById(parsedId);
    return normalizeCourse(course);
}

/**
 * Saves or updates a course in IndexedDB and synchronizes window.courses.
 * @param {Object} course
 * @returns {Promise<any>}
 */
export async function saveCourse(course) {
    if (!course || course.id === undefined) {
        throw new Error('[courseService] Cannot save course without valid id');
    }
    normalizeCourse(course);
    const result = await repoPutCourse(course);

    // Synchronize window.courses if it exists
    if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
        const idx = window.courses.findIndex(c => String(c.id) === String(course.id));
        if (idx !== -1) {
            window.courses[idx] = course;
        } else {
            window.courses.push(course);
        }
    }

    return result;
}

/**
 * Updates partial metadata on an existing course.
 * @param {string|number} id
 * @param {Object} updates
 * @returns {Promise<Object>} The updated course
 */
export async function updateCourse(id, updates = {}) {
    const course = await getCourse(id);
    if (!course) {
        throw new Error(`[courseService] Course not found for id: ${id}`);
    }

    Object.assign(course, updates);
    await saveCourse(course);
    return course;
}

/**
 * Deletes a course from IndexedDB and synchronizes window.courses.
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function deleteCourse(id) {
    const parsedId = parseCourseId(id);
    await repoDeleteCourse(parsedId);

    // Synchronize window.courses
    if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
        window.courses = window.courses.filter(c => String(c.id) !== String(id));
    }
}

/**
 * Persists pre-computed stats (completion, duration, counts) to the course object in IndexedDB.
 * @param {Object} course
 * @returns {Promise<void>}
 */
export async function persistCourseStats(course) {
    if (!course || !course.id) return;
    try {
        await repoPutCourse(course);
    } catch (e) {
        console.warn('[courseService] Error persisting course stats:', e);
    }
}

/**
 * Updates the title of a course or subcourse.
 * @param {string|number} courseId
 * @param {string} newTitle
 * @param {string|null} [subfolder=null]
 * @returns {Promise<Object>}
 */
export async function updateCourseTitle(courseId, newTitle, subfolder = null) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    const trimmed = (newTitle || '').trim();
    if (!trimmed) return course;

    if (subfolder) {
        course.subCourseData = course.subCourseData || {};
        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
        course.subCourseData[subfolder].customName = trimmed;
    } else {
        course.title = trimmed;
    }

    await saveCourse(course);
    return course;
}

/**
 * Updates the faculty / teacher name for a course or subcourse.
 * @param {string|number} courseId
 * @param {string} newFaculty
 * @param {string|null} [subfolder=null]
 * @returns {Promise<Object>}
 */
export async function updateCourseFaculty(courseId, newFaculty, subfolder = null) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    const trimmed = (newFaculty || '').trim();
    const facultyVal = trimmed || null;

    if (subfolder) {
        course.subCourseData = course.subCourseData || {};
        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
        course.subCourseData[subfolder].facultyName = facultyVal;
    } else {
        course.facultyName = facultyVal;
    }

    await saveCourse(course);
    return course;
}

/**
 * Toggles or updates the star rating of a course or subcourse (1-5, or 0 to clear).
 * @param {string|number} courseId
 * @param {number} ratingValue
 * @param {string|null} [subfolder=null]
 * @returns {Promise<number>} The new rating value
 */
export async function toggleCourseRating(courseId, ratingValue, subfolder = null) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    const newRating = parseInt(ratingValue, 10) || 0;
    let finalRating = 0;

    if (subfolder) {
        course.subCourseData = course.subCourseData || {};
        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
        finalRating = (course.subCourseData[subfolder].rating === newRating) ? 0 : newRating;
        course.subCourseData[subfolder].rating = finalRating;
    } else {
        finalRating = (course.rating === newRating) ? 0 : newRating;
        course.rating = finalRating;
    }

    await saveCourse(course);
    return finalRating;
}

/**
 * Toggles the ignored status of a course or subcourse.
 * @param {string|number} courseId
 * @param {boolean} isIgnored
 * @param {string|null} [subfolder=null]
 * @returns {Promise<boolean>}
 */
export async function toggleCourseIgnored(courseId, isIgnored, subfolder = null) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    if (subfolder) {
        course.subCourseData = course.subCourseData || {};
        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
        course.subCourseData[subfolder].isIgnored = !!isIgnored;
    } else {
        course.isIgnored = !!isIgnored;
    }

    await saveCourse(course);
    return !!isIgnored;
}

/**
 * Toggles the split-by-folders view mode for a course or subcourse.
 * @param {string|number} courseId
 * @param {boolean} isSplitView
 * @param {string|null} [subfolder=null]
 * @returns {Promise<boolean>}
 */
export async function toggleCourseSplitView(courseId, isSplitView, subfolder = null) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    if (subfolder) {
        course.subCourseData = course.subCourseData || {};
        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
        course.subCourseData[subfolder].isSplitView = !!isSplitView;
    } else {
        course.isSplitView = !!isSplitView;
    }

    await saveCourse(course);
    return subfolder ? course.subCourseData[subfolder].isSplitView : course.isSplitView;
}

/**
 * Sets a custom thumbnail data URL on a course or subcourse.
 * @param {string|number} courseId
 * @param {string} thumbnailDataUrl
 * @param {string|null} [subfolder=null]
 * @returns {Promise<Object>}
 */
export async function updateCourseThumbnail(courseId, thumbnailDataUrl, subfolder = null) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    if (subfolder) {
        course.subCourseData = course.subCourseData || {};
        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
        course.subCourseData[subfolder].thumbnail = thumbnailDataUrl;
    } else {
        course.thumbnail = thumbnailDataUrl;
    }

    await saveCourse(course);
    return course;
}

/**
 * Removes the custom thumbnail from a course or subcourse.
 * @param {string|number} courseId
 * @param {string|null} [subfolder=null]
 * @returns {Promise<Object>}
 */
export async function removeCourseThumbnail(courseId, subfolder = null) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    if (subfolder) {
        if (course.subCourseData && course.subCourseData[subfolder]) {
            delete course.subCourseData[subfolder].thumbnail;
        }
    } else {
        delete course.thumbnail;
    }

    await saveCourse(course);
    return course;
}

/**
 * Reorders courses by updating their .order property and persisting to IndexedDB.
 * @param {Array<string|number>} orderedCourseIds Array of course IDs in their new order
 * @returns {Promise<void>}
 */
export async function reorderCourses(orderedCourseIds) {
    if (!Array.isArray(orderedCourseIds) || orderedCourseIds.length === 0) return;

    const allCourses = await getCourses();
    const courseMap = new Map();
    allCourses.forEach(c => courseMap.set(String(c.id), c));

    const updatedCourses = [];
    orderedCourseIds.forEach((id, index) => {
        const course = courseMap.get(String(id));
        if (course) {
            course.order = index;
            updatedCourses.push(course);
        }
    });

    if (updatedCourses.length > 0) {
        await repoBulkPutCourses(updatedCourses);
        // Synchronize in-memory window.courses
        if (typeof window !== 'undefined' && Array.isArray(window.courses)) {
            updatedCourses.forEach(updated => {
                const existing = window.courses.find(c => String(c.id) === String(updated.id));
                if (existing) existing.order = updated.order;
            });
        }
    }
}

/**
 * Pure function to sort a list of courses according to user preference.
 * @param {Array<Object>} courses
 * @param {string} sortPref
 * @param {Map<string|number, Object>} [progressMap=new Map()] Precalculated progress map
 * @param {Array<Object>} [completionGroups=[]] Optional completion groups for group_* sort
 * @returns {Array<Object>} New sorted array of courses
 */
export function sortCourses(courses, sortPref = 'custom', progressMap = new Map(), completionGroups = []) {
    if (!Array.isArray(courses)) return [];
    const sorted = [...courses];

    if (sortPref.startsWith('group_')) {
        const grpName = sortPref.replace('group_', '');
        const grp = (completionGroups || []).find(g => g.name === grpName);
        const grpCourseIds = new Set((grp?.courseIds || []).map(id => String(id)));
        sorted.sort((a, b) => {
            const inA = grpCourseIds.has(String(a.id));
            const inB = grpCourseIds.has(String(b.id));
            if (inA && !inB) return -1;
            if (!inA && inB) return 1;
            return (a.order || 0) - (b.order || 0);
        });
    } else if (sortPref === 'completion_asc') {
        sorted.sort((a, b) => (progressMap.get(a.id)?.percentage || 0) - (progressMap.get(b.id)?.percentage || 0));
    } else if (sortPref === 'completion_desc') {
        sorted.sort((a, b) => (progressMap.get(b.id)?.percentage || 0) - (progressMap.get(a.id)?.percentage || 0));
    } else if (sortPref === 'duration_desc') {
        sorted.sort((a, b) => (progressMap.get(b.id)?.totalDuration || 0) - (progressMap.get(a.id)?.totalDuration || 0));
    } else if (sortPref === 'duration_asc') {
        sorted.sort((a, b) => (progressMap.get(a.id)?.totalDuration || 0) - (progressMap.get(b.id)?.totalDuration || 0));
    } else if (sortPref === 'duration_left_desc') {
        sorted.sort((a, b) => (progressMap.get(b.id)?.remainingDuration || 0) - (progressMap.get(a.id)?.remainingDuration || 0));
    } else if (sortPref === 'duration_left_asc') {
        sorted.sort((a, b) => (progressMap.get(a.id)?.remainingDuration || 0) - (progressMap.get(b.id)?.remainingDuration || 0));
    } else {
        sorted.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    return sorted;
}

// Bind to window for backward compatibility with unmigrated legacy modules
if (typeof window !== 'undefined') {
    window.courseService = {
        getCourses,
        getCourse,
        saveCourse,
        updateCourse,
        deleteCourse,
        persistCourseStats,
        updateCourseTitle,
        updateCourseFaculty,
        toggleCourseRating,
        toggleCourseIgnored,
        toggleCourseSplitView,
        updateCourseThumbnail,
        removeCourseThumbnail,
        reorderCourses,
        sortCourses
    };
}
