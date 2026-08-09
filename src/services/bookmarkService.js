// Bookmarks & Timeline Service
// Extracted and modularized from legacy.js

import { saveLectureProgress, getLectureProgress } from './progressService.js';
import { showToast, formatTime } from './utils.js';

if (typeof window !== 'undefined') {
    window.savedTimelinePosition = null;
    window.isBookmarkCyclingSession = false;
}

export function renderBookmarks() {
    const bookmarksContainer = document.getElementById('bookmarks-container');
    const currentCourse = window.currentCourse;
    const currentLectureLi = window.currentLectureLi;
    const videoPlayer = document.getElementById('video-player') || window.videoPlayer;

    if (!bookmarksContainer || !currentCourse || !currentLectureLi || !videoPlayer || isNaN(videoPlayer.duration)) return;

    bookmarksContainer.innerHTML = '';
    const lectureId = currentLectureLi.dataset.lectureId;
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
}

export async function addBookmark() {
    const currentCourse = window.currentCourse;
    const currentLectureLi = window.currentLectureLi;
    const videoPlayer = document.getElementById('video-player') || window.videoPlayer;

    if (!currentCourse || !currentLectureLi || !videoPlayer || videoPlayer.seeking) return;
    const lectureId = currentLectureLi.dataset.lectureId;
    const progress = getLectureProgress(currentCourse.id, lectureId);
    const bookmarks = progress.bookmarks || [];
    const currentTime = videoPlayer.currentTime;

    if (!bookmarks.some(b => Math.abs(b - currentTime) < 1)) { // Avoid duplicate bookmarks
        bookmarks.push(currentTime);
        bookmarks.sort((a, b) => a - b);
        await saveLectureProgress({ ...progress, courseId: currentCourse.id, lectureId, bookmarks });
        renderBookmarks();
        showToast(`Bookmark added at ${formatTime(currentTime)}`);
    }
}

export function cycleBookmarks() {
    const currentCourse = window.currentCourse;
    const currentLectureLi = window.currentLectureLi;
    const videoPlayer = document.getElementById('video-player') || window.videoPlayer;

    if (!currentCourse || !currentLectureLi || !videoPlayer) return;
    const lectureId = currentLectureLi.dataset.lectureId;
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
    const videoPlayer = document.getElementById('video-player') || window.videoPlayer;
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
    const currentCourse = window.currentCourse;
    const currentLectureLi = window.currentLectureLi;
    if (!currentCourse || !currentLectureLi) return;
    if (confirm('Are you sure you want to clear all bookmarks for this video?')) {
        const lectureId = currentLectureLi.dataset.lectureId;
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
