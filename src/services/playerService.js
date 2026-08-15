// Video Player Engine, Subtitle Renderer & Playback Controls
// Extracted and modularized from legacy_origin.js (Lines 2507 to 4750 - ~2,240 lines)

import { ensureDB, getStore, STORE_NAME, PROGRESS_STORE } from './db.js';
import { saveLectureProgress, getLectureProgress } from './progressService.js';
import { formatTime, showToast } from './utils.js';

// Dynamic Window Function Delegation Proxies
const switchView = (...args) => typeof window !== 'undefined' && typeof window.switchView === 'function' ? window.switchView(...args) : null;
const renderSubcourseView = (...args) => typeof window !== 'undefined' && typeof window.renderSubcourseView === 'function' ? window.renderSubcourseView(...args) : null;
const renderCourseGrid = (...args) => typeof window !== 'undefined' && typeof window.renderCourseGrid === 'function' ? window.renderCourseGrid(...args) : null;
const renderHistoryView = (...args) => typeof window !== 'undefined' && typeof window.renderHistoryView === 'function' ? window.renderHistoryView(...args) : null;
const renderNotesCourseSelectionView = (...args) => typeof window !== 'undefined' && typeof window.renderNotesCourseSelectionView === 'function' ? window.renderNotesCourseSelectionView(...args) : null;


// Safe Global State Proxy Getters — Initialize window globals
if (typeof window !== 'undefined') {
    if (typeof window.currentCourse === 'undefined') window.currentCourse = null;
    if (typeof window.currentLectureLi === 'undefined') window.currentLectureLi = null;
    if (typeof window.currentSubfolder === 'undefined') window.currentSubfolder = null;
    if (typeof window.lastView === 'undefined') window.lastView = 'dashboard-view';
    if (typeof window.isGoalsMode === 'undefined') window.isGoalsMode = false;
    if (typeof window.isCalendarMode === 'undefined') window.isCalendarMode = false;
    if (typeof window.currentGoalsLectures === 'undefined') window.currentGoalsLectures = [];
    if (typeof window.currentCalendarLectures === 'undefined') window.currentCalendarLectures = [];
}

// Module-level mutable state (mirrors window.* for use inside functions)
let _currentCourse = null;
let _currentLectureLi = null;
let _currentSubfolder = null;
let _lastView = 'dashboard-view';
let _isGoalsMode = false;
let _isCalendarMode = false;
let _currentGoalsLectures = [];
let _currentCalendarLectures = [];

