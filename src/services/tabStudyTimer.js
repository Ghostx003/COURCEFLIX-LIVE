// Tab Study Timer Service
// Manages the tab count clock in the browser tab title (document.title).
// Displays hours:minutes:seconds (HH:MM:SS) studied in the current browser session.
// Persists in sessionStorage so it remains across page refreshes, and only resets
// when the browser tab is closed permanently.
// Ticks only when a lecture video is actively playing.

const STORAGE_KEY = 'courseflix_tab_study_seconds';

/**
 * Reads accumulated study seconds from sessionStorage.
 * @returns {number}
 */
export function getTabStudySeconds() {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return 0;
    try {
        const val = sessionStorage.getItem(STORAGE_KEY);
        const parsed = parseInt(val, 10);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    } catch {
        return 0;
    }
}

/**
 * Persists accumulated study seconds to sessionStorage.
 * @param {number} sec
 */
export function saveTabStudySeconds(sec) {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(STORAGE_KEY, Math.floor(sec).toString());
    } catch {}
}

/**
 * Formats seconds into HH:MM:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatStudyClock(totalSeconds) {
    const total = Math.max(0, Math.floor(totalSeconds || 0));
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

let activeStudySeconds = 0;
let lastTickTime = null;
let _timerInterval = null;
let isInitialized = false;

/**
 * Updates the browser tab title with the current study clock.
 */
export function updateTabTitle() {
    if (typeof document === 'undefined') return;
    const timeStr = formatStudyClock(activeStudySeconds);
    document.title = `CourseFlix • ${timeStr}`;
}

/**
 * Checks whether a lecture video is currently playing.
 * @returns {boolean}
 */
function isLectureVideoPlaying() {
    if (typeof document === 'undefined') return false;
    const video = document.getElementById('video-player');
    if (!video) return false;
    return !video.paused && !video.ended && video.readyState > 1 && video.currentTime > 0;
}

/**
 * Initializes the tab study clock service.
 */
export function initTabStudyTimer() {
    if (typeof window === 'undefined') return;
    if (isInitialized || window.__courseflixTabStudyTimerInitialized) {
        updateTabTitle();
        return;
    }
    isInitialized = true;
    window.__courseflixTabStudyTimerInitialized = true;

    // Load persisted study seconds for this tab session
    activeStudySeconds = getTabStudySeconds();
    updateTabTitle();

    // High-precision interval check (every 500ms) using real clock deltas
    _timerInterval = setInterval(() => {
        const isPlaying = isLectureVideoPlaying();
        const now = Date.now();

        if (isPlaying) {
            if (lastTickTime !== null) {
                const deltaMs = now - lastTickTime;
                const deltaSec = Math.floor(deltaMs / 1000);
                if (deltaSec >= 1) {
                    activeStudySeconds += deltaSec;
                    lastTickTime = now - (deltaMs % 1000);
                    saveTabStudySeconds(activeStudySeconds);
                    updateTabTitle();
                }
            } else {
                lastTickTime = now;
            }
        } else {
            lastTickTime = null;
        }
    }, 500);

    // Capture media playback events immediately
    document.addEventListener('play', (e) => {
        if (e.target && e.target.id === 'video-player') {
            lastTickTime = Date.now();
        }
    }, true);

    document.addEventListener('pause', (e) => {
        if (e.target && e.target.id === 'video-player') {
            lastTickTime = null;
            saveTabStudySeconds(activeStudySeconds);
            updateTabTitle();
        }
    }, true);

    document.addEventListener('ended', (e) => {
        if (e.target && e.target.id === 'video-player') {
            lastTickTime = null;
            saveTabStudySeconds(activeStudySeconds);
            updateTabTitle();
        }
    }, true);

    // Save on beforeunload just in case
    window.addEventListener('beforeunload', () => {
        saveTabStudySeconds(activeStudySeconds);
    });

    // Expose helpers globally
    window.getTabStudySeconds = getTabStudySeconds;
    window.formatStudyClock = formatStudyClock;
}

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
    initTabStudyTimer();
}
