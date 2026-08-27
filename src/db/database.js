// Canonical IndexedDB Connection Layer for CourseFlix
// Single source of truth for CourseFlixDB connection and object stores.

export const DB_NAME = 'CourseFlixDB';
export const DB_VERSION = 13;
export const STORE_NAME = 'courses';
export const PROGRESS_STORE = 'progress';
export const DPP_STORE = 'dpps';
export const DOUBTS_STORE = 'doubts';
export const HISTORY_STORE = 'history';
export const CALENDAR_STORE = 'calendarEvents';

let db = null;
let dbPromise = null;

/**
 * Promisifies an IDBRequest to return a standard Promise.
 */
export function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error || new Error('IndexedDB request failed'));
    });
}

/**
 * Promisifies an IDBTransaction to resolve on completion.
 */
export function promisifyTransaction(tx) {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error || new Error('IndexedDB transaction failed'));
        tx.onabort = (e) => reject(e.target.error || new Error('IndexedDB transaction aborted'));
    });
}

/**
 * Opens or returns the existing IndexedDB connection.
 */
export function openDB() {
    if (db && typeof window !== 'undefined' && window.appDbInitialized) {
        return Promise.resolve(db);
    }
    if (typeof window !== 'undefined' && window.db && window.appDbInitialized) {
        db = window.db;
        return Promise.resolve(db);
    }
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (e) => {
            dbPromise = null;
            console.error('[CourseFlix DB] Error opening IndexedDB:', e);
            reject(new Error('Error opening IndexedDB'));
        };

        request.onsuccess = () => {
            db = request.result;
            if (typeof window !== 'undefined') {
                window.db = db;
                window.appDbInitialized = true;
            }

            db.onversionchange = () => {
                try {
                    db.close();
                } catch (err) {
                    console.warn('[CourseFlix DB] Error closing DB on version change:', err);
                }
                console.warn('[CourseFlix DB] Database upgrade requested by another tab. Closing connection.');
            };

            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const upgradeDb = event.target.result;
            if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
                upgradeDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!upgradeDb.objectStoreNames.contains(PROGRESS_STORE)) {
                upgradeDb.createObjectStore(PROGRESS_STORE, { keyPath: 'id' });
            }
            if (!upgradeDb.objectStoreNames.contains(DPP_STORE)) {
                upgradeDb.createObjectStore(DPP_STORE, { keyPath: 'id', autoIncrement: true });
            }
            if (!upgradeDb.objectStoreNames.contains(DOUBTS_STORE)) {
                upgradeDb.createObjectStore(DOUBTS_STORE, { keyPath: 'id', autoIncrement: true });
            }
            if (!upgradeDb.objectStoreNames.contains(HISTORY_STORE)) {
                upgradeDb.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
            }
            if (!upgradeDb.objectStoreNames.contains(CALENDAR_STORE)) {
                const calStore = upgradeDb.createObjectStore(CALENDAR_STORE, { keyPath: 'id', autoIncrement: true });
                calStore.createIndex('date', 'date', { unique: false });
            }
        };

        request.onblocked = (e) => {
            dbPromise = null;
            console.warn('[CourseFlix DB] IndexedDB connection blocked by another open tab.', e);
            if (typeof window !== 'undefined') {
                const shouldReload = confirm('Database connection is blocked by another open tab or page. Click OK to refresh and unblock the database.');
                if (shouldReload) {
                    window.location.reload();
                }
            }
        };
    });

    return dbPromise;
}

/**
 * Ensures the database is connected before executing operations.
 */
export async function ensureDB() {
    if (db) return db;
    if (typeof window !== 'undefined' && window.db) {
        db = window.db;
        return db;
    }
    db = await openDB();
    return db;
}

/**
 * Returns an IDBObjectStore for a specific store name and transaction mode.
 */
export function getStore(storeName, mode = 'readonly') {
    if (!db && typeof window !== 'undefined' && window.db) {
        db = window.db;
    }
    if (!db) {
        throw new Error(`[CourseFlix DB] Database not initialized yet when accessing store: ${storeName}`);
    }
    return db.transaction(storeName, mode).objectStore(storeName);
}

/**
 * Normalizes course IDs between string and numeric representation.
 */
export function parseCourseId(raw) {
    if (raw === null || raw === undefined) return raw;
    const str = String(raw).trim();
    if (str && !isNaN(parseInt(str, 10)) && String(parseInt(str, 10)) === str) {
        return parseInt(str, 10);
    }
    return raw;
}

/**
 * Closes the active database connection if open (for clean resets or tests).
 */
export function closeDB() {
    if (db) {
        try {
            db.close();
        } catch (err) {}
        db = null;
    }
    dbPromise = null;
    if (typeof window !== 'undefined') {
        window.db = null;
        window.appDbInitialized = false;
    }
}

// Bind to window for backwards compatibility with unmigrated legacy code
if (typeof window !== 'undefined') {
    window.DB_NAME = DB_NAME;
    window.DB_VERSION = DB_VERSION;
    window.STORE_NAME = STORE_NAME;
    window.PROGRESS_STORE = PROGRESS_STORE;
    window.DPP_STORE = DPP_STORE;
    window.DOUBTS_STORE = DOUBTS_STORE;
    window.HISTORY_STORE = HISTORY_STORE;
    window.CALENDAR_STORE = CALENDAR_STORE;
    window.openDB = openDB;
    window.ensureDB = ensureDB;
    window.getStore = getStore;
    window.parseCourseId = parseCourseId;
}
