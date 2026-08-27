/**
 * Player Lifecycle Service (Lightweight)
 * Isolates minimal player teardown & lifecycle operations needed for navigation
 * WITHOUT importing the heavy ~2,600-line playerService engine into the initial bundle.
 */

/**
 * Handles tearing down active playback when navigating away from the player.
 * @param {object} options - Options object ({ clearSession: boolean }).
 */
export function handleLeavingPlayer(options = { clearSession: true }) {
    if (typeof window === 'undefined') return;

    // 1. Reset custom lecture tracking state
    window.customLectureTracking = null;

    // 2. Clear player session state if requested
    if (options && options.clearSession) {
        try {
            sessionStorage.removeItem('courseflixState');
        } catch (e) {}
    }

    // 3. Pause video element if playing
    const videoEl = typeof document !== 'undefined'
        ? (document.getElementById('video-player') || window.videoPlayer)
        : null;

    if (videoEl && typeof videoEl.pause === 'function') {
        try {
            videoEl.pause();
        } catch (e) {}
    }

    // 4. Pause brown noise audio if playing
    const audioEl = typeof document !== 'undefined'
        ? (document.getElementById('brown-noise-audio') || window.brownNoiseAudio)
        : null;

    if (audioEl && typeof audioEl.pause === 'function') {
        try {
            audioEl.pause();
        } catch (e) {}
    }
}

// Bind to window for backwards compatibility with legacy callers
if (typeof window !== 'undefined') {
    window.handleLeavingPlayer = handleLeavingPlayer;
}
