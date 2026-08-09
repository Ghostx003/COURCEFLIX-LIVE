// Utility Functions Service
// Extracted and modularized from legacy.js

export function formatTime(timeInSeconds, withHours = true) {
    const time = Math.round(timeInSeconds || 0);
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    if (hours > 0 && withHours) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDuration(seconds) {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export function formatTotalDuration(seconds) {
    if (isNaN(seconds) || seconds <= 0) return '0h';
    const totalMinutes = Math.floor(seconds / 60);
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes >= 40) {
        hours += 1;
    }
    return `${hours}h`;
}

export function formatExactTime(seconds) {
    if (isNaN(seconds) || seconds <= 0) return '0 hours 0 mins 0 secs';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
    if (mins > 0 || hrs > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);
    parts.push(`${secs} sec${secs !== 1 ? 's' : ''}`);
    return parts.join(' ');
}

export const naturalSort = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
export const naturalSortByNameOnly = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function getParentPath(path) {
    if (!path) return '';
    const parts = path.split('/');
    parts.pop();
    return parts.join('/');
}

export async function getVideoDuration(file) {
    return new Promise(resolve => {
        let url = null;
        try {
            url = URL.createObjectURL(file);
        } catch (e) {
            resolve(0);
            return;
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
            try { v.load(); } catch(e) {}
            if (url) {
                const urlToRevoke = url;
                url = null;
                setTimeout(() => {
                    try { URL.revokeObjectURL(urlToRevoke); } catch (e) {}
                }, 200);
            }
        };

        timeoutId = setTimeout(() => {
            cleanup();
            resolve(0);
        }, 2500);

        v.onloadedmetadata = () => {
            const duration = v.duration;
            cleanup();
            resolve(duration);
        };

        v.onerror = () => {
            cleanup();
            resolve(0);
        };

        v.src = url;
    });
}

export function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = isError ? 'var(--accent-danger)' : 'var(--accent-primary)';
    toast.style.color = 'white';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '2000';
    toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    const container = document.fullscreenElement || document.body;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 300); 
    }, 3000);
}

export function dateToStr(d) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${dy}`;
}

export function isToday(dateStr) {
    return dateStr === dateToStr(new Date());
}

export function isFuture(dateStr) {
    return dateStr > dateToStr(new Date());
}

export function formatCalendarDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function switchView(viewId, pushState = true) {
    const navEl = document.querySelector('nav');
    if (navEl) {
        if (viewId === 'player-view') {
            navEl.classList.add('hidden');
        } else {
            navEl.classList.remove('hidden');
        }
    }
    
    if (pushState && viewId !== 'subcourse-view' && viewId !== 'player-view') {
        const newHash = '#' + viewId;
        if (window.location.hash !== newHash) {
            try { window.history.pushState(null, '', newHash); } catch(e) {}
        }
    }

    const targetId = viewId === 'dashboard-view' ? 'dashboard-view-el' : viewId;
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === targetId));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === viewId));
    
    setTimeout(async () => {
        if (typeof window.ensureDB === 'function') await window.ensureDB();
        if (viewId === 'review-view' || viewId === 'practice-view') {
            if (typeof window.showFilteredCoursesView === 'function') window.showFilteredCoursesView(viewId.split('-')[0]);
        }
        if (viewId === 'dashboard-view' && typeof window.renderCourseGrid === 'function') window.renderCourseGrid();
        if (viewId === 'intell-view' && typeof window.renderIntellView === 'function') window.renderIntellView();
        if (viewId === 'upload-view' && typeof window.renderUploadView === 'function') window.renderUploadView();
        if (viewId === 'dpp-view' && typeof window.renderDppCourseSelectionView === 'function') window.renderDppCourseSelectionView();
        if (viewId === 'notes-view' && typeof window.renderNotesCourseSelectionView === 'function') window.renderNotesCourseSelectionView();
        if (viewId === 'doubts-view' && typeof window.renderDoubtsCourseSelectionView === 'function') window.renderDoubtsCourseSelectionView();
        if (viewId === 'continue-view' && typeof window.renderContinueView === 'function') window.renderContinueView();
        if (viewId === 'history-view' && typeof window.renderHistoryView === 'function') window.renderHistoryView();
        if (viewId === 'faculty-view' && typeof window.renderFacultyView === 'function') window.renderFacultyView();
    }, 10);
    
    if (viewId !== 'player-view') {
        if (pushState) {
            sessionStorage.removeItem('courseflixState');
        }
        const videoPlayer = document.getElementById('video-player');
        if (videoPlayer) videoPlayer.pause();
        const brownNoiseAudio = document.getElementById('brown-noise-audio');
        if (brownNoiseAudio) brownNoiseAudio.pause();
    }
}

// Bind utility functions to window for backwards compatibility with unmigrated legacy code
if (typeof window !== 'undefined') {
    window.formatTime = formatTime;
    window.formatDuration = formatDuration;
    window.formatTotalDuration = formatTotalDuration;
    window.formatExactTime = formatExactTime;
    window.naturalSort = naturalSort;
    window.naturalSortByNameOnly = naturalSortByNameOnly;
    window.getParentPath = getParentPath;
    window.getVideoDuration = getVideoDuration;
    window.showToast = showToast;
    window.dateToStr = dateToStr;
    window.isToday = isToday;
    window.isFuture = isFuture;
    window.formatCalendarDate = formatCalendarDate;
    window.switchView = switchView;
}
