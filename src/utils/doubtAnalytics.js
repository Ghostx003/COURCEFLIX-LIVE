/**
 * Pure Doubt Resolution Dashboard Analytics & Transformation Engine
 * Zero DOM, zero React, and zero IndexedDB dependencies.
 * Provides filtering, sorting, statistics, status transitions, and normalization for Courseflix doubts.
 */

export const DEFAULT_DOUBT_SUBJECTS = [
    'COA', 'CN', 'OS', 'DL', 'TOC', 'Maths', 'DM', 'Apti', 'Compiler', 'DBMS', 'C', 'DSA', 'Algo'
];

export const DOUBT_STATUSES = ['Unsolved', 'Solved', 'Doubt', 'Error'];

/**
 * Returns the next status in the cyclic status transition.
 * @param {string} currentStatus
 * @returns {string}
 */
export function getNextDoubtStatus(currentStatus = 'Unsolved') {
    const idx = DOUBT_STATUSES.indexOf(currentStatus);
    if (idx === -1) return DOUBT_STATUSES[0];
    return DOUBT_STATUSES[(idx + 1) % DOUBT_STATUSES.length];
}

/**
 * Filters and sorts doubts matching legacy progress.html logic.
 * Unsolved/Doubt/Error are grouped first, Solved are grouped last.
 * Within each group, items are sorted newest first.
 * @param {Array<Object>} doubts
 * @param {string} [searchTerm='']
 * @param {string} [selectedSubject='all']
 * @returns {Array<Object>}
 */
export function filterAndSortDoubts(doubts = [], searchTerm = '', selectedSubject = 'all') {
    if (!Array.isArray(doubts) || doubts.length === 0) return [];

    const term = (searchTerm || '').trim().toLowerCase();

    return doubts
        .filter(d => {
            if (!d) return false;
            
            // Subject filter
            const matchSubject = selectedSubject === 'all' || d.subject === selectedSubject;
            if (!matchSubject) return false;

            // Search term filter
            if (!term) return true;

            const titleMatch = d.title && d.title.toLowerCase().includes(term);
            const contentMatch = Array.isArray(d.editors) && d.editors.some(e => {
                const eTitle = e && e.title ? e.title.toLowerCase() : '';
                const eContent = e && e.content ? e.content.toLowerCase() : '';
                return eTitle.includes(term) || eContent.includes(term);
            });

            return titleMatch || contentMatch;
        })
        .sort((a, b) => {
            const aIsSolved = a.status === 'Solved';
            const bIsSolved = b.status === 'Solved';
            if (aIsSolved !== bIsSolved) {
                return aIsSolved ? 1 : -1; // Unsolved first, Solved last
            }
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA; // Newest first
        });
}

/**
 * Computes high-level statistics for doubt analytics.
 * @param {Array<Object>} doubts
 * @returns {{
 *   total: number,
 *   solved: number,
 *   unsolved: number,
 *   doubt: number,
 *   error: number,
 *   resolutionRate: number,
 *   bySubject: Record<string, number>
 * }}
 */
export function calculateDoubtStats(doubts = []) {
    if (!Array.isArray(doubts) || doubts.length === 0) {
        return {
            total: 0,
            solved: 0,
            unsolved: 0,
            doubt: 0,
            error: 0,
            resolutionRate: 0,
            bySubject: {}
        };
    }

    let solved = 0;
    let unsolved = 0;
    let doubt = 0;
    let error = 0;
    const bySubject = {};

    doubts.forEach(d => {
        if (!d) return;
        const status = d.status || 'Unsolved';
        if (status === 'Solved') solved++;
        else if (status === 'Doubt') doubt++;
        else if (status === 'Error') error++;
        else unsolved++;

        const subj = d.subject || 'General';
        bySubject[subj] = (bySubject[subj] || 0) + 1;
    });

    const total = doubts.length;
    const resolutionRate = total > 0 ? Math.round((solved / total) * 100) : 0;

    return {
        total,
        solved,
        unsolved,
        doubt,
        error,
        resolutionRate,
        bySubject
    };
}

/**
 * Combines and cleans unique doubt subjects.
 * Filters out old legacy numeric IDs (> 10 digits).
 * @param {Array<Object>} doubts
 * @param {Array<string>} [customSubjects=[]]
 * @param {Array<Object>} [courses=[]]
 * @returns {Array<string>}
 */
export function extractUniqueDoubtSubjects(doubts = [], customSubjects = [], courses = []) {
    const rawCourseNames = (courses || []).map(c => c.title || c.name || '').filter(Boolean);
    const rawDoubtSubjects = (doubts || []).map(d => d.subject || '').filter(Boolean);
    const rawCustom = Array.isArray(customSubjects) ? customSubjects : [];

    const combined = [...new Set([...DEFAULT_DOUBT_SUBJECTS, ...rawCustom, ...rawDoubtSubjects, ...rawCourseNames])];

    return combined
        .filter(s => typeof s === 'string' && s.trim().length > 0 && !/^\d{10,}$/.test(s))
        .sort((a, b) => a.localeCompare(b));
}

/**
 * Creates a clean default doubt object.
 * @param {string} title
 * @param {string} subject
 * @param {string} [status='Unsolved']
 * @param {Object|null} [metadata=null]
 * @returns {Object}
 */
export function createDefaultDoubt(title, subject, status = 'Unsolved', metadata = null) {
    return {
        id: Date.now(),
        title: (title || '').trim(),
        subject: subject || 'General',
        status: status || 'Unsolved',
        createdAt: new Date().toISOString(),
        metadata: metadata || null,
        editors: [
            { title: 'Question', content: '' },
            { title: 'Solution', content: '' }
        ]
    };
}

/**
 * Formats a doubt timestamp into a human-readable localized string.
 * @param {string|number|Date} dateVal
 * @returns {string}
 */
export function formatDoubtDate(dateVal) {
    if (!dateVal) return 'Unknown date';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Invalid date';

    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
