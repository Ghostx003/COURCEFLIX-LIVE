// Bookmarks & Timeline Service
// Extracted and modularized from legacy.js

import { saveLectureProgress, getLectureProgress } from './progressService.js';
import { showToast, formatTime } from './utils.js';

if (typeof window !== 'undefined') {
    window.savedTimelinePosition = null;
    window.isBookmarkCyclingSession = false;
}

export function getActiveLectureId() {
    if (typeof window !== 'undefined') {
        if (window.currentActiveLectureId) return window.currentActiveLectureId;
        if (window.currentLectureId) return window.currentLectureId;
    }
    const currentLectureLi = typeof window !== 'undefined' ? window.currentLectureLi : null;
    if (currentLectureLi && currentLectureLi.dataset && currentLectureLi.dataset.lectureId) {
        return currentLectureLi.dataset.lectureId;
    }
    if (typeof document !== 'undefined') {
        const activeLi = document.querySelector('#chapter-list li.active, .lecture-item.active');
        if (activeLi && activeLi.dataset && activeLi.dataset.lectureId) {
            return activeLi.dataset.lectureId;
        }
    }
    const course = typeof window !== 'undefined' ? window.currentCourse : null;
    if (course && course.lastPlayedLecture && course.lastPlayedLecture.lectureId) {
        return course.lastPlayedLecture.lectureId;
    }
    return null;
}

export function renderBookmarks() {
    const bookmarksContainer = document.getElementById('bookmarks-container');
    const currentCourse = typeof window !== 'undefined' ? window.currentCourse : null;
    const lectureId = getActiveLectureId();
    const videoPlayer = document.getElementById('video-player') || (typeof window !== 'undefined' ? window.videoPlayer : null);

    if (!bookmarksContainer || !currentCourse || !lectureId || !videoPlayer || isNaN(videoPlayer.duration) || !videoPlayer.duration) return;

    bookmarksContainer.innerHTML = '';
    const progress = getLectureProgress(currentCourse.id, lectureId);
    const bookmarks = progress.bookmarks || [];

    bookmarks.forEach(time => {
        const dot = document.createElement('div');
        dot.className = 'bookmark-dot';
        dot.style.left = `${(time / videoPlayer.duration) * 100}%`;
        dot.title = `Bookmark at ${formatTime(time)}`;
        dot.innerHTML = '<i class="fa-solid fa-flag"></i>';
        let hoverTimeout;
        dot.onmouseenter = () => {
            hoverTimeout = setTimeout(() => {
                dot.innerHTML = '<i class="fa-solid fa-trash" style="color: var(--accent-danger);"></i>';
                dot.dataset.deletable = 'true';
                dot.title = "Click to remove bookmark";
            }, 2000);
        };
        dot.onmouseleave = () => {
            clearTimeout(hoverTimeout);
            dot.innerHTML = '<i class="fa-solid fa-flag"></i>';
            dot.dataset.deletable = 'false';
            dot.title = `Bookmark at ${formatTime(time)}`;
        };
        dot.onclick = async (e) => {
            e.stopPropagation();
            if (dot.dataset.deletable === 'true') {
                const newBookmarks = bookmarks.filter(b => b !== time);
                await saveLectureProgress({ ...progress, courseId: currentCourse.id, lectureId, bookmarks: newBookmarks });
                renderBookmarks();
                showToast('Bookmark removed');
            } else {
                videoPlayer.currentTime = time;
            }
        };
                bookmarksContainer.appendChild(dot);
            });

            // Populate Bookmarks Popover List
            const popoverList = document.getElementById('bookmarks-popover-list');
            if (popoverList) {
                popoverList.innerHTML = '';
                if (bookmarks.length === 0) {
                    popoverList.innerHTML = '<div style="font-size:0.8rem;color:var(--text-secondary);text-align:center;padding:10px 0;">No bookmarks saved yet. Press Z to add!</div>';
                } else {
                    bookmarks.forEach(time => {
                        const item = document.createElement('div');
                        item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:var(--bg-tertiary);border-radius:6px;font-size:0.82rem;border:1px solid var(--border-secondary);';
                        item.innerHTML = `
                            <span class="bookmark-time-link" style="color:var(--accent-primary);cursor:pointer;font-weight:600;display:flex;align-items:center;gap:6px;">
                                <i class="fas fa-play" style="font-size:0.7rem;"></i> ${formatTime(time)}
                            </span>
                            <button class="delete-bookmark-item-btn" style="background:none;border:none;color:var(--accent-danger);cursor:pointer;font-size:0.85rem;padding:2px 4px;" title="Remove bookmark"><i class="fas fa-trash"></i></button>
                        `;
                        item.querySelector('.bookmark-time-link').onclick = (e) => {
                            e.stopPropagation();
                            videoPlayer.currentTime = time;
                            showToast(`Jumped to bookmark: ${formatTime(time)}`);
                        };
                        item.querySelector('.delete-bookmark-item-btn').onclick = async (e) => {
                            e.stopPropagation();
                            const newBookmarks = bookmarks.filter(b => b !== time);
                            await saveLectureProgress({ ...progress, courseId: currentCourse.id, lectureId, bookmarks: newBookmarks });
                            renderBookmarks();
                            showToast('Bookmark removed');
                        };
                        popoverList.appendChild(item);
                    });
                }
            }
        }

        export async function addBookmark() {
            const currentCourse = typeof window !== 'undefined' ? window.currentCourse : null;
            const lectureId = getActiveLectureId();
            const videoPlayer = document.getElementById('video-player') || (typeof window !== 'undefined' ? window.videoPlayer : null);

            if (!currentCourse || !lectureId || !videoPlayer) return;
            const progress = getLectureProgress(currentCourse.id, lectureId);
            const bookmarks = progress.bookmarks || [];
            const currentTime = videoPlayer.currentTime;

            if (!bookmarks.some(b => Math.abs(b - currentTime) < 1)) { // Avoid duplicate bookmarks
                bookmarks.push(currentTime);
                bookmarks.sort((a, b) => a - b);
                await saveLectureProgress({ ...progress, courseId: currentCourse.id, lectureId, bookmarks });
                renderBookmarks();
                showToast(`Bookmark added at ${formatTime(currentTime)}`);
            } else {
                showToast(`Bookmark already exists at ${formatTime(currentTime)}`);
            }
        }

