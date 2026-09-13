/**
 * Pure Utility Functions for Subcourse and Hierarchical Folder Calculations
 * Zero DOM / FileSystem dependencies.
 */

/**
 * Natural alphabetical / alphanumeric sort for folder names.
 */
export const naturalSortByNameOnly = (a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/**
 * Returns the parent folder path given a slash-delimited path string.
 * @param {string} path - e.g. "GATE CS/Algorithms/Sorting"
 * @returns {string} - e.g. "GATE CS/Algorithms" (or "" for root)
 */
export function getParentPath(path) {
    if (!path) return '';
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
}

/**
 * Returns the display name for a subfolder (custom alias if edited, or the folder basename).
 * @param {Object} course
 * @param {string} subfolder
 * @returns {string}
 */
export function getSubfolderDisplayName(course, subfolder) {
    if (!subfolder) return '';
    if (course?.subCourseData?.[subfolder]?.customName) {
        return course.subCourseData[subfolder].customName;
    }
    return subfolder.split('/').pop();
}

/**
 * Resolves the faculty / teacher name for a subfolder, walking up ancestor folders if needed.
 * @param {Object} course
 * @param {string} fullPath
 * @returns {string}
 */
export function getSubfolderFacultyName(course, fullPath) {
    if (!course) return 'N/A Faculty';
    if (!fullPath) return course.facultyName || 'N/A Faculty';

    const parts = fullPath.split('/');
    for (let i = parts.length; i > 0; i--) {
        const currentPath = parts.slice(0, i).join('/');
        if (course.subCourseData?.[currentPath]?.facultyName) {
            return course.subCourseData[currentPath].facultyName;
        }
    }
    return course.facultyName || 'N/A Faculty';
}

/**
 * Checks whether a subfolder path has been deleted or marked hidden.
 * @param {Object} course
 * @param {string} subfolderPath
 * @returns {boolean}
 */
export function isSubfolderPathHidden(course, subfolderPath) {
    if (!course || !course.subCourseData || !subfolderPath) return false;

    const normSub = String(subfolderPath).toLowerCase().trim();
    for (const key of Object.keys(course.subCourseData)) {
        const item = course.subCourseData[key];
        if (item && item.hidden) {
            const normKey = String(key).toLowerCase().trim();
            if (
                normSub === normKey ||
                normSub.startsWith(normKey + '/')
            ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Extracts immediate direct child subdirectories sitting inside a given basePath.
 * @param {Array<Object>} chapters - Array of { name, lectures }
 * @param {string} basePath - Current folder path (e.g. "" or "Algorithms")
 * @returns {Array<string>} Array of full subfolder paths sorted naturally
 */
export function getImmediateSubfolders(chapters = [], basePath = '') {
    if (!Array.isArray(chapters)) return [];

    const relevantChapters = chapters.filter(ch =>
        basePath === '' ||
        (ch.name || '').startsWith(basePath + '/') ||
        (ch.name || '') === basePath
    );

    const immediateSubfoldersSet = new Set();
    relevantChapters.forEach(ch => {
        if (ch.name === basePath) return;
        const relativePath = basePath === '' ? ch.name : ch.name.substring(basePath.length + 1);
        if (!relativePath) return;
        const firstLevelFolder = relativePath.split('/')[0];
        const fullPath = basePath === '' ? firstLevelFolder : `${basePath}/${firstLevelFolder}`;
        immediateSubfoldersSet.add(fullPath);
    });

    return Array.from(immediateSubfoldersSet).sort(naturalSortByNameOnly);
}

/**
 * Checks whether a subfolder has deeper nested child folders.
 * @param {Array<Object>} chapters
 * @param {string} fullPath
 * @returns {boolean}
 */
export function hasDeeperSubfolders(chapters = [], fullPath = '') {
    if (!Array.isArray(chapters) || !fullPath) return false;
    return chapters.some(
        ch => (ch.name || '').startsWith(fullPath + '/') && (ch.name || '').length > fullPath.length + 1
    );
}

/**
 * Resolves thumbnail for a subfolder by checking subcourseData, ancestors, and course fallback.
 * @param {Object} course
 * @param {string} fullPath
 * @returns {string|null}
 */
export function resolveSubfolderThumbnail(course, fullPath) {
    if (!course) return null;
    const subData = course.subCourseData?.[fullPath];
    if (subData?.thumbnail) return subData.thumbnail;

    // Check ancestor folders
    if (fullPath && course.subCourseData) {
        const parts = fullPath.split('/');
        for (let i = parts.length - 1; i > 0; i--) {
            const parentPath = parts.slice(0, i).join('/');
            if (course.subCourseData[parentPath]?.thumbnail) {
                return course.subCourseData[parentPath].thumbnail;
            }
        }
    }

    return course.thumbnail || null;
}
