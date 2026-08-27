// Progress & History Service
// Extracted and modularized from legacy.js

import { ensureDB, getStore, STORE_NAME, PROGRESS_STORE, DPP_STORE, DOUBTS_STORE, HISTORY_STORE, CALENDAR_STORE } from './db.js';

export let courseProgress = {};
let cachedHistory = null;

if (typeof window !== 'undefined') {
    window.courseProgress = courseProgress;
}

export async function loadAllProgress() {
    await ensureDB();
    const allProgress = await new Promise(resolve => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => resolve(e.target.result || []));
    courseProgress = {};
    (allProgress || []).forEach(item => { courseProgress[item.id] = item; });
    if (typeof window !== 'undefined') {
        window.courseProgress = courseProgress;
        if (typeof window.invalidateCourseProgressCache === 'function') {
            window.invalidateCourseProgressCache();
        }
    }
    return courseProgress;
}

export function getLectureProgress(courseId, lectureId) {
    const progressId = `${courseId}_${lectureId}`;
    return courseProgress[progressId] || { courseId, lectureId, completed: false, lastPosition: 0, bookmarks: [] };
}

if (typeof window !== 'undefined') {
    window.getLectureProgress = getLectureProgress;
}

export async function saveLectureProgress(data) {
    const progressId = `${data.courseId}_${data.lectureId}`;
    const existing = courseProgress[progressId] || { courseId: data.courseId, lectureId: data.lectureId };
    
    if (data.completed && !existing.completed) {
        data.completedAt = new Date().toISOString();
    } else if (data.completed === false) {
        data.completedAt = null;
    } else if (data.completed && existing.completed) {
        data.completedAt = existing.completedAt || existing.lastStudiedAt || new Date().toISOString();
    }
    
    data.lastStudiedAt = new Date().toISOString();
    
    const progressData = { ...existing, ...data, id: progressId };
    await new Promise(resolve => getStore(PROGRESS_STORE, 'readwrite').put(progressData).onsuccess = resolve);
    courseProgress[progressId] = progressData;
    if (typeof window !== 'undefined') {
        window.courseProgress = courseProgress;
        if (typeof window.invalidateCourseProgressCache === 'function') {
            window.invalidateCourseProgressCache(data.courseId);
        }
        if (window.courses && Array.isArray(window.courses)) {
            const targetCourse = window.courses.find(c => String(c.id) === String(data.courseId));
            if (targetCourse && typeof window.calculateCourseProgress === 'function') {
                window.calculateCourseProgress(targetCourse, true);
                getStore(STORE_NAME, 'readwrite').put(targetCourse);
            }
        }
    }
    
    if (data.completed !== undefined) {
        let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
        const logIndex = cfLogs.findIndex(log => log.lectureId === progressId);
        
        if (data.completed) {
            if (logIndex === -1) {
                let faculty = data.faculty || (typeof window.currentCourse !== 'undefined' && window.currentCourse && window.currentCourse.id === data.courseId ? (window.currentCourse.subCourseData && window.currentSubfolder && window.currentCourse.subCourseData[window.currentSubfolder]?.facultyName ? window.currentCourse.subCourseData[window.currentSubfolder].facultyName : window.currentCourse.facultyName) || 'Unknown' : 'Unknown');
                let chapter = data.chapter || (typeof window.currentCourse !== 'undefined' && window.currentCourse && window.currentCourse.lectures ? (window.currentCourse.lectures.find(l => l.id === data.lectureId)?.chapter || 'Unknown') : 'Unknown');
                
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
    }
    
    if (typeof window.syncCourseflixSubjects === 'function') {
        window.syncCourseflixSubjects();
    }
    
    if (data.completed !== undefined && data.completed !== existing.completed) {
        const dh = parseFloat(localStorage.getItem('calcDailyHours')) || 7;
        const sp = parseFloat(localStorage.getItem('calcPlaybackSpeed')) || 1.5;
        if (typeof window.updateDailyGoalDisplay === 'function') {
            window.updateDailyGoalDisplay(dh, sp);
        }
    }
    return progressData;
}

export async function syncCourseflixSubjects() {
    await ensureDB();
    const allCourses = await new Promise(resolve => getStore(STORE_NAME, 'readonly').getAll().onsuccess = e => resolve(e.target.result));
    let cfSubjects = [];
    allCourses.forEach(course => {
        const prog = typeof window.calculateCourseProgress === 'function' ? window.calculateCourseProgress(course) : { total: 0, completed: 0, remainingDuration: 0 };
        let totalLectures = prog.total;
        let completedLectures = prog.completed;
        cfSubjects.push({
            id: course.id,
            name: course.title,
            faculty: course.facultyName || 'Unknown',
            totalLectures: totalLectures,
            completedLectures: completedLectures,
            remainingDuration: prog.remainingDuration
        });
    });
    localStorage.setItem('courseflix_subjects', JSON.stringify(cfSubjects));
    
    const allDpps = await new Promise(resolve => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => resolve(e.target.result || []));
    const courseIdStrs = allCourses.map(c => String(c.id));
    let cfDpps = (allDpps || [])
        .filter(d => !d.courseId || courseIdStrs.includes(String(d.courseId)))
        .map(d => ({
            id: d.id,
            name: d.fileName || d.title || `DPP ${d.id}`,
            courseId: d.courseId,
            status: d.status || 'none'
        }));
    localStorage.setItem('courseflix_dpps', JSON.stringify(cfDpps));
}

export async function addHistoryEntry(courseId, lectureId, courseTitle, lectureName, duration, subfolder, thumbnail) {
    cachedHistory = null;
    const entry = {
        courseId, lectureId, courseTitle, lectureName, duration, subfolder, thumbnail,
        timestamp: new Date().toISOString()
    };
    await ensureDB();
    return new Promise((resolve, reject) => {
        const request = getStore(HISTORY_STORE, 'readwrite').add(entry);
        request.onsuccess = resolve;
        request.onerror = reject;
    });
}

export async function getHistoryEntries() {
    await ensureDB();
    if (cachedHistory) return cachedHistory;
    return new Promise((resolve) => {
        try {
            const store = getStore(HISTORY_STORE, 'readonly');
            if (!store) return resolve([]);
            const request = store.getAll();
            request.onsuccess = () => {
                cachedHistory = request.result || [];
                resolve(cachedHistory);
            };
            request.onerror = (e) => {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                resolve([]);
            };
        } catch (err) {
            resolve([]);
        }
    });
}

export async function hideWatchHistoryEntry(id) {
    cachedHistory = null;
    await ensureDB();
    return new Promise((resolve, reject) => {
        const store = getStore(HISTORY_STORE, 'readwrite');
        store.get(id).onsuccess = (e) => {
            const h = e.target.result;
            if (h) {
                if (h.isHiddenFromContinue) {
                    store.delete(id).onsuccess = () => resolve();
                } else {
                    h.isHiddenFromHistory = true;
                    store.put(h).onsuccess = () => resolve();
                }
            } else resolve();
        };
    });
}

export async function clearWatchHistory() {
    cachedHistory = null;
    const history = await getHistoryEntries();
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readwrite');
    return Promise.all(history.map(h => {
        if (h.isHiddenFromHistory) return Promise.resolve();
        if (h.isHiddenFromContinue) {
            return new Promise(r => store.delete(h.id).onsuccess = r);
        } else {
            h.isHiddenFromHistory = true;
            return new Promise(r => store.put(h).onsuccess = r);
        }
    }));
}

export async function clearContinueHistory() {
    cachedHistory = null;
    const history = await getHistoryEntries();
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readwrite');
    return Promise.all(history.map(h => {
        if (h.isHiddenFromContinue) return Promise.resolve();
        if (h.isHiddenFromHistory) {
            return new Promise(r => store.delete(h.id).onsuccess = r);
        } else {
            h.isHiddenFromContinue = true;
            return new Promise(r => store.put(h).onsuccess = r);
        }
    }));
}

export async function hideContinueHistoryByCourseSubfolder(courseId, subfolder) {
    cachedHistory = null;
    const history = await getHistoryEntries();
    await ensureDB();
    const toHide = history.filter(h => h.courseId === courseId && (h.subfolder || '') === subfolder);
    const store = getStore(HISTORY_STORE, 'readwrite');
    return Promise.all(toHide.map(h => {
        if (h.isHiddenFromHistory) {
            return new Promise(r => store.delete(h.id).onsuccess = r);
        } else {
            h.isHiddenFromContinue = true;
            return new Promise(r => store.put(h).onsuccess = r);
        }
    }));
}

export function isSubfolderPathIgnoredOrHidden(course, subfolderPath) {
    if (!course) return false;
    if (course.isIgnored) return true;
    if (!course.subCourseData || !subfolderPath) return false;

    const normSub = String(subfolderPath).toLowerCase().trim();
    for (const key of Object.keys(course.subCourseData)) {
        const item = course.subCourseData[key];
        if (item && (item.hidden || item.isIgnored)) {
            const normKey = String(key).toLowerCase().trim();
            if (normSub === normKey || normSub.startsWith(normKey + '/') || normKey.startsWith(normSub + '/') || normSub.endsWith('/' + normKey) || normSub.includes('/' + normKey + '/')) {
                return true;
            }
        }
    }
    return false;
}

export function isSubfolderPathHidden(course, subfolderPath) {
    if (!course) return false;
    if (!course.subCourseData || !subfolderPath) return false;

    const normSub = String(subfolderPath).toLowerCase().trim();
    for (const key of Object.keys(course.subCourseData)) {
        const item = course.subCourseData[key];
        if (item && item.hidden) {
            const normKey = String(key).toLowerCase().trim();
            if (normSub === normKey || normSub.startsWith(normKey + '/') || normKey.startsWith(normSub + '/') || normSub.endsWith('/' + normKey) || normSub.includes('/' + normKey + '/')) {
                return true;
            }
        }
    }
    return false;
}

export async function hardDeleteHistoryForSubfolder(courseId, targetSubfolder) {
    try {
        await ensureDB();
        const history = await new Promise((resolve) => {
            const req = getStore(HISTORY_STORE, 'readonly').getAll();
            req.onsuccess = e => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
        });

        if (!history || history.length === 0) return;

        const toDeleteIds = [];
        const normTarget = String(targetSubfolder || '').toLowerCase().trim();

        for (const h of history) {
            if (parseInt(h.courseId) === parseInt(courseId)) {
                const normSub = String(h.subfolder || '').toLowerCase().trim();
                if (!normTarget || normSub === normTarget || normSub.startsWith(normTarget + '/') || normSub.endsWith('/' + normTarget) || normSub.includes('/' + normTarget + '/')) {
                    toDeleteIds.push(h.id);
                }
            }
        }

        if (toDeleteIds.length > 0) {
            cachedHistory = null;
            const store = getStore(HISTORY_STORE, 'readwrite');
            await Promise.all(toDeleteIds.map(id => new Promise(r => store.delete(id).onsuccess = r)));
        }
    } catch (err) {
        console.warn('Error in hardDeleteHistoryForSubfolder:', err);
    }
}

export async function cleanupOrphanedHistoryEntries() {
    try {
        await ensureDB();
        const history = await new Promise((resolve) => {
            const req = getStore(HISTORY_STORE, 'readonly').getAll();
            req.onsuccess = e => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
        });

        if (!history || history.length === 0) return;

        const courses = typeof window.courses !== 'undefined' ? window.courses : [];
        const toDeleteIds = [];
        for (const h of history) {
            if (!h.courseId) {
                toDeleteIds.push(h.id);
                continue;
            }
            const course = (courses || []).find(c => parseInt(c.id) === parseInt(h.courseId));
            if (!course) {
                toDeleteIds.push(h.id);
                continue;
            }
            if (h.subfolder && isSubfolderPathHidden(course, h.subfolder)) {
                toDeleteIds.push(h.id);
                continue;
            }
        }

        if (toDeleteIds.length > 0) {
            cachedHistory = null;
            const store = getStore(HISTORY_STORE, 'readwrite');
            await Promise.all(toDeleteIds.map(id => new Promise(r => store.delete(id).onsuccess = r)));
        }
    } catch (err) {
        console.warn('Error during history cleanup:', err);
    }
}

export async function purgeAllDataForDeletedCoursesAndSubfolders(options = {}) {
    let totalPurgedCount = 0;
    try {
        await ensureDB();
        const activeCourses = await new Promise((resolve) => {
            const req = getStore(STORE_NAME, 'readonly').getAll();
            req.onsuccess = e => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
        });

        const activeLectureMap = {};
        activeCourses.forEach(c => {
            if (c && Array.isArray(c.lectures)) {
                activeLectureMap[c.id] = new Set(c.lectures.map(l => String(l.id)));
            }
        });

        const isRecordValid = (courseId, subfolderPath, lectureId, itemId) => {
            if (!courseId) return false;
            const cId = parseInt(courseId);
            const course = activeCourses.find(c => parseInt(c.id) === cId);
            if (!course) return false;
            if (subfolderPath && isSubfolderPathHidden(course, subfolderPath)) return false;
            
            let lecId = lectureId ? String(lectureId) : null;
            if (!lecId && itemId && typeof itemId === 'string' && itemId.startsWith(cId + '_')) {
                lecId = itemId.replace(cId + '_', '');
            }
            if (lecId && activeLectureMap[cId] && activeLectureMap[cId].size > 0) {
                if (!activeLectureMap[cId].has(lecId)) {
                    return false;
                }
            }
            return true;
        };

        const allProgress = await new Promise((resolve) => {
            const req = getStore(PROGRESS_STORE, 'readonly').getAll();
            req.onsuccess = e => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
        });

        if (allProgress && allProgress.length > 0) {
            const progressStore = getStore(PROGRESS_STORE, 'readwrite');
            for (const prog of allProgress) {
                const sub = prog.subfolder || prog.chapter || '';
                if (!isRecordValid(prog.courseId, sub, prog.lectureId, prog.id)) {
                    progressStore.delete(prog.id);
                    totalPurgedCount++;
                    if (courseProgress) {
                        delete courseProgress[prog.id];
                    }
                }
            }
        }

        await cleanupOrphanedHistoryEntries();

        const allDoubts = await new Promise((resolve) => {
            const req = getStore(DOUBTS_STORE, 'readonly').getAll();
            req.onsuccess = e => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
        });

        if (allDoubts && allDoubts.length > 0) {
            const doubtsStore = getStore(DOUBTS_STORE, 'readwrite');
            for (const d of allDoubts) {
                const sub = d.subfolder || d.chapter || '';
                if (!isRecordValid(d.courseId, sub, d.lectureId, d.id)) {
                    doubtsStore.delete(d.id);
                    totalPurgedCount++;
                }
            }
        }

        const allDpp = await new Promise((resolve) => {
            const req = getStore(DPP_STORE, 'readonly').getAll();
            req.onsuccess = e => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
        });

        if (allDpp && allDpp.length > 0) {
            const dppStore = getStore(DPP_STORE, 'readwrite');
            for (const dpp of allDpp) {
                const sub = dpp.subfolder || dpp.chapter || '';
                if (!isRecordValid(dpp.courseId, sub, dpp.lectureId, dpp.id)) {
                    dppStore.delete(dpp.id);
                    totalPurgedCount++;
                }
            }
        }

        const allCal = await new Promise((resolve) => {
            const req = getStore(CALENDAR_STORE, 'readonly').getAll();
            req.onsuccess = e => resolve(e.target.result || []);
            req.onerror = () => resolve([]);
        });

        if (allCal && allCal.length > 0) {
            const calStore = getStore(CALENDAR_STORE, 'readwrite');
            for (const cal of allCal) {
                const sub = cal.subfolder || cal.chapter || '';
                if (cal.courseId && !isRecordValid(cal.courseId, sub, cal.lectureId, cal.id)) {
                    calStore.delete(cal.id);
                    totalPurgedCount++;
                }
            }
        }

        try {
            let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
            if (cfLogs && cfLogs.length > 0) {
                const initialLen = cfLogs.length;
                const filteredLogs = cfLogs.filter(log => isRecordValid(log.courseId, log.subfolder || log.chapter, log.lectureId, log.id));
                totalPurgedCount += (initialLen - filteredLogs.length);
                localStorage.setItem('courseflix_logs', JSON.stringify(filteredLogs));
            }
        } catch (e) {}

        try {
            const progRequest = indexedDB.open('ProgressAppDB', 1);
            await new Promise((resolve) => {
                progRequest.onsuccess = (e) => {
                    const db = e.target.result;
                    db.onversionchange = () => { try { db.close(); } catch (err) {} };
                    const finish = () => {
                        try { db.close(); } catch(err) {}
                        resolve();
                    };
                    if (db.objectStoreNames.contains('assignmentFiles')) {
                        const tx = db.transaction('assignmentFiles', 'readwrite');
                        const store = tx.objectStore('assignmentFiles');
                        const keysReq = store.getAllKeys();
                        keysReq.onsuccess = () => {
                            const keys = keysReq.result || [];
                            for (const key of keys) {
                                const keyStr = String(key);
                                const parts = keyStr.split('_');
                                const courseId = parts[0];
                                const lectureId = parts.slice(1).join('_');
                                if (!isRecordValid(courseId, null, lectureId, keyStr)) {
                                    store.delete(key);
                                    totalPurgedCount++;
                                }
                            }
                            finish();
                        };
                        keysReq.onerror = () => finish();
                    } else {
                        finish();
                    }
                };
                progRequest.onerror = () => resolve();
            });
        } catch (e) {}

    } catch (err) {
        console.warn('Error in purgeAllDataForDeletedCoursesAndSubfolders:', err);
    }
    return totalPurgedCount;
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.loadAllProgress = loadAllProgress;
    window.saveLectureProgress = saveLectureProgress;
    window.syncCourseflixSubjects = syncCourseflixSubjects;
    window.addHistoryEntry = addHistoryEntry;
    window.getHistoryEntries = getHistoryEntries;
    window.hideWatchHistoryEntry = hideWatchHistoryEntry;
    window.clearWatchHistory = clearWatchHistory;
    window.clearContinueHistory = clearContinueHistory;
    window.hideContinueHistoryByCourseSubfolder = hideContinueHistoryByCourseSubfolder;
    window.isSubfolderPathIgnoredOrHidden = isSubfolderPathIgnoredOrHidden;
    window.isSubfolderPathHidden = isSubfolderPathHidden;
    window.hardDeleteHistoryForSubfolder = hardDeleteHistoryForSubfolder;
    window.cleanupOrphanedHistoryEntries = cleanupOrphanedHistoryEntries;
    window.purgeAllDataForDeletedCoursesAndSubfolders = purgeAllDataForDeletedCoursesAndSubfolders;
}
