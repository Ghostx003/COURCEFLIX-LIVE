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
import { deleteHistoryForSubfolder } from '../db/historyRepository.js';
import { parseCourseId } from '../db/database.js';
import { scanDirectoryTree, naturalSort } from './fileSystemService.js';
import { calculateCourseProgress } from './progressService.js';
import { showToast } from './utils.js';


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
 * Deletes or hides a subfolder for a given course.
 * For custom subcourses, permanently removes their lectures and chapters.
 * For standard subcourses, marks them hidden and ignored.
 * Also cleans up history and purges orphaned data across stores.
 * @param {string|number} courseId
 * @param {string} subfolder
 * @returns {Promise<Object>} The updated course object
 */
export async function deleteSubfolder(courseId, subfolder) {
    const course = await getCourse(courseId);
    if (!course) throw new Error(`Course not found: ${courseId}`);

    course.subCourseData = { ...(course.subCourseData || {}) };
    course.subCourseData[subfolder] = { ...(course.subCourseData[subfolder] || {}) };

    if (course.subCourseData[subfolder].isCustom) {
        // Custom subcourse: remove lectures and chapters
        course.lectures = (course.lectures || []).filter(
            l => l.chapter !== subfolder && !l.chapter.startsWith(subfolder + '/')
        );
        course.chapters = (course.chapters || []).filter(
            ch => ch.name !== subfolder && !ch.name.startsWith(subfolder + '/')
        );
        delete course.subCourseData[subfolder];
        course.videoCount = (course.lectures || []).length;
    } else {
        // Standard subcourse: mark as hidden and ignored
        course.subCourseData[subfolder].hidden = true;
        course.subCourseData[subfolder].isIgnored = true;
    }

    try {
        calculateCourseProgress(course, true);
    } catch (err) {
        console.warn('[courseService] Error recalculating progress after deleting subfolder:', err);
    }

    await saveCourse(course);

    // Clean up history records for this subfolder
    try {
        await deleteHistoryForSubfolder(courseId, subfolder);
    } catch (err) {
        console.warn('[courseService] Error cleaning up history for subfolder:', err);
    }

    // Clean up legacy stores (progress, dpps, doubts, etc.) if purge function is available
    if (typeof window !== 'undefined' && typeof window.purgeAllDataForDeletedCoursesAndSubfolders === 'function') {
        try {
            await window.purgeAllDataForDeletedCoursesAndSubfolders();
        } catch (e) {
            console.warn('[courseService] Error in purgeAllDataForDeletedCoursesAndSubfolders:', e);
        }
    }

    // Refresh history view if available
    if (typeof window !== 'undefined' && typeof window.renderHistoryView === 'function') {
        try {
            window.renderHistoryView();
        } catch (e) {}
    }

    // Dispatch data-updated event so listeners across the application sync
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('courseflix:data-updated', { detail: { courseId, subfolder } }));
    }

    return course;
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

/**
 * Refreshes course or subcourse content by rescanning directory handles from the filesystem.
 * Preserves custom URLs, existing chapters, and unhides the target subfolder if specified.
 * Synchronizes with IndexedDB, in-memory courses, and dispatches UI update events.
 *
 * @param {string|number} courseId
 * @param {HTMLElement|null} [btnElement=null]
 * @param {string|null} [targetSubfolder=null]
 * @returns {Promise<Object|null>}
 */
