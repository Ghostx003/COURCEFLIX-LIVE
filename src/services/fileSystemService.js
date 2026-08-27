// FileSystem Service
// Pure File System Access API abstraction for CourseFlix.
// Owns directory pickers, permission checks, directory tree enumeration, file reading, and media duration extraction.
// Zero UI/DOM manipulation; zero direct database writes.

/**
 * Natural alphabetical + numeric sort comparator for file and folder entry names.
 * @param {{ name: string }} a
 * @param {{ name: string }} b
 * @returns {number}
 */
export const naturalSort = (a, b) => (a?.name || '').localeCompare(b?.name || '', undefined, { numeric: true, sensitivity: 'base' });

/**
 * Supported video & audio extensions recognized as playable lectures in CourseFlix.
 */
export const SUPPORTED_VIDEO_EXTENSIONS = /\.(mp4|mkv|webm|mov|avi|m4v|ts|flv|wmv|3gp|ogv|mp3|m4a|aac)$/i;

/**
 * Supported document / note extensions recognized in CourseFlix.
 */
export const SUPPORTED_DOC_EXTENSIONS = /\.(pdf|epub)$/i;

/**
 * Checks whether the browser supports the File System Access API.
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Checks if read permission is already granted on a file or directory handle without prompting the user.
 * @param {FileSystemHandle} handle
 * @returns {Promise<boolean>}
 */
export async function queryReadPermission(handle) {
    if (!handle || typeof handle.queryPermission !== 'function') return false;
    try {
        const state = await handle.queryPermission({ mode: 'read' });
        return state === 'granted';
    } catch (e) {
        console.warn('[fileSystemService] Error querying read permission:', e);
        return false;
    }
}

/**
 * Prompts the user for read permission on a handle if not already granted.
 * MUST be called within a user gesture event handler.
 * @param {FileSystemHandle} handle
 * @returns {Promise<boolean>}
 */
export async function requestReadPermission(handle) {
    if (!handle || typeof handle.requestPermission !== 'function') return false;
    try {
        const state = await handle.requestPermission({ mode: 'read' });
        return state === 'granted';
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.warn('[fileSystemService] Error requesting read permission:', e);
        }
        return false;
    }
}

/**
 * Verifies read permission on a handle: checks existing permission first, and only prompts if needed.
 * @param {FileSystemHandle} handle
 * @param {boolean} [promptIfDenied=true]
 * @returns {Promise<boolean>}
 */
export async function verifyPermission(handle, promptIfDenied = true) {
    if (!handle) return false;
    if (await queryReadPermission(handle)) {
        return true;
    }
    if (promptIfDenied) {
        return await requestReadPermission(handle);
    }
    return false;
}

/**
 * Prompts user to select a local directory using the File System Access API.
 * @param {Object} [options={}]
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function pickDirectory(options = {}) {
    if (!isFileSystemAccessSupported()) {
        throw new Error('File System Access API is not supported in this browser.');
    }
    try {
        const dirHandle = await window.showDirectoryPicker(options);
        return dirHandle;
    } catch (e) {
        if (e.name === 'AbortError') {
            // User cancelled picker
            return null;
        }
        throw e;
    }
}

/**
 * Prompts user to select one or more local files.
 * @param {Object} [options={}]
 * @returns {Promise<Array<FileSystemFileHandle>>}
 */
export async function pickFiles(options = {}) {
    if (typeof window === 'undefined' || !('showOpenFilePicker' in window)) {
        throw new Error('File System Open File API is not supported in this browser.');
    }
    try {
        const fileHandles = await window.showOpenFilePicker(options);
        return fileHandles || [];
    } catch (e) {
        if (e.name === 'AbortError') {
            return [];
        }
        throw e;
    }
}

/**
 * Reads a File object from a FileSystemFileHandle.
 * @param {FileSystemFileHandle} fileHandle
 * @returns {Promise<File|null>}
 */
export async function getFileFromHandle(fileHandle) {
    if (!fileHandle) return null;
    if (typeof fileHandle.getFile === 'function') {
        return await fileHandle.getFile();
    }
    // If passed an entry wrapper with .file() (e.g. webkitdirectory / drop)
    if (typeof fileHandle.file === 'function') {
        return new Promise((resolve, reject) => fileHandle.file(resolve, reject));
    }
    // If it is already a File object
    if (fileHandle instanceof File || fileHandle instanceof Blob) {
        return fileHandle;
    }
    return null;
}

/**
 * Creates a temporary object URL for a File or Blob.
 * @param {File|Blob} fileOrBlob
 * @returns {string|null}
 */
export function createMediaUrl(fileOrBlob) {
    if (!fileOrBlob) return null;
    try {
        return URL.createObjectURL(fileOrBlob);
    } catch (e) {
        console.warn('[fileSystemService] Error creating object URL:', e);
        return null;
    }
}

/**
 * Safely revokes an object URL.
 * @param {string|null} url
 */
export function revokeMediaUrl(url) {
    if (!url || typeof url !== 'string') return;
    try {
        URL.revokeObjectURL(url);
    } catch (e) {
        // Ignore revocation errors
    }
}

/**
 * Measures the duration in seconds of a video/audio File or Blob using an offscreen video element.
 * Properly cleans up object URLs and handles timeout fallback.
 * @param {File|Blob} file
 * @param {number} [timeoutMs=2500]
 * @returns {Promise<number>} Duration in seconds (0 on failure/timeout)
 */
