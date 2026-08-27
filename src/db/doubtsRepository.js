// Doubts Repository
// Pure IndexedDB data access for the 'doubts' store.
// NO business logic, NO screenshot cropping, NO DOM manipulations.

import { DOUBTS_STORE, ensureDB, getStore, parseCourseId, promisifyRequest, promisifyTransaction } from './database.js';

/**
 * Retrieves all doubts from IndexedDB.
 * @returns {Promise<Array>}
 */
export async function getAllDoubts() {
    await ensureDB();
    const store = getStore(DOUBTS_STORE, 'readonly');
    return promisifyRequest(store.getAll());
}

/**
 * Retrieves a single doubt by its ID.
 * @param {number|string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getDoubtById(id) {
    await ensureDB();
    const store = getStore(DOUBTS_STORE, 'readonly');
    const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return promisifyRequest(store.get(parsedId));
}

/**
 * Adds a new doubt record (auto-increment ID).
 * @param {Object} doubt
 * @returns {Promise<number>} ID of newly created doubt
 */
export async function addDoubt(doubt) {
    await ensureDB();
    const store = getStore(DOUBTS_STORE, 'readwrite');
    return promisifyRequest(store.add(doubt));
}

/**
 * Inserts or updates a doubt record.
 * @param {Object} doubt
 * @returns {Promise<any>}
 */
export async function putDoubt(doubt) {
    await ensureDB();
    const store = getStore(DOUBTS_STORE, 'readwrite');
    return promisifyRequest(store.put(doubt));
}

/**
 * Deletes a doubt record by ID.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteDoubt(id) {
    await ensureDB();
    const store = getStore(DOUBTS_STORE, 'readwrite');
    const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return promisifyRequest(store.delete(parsedId));
}

/**
 * Deletes all doubts for a specific course.
 * @param {string|number} courseId
 * @returns {Promise<void>}
 */
export async function deleteDoubtsForCourse(courseId) {
    const parsedId = parseCourseId(courseId);
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(DOUBTS_STORE, 'readwrite');
    const store = tx.objectStore(DOUBTS_STORE);
    
    return new Promise((resolve, reject) => {
        const req = store.openCursor();
        req.onerror = (e) => reject(e.target.error);
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                if (cursor.value.courseId === courseId || cursor.value.courseId === parsedId) {
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
 * Bulk writes multiple doubts records.
 * @param {Array<Object>} doubts
 * @returns {Promise<void>}
 */
export async function bulkPutDoubts(doubts) {
    if (!Array.isArray(doubts) || doubts.length === 0) return;
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(DOUBTS_STORE, 'readwrite');
    const store = tx.objectStore(DOUBTS_STORE);
    doubts.forEach(d => store.put(d));
    return promisifyTransaction(tx);
}

/**
 * Clears all doubts.
 * @returns {Promise<void>}
 */
export async function clearAllDoubts() {
    await ensureDB();
    const store = getStore(DOUBTS_STORE, 'readwrite');
    return promisifyRequest(store.clear());
}