export function cycleBookmarks() {
    const currentCourse = typeof window !== 'undefined' ? window.currentCourse : null;
    const lectureId = getActiveLectureId();
    const videoPlayer = document.getElementById('video-player') || (typeof window !== 'undefined' ? window.videoPlayer : null);

    if (!currentCourse || !lectureId || !videoPlayer) return;
    const progress = getLectureProgress(currentCourse.id, lectureId);
    const bookmarks = progress.bookmarks || [];

    if (bookmarks.length === 0) {
        return showToast('No bookmarks saved for this lecture.');
    }

    const curr = videoPlayer.currentTime;

    if (!window.isBookmarkCyclingSession) {
        window.savedTimelinePosition = curr;
        window.isBookmarkCyclingSession = true;
    }

    let nextIdx = bookmarks.findIndex(b => b > curr + 1.5);
    if (nextIdx === -1) nextIdx = 0;

    const targetTime = bookmarks[nextIdx];
    videoPlayer.currentTime = targetTime;
    showToast(`Bookmark ${nextIdx + 1}/${bookmarks.length}: ${formatTime(targetTime)}`);
}

export function jumpToPresentTimeline() {
    const videoPlayer = document.getElementById('video-player') || (typeof window !== 'undefined' ? window.videoPlayer : null);
    if (!videoPlayer) return;

    let targetTime = window.savedTimelinePosition;
    if (targetTime === null || targetTime === undefined) {
        showToast(`Already on main timeline (${formatTime(videoPlayer.currentTime)})`);
        return;
    }

    videoPlayer.currentTime = targetTime;
    showToast(`Returned to main timeline (${formatTime(targetTime)})`);
    window.savedTimelinePosition = null;
    window.isBookmarkCyclingSession = false;
}

export async function clearCurrentVideoBookmarks() {
    const currentCourse = typeof window !== 'undefined' ? window.currentCourse : null;
    const lectureId = getActiveLectureId();
    if (!currentCourse || !lectureId) return;
    if (confirm('Are you sure you want to clear all bookmarks for this video?')) {
        const progress = getLectureProgress(currentCourse.id, lectureId);
        await saveLectureProgress({ ...progress, courseId: currentCourse.id, lectureId, bookmarks: [] });
        renderBookmarks();
        showToast('Bookmarks cleared for this video.');
    }
}

export async function clearCourseBookmarks(course = window.currentCourse) {
    if (!course) return;
    if (confirm(`Are you sure you want to clear ALL bookmarks for the course "${course.title}"? This cannot be undone.`)) {
        for (const lecture of (course.lectures || [])) {
            const progress = getLectureProgress(course.id, lecture.id);
            if (progress.bookmarks && progress.bookmarks.length > 0) {
                progress.bookmarks = [];
                await saveLectureProgress(progress);
            }
        }
        renderBookmarks();
        showToast(`All bookmarks for "${course.title}" have been cleared.`);
    }
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.renderBookmarks = renderBookmarks;
    window.addBookmark = addBookmark;
    window.cycleBookmarks = cycleBookmarks;
    window.jumpToPresentTimeline = jumpToPresentTimeline;
    window.clearCurrentVideoBookmarks = clearCurrentVideoBookmarks;
    window.clearCourseBookmarks = clearCourseBookmarks;
}
