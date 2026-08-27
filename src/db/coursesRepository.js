// Courses Repository
// Pure IndexedDB data access for the 'courses' store.
// NO business logic, NO directory scanning, NO UI manipulations.

import { STORE_NAME, ensureDB, getStore, parseCourseId, promisifyRequest, promisifyTransaction } from './database.js';

/**
 * Retrieves all courses from IndexedDB.
 * @returns {Promise<Array>} Array of course objects
 */
export async function getAllCourses() {
    await ensureDB();
    const store = getStore(STORE_NAME, 'readonly');
    return promisifyRequest(store.getAll());
}

/**
 * Retrieves a single course by its ID.
 * @param {string|number} id
 * @returns {Promise<Object|undefined>}
 */
export async function getCourseById(id) {
    await ensureDB();
    const parsedId = parseCourseId(id);
    const store = getStore(STORE_NAME, 'readonly');
    return promisifyRequest(store.get(parsedId));
}

/**
 * Inserts or updates a course in IndexedDB.
 * @param {Object} course
 * @returns {Promise<any>} The key of the updated course
 */
export async function putCourse(course) {
    await ensureDB();
    const store = getStore(STORE_NAME, 'readwrite');
    return promisifyRequest(store.put(course));
}

/**
 * Deletes a course from IndexedDB by its ID.
 * @param {string|number} id
 * @returns {Promise<void>}
 */
export async function deleteCourse(id) {
    await ensureDB();
    const parsedId = parseCourseId(id);
    const store = getStore(STORE_NAME, 'readwrite');
    return promisifyRequest(store.delete(parsedId));
}

/**
 * Inserts or updates multiple courses in a single readwrite transaction.
 * @param {Array<Object>} courses
 * @returns {Promise<void>}
 */
export async function bulkPutCourses(courses) {
    if (!Array.isArray(courses) || courses.length === 0) return;
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    courses.forEach(course => store.put(course));
    return promisifyTransaction(tx);
}

/**
 * Clears all courses from the database.
 * @returns {Promise<void>}
 */
export async function clearAllCourses() {
    await ensureDB();
    const store = getStore(STORE_NAME, 'readwrite');
    return promisifyRequest(store.clear());
}
