// History Repository
// Pure IndexedDB data access for the 'history' store.
// NO business logic, NO view sorting, NO DOM manipulations.

import { HISTORY_STORE, ensureDB, getStore, parseCourseId, promisifyRequest, promisifyTransaction } from './database.js';

/**
 * Retrieves all history records from IndexedDB.
 * @returns {Promise<Array>}
 */
export async function getAllHistory() {
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readonly');
    return promisifyRequest(store.getAll());
}

/**
 * Retrieves a single history record by its ID.
 * @param {number|string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getHistoryById(id) {
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readonly');
    const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return promisifyRequest(store.get(parsedId));
}

/**
 * Adds a new history record (auto-increment ID).
 * @param {Object} historyItem
 * @returns {Promise<number>} ID of newly created history item
 */
export async function addHistory(historyItem) {
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readwrite');
    return promisifyRequest(store.add(historyItem));
}

/**
 * Inserts or updates a history record.
 * @param {Object} historyItem
 * @returns {Promise<any>}
 */
export async function putHistory(historyItem) {
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readwrite');
    return promisifyRequest(store.put(historyItem));
}

/**
 * Deletes a history record by ID.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteHistory(id) {
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readwrite');
    const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return promisifyRequest(store.delete(parsedId));
}

/**
 * Deletes all history records for a specific course.
 * @param {string|number} courseId
 * @returns {Promise<void>}
 */
export async function deleteHistoryForCourse(courseId) {
    const parsedId = parseCourseId(courseId);
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    
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
 * Deletes history records for a specific course and subfolder path.
 * @param {string|number} courseId
 * @param {string} targetSubfolder
 * @returns {Promise<void>}
 */
export async function deleteHistoryForSubfolder(courseId, targetSubfolder) {
    const parsedId = parseCourseId(courseId);
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    
    return new Promise((resolve, reject) => {
        const req = store.openCursor();
        req.onerror = (e) => reject(e.target.error);
        req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                const item = cursor.value;
                const matchCourse = item.courseId === courseId || item.courseId === parsedId;
                const itemSub = item.subfolder || '';
                const matchSub = itemSub === targetSubfolder || itemSub.startsWith(targetSubfolder + '/');
                if (matchCourse && matchSub) {
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
 * Bulk writes multiple history records.
 * @param {Array<Object>} historyList
 * @returns {Promise<void>}
 */
export async function bulkPutHistory(historyList) {
    if (!Array.isArray(historyList) || historyList.length === 0) return;
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    historyList.forEach(h => store.put(h));
    return promisifyTransaction(tx);
}

/**
 * Clears all history records.
 * @returns {Promise<void>}
 */
export async function clearAllHistory() {
    await ensureDB();
    const store = getStore(HISTORY_STORE, 'readwrite');
    return promisifyRequest(store.clear());
}