export async function refreshCourse(courseId, btnElement = null, targetSubfolder = null) {
    const course = await getCourse(courseId);
    if (!course || (!course.handle && !course.isCustomCourse)) {
        showToast('Could not find the course folder. It may have been moved or deleted.', true);
        return null;
    }

    if (btnElement?.classList) btnElement.classList.add('loading');

    try {
        course.subCourseData = course.subCourseData || {};

        // If a specific subfolder is refreshed, explicitly ensure it is unhidden and not ignored
        if (targetSubfolder) {
            course.subCourseData[targetSubfolder] = course.subCourseData[targetSubfolder] || {};
            course.subCourseData[targetSubfolder].hidden = false;
            course.subCourseData[targetSubfolder].isIgnored = false;
        }

        // Check/request permission on root handle if present
        if (course.handle) {
            const queryPerm = typeof course.handle.queryPermission === 'function' ? await course.handle.queryPermission({ mode: 'read' }) : 'granted';
            if (queryPerm !== 'granted') {
                const reqPerm = typeof course.handle.requestPermission === 'function' ? await course.handle.requestPermission({ mode: 'read' }) : 'granted';
                if (reqPerm !== 'granted') {
                    showToast('Permission denied. Cannot refresh course.', true);
                    return null;
                }
            }
        }

        let newCourseData = {
            chapters: [],
            videoCount: 0,
            lectures: [],
            totalDuration: 0,
            hasInaccessibleFiles: false
        };

        if (course.handle) {
            newCourseData = await scanDirectoryTree(course.handle, {
                basePath: '',
                cachedLectures: course.lectures || []
            });
        }

        // Merge relocated / attached subfolder handles in course.subCourseData
        for (const subPath of Object.keys(course.subCourseData)) {
            const subDataEntry = course.subCourseData[subPath];
            const subHandle = subDataEntry?.handle;
            if (subHandle) {
                try {
                    let hasPerm = false;
                    if (typeof subHandle.queryPermission === 'function') {
                        hasPerm = (await subHandle.queryPermission({ mode: 'read' })) === 'granted';
                        if (!hasPerm && typeof subHandle.requestPermission === 'function') {
                            hasPerm = (await subHandle.requestPermission({ mode: 'read' })) === 'granted';
                        }
                    } else {
                        hasPerm = true;
                    }

                    if (hasPerm) {
                        const subScan = await scanDirectoryTree(subHandle, {
                            basePath: subPath,
                            cachedLectures: course.lectures || []
                        });
                        // Remove previous scan entries matching subPath
                        newCourseData.lectures = newCourseData.lectures.filter(
                            l => !((l.chapter || '') === subPath || (l.chapter || '').startsWith(subPath + '/'))
                        );
                        newCourseData.chapters = newCourseData.chapters.filter(
                            ch => !((ch.name || '') === subPath || (ch.name || '').startsWith(subPath + '/'))
                        );
                        newCourseData.lectures.push(...subScan.lectures);
                        newCourseData.chapters.push(...subScan.chapters);
                    }
                } catch (e) {
                    console.warn(`Subfolder scan failed for ${subPath}:`, e);
                }
            }
        }

        // Preserve all previously registered chapters so empty/intermediate subcourses never disappear
        if (Array.isArray(course.chapters)) {
            for (const oldCh of course.chapters) {
                if (!newCourseData.chapters.some(c => c.name === oldCh.name)) {
                    const matchingLecs = newCourseData.lectures.filter(l => l.chapter === oldCh.name);
                    newCourseData.chapters.push({
                        name: oldCh.name,
                        lectures: matchingLecs
                    });
                }
            }
        }

        // If a specific subfolder was refreshed, always ensure its chapter entry exists
        if (targetSubfolder && !newCourseData.chapters.some(c => c.name === targetSubfolder)) {
            const matchingLecs = newCourseData.lectures.filter(l => l.chapter === targetSubfolder);
            newCourseData.chapters.push({
                name: targetSubfolder,
                lectures: matchingLecs
            });
        }

        // Preserve custom lectures
        if (Array.isArray(course.lectures)) {
            const customLectures = course.lectures.filter(l => l.customUrl);
            if (customLectures.length > 0) {
                for (const cl of customLectures) {
                    if (!newCourseData.lectures.some(l => l.id === cl.id)) {
                        newCourseData.lectures.push(cl);
                    }
                }
                const customChapterNames = new Set(customLectures.map(l => l.chapter).filter(Boolean));
                customChapterNames.forEach(chapterName => {
                    let existingChapter = newCourseData.chapters.find(ch => ch.name === chapterName);
                    if (!existingChapter) {
                        const chapterLectures = customLectures.filter(l => l.chapter === chapterName);
                        newCourseData.chapters.push({ name: chapterName, lectures: chapterLectures });
                    } else {
                        const chapterLectures = customLectures.filter(l => l.chapter === chapterName);
                        for (const cl of chapterLectures) {
                            if (!existingChapter.lectures.some(l => l.id === cl.id)) {
                                existingChapter.lectures.push(cl);
                            }
                        }
                    }
                });
            }
        }

        course.lectures = newCourseData.lectures;
        course.chapters = newCourseData.chapters.sort(naturalSort);
        course.videoCount = course.lectures.length;
        course.totalDuration = course.lectures.reduce((sum, l) => sum + (l.duration || 0), 0);

        if (typeof window.invalidateCourseProgressCache === 'function') {
            window.invalidateCourseProgressCache(course.id);
        }
        if (typeof window.calculateCourseProgress === 'function') {
            window.calculateCourseProgress(course, true);
        }

        await saveCourse(course);

        // Notify entire app (React contexts & legacy listeners)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('courseflix:data-updated'));
            window.dispatchEvent(new CustomEvent('courseflix:courses-loaded', { detail: window.courses }));

            if (typeof window.renderCourseGrid === 'function' && document.getElementById('dashboard-view')?.classList.contains('active')) {
                window.renderCourseGrid();
            }
            if (typeof window.updateTotalTimeLeftDisplay === 'function') {
                window.updateTotalTimeLeftDisplay();
            }
        }

        if (targetSubfolder) {
            const subLecs = course.lectures.filter(l => (l.chapter || '') === targetSubfolder || (l.chapter || '').startsWith(targetSubfolder + '/'));
            showToast(`Refreshed "${targetSubfolder.split('/').pop()}"! (${subLecs.length} lectures)`);
        } else {
            showToast(`Refreshed "${course.title}"! (${course.lectures.length} lectures)`);
        }

        return course;
    } catch (err) {
        console.error('[courseService] Error refreshing course:', err);
        showToast('An error occurred while refreshing.', true);
        return null;
    } finally {
        if (btnElement?.classList) btnElement.classList.remove('loading');
    }
}

// Bind to window for backward compatibility with unmigrated legacy modules
if (typeof window !== 'undefined') {
    window.refreshCourse = refreshCourse;
    window.courseService = {
        getCourses,
        getCourse,
        saveCourse,
        updateCourse,
        deleteCourse,
        deleteSubfolder,
        persistCourseStats,
        updateCourseTitle,
        updateCourseFaculty,
        toggleCourseRating,
        toggleCourseIgnored,
        toggleCourseSplitView,
        updateCourseThumbnail,
        removeCourseThumbnail,
        reorderCourses,
        sortCourses,
        refreshCourse
    };
}