export async function getVideoDuration(file, timeoutMs = 2500) {
    if (!file || typeof document === 'undefined') return 0;

    return new Promise(resolve => {
        let url = null;
        try {
            url = createMediaUrl(file);
            if (!url) return resolve(0);
        } catch (e) {
            return resolve(0);
        }

        const v = document.createElement('video');
        v.preload = 'metadata';
        let isResolved = false;
        let timeoutId = null;

        const cleanup = () => {
            if (isResolved) return;
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            v.onloadedmetadata = null;
            v.onerror = null;
            v.removeAttribute('src');
            try { v.load(); } catch (e) {}
            if (url) {
                const urlToRevoke = url;
                url = null;
                setTimeout(() => revokeMediaUrl(urlToRevoke), 200);
            }
        };

        timeoutId = setTimeout(() => {
            cleanup();
            resolve(0);
        }, timeoutMs);

        v.onloadedmetadata = () => {
            const dur = v.duration;
            cleanup();
            resolve(dur && !isNaN(dur) && isFinite(dur) ? dur : 0);
        };

        v.onerror = () => {
            cleanup();
            resolve(0);
        };

        v.src = url;
    });
}

/**
 * Reads all entries (files and subdirectories) inside a single directory handle.
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<Array<FileSystemHandle>>}
 */
export async function readDirectoryEntries(dirHandle) {
    if (!dirHandle || typeof dirHandle.values !== 'function') return [];
    const entries = [];
    try {
        for await (const entry of dirHandle.values()) {
            entries.push(entry);
        }
        entries.sort(naturalSort);
    } catch (e) {
        console.warn(`[fileSystemService] Error reading directory entries for ${dirHandle.name}:`, e);
    }
    return entries;
}

/**
 * Recursively scans a directory handle, discovering playable media files, organizing them into
 * chapter groups, and extracting duration metadata (leveraging cachedLectures if present).
 *
 * @param {FileSystemDirectoryHandle} dirHandle
 * @param {Object} [options={}]
 * @param {string} [options.basePath=''] Base path prefix for chapters
 * @param {Array<Object>} [options.cachedLectures=[]] Previously scanned lectures for fast duration reuse
 * @param {boolean} [options.fastPass=false] If true, skip measuring new file durations to optimize speed
 * @returns {Promise<{ chapters: Array<Object>, videoCount: number, lectures: Array<Object>, totalDuration: number, hasInaccessibleFiles: boolean }>}
 */
export async function scanDirectoryTree(dirHandle, options = {}) {
    const {
        basePath = '',
        cachedLectures = [],
        fastPass = false
    } = options;

    const chapters = {};
    const lectures = [];
    let totalDuration = 0;
    let hasInaccessibleFiles = false;

    async function recurse(currentHandle, path) {
        const chapterName = path || (basePath ? basePath : 'Main Content');
        if (!chapters[chapterName]) {
            chapters[chapterName] = { name: chapterName, lectures: [] };
        }

        const entries = await readDirectoryEntries(currentHandle);

        for (const entry of entries) {
            if (entry.kind === 'file' && SUPPORTED_VIDEO_EXTENSIONS.test(entry.name)) {
                try {
                    const file = await getFileFromHandle(entry);
                    if (!file) continue;

                    const id = `${entry.name}_${file.size}_${file.lastModified}`;
                    let duration = 0;

                    const cached = (cachedLectures || []).find(l => l.id === id);
                    if (cached && cached.duration) {
                        duration = cached.duration;
                    } else if (!fastPass) {
                        duration = await getVideoDuration(file);
                    }

                    const lectureData = {
                        id,
                        name: entry.name.replace(/\.[^/.]+$/, ''),
                        displayName: cached && cached.displayName ? cached.displayName : entry.name.replace(/\.[^/.]+$/, ''),
                        handle: entry,
                        duration,
                        chapter: chapterName
                    };

                    chapters[chapterName].lectures.push(lectureData);
                    lectures.push(lectureData);
                    totalDuration += duration;
                } catch (e) {
                    console.error(`[fileSystemService] Could not process file ${entry.name}:`, e);
                    if (e.name === 'NotFoundError' || e.name === 'NotReadableError' || e.name === 'NotAllowedError') {
                        hasInaccessibleFiles = true;
                    }
                }
            } else if (entry.kind === 'directory') {
                const nextPath = path ? `${path}/${entry.name}` : (basePath ? `${basePath}/${entry.name}` : entry.name);
                await recurse(entry, nextPath);
            }
        }
    }

    await recurse(dirHandle, basePath);
    const sortedChapters = Object.values(chapters).filter(ch => ch.lectures.length > 0).sort(naturalSort);

    return {
        chapters: sortedChapters,
        videoCount: lectures.length,
        lectures,
        totalDuration,
        hasInaccessibleFiles
    };
}

// Bind to window for backward compatibility with unmigrated legacy views
if (typeof window !== 'undefined') {
    window.fileSystemService = {
        isFileSystemAccessSupported,
        queryReadPermission,
        requestReadPermission,
        verifyPermission,
        pickDirectory,
        pickFiles,
        getFileFromHandle,
        createMediaUrl,
        revokeMediaUrl,
        getVideoDuration,
        readDirectoryEntries,
        scanDirectoryTree,
        naturalSort,
        SUPPORTED_VIDEO_EXTENSIONS,
        SUPPORTED_DOC_EXTENSIONS
    };
    window.getVideoDuration = getVideoDuration;
    window.scanDirectoryTree = scanDirectoryTree;
    window.verifyPermission = verifyPermission;
}
