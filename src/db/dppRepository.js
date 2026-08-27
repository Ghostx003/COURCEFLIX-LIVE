// DPP Repository
// Pure IndexedDB data access for the 'dpps' store.
// NO business logic, NO PDF parsing, NO UI manipulations.

import { DPP_STORE, ensureDB, getStore, parseCourseId, promisifyRequest, promisifyTransaction } from './database.js';

/**
 * Retrieves all DPP records from IndexedDB.
 * @returns {Promise<Array>}
 */
export async function getAllDpps() {
    await ensureDB();
    const store = getStore(DPP_STORE, 'readonly');
    return promisifyRequest(store.getAll());
}

/**
 * Retrieves a single DPP record by its ID.
 * @param {number|string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getDppById(id) {
    await ensureDB();
    const store = getStore(DPP_STORE, 'readonly');
    return promisifyRequest(store.get(typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id));
}

/**
 * Adds a new DPP record (auto-increment ID).
 * @param {Object} dpp
 * @returns {Promise<number>} ID of newly created DPP
 */
export async function addDpp(dpp) {
    await ensureDB();
    const store = getStore(DPP_STORE, 'readwrite');
    return promisifyRequest(store.add(dpp));
}

/**
 * Inserts or updates a DPP record.
 * @param {Object} dpp
 * @returns {Promise<any>}
 */
export async function putDpp(dpp) {
    await ensureDB();
    const store = getStore(DPP_STORE, 'readwrite');
    return promisifyRequest(store.put(dpp));
}

/**
 * Deletes a DPP record by ID.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteDpp(id) {
    await ensureDB();
    const store = getStore(DPP_STORE, 'readwrite');
    const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return promisifyRequest(store.delete(parsedId));
}

/**
 * Deletes all DPP records for a given course.
 * @param {string|number} courseId
 * @returns {Promise<void>}
 */
export async function deleteDppsForCourse(courseId) {
    const parsedId = parseCourseId(courseId);
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(DPP_STORE, 'readwrite');
    const store = tx.objectStore(DPP_STORE);
    
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
 * Bulk writes multiple DPP records.
 * @param {Array<Object>} dpps
 * @returns {Promise<void>}
 */
export async function bulkPutDpps(dpps) {
    if (!Array.isArray(dpps) || dpps.length === 0) return;
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(DPP_STORE, 'readwrite');
    const store = tx.objectStore(DPP_STORE);
    dpps.forEach(dpp => store.put(dpp));
    return promisifyTransaction(tx);
}

/**
 * Clears all DPP records.
 * @returns {Promise<void>}
 */
export async function clearAllDpps() {
    await ensureDB();
    const store = getStore(DPP_STORE, 'readwrite');
    return promisifyRequest(store.clear());
}
