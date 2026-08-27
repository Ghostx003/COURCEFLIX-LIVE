// Progress Repository
// Pure IndexedDB data access for the 'progress' store.
// NO business logic, NO completion calculation, NO time formatters.

import { PROGRESS_STORE, ensureDB, getStore, parseCourseId, promisifyRequest, promisifyTransaction } from './database.js';

/**
 * Retrieves all progress records from IndexedDB.
 * @returns {Promise<Array>} Array of progress objects
 */
export async function getAllProgress() {
    await ensureDB();
    const store = getStore(PROGRESS_STORE, 'readonly');
    return promisifyRequest(store.getAll());
}

/**
 * Retrieves a progress record by its primary key ID (e.g. "courseId_lectureId").
 * @param {string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getProgressById(id) {
    await ensureDB();
    const store = getStore(PROGRESS_STORE, 'readonly');
    return promisifyRequest(store.get(id));
}

/**
 * Retrieves progress for a specific course and lecture.
 * @param {string|number} courseId
 * @param {string|number} lectureId
 * @returns {Promise<Object|undefined>}
 */
export async function getLectureProgress(courseId, lectureId) {
    const progressId = `${courseId}_${lectureId}`;
    return getProgressById(progressId);
}

/**
 * Inserts or updates a progress record in IndexedDB.
 * Ensures the 'id' keyPath is properly set to `${courseId}_${lectureId}`.
 * @param {Object} data
 * @returns {Promise<any>}
 */
export async function putProgress(data) {
    await ensureDB();
    const progressId = data.id || `${data.courseId}_${data.lectureId}`;
    const record = { ...data, id: progressId };
    const store = getStore(PROGRESS_STORE, 'readwrite');
    return promisifyRequest(store.put(record));
}

/**
 * Deletes a single progress record by ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProgress(id) {
    await ensureDB();
    const store = getStore(PROGRESS_STORE, 'readwrite');
    return promisifyRequest(store.delete(id));
}

/**
 * Deletes all progress records belonging to a specific course.
 * @param {string|number} courseId
 * @returns {Promise<void>}
 */
export async function deleteProgressForCourse(courseId) {
    const parsedId = String(parseCourseId(courseId));
    const prefix = `${parsedId}_`;
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(PROGRESS_STORE);
    
    return new Promise((resolve, reject) => {
        const req = store.openCursor();
        req.onerror = (e) => reject(e.target.error);
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const key = String(cursor.key);
                if (key.startsWith(prefix) || cursor.value.courseId === courseId || cursor.value.courseId === parseCourseId(courseId)) {
                    cursor.delete();
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
    });
}

/**
 * Inserts or updates multiple progress records in a single transaction.
 * @param {Array<Object>} progressList
 * @returns {Promise<void>}
 */
export async function bulkPutProgress(progressList) {
    if (!Array.isArray(progressList) || progressList.length === 0) return;
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(PROGRESS_STORE, 'readwrite');
    const store = tx.objectStore(PROGRESS_STORE);
    progressList.forEach(item => {
        const progressId = item.id || `${item.courseId}_${item.lectureId}`;
        store.put({ ...item, id: progressId });
    });
    return promisifyTransaction(tx);
}

/**
 * Clears all progress records from the database.
 * @returns {Promise<void>}
 */
export async function clearAllProgress() {
    await ensureDB();
    const store = getStore(PROGRESS_STORE, 'readwrite');
    return promisifyRequest(store.clear());
}