// Transparent aliases without recursive getter loops
Object.defineProperties(globalThis, {
    currentCourse: { get() { return _currentCourse !== null ? _currentCourse : (typeof window !== 'undefined' ? window._currentCourse : null); }, set(v) { _currentCourse = v; if (typeof window !== 'undefined') window._currentCourse = v; }, configurable: true },
    currentLectureLi: { get() { return _currentLectureLi !== null ? _currentLectureLi : (typeof window !== 'undefined' ? window._currentLectureLi : null); }, set(v) { _currentLectureLi = v; if (typeof window !== 'undefined') window._currentLectureLi = v; }, configurable: true },
    currentSubfolder: { get() { return _currentSubfolder !== null ? _currentSubfolder : (typeof window !== 'undefined' ? window._currentSubfolder : null); }, set(v) { _currentSubfolder = v; if (typeof window !== 'undefined') window._currentSubfolder = v; }, configurable: true },
    lastView: { get() { return _lastView; }, set(v) { _lastView = v; if (typeof window !== 'undefined') window._lastView = v; }, configurable: true },
    isGoalsMode: { get() { return _isGoalsMode; }, set(v) { _isGoalsMode = v; if (typeof window !== 'undefined') window._isGoalsMode = v; }, configurable: true },
    isCalendarMode: { get() { return _isCalendarMode; }, set(v) { _isCalendarMode = v; if (typeof window !== 'undefined') window._isCalendarMode = v; }, configurable: true },
    currentGoalsLectures: { get() { return _currentGoalsLectures; }, set(v) { _currentGoalsLectures = v; if (typeof window !== 'undefined') window._currentGoalsLectures = v; }, configurable: true },
    currentCalendarLectures: { get() { return _currentCalendarLectures; }, set(v) { _currentCalendarLectures = v; }, configurable: true },
    videoPlayer: { get() { return typeof document !== 'undefined' ? document.getElementById('video-player') : null; }, configurable: true },
    lectureMenu: { get() { return typeof document !== 'undefined' ? document.getElementById('lecture-menu') : null; }, configurable: true },
    sidebarToggleBtn: { get() { return typeof document !== 'undefined' ? document.getElementById('sidebar-toggle-btn') : null; }, configurable: true },
    playerNotesSidebar: { get() { return typeof document !== 'undefined' ? document.getElementById('player-notes-sidebar') : null; }, configurable: true },
});

        // --- Player ---
        function updateMenuProgress(subfolder = null) {
            let lectures = [];
            
            if (isGoalsMode && typeof currentGoalsLectures !== 'undefined') {
                lectures = currentGoalsLectures;
            } else if (isCalendarMode && typeof currentCalendarLectures !== 'undefined') {
                lectures = currentCalendarLectures;
            } else {
                if (!currentCourse) return;
                lectures = currentCourse.lectures || [];
                if (subfolder) {
                    lectures = lectures.filter(l => l.chapter === subfolder || l.chapter.startsWith(subfolder + '/'));
                }
            }

            let completed = 0;
            let timeCompleted = 0;
            let totalDuration = 0;

            lectures.forEach(lecture => {
                totalDuration += lecture.duration || 0;
                const actualCourseId = lecture.overrideCourseId || (currentCourse ? currentCourse.id : null);
                if (actualCourseId) {
                    const prog = getLectureProgress(actualCourseId, lecture.id);
                    if (prog && prog.completed) {
                        completed++;
                        timeCompleted += lecture.duration || 0;
                    }
                }
            });

            const percentage = lectures.length > 0 ? (completed / lectures.length) * 100 : 0;
            const remainingDuration = Math.max(0, totalDuration - timeCompleted);

            const container = document.querySelector('#player-view .menu-header');
            container.querySelector('.course-stats').textContent = `${formatDuration(totalDuration)} total ΓÇó ${formatDuration(remainingDuration)} remaining`;
            container.querySelector('.menu-progress-fill').style.width = `${percentage}%`;
            container.querySelector('.menu-progress-text').textContent = `${completed}/${lectures.length} lectures completed`;
        }

        async function playLectureFromAnywhere(courseId, lectureId, originView = 'dashboard-view', subfolder = null) {
            lastView = originView;
            const course = (window.courses || []).find(c => String(c.id) === String(courseId));
            if (!course) {
                showToast('This course has been deleted.', true);
                return;
            }
            if (subfolder && isSubfolderPathHidden(course, subfolder)) {
                showToast('This subcourse has been deleted.', true);
                return;
            }
            if (!course.isLinked) {
                const handle = course.handle;
                if (await handle.requestPermission({ mode: 'read' }) !== 'granted') { 
                    showToast('Permission to access course files denied.', true);
                    return; 
                }
                course.isLinked = true;
            }
            await renderPlayer(courseId, lectureId, originView, null, subfolder);
        }

        async function renderPlayer(courseId, lectureIdToPlay = null, originView = 'dashboard-view', startTime = null, subfolder = null) {
            isGoalsMode = false;
            currentGoalsLectures = [];
            isCalendarMode = false;
            currentCalendarLectures = [];
            isStudyTogetherMode = false;
            currentStudyTogetherStatus = null;

            currentCourse = (window.courses || []).find(c => String(c.id) === String(courseId));
            currentSubfolder = subfolder;
            if (!currentCourse) return;
            switchView('player-view');
            if (lectureMenu) lectureMenu.classList.remove('hidden');
            if (document.getElementById('sidebar-toggle-btn')) document.getElementById('sidebar-toggle-btn').classList.remove('collapsed');
            document.getElementById('chapter-list').innerHTML = '<p style="text-align:center; padding: 20px;">Loading lectures...</p>';
            toggleCompletedBtn.classList.add('hidden');
            
            if (currentCourse.isCustomCourse) {
                if (currentCourse.lectures.length === 0) {
                    const container = document.getElementById('custom-course-input-container');
                    if (container) container.classList.remove('hidden');
                    const wrapper = document.getElementById('video-wrapper');
                    if (wrapper) wrapper.classList.add('hidden');
                    document.getElementById('chapter-list').innerHTML = '<p id="no-content-message" style="padding:20px; text-align:center; color:var(--text-secondary);">No lectures yet. Add URLs to begin.</p>';
                    return;
                } else {
                    const container = document.getElementById('custom-course-input-container');
                    if (container) container.classList.add('hidden');
                    const wrapper = document.getElementById('video-wrapper');
                    if (wrapper) wrapper.classList.remove('hidden');
                }
            } else {
                const urlInput = document.getElementById('custom-course-input-container');
                if (urlInput) urlInput.classList.add('hidden');
                const wrapper = document.getElementById('video-wrapper');
                if (wrapper) wrapper.classList.remove('hidden');
            }

            if (!currentCourse.isCustomCourse && (!currentCourse.lectures || !currentCourse.chapters)) {
                try {
                    await refreshCourse(currentCourse.id, null);
                } catch (error) {
                    console.error('Failed to load course data:', error);
                    document.getElementById('chapter-list').innerHTML = `<p id="no-content-message">Error: Could not load course content.</p>`;
                    return;
                }
            }

            if (!currentSubfolder && lectureIdToPlay) {
                const targetL = currentCourse.lectures.find(l => l.id === lectureIdToPlay);
                if (targetL) currentSubfolder = targetL.chapter;
            }

            if (window.lastViewedFaculty) {
                document.getElementById('back-to-library-btn').textContent = 'Back to Faculty';
            } else if (originView === 'dashboard-view') {
                document.getElementById('back-to-library-btn').textContent = 'ΓåÉ Back to Courses';
            } else if (originView === 'subcourse-view') {
                const subViewEl = document.getElementById('subcourse-view');
                if (subViewEl.dataset.origin === 'continue-view' && currentSubfolder === (subViewEl.dataset.resumePath || '')) {
                    document.getElementById('back-to-library-btn').textContent = 'ΓåÉ Back to Continue';
                    originView = 'continue-view';
                } else if (subViewEl.dataset.origin === 'search-results-view') {
                    document.getElementById('back-to-library-btn').textContent = 'ΓåÉ Back to Search';
                    originView = 'search-results-view';
                } else {
                    document.getElementById('back-to-library-btn').textContent = currentSubfolder ? 'ΓåÉ Back to Folder' : 'ΓåÉ Back to Course';
                }
            } else if (originView === 'intell-view') {
                document.getElementById('back-to-library-btn').textContent = 'ΓåÉ Back to Notes';
            } else if (originView === 'progress-doubts') {
                document.getElementById('back-to-library-btn').textContent = 'ΓåÉ Back to Doubts';
            } else {
                const statusName = originView.split('-')[0];
                document.getElementById('back-to-library-btn').textContent = `ΓåÉ Back to ${statusName.charAt(0).toUpperCase() + statusName.slice(1)}`;
            }
            document.getElementById('back-to-library-btn').dataset.view = originView;
            
            let chaptersToDisplay = currentCourse.chapters;

            if (subfolder) {
                const filtered = chaptersToDisplay.filter(ch => ch.name === subfolder || ch.name.startsWith(subfolder + '/') || subfolder.startsWith(ch.name + '/'));
                if (filtered.length > 0) {
                    chaptersToDisplay = filtered;
                }
                courseTitleMenu.textContent = `${currentCourse.title} - ${getSubfolderDisplayName(currentCourse, subfolder)}`;
                // Only set back view to subcourse-view if we didn't come from doubts, continue, history, or search (preserve those origins)
                if (originView !== 'doubts-detail-view' && originView !== 'continue-view' && originView !== 'history-view' && originView !== 'search-results-view' && originView !== 'progress-doubts' && originView !== 'intell-view') {
                    document.getElementById('back-to-library-btn').dataset.view = 'subcourse-view';
                }
                document.getElementById('back-to-library-btn').dataset.subfolder = subfolder;
                clearBookmarksBtn.classList.remove('hidden');
            } else if (originView === 'review-view' || originView === 'practice-view') {
                const status = originView.split('-')[0];
                const statusLectures = Object.values(courseProgress)
                    .filter(p => p.status === status && p.courseId === currentCourse.id)
                    .map(p => p.lectureId);

                chaptersToDisplay = JSON.parse(JSON.stringify(currentCourse.chapters)).map(chapter => {
                    chapter.lectures = chapter.lectures.filter(l => statusLectures.includes(l.id));
                    return chapter;
                }).filter(chapter => chapter.lectures.length > 0);
                
                courseTitleMenu.textContent = `${currentCourse.title} (${status.charAt(0).toUpperCase() + status.slice(1)} Lectures)`;
                clearBookmarksBtn.classList.add('hidden');
            } else {
                courseTitleMenu.textContent = currentCourse.title;
                clearBookmarksBtn.classList.remove('hidden');
            }

            updateMenuProgress(subfolder);
            renderChapterList(chaptersToDisplay, lectureIdToPlay);

            // Resume logic: try explicit lecture, then last played, then first lecture
            let liToPlay = null;
            let resumeTime = startTime;
            if (lectureIdToPlay) {
                liToPlay = document.getElementById('chapter-list').querySelector(`li[data-lecture-id="${lectureIdToPlay}"]`);
            }
            if (!liToPlay && currentCourse.lastPlayedLecture) {
                liToPlay = document.getElementById('chapter-list').querySelector(`li[data-lecture-id="${currentCourse.lastPlayedLecture.lectureId}"]`);
                if (liToPlay && resumeTime === null) {
                    resumeTime = currentCourse.lastPlayedLecture.currentTime || null;
                }
            }
            if (!liToPlay) {
                liToPlay = document.getElementById('chapter-list').querySelector('li');
            }
            if (liToPlay) await playVideo(liToPlay, resumeTime);
        }
        async function renderGoalsPlayer(courseId, lectureIdToPlay) {
            currentCourse = (window.courses || []).find(c => c.id === parseInt(courseId));
            if (!currentCourse) return;
            switchView('player-view');
            document.getElementById('chapter-list').innerHTML = '<p style="text-align:center; padding: 20px;">Loading Goals playlist...</p>';
            
            document.getElementById('back-to-library-btn').textContent = 'Back to Goals';
            document.getElementById('back-to-library-btn').dataset.view = 'goals';
            courseTitleMenu.textContent = `Daily Goals Playlist`;
            clearBookmarksBtn.classList.add('hidden');
            toggleCompletedBtn.classList.remove('hidden');

            const saved = localStorage.getItem('courseflix_goals_playlist');
            let goalsPlaylist = [];
            if (saved) {
                goalsPlaylist = JSON.parse(saved);
            }

            if (goalsPlaylist.length === 0) {
                document.getElementById('chapter-list').innerHTML = '<p id="no-content-message">Playlist is empty.</p>';
                return;
            }

            // Group by courseTitle
            const chaptersToDisplay = [];
            goalsPlaylist.forEach(item => {
                let ch = chaptersToDisplay.find(c => c.name === item.courseTitle);
                if (!ch) {
                    ch = { name: item.courseTitle, lectures: [] };
                    chaptersToDisplay.push(ch);
                }
                const originalCourse = (window.courses || []).find(c => c.id === parseInt(item.courseId));
                if (originalCourse) {
                    let fullLecture;
                    if (originalCourse.lectures) {
                        fullLecture = originalCourse.lectures.find(l => l.id === item.lectureId.toString());
                        if (!fullLecture && typeof item.lectureId === 'number') {
                             fullLecture = originalCourse.lectures[item.lectureId];
                        }
                    }
                    if (!fullLecture && originalCourse.chapters) {
                        for (const chapter of originalCourse.chapters) {
                            if (chapter.lectures) {
                                fullLecture = chapter.lectures.find(l => l.id === item.lectureId.toString());
                                if (!fullLecture && typeof item.lectureId === 'number') {
                                    fullLecture = chapter.lectures[item.lectureId];
                                }
                                if (fullLecture) break;
                            }
                        }
                    }
                    if (fullLecture) {
                        const copy = {...fullLecture};
                        copy.overrideCourseId = item.courseId;
                        // Keep original fullLecture.id for playVideo lookup
                        ch.lectures.push(copy);
                    }
                }
            });

            renderChapterList(chaptersToDisplay, lectureIdToPlay?.toString());

            isGoalsMode = true;
            currentGoalsLectures = chaptersToDisplay.flatMap(ch => ch.lectures);
            updateMenuProgress();

            let liToPlay = null;
            if (lectureIdToPlay !== null) {
                liToPlay = document.getElementById('chapter-list').querySelector(`li[data-course-id="${courseId}"][data-lecture-id="${lectureIdToPlay}"]`) || document.getElementById('chapter-list').querySelector(`li[data-lecture-id="${lectureIdToPlay}"]`);
            }
            if (!liToPlay) {
                liToPlay = document.getElementById('chapter-list').querySelector('li');
            }
            if (liToPlay) await playVideo(liToPlay, null);
        }

        async function renderCalendarPlayer(courseId, lectureIdToPlay) {
            currentCourse = (window.courses || []).find(c => c.id === parseInt(courseId));
            if (!currentCourse) return;
            switchView('player-view');
            document.getElementById('chapter-list').innerHTML = '<p style="text-align:center; padding: 20px;">Loading Calendar Playlist...</p>';

            document.getElementById('back-to-library-btn').textContent = 'Back to Calendar';
            document.getElementById('back-to-library-btn').dataset.view = 'calendar';

            // Format date suffix for title display
            const playlistDate = localStorage.getItem('courseflix_calendar_playlist_date');
            let dateSuffix = '';
            if (playlistDate) {
                const d = new Date(playlistDate + 'T00:00:00');
                const formatted = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                dateSuffix = ` (${formatted})`;
            }
            courseTitleMenu.textContent = `≡ƒôà Calendar Event Playlist${dateSuffix}`;
            clearBookmarksBtn.classList.add('hidden');
            toggleCompletedBtn.classList.remove('hidden');

            const saved = localStorage.getItem('courseflix_calendar_playlist');
            let calendarPlaylist = [];
            if (saved) {
                try { calendarPlaylist = JSON.parse(saved); } catch(e) {}
            }

            if (calendarPlaylist.length === 0) {
                document.getElementById('chapter-list').innerHTML = '<p id="no-content-message">Calendar playlist is empty.</p>';
                return;
            }

            const chaptersToDisplay = [];
            calendarPlaylist.forEach(item => {
                let ch = chaptersToDisplay.find(c => c.name === item.courseTitle);
                if (!ch) {
                    ch = { name: item.courseTitle, lectures: [] };
                    chaptersToDisplay.push(ch);
                }
                const originalCourse = (window.courses || []).find(c => c.id === parseInt(item.courseId));
                if (originalCourse) {
                    let fullLecture;
                    if (originalCourse.lectures) {
                        fullLecture = originalCourse.lectures.find(l => l.id.toString() === item.lectureId.toString());
                        if (!fullLecture && typeof item.lectureId === 'number') {
                            fullLecture = originalCourse.lectures[item.lectureId];
                        }
                    }
                    if (fullLecture) {
                        const progress = getLectureProgress(item.courseId, fullLecture.id);
                        if (!progress.completed) {
                            if (!ch.lectures.some(l => l.id.toString() === fullLecture.id.toString())) {
                                const copy = {...fullLecture};
                                copy.overrideCourseId = item.courseId;
                                ch.lectures.push(copy);
                            }
                        }
                    }
                }
            });

            renderChapterList(chaptersToDisplay, lectureIdToPlay?.toString());
            isCalendarMode = true;
            isGoalsMode = false;
            currentCalendarLectures = chaptersToDisplay.flatMap(ch => ch.lectures);
            updateMenuProgress();

            let liToPlay = null;
            if (lectureIdToPlay !== null) {
                liToPlay = document.getElementById('chapter-list').querySelector(`li[data-course-id="${courseId}"][data-lecture-id="${lectureIdToPlay}"]`) || document.getElementById('chapter-list').querySelector(`li[data-lecture-id="${lectureIdToPlay}"]`);
            }
            if (!liToPlay) liToPlay = document.getElementById('chapter-list').querySelector('li');
            if (liToPlay) await playVideo(liToPlay, null);
        }

        async function renderStudyTogetherPlayer(status) {
            isGoalsMode = true; // Use Goals mode playback logic
            isCalendarMode = false;
            isStudyTogetherMode = true;
            currentStudyTogetherStatus = status;

            switchView('player-view');
            document.getElementById('chapter-list').innerHTML = '<p style="text-align:center; padding: 20px;">Loading Study Together Playlist...</p>';

            document.getElementById('back-to-library-btn').textContent = `ΓåÉ Back to ${status.charAt(0).toUpperCase() + status.slice(1)}`;
            document.getElementById('back-to-library-btn').dataset.view = `${status}-view`;

            courseTitleMenu.textContent = `≡ƒñ¥ Study Together: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
            clearBookmarksBtn.classList.add('hidden');
            toggleCompletedBtn.classList.remove('hidden');

            const allItems = Object.values(courseProgress).filter(p => p.status === status);
            const chaptersToDisplay = [];
            
            allItems.forEach(item => {
                const originalCourse = (window.courses || []).find(c => c.id === parseInt(item.courseId));
                if (originalCourse) {
                    let ch = chaptersToDisplay.find(c => c.name === originalCourse.title);
                    if (!ch) {
                        ch = { name: originalCourse.title, lectures: [] };
                        chaptersToDisplay.push(ch);
                    }
                    if (originalCourse.lectures) {
                        let fullLecture = originalCourse.lectures.find(l => l.id.toString() === item.lectureId.toString());
                        if (fullLecture) {
                            if (!ch.lectures.some(l => l.id.toString() === fullLecture.id.toString())) {
                                const copy = {...fullLecture};
                                copy.overrideCourseId = item.courseId;
                                ch.lectures.push(copy);
                            }
                        }
                    }
                }
            });

            if (chaptersToDisplay.length === 0) {
                document.getElementById('chapter-list').innerHTML = '<p id="no-content-message">Playlist is empty.</p>';
                return;
            }

            renderChapterList(chaptersToDisplay);
            currentGoalsLectures = chaptersToDisplay.flatMap(ch => ch.lectures);
            updateMenuProgress();

            let liToPlay = document.getElementById('chapter-list').querySelector('li');
            if (liToPlay) await playVideo(liToPlay, null);
        }

        function renderChapterList(chaptersToDisplay, lectureIdToPlay = null) {
             document.getElementById('chapter-list').innerHTML = '';
             if (!chaptersToDisplay || chaptersToDisplay.length === 0 || (chaptersToDisplay.length === 1 && chaptersToDisplay[0].lectures.length === 0)) {
                 document.getElementById('chapter-list').innerHTML = `<p id="no-content-message">No lectures found for this course or filter.</p>`;
                 return;
             }
            
             chaptersToDisplay.forEach((chapter) => {
                 const chapterDiv = document.createElement('div');
                 chapterDiv.className = 'chapter open';
                 chapterDiv.dataset.chapterName = chapter.name;
                 chapterDiv.draggable = !isGoalsMode;

                 const chapterDuration = chapter.lectures.reduce((sum, lect) => sum + (lect.duration || 0), 0);

                 // Show only the deepest path part to save space
                 const displayName = chapter.name.split('/').pop();

                 chapterDiv.innerHTML = `
                     <div class="chapter-title">
                         ${isGoalsMode ? '<i class="fas fa-chevron-right" style="margin-left: 12px;"></i>' : '<i class="fas fa-grip-vertical chapter-drag-handle" title="Drag to reorder"></i><i class="fas fa-chevron-right"></i>'}
                         <span class="chapter-title-text" title="Double-click to rename">${displayName}</span>
                         <span class="chapter-duration">${formatDuration(chapterDuration)}</span>
                     </div>`;

                 const lectureList = document.createElement('ul');
                 lectureList.className = 'lecture-list';

                 for (const lecture of chapter.lectures) {
                     const actualCourseId = lecture.overrideCourseId || currentCourse.id;
                     const progress = getLectureProgress(actualCourseId, lecture.id);
                     const lectureLi = document.createElement('li');
                     lectureLi.dataset.lectureId = lecture.id;
                     if (lecture.overrideCourseId) lectureLi.dataset.courseId = lecture.overrideCourseId;

                     lectureLi.innerHTML = `
                         <div class="lecture-checkbox ${progress.completed ? 'completed' : ''}"><i class="fas fa-check"></i></div>
                         <div class="lecture-title ${progress.completed ? 'completed' : ''}" title="${lecture.displayName} (Double-click to rename)">${lecture.displayName}</div>
                         <span class="lecture-duration">${formatTime(lecture.duration)}</span>
                         <button class="status-btn ${progress.status || ''}" data-lecture-name="${lecture.displayName}" data-duration="${lecture.duration}">
                             ${progress.status ? progress.status.toUpperCase() : 'STATUS'}
                         </button>`;
                     lectureList.appendChild(lectureLi);
                 }
                 chapterDiv.appendChild(lectureList);
            document.getElementById('chapter-list').appendChild(chapterDiv);
             });
        }

        // --- Autoplay Next Episode ---
        let pendingAutoplayLi = null;
        let autoplayCountdown = 0;
        let autoplayTimer = null;
        let autoplayTriggered = false;

        function getNextLectureLi(currentLi) {
            let next = currentLi.nextElementSibling;
            if (next && next.tagName === 'LI') return next;
            // Try first lecture in next chapter
            let chapter = currentLi.closest('.chapter');
            if (!chapter) return null;
            let nextChapter = chapter.nextElementSibling;
            while (nextChapter) {
                if (nextChapter.classList.contains('chapter')) {
                    const firstLi = nextChapter.querySelector('li');
                    if (firstLi) return firstLi;
                }
                nextChapter = nextChapter.nextElementSibling;
            }
            return null;
        }

        function getPreviousLectureLi(currentLi) {
            let prev = currentLi.previousElementSibling;
            if (prev && prev.tagName === 'LI') return prev;
            // Try last lecture in previous chapter
            let chapter = currentLi.closest('.chapter');
            if (!chapter) return null;
            let prevChapter = chapter.previousElementSibling;
            while (prevChapter) {
                if (prevChapter.classList.contains('chapter')) {
                    const allLi = prevChapter.querySelectorAll('li');
                    if (allLi.length > 0) return allLi[allLi.length - 1];
                }
                prevChapter = prevChapter.previousElementSibling;
            }
            return null;
        }

        function showAutoplayOverlay(nextLi, duration = 5) {
            if (document.getElementById('autoplay-overlay').classList.contains('visible')) return;
            pendingAutoplayLi = nextLi;
            const overlay = document.getElementById('autoplay-overlay');
            const nextTitleEl = nextLi.querySelector('.lecture-title');
            const nextTitle = nextTitleEl ? nextTitleEl.textContent : 'Next Lecture';
            document.getElementById('autoplay-next-title').textContent = nextTitle;
            overlay.classList.add('visible');

            autoplayCountdown = duration;
            document.getElementById('autoplay-countdown-text').textContent = autoplayCountdown;

            const circle = document.getElementById('autoplay-countdown-circle');
            const circumference = 2 * Math.PI * 15.5; // r=15.5
            circle.style.strokeDasharray = circumference;
            circle.style.strokeDashoffset = '0';
            circle.style.transition = 'none';

            // Trigger reflow then animate
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    circle.style.transition = `stroke-dashoffset ${duration}s linear`;
                    circle.style.strokeDashoffset = circumference;
                });
            });

            autoplayTimer = setInterval(() => {
                autoplayCountdown--;
                document.getElementById('autoplay-countdown-text').textContent = Math.max(0, autoplayCountdown);
                if (autoplayCountdown <= 0) {
                    hideAutoplayOverlay();
                    if (pendingAutoplayLi) playVideo(pendingAutoplayLi);
                    pendingAutoplayLi = null;
                }
            }, 1000);
        }

        function hideAutoplayOverlay() {
            const overlay = document.getElementById('autoplay-overlay');
            if (overlay) overlay.classList.remove('visible');
            if (autoplayTimer) {
                clearInterval(autoplayTimer);
                autoplayTimer = null;
            }
            pendingAutoplayLi = null;
        }

        // Autoplay overlay button listeners
        document.getElementById('autoplay-play-btn')?.addEventListener('click', () => {
            const nextLi = pendingAutoplayLi;
            hideAutoplayOverlay();
            if (nextLi) playVideo(nextLi);
        });
        document.getElementById('autoplay-cancel-btn')?.addEventListener('click', () => {
            hideAutoplayOverlay();
        });

        async function saveLastPlayedLecture() {
            if (currentCourse && currentLectureLi) {
                course.lastPlayedLecture = {
                    lectureId: currentLectureLi.dataset.lectureId,
                    currentTime: videoPlayer.currentTime || 0
                };
                await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
            }
        }

        async function playVideo(liElement, startTime = null) {
            autoplayTriggered = false;
            hideAutoplayOverlay(); // Clear any pending autoplay

            if (currentLectureLi && currentCourse) { // Save last played info before switching
                const lastLectureId = currentLectureLi.dataset.lectureId;
                if (lastLectureId !== liElement.dataset.lectureId) {
                    course.lastPlayedLecture = { lectureId: lastLectureId, currentTime: videoPlayer.currentTime };
                    await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                }
            }
            if (currentLectureLi) currentLectureLi.classList.remove('active');
            currentLectureLi = liElement;
            currentLectureLi.classList.add('active');
            const lectureId = liElement.dataset.lectureId;
            
            const courseIdOverride = liElement.dataset.courseId;
            if (courseIdOverride && (!currentCourse || parseInt(courseIdOverride) !== currentCourse.id)) {
                currentCourse = (window.courses || []).find(c => c.id === parseInt(courseIdOverride));
            }
            
            const lecture = currentCourse.lectures.find(l => l.id === lectureId);
            if (!lecture) return;

            // Save current lecture as last played immediately
            course.lastPlayedLecture = { lectureId: lectureId, currentTime: startTime || 0 };
            new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);

            updateMediaViewerToggleButton();

            // Auto-sync media viewer sidebar when switching lectures while sidebar is open
            const isSidebarOpen = (typeof playerView !== 'undefined' && playerView.classList.contains('viewer-active')) || (typeof mediaViewer !== 'undefined' && mediaViewer && !mediaViewer.classList.contains('hidden'));
            if (isSidebarOpen && currentCourse && lecture) {
                const progress = getLectureProgress(currentCourse.id, lecture.id);
                const hasPdf = progress && progress.pdfHandle;
                const hasAssignment = progress && (progress.assignmentHandle || progress.dppHandle);

                if (hasPdf) {
                    showMediaViewer(progress.pdfHandle, 'pdf', progress.pdfName || 'Notes.pdf', progress);
                } else if (hasAssignment) {
                    const handle = progress.assignmentHandle || progress.dppHandle;
                    const name = progress.assignmentName || progress.dppName || 'DPP.pdf';
                    showMediaViewer(handle, 'assignment', name, progress);
                } else {
                    hideMediaViewer();
                }
            }

            try {
                if (currentCourse.isCustomCourse) {
                    const iframePlayer = document.getElementById('custom-iframe-player');
                    if (iframePlayer) {
                        videoPlayer.pause();
                        videoPlayer.removeAttribute('src');
                        videoPlayer.load();
                        
                        iframePlayer.src = lecture.url;
                        iframePlayer.classList.remove('hidden');
                        videoPlayer.classList.add('hidden');
                        
                        const controlsContainer = document.querySelector('.video-controls-container');
                        if (controlsContainer) controlsContainer.classList.add('hidden');
                        
                        addHistoryEntry(currentCourse.id, lectureId, currentCourse.title, lecture.displayName, lecture.duration || 0, currentSubfolder, currentCourse.thumbnail).catch(console.error);
                    }
                    return;
                }

                const iframePlayer = document.getElementById('custom-iframe-player');
                if (iframePlayer) {
                    iframePlayer.classList.add('hidden');
                    iframePlayer.removeAttribute('src');
                }
                videoPlayer.classList.remove('hidden');
                const controlsContainer = document.querySelector('.video-controls-container');
                if (controlsContainer) controlsContainer.classList.remove('hidden');

                const file = await lecture.handle.getFile();
                if(videoPlayer.src) URL.revokeObjectURL(videoPlayer.src);
                videoPlayer.src = URL.createObjectURL(file);
                videoPlayer.load();
                
                // Track history
                addHistoryEntry(currentCourse.id, lectureId, currentCourse.title, lecture.displayName, lecture.duration, currentSubfolder, currentCourse.thumbnail).catch(console.error);

                videoPlayer.addEventListener('loadeddata', async () => {
                    renderBookmarks();
                    let timeToSet = startTime;
                    if (timeToSet === null) {
                        const progress = getLectureProgress(currentCourse.id, lecture.id);
                        if(progress.currentTime) timeToSet = progress.currentTime;
                    }
                    if(timeToSet) videoPlayer.currentTime = timeToSet;
                    
                    // Apply saved playback speed
                    videoPlayer.playbackRate = window.activePlaybackRate || speeds[currentSpeedIndex];
                    speedBtn.textContent = videoPlayer.playbackRate + 'x';

                    unmuteBtn.classList.add('hidden');
                    videoPlayer.muted = false;

                    try {
                        // Try playing with sound first (works when user clicked/pressed key)
                        await videoPlayer.play();
                    } catch (err) {
                        console.warn("Autoplay blocked by browser. User interaction required to start unmuted:", err.message);
                        // User requested NO muted autoplay fallback. Let it stay paused.
                        if (typeof centerPlayOverlay !== 'undefined' && centerPlayOverlay) {
                            centerPlayOverlay.classList.remove('hidden');
                        }
                        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
                    }
                }, { once: true });

                videoPlayer.onended = () => {
                    const lectureId = currentLectureLi.dataset.lectureId;
                    const lecture = currentCourse.lectures.find(l => l.id === lectureId);
                    saveLectureProgress({ 
                        courseId: currentCourse.id, 
                        lectureId, 
                        completed: true, 
                        currentTime: 0,
                        lectureName: lecture.displayName,
                        courseTitle: currentCourse.title,
                        lectureDuration: lecture.duration
                    });
                    updateMenuProgress(currentSubfolder);
                    updateTotalTimeLeftDisplay();
                    currentLectureLi.querySelector('.lecture-checkbox').classList.add('completed');
                    currentLectureLi.querySelector('.lecture-title').classList.add('completed');

                    // Autoplay next lecture handled by timeupdate
                };
            } catch (error) {
                console.error("Failed to load video:", error);
                showToast("Could not load video. The original file may have been moved or deleted.", true);
                videoPlayer.removeAttribute('src');
                sessionStorage.removeItem('courseflixState');
                videoPlayer.load();
            }
        }
        
        async function refreshCourse(courseId, btnElement) {
            const course = (window.courses || []).find(c => c.id === courseId);
            if (!course || !course.handle) {
                showToast('Could not find the root course folder. It may have been moved or deleted.', true);
                return;
            }

            if (btnElement) btnElement.classList.add('loading');

            try {
                if ((await course.handle.queryPermission({ mode: 'read' })) !== 'granted') {
                    if ((await course.handle.requestPermission({ mode: 'read' })) !== 'granted') {
                        showToast('Permission denied. Cannot refresh course.', true);
                        return;
                    }
                }

                const newCourseData = await scanDirectoryHandle(course.handle, '', course.lectures || []);
                
                // Merge overriden custom relocated subfolder handles if any exist
                if (course.subCourseData) {
                    for (const subPath of Object.keys(course.subCourseData)) {
                        const subHandle = course.subCourseData[subPath].handle;
                        if (subHandle) {
                            try {
                                if (await subHandle.queryPermission({ mode: 'read' }) === 'granted') {
                                    const subData = await scanDirectoryHandle(subHandle, subPath, course.lectures || []);
                                    // Remove old scan results for this subpath
                                    newCourseData.lectures = newCourseData.lectures.filter(l => !(l.chapter === subPath || l.chapter.startsWith(subPath + '/')));
                                    newCourseData.chapters = newCourseData.chapters.filter(ch => !(ch.name === subPath || ch.name.startsWith(subPath + '/')));
                                    // Inject custom scan results
                                    newCourseData.lectures.push(...subData.lectures);
                                    newCourseData.chapters.push(...subData.chapters);
                                }
                            } catch(e) { console.warn(`Relocated subfolder scan failed for ${subPath}`, e); }
                        }
                    }
                }

                course.lectures = newCourseData.lectures;
                course.chapters = newCourseData.chapters.sort((a,b)=>naturalSort(a,b));
                course.videoCount = course.lectures.length;
                course.totalDuration = course.lectures.reduce((sum, l) => sum + (l.duration||0), 0);
                
                await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                
                const currentView = document.querySelector('.view.active').id;
                if (currentView === 'dashboard-view') {
                    await renderCourseGrid();
                } else if (currentView === 'subcourse-view') {
                    const viewEl = document.getElementById('subcourse-view');
                    const path = viewEl.dataset.currentPath || '';
                    if(courseId === parseInt(viewEl.dataset.courseId)) await renderSubcourseView(courseId, path);
                }
            } catch (error) {
                console.error('Error refreshing course:', error);
                showToast('An error occurred while refreshing the course.', true);
            } finally {
                if(btnElement) btnElement.classList.remove('loading');
            }
        }

        async function showMediaViewer(fileHandle, fileType, fileName, lectureProgress) {
            try {
                let file = (fileHandle && fileHandle.getFile && typeof fileHandle.getFile === 'function') ? await fileHandle.getFile() : fileHandle;
                if (!file) return;

                if (activeFileUrl) {
                    try { URL.revokeObjectURL(activeFileUrl); } catch(e) {}
                    activeFileUrl = null;
                }

                let blobToView;
                if (file instanceof Blob) {
                    blobToView = file;
                } else if (file instanceof ArrayBuffer) {
                    blobToView = new Blob([file], { type: 'application/pdf' });
                } else {
                    blobToView = file;
                }

                activeFileUrl = URL.createObjectURL(blobToView);
                
                if (fileType.toLowerCase() === 'dpp') {
                    const dppFrame = document.getElementById('dpp-viewer-frame');
                    if (dppFrame) {
                        dppFrame.style.display = 'block';
                        dppFrame.src = `/pdf-viewer.html?file=${encodeURIComponent(activeFileUrl)}`;
                    }
                    const dppOpenExt = document.getElementById('dpp-open-external');
                    if (dppOpenExt) dppOpenExt.href = activeFileUrl;
                    const dppHeader = document.getElementById('dpp-viewer-header');
                    if (dppHeader) dppHeader.classList.remove('hidden');
                    const dppNoMsg = document.getElementById('dpp-no-content-message');
                    if (dppNoMsg) {
                        dppNoMsg.classList.add('hidden');
                        dppNoMsg.style.display = 'none';
                    }
                } else if (fileType.toLowerCase() === 'note') {
                    const notesFrame = document.getElementById('notes-viewer-frame');
                    if (notesFrame) {
                        notesFrame.style.display = 'block';
                        notesFrame.src = `/pdf-viewer.html?file=${encodeURIComponent(activeFileUrl)}`;
                    }
                    const notesOpenExt = document.getElementById('notes-open-external');
                    if (notesOpenExt) notesOpenExt.href = activeFileUrl;
                    const notesHeader = document.getElementById('notes-viewer-header');
                    if (notesHeader) notesHeader.classList.remove('hidden');
                    const notesNoMsg = document.getElementById('notes-no-content-message');
                    if (notesNoMsg) {
                        notesNoMsg.classList.add('hidden');
                        notesNoMsg.style.display = 'none';
                    }
                    const intellBtn = document.getElementById('notes-intell-hub-btn');
                    if (intellBtn) intellBtn.style.display = 'none';
                } else {
                    const uploadPlaceholder = document.getElementById('media-viewer-upload-placeholder');
                    if (uploadPlaceholder) {
                        uploadPlaceholder.classList.add('hidden');
                        uploadPlaceholder.style.display = 'none';
                    }
                    if (mediaViewerFrame) {
                        mediaViewerFrame.style.display = 'block';
                        mediaViewerFrame.src = `/pdf-viewer.html?file=${encodeURIComponent(activeFileUrl)}#page=1&zoom=fit`;
                    }
                    viewerTitle.textContent = fileName || file.name || (fileType.toLowerCase() === 'pdf' ? 'Notes.pdf' : 'DPP.pdf');
                    activeViewerFileType = fileType.toLowerCase();
                    activeViewerLectureId = lectureProgress ? lectureProgress.lectureId : null;
                    updateFileSwitcher(lectureProgress, activeViewerFileType);
                    const preferredWidth = localStorage.getItem('viewerWidth') || '500px';
                    playerView.style.setProperty('--viewer-width', preferredWidth);
                    mediaViewer.style.width = preferredWidth;
                    playerView.classList.add('viewer-active');
                    mediaViewer.classList.remove('hidden');
                    document.getElementById('media-viewer-toggle-btn').classList.add('hidden');
                    document.getElementById('delete-viewer-file-btn').dataset.type = activeViewerFileType;
                    document.getElementById('delete-viewer-file-btn').classList.add('visible');
                    
                    let popOutBtnDynamic = document.getElementById('pop-out-btn-dynamic');
                    if (!popOutBtnDynamic) {
                        popOutBtnDynamic = document.createElement('button');
                        popOutBtnDynamic.id = 'pop-out-btn-dynamic';
                        popOutBtnDynamic.title = 'Pop Out';
                        popOutBtnDynamic.innerHTML = '<i class="fas fa-external-link-alt"></i> Pop Out';
                        popOutBtnDynamic.style.cssText = 'background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-secondary); border-radius: 6px; font-size: 0.8rem; font-weight: 500; padding: 6px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background-color 0.2s, color 0.2s, border-color 0.2s;';
                        
                        popOutBtnDynamic.addEventListener('mouseover', () => {
                            popOutBtnDynamic.style.backgroundColor = 'var(--accent-primary)';
                            popOutBtnDynamic.style.color = 'white';
                            popOutBtnDynamic.style.borderColor = 'var(--accent-primary)';
                        });
                        popOutBtnDynamic.addEventListener('mouseout', () => {
                            popOutBtnDynamic.style.backgroundColor = 'var(--bg-tertiary)';
                            popOutBtnDynamic.style.color = 'var(--text-primary)';
                            popOutBtnDynamic.style.borderColor = 'var(--border-secondary)';
                        });

                        popOutBtnDynamic.addEventListener('click', async () => {
                            if (mediaViewerFrame && activeFileUrl) {
                                let currentPage = 1;
                                let currentScale = 1.5;

                                try {
                                    if (mediaViewerFrame.contentWindow) {
                                        if (mediaViewerFrame.contentWindow.currentPage) {
                                            currentPage = mediaViewerFrame.contentWindow.currentPage;
                                        }
                                        if (mediaViewerFrame.contentWindow.currentScale) {
                                            currentScale = mediaViewerFrame.contentWindow.currentScale;
                                        }
                                    }
                                } catch (e) {
                                    console.log("Could not read PDF.js state:", e);
                                }

                                const popOutUrl = `/pdf-viewer.html?file=${encodeURIComponent(activeFileUrl)}#page=${currentPage}&zoom=${currentScale}`;

                                let windowFeatures = "";

                                try {
                                    if ('getScreenDetails' in window) {
                                        const screenDetails = await window.getScreenDetails();
                                        const secondary = screenDetails.screens.find(s => s !== screenDetails.currentScreen);
                                        if (secondary) {
                                            windowFeatures = `left=${secondary.availLeft},top=${secondary.availTop},width=${secondary.availWidth},height=${secondary.availHeight}`;
                                        }
                                    } else if (window.screen && (window.screen.isExtended || window.screen.width)) {
                                        const targetLeft = (window.screen.availLeft !== undefined && window.screen.availLeft !== 0) 
                                            ? 0 
                                            : (window.screen.width || 1920);
                                        windowFeatures = `left=${targetLeft},top=0,width=1280,height=900`;
                                    }
                                } catch (e) {
                                    console.log("Multi-display detection fallback:", e);
                                }

                                if (windowFeatures) {
                                    window.open(popOutUrl, '_blank', windowFeatures);
                                } else {
                                    window.open(popOutUrl, '_blank');
                                }

                                // Minimize right sidebar so video player takes full focus
                                minimizeMediaViewer();
                            }
                        });
                        
                        document.getElementById('delete-viewer-file-btn').parentNode.insertBefore(popOutBtnDynamic, document.getElementById('delete-viewer-file-btn'));
                    }
                    popOutBtnDynamic.style.display = 'inline-flex';
                }
            } catch (error) {
                console.error("Error showing file:", error);
                showToast("Failed to open file. Please try re-adding it.", true);
                if (fileType.toLowerCase() !== 'dpp' && fileType.toLowerCase() !== 'note') {
                    hideMediaViewer();
                }
            }
        }

        function updateFileSwitcher(lectureProgress, currentType) {
            const container = document.getElementById('file-switcher-container');
            if (!container) return;

            if (!lectureProgress && typeof currentCourse !== 'undefined' && currentCourse && activeViewerLectureId) {
                lectureProgress = getLectureProgress(currentCourse.id, activeViewerLectureId);
            }

            let dppHandle = null;
            let dppName = null;
            let pdfHandle = null;
            let pdfName = null;

            if (lectureProgress) {
                dppHandle = lectureProgress.assignmentHandle || lectureProgress.dppHandle;
                dppName = lectureProgress.assignmentName || lectureProgress.dppName || 'DPP.pdf';
                pdfHandle = lectureProgress.pdfHandle;
                pdfName = lectureProgress.pdfName || 'Notes.pdf';
            }

            const hasDpp = !!dppHandle;
            const hasPdf = !!pdfHandle;

            const type = (currentType || 'pdf').toLowerCase();
            const isPdf = type === 'pdf' || type === 'note' || type === 'notes';
            const labelText = isPdf ? 'Notes (PDF)' : 'DPP / Assignment';

            let optionsHTML = '';
            if (hasPdf || isPdf) {
                optionsHTML += `
                    <button data-type="pdf" style="display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; padding: 8px 12px; background: none; border: none; color: var(--text-primary); cursor: pointer; font-size: 0.82rem; border-radius: 4px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-file-pdf" style="color: #ef4444;"></i> Notes (PDF)</span>
                        ${isPdf ? '<i class="fas fa-check" style="font-size: 0.75rem; color: var(--accent-primary);"></i>' : ''}
                    </button>`;
            }

            // Only add DPP / Assignment to dropdown if a DPP file is actually attached
            if (hasDpp) {
                optionsHTML += `
                    <button data-type="assignment" style="display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; padding: 8px 12px; background: none; border: none; color: var(--text-primary); cursor: pointer; font-size: 0.82rem; border-radius: 4px;">
                        <span style="display: flex; align-items: center; gap: 8px;"><i class="fas fa-file-alt" style="color: #3b82f6;"></i> DPP / Assignment</span>
                        ${!isPdf ? '<i class="fas fa-check" style="font-size: 0.75rem; color: var(--accent-primary);"></i>' : ''}
                    </button>`;
            }

            const hasMultipleOptions = hasPdf && hasDpp;
            const chevronHTML = hasMultipleOptions ? '<i class="fas fa-chevron-down fa-xs" style="margin-left: 2px; opacity: 0.7;"></i>' : '';

            container.innerHTML = `
                <button id="file-switcher-btn" style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-secondary); padding: 6px 12px; border-radius: 6px; cursor: ${hasMultipleOptions ? 'pointer' : 'default'}; font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="${isPdf ? 'fas fa-file-pdf' : 'fas fa-file-alt'}" style="color: var(--accent-primary);"></i>
                    <span>${labelText}</span>
                    ${chevronHTML}
                </button>
                ${hasMultipleOptions ? `
                <div id="file-switcher-dropdown" class="hidden" style="position: absolute; top: 110%; right: 0; background-color: var(--bg-secondary); border: 1px solid var(--border-primary); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); z-index: 100; min-width: 170px; overflow: hidden; padding: 4px;">
                    ${optionsHTML}
                </div>` : ''}`;

            const btn = container.querySelector('#file-switcher-btn');
            const dropdown = container.querySelector('#file-switcher-dropdown');

            if (!btn || !dropdown) return;

            btn.onclick = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            };

            dropdown.querySelectorAll('button').forEach(optionBtn => {
                optionBtn.onclick = (e) => {
                    e.stopPropagation();
                    dropdown.classList.add('hidden');
                    const targetType = optionBtn.dataset.type;

                    if (targetType === 'pdf') {
                        if (pdfHandle) {
                            showMediaViewer(pdfHandle, 'pdf', pdfName, lectureProgress);
                        }
                    } else {
                        if (dppHandle) {
                            showMediaViewer(dppHandle, 'assignment', dppName, lectureProgress);
                        }
                    }
                };
            });

            const closeDropdownOnOutsideClick = (e) => {
                if (!container.contains(e.target)) {
                    dropdown.classList.add('hidden');
                    document.removeEventListener('click', closeDropdownOnOutsideClick);
                }
            };
            document.addEventListener('click', closeDropdownOnOutsideClick);
        }
        
        function hideMediaViewer() {
            playerView.classList.remove('viewer-active');
            mediaViewer.classList.add('hidden');
            mediaViewer.style.width = '0px';
            document.getElementById('delete-viewer-file-btn').classList.remove('visible');
            const popOutBtnDynamic = document.getElementById('pop-out-btn-dynamic');
            if (popOutBtnDynamic) popOutBtnDynamic.style.display = 'none';
            if (activeFileUrl) {
                try { URL.revokeObjectURL(activeFileUrl); } catch(e) {}
                activeFileUrl = null;
            }
            if (mediaViewerFrame) {
                mediaViewerFrame.removeAttribute('src');
                mediaViewerFrame.src = 'about:blank';
            }
            activeViewerFileType = null;
            activeViewerLectureId = null;
            playerView.style.setProperty('--viewer-width', '0px');
            updateMediaViewerToggleButton();
        }

        function minimizeMediaViewer() {
            playerView.classList.remove('viewer-active');
            mediaViewer.classList.add('hidden');
            mediaViewer.style.width = '0px';
            playerView.style.setProperty('--viewer-width', '0px');
            updateMediaViewerToggleButton();
        }

        function updateMediaViewerToggleButton() {
            if (!currentLectureLi || !currentCourse) {
                document.getElementById('media-viewer-toggle-btn').classList.add('hidden');
                return;
            }
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);
            const hasFiles = progress.pdfHandle || progress.assignmentHandle;
            
            const viewerIsHidden = mediaViewer.classList.contains('hidden');
            document.getElementById('media-viewer-toggle-btn').classList.toggle('hidden', !hasFiles || !viewerIsHidden);
        }

        // --- Event Listeners ---
        window.addEventListener('message', async (event) => {
            if (event.data) {
                if (event.data.action === 'switchView') {
                    if (event.data.viewId === 'progress-view' && event.data.hash) {
                        document.getElementById('progress-iframe').src = 'static/progress.html' + event.data.hash;
                    }
                    switchView(event.data.viewId);
                } else if (event.data.action === 'playLecture') {
                    await renderPlayer(
                        event.data.courseId, 
                        event.data.lectureId, 
                        event.data.lastView, 
                        event.data.currentTime, 
                        event.data.subfolder
                    );
                } else if (event.data.action === 'playGoalsPlaylist') {
                    if (typeof renderGoalsPlayer === 'function') {
                        await renderGoalsPlayer(event.data.courseId, event.data.lectureId);
                    }
                } else if (event.data.action === 'playCalendarPlaylist') {
                    if (typeof renderCalendarPlayer === 'function') {
                        await renderCalendarPlayer(event.data.courseId, event.data.lectureId);
                    }
                }
            }
        });
        document.body.addEventListener('click', (e) => { 
            const target = e.target.closest('.nav-link');
            if (target && target.dataset.view) {
                e.preventDefault(); 
                switchView(target.dataset.view); 
            }
        });
        document.body.addEventListener('auxclick', (e) => {
            if (e.button === 1) {
                const target = e.target.closest('.nav-link');
                if (target && target.dataset.view) {
                    e.preventDefault();
                    window.open(window.location.href.split('#')[0] + '#' + target.dataset.view, '_blank');
                }
            }
        });
        document.getElementById('home-btn')?.addEventListener('click', () => switchView('home-view'));

        // --- HIDE IGNORED FEATURE: instantly re-render current view when toggle changes ---
        window.addEventListener('courseflix-hide-ignored-changed', () => {
            const currentView = document.querySelector('.view.active');
            if (!currentView) return;
            if (currentView.id === 'dashboard-view-el') {
                renderCourseGrid();
            } else if (currentView.id === 'subcourse-view') {
                const courseId = currentView.dataset.courseId;
                const currentPath = currentView.dataset.currentPath || '';
                if (courseId) renderSubcourseView(parseInt(courseId), currentPath, false);
            }
        });
        
        document.body.addEventListener('change', async (e) => {
            if (e.target.classList.contains('split-course-cb')) {
                const courseId = parseInt(e.target.dataset.id);
                const subfolder = e.target.dataset.subfolder;
                const course = (window.courses || []).find(c => c.id === courseId);
                
                if (course) {
                    if (subfolder) {
                        course.subCourseData = course.subCourseData || {};
                        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                        course.subCourseData[subfolder].isSplitView = e.target.checked;
                    } else {
                        course.isSplitView = e.target.checked;
                    }
                    await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                }
            }
        });

        document.body.addEventListener('click', async (e) => {
            window.userInteracted = true;
            const player = document.getElementById('video-player');
            const unmuteBtn = document.getElementById('unmute-btn');
            if (player) player.muted = false;
            if (unmuteBtn) unmuteBtn.classList.add('hidden');

            if (e.target.closest('.enter-course-btn') && !e.target.closest('#dpp-course-grid') && !e.target.closest('#notes-course-grid')) { 
                const btn = e.target.closest('.enter-course-btn');
                const courseId = parseInt(btn.dataset.id);
                const subfolder = btn.dataset.subfolder;
                const course = (window.courses || []).find(c => c.id === courseId);
                if(!course) return;

                const isFromSearch = e.target.closest('#search-results-view') !== null;
                const isFromSubcourse = e.target.closest('#subcourse-view') !== null;
                const viewEl = document.getElementById('subcourse-view');
                if (viewEl) {
                    if (isFromSearch) {
                        viewEl.dataset.origin = 'search-results-view';
                        viewEl.dataset.resumePath = subfolder || '';
                    } else if (!isFromSubcourse) {
                        viewEl.dataset.origin = 'dashboard-view';
                        delete viewEl.dataset.resumePath;
                    }
                }

                if (subfolder) {
                    const isSplit = course.subCourseData && course.subCourseData[subfolder] && course.subCourseData[subfolder].isSplitView;
                    if (isSplit || isFromSearch) {
                        await renderSubcourseView(course.id, subfolder);
                    } else {
                        await playLectureFromAnywhere(courseId, null, isFromSearch ? 'search-results-view' : 'subcourse-view', subfolder);
                    }
                } else {
                    if (course.isSplitView && course.isLinked) {
                        await renderSubcourseView(course.id, '');
                    } else {
                        await playLectureFromAnywhere(courseId, null);
                    }
                }
                return;
            }
            
            const reviewCard = e.target.closest('#review-grid .lecture-review-card, #practice-grid .lecture-review-card');
            if (reviewCard && !e.target.closest('.remove-status-btn')) {
                const currentViewId = document.querySelector('.view.active').id;
                await playLectureFromAnywhere(reviewCard.dataset.courseId, reviewCard.dataset.lectureId, currentViewId);
                return;
            }
            
            const filterResultsCard = e.target.closest('#filter-results-view .course-card');
            if (filterResultsCard) {
                e.preventDefault();
                const courseId = parseInt(filterResultsCard.dataset.courseIdFilter);
                const status = filterResultsCard.dataset.statusFilter;
                await playLectureFromAnywhere(courseId, null, `${status}-view`);
                return;
            }
            
            const studyTogetherBtn = e.target.closest('.study-together-btn');
            if (studyTogetherBtn) {
                const status = studyTogetherBtn.dataset.status;
                await renderStudyTogetherPlayer(status);
                return;
            }
            
            const removeStatusBtn = e.target.closest('.remove-status-btn');
            if (removeStatusBtn) {
                e.stopPropagation();
                const card = removeStatusBtn.parentElement;
                const courseId = parseInt(card.dataset.courseId);
                const lectureId = card.dataset.lectureId;
                const progress = getLectureProgress(courseId, lectureId);
                if (progress) {
                    progress.status = null;
                    await saveLectureProgress(progress);
                    const activeView = document.querySelector('.view.active');
                    if (activeView.id === 'review-view') {
                        renderStatusGrid('review');
                    } else if (activeView.id === 'practice-view') {
                        renderStatusGrid('practice');
                    }
                }
                return;
            }

            // Remove Course / Delete Subcourse
            const removeBtn = e.target.closest('.remove-course-btn');
            if (removeBtn) { 
                e.stopPropagation(); 
                const courseId = parseInt(removeBtn.dataset.id); 
                const subfolder = removeBtn.dataset.subfolder;
                if (subfolder) {
                    showDeleteConfirmModal({
                        title: 'Delete Subfolder',
                        message: 'Do you really want to delete it?',
                        onConfirm: async () => {
                            const course = (window.courses || []).find(c => c.id === courseId);
                            if (course) {
                                course.subCourseData = course.subCourseData || {};
                                course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                                course.subCourseData[subfolder].hidden = true;
                                course.subCourseData[subfolder].isIgnored = true;
                                await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                                await purgeAllDataForDeletedCoursesAndSubfolders();
                                const parentPath = getParentPath(subfolder);
                                await renderSubcourseView(courseId, parentPath);
                                if (typeof renderHistoryView === 'function') renderHistoryView();
                                showToast('Subfolder deleted successfully');
                            }
                        }
                    });
                } else {
                    showDeleteConfirmModal({
                        title: 'Delete Course',
                        message: 'Do you really want to delete it?',
                        onConfirm: async () => {
                            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').delete(courseId).onsuccess = resolve); 
                            if (typeof addDeletedDppKey === 'function') addDeletedDppKey(`${courseId}::*`);
                            if (typeof (window.courses || []) !== 'undefined' && Array.isArray((window.courses || []))) {
                                window.courses = (window.courses || []).filter(c => String(c.id) !== String(courseId));
                            }
                            await purgeAllDataForDeletedCoursesAndSubfolders();
                            await purgeEmptyDppAndNotesEngine();
                            await loadCoursesFromDB(); 
                            if (typeof renderHistoryView === 'function') renderHistoryView();
                            showToast('Course deleted successfully');
                        }
                    });
                }
                return;
            }

            // Relocate Logic
            const relocateBtn = e.target.closest('.relocate-course-btn');
            if (relocateBtn) {
                e.stopPropagation();
                const courseId = parseInt(relocateBtn.dataset.id);
                const subfolder = relocateBtn.dataset.subfolder;
                const course = (window.courses || []).find(c => c.id === courseId);
                if(!course) return;

                try {
                    const newHandle = await window.showDirectoryPicker();
                    if (subfolder) {
                        course.subCourseData = course.subCourseData || {};
                        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                        course.subCourseData[subfolder].handle = newHandle;
                        showToast(`Relocated subfolder: ${subfolder.split('/').pop()}`);
                    } else {
                        course.handle = newHandle;
                        showToast(`Relocated main course: ${course.title}`);
                    }
                    await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                    await refreshCourse(courseId);
                } catch(err) {
                    if (err.name !== 'AbortError') console.error('Relocate failed', err);
                }
                return;
            }
            
            const refreshBtn = e.target.closest('.refresh-course-btn');
            if (refreshBtn) { 
                e.stopPropagation(); 
                const courseId = parseInt(refreshBtn.dataset.id); 
                await refreshCourse(courseId, refreshBtn); 
                return;
            }
            
            const thumbPlaceholder = e.target.closest('.thumbnail-placeholder');
            if (thumbPlaceholder && !e.target.closest('.remove-thumbnail-btn')) { 
                const uploader = document.getElementById('thumbnail-uploader');
                uploader.dataset.courseId = thumbPlaceholder.dataset.id;
                uploader.dataset.subfolder = thumbPlaceholder.dataset.subfolder || '';
                uploader.click(); 
                return;
            }

            if (e.target.closest('.remove-thumbnail-btn')) { 
                e.stopPropagation(); 
                const btn = e.target.closest('.remove-thumbnail-btn'); 
                const courseId = parseInt(btn.dataset.id);
                const subfolder = btn.dataset.subfolder;
                const course = (window.courses || []).find(c => c.id === courseId); 
                if (course) { 
                    if (subfolder) {
                        if (course.subCourseData && course.subCourseData[subfolder]) {
                            delete course.subCourseData[subfolder].thumbnail;
                        }
                    } else {
                        delete course.thumbnail; 
                    }
                    getStore(STORE_NAME, 'readwrite').put(course); 
                    
                    if (subfolder) {
                        const parentPath = getParentPath(subfolder);
                        renderSubcourseView(courseId, parentPath);
                    } else {
                        renderCourseGrid(); 
                    }
                } 
                return;
            }
            
            const filterBtnReview = e.target.closest('#filter-btn-review');
            if(filterBtnReview) showFilteredCoursesView('review');
            const filterBtnPractice = e.target.closest('#filter-btn-practice');
            if(filterBtnPractice) showFilteredCoursesView('practice');

            const clearAllBtn = e.target.closest('#clear-all-pdfs-btn');
            if (clearAllBtn) {
                e.stopPropagation();
                e.preventDefault();
                const detailView = document.getElementById('upload-detail-view');
                if (!detailView) return;
                const rawId = detailView.dataset.courseId;
                if (!rawId) return;
                const courseId = typeof window.parseCourseId === 'function' ? window.parseCourseId(rawId) : rawId;

                const courses = window.courses || [];
                const course = courses.find(c => String(c.id) === String(courseId));
                const courseTitle = course ? course.title : 'this course';

                if (!confirm(`Are you sure you want to delete all attached PDFs in ${courseTitle}? This action cannot be undone.`)) {
                    return;
                }

                let deletedCount = 0;
                if (typeof window.getStore === 'function' && window.PROGRESS_STORE) {
                    try {
                        const allProgress = await new Promise(r => window.getStore(window.PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
                        for (const prog of allProgress) {
                            if (prog && String(prog.courseId) === String(courseId) && (prog.pdfHandle || prog.pdfName)) {
                                delete prog.pdfHandle;
                                delete prog.pdfName;
                                if (typeof window.saveLectureProgress === 'function') {
                                    await window.saveLectureProgress(prog);
                                }
                                deletedCount++;
                            }
                        }
                    } catch (err) {}
                }

                const cProgress = window.courseProgress || {};
                for (const key in cProgress) {
                    if (cProgress[key] && String(cProgress[key].courseId) === String(courseId) && (cProgress[key].pdfHandle || cProgress[key].pdfName)) {
                        delete cProgress[key].pdfHandle;
                        delete cProgress[key].pdfName;
                        if (typeof window.saveLectureProgress === 'function') {
                            await window.saveLectureProgress(cProgress[key]);
                        }
                    }
                }

                if (deletedCount > 0) {
                    if (typeof window.showToast === 'function') window.showToast(`Deleted all ${deletedCount} attached PDFs from ${courseTitle}.`);
                } else {
                    if (typeof window.showToast === 'function') window.showToast(`No attached PDFs found in ${courseTitle}.`);
                }

                const subfolder = detailView.dataset.uploadSubfolder || null;
                if (typeof window.renderLectureUploadDetail === 'function') {
                    await window.renderLectureUploadDetail(courseId, subfolder);
                }
            }

            const uploadNotesBtn = e.target.closest('.upload-notes-btn');
            if (uploadNotesBtn) {
                const courseId = parseInt(uploadNotesBtn.dataset.id);
                const course = (window.courses || []).find(c => c.id === courseId);
                if (course && course.isSplitView && course.isLinked) {
                    await renderUploadSubfolderView(courseId, '');
                } else {
                    document.getElementById('upload-course-grid').classList.add('hidden');
                    document.getElementById('upload-detail-view').classList.remove('hidden');
                    await renderLectureUploadDetail(courseId);
                }
            }

            const uploadSubfolderEnterBtn = e.target.closest('.upload-subfolder-enter-btn');
            if (uploadSubfolderEnterBtn) {
                const courseId = parseInt(uploadSubfolderEnterBtn.dataset.id);
                const subfolder = uploadSubfolderEnterBtn.dataset.subfolder;
                const isSplitDeeper = uploadSubfolderEnterBtn.dataset.split === 'true';
                if (isSplitDeeper) {
                    await renderUploadSubfolderView(courseId, subfolder);
                } else {
                    await renderLectureUploadDetail(courseId, subfolder);
                }
            }

            const uploadDppBtn = e.target.closest('.upload-dpp-btn');
            if (uploadDppBtn) {
                const courseId = parseInt(uploadDppBtn.dataset.id);
                switchView('dpp-upload-view');
                await renderDppUploadView(courseId);
            }

            const dppCourseCard = e.target.closest('#dpp-course-grid .course-card');
            if(dppCourseCard && !e.target.closest('.delete-all-dpps-btn')) {
                const courseId = parseCourseId(dppCourseCard.dataset.courseId);
                await renderDppDetailView(courseId);
            }
            if(e.target.closest('#back-to-dpp-grid')) {
                if (window.location.hash !== '#pratice%20batches') {
                    window.history.pushState(null, '', '#pratice%20batches');
                }
                renderDppCourseSelectionView();
            }

            const dppCourseDeleteBtn = e.target.closest('#dpp-course-grid .course-card .delete-all-dpps-btn');
            if (dppCourseDeleteBtn) {
                e.stopPropagation();
                const courseId = parseCourseId(dppCourseDeleteBtn.closest('.course-card').dataset.courseId);
                const course = (window.courses || []).find(c => String(c.id) === String(courseId));
                const title = course ? course.title : 'this subject';
                if (confirm(`Are you sure you want to delete all DPPs for ${title}? This will also clean up all orphan entries.`)) {
                    const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
                    const courseDpps = allDpps.filter(d => String(d.courseId) === String(courseId));
                    for (const dpp of courseDpps) {
                        await deleteDppEntryAndOrphans(dpp);
                    }

                    const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
                    for (const prog of allProgress) {
                        if (prog && String(prog.courseId) === String(courseId)) {
                            if (prog.assignmentHandle || prog.assignmentName || prog.assignmentType) {
                                delete prog.assignmentHandle;
                                delete prog.assignmentName;
                                delete prog.assignmentType;
                                await saveLectureProgress(prog);
                            }
                        }
                    }

                    await purgeEmptyDppAndNotesEngine();
                    if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
                    if (typeof showToast === 'function') showToast(`All DPPs for ${title} deleted`);
                    await renderDppCourseSelectionView();
                }
                return;
            }

            const notesCourseDeleteBtn = e.target.closest('#notes-course-grid .course-card .delete-all-notes-btn');
            if (notesCourseDeleteBtn) {
                e.stopPropagation();
                const courseId = parseCourseId(notesCourseDeleteBtn.closest('.course-card').dataset.courseId);
                const course = (window.courses || []).find(c => String(c.id) === String(courseId));
                if (confirm(`Are you sure you want to delete all notes for ${course ? course.title : 'this course'}? This action cannot be undone.`)) {
                    let updated = false;
                    for (const key in courseProgress) {
                        if (String(courseProgress[key].courseId) === String(courseId) && courseProgress[key].pdfHandle) {
                            delete courseProgress[key].pdfHandle;
                            delete courseProgress[key].pdfName;
                            saveLectureProgress(courseProgress[key]);
                            updated = true;
                        }
                    }
                    if (updated) {
                        showToast(`All notes for ${course ? course.title : 'this course'} deleted`);
                        renderNotesCourseSelectionView();
                    }
                }
                return;
            }

            const notesCourseCard = e.target.closest('#notes-course-grid .course-card');
            if(notesCourseCard && !e.target.closest('.delete-all-notes-btn')) {
                const courseId = parseCourseId(notesCourseCard.dataset.courseId);
                await renderNotesDetailView(courseId);
            }
             if(e.target.closest('#back-to-notes-grid')) {
                renderNotesCourseSelectionView();
            }
            
            const backToDashboardSub = e.target.closest('#back-to-dashboard-from-sub');
            if (backToDashboardSub) {
                const viewEl = document.getElementById('subcourse-view');
                const currentPath = viewEl.dataset.currentPath || '';
                const origin = viewEl.dataset.origin || 'dashboard-view';
                const resumePath = viewEl.dataset.resumePath;
                
                if (origin === 'home-view' && currentPath === '') {
                    switchView('home-view');
                    viewEl.dataset.origin = 'dashboard-view';
                } else if (origin === 'faculty-view' && currentPath === (resumePath || '')) {
                    const facultyToLoad = window.lastViewedFaculty;
                    window.lastViewedFaculty = null;
                    switchView('faculty-view');
                    if(facultyToLoad) renderFacultyProfile(facultyToLoad);
                    viewEl.dataset.origin = 'dashboard-view';
                    delete viewEl.dataset.resumePath;
                } else if (origin === 'search-results-view') {
                    switchView('search-results-view');
                    viewEl.dataset.origin = 'dashboard-view';
                    delete viewEl.dataset.resumePath;
                } else if (origin === 'continue-view' && currentPath === (resumePath || '')) {
                    renderContinueView();
                    switchView('continue-view');
                    viewEl.dataset.origin = 'dashboard-view';
                    delete viewEl.dataset.resumePath;
                } else if (currentPath === '') {
                    switchView('dashboard-view');
                    viewEl.dataset.origin = 'dashboard-view';
                } else {
                    const parentPath = getParentPath(currentPath);
                    const rawCId = viewEl.dataset.courseId;
                    const cId = (!isNaN(parseInt(rawCId)) && String(parseInt(rawCId)) === String(rawCId)) ? parseInt(rawCId) : rawCId;
                    await renderSubcourseView(cId, parentPath);
                }
                return;
            }
            
            // Rating star click
            const star = e.target.closest('.course-rating i.fa-star');
            if (star) {
                const ratingContainer = star.parentElement;
                const extraInfo = star.closest('.course-extra-info');
                const courseId = parseInt(extraInfo.dataset.id);
                const subfolder = extraInfo.dataset.subfolder;
                
                const course = (window.courses || []).find(c => c.id === courseId);
                if (!course) return;

                const newRating = parseInt(star.dataset.value);

                if (subfolder) {
                    course.subCourseData = course.subCourseData || {};
                    course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                    course.subCourseData[subfolder].rating = (course.subCourseData[subfolder].rating === newRating) ? 0 : newRating;
                } else {
                    course.rating = (course.rating === newRating) ? 0 : newRating; 
                }

                await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                
                const currentRating = subfolder ? course.subCourseData[subfolder].rating : course.rating;
                const allStars = ratingContainer.querySelectorAll('i');
                allStars.forEach((s, i) => {
                    s.classList.toggle('fas', currentRating > i);
                    s.classList.toggle('far', currentRating <= i);
                });
            }
        });
        
        // --- Edit Title/Faculty Listeners ---
        document.body.addEventListener('dblclick', (e) => {
            const titleH3 = e.target.closest('.course-info h3');
            const facultyDiv = e.target.closest('.course-faculty');

            if (titleH3) {
                const courseCard = titleH3.closest('.course-card');
                if (!courseCard || titleH3.querySelector('input')) return;
                
                const originalText = titleH3.textContent;
                titleH3.innerHTML = `<input type="text" class="course-info-input" value="${originalText}" />`;
                const input = titleH3.querySelector('input');
                input.focus();
                input.select();

                const saveTitle = async () => {
                    const courseId = parseInt(courseCard.dataset.id || courseCard.querySelector('.thumbnail-placeholder').dataset.id);
                    const course = (window.courses || []).find(c => c.id === courseId);
                    if (!course) return;

                    const newTitle = input.value.trim();
                    titleH3.textContent = newTitle || originalText;
                    titleH3.title = (newTitle || originalText) + " (Double-click to edit)";
                    
                    if (newTitle && newTitle !== originalText) {
                        const subfolder = courseCard.dataset.subfolder;
                        if (subfolder) {
                            course.subCourseData = course.subCourseData || {};
                            course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                            course.subCourseData[subfolder].customName = newTitle;
                            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                        } else if (newTitle !== course.title) {
                            course.title = newTitle;
                            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                        }
                    }
                };
                input.addEventListener('blur', saveTitle);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') input.blur();
                    if (ev.key === 'Escape') {
                        input.removeEventListener('blur', saveTitle);
                        titleH3.textContent = originalText;
                    }
                });

            } else if (facultyDiv) {
                if (facultyDiv.querySelector('input')) return;
            
                const extraInfo = facultyDiv.parentElement;
                const courseId = parseInt(extraInfo.dataset.id);
                const subfolder = extraInfo.dataset.subfolder;
                
                const originalText = facultyDiv.textContent;
                facultyDiv.innerHTML = `<input type="text" class="course-faculty-input" value="${originalText === 'N/A Faculty' ? '' : originalText}" />`;
                const input = facultyDiv.querySelector('input');
                input.focus();
                input.select();
            
                const saveFacultyName = async () => {
                    const course = (window.courses || []).find(c => c.id === courseId);
                    if (!course) return;

                    const newName = input.value.trim();
                    
                    if (subfolder) {
                        course.subCourseData = course.subCourseData || {};
                        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                        if (newName !== (course.subCourseData[subfolder].facultyName || '')) {
                            course.subCourseData[subfolder].facultyName = newName || null;
                            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                        }
                    } else {
                         if (newName !== (course.facultyName || '')) {
                             course.facultyName = newName || null;
                             await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                         }
                    }
                    facultyDiv.textContent = getSubfolderFacultyName(course, subfolder);
                };
                
                input.addEventListener('blur', saveFacultyName);
                input.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter') input.blur();
                    if (ev.key === 'Escape') {
                        input.removeEventListener('blur', saveFacultyName);
                        facultyDiv.textContent = originalText;
                    }
                });
            }
        });


        // --- Player View Listeners ---
        document.getElementById('chapter-list')?.addEventListener('click', async (e) => {
            const lectureLi = e.target.closest('li');
            const chapterTitle = e.target.closest('.chapter-title');

            if(chapterTitle && !e.target.closest('.chapter-drag-handle') && !e.target.classList.contains('chapter-title-text')) { 
                chapterTitle.parentElement.classList.toggle('open'); 
                return; 
            }
            if(!lectureLi) return;

            const lectureId = lectureLi.dataset.lectureId;
            const courseIdOverride = lectureLi.dataset.courseId;
            const targetCourse = courseIdOverride ? (window.courses || []).find(c => c.id === parseInt(courseIdOverride)) : currentCourse;
            const lectureProgress = getLectureProgress(targetCourse.id, lectureId);
            const lecture = targetCourse.lectures.find(l => l.id === lectureId);

            if (e.target.closest('.add-pdf-btn')) {
                document.getElementById('add-pdf-input').dataset.lectureId = lectureId;
                document.getElementById('add-pdf-input').click();
            } else if (e.target.closest('.add-assignment-btn')) {
                document.getElementById('add-assignment-input').dataset.lectureId = lectureId;
                document.getElementById('add-assignment-input').click();
            } else if (e.target.closest('.view-pdf-btn')) {
                if (lectureProgress.pdfHandle) {
                    if (activeViewerFileType === 'pdf' && activeViewerLectureId === lectureId && !mediaViewer.classList.contains('hidden')) hideMediaViewer();
                    else showMediaViewer(lectureProgress.pdfHandle, 'PDF', lectureProgress.pdfName, lectureProgress);
                }
            } else if (e.target.closest('.view-assignment-btn')) {
                if (lectureProgress.assignmentHandle) {
                    if (activeViewerFileType === 'assignment' && activeViewerLectureId === lectureId && !mediaViewer.classList.contains('hidden')) hideMediaViewer();
                    else showMediaViewer(lectureProgress.assignmentHandle, 'Assignment', lectureProgress.assignmentName, lectureProgress);
                }
            } else if (e.target.closest('.status-btn')) {
                e.stopPropagation();
                const btn = e.target.closest('.status-btn');
                const currentStatus = lectureProgress.status;
                let newStatus = 'review';
                if (currentStatus === 'review') newStatus = 'practice';
                else if (currentStatus === 'practice') newStatus = null;
                btn.className = 'status-btn';
                if (newStatus) btn.classList.add(newStatus);
                btn.textContent = newStatus ? newStatus.toUpperCase() : 'STATUS';
                await saveLectureProgress({ ...lectureProgress, status: newStatus, courseTitle: targetCourse.title, lectureName: lecture.displayName, lectureDuration: lecture.duration, courseId: targetCourse.id, lectureId: lectureId });
            } else if(e.target.closest('.lecture-checkbox')) {
                e.stopPropagation();
                const checkbox = e.target.closest('.lecture-checkbox');
                const isCompleted = !checkbox.classList.contains('completed');
                checkbox.classList.toggle('completed');
                lectureLi.querySelector('.lecture-title').classList.toggle('completed');
                await saveLectureProgress({ 
                    ...lectureProgress, 
                    completed: isCompleted, 
                    courseId: targetCourse.id, 
                    lectureId: lectureId,
                    lectureName: lecture.displayName,
                    courseTitle: targetCourse.title,
                    lectureDuration: lecture.duration
                });
                updateMenuProgress(currentSubfolder);
                updateTotalTimeLeftDisplay();
            } else if (!e.target.classList.contains('lecture-title-input')) {
                playVideo(lectureLi);
            }
        });
        
        document.getElementById('chapter-list')?.addEventListener('dblclick', (e) => {
            const titleDiv = e.target.closest('.lecture-title, .chapter-title-text');
            if (!titleDiv || titleDiv.querySelector('input')) return;

            const isChapter = titleDiv.classList.contains('chapter-title-text');
            const originalText = titleDiv.textContent;
            
            titleDiv.innerHTML = `<input type="text" class="lecture-title-input" value="${originalText}" />`;
            const input = titleDiv.querySelector('input');
            input.focus();
            input.select();
            
            const saveRename = async () => {
                const newName = input.value.trim();
                if (isChapter) {
                    const chapterDiv = titleDiv.closest('.chapter');
                    const oldName = chapterDiv.dataset.chapterName; // this retains the full path
                    
                    // We only want to rename the final segment of the folder
                    if (newName && newName !== originalText) {
                        const chapter = currentCourse.chapters.find(c => c.name === oldName);
                        if(chapter) {
                            const oldSegments = oldName.split('/');
                            oldSegments.pop();
                            const newFullPath = oldSegments.length > 0 ? oldSegments.join('/') + '/' + newName : newName;
                            
                            chapter.name = newFullPath;
                            currentCourse.lectures.forEach(l => {
                                if (l.chapter === oldName) l.chapter = newFullPath;
                            });
                            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                            chapterDiv.dataset.chapterName = newFullPath;
                        }
                    }
                    titleDiv.innerHTML = newName || originalText;
                } else {
                    const li = titleDiv.closest('li');
                    const lectureId = li.dataset.lectureId;
                    const courseIdOverride = li.dataset.courseId;
                    const targetCourse = courseIdOverride ? (window.courses || []).find(c => c.id === parseInt(courseIdOverride)) : currentCourse;
                    const lecture = targetCourse.lectures.find(l => l.id === lectureId);
                    
                    if (lecture && newName && newName !== lecture.displayName) {
                        lecture.displayName = newName;
                        await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(targetCourse).onsuccess = resolve);
                        const progress = getLectureProgress(targetCourse.id, lectureId);
                        if (progress) {
                            await saveLectureProgress({ ...progress, lectureName: newName, courseId: targetCourse.id, lectureId: lectureId });
                        }
                    }
                    if (lecture) {
                        titleDiv.innerHTML = newName || lecture.displayName;
                        titleDiv.title = (newName || lecture.displayName) + " (Double-click to rename)";
                        li.querySelector('.status-btn').dataset.lectureName = newName || lecture.displayName;
                    }
                }
            };

            input.addEventListener('blur', saveRename);
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') input.blur();
                if (ev.key === 'Escape') {
                    input.removeEventListener('blur', saveRename);
                    titleDiv.innerHTML = originalText;
                }
            });
        });

        document.getElementById('add-pdf-input')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const lectureId = e.target.dataset.lectureId;
            if (file && lectureId) {
                const folderDisplayName = currentSubfolder ? getSubfolderDisplayName(currentCourse, currentSubfolder) : (currentCourse ? currentCourse.title : 'DPP');
                const facultyName = getSubfolderFacultyName(currentCourse, currentSubfolder);
                let num = 1;
                if (currentCourse && currentCourse.lectures) {
                    let lectures = currentCourse.lectures;
                    if (currentSubfolder) lectures = currentCourse.lectures.filter(l => l.chapter === currentSubfolder || l.chapter.startsWith(currentSubfolder + '/'));
                    const idx = lectures.findIndex(l => String(l.id) === String(lectureId));
                    if (idx !== -1) num = idx + 1;
                }
                const autoName = `${folderDisplayName} ${num}`;
                const progressData = getLectureProgress(currentCourse.id, lectureId);
                await saveLectureProgress({ ...progressData, pdfHandle: file, pdfName: autoName, faculty: facultyName, teacher: facultyName, folderName: currentSubfolder || '', chapter: currentSubfolder || '', courseId: currentCourse.id, lectureId: lectureId });
                await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
                await showMediaViewer(file, 'PDF', autoName, getLectureProgress(currentCourse.id, lectureId));
            }
            e.target.value = null;
        });

        document.getElementById('add-assignment-input')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const lectureId = e.target.dataset.lectureId;
            if (file && lectureId) {
                const folderDisplayName = currentSubfolder ? getSubfolderDisplayName(currentCourse, currentSubfolder) : (currentCourse ? currentCourse.title : 'DPP');
                const facultyName = getSubfolderFacultyName(currentCourse, currentSubfolder);
                let num = 1;
                if (currentCourse && currentCourse.lectures) {
                    let lectures = currentCourse.lectures;
                    if (currentSubfolder) lectures = currentCourse.lectures.filter(l => l.chapter === currentSubfolder || l.chapter.startsWith(currentSubfolder + '/'));
                    const idx = lectures.findIndex(l => String(l.id) === String(lectureId));
                    if (idx !== -1) num = idx + 1;
                }
                const autoName = `${folderDisplayName} ${num}`;
                const progressData = getLectureProgress(currentCourse.id, lectureId);
                await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: autoName, assignmentType: file.type, faculty: facultyName, teacher: facultyName, folderName: currentSubfolder || '', chapter: currentSubfolder || '', courseId: currentCourse.id, lectureId: lectureId });
                await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
                await showMediaViewer(file, 'Assignment', autoName, getLectureProgress(currentCourse.id, lectureId));
            }
            e.target.value = null;
        });
        
        document.getElementById('back-to-library-btn')?.addEventListener('click', async () => {
            if (document.fullscreenElement) {
                try { await document.exitFullscreen(); } catch (e) { console.warn(e); }
            }
            hideAutoplayOverlay();
            // Save last played lecture before leaving
            await saveLastPlayedLecture();
            sessionStorage.removeItem('courseflixState');
            videoPlayer.pause(); videoPlayer.removeAttribute('src');
            hideMediaViewer();
            if (window.lastViewedFaculty) {
                const facultyToLoad = window.lastViewedFaculty;
                window.lastViewedFaculty = null;
                switchView('faculty-view');
                renderFacultyProfile(facultyToLoad);
                return;
            }
            const targetView = document.getElementById('back-to-library-btn').dataset.view || 'dashboard-view';
            if (targetView === 'goals') {
                switchView('goals-view');
                return;
            }
            if (targetView === 'calendar') {
                if (window.openCalendarView) {
                    window.openCalendarView();
                } else {
                    switchView('history-view');
                }
                return;
            }
            if (targetView === 'progress-doubts') {
                document.getElementById('progress-iframe').src = 'static/progress.html#doubt-dashboard';
                switchView('progress-view');
                return;
            } else if (targetView === 'subcourse-view') {
                const path = currentSubfolder ? getParentPath(currentSubfolder) : '';
                renderSubcourseView(currentCourse.id, path);
            } else if (targetView.includes('review') || targetView.includes('practice')) {
                showFilteredCoursesView(targetView.split('-')[0]);
            } else if (targetView === 'search-results-view') {
                switchView(targetView);
            } else if (targetView === 'intell-view') {
                switchView('intell-view');
                if (typeof renderIntellView === 'function') renderIntellView();
            } else if (targetView === 'dashboard-view' || targetView === 'continue-view') {
                switchView(targetView);
            } else if (targetView === 'doubts-detail-view') {
                switchView('doubts-view');
                if (currentCourse) {
                    renderDoubtsDetailView(currentCourse.id, currentSubfolder);
                }
            } else {
                switchView(targetView);
            }
        });

        document.getElementById('close-viewer-btn')?.addEventListener('click', minimizeMediaViewer);
        
        document.getElementById('media-viewer-toggle-btn')?.addEventListener('click', () => {
            const isHidden = mediaViewer.classList.contains('hidden');
            if (isHidden) {
                const lectureId = currentLectureLi.dataset.lectureId;
                const progress = getLectureProgress(currentCourse.id, lectureId);
                let fileToShow = null;
                if (activeViewerFileType === 'pdf' && progress.pdfHandle) {
                   fileToShow = { handle: progress.pdfHandle, type: 'PDF', name: progress.pdfName };
                } else if (activeViewerFileType === 'assignment' && progress.assignmentHandle) {
                   fileToShow = { handle: progress.assignmentHandle, type: 'Assignment', name: progress.assignmentName };
                } else if (progress.pdfHandle) {
                   fileToShow = { handle: progress.pdfHandle, type: 'PDF', name: progress.pdfName };
                } else if (progress.assignmentHandle) {
                   fileToShow = { handle: progress.assignmentHandle, type: 'Assignment', name: progress.assignmentName };
                }

                if(fileToShow) {
                    showMediaViewer(fileToShow.handle, fileToShow.type, fileToShow.name, progress);
                }
            } else {
                hideMediaViewer();
            }
        });

        document.getElementById('delete-viewer-file-btn')?.addEventListener('click', async () => {
            const fileType = document.getElementById('delete-viewer-file-btn').dataset.type;
            if (!currentLectureLi || !fileType) return;
            if (confirm(`Are you sure you want to delete this ${fileType}?`)) {
                const lectureId = currentLectureLi.dataset.lectureId;
                const lectureProgress = getLectureProgress(currentCourse.id, lectureId);
                if (fileType === 'pdf') {
                    lectureProgress.pdfHandle = null;
                    lectureProgress.pdfName = null;
                } else if (fileType === 'assignment') {
                    lectureProgress.assignmentHandle = null;
                    lectureProgress.assignmentName = null;
                }
                await saveLectureProgress(lectureProgress);
                hideMediaViewer();
                updateMediaViewerToggleButton();
                await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
            }
        });
        
        setInterval(() => {
            const course = window.currentCourse;
            const lecLi = window.currentLectureLi;
            const player = document.getElementById('video-player');
            const menu = document.getElementById('lecture-menu');
            if (course && lecLi && player && !player.paused) {
                const lectureId = currentLectureLi.dataset.lectureId;
                const currentTime = videoPlayer.currentTime;
                saveLectureProgress({ courseId: course.id, lectureId: lectureId, currentTime: currentTime });
                // Also persist last played lecture to the course for cross-session resume
                course.lastPlayedLecture = { lectureId, currentTime };
                new Promise(r => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = r);
                const state = { view: 'player-view', courseId: course.id, lectureId, currentTime, lastView: window.lastView || 'dashboard-view', sidebarCollapsed: menu ? menu.classList.contains('hidden') : false, subfolder: currentSubfolder, isGoalsPlaylist: document.getElementById('back-to-library-btn').dataset.view === 'goals' };
                sessionStorage.setItem('courseflixState', JSON.stringify(state));
            }
        }, 5000);

        window.addEventListener('beforeunload', () => {
            // Persist session state only — do NOT open the modal on unload
            const player = document.getElementById('video-player');
            const subView = document.getElementById('subcourse-view');
            const isSubcourseView = subView && subView.classList.contains('active');
            const playerView = document.getElementById('player-view');
            const isPlayerView = playerView && playerView.classList.contains('active');

            let activeCourseId = null;
            let activeSubPath = '';

            if (isSubcourseView) {
                activeCourseId = parseInt(subView.dataset.courseId);
                activeSubPath = subView.dataset.currentPath || '';
            } else if (isPlayerView && window.currentCourse) {
                activeCourseId = window.currentCourse.id;
                activeSubPath = window.currentSubfolder || '';
            }

            // Update the manage-courses modal UI state for subcourse context (don't show modal)
            if (activeCourseId) {
                const course = (window.courses || []).find(c => c.id === activeCourseId);
                const subContainer = document.getElementById('add-subcourse-container');
                const subText = document.getElementById('add-subcourse-btn-text');
                const addFolderBtn = document.getElementById('add-folder-btn');
                if (course && subContainer && subText) {
                    const folderDisplay = activeSubPath ? activeSubPath.split('/').pop() : course.title;
                    subText.textContent = `Add Sub-Folder Course in "${folderDisplay}"`;
                    subContainer.style.display = 'block';
                    subContainer.dataset.courseId = activeCourseId;
                    subContainer.dataset.subPath = activeSubPath;
                    if (addFolderBtn) addFolderBtn.style.display = 'none';
                }
            }
        });

        // Wire up modal-overlay close on backdrop click
        const _modalOverlay = document.getElementById('modal-overlay');
        if (_modalOverlay) {
            const closeBtn = _modalOverlay.querySelector('.close-modal-btn');
            if (closeBtn) closeBtn.onclick = () => _modalOverlay.classList.add('hidden');
            _modalOverlay.addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') _modalOverlay.classList.add('hidden'); });
        }
        
        window.triggerAddSubcourse = async function() {
            const subContainer = document.getElementById('add-subcourse-container');
            const courseId = parseInt(subContainer?.dataset.courseId);
            const basePath = subContainer?.dataset.subPath || '';
            
            const courseList = (window.courses || []);
            if (!courseId || !courseList.length) return;
            const course = courseList.find(c => c.id === courseId);
            if (!course) return;
            
            try {
                const dirHandle = await window.showDirectoryPicker({ startIn: 'downloads' });
                const targetSubPath = basePath ? `${basePath}/${dirHandle.name}` : dirHandle.name;
                const courseData = await scanDirectoryHandle(dirHandle, targetSubPath, course.lectures || []);
                
                course.lectures = course.lectures || [];
                course.chapters = course.chapters || [];
                
                if (!course.chapters.some(c => c.name === targetSubPath)) {
                    course.chapters.push({ name: targetSubPath, lectures: [] });
                }
                
                if (courseData && courseData.lectures) {
                    courseData.lectures.forEach(newLec => {
                        if (!course.lectures.some(existing => existing.id === newLec.id)) {
                            course.lectures.push(newLec);
                        }
                    });
                }
                
                if (courseData && courseData.chapters) {
                    courseData.chapters.forEach(newCh => {
                        const existingCh = course.chapters.find(c => c.name === newCh.name);
                        if (existingCh) {
                            newCh.lectures.forEach(newLec => {
                                if (!existingCh.lectures.some(l => l.id === newLec.id)) {
                                    existingCh.lectures.push(newLec);
                                }
                            });
                        } else {
                            course.chapters.push(newCh);
                        }
                    });
                }
                
                const addedVideoCount = courseData ? (courseData.videoCount || 0) : 0;
                const addedDuration = courseData ? (courseData.totalDuration || 0) : 0;
                course.videoCount = (course.videoCount || 0) + addedVideoCount;
                course.totalDuration = (course.totalDuration || 0) + addedDuration;
                
                await new Promise(r => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = r);
                showToast(`Sub-course "${dirHandle.name}" added successfully (${addedVideoCount} videos)!`, false);
                
                const subView = document.getElementById('subcourse-view');
                if (subView && subView.classList.contains('active') && typeof renderSubcourseView === 'function') {
                    await renderSubcourseView(course.id, basePath);
                } else if (typeof loadCoursesFromDB === 'function') {
                    await loadCoursesFromDB();
                }
            } catch (e) {
                if (e.name !== 'AbortError') console.error(e);
            } finally {
                const modal = document.getElementById('modal-overlay');
                if (modal) modal.classList.add('hidden');
            }
        };

        // Event listener removed as React ModalOverlayModal handles clicks

        async function processAndAddCourseFolder(dirHandle) {
            const courseData = await scanDirectoryHandle(dirHandle);
            const videoCount = courseData ? (courseData.videoCount || 0) : 0;
            const newCourse = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                title: dirHandle.name || 'Imported Course',
                handle: dirHandle,
                videoCount: videoCount,
                lectures: courseData ? (courseData.lectures || []) : [],
                totalDuration: courseData ? (courseData.totalDuration || 0) : 0,
                chapters: courseData ? (courseData.chapters || []) : []
            };
            await new Promise((resolve, reject) => {
                const req = getStore(STORE_NAME, 'readwrite').add(newCourse);
                req.onsuccess = resolve;
                req.onerror = reject;
            });
            await loadCoursesFromDB();
            if (videoCount === 0) {
                showToast(`Course folder "${dirHandle.name || 'Course'}" added successfully (0 videos).`, false);
            } else {
                showToast(`Course "${dirHandle.name || 'Course'}" added successfully (${videoCount} videos)!`, false);
            }
            return true;
        }

        function createHandleFromEntry(entry) {
            if (!entry) return null;
            if (entry.isFile) {
                return {
                    kind: 'file',
                    name: entry.name,
                    getFile: () => new Promise((resolve, reject) => entry.file(resolve, reject))
                };
            } else if (entry.isDirectory) {
                return {
                    kind: 'directory',
                    name: entry.name,
                    values: async function* () {
                        const dirReader = entry.createReader();
                        const readBatch = () => new Promise((resolve, reject) => dirReader.readEntries(resolve, reject));
                        let entries;
                        do {
                            entries = await readBatch();
                            for (const childEntry of entries) {
                                const childHandle = createHandleFromEntry(childEntry);
                                if (childHandle) yield childHandle;
                            }
                        } while (entries && entries.length > 0);
                    }
                };
            }
            return null;
        }

        function pickFolderViaFileInput() {
            return new Promise((resolve) => {
                let input = document.getElementById('fallback-folder-input');
                if (!input) {
                    input = document.createElement('input');
                    input.type = 'file';
                    input.id = 'fallback-folder-input';
                    input.webkitdirectory = true;
                    input.directory = true;
                    input.multiple = true;
                    input.style.display = 'none';
                    document.body.appendChild(input);
                }
                input.value = '';
                input.onchange = (e) => {
                    const files = Array.from(e.target.files || []);
                    resolve(files);
                };
                input.oncancel = () => resolve([]);
                input.click();
            });
        }

        async function processAndAddCourseFiles(files) {
            if (!files || files.length === 0) {
                if (typeof window.showToast === 'function') window.showToast('Selected folder is empty or could not be read.', true);
                else alert('Selected folder is empty or could not be read.');
                return false;
            }
            const firstPath = files[0].webkitRelativePath || files[0].name || 'Imported Course';
            const folderName = firstPath.split('/')[0] || 'Imported Course';

            const videoRegex = /\.(mp4|mkv|webm|mov|avi|m4v|ts|flv|wmv|3gp|ogv|mp3|m4a|aac)$/i;
            const chapters = {};
            const lectures = [];

            for (const file of files) {
                if (!videoRegex.test(file.name)) continue;
                const rel = file.webkitRelativePath ? file.webkitRelativePath.substring(folderName.length + 1) : file.name;
                const chapterName = rel.includes('/') ? rel.substring(0, rel.lastIndexOf('/')) : 'Main Content';
                
                if (!chapters[chapterName]) {
                    chapters[chapterName] = { name: chapterName, lectures: [] };
                }
                
                const id = `${file.name}_${file.size}_${file.lastModified}`;
                const lectureData = {
                    id: id,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    displayName: file.name.replace(/\.[^/.]+$/, ""),
                    file: file,
                    duration: 0,
                    chapter: chapterName
                };
                chapters[chapterName].lectures.push(lectureData);
                lectures.push(lectureData);
            }

            const sortedChapters = Object.values(chapters).sort((a, b) => naturalSort(a, b));
            const newCourse = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                title: folderName,
                isLinked: true,
                videoCount: lectures.length,
                lectures: lectures,
                totalDuration: 0,
                chapters: sortedChapters
            };

            await new Promise((resolve, reject) => {
                const req = getStore(STORE_NAME, 'readwrite').add(newCourse);
                req.onsuccess = resolve;
                req.onerror = reject;
            });

            await loadCoursesFromDB();
            if (lectures.length === 0) {
                showToast(`Course folder "${folderName}" added successfully (0 videos).`, false);
            } else {
                showToast(`Course "${folderName}" added successfully (${lectures.length} videos)!`, false);
            }
            return true;
        }

        window.triggerAddCourseFolder = async function() {
            try {
                let dirHandle = null;
                if (typeof window.showDirectoryPicker === 'function') {
                    try {
                        dirHandle = await window.showDirectoryPicker({ startIn: 'downloads' });
                    } catch (err) {
                        if (err.name === 'AbortError') return;
                        try {
                            dirHandle = await window.showDirectoryPicker();
                        } catch (err2) {
                            if (err2.name === 'AbortError') return;
                        }
                    }
                }

                if (dirHandle) {
                    await processAndAddCourseFolder(dirHandle);
                } else {
                    const files = await pickFolderViaFileInput();
                    if (files && files.length > 0) {
                        await processAndAddCourseFiles(files);
                    }
                }
            } catch (e) {
                if (e.name !== 'AbortError') {
                    console.error(e);
                    if (typeof showToast === 'function') showToast('Error adding course folder: ' + (e.message || e), true);
                }
            } finally {
                const modal = document.getElementById('modal-overlay');
                if (modal) modal.classList.add('hidden');
            }
        };

        // Event listeners removed as React ModalOverlayModal handles clicks

        // --- Drag & Drop Course Import (Dashboard Only) ---
        let dashDragCounter = 0;

        function isDashboardActive() {
            const activeView = document.querySelector('.view.active');
            return !activeView || activeView.id === 'dashboard-view-el';
        }

        window.addEventListener('dragenter', (e) => {
            if (!isDashboardActive()) return;
            e.preventDefault();
            dashDragCounter++;
            const overlay = document.getElementById('dashboard-drop-overlay');
            if (overlay) overlay.classList.remove('hidden');
        });

        window.addEventListener('dragover', (e) => {
            if (!isDashboardActive()) return;
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
            }
            const overlay = document.getElementById('dashboard-drop-overlay');
            if (overlay && overlay.classList.contains('hidden')) {
                overlay.classList.remove('hidden');
            }
        });

        window.addEventListener('dragleave', (e) => {
            if (!isDashboardActive()) return;
            e.preventDefault();
            dashDragCounter--;
            if (dashDragCounter <= 0) {
                dashDragCounter = 0;
                const overlay = document.getElementById('dashboard-drop-overlay');
                if (overlay) overlay.classList.add('hidden');
            }
        });

        window.addEventListener('drop', async (e) => {
            if (!isDashboardActive()) return;
            e.preventDefault();
            dashDragCounter = 0;
            const overlay = document.getElementById('dashboard-drop-overlay');
            if (overlay) overlay.classList.add('hidden');

            const folderHandles = [];
            if (e.dataTransfer && e.dataTransfer.items) {
                const items = Array.from(e.dataTransfer.items);
                for (const item of items) {
                    if (item.kind === 'file') {
                        let handle = null;
                        if (typeof item.getAsFileSystemHandle === 'function') {
                            try {
                                handle = await item.getAsFileSystemHandle();
                            } catch (err) {}
                        }
                        if (!handle && typeof item.webkitGetAsEntry === 'function') {
                            try {
                                const entry = item.webkitGetAsEntry();
                                if (entry) handle = createHandleFromEntry(entry);
                            } catch (err) {}
                        }
                        if (handle && handle.kind === 'directory') {
                            folderHandles.push(handle);
                        }
                    }
                }
            }

            if (folderHandles.length === 0) {
                showToast('No course folders found in dropped items. Please drop a course folder.', true);
                return;
            }

            for (let i = 0; i < folderHandles.length; i++) {
                await processAndAddCourseFolder(folderHandles[i]);
                if (i < folderHandles.length - 1) {
                    await new Promise(r => setTimeout(r, 50));
                }
            }
        });

        document.getElementById('thumbnail-uploader')?.addEventListener('change', (e) => { 
            const file = e.target.files[0]; 
            const courseId = parseInt(e.target.dataset.courseId); 
            const subfolder = e.target.dataset.subfolder;
            if (!file || !courseId) return; 

            const reader = new FileReader(); 
            reader.onload = async (event) => { 
                const course = (window.courses || []).find(c => c.id === courseId); 
                if (course) { 
                    if (subfolder) {
                        course.subCourseData = course.subCourseData || {};
                        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                        course.subCourseData[subfolder].thumbnail = event.target.result;
                    } else {
                        course.thumbnail = event.target.result; 
                    }
                    await new Promise(r => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = r);
                    
                    if (subfolder) {
                        const parentPath = getParentPath(subfolder);
                        await renderSubcourseView(courseId, parentPath);
                    } else {
                        await renderCourseGrid(); 
                    }
                } 
            }; 
            reader.readAsDataURL(file); 
        });
        
        document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => {
            lectureMenu.classList.toggle('hidden');
            document.getElementById('sidebar-toggle-btn').classList.toggle('collapsed');
        });
        
        // --- Drag and Drop for Chapters ---
        let draggedChapter = null;

        document.getElementById('chapter-list')?.addEventListener('dragstart', e => {
            if (e.target.classList.contains('chapter')) {
                draggedChapter = e.target;
                setTimeout(() => {
                    draggedChapter.classList.add('dragging');
                }, 0);
            } else {
                e.preventDefault();
            }
        });

        document.getElementById('chapter-list')?.addEventListener('dragend', () => {
            if (draggedChapter) {
                draggedChapter.classList.remove('dragging');
            }
            draggedChapter = null;
            document.querySelectorAll('.chapter-drop-indicator').forEach(el => el.remove());
        });

        document.getElementById('chapter-list')?.addEventListener('dragover', e => {
            e.preventDefault();
            const container = document.getElementById('chapter-list');
            const afterElement = getDragAfterElement(container, e.clientY);
            
            document.querySelectorAll('.chapter-drop-indicator').forEach(el => el.remove());

            const indicator = document.createElement('div');
            indicator.className = 'chapter-drop-indicator';

            if (afterElement == null) {
                container.appendChild(indicator);
            } else {
                container.insertBefore(indicator, afterElement);
            }
        });
        
        document.getElementById('chapter-list')?.addEventListener('drop', async e => {
            e.preventDefault();
            if (!draggedChapter) return;
            
            const fromName = draggedChapter.dataset.chapterName;
            const fromIndex = currentCourse.chapters.findIndex(c => c.name === fromName);

            const dropIndicator = document.getElementById('chapter-list').querySelector('.chapter-drop-indicator');
            const afterElement = dropIndicator ? dropIndicator.nextElementSibling : null;

            let toIndex;
            if (afterElement) {
                const toName = afterElement.dataset.chapterName;
                toIndex = currentCourse.chapters.findIndex(c => c.name === toName);
            } else {
                toIndex = currentCourse.chapters.length;
            }

            if (fromIndex < toIndex) { toIndex--; }
            
            const [movedItem] = currentCourse.chapters.splice(fromIndex, 1);
            currentCourse.chapters.splice(toIndex, 0, movedItem);

            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
            renderChapterList(currentCourse.chapters);
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.chapter:not(.dragging)')];

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
        

        }
        
        document.getElementById('save-custom-course-urls-btn')?.addEventListener('click', async () => {
            if (!currentCourse || !currentCourse.isCustomCourse) return;
            const input = document.getElementById('custom-course-url-input');
            if (!input) return;
            const urls = input.value.split(/\s+/).filter(u => u.trim());
            if (urls.length === 0) {
                showToast("Please enter at least one URL.", true);
                return;
            }

            const startIndex = currentCourse.lectures ? currentCourse.lectures.length + 1 : 1;
            const newLectures = urls.map((url, i) => ({
                id: 'lec_' + Date.now() + '_' + i,
                displayName: 'Lecture ' + (startIndex + i),
                url: url,
                chapter: 'Lectures',
                duration: 0
            }));

            currentCourse.lectures = [...(currentCourse.lectures || []), ...newLectures];
            currentCourse.videoCount = currentCourse.lectures.length;
            
            if (!currentCourse.chapters || currentCourse.chapters.length === 0) {
                currentCourse.chapters = [{
                    name: 'Lectures',
                    lectures: newLectures
                }];
            } else {
                let defaultChapter = currentCourse.chapters.find(c => c.name === 'Lectures');
                if (!defaultChapter) {
                    defaultChapter = { name: 'Lectures', lectures: [] };
                    currentCourse.chapters.push(defaultChapter);
                }
                defaultChapter.lectures = [...defaultChapter.lectures, ...newLectures];
            }

            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(currentCourse).onsuccess = resolve);
            
            input.value = '';
            document.getElementById('custom-course-input-container').classList.add('hidden');
            document.getElementById('video-wrapper').classList.remove('hidden');
            
            renderPlayer(currentCourse.id);
            showToast(`${newLectures.length} lectures added successfully!`);
        });

        document.getElementById('cancel-custom-course-urls-btn')?.addEventListener('click', () => {
            const input = document.getElementById('custom-course-url-input');
            if (input) input.value = '';
            if (currentCourse && currentCourse.lectures && currentCourse.lectures.length > 0) {
                document.getElementById('custom-course-input-container').classList.add('hidden');
                document.getElementById('video-wrapper').classList.remove('hidden');
            } else {
                switchView('dashboard-view');
            }
        });

// Bind window functions for backwards compatibility
if (typeof window !== 'undefined') {
    if (typeof loadLecture !== 'undefined') window.loadLecture = loadLecture;
    if (typeof playNextLecture !== 'undefined') window.playNextLecture = playNextLecture;
    if (typeof triggerSmartSkipCheck !== 'undefined') window.triggerSmartSkipCheck = triggerSmartSkipCheck;
    if (typeof showAutoplayOverlay !== 'undefined') window.showAutoplayOverlay = showAutoplayOverlay;
    if (typeof hideAutoplayOverlay !== 'undefined') window.hideAutoplayOverlay = hideAutoplayOverlay;
}
