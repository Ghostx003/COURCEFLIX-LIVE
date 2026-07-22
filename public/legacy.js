window.initCourseFlix = async function() {

    
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            let isPureBlack = localStorage.getItem('pure-black-theme') === 'true';
            if (isPureBlack) document.documentElement.dataset.theme = 'pure-black';
            themeToggleBtn.addEventListener('click', () => {
                isPureBlack = !isPureBlack;
                localStorage.setItem('pure-black-theme', isPureBlack);
                document.documentElement.dataset.theme = isPureBlack ? 'pure-black' : 'dark';
            });
        }
        // Prevent browser's native scroll-to-hash from pushing nav out of view
        if (window.location.hash) {
            history.scrollRestoration = 'manual';
            window.scrollTo(0, 0);
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            }, 10);
        }
        const DB_NAME = 'CourseFlixDB';
        const DB_VERSION = 12; // Incremented version for history store
        const STORE_NAME = 'courses';
        const PROGRESS_STORE = 'progress';
        const DPP_STORE = 'dpps'; // New store for DPPs
        const DOUBTS_STORE = 'doubts';
        const HISTORY_STORE = 'history';
        let db;

        // --- Database Helper ---
        function openDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = () => reject("Error opening IndexedDB");
                request.onsuccess = () => { db = request.result; window.appDbInitialized = true; resolve(db); };
                request.onupgradeneeded = (event) => { 
                    const upgradeDb = event.target.result;
                    if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) upgradeDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    if (!upgradeDb.objectStoreNames.contains(PROGRESS_STORE)) upgradeDb.createObjectStore(PROGRESS_STORE, { keyPath: 'id' });
                    if (!upgradeDb.objectStoreNames.contains(DPP_STORE)) upgradeDb.createObjectStore(DPP_STORE, { keyPath: 'id', autoIncrement: true });
                    if (!upgradeDb.objectStoreNames.contains(DOUBTS_STORE)) upgradeDb.createObjectStore(DOUBTS_STORE, { keyPath: 'id', autoIncrement: true });
                    if (!upgradeDb.objectStoreNames.contains(HISTORY_STORE)) upgradeDb.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
                };
                request.onblocked = () => {
                    alert("Database update blocked! Please close other tabs of CourseFlix and refresh the page.");
                    reject("Blocked");
                };
            });
        }
        function getStore(storeName, mode) { return db.transaction(storeName, mode).objectStore(storeName); }

        // --- DOM Elements ---
        const nav = document.querySelector('nav');
        
        const homeBtn = document.getElementById('home-btn');
        
        const courseGrid = document.getElementById('course-grid');
        const reviewGrid = document.getElementById('review-grid');
        const practiceGrid = document.getElementById('practice-grid');
        const playerView = document.getElementById('player-view');
        const videoWrapper = document.getElementById('video-wrapper');
        const videoPlayer = document.getElementById('video-player');
        const brownNoiseAudio = document.getElementById('brown-noise-audio');
        const unmuteBtn = document.getElementById('unmute-btn');
        const chapterListDiv = document.getElementById('chapter-list');
        const courseTitleMenu = document.getElementById('course-title-menu');
        const backToLibraryBtn = document.querySelector('#player-view .back-link');
        const playPauseBtn = document.getElementById('play-pause-btn');
        const timeline = document.querySelector('.timeline');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const leftSeekOverlay = document.getElementById('left-seek-overlay');
        const rightSeekOverlay = document.getElementById('right-seek-overlay');
        const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
        const mediaViewerToggleBtn = document.getElementById('media-viewer-toggle-btn');
        const lectureMenu = document.getElementById('lecture-menu');
        const speedBtn = document.getElementById('speed-btn');
        const mediaViewer = document.getElementById('media-viewer');
        const mediaViewerFrame = document.getElementById('media-viewer-frame');
        const viewerTitle = document.getElementById('viewer-title');
        const addPdfInput = document.getElementById('add-pdf-input');
        const addAssignmentInput = document.getElementById('add-assignment-input');
        const mediaResizeHandle = document.getElementById('media-resize-handle');
        const deleteViewerFileBtn = document.getElementById('delete-viewer-file');
        const totalTimeDisplay = document.getElementById('total-time-left-display');
        const closeViewerBtn = document.getElementById('close-viewer-btn');
        const importZipInput = document.getElementById('import-zip-input');
        const bookmarksContainer = document.getElementById('bookmarks-container');
        const clearBookmarksBtn = document.querySelector('.clear-bookmarks-btn');
        const toggleCompletedBtn = document.getElementById('toggle-completed-btn');

        let hideCompletedLectures = false;
        toggleCompletedBtn.addEventListener('click', () => {
            hideCompletedLectures = !hideCompletedLectures;
            if (hideCompletedLectures) {
                chapterListDiv.classList.add('hide-completed-lectures');
                toggleCompletedBtn.innerHTML = '<i class="fas fa-eye"></i>';
                toggleCompletedBtn.title = "Show Completed Lectures";
                toggleCompletedBtn.style.color = "var(--accent-primary)";
            } else {
                chapterListDiv.classList.remove('hide-completed-lectures');
                toggleCompletedBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                toggleCompletedBtn.title = "Hide Completed Lectures";
                toggleCompletedBtn.style.color = "var(--text-secondary)";
            }
        });

        let courses = [];
        let currentCourse = null;
        let currentSubfolder = null; // Track current subfolder path to properly scope the player
        let currentLectureLi = null;
        let isGoalsMode = false;
        let currentGoalsLectures = [];
        let courseProgress = {};
        let cachedHistory = null;
        let clickTimer = null;
        let lastView = 'dashboard-view';
        let activeFileUrl = null;
        let activeViewerFileType = null;
        let activeViewerLectureId = null;
        let isResizing = false;
        let userInteracted = false;

        // --- Utility Functions ---
        function formatTime(timeInSeconds, withHours = true) {
            const time = Math.round(timeInSeconds || 0);
            const hours = Math.floor(time / 3600);
            const minutes = Math.floor((time % 3600) / 60);
            const seconds = Math.floor(time % 60);
            if (hours > 0 && withHours) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        function formatDuration(seconds) {
            if (isNaN(seconds) || seconds < 0) seconds = 0;
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
        }
        function formatTotalDuration(seconds) {
            if (isNaN(seconds) || seconds <= 0) return '0 hours 0 min left';
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours} hours ${minutes} min left`;
        }
        const naturalSort = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        const naturalSortByNameOnly = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        function getParentPath(path) {
            if (!path) return '';
            const parts = path.split('/');
            parts.pop();
            return parts.join('/');
        }

        async function getVideoDuration(file) { return new Promise(r => {const v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=()=>{r(v.duration);URL.revokeObjectURL(v.src)};v.onerror=()=>r(0);v.src=URL.createObjectURL(file)}); }
        function showToast(message, isError = false) {
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

        // --- Progress Management ---
        async function loadAllProgress() {
            const allProgress = await new Promise(resolve => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => resolve(e.target.result));
            courseProgress = {};
            allProgress.forEach(item => { courseProgress[item.id] = item; });
        }
        async function saveLectureProgress(data) {
            const progressId = `${data.courseId}_${data.lectureId}`;
            const existing = courseProgress[progressId] || { courseId: data.courseId, lectureId: data.lectureId };
            
            // Add completedAt timestamp if moving to completed
            if (data.completed && !existing.completed) {
                data.completedAt = new Date().toISOString();
            } else if (data.completed === false) {
                data.completedAt = null;
            }
            
            data.lastStudiedAt = new Date().toISOString();
            
            const progressData = { ...existing, ...data, id: progressId };
            await new Promise(resolve => getStore(PROGRESS_STORE, 'readwrite').put(progressData).onsuccess = resolve);
            courseProgress[progressId] = progressData;
            
            // --- NEW: Sync logs to localStorage for progress.html ---
            if (data.completed !== undefined) {
                let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
                const logIndex = cfLogs.findIndex(log => log.lectureId === progressId);
                
                if (data.completed) {
                    if (logIndex === -1) {
                        let faculty = data.faculty || (typeof currentCourse !== 'undefined' && currentCourse && currentCourse.id === data.courseId ? (currentCourse.subCourseData && currentSubfolder && currentCourse.subCourseData[currentSubfolder]?.facultyName ? currentCourse.subCourseData[currentSubfolder].facultyName : currentCourse.facultyName) || 'Unknown' : 'Unknown');
                        let chapter = data.chapter || (typeof currentCourse !== 'undefined' && currentCourse && currentCourse.lectures ? (currentCourse.lectures.find(l => l.id === data.lectureId)?.chapter || 'Unknown') : 'Unknown');
                        
                        cfLogs.push({
                            date: data.completedAt || new Date().toISOString(),
                            course: data.courseTitle || 'Unknown Course',
                            subject: data.courseTitle || 'Unknown Subject',
                            teacher: faculty,
                            chapter: chapter,
                            duration: data.lectureDuration || 0,
                            lectureId: progressId
                        });
                    }
                } else {
                    if (logIndex !== -1) {
                        cfLogs.splice(logIndex, 1);
                    }
                }
                localStorage.setItem('courseflix_logs', JSON.stringify(cfLogs));
            }
            
            if (typeof syncCourseflixSubjects === 'function') {
                syncCourseflixSubjects();
            }
            // --- END NEW ---
            
            if (data.completed !== undefined && data.completed !== existing.completed) {
                const dh = parseFloat(localStorage.getItem('calcDailyHours')) || 7;
                const sp = parseFloat(localStorage.getItem('calcPlaybackSpeed')) || 1.5;
                updateDailyGoalDisplay(dh, sp);
            }
        }

        async function syncCourseflixSubjects() {
            const allCourses = await new Promise(resolve => getStore(STORE_NAME, 'readonly').getAll().onsuccess = e => resolve(e.target.result));
            let cfSubjects = [];
            allCourses.forEach(course => {
                const prog = calculateCourseProgress(course);
                let totalLectures = prog.total;
                let completedLectures = prog.completed;
                cfSubjects.push({
                    id: course.id,
                    name: course.title,
                    faculty: course.facultyName || 'Unknown',
                    totalLectures: totalLectures,
                    completedLectures: completedLectures,
                    remainingDuration: prog.remainingDuration
                });
            });
            localStorage.setItem('courseflix_subjects', JSON.stringify(cfSubjects));
            
            const allDpps = await new Promise(resolve => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => resolve(e.target.result));
            const courseIds = allCourses.map(c => c.id);
            let cfDpps = allDpps
                .filter(d => courseIds.includes(d.courseId))
                .map(d => ({
                    id: d.id,
                    name: d.fileName || d.title || d.id,
                    courseId: d.courseId,
                    status: d.status || 'none'
                }));
            localStorage.setItem('courseflix_dpps', JSON.stringify(cfDpps));
        }

        async function addHistoryEntry(courseId, lectureId, courseTitle, lectureName, duration, subfolder, thumbnail) {
            cachedHistory = null;
            const entry = {
                courseId, lectureId, courseTitle, lectureName, duration, subfolder, thumbnail,
                timestamp: new Date().toISOString()
            };
            return new Promise((resolve, reject) => {
                const request = getStore(HISTORY_STORE, 'readwrite').add(entry);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }
        
        async function getHistoryEntries() {
            if (cachedHistory) return cachedHistory;
            return new Promise((resolve, reject) => {
                const request = getStore(HISTORY_STORE, 'readonly').getAll();
                request.onsuccess = () => {
                    cachedHistory = request.result;
                    resolve(cachedHistory);
                };
                request.onerror = reject;
            });
        }

        async function hideWatchHistoryEntry(id) {
            cachedHistory = null;
            return new Promise((resolve, reject) => {
                const store = getStore(HISTORY_STORE, 'readwrite');
                store.get(id).onsuccess = (e) => {
                    const h = e.target.result;
                    if (h) {
                        if (h.isHiddenFromContinue) {
                            store.delete(id).onsuccess = () => resolve();
                        } else {
                            h.isHiddenFromHistory = true;
                            store.put(h).onsuccess = () => resolve();
                        }
                    } else resolve();
                };
            });
        }
        
        async function clearWatchHistory() {
            cachedHistory = null;
            const history = await getHistoryEntries();
            const store = getStore(HISTORY_STORE, 'readwrite');
            return Promise.all(history.map(h => {
                if (h.isHiddenFromHistory) return Promise.resolve();
                if (h.isHiddenFromContinue) {
                    return new Promise(r => store.delete(h.id).onsuccess = r);
                } else {
                    h.isHiddenFromHistory = true;
                    return new Promise(r => store.put(h).onsuccess = r);
                }
            }));
        }

        async function clearContinueHistory() {
            cachedHistory = null;
            const history = await getHistoryEntries();
            const store = getStore(HISTORY_STORE, 'readwrite');
            return Promise.all(history.map(h => {
                if (h.isHiddenFromContinue) return Promise.resolve();
                if (h.isHiddenFromHistory) {
                    return new Promise(r => store.delete(h.id).onsuccess = r);
                } else {
                    h.isHiddenFromContinue = true;
                    return new Promise(r => store.put(h).onsuccess = r);
                }
            }));
        }
        
        async function hideContinueHistoryByCourseSubfolder(courseId, subfolder) {
            cachedHistory = null;
            const history = await getHistoryEntries();
            const toHide = history.filter(h => h.courseId === courseId && (h.subfolder || '') === subfolder);
            const store = getStore(HISTORY_STORE, 'readwrite');
            return Promise.all(toHide.map(h => {
                if (h.isHiddenFromHistory) {
                    return new Promise(r => store.delete(h.id).onsuccess = r);
                } else {
                    h.isHiddenFromContinue = true;
                    return new Promise(r => store.put(h).onsuccess = r);
                }
            }));
        }

        function getLectureProgress(courseId, lectureId) {
            return courseProgress[`${courseId}_${lectureId}`] || {};
        }

        function getSubfolderDisplayName(course, subfolder) {
            if (!subfolder) return '';
            if (course && course.subCourseData && course.subCourseData[subfolder] && course.subCourseData[subfolder].customName) {
                return course.subCourseData[subfolder].customName;
            }
            return subfolder.split('/').pop();
        }

        function getSubfolderFacultyName(course, fullPath) {
            if (!fullPath) return course.facultyName || 'N/A Faculty';
            const parts = fullPath.split('/');
            for (let i = parts.length; i > 0; i--) {
                const currentPath = parts.slice(0, i).join('/');
                if (course.subCourseData && course.subCourseData[currentPath] && course.subCourseData[currentPath].facultyName) {
                    return course.subCourseData[currentPath].facultyName;
                }
            }
            return course.facultyName || 'N/A Faculty';
        }

        function calculateCourseProgress(course) {
            if (!course.lectures) return { completed: 0, total: course.videoCount || 0, percentage: 0, remainingDuration: course.totalDuration || 0, totalDuration: course.totalDuration || 0 };
            let completed = 0;
            let timeCompleted = 0;
            let activeTotalLectures = 0;
            let activeTotalDuration = 0;
            
            course.lectures.forEach(lecture => {
                let isSubfolderIgnored = false;
                if (course.subCourseData) {
                    for (const sub of Object.keys(course.subCourseData)) {
                         if (course.subCourseData[sub].isIgnored && (lecture.chapter === sub || lecture.chapter.startsWith(sub + '/'))) {
                              isSubfolderIgnored = true;
                              break;
                         }
                    }
                }
                
                if (!isSubfolderIgnored) {
                    activeTotalLectures++;
                    activeTotalDuration += (lecture.duration || 0);
                    const progress = getLectureProgress(course.id, lecture.id);
                    if (progress.completed) {
                        completed++;
                        timeCompleted += (lecture.duration || 0);
                    }
                }
            });
            const percentage = activeTotalLectures > 0 ? (completed / activeTotalLectures) * 100 : 0;
            const remainingDuration = activeTotalDuration - timeCompleted;
            return { completed, total: activeTotalLectures, percentage, remainingDuration: Math.max(0, remainingDuration), totalDuration: activeTotalDuration };
        }
        
        function updateTotalTimeLeftDisplay() {
            let totalSecondsLeft = 0;
            let pendingLectures = 0;
            let totalLecturesCount = 0;
            let totalCompletedLectures = 0;
            courses.forEach(course => {
                if (course.isIgnored) return;
                
                if (!course.lectures) {
                    totalSecondsLeft += (course.totalDuration || 0);
                    pendingLectures += (course.videoCount || 0);
                    totalLecturesCount += (course.videoCount || 0);
                    return;
                }

                course.lectures.forEach(lecture => {
                    let isSubfolderIgnored = false;
                    if (course.isSplitView && course.subCourseData) {
                        for (const sub of Object.keys(course.subCourseData)) {
                             if (course.subCourseData[sub].isIgnored && (lecture.chapter === sub || lecture.chapter.startsWith(sub + '/'))) {
                                  isSubfolderIgnored = true;
                                  break;
                             }
                        }
                    }
                    if (isSubfolderIgnored) return;

                    totalLecturesCount++;
                    const progress = getLectureProgress(course.id, lecture.id);
                    if (!progress.completed) {
                        totalSecondsLeft += (lecture.duration || 0);
                        pendingLectures++;
                    } else {
                        totalCompletedLectures++;
                    }
                });
            });
            
            totalTimeDisplay.dataset.seconds = totalSecondsLeft;
            totalTimeDisplay.dataset.lectures = pendingLectures;
            totalTimeDisplay.dataset.totalLectures = totalLecturesCount;
            totalTimeDisplay.dataset.completedLectures = totalCompletedLectures;

            if (totalSecondsLeft > 0) {
                totalTimeDisplay.textContent = formatTotalDuration(totalSecondsLeft);
                totalTimeDisplay.style.display = 'inline-flex';
            } else {
                totalTimeDisplay.textContent = formatTotalDuration(0);
                 totalTimeDisplay.style.display = 'none';
            }
            
            const dh = parseFloat(localStorage.getItem('calcDailyHours')) || 7;
            const sp = parseFloat(localStorage.getItem('calcPlaybackSpeed')) || 1.5;
            updateDailyGoalDisplay(dh, sp);
        }
        
        function updateDailyGoalDisplay(dailyHours, speed) {
            const targetLectures = Math.ceil(dailyHours / (2 / speed)); // Using 2 hours average
            
            // Count lectures completed today
            const todayStr = new Date().toLocaleDateString();
            let completedToday = [];
            
            Object.values(courseProgress).forEach(prog => {
                if (prog.completed && prog.completedAt) {
                    const completedDate = new Date(prog.completedAt).toLocaleDateString();
                    if (completedDate === todayStr) {
                        completedToday.push(prog);
                    }
                }
            });
            
            const count = completedToday.length;
            const textEl = document.getElementById('daily-goal-text');
            const checkboxEl = document.getElementById('daily-goal-checkbox');
            const dropdownEl = document.getElementById('daily-goal-dropdown');
            
            if (textEl) textEl.textContent = `Goal: ${count}/${targetLectures} lectures`;
            if (checkboxEl) checkboxEl.checked = count >= targetLectures;
            
            // Update dropdown
            if (dropdownEl) {
                if (count === 0) {
                    dropdownEl.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">No lectures completed today.</div>';
                } else {
                    // Sort by completedAt descending (newest first)
                    completedToday.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
                    
                    dropdownEl.innerHTML = completedToday.map(prog => {
                        const timeStr = new Date(prog.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                        return `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-primary); padding-bottom: 4px; margin-bottom: 4px;">
                                    <div style="font-size: 0.8rem; flex-grow: 1; margin-right: 10px; overflow: hidden;">
                                        <strong style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prog.courseTitle || 'Course'}</strong>
                                        <span style="color: var(--text-secondary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prog.lectureName || 'Lecture'}</span>
                                    </div>
                                    <div style="font-size: 0.75rem; color: var(--accent-primary); white-space: nowrap;">${timeStr}</div>
                                </div>`;
                    }).join('');
                }
            }
        }
        
        const dailyGoalDisplay = document.getElementById('daily-goal-display');
        if (dailyGoalDisplay) {
            dailyGoalDisplay.addEventListener('click', (e) => {
                const dropdown = document.getElementById('daily-goal-dropdown');
                dropdown.classList.toggle('hidden');
            });
            
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#daily-goal-display')) {
                    document.getElementById('daily-goal-dropdown')?.classList.add('hidden');
                }
            });
        }

        // --- View Switching & Rendering ---
        function switchView(viewId, pushState = true) {
            const hideNavViews = ['player-view', 'dpp-upload-view', 'filter-results-view', 'notes-detail-view', 'dpp-detail-view', 'plan-view', 'progress-view'];
            if (hideNavViews.includes(viewId)) {
                nav.classList.add('hidden');
            } else {
                nav.classList.remove('hidden');
            }
            
            if (pushState && viewId !== 'subcourse-view' && viewId !== 'player-view') {
                const newHash = '#' + viewId;
                if (window.location.hash !== newHash) {
                    window.history.pushState(null, '', newHash);
                }
            }

            const targetId = viewId === 'dashboard-view' ? 'dashboard-view-el' : viewId;
            document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === targetId));
            document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === viewId));
            
            setTimeout(() => {
                if (viewId === 'review-view' || viewId === 'practice-view') {
                    renderStatusGrid(viewId.split('-')[0]);
                }
                if (viewId === 'dashboard-view') renderCourseGrid();
                if (viewId === 'intell-view') { if (typeof renderIntellView === 'function') renderIntellView(); }
                if (viewId === 'upload-view') {
                     document.getElementById('upload-course-grid').classList.remove('hidden');
                     document.getElementById('upload-subfolder-view').classList.add('hidden');
                     document.getElementById('upload-detail-view').classList.add('hidden');
                     renderUploadView();
                }
                if (viewId === 'dpp-view') renderDppCourseSelectionView();
                if (viewId === 'notes-view') renderNotesCourseSelectionView();
                if (viewId === 'doubts-view') renderDoubtsCourseSelectionView();
                if (viewId === 'continue-view') renderContinueView();
                if (viewId === 'history-view') renderHistoryView();
                if (viewId === 'faculty-view') renderFacultyView();
            }, 10);
            
            if (viewId !== 'player-view') {
                sessionStorage.removeItem('courseflixState');
            }
        }
        
        async function loadCoursesFromDB() {
            const storedCourses = await new Promise(resolve => getStore(STORE_NAME, 'readonly').getAll().onsuccess = e => resolve(e.target.result));
            for (const course of storedCourses) {
                const handle = course.handle;
                if (handle && typeof handle.queryPermission === 'function') {
                    try {
                        course.isLinked = await handle.queryPermission({ mode: 'read' }) === 'granted';
                    } catch (e) {
                        console.warn(`Could not query permission for course "${course.title}". It might need to be relinked.`, e);
                        course.isLinked = false;
                    }
                } else {
                    course.isLinked = false;
                }
            }
            courses = storedCourses;
            await renderCourseGrid();
            if (typeof syncCourseflixSubjects === 'function') {
                await syncCourseflixSubjects();
            }
        }
        
        async function scanDirectoryHandle(dirHandle, basePath = '', cachedLectures = []) {
            const chapters = {};
            const lectures = [];
            let totalDuration = 0;
            const videoRegex = /\.(mp4|mkv|webm|mov|avi)$/i;
            
            async function recurse(currentHandle, path) {
                const chapterName = path || (basePath ? basePath : "Main Content");
                if (!chapters[chapterName]) {
                    chapters[chapterName] = { name: chapterName, lectures: [] };
                }

                const entries = [];
                for await (const entry of currentHandle.values()) {
                    entries.push(entry);
                }
                entries.sort((a, b) => naturalSort(a,b));

                for (const entry of entries) {
                    if (entry.kind === 'file' && videoRegex.test(entry.name)) {
                        try {
                            const file = await entry.getFile();
                            const id = `${entry.name}_${file.size}_${file.lastModified}`;
                            
                            let duration = 0;
                            const cached = cachedLectures.find(l => l.id === id);
                            if (cached && cached.duration) {
                                duration = cached.duration;
                            } else {
                                duration = await getVideoDuration(file);
                            }

                            const lectureData = {
                                id: id,
                                name: entry.name.replace(/\.[^/.]+$/, ""),
                                displayName: cached && cached.displayName ? cached.displayName : entry.name.replace(/\.[^/.]+$/, ""),
                                handle: entry,
                                duration: duration,
                                chapter: chapterName
                            };
                            chapters[chapterName].lectures.push(lectureData);
                            lectures.push(lectureData);
                            totalDuration += duration;
                        } catch (e) {
                            console.error(`Could not process file ${entry.name}:`, e);
                        }
                    } else if (entry.kind === 'directory') {
                        await recurse(entry, path ? `${path}/${entry.name}` : (basePath ? `${basePath}/${entry.name}` : entry.name));
                    }
                }
            }

            await recurse(dirHandle, basePath);
            const sortedChapters = Object.values(chapters).filter(ch => ch.lectures.length > 0).sort((a, b) => naturalSort(a, b));
            return { chapters: sortedChapters, videoCount: lectures.length, lectures, totalDuration };
        }

        function stripHtmlTags(html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        }

        window.jumpToLectureFromIntell = async function(courseId, lectureId, time = null) {
            const course = courses.find(c => c.id == courseId);
            const lecture = (course?.lectures || []).find(l => l.id == lectureId);
            if (!course || !lecture) { showToast('Lecture not found', true); return; }

            const subfolder = lecture.chapter || null;
            await playLectureFromAnywhere(parseInt(courseId), lectureId, 'intell-view', subfolder);
            
            // After player loads, seek to timestamp and open notes sidebar
            setTimeout(() => {
                if (time !== null && videoPlayer) {
                    videoPlayer.currentTime = time;
                }
                const playerView = document.getElementById('player-view');
                const playerNotesSidebar = document.getElementById('player-notes-sidebar');
                if (playerView && !playerView.classList.contains('notes-active')) {
                    playerView.classList.add('notes-active');
                    if (playerNotesSidebar) playerNotesSidebar.classList.remove('hidden');
                    if (typeof loadPlayerNotes === 'function') loadPlayerNotes();
                }
            }, 800);
        }

        function getCoursesWithNotes() {
            const result = [];
            courses.forEach(course => {
                const notes = [];
                (course.lectures || []).forEach(lecture => {
                    const progress = getLectureProgress(course.id, lecture.id);
                    if (progress && progress.notes && progress.notes.trim() !== '') {
                        notes.push({ lecture, progress });
                    }
                });
                if (notes.length > 0) result.push({ course, notes });
            });
            return result;
        }

        window.renderIntellView = function() {
            renderIntellHome();
        }

        window.renderIntellHome = function() {
            const container = document.getElementById('intell-feed-container');
            if (!container) return;
            
            const coursesWithNotes = getCoursesWithNotes();
            if (coursesWithNotes.length === 0) {
                container.innerHTML = "<div class=\"intell-empty-state\">You haven't taken any notes yet! Start watching a lecture and press Q to take notes.</div>";
                return;
            }

            let html = `
                <div class="intell-breadcrumb">
                    <span>Subjects with Notes</span>
                </div>
                <div id="intell-course-grid">
            `;
            
            coursesWithNotes.forEach(({ course, notes }) => {
                const imgUrl = course.thumbnail || 'placeholder.jpg';
                const teacher = getSubfolderFacultyName(course, notes[0].lecture.chapter);
                html += `
                    <div class="intell-course-square" onclick="renderIntellCourse('${course.id}')">
                        <img src="${imgUrl}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=&apos;http://www.w3.org/2000/svg&apos; width=&apos;100&apos; height=&apos;100&apos;%3E%3Crect width=&apos;100&apos; height=&apos;100&apos; fill=&apos;%232a2a35&apos;/%3E%3C/svg%3E'">
                        <div class="intell-course-overlay">
                            <h2 class="intell-course-title">${course.title}</h2>
                            <p class="intell-course-teacher">${teacher} • ${notes.length} Note${notes.length > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
            container.innerHTML = html;
        }

        window.renderIntellCourse = function(courseId) {
            const container = document.getElementById('intell-feed-container');
            if (!container) return;
            
            const coursesWithNotes = getCoursesWithNotes();
            const courseData = coursesWithNotes.find(c => c.course.id == courseId);
            if (!courseData) {
                renderIntellHome();
                return;
            }

            const { course, notes } = courseData;

            let html = `
                <div class="intell-breadcrumb">
                    <a onclick="renderIntellHome()"><i class="fas fa-arrow-left"></i> Subjects</a>
                    <i class="fas fa-chevron-right" style="font-size: 0.8rem; opacity: 0.5;"></i>
                    <span>${course.title}</span>
                </div>
                <div id="intell-lecture-list">
            `;

            notes.forEach(({ lecture, progress }) => {
                html += `
                    <div class="intell-lecture-row" onclick="renderIntellNote('${course.id}', '${lecture.id}')">
                        <div>
                            <div class="intell-lecture-row-title">${lecture.name}</div>
                            <div class="intell-lecture-row-folder"><i class="fas fa-folder-open" style="margin-right: 6px;"></i>${lecture.chapter || course.title}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--text-secondary);"></i>
                    </div>
                `;
            });

            html += `</div>`;
            container.innerHTML = html;
        }

        window.renderIntellNote = function(courseId, lectureId) {
            const container = document.getElementById('intell-feed-container');
            if (!container) return;

            const course = courses.find(c => c.id == courseId);
            const lecture = (course?.lectures || []).find(l => l.id == lectureId);
            const progress = getLectureProgress(courseId, lectureId);
            
            if (!course || !lecture || !progress || !progress.notes) {
                renderIntellHome();
                return;
            }

            container.innerHTML = `
                <div class="intell-breadcrumb">
                    <a onclick="renderIntellCourse('${course.id}')"><i class="fas fa-arrow-left"></i> ${course.title}</a>
                    <i class="fas fa-chevron-right" style="font-size: 0.8rem; opacity: 0.5;"></i>
                    <span>${lecture.name}</span>
                </div>
                <div id="intell-full-note-view" data-course-id="${course.id}" data-lecture-id="${lecture.id}">
                    <div class="intell-full-note-header">
                        <div>
                            <h2>${lecture.name}</h2>
                            <p><i class="fas fa-folder-open" style="margin-right: 6px;"></i>${lecture.chapter || course.title}</p>
                        </div>
                        <a href="#" class="intell-jump-btn" onclick="jumpToLectureFromIntell('${course.id}', '${lecture.id}'); return false;">Go to Lecture <i class="fas fa-external-link-alt" style="margin-left: 4px; font-size: 0.8em;"></i></a>
                    </div>
                    <div class="intell-full-note-content player-notes-editor" style="border:none;box-shadow:none;">
                        ${progress.notes}
                    </div>
                </div>
            `;
        }

        const intellContainerEl = document.getElementById('intell-feed-container');
        if (intellContainerEl) {
            intellContainerEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('timestamp-link')) {
                    const time = parseFloat(e.target.dataset.time);
                    const noteView = e.target.closest('#intell-full-note-view');
                    if (noteView && !isNaN(time)) {
                        const courseId = parseInt(noteView.dataset.courseId);
                        const lectureId = noteView.dataset.lectureId;
                        if (courseId && lectureId) {
                            window.jumpToLectureFromIntell(courseId, lectureId, time);
                        }
                    }
                }
            });
        }

        window.renderIntellSearchResults = function(query) {
            const container = document.getElementById('intell-feed-container');
            if (!container) return;
            
            const coursesWithNotes = getCoursesWithNotes();
            
            let html = `
                <div class="intell-breadcrumb">
                    <a onclick="document.getElementById('intell-search').value = ''; renderIntellHome();"><i class="fas fa-arrow-left"></i> Clear Search</a>
                    <i class="fas fa-chevron-right" style="font-size: 0.8rem; opacity: 0.5;"></i>
                    <span>Search Results for "${query}"</span>
                </div>
                <div id="intell-lecture-list">
            `;

            let found = 0;
            coursesWithNotes.forEach(({ course, notes }) => {
                notes.forEach(({ lecture, progress }) => {
                    const searchText = (course.title + ' ' + (lecture.chapter || '') + ' ' + lecture.name + ' ' + stripHtmlTags(progress.notes)).toLowerCase();
                    if (searchText.includes(query)) {
                        found++;
                        html += `
                            <div class="intell-lecture-row" onclick="renderIntellNote('${course.id}', '${lecture.id}')">
                                <div>
                                    <div class="intell-lecture-row-title">${lecture.name} <span style="font-size: 0.85rem; font-weight: normal; color: var(--accent-primary); margin-left: 8px;">in ${course.title}</span></div>
                                    <div class="intell-lecture-row-folder"><i class="fas fa-folder-open" style="margin-right: 6px;"></i>${lecture.chapter || course.title}</div>
                                </div>
                                <i class="fas fa-chevron-right" style="color: var(--text-secondary);"></i>
                            </div>
                        `;
                    }
                });
            });

            if (found === 0) {
                html += `<div class="intell-empty-state" style="padding: 24px; text-align: center;">No notes found matching "${query}".</div>`;
            }

            html += `</div>`;
            container.innerHTML = html;
        }

        async function renderCourseGrid() {
            courseGrid.innerHTML = '';
            if (courses.length === 0) { 
                courseGrid.innerHTML = `<p id="no-content-message">No courses added. Click 'Add Course' to begin.</p>`;
                totalTimeDisplay.style.display = 'none';
                return;
            }

            updateTotalTimeLeftDisplay();
            
            const sortSelect = document.getElementById('course-sort-select');
            const sortVal = localStorage.getItem('courseSortPref') || 'custom';
            if (sortSelect && sortSelect.value !== sortVal) sortSelect.value = sortVal;
            
            let sortedCourses = [...courses];
            if (sortVal !== 'custom') {
                sortedCourses.sort((a, b) => {
                    const progA = calculateCourseProgress(a);
                    const progB = calculateCourseProgress(b);
                    if (sortVal === 'completion_asc') return progA.percentage - progB.percentage;
                    if (sortVal === 'completion_desc') return progB.percentage - progA.percentage;
                    if (sortVal === 'duration_desc') return progB.totalDuration - progA.totalDuration;
                    if (sortVal === 'duration_asc') return progA.totalDuration - progB.totalDuration;
                    return 0;
                });
            } else {
                sortedCourses.sort((a, b) => (a.order || 0) - (b.order || 0));
            }

            for (const course of sortedCourses) {
                const card = document.createElement('div');
                card.className = 'course-card';
                
                const needsHandleScan = course.lectures && course.lectures.length > 0 && !course.lectures[0].handle;
                if (course.isLinked && course.handle && (!course.lectures || needsHandleScan)) {
                    try {
                        const courseData = await scanDirectoryHandle(course.handle, '', course.lectures || []);
                        course.lectures = courseData.lectures;
                        course.totalDuration = courseData.totalDuration;
                        course.chapters = courseData.chapters;
                        // Save back to local DB so it is not re-scanned on next page load
                        await new Promise(r => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = r);
                    } catch (e) {
                        console.error(`Failed to scan course "${course.title}"`, e);
                    }
                }
                const progress = calculateCourseProgress(course);

                const ratingStarsHTML = Array.from({length: 5}, (_, i) => 
                    `<i class="fa-star ${ (course.rating || 0) > i ? 'fas' : 'far'}" data-value="${i + 1}"></i>`
                ).join('');
                
                const splitViewHtml = course.isLinked ? `
                    <label class="split-view-label" title="Show subfolders as separate courses">
                        <input type="checkbox" class="split-course-cb" data-id="${course.id}" ${course.isSplitView ? 'checked' : ''}>
                        Split by Folders
                    </label>` : '';

                card.innerHTML = `
                    <div class="thumbnail-placeholder ${course.thumbnail ? 'has-thumbnail' : ''}" data-id="${course.id}" style="${course.thumbnail ? `background-image: url('${course.thumbnail}')` : ''}">
                        <i class="fas fa-photo-video"></i>
                        <button class="relocate-course-btn" data-id="${course.id}" title="Relocate Main Course Folder"><i class="fas fa-link"></i></button>
                        <button class="refresh-course-btn" data-id="${course.id}" title="Refresh Course Content"><i class="fas fa-sync-alt"></i></button>
                        <button class="remove-thumbnail-btn" data-id="${course.id}" title="Remove Thumbnail"><i class="fas fa-times"></i></button>
                        <button class="remove-course-btn" data-id="${course.id}" title="Remove Course"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="course-info">
                         <div>
                            <h3 title="${course.title} (Double-click to edit)">${course.title}</h3>
                            <div class="course-extra-info" data-id="${course.id}">
                                <div class="course-faculty" title="Double-click to edit faculty">${course.facultyName || 'N/A Faculty'}</div>
                                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                                    <label class="course-ignore-container" title="Ignore this course from your global remaining time">
                                        <input type="checkbox" class="course-ignore-cb" data-id="${course.id}" ${course.isIgnored ? 'checked' : ''}> Ignore
                                    </label>
                                    <div class="course-rating">${ratingStarsHTML}</div>
                                </div>
                            </div>
                            <p class="course-meta">${progress.total || course.videoCount || 0} videos</p>
                            <div class="course-duration-wrapper">
                                ${progress.totalDuration ? `<div class="course-duration">${formatDuration(progress.totalDuration)} total • ${formatDuration(progress.remainingDuration)} left</div>` : '<div></div>'}
                                ${splitViewHtml}
                            </div>
                        </div>
                        <div class="course-progress-container">
                            <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${progress.percentage}%"></div></div>
                            <div class="course-progress-text">${progress.completed} / ${progress.total || course.videoCount || 0} lectures completed</div>
                        </div>
                        <button class="enter-course-btn" data-id="${course.id}">Enter Course</button>
                    </div>`;
                    
                card.draggable = sortVal === 'custom';
                if (sortVal === 'custom') {
                    card.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', course.id);
                        card.style.opacity = '0.5';
                        card.classList.add('dragging');
                    });
                    card.addEventListener('dragend', () => {
                        card.style.opacity = '1';
                        card.classList.remove('dragging');
                    });
                    card.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        const draggingCard = document.querySelector('.course-card.dragging');
                        if (draggingCard && draggingCard !== card) {
                            const bounding = card.getBoundingClientRect();
                            const offset = e.clientY - bounding.top;
                            if (offset > bounding.height / 2) card.after(draggingCard);
                            else card.before(draggingCard);
                        }
                    });
                    card.addEventListener('drop', async (e) => {
                        e.preventDefault();
                        const cards = Array.from(courseGrid.querySelectorAll('.course-card'));
                        for (let i = 0; i < cards.length; i++) {
                            const cid = parseInt(cards[i].querySelector('.remove-course-btn').dataset.id);
                            const c = courses.find(x => x.id === cid);
                            if (c) {
                                c.order = i;
                                await new Promise(r => getStore(STORE_NAME, 'readwrite').put(c).onsuccess = r);
                            }
                        }
                    });
                }
                
                courseGrid.appendChild(card);
            }
        }

        async function renderSubcourseView(courseId, basePath = '', pushState = true) {
            const course = courses.find(c => c.id === parseInt(courseId));
            if (!course || !course.handle) return;
            
            if (pushState) {
                const newHash = '#subcourse/' + courseId + (basePath ? '/' + encodeURIComponent(basePath) : '');
                if (window.location.hash !== newHash) {
                    window.history.pushState(null, '', newHash);
                }
            }

            if (await course.handle.queryPermission({ mode: 'read' }) !== 'granted') {
                if (await course.handle.requestPermission({ mode: 'read' }) !== 'granted') {
                    showToast('Permission denied.', true);
                    return;
                }
            }

            if (!course.lectures) {
                try {
                    await refreshCourse(course.id, null);
                } catch (e) {
                    showToast("Failed to scan course", true); return;
                }
            }

            course.subCourseData = course.subCourseData || {};
            const subcourseGrid = document.getElementById('subcourse-grid');
            subcourseGrid.innerHTML = '';
            
            // Find relevant chapters that sit inside the basePath
            const relevantChapters = course.chapters.filter(ch => basePath === '' || ch.name.startsWith(basePath + '/') || ch.name === basePath);
            
            // Extract immediate subdirectories
            const immediateSubfoldersSet = new Set();
            relevantChapters.forEach(ch => {
                if (ch.name === basePath) return;
                let relativePath = basePath === '' ? ch.name : ch.name.substring(basePath.length + 1);
                let firstLevelFolder = relativePath.split('/')[0];
                let fullPath = basePath === '' ? firstLevelFolder : `${basePath}/${firstLevelFolder}`;
                immediateSubfoldersSet.add(fullPath);
            });
            
            let immediateSubfolders = Array.from(immediateSubfoldersSet).sort(naturalSortByNameOnly);

            if (immediateSubfolders.length === 0) {
                await playLectureFromAnywhere(course.id, null, 'subcourse-view', basePath);
                return;
            }

            switchView('subcourse-view');
            const viewEl = document.getElementById('subcourse-view');
            viewEl.dataset.currentPath = basePath;
            viewEl.dataset.courseId = courseId;
            
            const titleDisplay = basePath === '' ? course.title : getSubfolderDisplayName(course, basePath);
            document.getElementById('subcourse-parent-title').textContent = titleDisplay + " (Folders)";

            const backLink = document.getElementById('back-to-dashboard-from-sub');
            const resumePath = viewEl.dataset.resumePath;
            if (viewEl.dataset.origin === 'faculty-view' && basePath === (resumePath || '')) {
                backLink.innerHTML = '&larr; Back to Faculty';
            } else if (viewEl.dataset.origin === 'search-results-view') {
                backLink.innerHTML = '&larr; Back to Search';
            } else if (viewEl.dataset.origin === 'continue-view' && basePath === (resumePath || '')) {
                backLink.innerHTML = '&larr; Back to Continue';
            } else {
                if (basePath === '') {
                    backLink.innerHTML = '&larr; Back to Dashboard';
                } else {
                    backLink.textContent = '\u2190 Back to ' + (getParentPath(basePath) === '' ? course.title : getSubfolderDisplayName(course, getParentPath(basePath)));
                }
            }

            immediateSubfolders.forEach(fullPath => {
                const subData = course.subCourseData[fullPath] || {};
                if (subData.hidden) return; // Skip hidden subcourses

                const folderNameOnly = getSubfolderDisplayName(course, fullPath);
                const faculty = getSubfolderFacultyName(course, fullPath);
                const rating = subData.rating !== undefined ? subData.rating : (course.rating || 0);
                const thumb = subData.thumbnail || course.thumbnail || null;

                const subLectures = course.lectures.filter(l => l.chapter === fullPath || l.chapter.startsWith(fullPath + '/'));
                let completed = 0;
                let timeCompleted = 0;
                let subTotalDuration = 0;

                subLectures.forEach(lecture => {
                    subTotalDuration += lecture.duration || 0;
                    const prog = getLectureProgress(course.id, lecture.id);
                    if (prog.completed) {
                        completed++;
                        timeCompleted += lecture.duration || 0;
                    }
                });

                const total = subLectures.length;
                const percentage = total > 0 ? (completed / total) * 100 : 0;
                const remainingDuration = Math.max(0, subTotalDuration - timeCompleted);

                // Does this folder have deeper folders?
                const hasDeeper = course.chapters.some(ch => ch.name.startsWith(fullPath + '/') && ch.name.length > fullPath.length + 1);
                
                const splitViewHtml = hasDeeper ? `
                    <label class="split-view-label" title="Show subfolders as separate courses">
                        <input type="checkbox" class="split-course-cb" data-id="${course.id}" data-subfolder="${fullPath}" ${subData.isSplitView ? 'checked' : ''}>
                        Split Further
                    </label>` : '<div></div>';

                const ratingStarsHTML = Array.from({length: 5}, (_, i) =>
                    `<i class="fa-star ${ rating > i ? 'fas' : 'far'}" data-value="${i + 1}"></i>`
                ).join('');

                const card = document.createElement('div');
                card.className = 'course-card';
                card.dataset.id = course.id; 
                card.dataset.subfolder = fullPath;

                card.innerHTML = `
                    <div class="thumbnail-placeholder ${thumb ? 'has-thumbnail' : ''}" data-id="${course.id}" data-subfolder="${fullPath}" style="${thumb ? `background-image: url('${thumb}')` : ''}">
                        <i class="fas fa-folder-open"></i>
                        <button class="relocate-course-btn" data-id="${course.id}" data-subfolder="${fullPath}" title="Relocate Specific Subfolder"><i class="fas fa-link"></i></button>
                        <button class="refresh-course-btn" data-id="${course.id}" data-subfolder="${fullPath}" title="Refresh Content"><i class="fas fa-sync-alt"></i></button>
                        <button class="remove-thumbnail-btn" data-id="${course.id}" data-subfolder="${fullPath}" title="Remove Thumbnail"><i class="fas fa-times"></i></button>
                        <button class="remove-course-btn" data-id="${course.id}" data-subfolder="${fullPath}" title="Hide Subcourse"><i class="fas fa-eye-slash"></i></button>
                    </div>
                    <div class="course-info">
                        <div>
                            <h3 title="${folderNameOnly}">${folderNameOnly}</h3>
                            <div class="course-extra-info subcourse-extra" data-id="${course.id}" data-subfolder="${fullPath}">
                                <div class="course-faculty" title="Double-click to edit faculty">${faculty}</div>
                                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                                    <label class="course-ignore-container" title="Ignore this topic from your global remaining time">
                                        <input type="checkbox" class="course-ignore-cb" data-id="${courseId}" data-subfolder="${fullPath}" ${subData.isIgnored ? 'checked' : ''}> Ignore
                                    </label>
                                    <div class="course-rating">${ratingStarsHTML}</div>
                                </div>
                            </div>
                            <p class="course-meta">${total} videos</p>
                            <div class="course-duration-wrapper">
                                <div class="course-duration">${formatDuration(subTotalDuration)} total • ${formatDuration(remainingDuration)} left</div>
                                ${splitViewHtml}
                            </div>
                        </div>
                        <div class="course-progress-container">
                            <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${percentage}%"></div></div>
                            <div class="course-progress-text">${completed} / ${total} lectures completed</div>
                        </div>
                        <button class="enter-course-btn" data-id="${course.id}" data-subfolder="${fullPath}">Enter Course</button>
                    </div>
                `;
                subcourseGrid.appendChild(card);
            });
        }

        function showFilteredCoursesView(status) {
            const filterResultsView = document.getElementById('filter-results-view');
            const allItems = Object.values(courseProgress).filter(p => p.status === status);
            const courseIdsWithStatus = [...new Set(allItems.map(item => item.courseId))];
            const coursesToShow = courses.filter(c => courseIdsWithStatus.includes(c.id));
            
            let header = `
                <div class="view-header">
                    <button class="primary-btn" id="back-to-status-view-btn" data-view="${status}-view"><i class="fas fa-arrow-left"></i> Back to ${status.charAt(0).toUpperCase() + status.slice(1)}</button>
                </div>
                <main id="filter-results-grid" class="grid-container"></main>
            `;
            filterResultsView.innerHTML = header;

            const grid = filterResultsView.querySelector('#filter-results-grid');
            if (coursesToShow.length === 0) {
                grid.innerHTML = `<p id="no-content-message">No courses have lectures marked for ${status}.</p>`;
            } else {
                coursesToShow.forEach(course => {
                    const progress = calculateCourseProgress(course);
                    const card = document.createElement('div');
                    card.className = 'course-card';
                    card.dataset.courseIdFilter = course.id;
                    card.dataset.statusFilter = status;
                    card.style.cursor = 'pointer';

                    const ratingStarsHTML = Array.from({length: 5}, (_, i) => 
                        `<i class="fa-star ${ (course.rating || 0) > i ? 'fas' : 'far'}"></i>`
                    ).join('');

                    card.innerHTML = `
                         <div class="thumbnail-placeholder ${course.thumbnail ? 'has-thumbnail' : ''}" style="${course.thumbnail ? `background-image: url('${course.thumbnail}')` : ''}">
                             <i class="fas fa-photo-video"></i>
                         </div>
                         <div class="course-info" style="padding: 12px; justify-content: flex-start;">
                             <h3>${course.title}</h3>
                             <div class="course-extra-info">
                                <div class="course-faculty">${course.facultyName || 'N/A Faculty'}</div>
                                <div class="course-rating" style="pointer-events: none;">${ratingStarsHTML}</div>
                            </div>
                             <div class="course-progress-container" style="margin-top: auto;">
                                 <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${progress.percentage}%"></div></div>
                                 <div class="course-progress-text">${progress.completed} / ${progress.total || course.videoCount || 0} completed</div>
                             </div>
                         </div>`;
                    grid.appendChild(card);
                });
            }
            switchView('filter-results-view');
        }

        function renderStatusGrid(status, filter = null) {
            const grid = status === 'review' ? reviewGrid : practiceGrid;
            const allItems = Object.values(courseProgress).filter(p => p.status === status);
            const items = allItems.filter(p => !filter || p.courseId === filter);
            
            grid.innerHTML = '';
            if (items.length === 0) {
                const message = filter 
                    ? `No lectures for the selected course are marked for ${status}.` 
                    : `You haven't marked any lectures for ${status}.`;
                grid.innerHTML = `<p id="no-content-message">${message}</p>`; 
                return;
            }

            items.sort((a, b) => {
                const titleA = (a.courseTitle || '') + (a.lectureName || '');
                const titleB = (b.courseTitle || '') + (b.lectureName || '');
                return titleA.localeCompare(titleB);
            }).forEach(item => {
                const card = document.createElement('div');
                card.className = 'lecture-review-card';
                card.dataset.lectureId = item.lectureId;
                card.dataset.courseId = item.courseId;

                const watchedTime = item.currentTime || 0;
                const totalTime = item.lectureDuration || 1;
                const progressPercent = (watchedTime / totalTime) * 100;

                card.innerHTML = `
                    <button class="remove-status-btn" title="Remove Status"><i class="fas fa-times"></i></button>
                    <div class="lecture-review-info">
                        <p class="course-title">${item.courseTitle || 'Unknown Course'}</p>
                        <h3>${item.lectureName || 'Unknown Lecture'}</h3>
                        <div class="lecture-progress-bar"><div class="lecture-progress-fill" style="width: ${progressPercent}%"></div></div>
                        <div class="lecture-review-meta"><span class="time-display">${formatTime(watchedTime)} / ${formatTime(totalTime)}</span></div>
                    </div>
                    <div class="card-action-center">
                        <button class="primary-btn">
                            <i class="fas fa-play"></i> Watch Lecture
                        </button>
                    </div>`;
                grid.appendChild(card);
            });
        }
        
        // --- Upload View ---
        function renderUploadView() {
            const grid = document.getElementById('upload-course-grid');
            grid.innerHTML = '';
            
            if (courses.length === 0) { 
                grid.innerHTML = `<p id="no-content-message">No courses to upload files to. Add a course first.</p>`;
                return;
            }
            courses.forEach(course => {
                const card = document.createElement('div');
                card.className = 'course-card'; 
                card.dataset.courseId = course.id;
                const splitBadge = course.isSplitView && course.isLinked ? `<span style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 600;"><i class="fas fa-folder-tree"></i> Split by Folders</span>` : '';
                 card.innerHTML = `
                    <div class="thumbnail-placeholder ${course.thumbnail ? 'has-thumbnail' : ''}" style="${course.thumbnail ? `background-image: url('${course.thumbnail}')` : ''}">
                         <i class="fas fa-file-upload"></i>
                    </div>
                    <div class="course-info">
                        <h3>${course.title}</h3>
                        <p class="course-meta">${course.videoCount || 0} videos</p>
                        ${splitBadge}
                    </div>
                    <div class="upload-card-actions">
                         <button class="primary-btn upload-notes-btn" data-id="${course.id}"><i class="fas fa-file-alt"></i> Upload Lecture Files</button>
                         <button class="primary-btn upload-dpp-btn" data-id="${course.id}"><i class="fas fa-file-invoice"></i> Upload DPPs</button>
                    </div>`;
                grid.appendChild(card);
            });
        }

        async function renderUploadSubfolderView(courseId, basePath = '') {
            const course = courses.find(c => c.id === parseInt(courseId));
            if (!course || !course.handle) return;

            if (await course.handle.queryPermission({ mode: 'read' }) !== 'granted') {
                if (await course.handle.requestPermission({ mode: 'read' }) !== 'granted') {
                    showToast('Permission denied.', true);
                    return;
                }
            }

            if (!course.lectures) {
                try { await refreshCourse(course.id, null); } catch (e) {
                    showToast("Failed to scan course", true); return;
                }
            }

            course.subCourseData = course.subCourseData || {};

            document.getElementById('upload-course-grid').classList.add('hidden');
            document.getElementById('upload-detail-view').classList.add('hidden');
            const subfolderView = document.getElementById('upload-subfolder-view');
            subfolderView.classList.remove('hidden');
            subfolderView.dataset.courseId = courseId;
            subfolderView.dataset.currentPath = basePath;

            const titleDisplay = basePath === '' ? course.title : getSubfolderDisplayName(course, basePath);
            document.getElementById('upload-subfolder-title').textContent = titleDisplay + " (Upload Folders)";

            const backLink = document.getElementById('back-to-upload-from-subfolder');
            if (basePath === '') {
                backLink.textContent = '\u2190 Back to Upload';
            } else {
                backLink.textContent = '\u2190 Back to ' + (getParentPath(basePath) === '' ? course.title : getSubfolderDisplayName(course, getParentPath(basePath)));
            }

            const relevantChapters = course.chapters.filter(ch => basePath === '' || ch.name.startsWith(basePath + '/') || ch.name === basePath);
            const immediateSubfoldersSet = new Set();
            relevantChapters.forEach(ch => {
                if (ch.name === basePath) return;
                let relativePath = basePath === '' ? ch.name : ch.name.substring(basePath.length + 1);
                let firstLevelFolder = relativePath.split('/')[0];
                let fullPath = basePath === '' ? firstLevelFolder : `${basePath}/${firstLevelFolder}`;
                immediateSubfoldersSet.add(fullPath);
            });

            let immediateSubfolders = Array.from(immediateSubfoldersSet).sort(naturalSortByNameOnly);

            const grid = document.getElementById('upload-subfolder-grid');
            grid.innerHTML = '';

            if (immediateSubfolders.length === 0) {
                // No deeper subfolders - go directly to lecture upload detail
                document.getElementById('upload-subfolder-view').classList.add('hidden');
                document.getElementById('upload-detail-view').classList.remove('hidden');
                await renderLectureUploadDetail(parseInt(courseId), basePath);
                return;
            }

            immediateSubfolders.forEach(fullPath => {
                const subData = course.subCourseData[fullPath] || {};
                if (subData.hidden) return;

                const folderNameOnly = getSubfolderDisplayName(course, fullPath);
                const faculty = getSubfolderFacultyName(course, fullPath);
                const thumb = subData.thumbnail || course.thumbnail || null;
                const subLectures = course.lectures.filter(l => l.chapter === fullPath || l.chapter.startsWith(fullPath + '/'));
                const total = subLectures.length;

                // Check if this folder has deeper split subfolders
                const hasDeeper = course.chapters.some(ch => ch.name.startsWith(fullPath + '/') && ch.name.length > fullPath.length + 1);
                const isSplitDeeper = subData.isSplitView && hasDeeper;

                // Count how many lectures have notes/assignments
                let notesCount = 0;
                let assignCount = 0;
                subLectures.forEach(lecture => {
                    const progress = getLectureProgress(course.id, lecture.id);
                    if (progress.pdfHandle) notesCount++;
                    if (progress.assignmentHandle) assignCount++;
                });

                const card = document.createElement('div');
                card.className = 'course-card';
                card.innerHTML = `
                    <div class="thumbnail-placeholder ${thumb ? 'has-thumbnail' : ''}" style="${thumb ? `background-image: url('${thumb}')` : ''}">
                        <i class="fas fa-folder-open"></i>
                    </div>
                    <div class="course-info">
                        <div>
                            <h3 title="${folderNameOnly}">${folderNameOnly}</h3>
                            <div class="course-extra-info">
                                <div class="course-faculty" style="pointer-events:none;">${faculty}</div>
                            </div>
                            <p class="course-meta">${total} videos</p>
                            <div style="display: flex; gap: 12px; font-size: 0.75rem; color: var(--text-secondary);">
                                ${notesCount > 0 ? `<span><i class="fas fa-file-pdf" style="color: var(--accent-primary);"></i> ${notesCount} notes</span>` : ''}
                                ${assignCount > 0 ? `<span><i class="fas fa-file-alt" style="color: var(--accent-primary);"></i> ${assignCount} assignments</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="upload-card-actions">
                         <button class="primary-btn upload-subfolder-enter-btn" data-id="${course.id}" data-subfolder="${fullPath}" data-split="${isSplitDeeper}"><i class="fas fa-file-alt"></i> Upload Lecture Files</button>
                    </div>`;
                grid.appendChild(card);
            });
        }
        
        async function renderLectureUploadDetail(courseId, subfolder = null) {
            const course = courses.find(c => c.id === courseId);
            if (!course) {
                showToast("Could not find course data.", true);
                return;
            }

            if (course.isLinked && course.handle && !course.lectures) {
               await refreshCourse(course.id, null);
            }
            if (!course.lectures) {
                showToast("Could not load lectures for this course.", true);
                return;
            }

            document.getElementById('upload-course-grid').classList.add('hidden');
            document.getElementById('upload-subfolder-view').classList.add('hidden');
            const detailView = document.getElementById('upload-detail-view');
            detailView.classList.remove('hidden');
            detailView.dataset.courseId = courseId;
            detailView.dataset.uploadSubfolder = subfolder || '';

            // Set title and back link
            const backLink = document.getElementById('back-to-upload-grid');
            if (subfolder) {
                const folderName = getSubfolderDisplayName(course, subfolder);
                document.getElementById('upload-course-title').textContent = `${course.title} \u00BB ${folderName}`;
                backLink.textContent = '\u2190 Back to Folders';
            } else {
                document.getElementById('upload-course-title').textContent = course.title;
                backLink.textContent = '\u2190 Back to Courses';
            }

            const list = document.getElementById('upload-lecture-list');
            list.innerHTML = '';
            
            let lectures = [];
            if (subfolder) {
                // Only show lectures from this subfolder
                course.chapters.filter(ch => ch.name === subfolder || ch.name.startsWith(subfolder + '/')).forEach(ch => lectures.push(...ch.lectures));
            } else {
                course.chapters.forEach(ch => lectures.push(...ch.lectures));
            }

            lectures.forEach(lecture => {
                const progress = getLectureProgress(course.id, lecture.id);
                const item = document.createElement('div');
                item.className = 'lecture-item';
                item.dataset.lectureId = lecture.id;
                item.innerHTML = `
                    <span>${lecture.displayName}</span>
                    <div class="file-status">
                        ${progress.pdfHandle ? '<i class="fas fa-file-pdf" title="Notes added"></i>' : ''}
                        ${progress.assignmentHandle ? '<i class="fas fa-file-alt" title="Assignment added"></i>' : ''}
                    </div>`;
                list.appendChild(item);
            });
            
            // Add click listeners for selection
            list.querySelectorAll('.lecture-item').forEach(item => {
                item.addEventListener('click', () => {
                    list.querySelectorAll('.lecture-item.selected').forEach(sel => sel.classList.remove('selected'));
                    item.classList.add('selected');
                });
            });
        }


        // --- Player ---
        function updateMenuProgress(subfolder = null) {
            let lectures = [];
            
            if (isGoalsMode && typeof currentGoalsLectures !== 'undefined') {
                lectures = currentGoalsLectures;
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
            container.querySelector('.course-stats').textContent = `${formatDuration(totalDuration)} total • ${formatDuration(remainingDuration)} remaining`;
            container.querySelector('.menu-progress-fill').style.width = `${percentage}%`;
            container.querySelector('.menu-progress-text').textContent = `${completed}/${lectures.length} lectures completed`;
        }

        async function playLectureFromAnywhere(courseId, lectureId, originView = 'dashboard-view', subfolder = null) {
            lastView = originView;
            const course = courses.find(c => c.id === parseInt(courseId));
            if (!course) {
                showToast('Course not found.', true);
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
            currentCourse = courses.find(c => c.id === parseInt(courseId));
            currentSubfolder = subfolder;
            if (!currentCourse) return;
            switchView('player-view');
            chapterListDiv.innerHTML = '<p style="text-align:center; padding: 20px;">Loading lectures...</p>';
            toggleCompletedBtn.classList.add('hidden');
            
            if (!currentCourse.lectures || !currentCourse.chapters) {
                try {
                    await refreshCourse(currentCourse.id, null);
                } catch (error) {
                    console.error('Failed to load course data:', error);
                    chapterListDiv.innerHTML = `<p id="no-content-message">Error: Could not load course content.</p>`;
                    return;
                }
            }

            if (!currentSubfolder && lectureIdToPlay) {
                const targetL = currentCourse.lectures.find(l => l.id === lectureIdToPlay);
                if (targetL) currentSubfolder = targetL.chapter;
            }

            if (window.lastViewedFaculty) {
                backToLibraryBtn.textContent = 'Back to Faculty';
            } else if (originView === 'dashboard-view') {
                backToLibraryBtn.textContent = '← Back to Courses';
            } else if (originView === 'subcourse-view') {
                const subViewEl = document.getElementById('subcourse-view');
                if (subViewEl.dataset.origin === 'continue-view' && currentSubfolder === (subViewEl.dataset.resumePath || '')) {
                    backToLibraryBtn.textContent = '← Back to Continue';
                    originView = 'continue-view';
                } else if (subViewEl.dataset.origin === 'search-results-view') {
                    backToLibraryBtn.textContent = '← Back to Search';
                    originView = 'search-results-view';
                } else {
                    backToLibraryBtn.textContent = currentSubfolder ? '← Back to Folder' : '← Back to Course';
                }
            } else if (originView === 'intell-view') {
                backToLibraryBtn.textContent = '← Back to Notes';
            } else if (originView === 'progress-doubts') {
                backToLibraryBtn.textContent = '← Back to Doubts';
            } else {
                const statusName = originView.split('-')[0];
                backToLibraryBtn.textContent = `← Back to ${statusName.charAt(0).toUpperCase() + statusName.slice(1)}`;
            }
            backToLibraryBtn.dataset.view = originView;
            
            let chaptersToDisplay = currentCourse.chapters;

            if (subfolder) {
                chaptersToDisplay = chaptersToDisplay.filter(ch => ch.name === subfolder || ch.name.startsWith(subfolder + '/'));
                courseTitleMenu.textContent = `${currentCourse.title} - ${getSubfolderDisplayName(currentCourse, subfolder)}`;
                // Only set back view to subcourse-view if we didn't come from doubts, continue, history, or search (preserve those origins)
                if (originView !== 'doubts-detail-view' && originView !== 'continue-view' && originView !== 'history-view' && originView !== 'search-results-view' && originView !== 'progress-doubts' && originView !== 'intell-view') {
                    backToLibraryBtn.dataset.view = 'subcourse-view';
                }
                backToLibraryBtn.dataset.subfolder = subfolder;
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
                liToPlay = chapterListDiv.querySelector(`li[data-lecture-id="${lectureIdToPlay}"]`);
            }
            if (!liToPlay && currentCourse.lastPlayedLecture) {
                liToPlay = chapterListDiv.querySelector(`li[data-lecture-id="${currentCourse.lastPlayedLecture.lectureId}"]`);
                if (liToPlay && resumeTime === null) {
                    resumeTime = currentCourse.lastPlayedLecture.currentTime || null;
                }
            }
            if (!liToPlay) {
                liToPlay = chapterListDiv.querySelector('li');
            }
            if (liToPlay) await playVideo(liToPlay, resumeTime);
        }
        async function renderGoalsPlayer(courseId, lectureIdToPlay) {
            currentCourse = courses.find(c => c.id === parseInt(courseId));
            if (!currentCourse) return;
            switchView('player-view');
            chapterListDiv.innerHTML = '<p style="text-align:center; padding: 20px;">Loading Goals playlist...</p>';
            
            backToLibraryBtn.textContent = 'Back to Goals';
            backToLibraryBtn.dataset.view = 'goals';
            courseTitleMenu.textContent = `Daily Goals Playlist`;
            clearBookmarksBtn.classList.add('hidden');
            toggleCompletedBtn.classList.remove('hidden');

            const saved = localStorage.getItem('courseflix_goals_playlist');
            let goalsPlaylist = [];
            if (saved) {
                goalsPlaylist = JSON.parse(saved);
            }

            if (goalsPlaylist.length === 0) {
                chapterListDiv.innerHTML = '<p id="no-content-message">Playlist is empty.</p>';
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
                const originalCourse = courses.find(c => c.id === parseInt(item.courseId));
                if (originalCourse) {
                    let fullLecture;
                    if (originalCourse.lectures) {
                        fullLecture = originalCourse.lectures.find(l => l.id === item.lectureId.toString());
                        if (!fullLecture && typeof item.lectureId === 'number') {
                             fullLecture = originalCourse.lectures[item.lectureId];
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
                liToPlay = chapterListDiv.querySelector(`li[data-course-id="${courseId}"][data-lecture-id="${lectureIdToPlay}"]`) || chapterListDiv.querySelector(`li[data-lecture-id="${lectureIdToPlay}"]`);
            }
            if (!liToPlay) {
                liToPlay = chapterListDiv.querySelector('li');
            }
            if (liToPlay) await playVideo(liToPlay, null);
        }

        function renderChapterList(chaptersToDisplay, lectureIdToPlay = null) {
             chapterListDiv.innerHTML = '';
             if (!chaptersToDisplay || chaptersToDisplay.length === 0 || (chaptersToDisplay.length === 1 && chaptersToDisplay[0].lectures.length === 0)) {
                 chapterListDiv.innerHTML = `<p id="no-content-message">No lectures found for this course or filter.</p>`;
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

                     const pdfBtn = progress.pdfHandle
                         ? `<button class="file-btn view-pdf-btn" title="${progress.pdfName || 'View Notes'}"><i class="fas fa-file-pdf"></i></button>`
                         : `<button class="file-btn add-pdf-btn" title="Add Notes (PDF)"><i class="fas fa-plus"></i></button>`;

                     const assignBtn = progress.assignmentHandle
                         ? `<button class="file-btn view-assignment-btn" title="${progress.assignmentName || 'View Assignment'}"><i class="fas fa-file-alt"></i></button>`
                         : `<button class="file-btn add-assignment-btn" title="Add Assignment"><i class="fas fa-plus"></i></button>`;

                     lectureLi.innerHTML = `
                         <div class="lecture-checkbox ${progress.completed ? 'completed' : ''}"><i class="fas fa-check"></i></div>
                         <div class="lecture-title ${progress.completed ? 'completed' : ''}" title="${lecture.displayName} (Double-click to rename)">${lecture.displayName}</div>
                         <div class="file-controls">
                             ${pdfBtn}
                             ${assignBtn}
                         </div>
                         <span class="lecture-duration">${formatTime(lecture.duration)}</span>
                         <button class="status-btn ${progress.status || ''}" data-lecture-name="${lecture.displayName}" data-duration="${lecture.duration}">
                             ${progress.status ? progress.status.toUpperCase() : 'STATUS'}
                         </button>`;
                     lectureList.appendChild(lectureLi);
                 }
                 chapterDiv.appendChild(lectureList);
            chapterListDiv.appendChild(chapterDiv);
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
        document.getElementById('autoplay-play-btn').addEventListener('click', () => {
            const nextLi = pendingAutoplayLi;
            hideAutoplayOverlay();
            if (nextLi) playVideo(nextLi);
        });
        document.getElementById('autoplay-cancel-btn').addEventListener('click', () => {
            hideAutoplayOverlay();
        });

        async function saveLastPlayedLecture() {
            if (currentCourse && currentLectureLi) {
                currentCourse.lastPlayedLecture = {
                    lectureId: currentLectureLi.dataset.lectureId,
                    currentTime: videoPlayer.currentTime || 0
                };
                await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(currentCourse).onsuccess = resolve);
            }
        }

        async function playVideo(liElement, startTime = null) {
            autoplayTriggered = false;
            hideAutoplayOverlay(); // Clear any pending autoplay

            if (currentLectureLi) { // Save last played info before switching
                const lastLectureId = currentLectureLi.dataset.lectureId;
                if (lastLectureId !== liElement.dataset.lectureId) {
                    currentCourse.lastPlayedLecture = { lectureId: lastLectureId, currentTime: videoPlayer.currentTime };
                    await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(currentCourse).onsuccess = resolve);
                }
            }
            if (currentLectureLi) currentLectureLi.classList.remove('active');
            currentLectureLi = liElement;
            currentLectureLi.classList.add('active');
            const lectureId = liElement.dataset.lectureId;
            
            const courseIdOverride = liElement.dataset.courseId;
            if (courseIdOverride && parseInt(courseIdOverride) !== currentCourse.id) {
                currentCourse = courses.find(c => c.id === parseInt(courseIdOverride));
            }
            
            const lecture = currentCourse.lectures.find(l => l.id === lectureId);
            if (!lecture) return;

            // Save current lecture as last played immediately
            currentCourse.lastPlayedLecture = { lectureId: lectureId, currentTime: startTime || 0 };
            new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(currentCourse).onsuccess = resolve);

            updateMediaViewerToggleButton();

            try {
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
                        console.warn("Unmuted autoplay blocked, trying muted:", err.message);
                        // Browser blocked unmuted play — start muted and auto-unmute after 1s
                        videoPlayer.muted = true;
                        try {
                            await videoPlayer.play();
                            // Playing muted succeeded — show unmute button instead of auto-unmuting
                            unmuteBtn.classList.remove('hidden');
                        } catch (err2) {
                            // Even muted autoplay failed — show unmute button
                            console.warn("Even muted autoplay failed:", err2.message);
                            unmuteBtn.classList.remove('hidden');
                        }
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
            const course = courses.find(c => c.id === courseId);
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
                let file = (fileHandle.getFile && typeof fileHandle.getFile === 'function') ? await fileHandle.getFile() : fileHandle;
                if (activeFileUrl) URL.revokeObjectURL(activeFileUrl);

                let blobToView = file; 

                if (fileType.toLowerCase() === 'assignment' || fileType.toLowerCase() === 'dpp' || fileType.toLowerCase() === 'note') {
                    blobToView = new Blob([file], { type: 'application/pdf' });
                }

                activeFileUrl = URL.createObjectURL(blobToView);
                
                if (fileType.toLowerCase() === 'dpp') {
                    document.getElementById('dpp-viewer-frame').style.display = 'block';
                    document.getElementById('dpp-viewer-frame').src = activeFileUrl;
                    document.getElementById('dpp-open-external').href = activeFileUrl;
                    document.getElementById('dpp-viewer-header').classList.remove('hidden');
                    document.getElementById('dpp-no-content-message').classList.add('hidden');
                } else if (fileType.toLowerCase() === 'note') {
                    document.getElementById('notes-viewer-frame').style.display = 'block';
                    document.getElementById('notes-viewer-frame').src = activeFileUrl;
                    document.getElementById('notes-open-external').href = activeFileUrl;
                    document.getElementById('notes-viewer-header').classList.remove('hidden');
                    document.getElementById('notes-no-content-message').classList.add('hidden');
                } else {
                    mediaViewerFrame.src = activeFileUrl;
                    viewerTitle.textContent = fileName || file.name;
                    activeViewerFileType = fileType.toLowerCase();
                    activeViewerLectureId = lectureProgress ? lectureProgress.lectureId : null;
                    updateFileSwitcher(lectureProgress, activeViewerFileType);
                    const preferredWidth = localStorage.getItem('viewerWidth') || '500px';
                    playerView.style.setProperty('--viewer-width', preferredWidth);
                    mediaViewer.style.width = preferredWidth;
                    playerView.classList.add('viewer-active');
                    mediaViewer.classList.remove('hidden');
                    mediaViewerToggleBtn.classList.add('hidden');
                    deleteViewerFileBtn.dataset.type = activeViewerFileType;
                    deleteViewerFileBtn.classList.add('visible');
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
            container.innerHTML = '';

            const hasPdf = !!lectureProgress.pdfHandle;
            const hasAssignment = !!lectureProgress.assignmentHandle;

            if (hasPdf && hasAssignment) {
                const otherType = currentType === 'pdf' ? 'assignment' : 'pdf';
                const otherHandle = otherType === 'pdf' ? lectureProgress.pdfHandle : lectureProgress.assignmentHandle;
                const otherName = otherType === 'pdf' ? lectureProgress.pdfName : lectureProgress.assignmentName;

                container.innerHTML = `
                    <button id="file-switcher-btn">${currentType.toUpperCase()} <i class="fas fa-chevron-down fa-xs"></i></button>
                    <div id="file-switcher-dropdown" class="hidden">
                        <button data-type="${otherType}">${otherType === 'pdf' ? 'View Notes' : 'View Assignment'}</button>
                    </div>`;

                const btn = container.querySelector('#file-switcher-btn');
                const dropdown = container.querySelector('#file-switcher-dropdown');
                btn.onclick = () => dropdown.classList.toggle('hidden');
                
                dropdown.querySelector('button').onclick = () => {
                    showMediaViewer(otherHandle, otherType, otherName, lectureProgress);
                };
                document.addEventListener('click', (e) => {
                     if (!container.contains(e.target)) dropdown.classList.add('hidden');
                }, { once: true });
            }
        }
        
        function hideMediaViewer() {
            playerView.classList.remove('viewer-active');
            mediaViewer.classList.add('hidden');
            deleteViewerFileBtn.classList.remove('visible');
            if (activeFileUrl) {
                URL.revokeObjectURL(activeFileUrl);
                activeFileUrl = null;
            }
            mediaViewerFrame.removeAttribute('src'); mediaViewerFrame.srcdoc = '';
            activeViewerFileType = null;
            activeViewerLectureId = null;
            playerView.style.setProperty('--viewer-width', '0px');
            updateMediaViewerToggleButton();
        }

        function updateMediaViewerToggleButton() {
            if (!currentLectureLi) {
                mediaViewerToggleBtn.classList.add('hidden');
                return;
            }
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);
            const hasFiles = progress.pdfHandle || progress.assignmentHandle;
            
            const viewerIsHidden = mediaViewer.classList.contains('hidden');
            mediaViewerToggleBtn.classList.toggle('hidden', !hasFiles || !viewerIsHidden);
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
        homeBtn.addEventListener('click', () => switchView('dashboard-view'));
        
        document.body.addEventListener('change', async (e) => {
            if (e.target.classList.contains('split-course-cb')) {
                const courseId = parseInt(e.target.dataset.id);
                const subfolder = e.target.dataset.subfolder;
                const course = courses.find(c => c.id === courseId);
                
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
            userInteracted = true;
            videoPlayer.muted = false;
            unmuteBtn.classList.add('hidden');

            if (e.target.closest('.enter-course-btn') && !e.target.closest('#dpp-course-grid') && !e.target.closest('#notes-course-grid')) { 
                const btn = e.target.closest('.enter-course-btn');
                const courseId = parseInt(btn.dataset.id);
                const subfolder = btn.dataset.subfolder;
                const course = courses.find(c => c.id === courseId);
                if(!course) return;

                const isFromSearch = e.target.closest('#search-results-view') !== null;
                const isFromSubcourse = e.target.closest('#subcourse-view') !== null;
                const viewEl = document.getElementById('subcourse-view');
                if (isFromSearch) {
                    viewEl.dataset.origin = 'search-results-view';
                    viewEl.dataset.resumePath = subfolder || '';
                } else if (!isFromSubcourse) {
                    viewEl.dataset.origin = 'dashboard-view';
                    delete viewEl.dataset.resumePath;
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
            
            const backToStatusBtn = e.target.closest('#back-to-status-view-btn');
            if(backToStatusBtn) {
                switchView(backToStatusBtn.dataset.view);
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

            // Remove Course / Hide Subcourse
            const removeBtn = e.target.closest('.remove-course-btn');
            if (removeBtn) { 
                e.stopPropagation(); 
                const courseId = parseInt(removeBtn.dataset.id); 
                const subfolder = removeBtn.dataset.subfolder;
                if (subfolder) {
                    if (confirm('Are you sure you want to hide this subcourse?')) {
                        const course = courses.find(c => c.id === courseId);
                        course.subCourseData = course.subCourseData || {};
                        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                        course.subCourseData[subfolder].hidden = true;
                        await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                        const parentPath = getParentPath(subfolder);
                        await renderSubcourseView(courseId, parentPath);
                    }
                } else {
                    if (confirm('Are you sure you want to remove this root course? This will also delete its progress.')) { 
                        await new Promise(resolve => getStore(STORE_NAME, 'readwrite').delete(courseId).onsuccess = resolve); 
                        await loadCoursesFromDB(); 
                    } 
                }
                return;
            }

            // Relocate Logic
            const relocateBtn = e.target.closest('.relocate-course-btn');
            if (relocateBtn) {
                e.stopPropagation();
                const courseId = parseInt(relocateBtn.dataset.id);
                const subfolder = relocateBtn.dataset.subfolder;
                const course = courses.find(c => c.id === courseId);
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
                const course = courses.find(c => c.id === courseId); 
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

            const uploadNotesBtn = e.target.closest('.upload-notes-btn');
            if (uploadNotesBtn) {
                const courseId = parseInt(uploadNotesBtn.dataset.id);
                const course = courses.find(c => c.id === courseId);
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

            const dppCourseCard = e.target.closest('#dpp-course-grid .course-card .enter-course-btn');
            if(dppCourseCard) {
                const courseId = parseInt(dppCourseCard.closest('.course-card').dataset.courseId);
                await renderDppDetailView(courseId);
            }
            if(e.target.closest('#back-to-dpp-grid')) {
                renderDppCourseSelectionView();
            }

            const notesCourseDeleteBtn = e.target.closest('#notes-course-grid .course-card .delete-all-notes-btn');
            if (notesCourseDeleteBtn) {
                e.stopPropagation();
                const courseId = parseInt(notesCourseDeleteBtn.closest('.course-card').dataset.courseId);
                const course = courses.find(c => c.id === courseId);
                if (confirm(`Are you sure you want to delete all notes for ${course.title}? This action cannot be undone.`)) {
                    let updated = false;
                    for (const key in courseProgress) {
                        if (courseProgress[key].courseId === courseId && courseProgress[key].pdfHandle) {
                            delete courseProgress[key].pdfHandle;
                            delete courseProgress[key].pdfName;
                            saveLectureProgress(courseProgress[key]);
                            updated = true;
                        }
                    }
                    if (updated) {
                        showToast(`All notes for ${course.title} deleted`);
                        renderNotesCourseSelectionView();
                    }
                }
                return;
            }

            const notesCourseCard = e.target.closest('#notes-course-grid .course-card .enter-course-btn');
            if(notesCourseCard) {
                const courseId = parseInt(notesCourseCard.closest('.course-card').dataset.courseId);
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
                
                if (origin === 'faculty-view' && currentPath === (resumePath || '')) {
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
                    const cId = parseInt(viewEl.dataset.courseId);
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
                
                const course = courses.find(c => c.id === courseId);
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
                    const course = courses.find(c => c.id === courseId);
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
                    const course = courses.find(c => c.id === courseId);
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
        chapterListDiv.addEventListener('click', async (e) => {
            const lectureLi = e.target.closest('li');
            const chapterTitle = e.target.closest('.chapter-title');

            if(chapterTitle && !e.target.closest('.chapter-drag-handle') && !e.target.classList.contains('chapter-title-text')) { 
                chapterTitle.parentElement.classList.toggle('open'); 
                return; 
            }
            if(!lectureLi) return;

            const lectureId = lectureLi.dataset.lectureId;
            const courseIdOverride = lectureLi.dataset.courseId;
            const targetCourse = courseIdOverride ? courses.find(c => c.id === parseInt(courseIdOverride)) : currentCourse;
            const lectureProgress = getLectureProgress(targetCourse.id, lectureId);
            const lecture = targetCourse.lectures.find(l => l.id === lectureId);

            if (e.target.closest('.add-pdf-btn')) {
                addPdfInput.dataset.lectureId = lectureId;
                addPdfInput.click();
            } else if (e.target.closest('.add-assignment-btn')) {
                addAssignmentInput.dataset.lectureId = lectureId;
                addAssignmentInput.click();
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
        
        chapterListDiv.addEventListener('dblclick', (e) => {
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
                            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(currentCourse).onsuccess = resolve);
                            chapterDiv.dataset.chapterName = newFullPath;
                        }
                    }
                    titleDiv.innerHTML = newName || originalText;
                } else {
                    const li = titleDiv.closest('li');
                    const lectureId = li.dataset.lectureId;
                    const courseIdOverride = li.dataset.courseId;
                    const targetCourse = courseIdOverride ? courses.find(c => c.id === parseInt(courseIdOverride)) : currentCourse;
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

        addPdfInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const lectureId = e.target.dataset.lectureId;
            if (file && lectureId) {
                const progressData = getLectureProgress(currentCourse.id, lectureId);
                await saveLectureProgress({ ...progressData, pdfHandle: file, pdfName: file.name, courseId: currentCourse.id, lectureId: lectureId });
                await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
                await showMediaViewer(file, 'PDF', file.name, getLectureProgress(currentCourse.id, lectureId));
            }
            e.target.value = null;
        });

        addAssignmentInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const lectureId = e.target.dataset.lectureId;
            if (file && lectureId) {
                const progressData = getLectureProgress(currentCourse.id, lectureId);
                await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: file.name, assignmentType: file.type, courseId: currentCourse.id, lectureId: lectureId });
                await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
                await showMediaViewer(file, 'Assignment', file.name, getLectureProgress(currentCourse.id, lectureId));
            }
            e.target.value = null;
        });
        
        backToLibraryBtn.addEventListener('click', async () => {
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
            const targetView = backToLibraryBtn.dataset.view || 'dashboard-view';
            if (targetView === 'goals') {
                switchView('goals-view');
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

        closeViewerBtn.addEventListener('click', hideMediaViewer);
        
        mediaViewerToggleBtn.addEventListener('click', () => {
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

        deleteViewerFileBtn.addEventListener('click', async () => {
            const fileType = deleteViewerFileBtn.dataset.type;
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
            if (currentCourse && currentLectureLi && !videoPlayer.paused) {
                const lectureId = currentLectureLi.dataset.lectureId;
                const currentTime = videoPlayer.currentTime;
                saveLectureProgress({ courseId: currentCourse.id, lectureId: lectureId, currentTime: currentTime });
                // Also persist last played lecture to the course for cross-session resume
                currentCourse.lastPlayedLecture = { lectureId, currentTime };
                new Promise(r => getStore(STORE_NAME, 'readwrite').put(currentCourse).onsuccess = r);
                const state = { view: 'player-view', courseId: currentCourse.id, lectureId, currentTime, lastView, sidebarCollapsed: lectureMenu.classList.contains('hidden'), subfolder: currentSubfolder, isGoalsPlaylist: backToLibraryBtn.dataset.view === 'goals' };
                sessionStorage.setItem('courseflixState', JSON.stringify(state));
            }
        }, 5000);

        window.addEventListener('beforeunload', () => {
            if (document.querySelector('.view.active')?.id === 'player-view' && currentCourse && currentLectureLi) {
                const lectureId = currentLectureLi.dataset.lectureId;
                const currentTime = videoPlayer.currentTime;
                // Save last played lecture synchronously via the existing course object
                currentCourse.lastPlayedLecture = { lectureId, currentTime };
                try { getStore(STORE_NAME, 'readwrite').put(currentCourse); } catch(e) {}
                const state = { view: 'player-view', courseId: currentCourse.id, lectureId, currentTime, lastView, sidebarCollapsed: lectureMenu.classList.contains('hidden'), subfolder: currentSubfolder, isGoalsPlaylist: backToLibraryBtn.dataset.view === 'goals' };
                sessionStorage.setItem('courseflixState', JSON.stringify(state));
            }
        });
        
        document.getElementById('add-course-btn').addEventListener('click', () => {
            const modal = document.getElementById('modal-overlay');
            modal.querySelector('.close-modal-btn').onclick = () => modal.classList.add('hidden');
            modal.classList.remove('hidden');
        });
        document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') e.target.classList.add('hidden'); });
        
        document.getElementById('add-folder-btn').addEventListener('click', async () => { 
            try {
                const dirHandle = await window.showDirectoryPicker({ startIn: 'downloads' });
                const courseData = await scanDirectoryHandle(dirHandle);
                if (courseData.videoCount === 0) {
                    return showToast('No videos found in this folder or its subfolders.', true);
                }
                const newCourse = {
                    id: Date.now(), title: dirHandle.name, handle: dirHandle,
                    videoCount: courseData.videoCount, lectures: courseData.lectures,
                    totalDuration: courseData.totalDuration, chapters: courseData.chapters
                };
                getStore(STORE_NAME, 'readwrite').add(newCourse);
                await loadCoursesFromDB();
            } catch (e) {
                if (e.name !== 'AbortError') console.error(e);
            } finally {
                document.getElementById('modal-overlay').classList.add('hidden');
            }
        });

        document.getElementById('thumbnail-uploader').addEventListener('change', (e) => { 
            const file = e.target.files[0]; 
            const courseId = parseInt(e.target.dataset.courseId); 
            const subfolder = e.target.dataset.subfolder;
            if (!file || !courseId) return; 

            const reader = new FileReader(); 
            reader.onload = async (event) => { 
                const course = courses.find(c => c.id === courseId); 
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
        
        sidebarToggleBtn.addEventListener('click', () => {
            lectureMenu.classList.toggle('hidden');
            sidebarToggleBtn.classList.toggle('collapsed');
        });
        
        // --- Drag and Drop for Chapters ---
        let draggedChapter = null;

        chapterListDiv.addEventListener('dragstart', e => {
            if (e.target.classList.contains('chapter')) {
                draggedChapter = e.target;
                setTimeout(() => {
                    draggedChapter.classList.add('dragging');
                }, 0);
            } else {
                e.preventDefault();
            }
        });

        chapterListDiv.addEventListener('dragend', () => {
            if (draggedChapter) {
                draggedChapter.classList.remove('dragging');
            }
            draggedChapter = null;
            document.querySelectorAll('.chapter-drop-indicator').forEach(el => el.remove());
        });

        chapterListDiv.addEventListener('dragover', e => {
            e.preventDefault();
            const container = chapterListDiv;
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
        
        chapterListDiv.addEventListener('drop', async e => {
            e.preventDefault();
            if (!draggedChapter) return;
            
            const fromName = draggedChapter.dataset.chapterName;
            const fromIndex = currentCourse.chapters.findIndex(c => c.name === fromName);

            const dropIndicator = chapterListDiv.querySelector('.chapter-drop-indicator');
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

            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(currentCourse).onsuccess = resolve);
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
        
        // --- Import / Export ---
        const exportBtn = document.getElementById('export-btn');
        const importBtn = document.getElementById('import-btn');

        function downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        function base64ToBlob(base64) {
            const byteString = atob(base64.split(',')[1]);
            const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeString });
        }
        async function blobToDataURL(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(reader.error);
                reader.readAsDataURL(blob);
            });
        }

        exportBtn.addEventListener('click', async () => {
            if (courses.length === 0) {
                return showToast("There are no courses to export.", true);
            }
            exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Exporting...`;
            exportBtn.disabled = true;

            try {
                const zip = new JSZip();
                const serializableCourses = [];
                const serializableProgress = [];
                const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
                
                for (const course of courses) {
                    const cleanCourse = { ...course };
                    delete cleanCourse.handle; 
                    
                    if (cleanCourse.lectures) {
                        cleanCourse.lectures = cleanCourse.lectures.map(l => {
                            const cleanL = { ...l };
                            delete cleanL.handle;
                            return cleanL;
                        });
                    }
                    if (cleanCourse.chapters) {
                        cleanCourse.chapters = cleanCourse.chapters.map(c => {
                            const cleanC = { ...c };
                            cleanC.lectures = cleanC.lectures.map(l => {
                                const cleanL = { ...l };
                                delete cleanL.handle;
                                return cleanL;
                    return cleanC;
                            });
                            return cleanC;
                        });
                    }
                    
                    if(course.handle) cleanCourse.folderName = course.handle.name;
                    
                    // Backup custom subfolder handles and extract subcourse thumbnails
                    if(cleanCourse.subCourseData) {
                        const newSubData = {};
                        let subIdx = 0;
                        for(const sub in cleanCourse.subCourseData) {
                            const subObj = { ...cleanCourse.subCourseData[sub] };
                            delete subObj.handle;
                            if (subObj.thumbnail && typeof subObj.thumbnail === 'string' && subObj.thumbnail.startsWith('data:')) {
                                try {
                                    const subThumbBlob = base64ToBlob(subObj.thumbnail);
                                    const subThumbFilename = `sub_${course.id}_${subIdx++}.png`;
                                    zip.folder('sub_thumbnails').file(subThumbFilename, subThumbBlob);
                                    subObj.thumbnailFilename = subThumbFilename;
                                    delete subObj.thumbnail;
                                } catch (e) {
                                    console.warn("Could not backup sub-course thumbnail for", sub, e);
                                }
                            }
                            newSubData[sub] = subObj;
                        }
                        cleanCourse.subCourseData = newSubData;
                    }
                    
                    if (course.thumbnail) {
                        const thumbBlob = base64ToBlob(course.thumbnail);
                        const thumbFilename = `thumb_${course.id}.png`;
                        zip.folder('thumbnails').file(thumbFilename, thumbBlob);
                        cleanCourse.thumbnailFilename = thumbFilename;
                    }
                    delete cleanCourse.thumbnail;
                    serializableCourses.push(cleanCourse);
                }

                for (const progress of allProgress) {
                    const cleanProgress = { ...progress };
                    if (progress.pdfHandle) {
                        const pdfFilename = `pdf_${progress.id}.pdf`;
                        zip.folder('pdfs').file(pdfFilename, progress.pdfHandle);
                        cleanProgress.pdfFilename = pdfFilename;
                    }
                     if (progress.assignmentHandle) {
                        const assignFilename = `assign_${progress.id}_${progress.assignmentName}`;
                        zip.folder('assignments').file(assignFilename, progress.assignmentHandle);
                        cleanProgress.assignmentFilename = assignFilename;
                    }
                    delete cleanProgress.pdfHandle;
                    delete cleanProgress.assignmentHandle;
                    serializableProgress.push(cleanProgress);
                }

                // Export DPPs
                const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
                const serializableDpps = [];
                for (const dpp of allDpps) {
                    const cleanDpp = {...dpp};
                    if (dpp.fileHandle) {
                        const dppFilename = `dpp_${dpp.id}_${dpp.fileName}`;
                        zip.folder('dpps').file(dppFilename, dpp.fileHandle);
                        cleanDpp.dppFilename = dppFilename;
                    }
                    delete cleanDpp.fileHandle;
                    serializableDpps.push(cleanDpp);
                }

                // Export Doubts, History, and localStorage
                const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
                const allHistory = await new Promise(r => getStore(HISTORY_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
                const serializableHistory = [];
                if (Array.isArray(allHistory)) {
                    let histIdx = 0;
                    for (const hist of allHistory) {
                        const cleanHist = { ...hist };
                        if (hist.thumbnail && typeof hist.thumbnail === 'string' && hist.thumbnail.startsWith('data:')) {
                            try {
                                const histThumbBlob = base64ToBlob(hist.thumbnail);
                                const histThumbFilename = `hist_${hist.id || histIdx}_${histIdx}.png`;
                                zip.folder('history_thumbnails').file(histThumbFilename, histThumbBlob);
                                cleanHist.thumbnailFilename = histThumbFilename;
                                delete cleanHist.thumbnail;
                            } catch (e) {
                                console.warn("Could not backup history thumbnail for", hist.id, e);
                            }
                        }
                        histIdx++;
                        serializableHistory.push(cleanHist);
                    }
                }
                const localStoreData = { ...localStorage };

                // Backup ProgressAppDB assignmentFiles
                const progressFiles = [];
                try {
                    const progRequest = indexedDB.open('ProgressAppDB', 1);
                    await new Promise((resolve, reject) => {
                        progRequest.onsuccess = async (e) => {
                            const db = e.target.result;
                            if (db.objectStoreNames.contains('assignmentFiles')) {
                                const tx = db.transaction('assignmentFiles', 'readonly');
                                const store = tx.objectStore('assignmentFiles');
                                const allReq = store.getAll();
                                const keysReq = store.getAllKeys();
                                
                                allReq.onsuccess = async () => {
                                    keysReq.onsuccess = async () => {
                                        const handles = allReq.result;
                                        const keys = keysReq.result;
                                        for (let i = 0; i < handles.length; i++) {
                                            const handle = handles[i];
                                            const id = keys[i];
                                            let file;
                                            try {
                                                if (handle instanceof File) {
                                                    file = handle;
                                                } else {
                                                    if (await handle.queryPermission() === 'granted') {
                                                        file = await handle.getFile();
                                                    }
                                                }
                                                if (file) {
                                                    const filename = `prog_${id}_${file.name}`;
                                                    zip.folder('progress_assignments').file(filename, file);
                                                    progressFiles.push({ id: id, filename: filename });
                                                }
                                            } catch (err) {
                                                console.warn("Could not backup progress file", id, err);
                                            }
                                        }
                                        resolve();
                                    };
                                };
                            } else {
                                resolve();
                            }
                        };
                        progRequest.onerror = () => resolve(); 
                    });
                } catch(e) { console.error("Error backing up ProgressAppDB", e); }

                const backupData = {
                    courses: serializableCourses,
                    progress: serializableProgress,
                    dpps: serializableDpps,
                    progressAppFiles: progressFiles,
                    doubts: allDoubts,
                    history: serializableHistory,
                    localStorage: localStoreData,
                    version: 3,
                    exportedAt: new Date().toISOString()
                };

                zip.file("backup.json", JSON.stringify(backupData));
                const zipBlob = await zip.generateAsync({ type: "blob" });
                downloadBlob(zipBlob, `CourseFlix_Backup_${new Date().toISOString().split('T')[0]}.zip`);
                showToast("Export successful!");

                console.error("Export failed:", err);
                showToast("Export failed. Check the console for errors.", true);
            } finally {
                exportBtn.innerHTML = `<i class="fas fa-file-export"></i> Export Backup`;
                exportBtn.disabled = false;
            }
        });

        importBtn.addEventListener('click', () => {
            importZipInput.click();
        });

        importZipInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const importModal = document.getElementById('import-modal-overlay');
            const importModalContent = document.getElementById('import-modal-content');
            importModalContent.innerHTML = `<h2><i class="fas fa-spinner fa-spin"></i> Reading Backup...</h2>`;
            importModal.classList.remove('hidden');

            try {
                const zip = await JSZip.loadAsync(file);
                const backupFile = zip.file('backup.json');
                if (!backupFile) {
                    throw new Error('Invalid backup file: backup.json not found.');
                }
                const backupData = JSON.parse(await backupFile.async('string'));
                showImportRelinkModal(backupData, zip);
            } catch (err) {
                console.error("Import failed:", err);
                showToast(`Import failed: ${err.message}`, true);
                importModal.classList.add('hidden');
            } finally {
                e.target.value = null; 
            }
        });
        
        function showImportRelinkModal(backupData, zip) {
            const importModalContent = document.getElementById('import-modal-content');
            let courseLinksHTML = backupData.courses.map(c => `
                <div class="import-course-link-item" data-course-id="${c.id}" data-folder-name="${c.folderName || ''}">
                    <span class="import-course-title">${c.folderName || c.title}</span>
                    <div class="status-container">
                        ${c.folderName ? `<button class="primary-btn link-folder-btn" data-course-id="${c.id}">Select Folder</button>` : `<span class="status">OK</span>`}
                    </div>
                </div>
            `).join('');

            importModalContent.innerHTML = `
                <button class="close-modal-btn" title="Close">&times;</button>
                <h2>Link Course Folders</h2>
                <p style="color: var(--text-secondary); margin: -0.5rem 0 0.5rem 0;">Select a master folder to link all courses automatically, or link them individually. You can add multiple master folders.</p>
                <button id="select-master-folder" class="secondary-btn"><i class="fas fa-folder-tree"></i> Add Auto-Link Master Folder</button>
                <div class="modal-content-scrollable" style="margin-top:1rem;">
                    ${courseLinksHTML}
                </div>
                <button id="import-final-btn" class="primary-btn" disabled>Start Import</button>
                <div id="import-status-message"></div>
            `;
            
            const linkedHandles = {};
            const coursesThatNeedLinks = backupData.courses.filter(c => c.folderName);
            const coursesToLinkCount = coursesThatNeedLinks.length;
            let linkedCount = 0;

            const checkAllLinked = () => {
                const allLinked = linkedCount >= coursesToLinkCount;
                document.getElementById('import-final-btn').disabled = !allLinked;
            };
            checkAllLinked();

            importModalContent.querySelector('.close-modal-btn').onclick = () => {
                document.getElementById('import-modal-overlay').classList.add('hidden');
            };

            importModalContent.querySelector('#select-master-folder').onclick = async () => {
                try {
                    const masterHandle = await window.showDirectoryPicker();
                    for await (const courseItem of coursesThatNeedLinks) {
                        try {
                            const courseHandle = await masterHandle.getDirectoryHandle(courseItem.folderName, { create: false });
                            const courseId = courseItem.id;
                            if (!linkedHandles[courseId]) { // Don't override manual selections
                                linkedHandles[courseId] = courseHandle;
                                const itemEl = importModalContent.querySelector(`.import-course-link-item[data-course-id="${courseId}"] .status-container`);
                                if (itemEl) {
                                    itemEl.innerHTML = `<span class="status">✅ Auto-Linked</span>`;
                                    linkedCount++;
                                }
                            }
                        } catch (e) {
                            console.warn(`Could not find folder "${courseItem.folderName}" in master directory.`);
                        }
                    }
                    checkAllLinked();
                } catch(e) { console.log('User cancelled master folder picker.'); }
            };

            importModalContent.querySelectorAll('.link-folder-btn').forEach(btn => {
                btn.onclick = async () => {
                    try {
                        const handle = await window.showDirectoryPicker();
                        const courseId = btn.dataset.courseId;
                        if (!linkedHandles[courseId]) linkedCount++;
                        linkedHandles[courseId] = handle;
                        btn.parentElement.innerHTML = `<span class="status">✅ Linked</span>`;
                        checkAllLinked();
                    } catch (err) {
                        console.log("User cancelled folder picker.");
                    }
                };
            });

            document.getElementById('import-final-btn').onclick = async () => {
                if (!confirm("This will overwrite all current courses and progress. Are you sure you want to continue?")) return;
                await processImport(backupData, zip, linkedHandles);
            };
        }
        
        async function processImport(backupData, zip, linkedHandles) {
            const statusMsg = document.getElementById('import-status-message');
            statusMsg.textContent = 'Importing... Please wait.';
            document.getElementById('import-final-btn').disabled = true;

            try {
                await Promise.all([
                    new Promise(r => getStore(STORE_NAME, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(PROGRESS_STORE, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(DPP_STORE, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(DOUBTS_STORE, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(HISTORY_STORE, 'readwrite').clear().onsuccess = r)
                ]);

                for (const course of backupData.courses) {
                    statusMsg.textContent = `Importing course: ${course.title}...`;
                    const newCourse = { ...course };
                    if (course.folderName) {
                        newCourse.handle = linkedHandles[course.id];
                        if (!newCourse.handle) throw new Error(`Folder for ${course.title} was not linked.`);
                    }
                    if (course.thumbnailFilename) {
                        const thumbFile = zip.file(`thumbnails/${course.thumbnailFilename}`);
                        if (thumbFile) newCourse.thumbnail = await blobToDataURL(await thumbFile.async('blob'));
                    }
                    if (newCourse.subCourseData) {
                        for (const sub in newCourse.subCourseData) {
                            const subObj = newCourse.subCourseData[sub];
                            if (subObj.thumbnailFilename) {
                                const subThumbFile = zip.file(`sub_thumbnails/${subObj.thumbnailFilename}`);
                                if (subThumbFile) {
                                    subObj.thumbnail = await blobToDataURL(await subThumbFile.async('blob'));
                                }
                            }
                        }
                    }
                    await new Promise(r => getStore(STORE_NAME, 'readwrite').put(newCourse).onsuccess = r);
                }

                for (const progress of backupData.progress) {
                    statusMsg.textContent = `Importing progress...`;
                    const newProgress = { ...progress };
                    if (progress.pdfFilename) {
                        const pdfFile = zip.file(`pdfs/${progress.pdfFilename}`);
                        if (pdfFile) newProgress.pdfHandle = new File([await pdfFile.async('blob')], progress.pdfName, { type: 'application/pdf' });
                    }
                     if (progress.assignmentFilename) {
                        const assignFile = zip.file(`assignments/${progress.assignmentFilename}`);
                        if (assignFile) {
                            const blob = await assignFile.async('blob');
                            const type = progress.assignmentType || 'application/octet-stream';
                            newProgress.assignmentHandle = new File([blob], progress.assignmentName, { type });
                        }
                    }
                    await new Promise(r => getStore(PROGRESS_STORE, 'readwrite').put(newProgress).onsuccess = r);
                }

                if (backupData.dpps) {
                    for (const dpp of backupData.dpps) {
                        statusMsg.textContent = `Importing DPPs...`;
                        const newDpp = { ...dpp };
                        if (dpp.dppFilename) {
                            const dppFile = zip.file(`dpps/${dpp.dppFilename}`);
                            if (dppFile) {
                                const blob = await dppFile.async('blob');
                                newDpp.fileHandle = new File([blob], dpp.fileName, { type: 'application/pdf' });
                            }
                        }
                        await new Promise(r => getStore(DPP_STORE, 'readwrite').put(newDpp).onsuccess = r);
                    }
                }

                if (backupData.doubts) {
                    for (const doubt of backupData.doubts) {
                        await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').put(doubt).onsuccess = r);
                    }
                }
                
                if (backupData.history) {
                    for (const hist of backupData.history) {
                        const newHist = { ...hist };
                        if (hist.thumbnailFilename) {
                            const histThumbFile = zip.file(`history_thumbnails/${hist.thumbnailFilename}`);
                            if (histThumbFile) {
                                newHist.thumbnail = await blobToDataURL(await histThumbFile.async('blob'));
                            }
                        }
                        await new Promise(r => getStore(HISTORY_STORE, 'readwrite').put(newHist).onsuccess = r);
                    }
                }
                
                if (backupData.localStorage) {
                    for (const [key, value] of Object.entries(backupData.localStorage)) {
                        localStorage.setItem(key, value);
                    }
                }

                if (backupData.progressAppFiles) {
                    try {
                        const progRequest = indexedDB.open('ProgressAppDB', 1);
                        await new Promise((resolve, reject) => {
                            progRequest.onupgradeneeded = (e) => {
                                const db = e.target.result;
                                if (!db.objectStoreNames.contains('assignmentFiles')) {
                                    db.createObjectStore('assignmentFiles');
                                }
                            };
                            progRequest.onsuccess = async (e) => {
                                const db = e.target.result;
                                if (!db.objectStoreNames.contains('assignmentFiles')) {
                                    return resolve();
                                }
                                const tx = db.transaction('assignmentFiles', 'readwrite');
                                const store = tx.objectStore('assignmentFiles');
                                store.clear();
                                
                                for (const pFile of backupData.progressAppFiles) {
                                    const zipFile = zip.folder('progress_assignments').file(pFile.filename);
                                    if (zipFile) {
                                        const blob = await zipFile.async("blob");
                                        const originalName = pFile.filename.replace(/^prog_[^_]+_/, '');
                                        const file = new File([blob], originalName, { type: 'application/pdf' });
                                        store.put(file, pFile.id);
                                    }
                                }
                                tx.oncomplete = () => resolve();
                                tx.onerror = () => resolve();
                            };
                            progRequest.onerror = () => resolve();
                        });
                    } catch(e) { console.error("Error restoring ProgressAppDB", e); }
                }

                statusMsg.textContent = 'Import complete! Reloading...';
                showToast("Import successful! Your library has been restored.");
                
                setTimeout(async () => {
                    document.getElementById('import-modal-overlay').classList.add('hidden');
                    document.getElementById('modal-overlay').classList.add('hidden');
                    await loadAllProgress();
                    await loadCoursesFromDB();
                    switchView('dashboard-view');
                }, 1500);

            } catch (err) {
                console.error("Error during final import stage:", err);
                statusMsg.textContent = `Error: ${err.message}`;
                showToast(`Import failed: ${err.message}`, true);
            }
        }

        // --- Video Player Controls ---
        unmuteBtn.addEventListener('click', () => {
            videoPlayer.muted = false;
            unmuteBtn.classList.add('hidden');
        });
        const showSeekIcon = (overlay) => { overlay.classList.add('show-icon'); setTimeout(() => overlay.classList.remove('show-icon'), 500); };
        playPauseBtn.addEventListener('click', () => videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause());
        videoPlayer.addEventListener('play', () => playPauseBtn.innerHTML = `<i class="fas fa-pause"></i>`);
        videoPlayer.addEventListener('pause', () => {
            playPauseBtn.innerHTML = `<i class="fas fa-play"></i>`;
        });
        videoPlayer.addEventListener('ended', () => {
            if (brownNoiseAudio && !brownNoiseAudio.paused) {
                brownNoiseAudio.pause();
            }
        });
        if (brownNoiseAudio) {
            brownNoiseAudio.addEventListener('ended', () => {
                brownNoiseAudio.currentTime = 20;
                brownNoiseAudio.play();
            });
        }
        videoWrapper.addEventListener('click', (e) => { if (e.target.closest('.video-controls-container') || e.target.closest('#unmute-btn') || e.target.closest('.bookmark-dot')) return; if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; } clickTimer = setTimeout(() => { if (!e.target.closest('#media-viewer')) playPauseBtn.click(); }, 250); });
        videoWrapper.addEventListener('auxclick', (e) => {
            if (e.button === 1 && !e.target.closest('.video-controls-container') && !e.target.closest('#media-viewer')) {
                e.preventDefault();
                playPauseBtn.click();
            }
        });
        videoWrapper.addEventListener('mousedown', (e) => {
            if (e.button === 1 && !e.target.closest('.video-controls-container') && !e.target.closest('#media-viewer')) {
                e.preventDefault();
            }
        });
        videoWrapper.addEventListener('dblclick', (e) => { if (e.target.closest('.video-controls-container') || e.target.closest('#media-viewer')) return; clearTimeout(clickTimer); clickTimer = null; const r=videoWrapper.getBoundingClientRect(),c=e.clientX-r.left;if(c<r.width/2){videoPlayer.currentTime-=10;showSeekIcon(leftSeekOverlay)}else{videoPlayer.currentTime+=10;showSeekIcon(rightSeekOverlay)}});
        videoWrapper.addEventListener('wheel', (e) => {
            if (e.target.closest('.video-controls-container') || e.target.closest('#media-viewer')) return;
            e.preventDefault();
            if (e.deltaY < 0) {
                videoPlayer.currentTime += 10;
                showSeekIcon(rightSeekOverlay);
            } else if (e.deltaY > 0) {
                videoPlayer.currentTime -= 10;
                showSeekIcon(leftSeekOverlay);
            }
        });
        let showRealTimeLeft = true;
        const videoDurationEl = document.getElementById('video-duration');
        videoDurationEl.style.cursor = 'pointer';
        videoDurationEl.title = "Toggle time format";
        
        function updateTimeDisplay() {
            if (!isNaN(videoPlayer.duration)) {
                const realTimeLeft = (videoPlayer.duration - videoPlayer.currentTime) / videoPlayer.playbackRate;
                if (showRealTimeLeft) {
                    videoDurationEl.textContent = "-" + formatTime(realTimeLeft);
                } else {
                    const standardTimeLeft = videoPlayer.duration - videoPlayer.currentTime;
                    videoDurationEl.textContent = "-" + formatTime(standardTimeLeft);
                }
                
                const endTimeDisplay = document.getElementById('estimated-end-time');
                if (endTimeDisplay) {
                    const now = new Date();
                    const endTime = new Date(now.getTime() + (realTimeLeft * 1000));
                    let hours = endTime.getHours();
                    const minutes = endTime.getMinutes().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12 || 12;
                    endTimeDisplay.textContent = `Ends at ${hours}:${minutes} ${ampm}`;
                }
            }
        }
        
        setInterval(() => {
            if (videoPlayer.paused) updateTimeDisplay();
        }, 1000);
        
        videoDurationEl.addEventListener('click', () => {
            showRealTimeLeft = !showRealTimeLeft;
            updateTimeDisplay();
        });

        const endTimeContainer = document.getElementById('estimated-end-time-container');
        let endTimeHoverTimeout;
        if (endTimeContainer) {
            endTimeContainer.addEventListener('mouseenter', () => {
                const displayEl = document.getElementById('estimated-end-time');
                if (displayEl) {
                    displayEl.style.opacity = '0.9';
                    clearTimeout(endTimeHoverTimeout);
                    endTimeHoverTimeout = setTimeout(() => {
                        displayEl.style.opacity = '0';
                    }, 10000);
                }
            });
        }

        window.activePlaybackRate = window.activePlaybackRate || 1.6;
        videoPlayer.addEventListener('ratechange', () => {
            window.activePlaybackRate = videoPlayer.playbackRate;
            speedBtn.textContent = window.activePlaybackRate + 'x';
            updateTimeDisplay();
        });

        videoPlayer.addEventListener('timeupdate', () => { 
            const currentTime = videoPlayer.currentTime;
            document.getElementById('current-time').textContent = formatTime(currentTime); 
            if (!isNaN(videoPlayer.duration)) { 
                updateTimeDisplay();
                timeline.value = currentTime; 
                const p = (currentTime / videoPlayer.duration) * 100; 
                timeline.style.background = `linear-gradient(to right, var(--accent-primary) ${p}%, rgba(255, 255, 255, 0.3) ${p}%)`;
                
                const skipBtn = document.getElementById('skip-intro-btn');
                if (currentTime <= 5 && videoPlayer.duration > 5) {
                    skipBtn.style.display = 'block';
                    setTimeout(() => skipBtn.style.opacity = '1', 10);
                } else {
                    skipBtn.style.opacity = '0';
                    setTimeout(() => { if (skipBtn.style.opacity === '0') skipBtn.style.display = 'none'; }, 300);
                }
                const promptTimeStr = localStorage.getItem('defaultAutoplayPrompt') || "3";
                const promptTime = parseFloat(promptTimeStr) * 60;

                if (videoPlayer.duration - currentTime <= promptTime && !autoplayTriggered && videoPlayer.duration > promptTime) {
                    autoplayTriggered = true;
                    const nextLi = getNextLectureLi(currentLectureLi);
                    if (nextLi) {
                        showAutoplayOverlay(nextLi, 60);
                    } else {
                        showToast('No next lecture found', true);
                    }
                }
            } 
        });
        videoPlayer.addEventListener('loadedmetadata', () => { 
            updateTimeDisplay();
            timeline.max = videoPlayer.duration; 
        });
        timeline.addEventListener('input', (e) => videoPlayer.currentTime = e.target.value);
        fullscreenBtn.addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => showToast(`Error: ${err.message}`, true)); else document.exitFullscreen(); });
        
        const speeds = [1, 1.25, 1.5, 1.6, 1.75, 1.85, 2, 2.25, 2.5, 3]; let currentSpeedIndex = 4; // Default 1.75x
        const savedPlaybackSpeed = parseFloat(localStorage.getItem('defaultPlaybackSpeed') || '1.75');
        window.activePlaybackRate = window.activePlaybackRate || savedPlaybackSpeed;
        videoPlayer.playbackRate = window.activePlaybackRate;
        speedBtn.textContent = `${window.activePlaybackRate}x`;
        speedBtn.addEventListener('click', () => {
            currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
            window.activePlaybackRate = speeds[currentSpeedIndex];
            videoPlayer.playbackRate = window.activePlaybackRate;
        });

        const customSpeedBtn = document.getElementById('custom-speed-btn');
        const customSpeedPopover = document.getElementById('custom-speed-popover');
        const customSpeedInput = document.getElementById('custom-speed-input');
        const applyCustomSpeedBtn = document.getElementById('apply-custom-speed');

        customSpeedBtn.addEventListener('click', () => {
            customSpeedPopover.classList.toggle('hidden');
            if (!customSpeedPopover.classList.contains('hidden')) {
                customSpeedInput.value = window.activePlaybackRate || 1.6;
                customSpeedInput.focus();
            }
        });

        applyCustomSpeedBtn.addEventListener('click', () => {
            let newSpeed = parseFloat(customSpeedInput.value);
            if (newSpeed && newSpeed >= 0.1 && newSpeed <= 5.0) {
                window.activePlaybackRate = newSpeed;
                videoPlayer.playbackRate = newSpeed;
            }
            customSpeedPopover.classList.add('hidden');
        });
        
        customSpeedInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyCustomSpeedBtn.click();
        });
        const pdfDropOverlay = document.getElementById('pdf-drop-overlay');
        let dragCounter = 0;

        playerView.addEventListener('dragenter', (e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            dragCounter++;
            pdfDropOverlay.style.opacity = '1';
            pdfDropOverlay.style.pointerEvents = 'auto';
        });
        playerView.addEventListener('dragover', (e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
        });
        playerView.addEventListener('dragleave', (e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                pdfDropOverlay.style.opacity = '0';
                pdfDropOverlay.style.pointerEvents = 'none';
            }
        });
        playerView.addEventListener('drop', async (e) => {
            if (!e.dataTransfer.types.includes('Files')) return;
            e.preventDefault();
            dragCounter = 0;
            pdfDropOverlay.style.opacity = '0';
            pdfDropOverlay.style.pointerEvents = 'none';
            
            if (!currentCourse || !currentLectureLi) {
                showToast("Please open a lecture first before dropping files.", true);
                return;
            }
            
            const lectureId = currentLectureLi.dataset.lectureId;
            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;
            
            const file = files[0];
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                showToast("Only PDF files are allowed.", true);
                return;
            }
            
            const progressData = getLectureProgress(currentCourse.id, lectureId) || {};
            
            if (!progressData.pdfHandle) {
                await saveLectureProgress({ ...progressData, pdfHandle: file, pdfName: file.name, courseId: currentCourse.id, lectureId: lectureId });
                showToast("PDF added as Lecture Notes!");
            } else {
                await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: file.name, assignmentType: file.type, courseId: currentCourse.id, lectureId: lectureId });
                
                const dpp = {
                    courseId: currentCourse.id,
                    folderName: currentSubfolder || 'Uncategorized',
                    fileName: file.name.replace(/\.[^/.]+$/, ""),
                    fileHandle: file,
                    completed: false,
                    starred: false,
                    status: null
                };
                await new Promise(r => getStore(DPP_STORE, 'readwrite').add(dpp).onsuccess = r);
                if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
                
                showToast("PDF added as DPP / Assignment!");
            }
            
            renderChapterList(currentCourse.chapters, lectureId);
        });
        
        document.addEventListener('keydown', (e) => { 
            const doubtOverlay = document.getElementById('doubt-full-overlay');
            if (doubtOverlay && !doubtOverlay.classList.contains('hidden')) {
                if (e.key === 'Escape') {
                    doubtOverlay.classList.add('hidden');
                    if (typeof activeDoubtId !== 'undefined') activeDoubtId = null;
                }
                return;
            }

            const activeModal = document.querySelector('.modal-overlay:not(.hidden)');
            if (activeModal) {
                 if (e.key === 'Escape') {
                     activeModal.classList.add('hidden');
                 } else if (e.key === '/' && activeModal.id === 'shortcuts-modal-overlay') {
                     activeModal.classList.add('hidden');
                 }
                return;
            }

            const activeInput = document.querySelector('input:focus, textarea:focus, [contenteditable="true"]:focus');
             if (activeInput) {
                 if (e.key === 'Escape') {
                     activeInput.blur();
                 }
                 return; 
             }

            const view = document.querySelector('.view.active'); 
            if (!view || !['player-view', 'dpp-view', 'notes-view', 'doubts-view'].includes(view.id)) return;
            
            userInteracted = true; 
            userInteracted = true; 
            let key = e.key;
            if (key.length === 1) key = key.toLowerCase();
            
            if (!unmuteBtn.classList.contains('hidden') && key !== 'm') {
                videoPlayer.muted = false; 
                unmuteBtn.classList.add('hidden'); 
            }

            let shouldPreventDefault = true;
            switch(key) { 
                case ' ': if (view.id === 'player-view') playPauseBtn.click(); break;
                case 'c': 
                    if (view.id === 'player-view') {
                        let newSpeed = videoPlayer.playbackRate + 0.1;
                        if (newSpeed > 5.0) newSpeed = 5.0;
                        videoPlayer.playbackRate = parseFloat(newSpeed.toFixed(2));
                    }
                    break;
                case 'x':
                    if (view.id === 'player-view') {
                        let newSpeed = videoPlayer.playbackRate - 0.1;
                        if (newSpeed < 0.1) newSpeed = 0.1;
                        videoPlayer.playbackRate = parseFloat(newSpeed.toFixed(2));
                    }
                    break;
                case 's': if (view.id === 'player-view' && currentCourse && currentLectureLi) captureDoubt(); break;
                case 'n': 
                    if (view.id === 'player-view' && currentLectureLi) {
                        const nextLi = getNextLectureLi(currentLectureLi);
                        if (nextLi) playVideo(nextLi);
                        else showToast('No next lecture available.');
                    }
                    break;
                case 'p': 
                    if (e.shiftKey) {
                        if (view.id === 'player-view' && currentLectureLi) {
                            const prevLi = getPreviousLectureLi(currentLectureLi);
                            if (prevLi) playVideo(prevLi);
                            else showToast('No previous lecture available.');
                        }
                    }
                    break;
                case 'z':
                    if (view.id === 'player-view') addBookmark();
                    break;
                case 'q':
                    if (view.id === 'player-view') {
                        const playerNotesSidebar = document.getElementById('player-notes-sidebar');
                        if (playerView.classList.contains('notes-active')) {
                            playerView.classList.remove('notes-active');
                            playerNotesSidebar.classList.add('hidden');
                        } else {
                            playerView.classList.add('notes-active');
                            playerNotesSidebar.classList.remove('hidden');
                            if (typeof loadPlayerNotes === 'function') loadPlayerNotes();
                        }
                    }
                    break;
                case 'ArrowRight': if (view.id === 'player-view') videoPlayer.currentTime += 10; break;
                case 'ArrowLeft': if (view.id === 'player-view') videoPlayer.currentTime -= 10; break; 
                case 'ArrowUp': 
                    if (view.id === 'player-view') {
                        videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.01); 
                        showToast(`Lecture Vol: ${Math.round(videoPlayer.volume * 100)}%`);
                    }
                    break;
                case 'ArrowDown': 
                    if (view.id === 'player-view') {
                        videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.01); 
                        showToast(`Lecture Vol: ${Math.round(videoPlayer.volume * 100)}%`);
                    }
                    break;
                case 'm': 
                    if (view.id === 'player-view') {
                        const isMuted = !videoPlayer.muted;
                        videoPlayer.muted = isMuted;
                        if (brownNoiseAudio) brownNoiseAudio.muted = isMuted;
                        unmuteBtn.classList.toggle('hidden', !isMuted);
                    }
                    break;
                case 'b':
                    if (view.id === 'player-view' && brownNoiseAudio) {
                        const playAudio = () => {
                            if (brownNoiseAudio.paused) {
                                brownNoiseAudio.currentTime = 20;
                                const savedVol = localStorage.getItem('brownNoiseVolume');
                                brownNoiseAudio.volume = savedVol !== null ? parseFloat(savedVol) : 0.2;
                                brownNoiseAudio.play();
                                showToast("Brown Noise Mode: ON");
                            } else {
                                brownNoiseAudio.pause();
                                showToast("Brown Noise Mode: OFF");
                            }
                        };
                        
                        if (!brownNoiseAudio.dataset.blobLoaded) {
                            showToast("Loading Brown Noise...");
                            fetch('brown.mp3')
                                .then(res => res.blob())
                                .then(blob => {
                                    brownNoiseAudio.src = URL.createObjectURL(blob);
                                    brownNoiseAudio.dataset.blobLoaded = 'true';
                                    playAudio();
                                })
                                .catch(err => {
                                    console.error("Failed to fetch brown noise:", err);
                                    showToast("Error loading brown noise");
                                });
                        } else {
                            playAudio();
                        }
                    }
                    break;
                case 'PageUp':
                    if (view.id === 'player-view' && brownNoiseAudio) {
                        brownNoiseAudio.volume = Math.min(1, brownNoiseAudio.volume + 0.01);
                        localStorage.setItem('brownNoiseVolume', brownNoiseAudio.volume);
                        showToast(`Brown Noise Vol: ${Math.round(brownNoiseAudio.volume * 100)}%`);
                    }
                    break;
                case 'PageDown':
                    if (view.id === 'player-view' && brownNoiseAudio) {
                        brownNoiseAudio.volume = Math.max(0, brownNoiseAudio.volume - 0.01);
                        localStorage.setItem('brownNoiseVolume', brownNoiseAudio.volume);
                        showToast(`Brown Noise Vol: ${Math.round(brownNoiseAudio.volume * 100)}%`);
                    }
                    break;
                case '/':
                    document.getElementById('shortcuts-modal-overlay').classList.toggle('hidden');
                    break;
                case ']': if (view.id === 'player-view') speedBtn.click(); break;
                case '[': 
                    if (view.id === 'player-view') {
                        currentSpeedIndex = (currentSpeedIndex - 2 + speeds.length) % speeds.length;
                        speedBtn.click();
                    }
                    break;
                case 'f': if (view.id === 'player-view') fullscreenBtn.click(); break;
                case 'Escape': 
                    if (document.fullscreenElement) {
                         document.exitFullscreen();
                    } else if (view.id === 'player-view' && !lectureMenu.classList.contains('hidden')) {
                        sidebarToggleBtn.click();
                    } else if (view.id === 'dpp-view' && !document.getElementById('dpp-sidebar').classList.contains('hidden')) {
                        document.getElementById('dpp-sidebar-toggle-btn').click();
                    } else if (view.id === 'notes-view' && !document.getElementById('notes-sidebar').classList.contains('hidden')) {
                        document.getElementById('notes-sidebar-toggle-btn').click();
                    } else {
                        switchView('dashboard-view');
                    }
                    break; 

                default: shouldPreventDefault = false; break;
            } 
            if (shouldPreventDefault) e.preventDefault();
        });
        
        mediaResizeHandle.addEventListener('mousedown', (e) => { 
            e.preventDefault(); 
            isResizing = true; 
            document.body.style.cursor = 'ew-resize'; 
            playerView.style.userSelect = 'none'; 
            mediaViewer.style.pointerEvents = 'none';
            document.getElementById('video-wrapper').style.pointerEvents = 'none';
        });
        let resizeTicking = false;
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return; 
            e.preventDefault(); 
            if (!resizeTicking) {
                window.requestAnimationFrame(() => {
                    const totalWidth = playerView.offsetWidth;
                    const menuWidth = lectureMenu.classList.contains('hidden') ? 0 : lectureMenu.offsetWidth;
                    let newViewerWidth = totalWidth - e.clientX;
                    newViewerWidth = Math.max(300, newViewerWidth);
                    newViewerWidth = Math.min(totalWidth - 300 - menuWidth, newViewerWidth);
                    playerView.style.setProperty('--viewer-width', `${newViewerWidth}px`);
                    mediaViewer.style.width = `${newViewerWidth}px`;
                    resizeTicking = false;
                });
                resizeTicking = true;
            }
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                localStorage.setItem('viewerWidth', mediaViewer.style.width);
                isResizing = false;
                document.body.style.cursor = '';
                playerView.style.userSelect = '';
                mediaViewer.style.pointerEvents = '';
                document.getElementById('video-wrapper').style.pointerEvents = '';
            }
        });

        // --- Bookmark Functions ---
        function renderBookmarks() {
            bookmarksContainer.innerHTML = '';
            if (!currentCourse || !currentLectureLi || isNaN(videoPlayer.duration)) return;

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

        async function addBookmark() {
            if (!currentCourse || !currentLectureLi || videoPlayer.seeking) return;
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

        async function clearCurrentVideoBookmarks() {
            if (!currentCourse || !currentLectureLi) return;
             if (confirm('Are you sure you want to clear all bookmarks for this video?')) {
                const lectureId = currentLectureLi.dataset.lectureId;
                const progress = getLectureProgress(currentCourse.id, lectureId);
                await saveLectureProgress({ ...progress, courseId: currentCourse.id, lectureId, bookmarks: [] });
                renderBookmarks();
                showToast('Bookmarks cleared for this video.');
            }
        }
        
        clearBookmarksBtn.addEventListener('click', async () => {
             if (!currentCourse) return;
             if (confirm(`Are you sure you want to clear ALL bookmarks for the course "${currentCourse.title}"? This cannot be undone.`)) {
                 for (const lecture of currentCourse.lectures) {
                     const progress = getLectureProgress(currentCourse.id, lecture.id);
                     if (progress.bookmarks && progress.bookmarks.length > 0) {
                         progress.bookmarks = [];
                         await saveLectureProgress(progress);
                     }
                 }
                 renderBookmarks(); // Clear for current video
                 showToast(`All bookmarks for "${currentCourse.title}" have been cleared.`);
             }
        });

        // --- DPP Functions ---
        async function renderDppCourseSelectionView() {
            nav.classList.remove('hidden');
            const dppCourseGrid = document.getElementById('dpp-course-grid');
            document.getElementById('dpp-detail-container').classList.add('hidden');
            dppCourseGrid.classList.remove('hidden');

            const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
            let allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
            let addedAnyDpp = false;
            for (const prog of allProgress) {
                if (prog.assignmentHandle) {
                    const fName = (prog.assignmentName || "Assignment").replace(/\.[^/.]+$/, "");
                    if (!allDpps.some(d => d.courseId === prog.courseId && d.fileName === fName)) {
                        const course = courses.find(c => c.id === prog.courseId);
                        let folder = 'Uncategorized';
                        if (course && course.lectures) {
                            const lec = course.lectures.find(l => l.id === prog.lectureId);
                            if (lec && lec.chapter) folder = lec.chapter;
                        }
                        const dpp = { courseId: prog.courseId, folderName: folder, fileName: fName, fileHandle: prog.assignmentHandle, completed: false, starred: false, status: null };
                        await new Promise(r => getStore(DPP_STORE, 'readwrite').add(dpp).onsuccess = r);
                        addedAnyDpp = true;
                    }
                }
            }
            if (addedAnyDpp) {
                if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
                allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
            }

            const courseIdsWithDpps = [...new Set(allDpps.map(dpp => dpp.courseId))];
            const coursesWithDpps = courses.filter(c => courseIdsWithDpps.includes(c.id));

            dppCourseGrid.innerHTML = '';
            if (coursesWithDpps.length === 0) {
                dppCourseGrid.innerHTML = `<p id="no-content-message">No DPPs uploaded for any course yet. Go to the Upload tab to add some.</p>`;
                return;
            }

            coursesWithDpps.forEach(course => {
                const card = document.createElement('div');
                card.className = 'course-card';
                card.dataset.courseId = course.id;

                const courseDpps = allDpps.filter(d => d.courseId === course.id);
                const totalDpps = courseDpps.length;
                const solvedDpps = courseDpps.filter(d => d.completed).length;
                const remainingDpps = totalDpps - solvedDpps;
                const dppPercentage = totalDpps > 0 ? (solvedDpps / totalDpps) * 100 : 0;

                const ratingStarsHTML = Array.from({length: 5}, (_, i) => 
                    `<i class="fa-star ${ (course.rating || 0) > i ? 'fas' : 'far'}"></i>`
                ).join('');

                card.innerHTML = `
                    <div class="thumbnail-placeholder ${course.thumbnail ? 'has-thumbnail' : ''}" style="${course.thumbnail ? `background-image: url('${course.thumbnail}')` : ''}">
                        <i class="fas fa-file-invoice" style="font-size: 3rem;"></i>
                    </div>
                    <div class="course-info">
                        <div>
                            <h3 title="${course.title}">${course.title}</h3>
                            <div class="course-extra-info">
                                <div class="course-faculty">${course.facultyName || 'N/A Faculty'}</div>
                                <div class="course-rating" style="pointer-events: none;">${ratingStarsHTML}</div>
                            </div>
                            <p class="course-meta">${remainingDpps} DPPs remaining</p>
                        </div>
                        <div class="course-progress-container">
                            <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${dppPercentage}%"></div></div>
                            <div class="course-progress-text">${solvedDpps} / ${totalDpps} DPPs solved</div>
                        </div>
                        <button class="enter-course-btn" style="margin-top: 12px;">Solve DPP</button>
                    </div>`;
                dppCourseGrid.appendChild(card);
            });
        }


        async function renderDppDetailView(courseId) {
            nav.classList.add('hidden');
            const course = courses.find(c => c.id === courseId);
            if (!course) {
                showToast("Error: Course not found.", true);
                switchView('dpp-view'); // Go back to course selection
                return;
            };

            document.getElementById('dpp-course-grid').classList.add('hidden');
            const detailContainer = document.getElementById('dpp-detail-container');
            detailContainer.dataset.courseId = courseId;
            detailContainer.classList.remove('hidden');
            
            document.getElementById('dpp-detail-course-title').textContent = course.title;
            const dppListContainer = document.getElementById('dpp-list-container');
            const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
            const courseDpps = allDpps.filter(dpp => dpp.courseId === courseId);

            if (courseDpps.length === 0) {
                dppListContainer.innerHTML = `<p id="no-content-message">No DPPs uploaded for this course yet.</p>`;
                return;
            }

            const groupedByFolder = courseDpps.reduce((acc, dpp) => {
                const folder = dpp.folderName || 'Uncategorized';
                (acc[folder] = acc[folder] || []).push(dpp);
                return acc;
            }, {});

            let html = '';
            const sortedFolders = Object.keys(groupedByFolder).sort();

            for (const folderName of sortedFolders) {
                html += `<div class="dpp-folder-group open">`; // Start open by default
                if (folderName !== 'Uncategorized') {
                     html += `<div class="dpp-folder-title"><i class="fas fa-chevron-right"></i> <span>${folderName}</span></div>`;
                }
                
                html += `<div class="dpp-list">`;
                groupedByFolder[folderName].sort((a,b) => naturalSort({name: a.fileName}, {name: b.fileName})).forEach(dpp => {
                    const statusClass = dpp.status || '';
                    html += `
                        <div class="dpp-item" data-dpp-id="${dpp.id}">
                            <span class="dpp-item-title ${dpp.completed ? 'completed' : ''}">${dpp.fileName}</span>
                            <div class="dpp-item-controls">
                                <button class="file-btn dpp-item-btn dpp-status-btn ${statusClass}" title="Cycle Status">${dpp.status ? dpp.status.toUpperCase() : 'STATUS'}</button>
                                <button class="file-btn dpp-item-btn star-dpp-btn ${dpp.starred ? 'starred' : ''}" title="Star DPP"><i class="fas fa-star"></i></button>
                                <button class="file-btn dpp-item-btn complete-dpp-btn ${dpp.completed ? 'completed' : ''}" title="Mark as Complete"><i class="fas fa-check"></i></button>
                                <button class="file-btn dpp-item-btn delete-dpp-btn" title="Delete DPP"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }
            dppListContainer.innerHTML = html;
        }


        async function renderDppUploadView(courseId) {
            const course = courses.find(c => c.id === courseId);
            if (!course) return;

            const view = document.getElementById('dpp-upload-view');
            view.dataset.courseId = courseId;

            document.getElementById('dpp-upload-course-title').textContent = course.title;
            const folderList = document.getElementById('dpp-folder-list');

            let folderHTML = `<div class="dpp-folder-item selected" data-folder-name="">
                <span><i class="fas fa-folder"></i> No Folder (Root)</span>
            </div>`;

            if (course.dppFolders && course.dppFolders.length > 0) {
                folderHTML += course.dppFolders.sort().map(folder => `
                    <div class="dpp-folder-item" data-folder-name="${folder}">
                        <span><i class="fas fa-folder"></i> ${folder}</span>
                        <button class="file-btn delete-dpp-folder-btn" title="Delete folder" data-folder-name="${folder}"><i class="fas fa-trash"></i></button>
                    </div>
                `).join('');
            }
            folderList.innerHTML = folderHTML;

            folderList.querySelectorAll('.dpp-folder-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-dpp-folder-btn')) return;
                    folderList.querySelectorAll('.dpp-folder-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                });
            });
        }
        
        async function addDppFolder(courseId, folderName) {
            folderName = folderName.trim();
            if (!folderName) {
                showToast("Folder name cannot be empty.", true);
                return;
            }
            const course = courses.find(c => c.id === courseId);
            if (!course) return;

            if (!course.dppFolders) course.dppFolders = [];
            if (course.dppFolders.includes(folderName)) {
                showToast(`Folder "${folderName}" already exists.`, true);
                return;
            }

            course.dppFolders.push(folderName);
            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
            await renderDppUploadView(courseId);
        }

        async function deleteDppFolder(courseId, folderName) {
            if (!confirm(`Are you sure you want to delete the folder "${folderName}"? DPPs inside will be moved to the root.`)) return;
            
            const course = courses.find(c => c.id === courseId);
            if (!course || !course.dppFolders) return;
            
            course.dppFolders = course.dppFolders.filter(f => f !== folderName);
            await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);

            const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
            const dppsToUpdate = allDpps.filter(dpp => dpp.courseId === courseId && dpp.folderName === folderName);
            
            const tx = db.transaction(DPP_STORE, 'readwrite');
            const store = tx.objectStore(DPP_STORE);
            for(const dpp of dppsToUpdate) {
                dpp.folderName = ''; // Move to root
                store.put(dpp);
            }
            await new Promise(r => tx.oncomplete = r);
            await renderDppUploadView(courseId);
        }

        // --- DPP & Upload Listeners ---
        document.getElementById('back-to-upload-from-dpp').addEventListener('click', () => switchView('upload-view'));
        document.getElementById('back-to-upload-grid').addEventListener('click', () => {
            const detailView = document.getElementById('upload-detail-view');
            const subfolder = detailView.dataset.uploadSubfolder;
            if (subfolder) {
                // Go back to the subfolder view
                const courseId = parseInt(detailView.dataset.courseId);
                const parentPath = getParentPath(subfolder);
                detailView.classList.add('hidden');
                renderUploadSubfolderView(courseId, parentPath);
            } else {
                switchView('upload-view');
            }
        });
        document.getElementById('back-to-upload-from-subfolder').addEventListener('click', () => {
            const subfolderView = document.getElementById('upload-subfolder-view');
            const currentPath = subfolderView.dataset.currentPath || '';
            if (currentPath === '') {
                subfolderView.classList.add('hidden');
                switchView('upload-view');
            } else {
                const parentPath = getParentPath(currentPath);
                const courseId = parseInt(subfolderView.dataset.courseId);
                renderUploadSubfolderView(courseId, parentPath);
            }
        });

        
        const dppSidebarToggleBtn = document.getElementById('dpp-sidebar-toggle-btn');
        dppSidebarToggleBtn.addEventListener('click', () => {
            document.getElementById('dpp-sidebar').classList.toggle('hidden');
            dppSidebarToggleBtn.classList.toggle('collapsed');
        });

        const dppUploadSidebarToggleBtn = document.getElementById('dpp-upload-sidebar-toggle-btn');
        dppUploadSidebarToggleBtn.addEventListener('click', () => {
            document.getElementById('dpp-upload-sidebar').classList.toggle('hidden');
            dppUploadSidebarToggleBtn.classList.toggle('collapsed');
        });

        const newDppFolderNameInput = document.getElementById('new-dpp-folder-name');
        const addDppFolderBtn = document.getElementById('add-dpp-folder-btn');
        const dppFolderList = document.getElementById('dpp-folder-list');

        const handleAddDppFolder = async () => {
            const courseId = parseInt(document.getElementById('dpp-upload-view').dataset.courseId);
            const folderName = newDppFolderNameInput.value;
            if (folderName && courseId) {
                await addDppFolder(courseId, folderName);
                newDppFolderNameInput.value = '';
            }
        };

        addDppFolderBtn.addEventListener('click', handleAddDppFolder);
        newDppFolderNameInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAddDppFolder();
            }
        });

        dppFolderList.addEventListener('click', e => {
            const deleteBtn = e.target.closest('.delete-dpp-folder-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const courseId = parseInt(document.getElementById('dpp-upload-view').dataset.courseId);
                const folderName = deleteBtn.dataset.folderName;
                deleteDppFolder(courseId, folderName);
            }
        });
        
        const dppDropZone = document.getElementById('dpp-upload-drop-zone');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dppDropZone.addEventListener(eventName, e => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        dppDropZone.addEventListener('dragenter', () => dppDropZone.classList.add('dragover'));
        dppDropZone.addEventListener('dragover', () => dppDropZone.classList.add('dragover'));
        dppDropZone.addEventListener('dragleave', () => dppDropZone.classList.remove('dragover'));
        dppDropZone.addEventListener('drop', async (e) => {
            dppDropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;

            const courseId = parseInt(document.getElementById('dpp-upload-view').dataset.courseId);
            const selectedFolderEl = document.querySelector('#dpp-folder-list .dpp-folder-item.selected');
            const folderName = selectedFolderEl ? selectedFolderEl.dataset.folderName : '';

            const tx = db.transaction(DPP_STORE, 'readwrite');
            const store = tx.objectStore(DPP_STORE);
            let uploadedCount = 0;

            for (const file of files) {
                const dpp = {
                    courseId: courseId,
                    folderName: folderName,
                    fileName: file.name.replace(/\.[^/.]+$/, ""),
                    fileHandle: file,
                    completed: false,
                    starred: false,
                    status: null
                };
                store.add(dpp);
                uploadedCount++;
            }
            await new Promise(r => tx.oncomplete = r);
            
            if(uploadedCount > 0) {
                showToast(`${uploadedCount} DPP(s) uploaded successfully!`);
                if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
            }
        });

        document.getElementById('dpp-list-container').addEventListener('click', async (e) => {
            const folderTitle = e.target.closest('.dpp-folder-title');
            if (folderTitle) {
                e.stopPropagation();
                folderTitle.parentElement.classList.toggle('open');
                return;
            }

            const dppItem = e.target.closest('.dpp-item');
            if (!dppItem) return;
            
            const dppId = parseInt(dppItem.dataset.dppId);
            const dpp = await new Promise(r => getStore(DPP_STORE, 'readonly').get(dppId).onsuccess = e => r(e.target.result));
            if (!dpp) return;

            // Handle button clicks
            if (e.target.closest('.delete-dpp-btn')) {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete the DPP "${dpp.fileName}"?`)) {
                    await new Promise(r => getStore(DPP_STORE, 'readwrite').delete(dppId).onsuccess = r);
                    
                    const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
                    for (const prog of allProgress) {
                        if (prog.assignmentHandle && prog.courseId === dpp.courseId) {
                            const progFileName = (prog.assignmentName || "Assignment").replace(/\.[^/.]+$/, "");
                            if (progFileName === dpp.fileName) {
                                prog.assignmentHandle = null;
                                prog.assignmentName = null;
                                prog.assignmentType = null;
                                await saveLectureProgress(prog);
                            }
                        }
                    }
                    
                    if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
                    const courseId = parseInt(document.getElementById('dpp-detail-container').dataset.courseId);
                    await renderDppDetailView(courseId);
                    document.getElementById('dpp-viewer-frame').removeAttribute('src'); document.getElementById('dpp-viewer-frame').srcdoc = '';
                    document.getElementById('dpp-viewer-frame').style.display = 'block';
                    document.getElementById('dpp-viewer-header').classList.add('hidden');
                    document.getElementById('dpp-no-content-message').innerHTML = 'Select a DPP from the sidebar to view it.';
                    document.getElementById('dpp-no-content-message').classList.remove('hidden');
                }
            } else if (e.target.closest('.complete-dpp-btn')) {
                e.stopPropagation();
                dpp.completed = !dpp.completed;
                await new Promise(r => getStore(DPP_STORE, 'readwrite').put(dpp).onsuccess = r);
                e.target.closest('.complete-dpp-btn').classList.toggle('completed', dpp.completed);
                dppItem.querySelector('.dpp-item-title').classList.toggle('completed', dpp.completed);
            } else if (e.target.closest('.star-dpp-btn')) {
                e.stopPropagation();
                dpp.starred = !dpp.starred;
                await new Promise(r => getStore(DPP_STORE, 'readwrite').put(dpp).onsuccess = r);
                e.target.closest('.star-dpp-btn').classList.toggle('starred', dpp.starred);
            } else if (e.target.closest('.dpp-status-btn')) {
                e.stopPropagation();
                const statuses = [null, 'doubt', 'fail', 'solved'];
                const currentIndex = statuses.indexOf(dpp.status);
                const nextIndex = (currentIndex + 1) % statuses.length;
                dpp.status = statuses[nextIndex];
                await new Promise(r => getStore(DPP_STORE, 'readwrite').put(dpp).onsuccess = r);
                
                const btn = e.target.closest('.dpp-status-btn');
                btn.className = 'file-btn dpp-item-btn dpp-status-btn'; // reset classes
                if (dpp.status) {
                    btn.classList.add(dpp.status);
                    btn.textContent = dpp.status.toUpperCase();
                } else {
                    btn.textContent = 'STATUS';
                }
            } else { // Click on the item itself to view
                document.querySelectorAll('#dpp-list-container .dpp-item').forEach(item => item.classList.remove('active'));
                dppItem.classList.add('active');
                await showMediaViewer(dpp.fileHandle, 'dpp', dpp.fileName, null);
            }
        });

        async function handleLectureFileDrop(files, type) {
            const selectedLectureEl = document.querySelector('#upload-lecture-list .lecture-item.selected');
            if (!selectedLectureEl) {
                showToast('Please select a lecture from the list first!', true);
                return;
            }
            if (files.length > 1) {
                showToast('Please drop only one file at a time.', true);
                return;
            }
            
            const file = files[0];
            const courseId = parseInt(document.getElementById('upload-detail-view').dataset.courseId);
            const lectureId = selectedLectureEl.dataset.lectureId;
            const progressData = getLectureProgress(courseId, lectureId);

            if (type === 'pdf') {
                if (!file.name.toLowerCase().endsWith('.pdf')) {
                    showToast('Only PDF files are allowed for notes.', true);
                    return;
                }
                await saveLectureProgress({ ...progressData, pdfHandle: file, pdfName: file.name, courseId, lectureId });
            } else if (type === 'assignment') {
                await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: file.name, assignmentType: file.type, courseId, lectureId });
            }

            showToast(`${type === 'pdf' ? 'Notes' : 'Assignment'} for "${selectedLectureEl.textContent.trim()}" added successfully!`);
            
            const existingProgress = getLectureProgress(courseId, lectureId);
            const statusDiv = selectedLectureEl.querySelector('.file-status');
            statusDiv.innerHTML = `
                ${existingProgress.pdfHandle ? '<i class="fas fa-file-pdf" title="Notes added"></i>' : ''}
                ${existingProgress.assignmentHandle ? '<i class="fas fa-file-alt" title="Assignment added"></i>' : ''}
            `;
        }
        
        const pdfDropZone = document.getElementById('pdf-drop-zone');
        const assignmentDropZone = document.getElementById('assignment-drop-zone');
        [pdfDropZone, assignmentDropZone].forEach(zone => {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, e => { e.preventDefault(); e.stopPropagation(); }, false);
            });
            zone.addEventListener('dragenter', () => zone.classList.add('dragover'));
            zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
            zone.addEventListener('drop', async (e) => {
                zone.classList.remove('dragover');
                await handleLectureFileDrop(e.dataTransfer.files, zone.dataset.type);
            });
        });
        
        // --- Notes Functions ---
        async function renderNotesCourseSelectionView() {
            nav.classList.remove('hidden');
            const notesCourseGrid = document.getElementById('notes-course-grid');
            document.getElementById('notes-detail-container').classList.add('hidden');
            notesCourseGrid.classList.remove('hidden');

            const notesProgress = Object.values(courseProgress).filter(p => p.pdfHandle);
            const courseIdsWithNotes = [...new Set(notesProgress.map(p => p.courseId))];
            const coursesWithNotes = courses.filter(c => courseIdsWithNotes.includes(c.id));

            notesCourseGrid.innerHTML = '';
            if (coursesWithNotes.length === 0) {
                notesCourseGrid.innerHTML = `<p id="no-content-message">No notes uploaded for any course yet. Go to the Upload tab to add some.</p>`;
                return;
            }

            coursesWithNotes.forEach(course => {
                const card = document.createElement('div');
                card.className = 'course-card';
                card.dataset.courseId = course.id;

                const notesCount = notesProgress.filter(p => p.courseId === course.id).length;
                 const ratingStarsHTML = Array.from({length: 5}, (_, i) => 
                    `<i class="fa-star ${ (course.rating || 0) > i ? 'fas' : 'far'}"></i>`
                ).join('');


                card.innerHTML = `
                    <button class="delete-all-notes-btn" title="Delete all notes for this subject"><i class="fas fa-times"></i></button>
                    <div class="thumbnail-placeholder ${course.thumbnail ? 'has-thumbnail' : ''}" style="${course.thumbnail ? `background-image: url('${course.thumbnail}')` : ''}">
                        <i class="fas fa-book-open" style="font-size: 3rem;"></i>
                    </div>
                    <div class="course-info">
                         <div>
                            <h3 title="${course.title}">${course.title}</h3>
                            <div class="course-extra-info">
                                <div class="course-faculty">${course.facultyName || 'N/A Faculty'}</div>
                                <div class="course-rating" style="pointer-events: none;">${ratingStarsHTML}</div>
                            </div>
                            <p class="course-meta">${notesCount} class notes</p>
                        </div>
                        <button class="enter-course-btn" style="margin-top: auto;">View Notes</button>
                    </div>`;
                notesCourseGrid.appendChild(card);
            });
        }

        async function renderNotesDetailView(courseId) {
            nav.classList.add('hidden');
            const course = courses.find(c => c.id === courseId);
             if (!course) {
                showToast("Error: Course not found.", true);
                switchView('notes-view');
                return;
            };

            // Ensure lectures are loaded for chapter info
            if (course.isLinked && course.handle && !course.lectures) {
               await refreshCourse(course.id, null);
            }

            document.getElementById('notes-course-grid').classList.add('hidden');
            const detailContainer = document.getElementById('notes-detail-container');
            detailContainer.dataset.courseId = courseId;
            detailContainer.classList.remove('hidden');
            
            document.getElementById('notes-detail-course-title').textContent = course.title;
            const notesListContainer = document.getElementById('notes-list-container');
            
            const courseNotes = Object.values(courseProgress).filter(p => p.courseId === courseId && p.pdfHandle);

            if (courseNotes.length === 0 || !course.chapters) {
                notesListContainer.innerHTML = `<p id="no-content-message">No notes found for this course.</p>`;
                return;
            }
            
            let html = '';
            course.chapters.forEach(chapter => {
                const notesInChapter = courseNotes.filter(note => {
                    return chapter.lectures.some(lec => lec.id === note.lectureId);
                });

                if (notesInChapter.length > 0) {
                    html += `<div class="notes-folder-group open">
                                <div class="notes-folder-title"><i class="fas fa-chevron-right"></i> <span>${chapter.name}</span></div>
                                <div class="notes-list">`;
                    
                    notesInChapter.forEach(note => {
                        html += `<div class="notes-item" data-lecture-id="${note.lectureId}" style="display: flex; justify-content: space-between; align-items: center;">
                                    <span class="notes-item-title">${note.lectureName || 'Unnamed Note'}</span>
                                    <button class="delete-note-btn" data-lecture-id="${note.lectureId}" style="background: none; border: none; color: var(--accent-danger); cursor: pointer; padding: 4px;" title="Delete Note"><i class="fas fa-trash"></i></button>
                                 </div>`;
                    });

                    html += `</div></div>`;
                }
            });
            notesListContainer.innerHTML = html;
        }

        const notesSidebarToggleBtn = document.getElementById('notes-sidebar-toggle-btn');
        notesSidebarToggleBtn.addEventListener('click', () => {
            document.getElementById('notes-sidebar').classList.toggle('hidden');
            notesSidebarToggleBtn.classList.toggle('collapsed');
        });

        document.getElementById('notes-list-container').addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-note-btn');
            if (deleteBtn) {
                e.stopPropagation();
                if (!confirm('Are you sure you want to delete this note?')) return;
                const courseId = parseInt(document.getElementById('notes-detail-container').dataset.courseId);
                const lectureId = deleteBtn.dataset.lectureId;
                const progress = getLectureProgress(courseId, lectureId);
                if (progress) {
                    delete progress.pdfHandle;
                    delete progress.pdfName;
                    saveLectureProgress(progress);
                    renderNotesDetailView(courseId);
                    showToast('Note deleted');
                    document.getElementById('notes-viewer-frame').removeAttribute('src'); document.getElementById('notes-viewer-frame').srcdoc = '';
                    document.getElementById('notes-viewer-frame').style.display = 'block';
                    document.getElementById('notes-viewer-header').classList.add('hidden');
                    document.getElementById('notes-no-content-message').innerHTML = 'Select a note from the sidebar to view it.';
                    document.getElementById('notes-no-content-message').classList.remove('hidden');
                }
                return;
            }
            const folderTitle = e.target.closest('.notes-folder-title');
            if (folderTitle) {
                e.stopPropagation();
                folderTitle.parentElement.classList.toggle('open');
                return;
            }

            const noteItem = e.target.closest('.notes-item');
            if(noteItem) {
                const courseId = parseInt(document.getElementById('notes-detail-container').dataset.courseId);
                const lectureId = noteItem.dataset.lectureId;
                const progress = getLectureProgress(courseId, lectureId);

                if (progress && progress.pdfHandle) {
                    document.querySelectorAll('#notes-list-container .notes-item').forEach(item => item.classList.remove('active'));
                    noteItem.classList.add('active');
                    await showMediaViewer(progress.pdfHandle, 'note', progress.pdfName, null);
                }
            }
        });


        // --- Sync Doubt to Progress App ---
        function syncDoubtToProgressApp(d) {
            try {
                let progressDoubts = JSON.parse(localStorage.getItem('doubtsDashboard') || '[]');
                let doubtSubjects = JSON.parse(localStorage.getItem('doubtsSubjects') || '[]');
                
                const existingIndex = progressDoubts.findIndex(pd => pd.id === d.createdAt);
                
                // Determine subject
                let subject = "Unknown";
                if (window.currentCourse && window.currentCourse.title) {
                    subject = window.currentCourse.title;
                } else if (d.courseId) {
                    subject = String(d.courseId);
                }
                if (!doubtSubjects.includes(subject)) {
                    doubtSubjects.push(subject);
                    localStorage.setItem('doubtsSubjects', JSON.stringify(doubtSubjects));
                }
                
                // Determine title
                let title = "Screenshot Doubt";
                if (window.currentLectureLi) {
                    const titleEl = window.currentLectureLi.querySelector('span.flex-grow');
                    if (titleEl) {
                        title = titleEl.textContent.trim().split('\n')[0];
                    } else {
                        title = window.currentLectureLi.textContent.trim().split('\n')[0];
                    }
                } else if (d.lectureId) {
                    title = d.lectureId.replace(/\.[^/.]+$/, "");
                }

                
                const questionContent = `<img src="${d.image}" alt="Screenshot" style="max-width: 100%; border-radius: 8px; margin-bottom: 12px;">\n<p>${d.comment || ""}</p>`;
                
                if (existingIndex >= 0) {
                    progressDoubts[existingIndex].title = title;
                    progressDoubts[existingIndex].subject = subject;
                    progressDoubts[existingIndex].editors[0].content = questionContent;
                    progressDoubts[existingIndex].metadata = {
                        courseId: d.courseId,
                        subfolder: d.subfolder,
                        lectureId: d.lectureId,
                        timestamp: d.timestamp
                    };
                } else {
                    progressDoubts.push({
                        id: d.createdAt,
                        title: title,
                        subject: subject,
                        status: 'Unsolved',
                        createdAt: new Date(d.createdAt).toISOString(),
                        metadata: {
                            courseId: d.courseId,
                            subfolder: d.subfolder,
                            lectureId: d.lectureId,
                            timestamp: d.timestamp
                        },
                        editors: [
                            { title: "Question", content: questionContent },
                            { title: "Solution", content: "" }
                        ]
                    });
                }
                localStorage.setItem('doubtsDashboard', JSON.stringify(progressDoubts));
            } catch (err) {
                console.error("Failed to sync doubt to progress app:", err);
            }
        }

        async function captureDoubt() {
            if (!currentCourse || !currentLectureLi || !videoPlayer || videoPlayer.readyState < 2) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoPlayer.videoWidth;
                canvas.height = videoPlayer.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                const lectureId = currentLectureLi.dataset.lectureId;
                const timestamp = videoPlayer.currentTime;
                const now = Date.now();
                const d = {
                    courseId: currentCourse.id,
                    subfolder: currentSubfolder || '',
                    lectureId: lectureId,
                    timestamp: timestamp,
                    image: dataUrl,
                    comment: '',
                    tags: [],
                    createdAt: now,
                    id: now
                };
                
                await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').add(d).onsuccess = r);
                syncDoubtToProgressApp(d);
                showToast("Doubt Screenshot Captured!");
            } catch (err) {
                console.error("Doubt capture failed:", err);
                showToast("Could not capture screenshot.", true);
            }
        }

        async function renderContinueView() {
            const history = await getHistoryEntries();
            const now = new Date();
            
            // Filter 30 hours for continue grid and exclude hidden
            const thirtyHoursAgo = new Date(now.getTime() - (30 * 60 * 60 * 1000));
            const recentHistory = history.filter(h => !h.isHiddenFromContinue && new Date(h.timestamp) >= thirtyHoursAgo);
            
            // Unique courses/subfolders from recent history
            const uniqueCoursesMap = new Map();
            recentHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
            for (const h of recentHistory) {
                const key = `${h.courseId}_${h.subfolder || ''}_${h.lectureId}`;
                if (!uniqueCoursesMap.has(key)) {
                    uniqueCoursesMap.set(key, h);
                }
            }
            const continueGrid = document.getElementById('history-continue-grid');
            continueGrid.innerHTML = '';
            
            if (uniqueCoursesMap.size === 0) {
                continueGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No courses studied in the last 30 hours.</p>';
            } else {
                let courseList = Array.from(uniqueCoursesMap.values());
                const sortSelect = document.getElementById('continue-sort-select');
                const sortVal = localStorage.getItem('continueSortPref') || 'last_studied';
                if (sortSelect && sortSelect.value !== sortVal) sortSelect.value = sortVal;
                
                // Fetch course references and calculate progress
                courseList.forEach(h => {
                    const course = courses.find(c => c.id === h.courseId);
                    if (course) {
                        h._progress = calculateCourseProgress(course, h.subfolder);
                        h._course = course;
                    }
                });
                
                // Filter out entries where course no longer exists
                courseList = courseList.filter(h => h._course);
                
                // Apply sorting
                if (sortVal === 'most_studied') {
                    courseList.sort((a, b) => b._progress.percentage - a._progress.percentage);
                } else if (sortVal === 'least_studied') {
                    courseList.sort((a, b) => a._progress.percentage - b._progress.percentage);
                }
                // (last_studied is already the default from the earlier timestamp sort)

                let htmlStr = '';
                for (const h of courseList) {
                    const course = h._course;
                    const progress = h._progress;
                    
                    let cardThumbnail = course.thumbnail;
                    if (h.subfolder && course.subCourseData && course.subCourseData[h.subfolder] && course.subCourseData[h.subfolder].thumbnail) {
                        cardThumbnail = course.subCourseData[h.subfolder].thumbnail;
                    }
                    
                    let rawTitle = course.title;
                    let titleHTML = `<span style="color: var(--text-primary); flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${course.title}</span>`;
                    
                    if (h.subfolder) {
                        const subName = getSubfolderDisplayName(course, h.subfolder);
                        rawTitle = `${course.title} - ${subName}`;
                        titleHTML += ` <span style="color: #22c55e; font-size: 0.85rem; margin-left: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 1;">${subName}</span>`;
                    }
                    
                    let lectureIndexStr = '';
                    if (course.lectures) {
                        let filteredLectures = course.lectures;
                        // If the subfolder is marked as 'Ignored', count relative to the subfolder
                        const isSubfolderIgnored = h.subfolder && course.subCourseData && course.subCourseData[h.subfolder] && course.subCourseData[h.subfolder].isIgnored;
                        if (isSubfolderIgnored) {
                            filteredLectures = course.lectures.filter(l => l.chapter === h.subfolder || l.chapter.startsWith(h.subfolder + '/'));
                        } else {
                            // Exclude any lectures that belong to ignored subfolders from the overall count
                            if (course.subCourseData) {
                                const ignoredSubfolders = Object.keys(course.subCourseData).filter(sub => course.subCourseData[sub].isIgnored);
                                if (ignoredSubfolders.length > 0) {
                                    filteredLectures = course.lectures.filter(l => {
                                        return !ignoredSubfolders.some(ignoredSub => l.chapter === ignoredSub || l.chapter.startsWith(ignoredSub + '/'));
                                    });
                                }
                            }
                        }
                        const idx = filteredLectures.findIndex(l => l.id === h.lectureId);
                        if (idx !== -1) {
                            lectureIndexStr = ` <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:transparent; color:#22c55e; border:1px solid #22c55e; font-size:0.8rem; margin-left:16px; font-weight:600; flex-shrink:0;">${idx + 1}</span>`;
                        }
                    }
                    
                    const cardSubtitle = `<div style="display: inline-flex; align-items: center; background: linear-gradient(90deg, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.05) 100%); border-left: 2px solid #3b82f6; border-radius: 4px; padding: 4px 8px; max-width: 100%; box-sizing: border-box; overflow: hidden;">
                        <span style="color: #ffffff; font-weight: bold; font-size: 0.8rem; margin-right: 6px; flex-shrink: 0; letter-spacing: 0.5px;">LEC -</span>
                        <span style="color: #ef4444; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${h.lectureName}</span>
                    </div>${lectureIndexStr}`;
                    
                    const lastStudiedDate = new Date(h.timestamp);
                    const formattedDate = lastStudiedDate.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                    const timeRemainingHrs = Math.ceil((progress.remainingDuration || 0) / 3600);
                    
                    htmlStr += `
                    <div class="course-card">
                        <div class="thumbnail-placeholder ${cardThumbnail ? 'has-thumbnail' : ''}" style="${cardThumbnail ? `background-image: url('${cardThumbnail}')` : ''}">
                            <i class="fas fa-history" style="font-size: 3rem;"></i>
                        </div>
                        <div class="course-info" style="position: relative; overflow: hidden;">
                            <button class="delete-continue-btn" data-course="${course.id}" data-subfolder="${h.subfolder || ''}" style="position: absolute; top: -10px; right: -10px; background: var(--bg-tertiary); border: 1px solid var(--border-secondary); color: var(--accent-danger); width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;"><i class="fas fa-times"></i></button>
                            <div style="overflow: hidden; max-width: 100%;">
                                <h3 title="${rawTitle}" style="font-size:1.15rem; margin-bottom:2px; display: flex; align-items: center; max-width: 100%; overflow: hidden;">${titleHTML}</h3>
                                <p style="font-size: 0.95rem; color: var(--text-primary); margin-top: 5px; font-weight: 500; display:flex; align-items:center;">${cardSubtitle}</p>
                                <div class="course-extra-info" style="justify-content: space-between; margin-top: 8px;">
                                    <div class="course-faculty" style="font-size:0.85rem;">${getSubfolderFacultyName(course, h.subfolder)}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${formattedDate}</div>
                                </div>
                                <p class="course-meta" style="color: #22c55e; margin-top: 8px; font-weight: bold; font-size:0.9rem;">${timeRemainingHrs} hrs left in this course</p>
                            </div>
                            <div class="course-progress-container" style="margin-top: 12px; margin-bottom: 12px;">
                                <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${progress.percentage}%"></div></div>
                                <div class="course-progress-text" style="font-size:0.85rem;">${progress.completed} / ${progress.total || course.videoCount || 0} lectures</div>
                            </div>
                            <button class="primary-btn history-continue-btn" data-course="${course.id}" data-lecture="${h.lectureId}" data-subfolder="${h.subfolder || ''}" style="margin-top: auto; font-size:1rem; padding:12px;">Resume</button>
                        </div>
                    </div>
                    `;
                }
                continueGrid.innerHTML = htmlStr;
            }
        }

        async function renderHistoryView() {
            const history = await getHistoryEntries();
            const now = new Date();
            
            // Filter 7 days for table and exclude hidden
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            const weekHistory = history.filter(h => !h.isHiddenFromHistory && new Date(h.timestamp) >= sevenDaysAgo);
            weekHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
            
            const tableBody = document.getElementById('history-table-body');
            tableBody.innerHTML = '';
            if (weekHistory.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-secondary);">No history found for the last 7 days.</td></tr>';
            } else {
                let htmlStr = '';
                weekHistory.forEach(h => {
                    htmlStr += `
                    <tr style="border-bottom: 1px solid var(--border-secondary);">
                        <td style="padding: 12px 16px; display: flex; align-items: center; gap: 10px;">
                            ${h.thumbnail ? `<img src="${h.thumbnail}" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">` : `<div style="width: 40px; height: 40px; background: var(--bg-tertiary); border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-video"></i></div>`}
                            <span>${h.courseTitle}</span>
                        </td>
                        <td style="padding: 12px 16px;">
                            <a href="#" class="history-play-link" data-course="${h.courseId}" data-lecture="${h.lectureId}" data-subfolder="${h.subfolder || ''}" style="color: var(--accent-primary); text-decoration: none; font-weight: 500;">${h.lectureName}</a>
                        </td>
                        <td style="padding: 12px 16px; color: var(--text-secondary);">${formatDuration(h.duration || 0)}</td>
                        <td style="padding: 12px 16px; color: var(--text-secondary);">${new Date(h.timestamp).toLocaleString(undefined, { day: 'numeric', month: 'long', weekday: 'long', hour: 'numeric', minute: 'numeric' })}</td>
                        <td style="padding: 12px 16px; text-align: right;">
                            <button class="delete-history-btn" data-id="${h.id}" style="background: none; border: none; color: var(--accent-danger); cursor: pointer; padding: 4px;"><i class="fas fa-times"></i></button>
                        </td>
                    </tr>
                    `;
                });
                tableBody.innerHTML = htmlStr;
            }
        }

        async function renderDoubtsCourseSelectionView() {
            nav.classList.remove('hidden');
            document.getElementById('doubts-detail-container').classList.add('hidden');
            const doubtsListContainer = document.getElementById('doubts-list-container');
            doubtsListContainer.classList.remove('hidden');
            const grid = document.getElementById('doubts-course-grid');
            grid.innerHTML = '';
            
            const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
            if (allDoubts.length === 0) {
                grid.innerHTML = '<p id="no-content-message">No doubts captured yet. Press "s" while playing a video to take a screenshot.</p>';
                return;
            }
            
            const grouped = {};
            allDoubts.forEach(d => {
                const key = `${d.courseId}_|_${d.subfolder}`;
                if (!grouped[key]) grouped[key] = { items: [], courseId: d.courseId, subfolder: d.subfolder };
                grouped[key].items.push(d);
            });
            
            for (const key in grouped) {
                const group = grouped[key];
                const course = courses.find(c => c.id === group.courseId);
                if (!course) continue;
                
                const count = group.items.length;
                let thumb = course.thumbnail;
                let hierarchyText = course.title;
                
                if (group.subfolder) {
                    hierarchyText += ` &raquo; ${getSubfolderDisplayName(course, group.subfolder)}`;
                    if (course.subCourseData && course.subCourseData[group.subfolder] && course.subCourseData[group.subfolder].thumbnail) {
                        thumb = course.subCourseData[group.subfolder].thumbnail;
                    }
                }
                
                const card = document.createElement('div');
                card.className = 'course-card';
                card.innerHTML = `
                    <div class="thumbnail-placeholder ${thumb ? 'has-thumbnail' : ''}" style="${thumb ? `background-image: url('${thumb}')` : ''}">
                         <i class="fas fa-question-circle" style="font-size: 3rem;"></i>
                    </div>
                    <div class="course-info" style="justify-content: space-between;">
                        <div>
                            <h3 style="font-size: 1.1rem;">${hierarchyText}</h3>
                            <div class="doubt-green-text" style="margin-top: 8px;">${count} doubts</div>
                        </div>
                        <button class="primary-btn enter-doubt-btn" style="margin-top: 12px; width: 100%;" data-c="${group.courseId}" data-s="${group.subfolder}">Enter</button>
                    </div>`;
                grid.appendChild(card);
            }
        }
        
        async function renderDoubtsDetailView(courseId, subfolder) {
            document.getElementById('doubts-list-container').classList.add('hidden');
            const detailContainer = document.getElementById('doubts-detail-container');
            detailContainer.classList.remove('hidden');
            
            const course = courses.find(c => c.id === courseId);
            const titleEl = document.getElementById('doubts-detail-title');
            titleEl.innerHTML = course ? course.title + (subfolder ? ` &raquo; ${getSubfolderDisplayName(course, subfolder)}` : '') : 'Doubts';
            
            const grid = document.getElementById('doubts-specific-grid');
            grid.innerHTML = '';
            
            const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
            const groupDoubts = allDoubts.filter(d => d.courseId === courseId && d.subfolder === subfolder);
            
            if (groupDoubts.length === 0) {
                 grid.innerHTML = '<p id="no-content-message">No doubts found for this folder.</p>';
                 return;
            }
            
            groupDoubts.sort((a,b) => b.createdAt - a.createdAt).forEach(d => {
                const card = document.createElement('div');
                card.className = 'doubt-card';
                card.dataset.id = d.id;
                card.innerHTML = `
                    <button class="delete-doubt-btn" data-id="${d.id}" title="Delete Doubt"><i class="fas fa-trash"></i></button>
                    <img src="${d.image}" alt="Doubt Snapshot">
                    <div class="doubt-meta">
                        <span class="doubt-timestamp" data-id="${d.id}" data-c="${d.courseId}" data-s="${d.subfolder}" data-l="${d.lectureId}" data-t="${d.timestamp}">
                            <i class="fas fa-play-circle"></i> ${formatTime(d.timestamp)}
                        </span>
                    </div>`;
                grid.appendChild(card);
            });
        }
        
        let activeDoubtId = null;
        async function openDoubtFullscreen(doubtId) {
            const d = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').get(parseInt(doubtId)).onsuccess = e => r(e.target.result));
            if (!d) return;
            activeDoubtId = d.id;
            
            document.getElementById('doubt-full-img').src = d.image;
            document.getElementById('doubt-comment-input').value = d.comment || '';
            renderDoubtTags(d.tags || []);
            document.getElementById('doubt-tag-input').value = '';
            
            document.getElementById('doubt-full-overlay').classList.remove('hidden');
        }
        
        function renderDoubtTags(tags) {
            const list = document.getElementById('doubt-tags-list');
            list.innerHTML = tags.map(tag => `
                <div class="doubt-tag">
                    <span>${tag}</span>
                    <i class="fas fa-times remove-tag" data-tag="${tag}"></i>
                </div>
            `).join('');
        }
        
        // Doubts View Event Listeners
        window.addEventListener('storage', (e) => {
            if (e.key === 'doubtsDashboard') {
                if (!document.getElementById('doubts-detail-container').classList.contains('hidden')) {
                     const courseId = parseInt(document.querySelector('.doubt-timestamp')?.dataset.c);
                     if(courseId) renderDoubtsDetailView(courseId, document.querySelector('.doubt-timestamp').dataset.s);
                     else renderDoubtsCourseSelectionView();
                } else if (!document.getElementById('doubts-list-container').classList.contains('hidden')) {
                     renderDoubtsCourseSelectionView();
                }
            }
        });
        
        document.body.addEventListener('click', async (e) => {
            if (e.target.closest('.history-continue-btn')) {
                const btn = e.target.closest('.history-continue-btn');
                const courseId = parseInt(btn.dataset.course);
                const subfolder = btn.dataset.subfolder;
                const lectureId = btn.dataset.lecture;
                if (lectureId && lectureId !== "undefined") {
                    playLectureFromAnywhere(courseId, lectureId, 'continue-view', subfolder || null);
                } else {
                    const viewEl = document.getElementById('subcourse-view');
                    viewEl.dataset.origin = 'continue-view';
                    viewEl.dataset.resumePath = subfolder || '';
                    renderSubcourseView(courseId, subfolder || '');
                }
            }
            if (e.target.closest('#clear-history-btn')) {
                if (confirm('Are you sure you want to clear your entire watch history?')) {
                    await clearWatchHistory();
                    if (!document.getElementById('history-view').classList.contains('hidden')) renderHistoryView();
                    if (!document.getElementById('continue-view').classList.contains('hidden')) renderContinueView();
                }
            }
            if (e.target.closest('#clear-continue-btn')) {
                if (confirm('Are you sure you want to clear all your active study sessions?')) {
                    await clearContinueHistory();
                    if (!document.getElementById('history-view').classList.contains('hidden')) renderHistoryView();
                    if (!document.getElementById('continue-view').classList.contains('hidden')) renderContinueView();
                }
            }
            if (e.target.closest('.delete-history-btn')) {
                const id = parseInt(e.target.closest('.delete-history-btn').dataset.id);
                await hideWatchHistoryEntry(id);
                renderHistoryView();
                // We should also re-render continue view in background
                renderContinueView();
            }
            if (e.target.closest('.delete-continue-btn')) {
                const btn = e.target.closest('.delete-continue-btn');
                const courseId = parseInt(btn.dataset.course);
                const subfolder = btn.dataset.subfolder;
                await hideContinueHistoryByCourseSubfolder(courseId, subfolder);
                renderContinueView();
                // Also update history view
                renderHistoryView();
            }
            if (e.target.closest('.history-play-link')) {
                e.preventDefault();
                const link = e.target.closest('.history-play-link');
                playLectureFromAnywhere(link.dataset.course, link.dataset.lecture, 'history-view', link.dataset.subfolder || null);
            }
            if (e.target.closest('.enter-doubt-btn')) {
                const btn = e.target.closest('.enter-doubt-btn');
                renderDoubtsDetailView(parseInt(btn.dataset.c), btn.dataset.s);
            }
            if (e.target.closest('#back-to-doubts-grid')) {
                renderDoubtsCourseSelectionView();
            }
            if (e.target.closest('.doubt-card') && !e.target.closest('.delete-doubt-btn') && !e.target.closest('.doubt-timestamp')) {
                activeDoubtId = e.target.closest('.doubt-card').dataset.id;
                openDoubtFullscreen(activeDoubtId);
            }
            if (e.target.closest('.close-doubt-full-btn')) {
                document.getElementById('doubt-full-overlay').classList.add('hidden');
                activeDoubtId = null;
            }
            if (e.target.closest('.delete-doubt-btn')) {
                const id = parseInt(e.target.closest('.delete-doubt-btn').dataset.id);
                if (confirm('Are you sure you want to delete this doubt snapshot?')) {
                    await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').delete(id).onsuccess = r);
                    try {
                        let progressDoubts = JSON.parse(localStorage.getItem('doubtsDashboard') || '[]');
                        progressDoubts = progressDoubts.filter(pd => pd.id !== id);
                        localStorage.setItem('doubtsDashboard', JSON.stringify(progressDoubts));
                    } catch (err) {}
                    // Rerender the active view logic
                    if (!document.getElementById('doubts-detail-container').classList.contains('hidden')) {
                         const headerSpan = document.querySelector('#doubt-timestamp'); // hacky but just re-render is better
                         const backBtn = document.getElementById('back-to-doubts-grid');
                         // We can just rely on user re-entering or refresh group
                         const courseId = parseInt(document.querySelector('.doubt-timestamp')?.dataset.c);
                         if(courseId) renderDoubtsDetailView(courseId, document.querySelector('.doubt-timestamp').dataset.s);
                         else renderDoubtsCourseSelectionView();
                    } else renderDoubtsCourseSelectionView();
                }
            }
            if (e.target.closest('.doubt-timestamp')) {
                const el = e.target.closest('.doubt-timestamp');
                const courseId = parseInt(el.dataset.c);
                const lectureId = el.dataset.l;
                const timestamp = parseFloat(el.dataset.t);
                const subfolder = el.dataset.s;
                switchView('player-view');
                await renderPlayer(courseId, lectureId, 'doubts-detail-view', timestamp, subfolder);
            }
            if (e.target.closest('.remove-tag')) {
                const tagToRemove = e.target.closest('.remove-tag').dataset.tag;
                if (!activeDoubtId) return;
                const d = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').get(activeDoubtId).onsuccess = e => r(e.target.result));
                if (d) {
                    d.tags = d.tags.filter(t => t !== tagToRemove);
                    await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').put(d).onsuccess = r);
                    renderDoubtTags(d.tags);
                }
            }
            if (e.target.closest('#add-doubt-tag-btn')) {
                const input = document.getElementById('doubt-tag-input');
                const tag = input.value.trim();
                if (tag && activeDoubtId) {
                    const d = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').get(activeDoubtId).onsuccess = e => r(e.target.result));
                    if (d) {
                        d.tags = d.tags || [];
                        if (!d.tags.includes(tag)) {
                            d.tags.push(tag);
                            await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').put(d).onsuccess = r);
                            renderDoubtTags(d.tags);
                        }
                        input.value = '';
                    }
                }
            }
            if (e.target.closest('#doubt-save-btn')) {
                if (activeDoubtId) {
                    const d = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').get(activeDoubtId).onsuccess = e => r(e.target.result));
                    if (d) {
                        d.comment = document.getElementById('doubt-comment-input').value;
                        await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').put(d).onsuccess = r);
                        syncDoubtToProgressApp(d);
                        showToast('Changes Saved!');
                    }
                }
            }
        });

        // --- Ignore Checkbox Logic ---
        document.body.addEventListener('change', async (e) => {
            if (e.target.classList.contains('course-ignore-cb')) {
                const courseId = parseInt(e.target.dataset.id);
                const subfolder = e.target.dataset.subfolder;
                const course = courses.find(c => c.id === courseId);
                
                if (course) {
                    if (subfolder) {
                        course.subCourseData = course.subCourseData || {};
                        course.subCourseData[subfolder] = course.subCourseData[subfolder] || {};
                        course.subCourseData[subfolder].isIgnored = e.target.checked;
                    } else {
                        course.isIgnored = e.target.checked;
                    }
                    await new Promise(resolve => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = resolve);
                    updateTotalTimeLeftDisplay(); // Re-calculate immediately
                }
            }
        });

        // --- Completion Calculator Logic ---
        document.getElementById('total-time-left-display').addEventListener('click', () => {
             const modal = document.getElementById('completion-calculator-modal');
             modal.querySelector('.close-modal-btn').onclick = () => modal.classList.add('hidden');
             modal.classList.remove('hidden');
             runCompletionCalculator();
        });

        document.getElementById('run-calculator-btn').addEventListener('click', runCompletionCalculator);
        document.getElementById('calc-daily-hours').addEventListener('input', runCompletionCalculator);
        document.getElementById('calc-playback-speed').addEventListener('input', runCompletionCalculator);
        
        // Restore calc config
        const savedHours = localStorage.getItem('calcDailyHours');
        if (savedHours) document.getElementById('calc-daily-hours').value = savedHours;
        const savedSpeed = localStorage.getItem('calcPlaybackSpeed');
        if (savedSpeed) document.getElementById('calc-playback-speed').value = savedSpeed;
        
        function runCompletionCalculator() {
             const displayEl = document.getElementById('total-time-left-display');
             const totalSeconds = parseFloat(displayEl.dataset.seconds || 0);
             const pendingLectures = parseInt(displayEl.dataset.lectures || 0);
             const totalLectures = parseInt(displayEl.dataset.totalLectures || 0);
             const completedLectures = parseInt(displayEl.dataset.completedLectures || 0);
             
             const dailyHours = parseFloat(document.getElementById('calc-daily-hours').value) || 7;
             const speed = parseFloat(document.getElementById('calc-playback-speed').value) || 1.5;
             
             localStorage.setItem('calcDailyHours', dailyHours);
             localStorage.setItem('calcPlaybackSpeed', speed);
             updateDailyGoalDisplay(dailyHours, speed);
             
             const calcProgressEl = document.getElementById('calc-progress-percentage');
             if (calcProgressEl) {
                 const pct = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;
                 calcProgressEl.innerText = `${pct}%`;
                 if (pct === 100) {
                     calcProgressEl.style.color = 'var(--success)';
                 } else {
                     calcProgressEl.style.color = 'var(--accent-primary)';
                 }
             }
             
             if (totalSeconds === 0) {
                 document.getElementById('calc-result-date').innerText = "Already Finished!";
                 document.getElementById('calc-result-stats').innerText = "0 pending lectures.";
                 return;
             }
             
             const totalHours = totalSeconds / 3600;
             const adjustedHours = totalHours / speed;
             const daysRequired = adjustedHours / dailyHours;
             
             const finishDate = new Date(Date.now() + (daysRequired * 24 * 60 * 60 * 1000));
             const options = { day: 'numeric', month: 'long', year: 'numeric' };
             const dateString = finishDate.toLocaleDateString('en-GB', options);
             
             document.getElementById('calc-result-date').innerText = dateString;
             document.getElementById('calc-result-stats').innerText = `${pendingLectures} pending lectures (${Math.ceil(adjustedHours)} hrs adjusted view time).`;
        }
        
        // --- FACULTY VIEW LOGIC ---
        function renderFacultyView() {
            const facultyGrid = document.getElementById('faculty-grid');
            facultyGrid.innerHTML = '';
            
            // 1. Aggregate Faculty Data
            const facultyMap = new Map(); // name -> { name, totalLectures, totalDurationSec, studiedDurationSec, studiedLectures }
            const aliases = JSON.parse(localStorage.getItem('courseflix_faculty_aliases')) || {};
            
            const processCourseForFaculty = (facultyName, courseTotalLectures, courseTotalDuration, courseStudiedDuration, courseStudiedLectures) => {
                if (!facultyName || facultyName === 'Unknown' || facultyName === 'N/A Faculty') return;
                
                let finalName = facultyName;
                while (aliases[finalName]) {
                    finalName = aliases[finalName];
                }

                let data = facultyMap.get(finalName);
                if (!data) {
                    data = { name: finalName, totalLectures: 0, totalDurationSec: 0, studiedDurationSec: 0, studiedLectures: 0 };
                    facultyMap.set(finalName, data);
                }
                data.totalLectures += courseTotalLectures;
                data.totalDurationSec += courseTotalDuration;
                data.studiedDurationSec += courseStudiedDuration;
                data.studiedLectures += courseStudiedLectures;
            };

            const timeFilter = document.getElementById('faculty-time-filter').value;
            let timeCutoff = 0;
            const now = Date.now();
            if (timeFilter === 'weekly') timeCutoff = now - 7 * 24 * 60 * 60 * 1000;
            else if (timeFilter === 'monthly') timeCutoff = now - 30 * 24 * 60 * 60 * 1000;

            courses.forEach(course => {
                if (!course.lectures) return;
                
                let hasSubfolders = course.subCourseData && Object.keys(course.subCourseData).length > 0;
                if (!hasSubfolders && course.lectures && course.lectures.some(l => l.chapter)) {
                    hasSubfolders = true;
                }
                
                if (!hasSubfolders) {
                    let totalLecs = 0, totalDur = 0, watchedDur = 0, watchedLecs = 0;
                    course.lectures.forEach(lecture => {
                        totalLecs++;
                        totalDur += (lecture.duration || 0);
                        const prog = getLectureProgress(course.id, lecture.id);
                        if (prog && prog.completed) {
                            if (timeCutoff > 0) {
                                if (prog.completedAt && new Date(prog.completedAt).getTime() >= timeCutoff) {
                                    watchedDur += (lecture.duration || 0);
                                    watchedLecs++;
                                }
                            } else {
                                watchedDur += (lecture.duration || 0);
                                watchedLecs++;
                            }
                        }
                    });
                    processCourseForFaculty(course.facultyName || 'Unknown', totalLecs, totalDur, watchedDur, watchedLecs);
                } else {
                    const subfolderStats = {}; 
                    
                    course.lectures.forEach(lecture => {
                        let topLevel = '';
                        if (lecture.chapter) {
                            topLevel = lecture.chapter.split('/')[0];
                        }
                        
                        let matchedSub = null;
                        if (course.subCourseData) {
                            for (const subName in course.subCourseData) {
                                if (lecture.chapter === subName || lecture.chapter.startsWith(subName + '/')) {
                                    matchedSub = subName;
                                    break;
                                }
                            }
                        }
                        
                        const effectiveSub = matchedSub || topLevel || 'Other Videos';
                        
                        if (!subfolderStats[effectiveSub]) {
                            let fName = course.facultyName || 'Unknown';
                            if (course.subCourseData && course.subCourseData[effectiveSub] && course.subCourseData[effectiveSub].facultyName) {
                                fName = course.subCourseData[effectiveSub].facultyName;
                            }
                            subfolderStats[effectiveSub] = { totalLecs: 0, totalDur: 0, watchedDur: 0, watchedLecs: 0, facultyName: fName };
                        }
                        
                        subfolderStats[effectiveSub].totalLecs++;
                        subfolderStats[effectiveSub].totalDur += (lecture.duration || 0);
                        const prog = getLectureProgress(course.id, lecture.id);
                        if (prog && prog.completed) {
                            if (timeCutoff > 0) {
                                if (prog.completedAt && new Date(prog.completedAt).getTime() >= timeCutoff) {
                                    subfolderStats[effectiveSub].watchedDur += (lecture.duration || 0);
                                    subfolderStats[effectiveSub].watchedLecs++;
                                }
                            } else {
                                subfolderStats[effectiveSub].watchedDur += (lecture.duration || 0);
                                subfolderStats[effectiveSub].watchedLecs++;
                            }
                        }
                    });
                    
                    for (const subName in subfolderStats) {
                        const stats = subfolderStats[subName];
                        processCourseForFaculty(stats.facultyName, stats.totalLecs, stats.totalDur, stats.watchedDur, stats.watchedLecs);
                    }
                }
            });

            const hiddenFaculties = JSON.parse(localStorage.getItem('courseflix_hidden_faculties')) || [];
            const hiddenProfileCourses = JSON.parse(localStorage.getItem('courseflix_hidden_profile_courses')) || [];
            const resetBtn = document.getElementById('reset-hidden-faculties-btn');
            const hasAliases = Object.keys(aliases).length > 0;
            if (hiddenFaculties.length > 0 || hasAliases || hiddenProfileCourses.length > 0) {
                resetBtn.style.display = 'inline-flex';
            } else {
                resetBtn.style.display = 'none';
            }

            const faculties = Array.from(facultyMap.values()).filter(f => !hiddenFaculties.includes(f.name));
            let facultyRatings = JSON.parse(localStorage.getItem('courseflix_faculty_meta')) || {};
            
            faculties.forEach(f => {
                const meta = facultyRatings[f.name] || { rating: 0, photo: '' };
                f.rating = meta.rating;
                f.photo = meta.photo;
            });
            
            const sortVal = document.getElementById('faculty-sort-select').value;
            let chartProperty = 'studiedDurationSec';
            let chartLabel = 'Time Studied';
            let chartIsTime = true;

            if (sortVal === 'most_studied') { faculties.sort((a,b) => b.studiedDurationSec - a.studiedDurationSec); }
            else if (sortVal === 'least_studied') { faculties.sort((a,b) => a.studiedDurationSec - b.studiedDurationSec); }
            else if (sortVal === 'most_taught_hours') { faculties.sort((a,b) => b.totalDurationSec - a.totalDurationSec); chartProperty = 'totalDurationSec'; chartLabel = 'Hours Taught'; }
            else if (sortVal === 'least_taught_hours') { faculties.sort((a,b) => a.totalDurationSec - b.totalDurationSec); chartProperty = 'totalDurationSec'; chartLabel = 'Hours Taught'; }
            else if (sortVal === 'most_lectures') { faculties.sort((a,b) => b.totalLectures - a.totalLectures); chartProperty = 'totalLectures'; chartLabel = 'Lectures Taught'; chartIsTime = false; }
            else if (sortVal === 'least_lectures') { faculties.sort((a,b) => a.totalLectures - b.totalLectures); chartProperty = 'totalLectures'; chartLabel = 'Lectures Taught'; chartIsTime = false; }
            else if (sortVal === 'most_fav') { faculties.sort((a,b) => b.rating - a.rating); }
            else if (sortVal === 'least_fav') { faculties.sort((a,b) => a.rating - b.rating); }
            
            const asideTitle = document.getElementById('faculty-aside-title');
            if (sortVal === 'most_studied') asideTitle.innerText = 'Most Studied Teachers';
            else if (sortVal === 'least_studied') asideTitle.innerText = 'Least Studied Teachers';
            else if (sortVal === 'most_taught_hours') asideTitle.innerText = 'Most Taught Teachers';
            else if (sortVal === 'least_taught_hours') asideTitle.innerText = 'Least Taught Teachers';
            else if (sortVal === 'most_lectures') asideTitle.innerText = 'Most Lectures';
            else if (sortVal === 'least_lectures') asideTitle.innerText = 'Least Lectures';
            else if (sortVal === 'most_fav') asideTitle.innerText = 'Highest Rated Teachers';
            else if (sortVal === 'least_fav') asideTitle.innerText = 'Lowest Rated Teachers';
            
            const pieChart = document.getElementById('faculty-pie-chart');
            const pieLegend = document.getElementById('faculty-pie-legend');
            const totalTimeSpan = document.getElementById('faculty-total-time');
            const totalTimeLabel = document.getElementById('faculty-total-label');
            const legendMetricLabel = document.getElementById('faculty-legend-metric');
            
            pieLegend.innerHTML = '';
            
            let totalAppMetric = faculties.reduce((sum, f) => sum + f[chartProperty], 0);
            
            if (chartIsTime) {
                totalTimeSpan.innerText = totalAppMetric > 0 ? `${Math.floor(totalAppMetric / 3600)}h ${Math.floor((totalAppMetric % 3600)/60)}m` : '0h 0m';
                if(totalTimeLabel) totalTimeLabel.innerText = 'Total Time';
                if(legendMetricLabel) legendMetricLabel.innerText = chartLabel;
            } else {
                totalTimeSpan.innerText = totalAppMetric;
                if(totalTimeLabel) totalTimeLabel.innerText = 'Total ' + chartLabel;
                if(legendMetricLabel) legendMetricLabel.innerText = chartLabel;
            }
            
            const chartFaculties = [...faculties]; 
            // Sort by metric descending for chart presentation (regardless of current sort)
            chartFaculties.sort((a,b) => b[chartProperty] - a[chartProperty]);
            const topChartFaculties = chartFaculties.slice(0, 5); 
            const otherChartFaculties = chartFaculties.slice(5);
            let otherMetric = otherChartFaculties.reduce((sum, f) => sum + f[chartProperty], 0);
            
            const chartData = [...topChartFaculties];
            if (otherMetric > 0) {
                let otherObj = { name: 'Others' };
                otherObj[chartProperty] = otherMetric;
                chartData.push(otherObj);
            }
            
            const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b'];
            let conicGradientStr = '';
            let currentAngle = 0;
            
            chartData.forEach((f, idx) => {
                if (totalAppMetric === 0) return;
                const percentage = (f[chartProperty] / totalAppMetric) * 100;
                const nextAngle = currentAngle + percentage;
                const color = colors[idx % colors.length];
                
                conicGradientStr += `${color} ${currentAngle}% ${nextAngle}%, `;
                currentAngle = nextAngle;
                
                let metricStr = '';
                if (chartIsTime) {
                    metricStr = f[chartProperty] > 0 ? `${Math.floor(f[chartProperty]/3600)}h ${Math.floor((f[chartProperty]%3600)/60)}m` : '0m';
                } else {
                    metricStr = f[chartProperty].toString();
                }
                
                const legendHtml = `
                    <div class="pie-legend-item">
                        <div style="display: flex; align-items: center;">
                            <div class="pie-legend-color" style="background-color: ${color}"></div>
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${f.name}</span>
                        </div>
                        <span>${metricStr}</span>
                    </div>
                `;
                pieLegend.insertAdjacentHTML('beforeend', legendHtml);
            });
            
            if (conicGradientStr) {
                conicGradientStr = conicGradientStr.slice(0, -2); 
                pieChart.style.background = `conic-gradient(${conicGradientStr})`;
            } else {
                pieChart.style.background = `var(--bg-tertiary)`;
                pieLegend.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">No data yet</div>';
            }

            faculties.forEach(f => {
                const totalTaughtStr = `${Math.floor(f.totalDurationSec / 3600)}h ${Math.floor((f.totalDurationSec % 3600)/60)}m`;
                const totalStudiedStr = `${Math.floor(f.studiedDurationSec / 3600)}h ${Math.floor((f.studiedDurationSec % 3600)/60)}m`;
                
                const card = document.createElement('div');
                card.className = 'faculty-card';
                card.innerHTML = `
                    <button class="hide-faculty-btn" data-faculty="${f.name}" title="Hide Faculty"><i class="fas fa-times"></i></button>
                    <div class="faculty-card-banner">
                        <div class="faculty-photo" style="cursor: pointer;" title="Edit Profile Photo">
                            ${f.photo ? `<img src="${f.photo}" alt="${f.name}">` : '<i class="fas fa-user"></i>'}
                            <div class="edit-photo-overlay">
                                <i class="fas fa-pencil-alt" style="color: white; font-size: 1rem;"></i>
                            </div>
                        </div>
                        <div class="faculty-card-header-info">
                            <h3 class="faculty-name" title="${f.name}">${f.name}</h3>
                            <div class="faculty-rating-stars" data-faculty="${f.name}">
                                ${[1,2,3,4,5].map(i => `<i class="fa-star ${i <= f.rating ? 'fas' : 'far'}" data-val="${i}"></i>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="faculty-stats-grid">
                        <div class="faculty-stat-item">
                            <span class="faculty-stat-val">${totalTaughtStr}</span>
                            <span class="faculty-stat-label">Hrs Taught</span>
                        </div>
                        <div class="faculty-stat-item">
                            <span class="faculty-stat-val">${totalStudiedStr}</span>
                            <span class="faculty-stat-label">Hrs Studied</span>
                        </div>
                        <div class="faculty-stat-item">
                            <span class="faculty-stat-val">${f.totalLectures}</span>
                            <span class="faculty-stat-label">Lecs Taught</span>
                        </div>
                        <div class="faculty-stat-item">
                            <span class="faculty-stat-val">${f.studiedLectures}</span>
                            <span class="faculty-stat-label">Lecs Studied</span>
                        </div>
                    </div>
                    <button class="view-faculty-profile-btn" data-faculty="${f.name}">Enter Profile</button>
                `;
                
                const stars = card.querySelectorAll('.faculty-rating-stars i');
                stars.forEach(s => {
                    s.addEventListener('click', (e) => {
                        const val = parseInt(e.target.dataset.val);
                        let meta = JSON.parse(localStorage.getItem('courseflix_faculty_meta')) || {};
                        if (!meta[f.name]) meta[f.name] = { rating: 0, photo: '' };
                        meta[f.name].rating = val;
                        localStorage.setItem('courseflix_faculty_meta', JSON.stringify(meta));
                        renderFacultyView(); 
                    });
                });
                
                const viewBtn = card.querySelector('.view-faculty-profile-btn');
                viewBtn.addEventListener('click', () => {
                    renderFacultyProfile(f.name);
                });
                
                const photoDiv = card.querySelector('.faculty-photo');
                photoDiv.addEventListener('mouseenter', () => photoDiv.querySelector('.edit-photo-overlay').style.opacity = '1');
                photoDiv.addEventListener('mouseleave', () => photoDiv.querySelector('.edit-photo-overlay').style.opacity = '0');
                photoDiv.addEventListener('click', () => {
                    const fileInput = document.getElementById('faculty-photo-upload');
                    fileInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (readerEvent) => {
                                const base64Data = readerEvent.target.result;
                                let meta = JSON.parse(localStorage.getItem('courseflix_faculty_meta')) || {};
                                if (!meta[f.name]) meta[f.name] = { rating: 0, photo: '' };
                                meta[f.name].photo = base64Data;
                                localStorage.setItem('courseflix_faculty_meta', JSON.stringify(meta));
                                renderFacultyView();
                            };
                            reader.readAsDataURL(file);
                        }
                        fileInput.value = ''; // reset for next use
                    };
                    fileInput.click();
                });

                const hideBtn = card.querySelector('.hide-faculty-btn');
                hideBtn.addEventListener('click', () => {
                    let hidden = JSON.parse(localStorage.getItem('courseflix_hidden_faculties')) || [];
                    if (!hidden.includes(f.name)) hidden.push(f.name);
                    localStorage.setItem('courseflix_hidden_faculties', JSON.stringify(hidden));
                    renderFacultyView();
                });
                
                card.draggable = true;
                
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', f.name);
                    card.style.opacity = '0.5';
                });
                
                card.addEventListener('dragend', (e) => {
                    card.style.opacity = '1';
                });
                
                card.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    card.style.borderColor = 'var(--accent-primary)';
                    card.style.boxShadow = '0 0 10px var(--accent-primary)';
                });
                
                card.addEventListener('dragleave', (e) => {
                    card.style.borderColor = 'var(--border-primary)';
                    card.style.boxShadow = 'none';
                });
                
                card.addEventListener('drop', (e) => {
                    e.preventDefault();
                    card.style.borderColor = 'var(--border-primary)';
                    card.style.boxShadow = 'none';
                    const draggedName = e.dataTransfer.getData('text/plain');
                    if (draggedName && draggedName !== f.name) {
                        let aliasesMap = JSON.parse(localStorage.getItem('courseflix_faculty_aliases')) || {};
                        aliasesMap[draggedName] = f.name;
                        localStorage.setItem('courseflix_faculty_aliases', JSON.stringify(aliasesMap));
                        renderFacultyView();
                    }
                });

                facultyGrid.appendChild(card);
            });
            
            if (faculties.length === 0) {
                facultyGrid.innerHTML = '<div id="no-content-message" style="grid-column: 1/-1;">No faculties found or all are hidden.</div>';
            }
        }
        
        document.getElementById('faculty-sort-select').addEventListener('change', renderFacultyView);
        document.getElementById('faculty-time-filter').addEventListener('change', renderFacultyView);
        const resetModal = document.getElementById('reset-preferences-modal');
        document.getElementById('reset-hidden-faculties-btn').addEventListener('click', () => {
            resetModal.style.display = 'flex';
        });
        document.getElementById('reset-hidden-option-btn').addEventListener('click', () => {
            localStorage.removeItem('courseflix_hidden_faculties');
            localStorage.removeItem('courseflix_hidden_profile_courses');
            resetModal.style.display = 'none';
            renderFacultyView();
        });
        document.getElementById('reset-merge-option-btn').addEventListener('click', () => {
            localStorage.removeItem('courseflix_faculty_aliases');
            resetModal.style.display = 'none';
            renderFacultyView();
        });
        document.getElementById('reset-both-option-btn').addEventListener('click', () => {
            localStorage.removeItem('courseflix_hidden_faculties');
            localStorage.removeItem('courseflix_faculty_aliases');
            localStorage.removeItem('courseflix_hidden_profile_courses');
            resetModal.style.display = 'none';
            renderFacultyView();
        });
        document.getElementById('reset-cancel-option-btn').addEventListener('click', () => {
            resetModal.style.display = 'none';
        });
        resetModal.addEventListener('click', (e) => {
            if (e.target === resetModal) resetModal.style.display = 'none';
        });
        
        
        document.getElementById('toggle-faculty-aside-btn').addEventListener('click', () => {
            document.getElementById('faculty-aside').classList.add('open');
        });
        document.getElementById('close-faculty-aside-btn').addEventListener('click', () => {
            document.getElementById('faculty-aside').classList.remove('open');
        });
        document.getElementById('close-faculty-profile-btn').addEventListener('click', () => {
            document.getElementById('faculty-profile-overlay').style.display = 'none';
        });

        function renderFacultyProfile(facultyName) {
            document.getElementById('faculty-profile-overlay').style.display = 'flex';
            document.getElementById('faculty-profile-title').innerText = facultyName;
            const grid = document.getElementById('faculty-profile-grid');
            grid.innerHTML = '';
            
            let animDelay = 0;
            const items = [];
            const aliases = JSON.parse(localStorage.getItem('courseflix_faculty_aliases')) || {};
            const resolveAlias = (name) => {
                let current = name;
                while (aliases[current]) {
                    current = aliases[current];
                }
                return current;
            };

            const hiddenCourses = JSON.parse(localStorage.getItem('courseflix_hidden_profile_courses')) || [];

            courses.forEach(course => {
                let hasSubfolders = course.subCourseData && Object.keys(course.subCourseData).length > 0;
                if (!hasSubfolders && course.lectures && course.lectures.some(l => l.chapter)) {
                    hasSubfolders = true;
                }
                if (!hasSubfolders) {
                    if (resolveAlias(course.facultyName || 'Unknown') === facultyName) {
                        if (!hiddenCourses.includes(course.id.toString())) {
                            items.push({ type: 'course', course });
                        }
                    }
                } else {
                    const processedSubs = new Set();
                    if (course.lectures) {
                        course.lectures.forEach(lecture => {
                            let topLevel = '';
                            if (lecture.chapter) {
                                topLevel = lecture.chapter.split('/')[0];
                            }
                            
                            let matchedSub = null;
                            if (course.subCourseData) {
                                for (const subName in course.subCourseData) {
                                    if (lecture.chapter === subName || lecture.chapter.startsWith(subName + '/')) {
                                        matchedSub = subName;
                                        break;
                                    }
                                }
                            }
                            
                            const effectiveSub = matchedSub || topLevel || 'Other Videos';
                            if (!processedSubs.has(effectiveSub)) {
                                processedSubs.add(effectiveSub);
                                
                                let fName = course.facultyName || 'Unknown';
                                if (course.subCourseData && course.subCourseData[effectiveSub] && course.subCourseData[effectiveSub].facultyName) {
                                    fName = course.subCourseData[effectiveSub].facultyName;
                                }
                                
                                if (resolveAlias(fName) === facultyName) {
                                    if (!hiddenCourses.includes(`${course.id}|${effectiveSub}`)) {
                                        items.push({ type: 'subfolder', course, subfolder: effectiveSub, subfolderRedirect: effectiveSub === 'Other Videos' ? '' : effectiveSub });
                                    }
                                }
                            }
                        });
                    }
                }
            });

            if (items.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; color: var(--text-secondary);">No courses found.</div>';
                return;
            }

            items.forEach(item => {
                const course = item.course;
                const isSubfolder = item.type === 'subfolder';
                const subPath = item.subfolder;
                
                let progress, ratingStarsHTML, titleHTML, cardSubtitle;
                
                if (isSubfolder) {
                    const subLectures = course.lectures ? course.lectures.filter(l => l.chapter === subPath || l.chapter.startsWith(subPath + '/')) : [];
                    const total = subLectures.length;
                    let completed = 0;
                    let remainingSecs = 0;
                    subLectures.forEach(l => {
                        const lp = getLectureProgress(course.id, l.id);
                        if(lp.completed) completed++;
                        else remainingSecs += (l.duration || 0);
                    });
                    progress = { completed, total, percentage: total > 0 ? (completed/total)*100 : 0 };
                    
                    const subData = (course.subCourseData && course.subCourseData[subPath]) || {};
                    const rating = subData.rating !== undefined ? subData.rating : (course.rating || 0);
                    ratingStarsHTML = Array.from({length: 5}, (_, i) => `<i class="fa${i < rating ? 's' : 'r'} fa-star" style="color: ${i < rating ? '#eab308' : 'var(--text-secondary)'};"></i>`).join('');
                    
                    const displayTitle = typeof getSubfolderDisplayName === 'function' ? getSubfolderDisplayName(course, subPath) : subPath;
                    titleHTML = `${displayTitle} <span style="font-size: 0.75rem; font-weight: bold; color: white; background: #8b5cf6; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">Subject</span>`;
                    cardSubtitle = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${course.title}</span>
                        <span style="display: flex; align-items: center; gap: 4px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                            <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)} hrs left
                        </span>
                    </div>`;
                } else {
                    progress = typeof calculateCourseProgress === 'function' ? calculateCourseProgress(course) : { completed: 0, total: 0, percentage: 0 };
                    const remainingSecs = progress.remainingDuration || 0;
                    ratingStarsHTML = Array.from({length: 5}, (_, i) => `<i class="fa${i < (course.rating || 0) ? 's' : 'r'} fa-star" style="color: ${i < (course.rating || 0) ? '#eab308' : 'var(--text-secondary)'};"></i>`).join('');
                    titleHTML = `${course.title} <span style="font-size: 0.75rem; font-weight: bold; color: white; background: #8b5cf6; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">Subject</span>`;
                    cardSubtitle = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
                        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Course</span>
                        <span style="display: flex; align-items: center; gap: 4px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                            <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)} hrs left
                        </span>
                    </div>`;
                }
                
                let hasDeeperFolders = false;
                if (isSubfolder) {
                    const prefix = subPath + '/';
                    hasDeeperFolders = course.lectures && course.lectures.some(l => l.chapter && l.chapter.startsWith(prefix) && l.chapter.length > prefix.length);
                } else {
                    hasDeeperFolders = course.chapters && course.chapters.length > 0;
                }
                
                const card = document.createElement('div');
                card.className = 'course-card search-anim-item';
                card.style.animationDelay = `${animDelay}s`;
                animDelay += 0.03;
                card.dataset.id = course.id;
                
                let thumbnailHTML = '<i class="fas fa-book"></i>';
                if (isSubfolder && course.subCourseData && course.subCourseData[subPath] && course.subCourseData[subPath].thumbnail) {
                     thumbnailHTML = `<img src="${course.subCourseData[subPath].thumbnail}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-book\\'></i>'">`;
                } else if (course.thumbnail) {
                     thumbnailHTML = `<img src="${course.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-book\\'></i>'">`;
                }
                
                card.innerHTML = `
                    <div class="thumbnail-placeholder" data-id="${course.id}" ${item.subfolderRedirect ? `data-subfolder="${item.subfolderRedirect}"` : (isSubfolder ? `data-subfolder="${subPath}"` : '')}>
                        ${thumbnailHTML}
                        <button class="hide-profile-course-btn" data-id="${course.id}" data-subfolder="${isSubfolder ? subPath : ''}" title="Hide Course from Profile" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="course-info">
                        <h3 title="${isSubfolder ? subPath : course.title}" style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">${titleHTML}</h3>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; width: 100%;">${cardSubtitle}</div>
                        <div class="course-extra-info">
                            <div class="course-faculty">${facultyName}</div>
                            <div class="course-rating" style="pointer-events: none;">${ratingStarsHTML}</div>
                        </div>
                        <div class="course-progress-container" style="margin-top: auto;">
                            <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${progress.percentage}%"></div></div>
                            <div class="course-progress-text">${progress.completed} / ${progress.total || course.videoCount || 0} completed</div>
                        </div>
                    </div>
                    <button class="enter-course-btn" data-id="${course.id}" data-has-deeper="${hasDeeperFolders}" ${item.subfolderRedirect ? `data-subfolder="${item.subfolderRedirect}"` : (isSubfolder ? `data-subfolder="${subPath}"` : '')} style="margin-top: auto;">${isSubfolder ? 'Enter Chapter' : 'Enter Course'}</button>
                `;
                
                card.addEventListener('click', (e) => {
                    const hideBtn = e.target.closest('.hide-profile-course-btn');
                    if (hideBtn) {
                        e.stopPropagation();
                        hideBtn.style.backgroundColor = 'var(--accent-danger)';
                        hideBtn.style.color = 'white';
                        setTimeout(() => {
                            const id = hideBtn.dataset.id;
                            const sub = hideBtn.dataset.subfolder || '';
                            const identifier = id + (sub ? '|' + sub : '');
                            let hCourses = JSON.parse(localStorage.getItem('courseflix_hidden_profile_courses')) || [];
                            if (!hCourses.includes(identifier)) {
                                hCourses.push(identifier);
                                localStorage.setItem('courseflix_hidden_profile_courses', JSON.stringify(hCourses));
                            }
                            renderFacultyProfile(facultyName);
                        }, 200);
                        return;
                    }

                    const viewEl = document.getElementById('subcourse-view');
                    viewEl.dataset.origin = 'faculty-view';
                    const enterBtn = e.target.closest('.enter-course-btn');
                    if (enterBtn) {
                        e.stopPropagation();
                        const id = enterBtn.dataset.id;
                        const sub = enterBtn.dataset.subfolder;
                        const hasDeeper = enterBtn.dataset.hasDeeper === 'true';
                        window.lastViewedFaculty = facultyName;
                        viewEl.dataset.resumePath = sub || '';
                        
                        if (hasDeeper) {
                            if (sub) renderSubcourseView(id, sub);
                            else renderSubcourseView(id);
                        } else {
                            playLectureFromAnywhere(id, null, 'faculty-view', sub || '');
                        }
                        return;
                    }

                    if (e.target.closest('.thumbnail-placeholder')) {
                        const tgt = e.target.closest('.thumbnail-placeholder');
                        const id = tgt.dataset.id;
                        const sub = tgt.dataset.subfolder;
                        window.lastViewedFaculty = facultyName;
                        viewEl.dataset.resumePath = sub || '';
                        if (sub) renderSubcourseView(id, sub);
                        else renderSubcourseView(id);
                    } else {
                        window.lastViewedFaculty = facultyName;
                        viewEl.dataset.resumePath = isSubfolder ? (subPath || '') : '';
                        if (isSubfolder) renderSubcourseView(course.id, subPath);
                        else renderSubcourseView(course.id);
                    }
                });
                grid.appendChild(card);
            });
        }

        // --- Init ---
        async function main() {
            if (!window.indexedDB || !window.showDirectoryPicker) { document.body.innerHTML = "<h1>Browser Not Supported</h1><p>Please use a modern browser like Google Chrome or Microsoft Edge that supports the File System Access API and IndexedDB.</p>"; return; }
            await openDB();
            await loadAllProgress();
            await loadCoursesFromDB();
            
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('playGoalsPlaylist')) {
                const pc = parseInt(urlParams.get('playCourse'));
                const pl = urlParams.get('playLecture');
                try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {} // clear params safely
                await renderGoalsPlayer(pc, pl);
                return;
            } else if (urlParams.has('playCourse') && urlParams.has('playLecture')) {
                const pc = parseInt(urlParams.get('playCourse'));
                const pl = urlParams.get('playLecture');
                try { window.history.replaceState({}, document.title, window.location.pathname); } catch(e) {} // clear params safely
                await playLectureFromAnywhere(pc, pl, 'dashboard-view');
                return;
            }
            
            let sessionRestored = false;
            const savedStateJSON = sessionStorage.getItem('courseflixState');
            // Always try to restore the player session so a refresh doesn't lose context
            if (savedStateJSON) {
                const navEntries = performance.getEntriesByType("navigation");
                const isReload = navEntries.length > 0 && navEntries[0].type === "reload";
                const isFromExternalPage = navEntries.length > 0 && navEntries[0].type === "navigate" && document.referrer && !document.referrer.endsWith('index.html');
                const isExplicitNavigation = !isReload && (isFromExternalPage || (window.location.hash && window.location.hash !== '#player-view'));
                
                if (isExplicitNavigation) {
                    sessionStorage.removeItem('courseflixState');
                } else {
                    const savedState = JSON.parse(savedStateJSON);
                    if (savedState.view === 'player-view' && savedState.courseId && savedState.lectureId) {
                        if (savedState.sidebarCollapsed) {
                            lectureMenu.classList.add('hidden');
                            sidebarToggleBtn.classList.add('collapsed');
                        }
                        const courseExists = courses.some(c => c.id === savedState.courseId);
                        if (courseExists) {
                          if (savedState.isGoalsPlaylist) {
                              await renderGoalsPlayer(savedState.courseId, savedState.lectureId);
                              if (savedState.currentTime) {
                                  videoPlayer.currentTime = savedState.currentTime;
                              }
                          } else {
                              await renderPlayer(savedState.courseId, savedState.lectureId, savedState.lastView, savedState.currentTime, savedState.subfolder);
                          }
                          sessionRestored = true;
                        }
                    }
                }
            }
            
            const sortSelect = document.getElementById('course-sort-select');
            if (sortSelect) {
                sortSelect.addEventListener('change', () => {
                    localStorage.setItem('courseSortPref', sortSelect.value);
                    renderCourseGrid();
                });
            }
            
            const continueSortSelect = document.getElementById('continue-sort-select');
            if (continueSortSelect) {
                continueSortSelect.addEventListener('change', () => {
                    localStorage.setItem('continueSortPref', continueSortSelect.value);
                    renderContinueView();
                });
            }
            
            async function handleRoute() {
                const hash = window.location.hash.substring(1);
                if (!hash || hash === 'dashboard-view') {
                    switchView('dashboard-view', false);
                    return;
                }
                if (hash.startsWith('subcourse/')) {
                    const parts = hash.split('/');
                    const courseId = parseInt(parts[1]);
                    const path = parts.slice(2).join('/');
                    if (courseId) {
                        await renderSubcourseView(courseId, decodeURIComponent(path), false);
                    }
                    return;
                }
                if (hash.endsWith('-view')) {
                    switchView(hash, false);
                    return;
                }
            }
            window.addEventListener('hashchange', handleRoute);
            
            if (window.location.hash && !sessionRestored) {
                await handleRoute();
            } else if (!sessionRestored) {
                switchView('dashboard-view');
            }
            // --- Global Search Logic ---
            const searchInput = document.getElementById('global-search-input');
            const searchView = document.getElementById('search-results-view');
            const backBtn = document.getElementById('back-from-search-btn');
            
            if (searchInput) {
                const searchContainer = document.getElementById('search-bar-container');
                searchInput.addEventListener('focus', () => {
                    searchContainer.style.borderColor = 'var(--accent-primary)';
                    searchContainer.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
                    searchContainer.style.width = '260px';
                });
                searchInput.addEventListener('blur', () => {
                    searchContainer.style.borderColor = 'var(--border-secondary)';
                    searchContainer.style.boxShadow = '0 2px 5px rgba(0,0,0,0.05)';
                    if (!searchInput.value.trim()) {
                         searchContainer.style.width = '220px';
                    }
                });

                backBtn.addEventListener('click', () => {
                    switchView('dashboard-view');
                    searchInput.value = '';
                    if (!searchInput.value.trim() && document.activeElement !== searchInput) {
                        searchContainer.style.width = '220px';
                    }
                });

                window.globalSearchMode = window.globalSearchMode || 'partial';
                window.globalFacultySearchMode = window.globalFacultySearchMode || false;
                
                function performGlobalSearch(query) {
                    query = query.trim();
                    // Exclude pure numbers and extremely short queries
                    if (/^\d+$/.test(query) || query.length < 2) {
                        return { subjects: [], chapters: [], lectures: [], facultyCourses: [], facultyNameMatch: null };
                    }
                    
                    const qLower = query.toLowerCase();
                    
                    let exactRegex = null;
                    if (window.globalSearchMode === 'exact') {
                        try {
                            exactRegex = new RegExp(`\\b${query}\\b`);
                        } catch(e) {
                            exactRegex = new RegExp(query); // fallback
                        }
                    }
                    
                    const checkMatch = (text) => {
                        if (!text) return false;
                        if (window.globalSearchMode === 'exact') {
                            return exactRegex.test(text); // Case sensitive exact match
                        }
                        return text.toLowerCase().includes(qLower); // Case insensitive partial match
                    };
                    
                    const matchedSubjects = [];
                    const matchedChapters = [];
                    const matchedLectures = [];
                    const facultyCourses = [];
                    let facultyNameMatch = null;
                    
                    courses.forEach(course => {
                        let isTitleMatch = checkMatch(course.title);
                        let isFacultyMatch = checkMatch(course.facultyName);
                        
                        if (window.globalFacultySearchMode) {
                            if (isFacultyMatch) {
                                matchedSubjects.push({ type: 'subject', course });
                            }
                            if (course.subCourseData) {
                                Object.keys(course.subCourseData).forEach(subPath => {
                                    if (checkMatch(course.subCourseData[subPath].facultyName)) {
                                        matchedSubjects.push({ type: 'subfolder', course, subfolder: subPath });
                                    }
                                });
                            }
                            return; // Only search faculty and show subjects
                        }
                        
                        if (isTitleMatch) {
                            matchedSubjects.push({ type: 'subject', course });
                        }
                        
                        if (isFacultyMatch) {
                            facultyNameMatch = course.facultyName;
                            if (!isTitleMatch) {
                                facultyCourses.push({ type: 'subject', course });
                            }
                        }
                        
                        const matchedSubfolderNames = new Set();
                        course.chapters = course.chapters || [];
                        course.chapters.forEach(ch => {
                             if (checkMatch(ch.name)) {
                                 matchedSubfolderNames.add(ch.name);
                             }
                        });
                        
                        let facultyMatchedInSubfolder = false;
                        
                        if (course.subCourseData) {
                             Object.keys(course.subCourseData).forEach(subPath => {
                                 const sd = course.subCourseData[subPath];
                                 if (checkMatch(sd.customName)) {
                                     matchedSubfolderNames.add(subPath);
                                 }
                                 if (checkMatch(sd.facultyName)) {
                                     if (!facultyNameMatch) facultyNameMatch = sd.facultyName;
                                     facultyMatchedInSubfolder = true;
                                 }
                             });
                        }
                        
                        if (facultyMatchedInSubfolder && !isFacultyMatch) {
                             if (!isTitleMatch) { // prevent duplicates if it was already a title match
                                 // check if it's already in facultyCourses
                                 if (!facultyCourses.some(fc => fc.course.id === course.id)) {
                                     facultyCourses.push({ type: 'subject', course });
                                 }
                             }
                        }
                        
                        matchedSubfolderNames.forEach(subPath => {
                             matchedChapters.push({ type: 'subfolder', course, subfolder: subPath });
                        });
                        
                        if (course.lectures) {
                            course.lectures.forEach(l => {
                                if (checkMatch(l.chapter) && !matchedSubfolderNames.has(l.chapter)) {
                                    matchedSubfolderNames.add(l.chapter);
                                    matchedChapters.push({ type: 'subfolder', course, subfolder: l.chapter });
                                }
                                if (checkMatch(l.name)) {
                                    matchedLectures.push({ course, lecture: l });
                                }
                            });
                        }
                    });
                    
                    // "IF THERE IS ONLY 1 CHAPATER OR SUBJECT THEN SHOW THEM BY DEFAULT ON ROW 1"
                    if (matchedSubjects.length === 0 && matchedChapters.length === 1) {
                        matchedSubjects.push(matchedChapters.pop());
                    }
                    
                    return { subjects: matchedSubjects, chapters: matchedChapters, lectures: matchedLectures, facultyCourses, facultyNameMatch };
                }
                
                function renderSearchResults(query) {
                    const results = performGlobalSearch(query);
                    
                    const subjSec = document.getElementById('search-results-subjects-section');
                    const subjGrid = document.getElementById('search-results-subjects-grid');
                    const chapSec = document.getElementById('search-results-chapters-section');
                    const chapGrid = document.getElementById('search-results-chapters-grid');
                    const lecSec = document.getElementById('search-results-lectures-section');
                    const lecList = document.getElementById('search-results-lectures-list');
                    const facSec = document.getElementById('search-results-faculty-section');
                    const facGrid = document.getElementById('search-results-faculty-grid');
                    const facTitle = document.getElementById('faculty-section-title');
                    const noRes = document.getElementById('search-no-results');
                    const subjTitle = document.getElementById('subject-section-title');
                    
                    subjGrid.innerHTML = ''; chapGrid.innerHTML = ''; lecList.innerHTML = ''; facGrid.innerHTML = '';
                    
                    let hasResults = false;
                    let animDelay = 0;
                    
                    const createCard = (item) => {
                            const course = item.course;
                            const isSubfolder = item.type === 'subfolder';
                            const subPath = item.subfolder;
                            
                            let progress, ratingStarsHTML, titleHTML, cardSubtitle;
                            
                            if (isSubfolder) {
                                const subLectures = course.lectures ? course.lectures.filter(l => l.chapter === subPath || l.chapter.startsWith(subPath + '/')) : [];
                                const total = subLectures.length;
                                let completed = 0;
                                let remainingSecs = 0;
                                subLectures.forEach(l => {
                                    const lp = getLectureProgress(course.id, l.id);
                                    if(lp.completed) completed++;
                                    else remainingSecs += (l.duration || 0);
                                });
                                progress = { completed, total, percentage: total > 0 ? (completed/total)*100 : 0 };
                                
                                const subData = (course.subCourseData && course.subCourseData[subPath]) || {};
                                const rating = subData.rating !== undefined ? subData.rating : (course.rating || 0);
                                ratingStarsHTML = Array.from({length: 5}, (_, i) => `<i class="fa${i < rating ? 's' : 'r'} fa-star" style="color: ${i < rating ? '#eab308' : 'var(--text-secondary)'};"></i>`).join('');
                                
                                const displayTitle = getSubfolderDisplayName(course, subPath);
                                const badgeText = window.globalFacultySearchMode ? 'Subject' : 'Chapter';
                                const badgeBg = window.globalFacultySearchMode ? '#8b5cf6' : '#22c55e';
                                titleHTML = `${displayTitle} <span style="font-size: 0.75rem; font-weight: bold; color: white; background: ${badgeBg}; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">${badgeText}</span>`;
                                cardSubtitle = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${course.title}</span>
                                    <span style="display: flex; align-items: center; gap: 4px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                                        <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)} hrs left
                                    </span>
                                </div>`;
                            } else {
                                progress = calculateCourseProgress(course);
                                const remainingSecs = progress.remainingDuration || 0;
                                ratingStarsHTML = Array.from({length: 5}, (_, i) => `<i class="fa${i < (course.rating || 0) ? 's' : 'r'} fa-star" style="color: ${i < (course.rating || 0) ? '#eab308' : 'var(--text-secondary)'};"></i>`).join('');
                                titleHTML = `${course.title} <span style="font-size: 0.75rem; font-weight: bold; color: white; background: #8b5cf6; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">Subject</span>`;
                                cardSubtitle = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
                                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Course</span>
                                    <span style="display: flex; align-items: center; gap: 4px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; flex-shrink: 0;">
                                        <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)} hrs left
                                    </span>
                                </div>`;
                            }
                            
                            const card = document.createElement('div');
                            card.className = 'course-card search-anim-item';
                            card.style.animationDelay = `${animDelay}s`;
                            animDelay += 0.03;
                            
                            card.dataset.id = course.id;
                            
                            let thumbnailHTML = '<i class="fas fa-book"></i>';
                            if (isSubfolder && course.subCourseData && course.subCourseData[subPath] && course.subCourseData[subPath].thumbnail) {
                                 thumbnailHTML = `<img src="${course.subCourseData[subPath].thumbnail}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-book\\'></i>'">`;
                            } else if (course.thumbnail) {
                                 thumbnailHTML = `<img src="${course.thumbnail}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-book\\'></i>'">`;
                            }

                            const facultyNameToDisplay = isSubfolder ? getSubfolderFacultyName(course, subPath) : (course.facultyName || 'N/A Faculty');
                            
                            card.innerHTML = `
                                <div class="thumbnail-placeholder" data-id="${course.id}" ${item.subfolderRedirect ? `data-subfolder="${item.subfolderRedirect}"` : (isSubfolder ? `data-subfolder="${subPath}"` : '')}>
                                    ${thumbnailHTML}
                                </div>
                                <div class="course-info">
                                    <h3 title="${isSubfolder ? subPath : course.title}" style="display: flex; align-items: center; flex-wrap: wrap; gap: 4px;">${titleHTML}</h3>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; width: 100%;">${cardSubtitle}</div>
                                    <div class="course-extra-info">
                                        <div class="course-faculty">${facultyNameToDisplay}</div>
                                        <div class="course-rating" style="pointer-events: none;">${ratingStarsHTML}</div>
                                    </div>
                                    <div class="course-progress-container" style="margin-top: auto;">
                                        <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${progress.percentage}%"></div></div>
                                        <div class="course-progress-text">${progress.completed} / ${progress.total || course.videoCount || 0} completed</div>
                                    </div>
                                </div>
                                <button class="enter-course-btn" data-id="${course.id}" ${item.subfolderRedirect ? `data-subfolder="${item.subfolderRedirect}"` : (isSubfolder ? `data-subfolder="${subPath}"` : '')} style="margin-top: auto;">${isSubfolder ? 'Enter Chapter' : 'Enter Course'}</button>
                            `;
                            return card;
                    };
                    
                    if (results.subjects.length > 0) {
                        hasResults = true; subjSec.style.display = 'block';
                        if (window.globalFacultySearchMode) {
                            subjTitle.textContent = `Subjects taught by "${query}"`;
                        } else {
                            subjTitle.textContent = 'Matching Subjects';
                        }
                        results.subjects.forEach(item => subjGrid.appendChild(createCard(item)));
                    } else { subjSec.style.display = 'none'; }
                    
                    if (results.chapters.length > 0) {
                        hasResults = true; chapSec.style.display = 'block';
                        results.chapters.forEach(item => chapGrid.appendChild(createCard(item)));
                    } else { chapSec.style.display = 'none'; }
                    
                    if (results.facultyCourses.length > 0) {
                        hasResults = true; facSec.style.display = 'block';
                        facTitle.textContent = `Other Subjects taught by ${results.facultyNameMatch}`;
                        results.facultyCourses.forEach(item => facGrid.appendChild(createCard(item)));
                    } else { facSec.style.display = 'none'; }
                    
                    if (results.lectures.length > 0) {
                        hasResults = true;
                        lecSec.style.display = 'block';
                        
                        const lecTitle = lecSec.querySelector('h2');
                        if (lecTitle) lecTitle.innerHTML = `${results.lectures.length} Lectures Found`;
                        
                        // Group lectures by course + chapter
                        const groupedLectures = {};
                        results.lectures.forEach(({course, lecture}) => {
                             const key = `${course.id}_${lecture.chapter}`;
                             if (!groupedLectures[key]) {
                                 groupedLectures[key] = { course, chapter: lecture.chapter, lectures: [] };
                             }
                             groupedLectures[key].lectures.push(lecture);
                        });
                        
                        Object.values(groupedLectures).forEach(group => {
                             const subName = getSubfolderDisplayName(group.course, group.chapter);
                             
                             const groupEl = document.createElement('div');
                             groupEl.className = 'search-lecture-group search-anim-item';
                             groupEl.style.animationDelay = `${animDelay}s`;
                             animDelay += 0.03;
                             groupEl.style.cssText = 'background: var(--bg-secondary); border: 1px solid var(--border-secondary); border-radius: 8px; overflow: hidden; margin-bottom: 12px;';
                             
                             const headerEl = document.createElement('div');
                             headerEl.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; cursor: pointer; background: var(--bg-tertiary);';
                             
                             headerEl.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="font-size: 1.2rem; color: var(--accent-primary);"><i class="fas fa-folder-open"></i></div>
                                    <div style="display: flex; flex-direction: column;">
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="color: var(--text-primary); font-weight: 600; font-size: 1rem;">${subName}</span>
                                            <span style="font-size: 0.7rem; font-weight: bold; color: white; background: #22c55e; padding: 2px 8px; border-radius: 12px;">Chapter</span>
                                        </div>
                                        <span style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 2px;">${group.course.title} • ${getSubfolderFacultyName(group.course, group.chapter)} • ${group.lectures.length} matching lecture${group.lectures.length > 1 ? 's' : ''}</span>
                                    </div>
                                </div>
                                <div style="color: var(--text-secondary); transition: transform 0.3s;"><i class="fas fa-chevron-down"></i></div>
                             `;
                             
                             const listContainer = document.createElement('div');
                             listContainer.style.cssText = 'display: none; flex-direction: column; padding: 8px 16px; border-top: 1px solid var(--border-secondary); background: var(--bg-secondary);';
                             
                             group.lectures.forEach(lecture => {
                                 const progress = getLectureProgress(group.course.id, lecture.id);
                                 const completed = progress.completed ? '<i class="fas fa-check-circle" style="color: #22c55e;"></i>' : '<i class="far fa-circle" style="color: var(--text-secondary);"></i>';
                                 
                                 const lItem = document.createElement('div');
                                 lItem.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-primary); cursor: pointer;';
                                 lItem.innerHTML = `
                                    <div style="display: flex; align-items: center; gap: 12px; overflow: hidden; width: 100%;">
                                        <div style="font-size: 1.1rem; flex-shrink: 0;">${completed}</div>
                                        <div style="display: flex; align-items: center; gap: 8px; flex-grow: 1; overflow: hidden;">
                                            <span style="color: var(--text-primary); font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lecture.name}</span>
                                            <span style="font-size: 0.7rem; font-weight: bold; color: white; background: #3b82f6; padding: 2px 8px; border-radius: 12px; flex-shrink: 0;">Lecture</span>
                                        </div>
                                    </div>
                                    <button class="icon-btn" style="color: var(--accent-primary); flex-shrink: 0; transform: scale(0.85);"><i class="fas fa-play"></i></button>
                                 `;
                                 
                                 if (lecture === group.lectures[group.lectures.length - 1]) lItem.style.borderBottom = 'none';
                                 
                                 lItem.addEventListener('mouseover', () => lItem.querySelector('.icon-btn').style.background = 'var(--bg-tertiary)');
                                 lItem.addEventListener('mouseout', () => lItem.querySelector('.icon-btn').style.background = 'transparent');
                                 
                                 lItem.addEventListener('click', () => {
                                    playLectureFromAnywhere(group.course.id, lecture.id, 'search-results-view', lecture.chapter);
                                 });
                                 listContainer.appendChild(lItem);
                             });
                             
                             let isOpen = false;
                             headerEl.addEventListener('click', () => {
                                 isOpen = !isOpen;
                                 if (isOpen) {
                                     listContainer.style.display = 'flex';
                                     headerEl.querySelector('.fa-chevron-down').parentElement.style.transform = 'rotate(180deg)';
                                 } else {
                                     listContainer.style.display = 'none';
                                     headerEl.querySelector('.fa-chevron-down').parentElement.style.transform = 'rotate(0deg)';
                                 }
                             });
                             
                             groupEl.appendChild(headerEl);
                             groupEl.appendChild(listContainer);
                             lecList.appendChild(groupEl);
                        });
                    } else {
                        lecSec.style.display = 'none';
                    }
                    
                    if (hasResults) {
                        noRes.style.display = 'none';
                        
                        // Handle Jump Bar Logic
                        setTimeout(() => {
                            const searchView = document.getElementById('search-results-view');
                            const jumpBar = document.getElementById('search-jump-bar');
                            const btnLectures = document.getElementById('jump-to-lectures');
                            const btnChapters = document.getElementById('jump-to-chapters');
                            const btnSubjects = document.getElementById('jump-to-subjects');

                            if (!searchView || !jumpBar) return;

                            // Show buttons if their respective sections have results
                            const hasLec = results.lectures && results.lectures.length > 0;
                            const hasChap = results.chapters && results.chapters.length > 0;
                            const hasSubj = results.subjects && results.subjects.length > 0;
                            
                            btnLectures.style.display = hasLec ? 'block' : 'none';
                            btnChapters.style.display = hasChap ? 'block' : 'none';
                            btnSubjects.style.display = hasSubj ? 'block' : 'none';

                            // Check if scroll is needed
                            // We compare scrollHeight to clientHeight to see if content overflows
                            // We also ensure there's more than one section, otherwise jumping is pointless
                            let sectionsCount = (hasLec ? 1 : 0) + (hasChap ? 1 : 0) + (hasSubj ? 1 : 0);
                            
                            if (searchView.scrollHeight > searchView.clientHeight && sectionsCount > 1) {
                                jumpBar.style.display = 'flex';
                            } else {
                                jumpBar.style.display = 'none';
                            }
                        }, 50); // Small delay to let the DOM paint and calculate heights accurately
                    } else {
                        noRes.style.display = 'block';
                        const jumpBar = document.getElementById('search-jump-bar');
                        if (jumpBar) jumpBar.style.display = 'none';
                    }
                }
                
                let searchTimeout;
                const searchResultsInput = document.getElementById('search-results-input');
                const btnPartial = document.getElementById('search-mode-partial');
                const btnExact = document.getElementById('search-mode-exact');
                const btnFaculty = document.getElementById('search-mode-faculty');

                function updateSearchModeUI() {
                    if (window.globalSearchMode === 'partial') {
                        btnPartial.style.background = 'var(--accent-primary)';
                        btnPartial.style.color = 'white';
                        btnPartial.style.border = '1px solid var(--accent-primary)';
                        
                        btnExact.style.background = 'transparent';
                        btnExact.style.color = 'var(--text-secondary)';
                        btnExact.style.border = '1px solid var(--border-secondary)';
                    } else {
                        btnExact.style.background = 'var(--accent-primary)';
                        btnExact.style.color = 'white';
                        btnExact.style.border = '1px solid var(--accent-primary)';
                        
                        btnPartial.style.background = 'transparent';
                        btnPartial.style.color = 'var(--text-secondary)';
                        btnPartial.style.border = '1px solid var(--border-secondary)';
                    }
                    
                    if (window.globalFacultySearchMode) {
                        btnFaculty.style.background = 'var(--accent-primary)';
                        btnFaculty.style.color = 'white';
                        btnFaculty.style.borderColor = 'var(--accent-primary)';
                        searchResultsInput.placeholder = 'Search by Teacher Name...';
                    } else {
                        btnFaculty.style.background = 'var(--bg-tertiary)';
                        btnFaculty.style.color = 'var(--text-secondary)';
                        btnFaculty.style.borderColor = 'transparent';
                        searchResultsInput.placeholder = 'Search courses, chapters, or videos...';
                    }
                    
                    if (searchResultsInput && searchResultsInput.value) renderSearchResults(searchResultsInput.value);
                }

                if (btnPartial) btnPartial.addEventListener('click', () => { window.globalSearchMode = 'partial'; updateSearchModeUI(); });
                if (btnExact) btnExact.addEventListener('click', () => { window.globalSearchMode = 'exact'; updateSearchModeUI(); });
                if (btnFaculty) btnFaculty.addEventListener('click', () => { window.globalFacultySearchMode = !window.globalFacultySearchMode; updateSearchModeUI(); });
                
                // Jump Bar Event Listeners
                const btnJumpLec = document.getElementById('jump-to-lectures');
                const btnJumpChap = document.getElementById('jump-to-chapters');
                const btnJumpSubj = document.getElementById('jump-to-subjects');
                
                let currentActiveJumpBtn = null;
                
                function setActiveJumpBtn(btnId) {
                    currentActiveJumpBtn = btnId;
                    document.querySelectorAll('.jump-btn').forEach(b => {
                        if (b.id === btnId) {
                            b.style.background = 'var(--accent-primary)';
                            b.style.color = 'white';
                            b.style.borderColor = 'var(--accent-primary)';
                        } else {
                            b.style.background = 'var(--bg-tertiary)';
                            b.style.color = 'var(--text-primary)';
                            b.style.borderColor = 'var(--border-primary)';
                        }
                    });
                }
                
                function customScrollToSection(sectionId, btnId) {
                    const sec = document.getElementById(sectionId);
                    const container = document.getElementById('search-results-view');
                    if (sec && container) {
                        setActiveJumpBtn(btnId);
                        
                        // The sticky header height is roughly 140px. 
                        // Using offsetTop directly avoids the `scrollIntoView` bug that scrolls the entire page body.
                        const stickyHeader = container.firstElementChild;
                        const headerOffset = stickyHeader ? stickyHeader.offsetHeight : 140;
                        
                        container.scrollTo({
                            top: sec.offsetTop - headerOffset - 20, // 20px extra padding
                            behavior: 'smooth'
                        });
                    }
                }

                if (btnJumpLec) btnJumpLec.addEventListener('click', () => customScrollToSection('search-results-lectures-section', 'jump-to-lectures'));
                if (btnJumpChap) btnJumpChap.addEventListener('click', () => customScrollToSection('search-results-chapters-section', 'jump-to-chapters'));
                if (btnJumpSubj) btnJumpSubj.addEventListener('click', () => customScrollToSection('search-results-subjects-section', 'jump-to-subjects'));

                // Add hover effects for jump buttons
                document.querySelectorAll('.jump-btn').forEach(btn => {
                    btn.addEventListener('mouseover', () => {
                        if (currentActiveJumpBtn === btn.id) return;
                        btn.style.background = 'var(--accent-primary)';
                        btn.style.color = 'white';
                        btn.style.borderColor = 'var(--accent-primary)';
                    });
                    btn.addEventListener('mouseout', () => {
                        if (currentActiveJumpBtn === btn.id) return;
                        btn.style.background = 'var(--bg-tertiary)';
                        btn.style.color = 'var(--text-primary)';
                        btn.style.borderColor = 'var(--border-primary)';
                    });
                });

                // Initialize default UI state
                updateSearchModeUI();

                function handleSearchInput(query, sourceInput) {
                    // Sync inputs
                    if (sourceInput === searchInput && searchResultsInput) searchResultsInput.value = query;
                    if (sourceInput === searchResultsInput && searchInput) searchInput.value = query;

                    if (/^\d+$/.test(query) || query.length < 2) {
                        if (document.querySelector('.view.active').id === 'search-results-view') {
                             switchView('dashboard-view');
                             // Transfer focus back to the global search input so the user doesn't lose focus
                             setTimeout(() => {
                                 if (searchInput) searchInput.focus();
                             }, 50);
                        }
                        return;
                    }
                    
                    if (document.querySelector('.view.active').id !== 'search-results-view') {
                        switchView('search-results-view');
                    }
                    
                    // Focus the big search bar if it just opened
                    if (sourceInput === searchInput && searchResultsInput && document.activeElement !== searchResultsInput) {
                        setTimeout(() => searchResultsInput.focus(), 50);
                    }
                    
                    renderSearchResults(query);
                }

                searchInput.addEventListener('input', (e) => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(() => {
                        handleSearchInput(e.target.value.trim(), searchInput);
                    }, 300);
                });

                if (searchResultsInput) {
                    searchResultsInput.addEventListener('input', (e) => {
                        clearTimeout(searchTimeout);
                        searchTimeout = setTimeout(() => {
                            handleSearchInput(e.target.value.trim(), searchResultsInput);
                        }, 300);
                    });
                }
            }
        }

        // --- NEW FEATURES INITIALIZATION ---
        
        // 1. Settings
        const settingsModalOverlay = document.getElementById('settings-modal-overlay');
        const openSettingsBtn = document.getElementById('open-settings-btn');
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        const skipTimeInput = document.getElementById('settings-skip-time');
        const playbackSpeedInput = document.getElementById('settings-playback-speed');
        const autoplayPromptInput = document.getElementById('settings-autoplay-prompt');

        function getCustomButtonsData() {
            try {
                const stored = localStorage.getItem('customButtons');
                if (stored) return JSON.parse(stored);
            } catch (e) { console.error('Failed to parse customButtons', e); }
            return [{ name: '', url: '', hidden: false }];
        }

        function updateCustomDashboardBtn() {
            const btn = document.getElementById('custom-dashboard-btn');
            const btnText = document.getElementById('custom-dashboard-btn-text');
            if (!btn || !btnText) return;
            const btnData = getCustomButtonsData()[0] || { name: '', url: '', hidden: false };
            
            if (btnData.hidden || !btnData.name || !btnData.name.trim()) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'inline-flex';
                btnText.textContent = btnData.name;
                btn.title = btnData.name;
                btn.onclick = null;
                
                if (btnData.url) {
                    try {
                        new URL(btnData.url);
                        btn.href = btnData.url;
                    } catch {
                        btn.href = '#';
                        btn.onclick = (e) => e.preventDefault();
                    }
                } else {
                    btn.href = '#';
                    btn.onclick = (e) => e.preventDefault();
                }
            }
        }
        
        updateCustomDashboardBtn();

        if (openSettingsBtn) {
            openSettingsBtn.addEventListener('click', () => {
                skipTimeInput.value = localStorage.getItem('defaultSkipTime') || '5';
                playbackSpeedInput.value = localStorage.getItem('defaultPlaybackSpeed') || '1.75';
                if (autoplayPromptInput) autoplayPromptInput.value = localStorage.getItem('defaultAutoplayPrompt') || '3';
                
                const btnData = getCustomButtonsData()[0] || { name: '', url: '', hidden: false };
                const customBtnNameInput = document.getElementById('settings-custom-btn-name');
                const customBtnUrlInput = document.getElementById('settings-custom-btn-url');
                const customBtnHideInput = document.getElementById('settings-custom-btn-hide');
                if (customBtnNameInput) customBtnNameInput.value = btnData.name;
                if (customBtnUrlInput) customBtnUrlInput.value = btnData.url;
                if (customBtnHideInput) customBtnHideInput.checked = btnData.hidden;
                
                settingsModalOverlay.classList.remove('hidden');
            });
        }
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                localStorage.setItem('defaultSkipTime', skipTimeInput.value);
                const speed = parseFloat(playbackSpeedInput.value) || 1.75;
                localStorage.setItem('defaultPlaybackSpeed', speed);
                if (autoplayPromptInput) localStorage.setItem('defaultAutoplayPrompt', autoplayPromptInput.value);
                window.activePlaybackRate = speed;
                videoPlayer.playbackRate = speed;
                speedBtn.textContent = `${speed}x`;
                
                // Custom Button logic
                const customBtnNameInput = document.getElementById('settings-custom-btn-name');
                const customBtnUrlInput = document.getElementById('settings-custom-btn-url');
                const customBtnHideInput = document.getElementById('settings-custom-btn-hide');
                
                if (customBtnNameInput && customBtnUrlInput && customBtnHideInput) {
                    let name = customBtnNameInput.value.trim();
                    let url = customBtnUrlInput.value.trim();
                    const hidden = customBtnHideInput.checked;
                    
                    if (name) {
                        if (url && !/^https?:\/\//i.test(url) && !url.toLowerCase().startsWith('javascript:') && !url.toLowerCase().startsWith('data:')) {
                            url = 'https://' + url;
                        }
                        if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
                            url = ''; // Prevent unsafe schemes
                        }
                        
                        const newBtnData = [{ name, url, hidden }];
                        localStorage.setItem('customButtons', JSON.stringify(newBtnData));
                        updateCustomDashboardBtn();
                    }
                }
                
                settingsModalOverlay.classList.add('hidden');
                showToast('Settings Saved');
            });
        }

        // 2. Skip Intro
        const skipIntroBtn = document.getElementById('skip-intro-btn');
        if (skipIntroBtn) {
            skipIntroBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const skipTimeStr = localStorage.getItem('defaultSkipTime') || "5";
                const skipTime = parseFloat(skipTimeStr) * 60;
                videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + skipTime);
                videoPlayer.play().catch(e => console.error("Playback failed:", e));
                skipIntroBtn.blur();
                showToast(`Skipped ${skipTimeStr} minutes`);
            });
        }

        // 3. Notes Sidebar
        const playerNotesSidebar = document.getElementById('player-notes-sidebar');
        const closePlayerNotesBtn = document.getElementById('close-player-notes-btn');
        const playerNotesEditor = document.getElementById('player-notes-editor');
        const playerNotesTimestampBtn = document.getElementById('player-notes-add-timestamp-btn');
        const playerNotesResizeHandle = document.getElementById('player-notes-resize-handle');

        let isResizingPlayerNotes = false;
        if (playerNotesResizeHandle) {
            playerNotesResizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isResizingPlayerNotes = true;
                document.body.style.cursor = 'ew-resize';
                document.getElementById('video-wrapper').style.pointerEvents = 'none';
            });
        }

        document.addEventListener('mousemove', (e) => {
            if (!isResizingPlayerNotes) return;
            const newWidth = document.body.clientWidth - e.clientX;
            const minWidth = 200;
            const maxWidth = document.body.clientWidth * 0.8;
            if (newWidth > minWidth && newWidth < maxWidth) {
                playerView.style.setProperty('--notes-width', `${newWidth}px`);
                playerNotesSidebar.style.width = `${newWidth}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizingPlayerNotes) {
                isResizingPlayerNotes = false;
                document.body.style.cursor = 'default';
                document.getElementById('video-wrapper').style.pointerEvents = '';
            }
        });

        if (closePlayerNotesBtn) {
            closePlayerNotesBtn.addEventListener('click', () => {
                playerView.classList.remove('notes-active');
                playerNotesSidebar.classList.add('hidden');
            });
        }

        window.loadPlayerNotes = function() {
            if (!currentCourse || !currentLectureLi) return;
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);
            playerNotesEditor.innerHTML = progress.notes || '';
        };

        window.savePlayerNotes = function() {
            if (!currentCourse || !currentLectureLi) return;
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);
            progress.courseId = currentCourse.id;
            progress.lectureId = lectureId;
            progress.notes = playerNotesEditor.innerHTML;
            saveLectureProgress(progress);
        };

        if (playerNotesEditor) {
            playerNotesEditor.addEventListener('input', () => {
                window.savePlayerNotes();
            });
            playerNotesEditor.addEventListener('paste', (e) => {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (let index in items) {
                    const item = items[index];
                    if (item.kind === 'file' && item.type.startsWith('image/')) {
                        const blob = item.getAsFile();
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const img = document.createElement('img');
                            img.src = event.target.result;
                            img.style.maxWidth = '100%';
                            img.style.borderRadius = '8px';
                            img.style.marginTop = '8px';
                            img.style.border = '1px solid var(--border-secondary)';
                            const selection = window.getSelection();
                            if (!selection.rangeCount) return false;
                            selection.deleteFromDocument();
                            selection.getRangeAt(0).insertNode(img);
                            selection.collapseToEnd();
                            window.savePlayerNotes();
                        };
                        reader.readAsDataURL(blob);
                        e.preventDefault();
                    }
                }
            });
            playerNotesEditor.addEventListener('click', (e) => {
                if (e.target.classList.contains('timestamp-link')) {
                    const time = parseFloat(e.target.dataset.time);
                    if (!isNaN(time)) videoPlayer.currentTime = time;
                }
            });
        }

        if (playerNotesTimestampBtn) {
            playerNotesTimestampBtn.addEventListener('click', () => {
                const time = videoPlayer.currentTime;
                const link = `<span contenteditable="false" class="timestamp-link" data-time="${time}">${formatTime(time)}</span>&nbsp;`;
                const selection = window.getSelection();
                if (selection.rangeCount > 0 && selection.anchorNode && playerNotesEditor.contains(selection.anchorNode)) {
                    const range = selection.getRangeAt(0);
                    const el = document.createElement('div');
                    el.innerHTML = link;
                    const frag = document.createDocumentFragment();
                    let node, lastNode;
                    while ( (node = el.firstChild) ) {
                        lastNode = frag.appendChild(node);
                    }
                    range.insertNode(frag);
                    if (lastNode) {
                        const newRange = range.cloneRange();
                        newRange.setStartAfter(lastNode);
                        newRange.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(newRange);
                    }
                } else {
                    playerNotesEditor.innerHTML += link;
                }
                window.savePlayerNotes();
                playerNotesEditor.focus();
            });
        }
        
        // --- Notes Formatting Active States ---
        const formatBtns = document.querySelectorAll('.notes-format-btn[data-command]');
        function updateToolbarState() {
            if (document.activeElement !== playerNotesEditor) return;
            formatBtns.forEach(btn => {
                const cmd = btn.dataset.command;
                const val = btn.dataset.value;
                if (cmd === 'formatBlock') {
                    const currentBlock = document.queryCommandValue(cmd);
                    if (currentBlock && currentBlock.toLowerCase() === val.toLowerCase()) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                } else {
                    if (document.queryCommandState(cmd)) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });
        }
        document.addEventListener('selectionchange', updateToolbarState);
        if (playerNotesEditor) {
            playerNotesEditor.addEventListener('keyup', updateToolbarState);
            playerNotesEditor.addEventListener('mouseup', updateToolbarState);
        }
        formatBtns.forEach(btn => btn.addEventListener('click', () => setTimeout(updateToolbarState, 50)));

        const intellSearchInput = document.getElementById('intell-search-input');
        if (intellSearchInput) {
            intellSearchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                if (query === '') {
                    renderIntellHome();
                } else {
                    renderIntellSearchResults(query);
                }
            });
        }

        main().catch(err => {
            console.error('CourseFlix init error:', err);
            // Safety net: if main() fails, ensure nav is visible and dashboard is shown
            const navEl = document.querySelector('nav');
            if (navEl) navEl.classList.remove('hidden');
            const dashView = document.getElementById('dashboard-view-el');
            if (dashView) dashView.classList.add('active');
        }).finally(() => {
            // Always ensure nav is visible for non-player views after init
            const navEl = document.querySelector('nav');
            const activeView = document.querySelector('.view.active');
            const hideNavViews = ['player-view', 'dpp-upload-view', 'filter-results-view', 'notes-detail-view', 'dpp-detail-view'];
            if (navEl && activeView && !hideNavViews.includes(activeView.id)) {
                navEl.classList.remove('hidden');
            }
        });
    
    
};