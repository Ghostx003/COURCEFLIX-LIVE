// Calendar Events Repository
// Pure IndexedDB data access for the 'calendarEvents' store.
// NO business logic, NO time formatting, NO DOM manipulations.

import { CALENDAR_STORE, ensureDB, getStore, parseCourseId, promisifyRequest, promisifyTransaction } from './database.js';

/**
 * Retrieves all calendar events from IndexedDB.
 * @returns {Promise<Array>}
 */
export async function getAllCalendarEvents() {
    await ensureDB();
    const store = getStore(CALENDAR_STORE, 'readonly');
    return promisifyRequest(store.getAll());
}

/**
 * Retrieves all calendar events for a specific date (YYYY-MM-DD) using the 'date' index.
 * @param {string} dateStr
 * @returns {Promise<Array>}
 */
export async function getCalendarEventsByDate(dateStr) {
    await ensureDB();
    const store = getStore(CALENDAR_STORE, 'readonly');
    if (store.indexNames.contains('date')) {
        const index = store.index('date');
        return promisifyRequest(index.getAll(dateStr));
    }
    // Fallback if index not present
    const all = await promisifyRequest(store.getAll());
    return (all || []).filter(e => e.date === dateStr);
}

/**
 * Retrieves a single calendar event by ID.
 * @param {number|string} id
 * @returns {Promise<Object|undefined>}
 */
export async function getCalendarEventById(id) {
    await ensureDB();
    const store = getStore(CALENDAR_STORE, 'readonly');
    const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return promisifyRequest(store.get(parsedId));
}

/**
 * Adds a new calendar event (auto-increment ID).
 * @param {Object} eventData
 * @returns {Promise<number>} ID of newly created event
 */
export async function addCalendarEvent(eventData) {
    await ensureDB();
    const store = getStore(CALENDAR_STORE, 'readwrite');
    return promisifyRequest(store.add(eventData));
}

/**
 * Inserts or updates a calendar event.
 * @param {Object} eventData
 * @returns {Promise<any>}
 */
export async function putCalendarEvent(eventData) {
    await ensureDB();
    const store = getStore(CALENDAR_STORE, 'readwrite');
    return promisifyRequest(store.put(eventData));
}

/**
 * Deletes a calendar event by ID.
 * @param {number|string} id
 * @returns {Promise<void>}
 */
export async function deleteCalendarEvent(id) {
    await ensureDB();
    const store = getStore(CALENDAR_STORE, 'readwrite');
    const parsedId = typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id;
    return promisifyRequest(store.delete(parsedId));
}

/**
 * Deletes all calendar events for a specific course.
 * @param {string|number} courseId
 * @returns {Promise<void>}
 */
export async function deleteCalendarEventsForCourse(courseId) {
    const parsedId = parseCourseId(courseId);
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(CALENDAR_STORE, 'readwrite');
    const store = tx.objectStore(CALENDAR_STORE);
    
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
 * Bulk writes multiple calendar events.
 * @param {Array<Object>} events
 * @returns {Promise<void>}
 */
export async function bulkPutCalendarEvents(events) {
    if (!Array.isArray(events) || events.length === 0) return;
    await ensureDB();
    const db = await ensureDB();
    const tx = db.transaction(CALENDAR_STORE, 'readwrite');
    const store = tx.objectStore(CALENDAR_STORE);
    events.forEach(e => store.put(e));
    return promisifyTransaction(tx);
}

/**
 * Clears all calendar events.
 * @returns {Promise<void>}
 */
export async function clearAllCalendarEvents() {
    await ensureDB();
    const store = getStore(CALENDAR_STORE, 'readwrite');
    return promisifyRequest(store.clear());
}
