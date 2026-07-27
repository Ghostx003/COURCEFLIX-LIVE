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
        const DB_VERSION = 13; // Incremented version for calendar store
        const STORE_NAME = 'courses';
        const PROGRESS_STORE = 'progress';
        const DPP_STORE = 'dpps'; // New store for DPPs
        const DOUBTS_STORE = 'doubts';
        const HISTORY_STORE = 'history';
        const CALENDAR_STORE = 'calendarEvents';
        let db = null;
        let dbPromise = null;

        // --- Database Helper ---
        function openDB() {
            if (dbPromise) return dbPromise;
            dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = () => { dbPromise = null; reject("Error opening IndexedDB"); };
                request.onsuccess = () => { 
                    db = request.result; 
                    window.appDbInitialized = true; 
                    
                    // Close connection if another tab requests an upgrade
                    db.onversionchange = () => {
                        db.close();
                        console.warn("Database upgrade requested by another tab. Closing connection to avoid blocking.");
                    };
                    
                    resolve(db); 
                };
                request.onupgradeneeded = (event) => { 
                    const upgradeDb = event.target.result;
                    if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) upgradeDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    if (!upgradeDb.objectStoreNames.contains(PROGRESS_STORE)) upgradeDb.createObjectStore(PROGRESS_STORE, { keyPath: 'id' });
                    if (!upgradeDb.objectStoreNames.contains(DPP_STORE)) upgradeDb.createObjectStore(DPP_STORE, { keyPath: 'id', autoIncrement: true });
                    if (!upgradeDb.objectStoreNames.contains(DOUBTS_STORE)) upgradeDb.createObjectStore(DOUBTS_STORE, { keyPath: 'id', autoIncrement: true });
                    if (!upgradeDb.objectStoreNames.contains(HISTORY_STORE)) upgradeDb.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
                    if (!upgradeDb.objectStoreNames.contains(CALENDAR_STORE)) {
                        const calStore = upgradeDb.createObjectStore(CALENDAR_STORE, { keyPath: 'id', autoIncrement: true });
                        calStore.createIndex('date', 'date', { unique: false });
                    }
                };
                request.onblocked = () => {
                    alert("Database update blocked! Please close other tabs of CourseFlix and refresh the page.");
                    reject("Blocked");
                };
            });
            return dbPromise;
        }

        async function ensureDB() {
            if (db) return db;
            if (window.db) { db = window.db; return db; }
            db = await openDB();
            return db;
        }

        function getStore(storeName, mode) {
            if (!db && window.db) db = window.db;
            if (!db) throw new Error("Database not initialized yet.");
            return db.transaction(storeName, mode).objectStore(storeName);
        }

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
        let isCalendarMode = false;
        let currentCalendarLectures = [];
        let isStudyTogetherMode = false;
        let currentStudyTogetherStatus = null;
        let currentCalendarDate = null; // YYYY-MM-DD of the calendar view
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
            if (isNaN(seconds) || seconds <= 0) return '0h';
            const totalMinutes = Math.floor(seconds / 60);
            let hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            if (minutes >= 40) {
                hours += 1;
            }
            return `${hours}h`;
        }
        function formatExactTime(seconds) {
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
            
            const allDpps = await new Promise(resolve => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => resolve(e.target.result || []));
            const courseIdStrs = allCourses.map(c => String(c.id));
            let cfDpps = (allDpps || [])
                .filter(d => !d.courseId || courseIdStrs.includes(String(d.courseId)))
                .map(d => ({
                    id: d.id,
                    name: d.fileName || d.title || `DPP ${d.id}`,
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
            await ensureDB();
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

        function isSubfolderPathIgnoredOrHidden(course, subfolderPath) {
            if (!course) return false;
            if (course.isIgnored) return true;
            if (!course.subCourseData || !subfolderPath) return false;

            const normSub = String(subfolderPath).toLowerCase().trim();
            for (const key of Object.keys(course.subCourseData)) {
                const item = course.subCourseData[key];
                if (item && (item.hidden || item.isIgnored)) {
                    const normKey = String(key).toLowerCase().trim();
                    if (normSub === normKey || normSub.startsWith(normKey + '/') || normKey.startsWith(normSub + '/') || normSub.endsWith('/' + normKey) || normSub.includes('/' + normKey + '/')) {
                        return true;
                    }
                }
            }
            return false;
        }
        window.isSubfolderPathIgnoredOrHidden = isSubfolderPathIgnoredOrHidden;

        function isSubfolderPathHidden(course, subfolderPath) {
            if (!course) return false;
            if (!course.subCourseData || !subfolderPath) return false;

            const normSub = String(subfolderPath).toLowerCase().trim();
            for (const key of Object.keys(course.subCourseData)) {
                const item = course.subCourseData[key];
                if (item && item.hidden) {
                    const normKey = String(key).toLowerCase().trim();
                    if (normSub === normKey || normSub.startsWith(normKey + '/') || normKey.startsWith(normSub + '/') || normSub.endsWith('/' + normKey) || normSub.includes('/' + normKey + '/')) {
                        return true;
                    }
                }
            }
            return false;
        }
        window.isSubfolderPathHidden = isSubfolderPathHidden;

        async function hardDeleteHistoryForSubfolder(courseId, targetSubfolder) {
            try {
                await ensureDB();
                const history = await new Promise((resolve) => {
                    const req = getStore(HISTORY_STORE, 'readonly').getAll();
                    req.onsuccess = e => resolve(e.target.result || []);
                    req.onerror = () => resolve([]);
                });

                if (!history || history.length === 0) return;

                const toDeleteIds = [];
                const normTarget = String(targetSubfolder || '').toLowerCase().trim();

                for (const h of history) {
                    if (parseInt(h.courseId) === parseInt(courseId)) {
                        const normSub = String(h.subfolder || '').toLowerCase().trim();
                        if (!normTarget || normSub === normTarget || normSub.startsWith(normTarget + '/') || normSub.endsWith('/' + normTarget) || normSub.includes('/' + normTarget + '/')) {
                            toDeleteIds.push(h.id);
                        }
                    }
                }

                if (toDeleteIds.length > 0) {
                    cachedHistory = null;
                    const store = getStore(HISTORY_STORE, 'readwrite');
                    await Promise.all(toDeleteIds.map(id => new Promise(r => store.delete(id).onsuccess = r)));
                }
            } catch (err) {
                console.warn('Error in hardDeleteHistoryForSubfolder:', err);
            }
        }
        window.hardDeleteHistoryForSubfolder = hardDeleteHistoryForSubfolder;

        async function cleanupOrphanedHistoryEntries() {
            try {
                await ensureDB();
                const history = await new Promise((resolve) => {
                    const req = getStore(HISTORY_STORE, 'readonly').getAll();
                    req.onsuccess = e => resolve(e.target.result || []);
                    req.onerror = () => resolve([]);
                });

                if (!history || history.length === 0) return;

                const toDeleteIds = [];
                for (const h of history) {
                    if (!h.courseId) {
                        toDeleteIds.push(h.id);
                        continue;
                    }
                    const course = (courses || []).find(c => parseInt(c.id) === parseInt(h.courseId));
                    if (!course) {
                        toDeleteIds.push(h.id);
                        continue;
                    }
                    if (h.subfolder && isSubfolderPathHidden(course, h.subfolder)) {
                        toDeleteIds.push(h.id);
                        continue;
                    }
                }

                if (toDeleteIds.length > 0) {
                    cachedHistory = null;
                    const store = getStore(HISTORY_STORE, 'readwrite');
                    await Promise.all(toDeleteIds.map(id => new Promise(r => store.delete(id).onsuccess = r)));
                }
            } catch (err) {
                console.warn('Error during history cleanup:', err);
            }
        }
        window.cleanupOrphanedHistoryEntries = cleanupOrphanedHistoryEntries;

        async function purgeAllDataForDeletedCoursesAndSubfolders(options = {}) {
            let totalPurgedCount = 0;
            try {
                await ensureDB();
                const activeCourses = await new Promise((resolve) => {
                    const req = getStore(STORE_NAME, 'readonly').getAll();
                    req.onsuccess = e => resolve(e.target.result || []);
                    req.onerror = () => resolve([]);
                });

                // Build a map of active lecture IDs per course
                const activeLectureMap = {};
                activeCourses.forEach(c => {
                    if (c && Array.isArray(c.lectures)) {
                        activeLectureMap[c.id] = new Set(c.lectures.map(l => String(l.id)));
                    }
                });

                const isRecordValid = (courseId, subfolderPath, lectureId, itemId) => {
                    if (!courseId) return false;
                    const cId = parseInt(courseId);
                    const course = activeCourses.find(c => parseInt(c.id) === cId);
                    if (!course) return false;
                    if (subfolderPath && isSubfolderPathHidden(course, subfolderPath)) return false;
                    
                    // Check missing/deleted lecture if lecture information is available
                    let lecId = lectureId ? String(lectureId) : null;
                    if (!lecId && itemId && typeof itemId === 'string' && itemId.startsWith(cId + '_')) {
                        lecId = itemId.replace(cId + '_', '');
                    }
                    if (lecId && activeLectureMap[cId] && activeLectureMap[cId].size > 0) {
                        if (!activeLectureMap[cId].has(lecId)) {
                            return false;
                        }
                    }
                    return true;
                };

                // 1. Purge PROGRESS_STORE & courseProgress in memory (attached PDFs, notes, status, progress, intell)
                const allProgress = await new Promise((resolve) => {
                    const req = getStore(PROGRESS_STORE, 'readonly').getAll();
                    req.onsuccess = e => resolve(e.target.result || []);
                    req.onerror = () => resolve([]);
                });

                if (allProgress && allProgress.length > 0) {
                    const progressStore = getStore(PROGRESS_STORE, 'readwrite');
                    for (const prog of allProgress) {
                        const sub = prog.subfolder || prog.chapter || '';
                        if (!isRecordValid(prog.courseId, sub, prog.lectureId, prog.id)) {
                            progressStore.delete(prog.id);
                            totalPurgedCount++;
                            if (typeof courseProgress !== 'undefined' && courseProgress) {
                                delete courseProgress[prog.id];
                            }
                        }
                    }
                }

                // 2. Purge HISTORY_STORE
                await cleanupOrphanedHistoryEntries();

                // 3. Purge DOUBTS_STORE
                const allDoubts = await new Promise((resolve) => {
                    const req = getStore(DOUBTS_STORE, 'readonly').getAll();
                    req.onsuccess = e => resolve(e.target.result || []);
                    req.onerror = () => resolve([]);
                });

                if (allDoubts && allDoubts.length > 0) {
                    const doubtsStore = getStore(DOUBTS_STORE, 'readwrite');
                    for (const d of allDoubts) {
                        const sub = d.subfolder || d.chapter || '';
                        if (!isRecordValid(d.courseId, sub, d.lectureId, d.id)) {
                            doubtsStore.delete(d.id);
                            totalPurgedCount++;
                        }
                    }
                }

                // 4. Purge DPP_STORE
                const allDpp = await new Promise((resolve) => {
                    const req = getStore(DPP_STORE, 'readonly').getAll();
                    req.onsuccess = e => resolve(e.target.result || []);
                    req.onerror = () => resolve([]);
                });

                if (allDpp && allDpp.length > 0) {
                    const dppStore = getStore(DPP_STORE, 'readwrite');
                    for (const dpp of allDpp) {
                        const sub = dpp.subfolder || dpp.chapter || '';
                        if (!isRecordValid(dpp.courseId, sub, dpp.lectureId, dpp.id)) {
                            dppStore.delete(dpp.id);
                            totalPurgedCount++;
                        }
                    }
                }

                // 5. Purge CALENDAR_STORE
                const allCal = await new Promise((resolve) => {
                    const req = getStore(CALENDAR_STORE, 'readonly').getAll();
                    req.onsuccess = e => resolve(e.target.result || []);
                    req.onerror = () => resolve([]);
                });

                if (allCal && allCal.length > 0) {
                    const calStore = getStore(CALENDAR_STORE, 'readwrite');
                    for (const cal of allCal) {
                        const sub = cal.subfolder || cal.chapter || '';
                        if (cal.courseId && !isRecordValid(cal.courseId, sub, cal.lectureId, cal.id)) {
                            calStore.delete(cal.id);
                            totalPurgedCount++;
                        }
                    }
                }

                // 6. Purge courseflix_logs from localStorage
                try {
                    let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
                    if (cfLogs && cfLogs.length > 0) {
                        const initialLen = cfLogs.length;
                        const filteredLogs = cfLogs.filter(log => isRecordValid(log.courseId, log.subfolder || log.chapter, log.lectureId, log.id));
                        totalPurgedCount += (initialLen - filteredLogs.length);
                        localStorage.setItem('courseflix_logs', JSON.stringify(filteredLogs));
                    }
                } catch (e) {}

                // 7. Purge assignmentFiles from ProgressAppDB
                try {
                    const progRequest = indexedDB.open('ProgressAppDB', 1);
                    await new Promise((resolve) => {
                        progRequest.onsuccess = (e) => {
                            const db = e.target.result;
                            if (db.objectStoreNames.contains('assignmentFiles')) {
                                const tx = db.transaction('assignmentFiles', 'readwrite');
                                const store = tx.objectStore('assignmentFiles');
                                const keysReq = store.getAllKeys();
                                keysReq.onsuccess = () => {
                                    const keys = keysReq.result || [];
                                    for (const key of keys) {
                                        const keyStr = String(key);
                                        const parts = keyStr.split('_');
                                        const courseId = parts[0];
                                        const lectureId = parts.slice(1).join('_');
                                        if (!isRecordValid(courseId, null, lectureId, keyStr)) {
                                            store.delete(key);
                                            totalPurgedCount++;
                                        }
                                    }
                                    resolve();
                                };
                                keysReq.onerror = () => resolve();
                            } else {
                                resolve();
                            }
                        };
                        progRequest.onerror = () => resolve();
                    });
                } catch (e) {}

            } catch (err) {
                console.warn('Error in purgeAllDataForDeletedCoursesAndSubfolders:', err);
            }
            return totalPurgedCount;
        }
        window.purgeAllDataForDeletedCoursesAndSubfolders = purgeAllDataForDeletedCoursesAndSubfolders;

        // --- Calendar Event CRUD ---
        async function addCalendarEvent(eventData) {
            await ensureDB();
            return new Promise((resolve, reject) => {
                const request = getStore(CALENDAR_STORE, 'readwrite').add(eventData);
                request.onsuccess = e => {
                    eventData.id = e.target.result;
                    if (!window.isUndoingCalendar) {
                        window.calendarUndoStack = window.calendarUndoStack || [];
                        window.calendarUndoStack.push({ action: 'add', event: { ...eventData } });
                    }
                    resolve(eventData);
                };
                request.onerror = reject;
            });
        }

        async function getCalendarEventsForDate(dateStr) {
            await ensureDB();
            return new Promise((resolve, reject) => {
                const store = getStore(CALENDAR_STORE, 'readonly');
                const idx = store.index('date');
                const request = idx.getAll(IDBKeyRange.only(dateStr));
                request.onsuccess = e => resolve(e.target.result || []);
                request.onerror = reject;
            });
        }

        async function deleteCalendarEvent(id) {
            await ensureDB();
            const numericId = Number(id);
            const ev = await new Promise((resolve) => {
                try {
                    const req = getStore(CALENDAR_STORE, 'readonly').get(numericId);
                    req.onsuccess = e => resolve(e.target.result);
                    req.onerror = () => resolve(null);
                } catch(e) { resolve(null); }
            });
            if (ev && !window.isUndoingCalendar) {
                window.calendarUndoStack = window.calendarUndoStack || [];
                window.calendarUndoStack.push({ action: 'delete', event: ev });
            }
            return new Promise((resolve, reject) => {
                const request = getStore(CALENDAR_STORE, 'readwrite').delete(numericId);
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        }

        async function getAllCalendarEvents() {
            await ensureDB();
            return new Promise((resolve, reject) => {
                const request = getStore(CALENDAR_STORE, 'readonly').getAll();
                request.onsuccess = e => resolve(e.target.result || []);
                request.onerror = reject;
            });
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
            if (!course || !course.lectures || course.lectures.length === 0) {
                const totalDur = course ? (course.totalDuration || 0) : 0;
                return { completed: 0, total: course ? (course.videoCount || 0) : 0, percentage: 0, remainingDuration: totalDur, totalDuration: totalDur };
            }
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

            const effectiveTotalDuration = activeTotalDuration > 0 ? activeTotalDuration : (course.totalDuration || 0);
            const percentage = activeTotalLectures > 0 ? (completed / activeTotalLectures) * 100 : 0;
            
            if (activeTotalDuration === 0 && effectiveTotalDuration > 0 && activeTotalLectures > 0) {
                timeCompleted = (completed / activeTotalLectures) * effectiveTotalDuration;
            }
            
            const remainingDuration = effectiveTotalDuration - timeCompleted;

            return { 
                completed, 
                total: activeTotalLectures, 
                percentage, 
                remainingDuration: Math.max(0, remainingDuration), 
                totalDuration: effectiveTotalDuration 
            };
        }
        
        function renderTimePillContent(totalSecondsLeft, pct) {
            if (!totalTimeDisplay) return;
            totalTimeDisplay.innerHTML = `<i class="fas fa-clock" style="font-size:0.9rem; margin-right:8px;"></i><span style="font-weight: 800; font-size: 0.95rem;">${formatTotalDuration(totalSecondsLeft)} Left</span>`;
        }

        if (window.timePillRotationTimer) {
            clearInterval(window.timePillRotationTimer);
            window.timePillRotationTimer = null;
        }

        function updateTotalTimeLeftDisplay() {
            let totalSecondsLeft = 0;
            let totalCompletedSeconds = 0;
            let totalSecondsCount = 0;
            let pendingLectures = 0;
            let totalLecturesCount = 0;
            let totalCompletedLectures = 0;
            const courseBreakdown = [];

            courses.forEach(course => {
                if (course.isIgnored) return;
                
                let cSecondsLeft = 0;
                let cCompletedSec = 0;
                let cTotalSec = 0;
                let cPendingLec = 0;
                let cCompletedLec = 0;
                let cTotalLec = 0;

                if (!course.lectures) {
                    totalSecondsLeft += (course.totalDuration || 0);
                    totalSecondsCount += (course.totalDuration || 0);
                    pendingLectures += (course.videoCount || 0);
                    totalLecturesCount += (course.videoCount || 0);
                    courseBreakdown.push({
                        id: course.id,
                        title: course.title,
                        secondsLeft: course.totalDuration || 0,
                        completedSeconds: 0,
                        totalSeconds: course.totalDuration || 0,
                        pendingLectures: course.videoCount || 0,
                        completedLectures: 0,
                        totalLectures: course.videoCount || 0,
                        percentage: 0
                    });
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
                    cTotalLec++;
                    const dur = lecture.duration || 0;
                    totalSecondsCount += dur;
                    cTotalSec += dur;

                    const progress = getLectureProgress(course.id, lecture.id);
                    if (!progress.completed) {
                        totalSecondsLeft += dur;
                        cSecondsLeft += dur;
                        pendingLectures++;
                        cPendingLec++;
                    } else {
                        totalCompletedLectures++;
                        cCompletedLec++;
                        totalCompletedSeconds += dur;
                        cCompletedSec += dur;
                    }
                });

                const cPct = cTotalLec > 0 ? Math.round((cCompletedLec / cTotalLec) * 100) : 0;
                courseBreakdown.push({
                    id: course.id,
                    title: course.title,
                    secondsLeft: cSecondsLeft,
                    completedSeconds: cCompletedSec,
                    totalSeconds: cTotalSec,
                    pendingLectures: cPendingLec,
                    completedLectures: cCompletedLec,
                    totalLectures: cTotalLec,
                    percentage: cPct
                });
            });
            
            const pct = totalLecturesCount > 0 ? Math.round((totalCompletedLectures / totalLecturesCount) * 100) : 0;

            totalTimeDisplay.dataset.seconds = totalSecondsLeft;
            totalTimeDisplay.dataset.completedSeconds = totalCompletedSeconds;
            totalTimeDisplay.dataset.totalSeconds = totalSecondsCount;
            totalTimeDisplay.dataset.lectures = pendingLectures;
            totalTimeDisplay.dataset.completedLectures = totalCompletedLectures;
            totalTimeDisplay.dataset.totalLectures = totalLecturesCount;
            totalTimeDisplay.dataset.percentage = pct;
            totalTimeDisplay.dataset.breakdown = JSON.stringify(courseBreakdown);

            totalTimeDisplay.classList.remove('progress-red', 'progress-violet', 'progress-yellow', 'progress-cyan', 'progress-green');
            if (pct < 30) {
                totalTimeDisplay.classList.add('progress-violet');
            } else if (pct < 60) {
                totalTimeDisplay.classList.add('progress-yellow');
            } else if (pct < 80) {
                totalTimeDisplay.classList.add('progress-cyan');
            } else {
                totalTimeDisplay.classList.add('progress-green');
            }

            if (totalLecturesCount > 0 || totalSecondsLeft > 0) {
                totalTimeDisplay.style.display = 'inline-flex';
                renderTimePillContent(totalSecondsLeft, pct);
            } else {
                totalTimeDisplay.style.display = 'none';
            }

            const hoursStudiedDisplay = document.getElementById('hours-studied-display');
            if (hoursStudiedDisplay) {
                const hoursStudied = Math.round((totalCompletedSeconds / 3600) * 10) / 10;
                hoursStudiedDisplay.innerHTML = `<i class="fas fa-history" style="color: #34d399; margin-right: 6px;"></i><span>${hoursStudied}h Studied</span>`;
                hoursStudiedDisplay.style.display = 'inline-flex';
            }
            
            const dh = parseFloat(localStorage.getItem('calcDailyHours')) || 7;
            const sp = parseFloat(localStorage.getItem('calcPlaybackSpeed')) || 1.5;
            updateDailyGoalDisplay(dh, sp);

            return {
                totalSecondsLeft,
                totalCompletedSeconds,
                totalSecondsCount,
                pendingLectures,
                totalLecturesCount,
                totalCompletedLectures,
                pct,
                courseBreakdown
            };
        }
        
        function updateDailyGoalDisplay(dailyHours, speed, overrideTargetLectures = null) {
            const targetLectures = (overrideTargetLectures !== null && overrideTargetLectures !== undefined)
                ? Math.ceil(overrideTargetLectures)
                : Math.ceil(dailyHours / (2 / speed));
            
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
            const navEl = document.querySelector('nav') || nav;
            if (navEl) {
                if (viewId === 'player-view') {
                    navEl.classList.add('hidden');
                } else {
                    navEl.classList.remove('hidden');
                }
            }
            window.switchView = switchView;
            
            if (pushState && viewId !== 'subcourse-view' && viewId !== 'player-view') {
                const newHash = '#' + viewId;
                if (window.location.hash !== newHash) {
                    window.history.pushState(null, '', newHash);
                }
            }

            const targetId = viewId === 'dashboard-view' ? 'dashboard-view-el' : viewId;
            document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === targetId));
            document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === viewId));
            
            setTimeout(async () => {
                await ensureDB();
                if (viewId === 'review-view' || viewId === 'practice-view') {
                    showFilteredCoursesView(viewId.split('-')[0]);
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
                if (pushState) {
                    sessionStorage.removeItem('courseflixState');
                }
                if (typeof videoPlayer !== 'undefined' && videoPlayer) {
                    videoPlayer.pause();
                }
                if (typeof brownNoiseAudio !== 'undefined' && brownNoiseAudio) {
                    brownNoiseAudio.pause();
                }
            }
        }
        
        async function loadCoursesFromDB() {
            const storedCourses = await new Promise(resolve => getStore(STORE_NAME, 'readonly').getAll().onsuccess = e => resolve(e.target.result));
            if (storedCourses && storedCourses.length > 0) {
                await Promise.all(storedCourses.map(async (course) => {
                    const handle = course.handle;
                    if (handle && typeof handle.queryPermission === 'function') {
                        try {
                            course.isLinked = await handle.queryPermission({ mode: 'read' }) === 'granted';
                        } catch (e) {
                            course.isLinked = false;
                        }
                    } else {
                        course.isLinked = false;
                    }
                }));
            }
            courses = storedCourses || [];
            window.courses = courses;
            window.dispatchEvent(new CustomEvent('courseflix:courses-loaded', { detail: courses }));
            const activeView = document.querySelector('.view.active');
            if (!activeView || activeView.id === 'dashboard-view-el') {
                renderCourseGrid();
            } else {
                setTimeout(() => renderCourseGrid(), 10);
            }
            if (typeof syncCourseflixSubjects === 'function') {
                syncCourseflixSubjects();
            }
            setTimeout(() => {
                purgeAllDataForDeletedCoursesAndSubfolders().catch(err => console.warn('Background purge error:', err));
            }, 150);
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
                    if (progress && progress.notes) {
                        const rawText = progress.notes.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                        if (rawText.length > 0) {
                            notes.push({ lecture, progress });
                        }
                    }
                });
                if (notes.length > 0) result.push({ course, notes });
            });
            return result;
        }

        window.renderIntellView = function() {
            const backBtn = document.getElementById('back-to-notes-from-intell');
            if (backBtn && !backBtn.dataset.listenerAttached) {
                backBtn.dataset.listenerAttached = 'true';
                backBtn.addEventListener('click', () => switchView('notes-view'));
            }
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

        function showDeleteConfirmModal({ title = 'Delete Subfolder', message = 'Do you really want to delete it?', onConfirm }) {
            let modal = document.getElementById('global-delete-confirm-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'global-delete-confirm-modal';
                modal.className = 'modal-overlay hidden';
                modal.style.cssText = 'z-index: 1000000; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center;';
                modal.innerHTML = `
                    <div class="modal-content glass-modal" style="max-width: 400px; width: 90%; padding: 1.75rem; text-align: center; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); box-shadow: 0 20px 50px rgba(0,0,0,0.6);">
                        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.5rem;">
                            <i class="fas fa-trash-alt"></i>
                        </div>
                        <h3 id="delete-modal-title" style="margin: 0 0 0.5rem 0; font-size: 1.25rem; font-weight: 700; color: #ffffff;">Delete Subfolder</h3>
                        <p id="delete-modal-message" style="margin: 0 0 1.5rem 0; font-size: 0.92rem; color: var(--text-secondary); line-height: 1.4;">Do you really want to delete it?</p>
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button id="delete-modal-cancel-btn" class="secondary-btn" style="padding: 9px 18px; border-radius: 10px; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button id="delete-modal-yes-btn" class="danger-btn" style="background: #ef4444; color: #ffffff; padding: 9px 18px; border-radius: 10px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">YES DELETE</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const titleEl = modal.querySelector('#delete-modal-title');
            const msgEl = modal.querySelector('#delete-modal-message');
            const yesBtn = modal.querySelector('#delete-modal-yes-btn');
            const cancelBtn = modal.querySelector('#delete-modal-cancel-btn');

            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;

            modal.classList.remove('hidden');

            const closeModal = () => {
                modal.classList.add('hidden');
            };

            cancelBtn.onclick = closeModal;
            modal.onclick = (e) => {
                if (e.target === modal) closeModal();
            };

            yesBtn.onclick = async () => {
                closeModal();
                if (onConfirm) await onConfirm();
            };
        }

        function populateSortGroupOptions() {
            const sortSelect = document.getElementById('course-sort-select');
            const menu = document.getElementById('glass-sort-dropdown-menu');
            const triggerLabel = document.querySelector('#glass-sort-trigger .glass-sort-label');
            
            let groups = [];
            try {
                const raw = localStorage.getItem('courseflix_completion_groups');
                if (raw) groups = JSON.parse(raw);
            } catch(e) {}

            if (sortSelect) {
                let optgroup = sortSelect.querySelector('optgroup#course-sort-groups-optgroup');
                if (optgroup) {
                    optgroup.innerHTML = '';
                } else {
                    optgroup = document.createElement('optgroup');
                    optgroup.id = 'course-sort-groups-optgroup';
                    optgroup.label = 'Groups';
                    sortSelect.appendChild(optgroup);
                }

                if (groups && groups.length > 0) {
                    groups.forEach((g, idx) => {
                        const option = document.createElement('option');
                        option.value = `group_${g.id}`;
                        option.textContent = `Group: ${g.name || `Group ${idx + 1}`}`;
                        optgroup.appendChild(option);
                    });
                }

                const sortVal = localStorage.getItem('courseSortPref') || 'custom';
                if (sortSelect.querySelector(`option[value="${sortVal}"]`)) {
                    sortSelect.value = sortVal;
                }
            }

            if (!menu) return;

            const currentSortVal = localStorage.getItem('courseSortPref') || 'custom';

            const baseOptions = [
                { value: 'custom', label: 'Custom (Drag & Drop)' },
                { value: 'completion_asc', label: 'Completion (Low to High)' },
                { value: 'completion_desc', label: 'Completion (High to Low)' },
                { value: 'duration_desc', label: 'Duration (High to Low)' },
                { value: 'duration_asc', label: 'Duration (Low to High)' },
                { value: 'duration_left_desc', label: 'Duration Left (High to Low)' },
                { value: 'duration_left_asc', label: 'Duration Left (Low to High)' },
            ];

            let selectedLabelText = 'Custom (Drag & Drop)';

            let menuHTML = '';
            baseOptions.forEach(opt => {
                const isSelected = opt.value === currentSortVal;
                if (isSelected) selectedLabelText = opt.label;
                menuHTML += `
                    <div class="glass-sort-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}">
                        <span>${opt.label}</span>
                        ${isSelected ? '<i class="fas fa-check option-check-icon"></i>' : ''}
                    </div>
                `;
            });

            if (groups && groups.length > 0) {
                menuHTML += `
                    <div class="glass-sort-option-header">
                        <i class="fas fa-layer-group"></i> Groups
                    </div>
                `;

                groups.forEach((g, idx) => {
                    const val = `group_${g.id}`;
                    const label = `Group: ${g.name || `Group ${idx + 1}`}`;
                    const isSelected = val === currentSortVal;
                    if (isSelected) selectedLabelText = label;
                    menuHTML += `
                        <div class="glass-sort-option ${isSelected ? 'selected' : ''}" data-value="${val}">
                            <span>${label}</span>
                            ${isSelected ? '<i class="fas fa-check option-check-icon"></i>' : ''}
                        </div>
                    `;
                });
            }

            menu.innerHTML = menuHTML;

            if (triggerLabel) {
                triggerLabel.innerHTML = `Sort by: <strong>${selectedLabelText}</strong>`;
            }

            menu.querySelectorAll('.glass-sort-option').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = item.dataset.value;
                    localStorage.setItem('courseSortPref', val);
                    if (sortSelect) sortSelect.value = val;
                    menu.classList.add('hidden');
                    const trigger = document.getElementById('glass-sort-trigger');
                    if (trigger) trigger.classList.remove('active');
                    populateSortGroupOptions();
                    renderCourseGrid();
                });
            });
        }

        async function renderCourseGrid() {
            courseGrid.innerHTML = '';
            if (courses.length === 0) { 
                courseGrid.innerHTML = `<p id="no-content-message">No courses added. Click 'Add Course' to begin.</p>`;
                totalTimeDisplay.style.display = 'none';
                return;
            }

            // Pre-scan any linked courses that need handle scanning so duration stats are populated BEFORE sorting
            for (const course of courses) {
                const needsHandleScan = course.lectures && course.lectures.length > 0 && !course.lectures[0].handle;
                if (course.isLinked && course.handle && (!course.lectures || needsHandleScan)) {
                    try {
                        const courseData = await scanDirectoryHandle(course.handle, '', course.lectures || []);
                        course.lectures = courseData.lectures;
                        course.totalDuration = courseData.totalDuration;
                        course.chapters = courseData.chapters;
                        await new Promise(r => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = r);
                    } catch (e) {
                        console.error(`Failed to scan course "${course.title}"`, e);
                    }
                }
            }

            populateSortGroupOptions();

            updateTotalTimeLeftDisplay();
            
            const sortSelect = document.getElementById('course-sort-select');
            const sortVal = localStorage.getItem('courseSortPref') || 'custom';
            if (sortSelect && sortSelect.value !== sortVal) sortSelect.value = sortVal;
            
            let sortedCourses = [...courses];

            if (sortVal.startsWith('group_')) {
                const targetGroupId = sortVal.replace('group_', '');
                let groups = [];
                try {
                    const raw = localStorage.getItem('courseflix_completion_groups');
                    if (raw) groups = JSON.parse(raw);
                } catch(e) {}
                const targetGroup = groups.find(g => String(g.id) === String(targetGroupId));
                if (targetGroup && Array.isArray(targetGroup.selectedCourseIds)) {
                    sortedCourses = sortedCourses.filter(c => targetGroup.selectedCourseIds.includes(c.id));
                }
            } else if (sortVal !== 'custom') {
                sortedCourses.sort((a, b) => {
                    const progA = calculateCourseProgress(a);
                    const progB = calculateCourseProgress(b);
                    if (sortVal === 'completion_asc') return progA.percentage - progB.percentage;
                    if (sortVal === 'completion_desc') return progB.percentage - progA.percentage;
                    if (sortVal === 'duration_desc') return progB.totalDuration - progA.totalDuration;
                    if (sortVal === 'duration_asc') return progA.totalDuration - progB.totalDuration;
                    if (sortVal === 'duration_left_desc') return progB.remainingDuration - progA.remainingDuration;
                    if (sortVal === 'duration_left_asc') return progA.remainingDuration - progB.remainingDuration;
                    return 0;
                });
            } else {
                sortedCourses.sort((a, b) => (a.order || 0) - (b.order || 0));
            }

            for (const course of sortedCourses) {
                // --- HIDE IGNORED FEATURE ---
                if (localStorage.getItem('courseflix_hide_ignored') === 'true' && course.isIgnored) continue;

                const card = document.createElement('div');
                card.className = 'course-card';
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
            if (viewEl.dataset.origin === 'home-view' && basePath === '') {
                backLink.innerHTML = '&larr; Back to Landing Page';
            } else if (viewEl.dataset.origin === 'faculty-view' && basePath === (resumePath || '')) {
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
                // --- HIDE IGNORED FEATURE ---
                if (localStorage.getItem('courseflix_hide_ignored') === 'true' && subData.isIgnored) return;

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
                        <button class="remove-course-btn" data-id="${course.id}" data-subfolder="${fullPath}" title="Delete Subfolder"><i class="fas fa-trash-alt"></i></button>
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

        window.showFilteredCoursesView = function(status) {
            const filterResultsView = document.getElementById('filter-results-view');
            const allItems = Object.values(courseProgress).filter(p => p.status === status);
            const courseIdsWithStatus = [...new Set(allItems.map(item => item.courseId))];
            const coursesToShow = courses.filter(c => courseIdsWithStatus.includes(c.id));
            
            const studyTogetherBtn = coursesToShow.length > 1 ? `<button class="primary-btn study-together-btn" data-status="${status}" style="background-color: #8b5cf6; margin-left: auto;"><i class="fas fa-layer-group"></i> Study Together</button>` : '';

            let header = `
                <div class="view-header" style="display: flex; gap: 10px; justify-content: flex-end;">
                    ${studyTogetherBtn}
                </div>
                <main id="filter-results-grid" class="grid-container"></main>
            `;
            filterResultsView.innerHTML = header;

            const grid = filterResultsView.querySelector('#filter-results-grid');
            if (coursesToShow.length === 0) {
                grid.innerHTML = `<p id="no-content-message">No courses have lectures marked for ${status}.</p>`;
            } else {
                coursesToShow.forEach(course => {
                    const statusItems = allItems.filter(p => p.courseId === course.id);
                    let totalStatusLectures = statusItems.length;
                    let completedStatusLectures = 0;
                    let remainingDurationSec = 0;
                    let totalDurationSec = 0;

                    statusItems.forEach(item => {
                        const lecture = (course.lectures || []).find(l => l.id === item.lectureId);
                        const dur = (lecture && lecture.duration) ? lecture.duration : 0;
                        totalDurationSec += dur;

                        if (item.completed) {
                            completedStatusLectures++;
                        } else {
                            remainingDurationSec += dur;
                        }
                    });

                    const percentage = totalStatusLectures > 0 ? (completedStatusLectures / totalStatusLectures) * 100 : 0;
                    const hoursLeftText = formatDuration(remainingDurationSec);
                    const hoursTotalText = formatDuration(totalDurationSec);

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
                                 <div class="course-duration-text" style="color: #10b981; font-weight: 500; font-size: 0.85rem; margin-bottom: 4px;">${hoursTotalText} total • ${hoursLeftText} left</div>
                                 <div class="course-progress-text" style="margin-bottom: 8px; font-weight: 500;">${completedStatusLectures} / ${totalStatusLectures} lectures completed</div>
                                 <div class="course-progress-bar"><div class="course-progress-fill" style="width: ${percentage}%"></div></div>
                             </div>
                             <button class="watch-lecture-btn" data-id="${course.id}" style="margin-top: 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; width: 100%; border: none; padding: 10px; border-radius: 8px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">Watch Lecture</button>
                         </div>`;
                    grid.appendChild(card);
                });
            }
            switchView('filter-results-view', false);
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
        
        let isSmartAddActive = false;

        function extractNumberFromText(str) {
            if (!str) return null;
            const matches = str.match(/\d+/g);
            if (!matches) return null;
            return parseInt(matches[matches.length - 1], 10);
        }

        function buildLectureItemHTML(displayName, progress, lectureId = '') {
            const hasPdf = progress && (progress.pdfHandle || progress.pdfName);
            const hasAssignment = progress && (progress.assignmentHandle || progress.assignmentName);

            let dotsHTML = '';
            if (hasAssignment) {
                dotsHTML += `<span class="status-dot yellow-dot" title="Assignment Attached"></span>`;
            }
            if (hasPdf) {
                dotsHTML += `<span class="status-dot green-dot" title="Notes Attached"></span>`;
            }

            return `
                <span class="lecture-item-title">${displayName}</span>
                ${dotsHTML ? `<div class="lecture-item-dots">${dotsHTML}</div>` : ''}
            `;
        }

        function updateDropZonesForSelectedLecture() {
            const pdfDropZone = document.getElementById('pdf-drop-zone');
            const assignDropZone = document.getElementById('assignment-drop-zone');
            if (!pdfDropZone || !assignDropZone) return;

            if (isSmartAddActive) {
                pdfDropZone.innerHTML = `
                    <div class="drop-zone-wrapper">
                        <div class="drop-zone-icon-circle">
                            <i class="fas fa-magic"></i>
                        </div>
                        <h4 class="drop-zone-title">Lecture Notes (PDF)</h4>
                        <p class="drop-zone-desc"><strong>Smart Add Active:</strong> Click or drag & drop multiple PDFs</p>
                    </div>
                `;
                assignDropZone.innerHTML = `
                    <div class="drop-zone-wrapper">
                        <div class="drop-zone-icon-circle" style="color: #f59e0b;">
                            <i class="fas fa-magic"></i>
                        </div>
                        <h4 class="drop-zone-title">Assignment / DPP</h4>
                        <p class="drop-zone-desc"><strong>Smart Add Active:</strong> Click or drag & drop multiple files</p>
                    </div>
                `;
                return;
            }

            const selectedLectureEl = document.querySelector('#upload-lecture-list .lecture-item.selected');
            const detailView = document.getElementById('upload-detail-view');
            
            if (!selectedLectureEl || !detailView) {
                pdfDropZone.innerHTML = `
                    <div class="drop-zone-wrapper">
                        <div class="drop-zone-icon-circle">
                            <i class="fas fa-file-pdf"></i>
                        </div>
                        <h4 class="drop-zone-title">Lecture Notes (PDF)</h4>
                        <p class="drop-zone-desc">Select a lecture from the list</p>
                    </div>
                `;
                assignDropZone.innerHTML = `
                    <div class="drop-zone-wrapper">
                        <div class="drop-zone-icon-circle" style="color: #f59e0b;">
                            <i class="fas fa-file-alt"></i>
                        </div>
                        <h4 class="drop-zone-title">Assignment / DPP</h4>
                        <p class="drop-zone-desc">Select a lecture from the list</p>
                    </div>
                `;
                return;
            }

            const courseId = parseInt(detailView.dataset.courseId);
            const lectureId = selectedLectureEl.dataset.lectureId;
            const progress = getLectureProgress(courseId, lectureId);

            // --- PDF / NOTES ZONE ---
            if (progress.pdfHandle || progress.pdfName) {
                const fileName = progress.pdfName || 'Lecture Notes (PDF)';
                pdfDropZone.innerHTML = `
                    <div class="zone-attached-card">
                        <span class="attached-card-badge pdf-badge"><i class="fas fa-check-circle"></i> Notes Attached</span>
                        <button class="attached-delete-btn remove-zone-file-btn" data-type="pdf" data-lecture-id="${lectureId}" title="Delete Notes">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <div class="attached-file-preview">
                            <div class="attached-file-icon-box pdf-theme">
                                <i class="fas fa-file-pdf"></i>
                            </div>
                            <h4 class="attached-file-title" title="${fileName}">${fileName}</h4>
                            <span class="attached-replace-prompt"><i class="fas fa-sync-alt"></i> Click or drop to replace PDF</span>
                        </div>
                    </div>
                `;
            } else {
                pdfDropZone.innerHTML = `
                    <div class="drop-zone-wrapper">
                        <div class="drop-zone-icon-circle">
                            <i class="fas fa-cloud-upload-alt"></i>
                        </div>
                        <h4 class="drop-zone-title">Lecture Notes (PDF)</h4>
                        <p class="drop-zone-desc">Drag & drop PDF here, or <span class="browse-highlight">browse files</span></p>
                    </div>
                `;
            }

            // --- ASSIGNMENT / DPP ZONE ---
            if (progress.assignmentHandle || progress.assignmentName) {
                const fileName = progress.assignmentName || 'Assignment / DPP';
                assignDropZone.innerHTML = `
                    <div class="zone-attached-card">
                        <span class="attached-card-badge assignment-badge"><span class="yellow-dot"></span> Assignment Attached</span>
                        <button class="attached-delete-btn remove-zone-file-btn" data-type="assignment" data-lecture-id="${lectureId}" title="Delete Assignment">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                        <div class="attached-file-preview">
                            <div class="attached-file-icon-box assignment-theme">
                                <i class="fas fa-file-alt"></i>
                            </div>
                            <h4 class="attached-file-title" title="${fileName}">${fileName}</h4>
                            <span class="attached-replace-prompt"><i class="fas fa-sync-alt"></i> Click or drop to replace file</span>
                        </div>
                    </div>
                `;
            } else {
                assignDropZone.innerHTML = `
                    <div class="drop-zone-wrapper">
                        <div class="drop-zone-icon-circle" style="color: #f59e0b;">
                            <i class="fas fa-cloud-upload-alt"></i>
                        </div>
                        <h4 class="drop-zone-title">Assignment / DPP</h4>
                        <p class="drop-zone-desc">Drag & drop file here, or <span class="browse-highlight">browse files</span></p>
                    </div>
                `;
            }
        }

        function updateSmartAddUIState() {
            const btn = document.getElementById('smart-add-toggle-btn');
            const detailView = document.getElementById('upload-detail-view');
            const list = document.getElementById('upload-lecture-list');

            if (isSmartAddActive) {
                if (btn) {
                    btn.classList.add('active');
                    btn.innerHTML = `<i class="fas fa-check"></i> <span>Smart Add ON</span>`;
                }
                if (detailView) detailView.classList.add('smart-add-active');
                if (list) {
                    list.querySelectorAll('.lecture-item.selected').forEach(sel => sel.classList.remove('selected'));
                }
            } else {
                if (btn) {
                    btn.classList.remove('active');
                    btn.innerHTML = `<i class="fas fa-magic"></i> <span>Smart Add</span>`;
                }
                if (detailView) detailView.classList.remove('smart-add-active');
                if (list && list.querySelectorAll('.lecture-item').length > 0 && !list.querySelector('.lecture-item.selected')) {
                    list.querySelector('.lecture-item').classList.add('selected');
                }
            }
            updateDropZonesForSelectedLecture();
        }

        document.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('#smart-add-toggle-btn');
            if (toggleBtn) {
                isSmartAddActive = !isSmartAddActive;
                updateSmartAddUIState();
                showToast(isSmartAddActive ? 'Smart Add Enabled: Drag & drop N files to auto-assign.' : 'Manual Mode Enabled.');
            }

            const browseBtn = e.target.closest('.browse-file-btn');
            if (browseBtn) {
                e.stopPropagation();
                e.preventDefault();
                const type = browseBtn.dataset.type;
                const inputId = type === 'pdf' ? 'pdf-file-input' : 'assignment-file-input';
                const input = document.getElementById(inputId);
                if (input) {
                    if (isSmartAddActive) {
                        input.setAttribute('multiple', 'multiple');
                    } else {
                        input.removeAttribute('multiple');
                    }
                    input.value = '';
                    input.click();
                }
            }
        });

        // Hidden input file browser listener
        ['pdf-file-input', 'assignment-file-input'].forEach(inputId => {
            document.addEventListener('change', async (e) => {
                if (e.target && e.target.id === inputId) {
                    if (e.target.files && e.target.files.length > 0) {
                        const type = inputId === 'pdf-file-input' ? 'pdf' : 'assignment';
                        await handleLectureFileDrop(e.target.files, type);
                        updateDropZonesForSelectedLecture();
                    }
                }
            });
        });

        // Red Delete button inside zone card handler
        document.addEventListener('click', async (e) => {
            const removeZoneBtn = e.target.closest('.remove-zone-file-btn');
            if (removeZoneBtn) {
                e.stopPropagation();
                e.preventDefault();

                const type = removeZoneBtn.dataset.type;
                const lectureId = removeZoneBtn.dataset.lectureId;
                const detailView = document.getElementById('upload-detail-view');
                if (!detailView || !lectureId) return;

                const courseId = parseInt(detailView.dataset.courseId);
                const progressData = getLectureProgress(courseId, lectureId);

                if (type === 'pdf') {
                    delete progressData.pdfHandle;
                    delete progressData.pdfName;
                } else if (type === 'assignment') {
                    delete progressData.assignmentHandle;
                    delete progressData.assignmentName;
                    delete progressData.assignmentType;
                }

                await saveLectureProgress({ ...progressData, courseId, lectureId });

                const lectureEl = document.querySelector(`#upload-lecture-list .lecture-item[data-lecture-id="${lectureId}"]`);
                if (lectureEl) {
                    const displayName = lectureEl.dataset.displayName || lectureEl.querySelector('.lecture-item-title')?.textContent || 'Lecture';
                    const updatedProgress = getLectureProgress(courseId, lectureId);
                    lectureEl.innerHTML = buildLectureItemHTML(displayName, updatedProgress, lectureId);
                }

                updateDropZonesForSelectedLecture();
                showToast(`Deleted ${type === 'pdf' ? 'notes PDF' : 'assignment'} from both views.`);
            }

            const removeBtn = e.target.closest('.remove-attachment-btn');
            if (removeBtn) {
                e.stopPropagation();
                e.preventDefault();

                const type = removeBtn.dataset.type;
                const lectureId = removeBtn.dataset.lectureId;
                const detailView = document.getElementById('upload-detail-view');
                if (!detailView || !lectureId) return;

                const courseId = parseInt(detailView.dataset.courseId);
                const progressData = getLectureProgress(courseId, lectureId);

                if (type === 'pdf') {
                    delete progressData.pdfHandle;
                    delete progressData.pdfName;
                } else if (type === 'assignment') {
                    delete progressData.assignmentHandle;
                    delete progressData.assignmentName;
                    delete progressData.assignmentType;
                }

                await saveLectureProgress({ ...progressData, courseId, lectureId });

                const lectureEl = document.querySelector(`#upload-lecture-list .lecture-item[data-lecture-id="${lectureId}"]`);
                if (lectureEl) {
                    const displayName = lectureEl.dataset.displayName || lectureEl.querySelector('.lecture-item-title')?.textContent || 'Lecture';
                    const updatedProgress = getLectureProgress(courseId, lectureId);
                    lectureEl.innerHTML = buildLectureItemHTML(displayName, updatedProgress, lectureId);
                }

                updateDropZonesForSelectedLecture();
                showToast(`Removed ${type === 'pdf' ? 'notes PDF' : 'assignment'} successfully.`);
            }
        });

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
                item.dataset.displayName = lecture.displayName;
                item.innerHTML = buildLectureItemHTML(lecture.displayName, progress, lecture.id);
                list.appendChild(item);
            });

            // Automatically select first lecture in manual mode
            if (!isSmartAddActive && lectures.length > 0) {
                list.querySelector('.lecture-item').classList.add('selected');
            }
            
            // Add click listeners for selection
            list.querySelectorAll('.lecture-item').forEach(item => {
                item.addEventListener('click', () => {
                    if (isSmartAddActive) return; // Locked in Smart Add mode
                    list.querySelectorAll('.lecture-item.selected').forEach(sel => sel.classList.remove('selected'));
                    item.classList.add('selected');
                    updateDropZonesForSelectedLecture();
                });
            });

            // Update UI state for Smart Add mode and drop zone cards
            updateSmartAddUIState();
        }


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
            container.querySelector('.course-stats').textContent = `${formatDuration(totalDuration)} total • ${formatDuration(remainingDuration)} remaining`;
            container.querySelector('.menu-progress-fill').style.width = `${percentage}%`;
            container.querySelector('.menu-progress-text').textContent = `${completed}/${lectures.length} lectures completed`;
        }

        async function playLectureFromAnywhere(courseId, lectureId, originView = 'dashboard-view', subfolder = null) {
            lastView = originView;
            const course = courses.find(c => c.id === parseInt(courseId));
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

            currentCourse = courses.find(c => String(c.id) === String(courseId));
            currentSubfolder = subfolder;
            if (!currentCourse) return;
            switchView('player-view');
            if (lectureMenu) lectureMenu.classList.remove('hidden');
            if (sidebarToggleBtn) sidebarToggleBtn.classList.remove('collapsed');
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
                const filtered = chaptersToDisplay.filter(ch => ch.name === subfolder || ch.name.startsWith(subfolder + '/') || subfolder.startsWith(ch.name + '/'));
                if (filtered.length > 0) {
                    chaptersToDisplay = filtered;
                }
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
                liToPlay = chapterListDiv.querySelector(`li[data-course-id="${courseId}"][data-lecture-id="${lectureIdToPlay}"]`) || chapterListDiv.querySelector(`li[data-lecture-id="${lectureIdToPlay}"]`);
            }
            if (!liToPlay) {
                liToPlay = chapterListDiv.querySelector('li');
            }
            if (liToPlay) await playVideo(liToPlay, null);
        }

        async function renderCalendarPlayer(courseId, lectureIdToPlay) {
            currentCourse = courses.find(c => c.id === parseInt(courseId));
            if (!currentCourse) return;
            switchView('player-view');
            chapterListDiv.innerHTML = '<p style="text-align:center; padding: 20px;">Loading Calendar Playlist...</p>';

            backToLibraryBtn.textContent = 'Back to Calendar';
            backToLibraryBtn.dataset.view = 'calendar';

            // Format date suffix for title display
            const playlistDate = localStorage.getItem('courseflix_calendar_playlist_date');
            let dateSuffix = '';
            if (playlistDate) {
                const d = new Date(playlistDate + 'T00:00:00');
                const formatted = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                dateSuffix = ` (${formatted})`;
            }
            courseTitleMenu.textContent = `📅 Calendar Event Playlist${dateSuffix}`;
            clearBookmarksBtn.classList.add('hidden');
            toggleCompletedBtn.classList.remove('hidden');

            const saved = localStorage.getItem('courseflix_calendar_playlist');
            let calendarPlaylist = [];
            if (saved) {
                try { calendarPlaylist = JSON.parse(saved); } catch(e) {}
            }

            if (calendarPlaylist.length === 0) {
                chapterListDiv.innerHTML = '<p id="no-content-message">Calendar playlist is empty.</p>';
                return;
            }

            const chaptersToDisplay = [];
            calendarPlaylist.forEach(item => {
                let ch = chaptersToDisplay.find(c => c.name === item.courseTitle);
                if (!ch) {
                    ch = { name: item.courseTitle, lectures: [] };
                    chaptersToDisplay.push(ch);
                }
                const originalCourse = courses.find(c => c.id === parseInt(item.courseId));
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
                liToPlay = chapterListDiv.querySelector(`li[data-course-id="${courseId}"][data-lecture-id="${lectureIdToPlay}"]`) || chapterListDiv.querySelector(`li[data-lecture-id="${lectureIdToPlay}"]`);
            }
            if (!liToPlay) liToPlay = chapterListDiv.querySelector('li');
            if (liToPlay) await playVideo(liToPlay, null);
        }

        async function renderStudyTogetherPlayer(status) {
            isGoalsMode = true; // Use Goals mode playback logic
            isCalendarMode = false;
            isStudyTogetherMode = true;
            currentStudyTogetherStatus = status;

            switchView('player-view');
            chapterListDiv.innerHTML = '<p style="text-align:center; padding: 20px;">Loading Study Together Playlist...</p>';

            backToLibraryBtn.textContent = `← Back to ${status.charAt(0).toUpperCase() + status.slice(1)}`;
            backToLibraryBtn.dataset.view = `${status}-view`;

            courseTitleMenu.textContent = `🤝 Study Together: ${status.charAt(0).toUpperCase() + status.slice(1)}`;
            clearBookmarksBtn.classList.add('hidden');
            toggleCompletedBtn.classList.remove('hidden');

            const allItems = Object.values(courseProgress).filter(p => p.status === status);
            const chaptersToDisplay = [];
            
            allItems.forEach(item => {
                const originalCourse = courses.find(c => c.id === parseInt(item.courseId));
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
                chapterListDiv.innerHTML = '<p id="no-content-message">Playlist is empty.</p>';
                return;
            }

            renderChapterList(chaptersToDisplay);
            currentGoalsLectures = chaptersToDisplay.flatMap(ch => ch.lectures);
            updateMenuProgress();

            let liToPlay = chapterListDiv.querySelector('li');
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

            if (currentLectureLi && currentCourse) { // Save last played info before switching
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
            if (courseIdOverride && (!currentCourse || parseInt(courseIdOverride) !== currentCourse.id)) {
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
                        mediaViewerFrame.src = `/pdf-viewer.html?file=${encodeURIComponent(activeFileUrl)}`;
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
                    mediaViewerToggleBtn.classList.add('hidden');
                    deleteViewerFileBtn.dataset.type = activeViewerFileType;
                    deleteViewerFileBtn.classList.add('visible');
                    
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
                        
                        deleteViewerFileBtn.parentNode.insertBefore(popOutBtnDynamic, deleteViewerFileBtn);
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
            mediaViewer.style.width = '0px';
            deleteViewerFileBtn.classList.remove('visible');
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
        homeBtn.addEventListener('click', () => switchView('home-view'));

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
                            const course = courses.find(c => c.id === courseId);
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
                            await purgeAllDataForDeletedCoursesAndSubfolders();
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
                const folderDisplayName = currentSubfolder ? getSubfolderDisplayName(currentCourse, currentSubfolder) : (currentCourse ? currentCourse.title : 'DPP');
                let num = 1;
                if (currentCourse && currentCourse.lectures) {
                    let lectures = currentCourse.lectures;
                    if (currentSubfolder) lectures = currentCourse.lectures.filter(l => l.chapter === currentSubfolder || l.chapter.startsWith(currentSubfolder + '/'));
                    const idx = lectures.findIndex(l => String(l.id) === String(lectureId));
                    if (idx !== -1) num = idx + 1;
                }
                const autoName = `${folderDisplayName} ${num}`;
                const progressData = getLectureProgress(currentCourse.id, lectureId);
                await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: autoName, assignmentType: file.type, courseId: currentCourse.id, lectureId: lectureId });
                await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
                await showMediaViewer(file, 'Assignment', autoName, getLectureProgress(currentCourse.id, lectureId));
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

        closeViewerBtn.addEventListener('click', minimizeMediaViewer);
        
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
            
            const subView = document.getElementById('subcourse-view');
            const isSubcourseView = subView && subView.classList.contains('active');
            const playerView = document.getElementById('player-view');
            const isPlayerView = playerView && playerView.classList.contains('active');
            
            let activeCourseId = null;
            let activeSubPath = '';
            
            if (isSubcourseView) {
                activeCourseId = parseInt(subView.dataset.courseId);
                activeSubPath = subView.dataset.currentPath || '';
            } else if (isPlayerView && typeof currentCourse !== 'undefined' && currentCourse) {
                activeCourseId = currentCourse.id;
                activeSubPath = (typeof currentSubfolder !== 'undefined' && currentSubfolder) ? currentSubfolder : '';
            }
            
            const subContainer = document.getElementById('add-subcourse-container');
            const subText = document.getElementById('add-subcourse-btn-text');
            const addFolderBtn = document.getElementById('add-folder-btn');
            
            if (activeCourseId && typeof courses !== 'undefined') {
                const course = courses.find(c => c.id === activeCourseId);
                if (course) {
                    const folderDisplay = activeSubPath ? activeSubPath.split('/').pop() : course.title;
                    if (subContainer && subText) {
                        subText.textContent = `Add Sub-Folder Course in "${folderDisplay}"`;
                        subContainer.style.display = 'block';
                        subContainer.dataset.courseId = activeCourseId;
                        subContainer.dataset.subPath = activeSubPath;
                    }
                    if (addFolderBtn) {
                        addFolderBtn.style.display = 'none';
                    }
                } else {
                    if (subContainer) subContainer.style.display = 'none';
                    if (addFolderBtn) {
                        addFolderBtn.style.display = 'block';
                        addFolderBtn.innerHTML = '<i class="fas fa-folder-plus"></i> Add Course Folder';
                    }
                }
            } else {
                if (subContainer) subContainer.style.display = 'none';
                if (addFolderBtn) {
                    addFolderBtn.style.display = 'block';
                    addFolderBtn.innerHTML = '<i class="fas fa-folder-plus"></i> Add Course Folder';
                }
            }

            modal.classList.remove('hidden');
        });
        document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') e.target.classList.add('hidden'); });
        
        const addSubBtnEl = document.getElementById('add-subcourse-btn');
        if (addSubBtnEl) {
            addSubBtnEl.addEventListener('click', async () => {
                const subContainer = document.getElementById('add-subcourse-container');
                const courseId = parseInt(subContainer?.dataset.courseId);
                const basePath = subContainer?.dataset.subPath || '';
                
                if (!courseId || typeof courses === 'undefined') return;
                const course = courses.find(c => c.id === courseId);
                if (!course) return;
                
                try {
                    const dirHandle = await window.showDirectoryPicker({ startIn: 'downloads' });
                    const targetSubPath = basePath ? `${basePath}/${dirHandle.name}` : dirHandle.name;
                    const courseData = await scanDirectoryHandle(dirHandle, targetSubPath, course.lectures || []);
                    
                    if (courseData.videoCount === 0) {
                        return showToast('No videos found in this folder or its subfolders.', true);
                    }
                    
                    course.lectures = course.lectures || [];
                    course.chapters = course.chapters || [];
                    
                    courseData.lectures.forEach(newLec => {
                        if (!course.lectures.some(existing => existing.id === newLec.id)) {
                            course.lectures.push(newLec);
                        }
                    });
                    
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
                    
                    course.videoCount = (course.videoCount || 0) + courseData.videoCount;
                    course.totalDuration = (course.totalDuration || 0) + courseData.totalDuration;
                    
                    await new Promise(r => getStore(STORE_NAME, 'readwrite').put(course).onsuccess = r);
                    showToast(`Sub-course "${dirHandle.name}" added successfully (${courseData.videoCount} videos)!`, false);
                    
                    const subView = document.getElementById('subcourse-view');
                    if (subView && subView.classList.contains('active')) {
                        await renderSubcourseView(course.id, basePath);
                    } else {
                        await loadCoursesFromDB();
                    }
                } catch (e) {
                    if (e.name !== 'AbortError') console.error(e);
                } finally {
                    document.getElementById('modal-overlay').classList.add('hidden');
                }
            });
        }

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
        const purgeBtn = document.getElementById('purge-btn');

        async function analyzeOrphanData() {
            await ensureDB();
            const activeCourses = await new Promise((resolve) => {
                const req = getStore(STORE_NAME, 'readonly').getAll();
                req.onsuccess = e => resolve(e.target.result || []);
                req.onerror = () => resolve([]);
            });

            const activeLectureMap = {};
            activeCourses.forEach(c => {
                if (c && !c.isIgnored && Array.isArray(c.lectures)) {
                    activeLectureMap[c.id] = new Set(c.lectures.map(l => String(l.id)));
                }
            });

            const getRecordStatus = (courseId, subfolderPath, lectureId, itemId) => {
                if (!courseId) return { valid: false, reason: 'Deleted Subject' };
                const cId = parseInt(courseId);
                const course = activeCourses.find(c => parseInt(c.id) === cId);
                if (!course) return { valid: false, reason: 'Deleted Subject', courseTitle: `Subject (ID ${cId})` };
                if (subfolderPath && isSubfolderPathHidden(course, subfolderPath)) {
                    return { valid: false, reason: 'Deleted Subfolder', courseTitle: course.title, subfolder: subfolderPath };
                }
                
                let lecId = lectureId ? String(lectureId) : null;
                if (!lecId && itemId && typeof itemId === 'string' && itemId.startsWith(cId + '_')) {
                    lecId = itemId.replace(cId + '_', '');
                }
                if (lecId && activeLectureMap[cId] && activeLectureMap[cId].size > 0) {
                    if (!activeLectureMap[cId].has(lecId)) {
                        return { valid: false, reason: 'Deleted Lecture File', courseTitle: course.title, lectureId: lecId };
                    }
                }
                return { valid: true, courseTitle: course.title };
            };

            const orphanList = [];

            // 1. PROGRESS_STORE
            const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            for (const prog of allProgress) {
                const sub = prog.subfolder || prog.chapter || '';
                const st = getRecordStatus(prog.courseId, sub, prog.lectureId, prog.id);
                if (!st.valid) {
                    let extras = [];
                    if (prog.pdfHandle || prog.pdfName) extras.push('PDF Note');
                    if (prog.notes) extras.push('Intel Note');
                    if (prog.assignmentHandle || prog.assignmentName) extras.push('Assignment');
                    const extraStr = extras.length > 0 ? ` (${extras.join(', ')})` : '';
                    orphanList.push({
                        id: prog.id,
                        store: 'progress',
                        type: 'Progress & Notes',
                        courseTitle: st.courseTitle || `Course #${prog.courseId}`,
                        targetName: (prog.lectureName || prog.name || prog.id) + extraStr,
                        reason: st.reason,
                        rawItem: prog
                    });
                }
            }

            // 2. DOUBTS_STORE
            const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            for (const d of allDoubts) {
                const sub = d.subfolder || d.chapter || '';
                const st = getRecordStatus(d.courseId, sub, d.lectureId, d.id);
                if (!st.valid) {
                    orphanList.push({
                        id: d.id,
                        store: 'doubts',
                        type: 'Doubt Entry',
                        courseTitle: st.courseTitle || `Course #${d.courseId}`,
                        targetName: d.comment || d.lectureName || `Doubt #${d.id}`,
                        reason: st.reason,
                        rawItem: d
                    });
                }
            }

            // 3. DPP_STORE
            const allDpp = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            for (const dpp of allDpp) {
                const sub = dpp.subfolder || dpp.chapter || '';
                const st = getRecordStatus(dpp.courseId, sub, dpp.lectureId, dpp.id);
                if (!st.valid) {
                    orphanList.push({
                        id: dpp.id,
                        store: 'dpps',
                        type: 'DPP Assignment',
                        courseTitle: st.courseTitle || `Course #${dpp.courseId}`,
                        targetName: dpp.name || dpp.title || `DPP #${dpp.id}`,
                        reason: st.reason,
                        rawItem: dpp
                    });
                }
            }

            // 4. courseflix_logs in localStorage
            try {
                let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
                cfLogs.forEach((log, index) => {
                    const st = getRecordStatus(log.courseId, log.subfolder || log.chapter, log.lectureId, log.id);
                    if (!st.valid) {
                        orphanList.push({
                            id: index,
                            store: 'logs',
                            type: 'Study Log',
                            courseTitle: st.courseTitle || `Course #${log.courseId}`,
                            targetName: log.lectureName || log.action || `Log #${index}`,
                            reason: st.reason,
                            rawItem: log
                        });
                    }
                });
            } catch (e) {}

            return orphanList;
        }

        async function deleteSelectedOrphanItems(selectedItems) {
            let count = 0;
            const progressIdsToDelete = selectedItems.filter(i => i.store === 'progress').map(i => i.id);
            const doubtIdsToDelete = selectedItems.filter(i => i.store === 'doubts').map(i => i.id);
            const dppIdsToDelete = selectedItems.filter(i => i.store === 'dpps').map(i => i.id);
            const logIndicesToDelete = new Set(selectedItems.filter(i => i.store === 'logs').map(i => i.id));

            if (progressIdsToDelete.length > 0) {
                const progressStore = getStore(PROGRESS_STORE, 'readwrite');
                for (const pid of progressIdsToDelete) {
                    progressStore.delete(pid);
                    count++;
                    if (typeof courseProgress !== 'undefined' && courseProgress) {
                        delete courseProgress[pid];
                    }
                }
            }

            if (doubtIdsToDelete.length > 0) {
                const doubtsStore = getStore(DOUBTS_STORE, 'readwrite');
                for (const did of doubtIdsToDelete) {
                    doubtsStore.delete(did);
                    count++;
                }
            }

            if (dppIdsToDelete.length > 0) {
                const dppStore = getStore(DPP_STORE, 'readwrite');
                for (const dpid of dppIdsToDelete) {
                    dppStore.delete(dpid);
                    count++;
                }
            }

            if (logIndicesToDelete.size > 0) {
                try {
                    let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
                    const filteredLogs = cfLogs.filter((_, idx) => !logIndicesToDelete.has(idx));
                    count += (cfLogs.length - filteredLogs.length);
                    localStorage.setItem('courseflix_logs', JSON.stringify(filteredLogs));
                } catch (e) {}
            }

            await cleanupOrphanedHistoryEntries();
            return count;
        }

        function showPurgeAnalysisModal(orphanList) {
            let modal = document.getElementById('purge-analysis-modal');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'purge-analysis-modal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'z-index: 1000000; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 20px;';

            const rowsHtml = orphanList.map((item, idx) => `
                <tr style="border-bottom: 1px solid var(--border-secondary, rgba(255,255,255,0.08)); font-size: 0.88rem;">
                    <td style="padding: 10px 12px; text-align: center;">
                        <input type="checkbox" class="purge-item-cb" data-index="${idx}" checked style="width: 16px; height: 16px; cursor: pointer; accent-color: #ef4444;" />
                    </td>
                    <td style="padding: 10px 12px; white-space: nowrap;">
                        <span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.78rem;">
                            ${item.type}
                        </span>
                    </td>
                    <td style="padding: 10px 12px; color: var(--text-primary, #f8fafc); font-weight: 600;">
                        ${item.courseTitle}
                    </td>
                    <td style="padding: 10px 12px; color: var(--text-secondary, #94a3b8); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.targetName}
                    </td>
                    <td style="padding: 10px 12px; white-space: nowrap;">
                        <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 3px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 600;">
                            ${item.reason}
                        </span>
                    </td>
                </tr>
            `).join('');

            modal.innerHTML = `
                <div class="modal-content glass-modal" style="max-width: 850px; width: 95%; max-height: 85vh; display: flex; flex-direction: column; padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(15, 23, 42, 0.96); box-shadow: 0 25px 60px rgba(0,0,0,0.7); color: #ffffff;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid var(--border-secondary, rgba(255,255,255,0.1)); padding-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #ffffff;">Purge Orphan Data Analysis</h2>
                                <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #94a3b8;">There are <strong>${orphanList.length}</strong> orphan items to purge.</p>
                            </div>
                        </div>
                        <button id="close-purge-modal-btn" style="background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer;">&times;</button>
                    </div>

                    <div style="flex: 1; overflow-y: auto; margin-bottom: 1rem; border-radius: 10px; border: 1px solid var(--border-secondary, rgba(255,255,255,0.08)); background: rgba(0,0,0,0.2);">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead style="position: sticky; top: 0; background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10;">
                                <tr style="font-size: 0.82rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                                    <th style="padding: 10px 12px; width: 40px; text-align: center;">
                                        <input type="checkbox" id="purge-select-all-cb" checked style="width: 16px; height: 16px; cursor: pointer; accent-color: #ef4444;" />
                                    </th>
                                    <th style="padding: 10px 12px;">Type</th>
                                    <th style="padding: 10px 12px;">Subject / Course</th>
                                    <th style="padding: 10px 12px;">Target Content / Lecture</th>
                                    <th style="padding: 10px 12px;">Reason</th>
                                </tr>
                            </thead>
                            <tbody id="purge-table-body">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-secondary, rgba(255,255,255,0.1)); padding-top: 1rem;">
                        <div id="purge-selection-status" style="font-size: 0.88rem; font-weight: 600; color: #94a3b8;">
                            Selected: <span id="purge-selected-count" style="color: #ef4444;">${orphanList.length}</span> / ${orphanList.length} items
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button id="purge-cancel-analysis-btn" class="secondary-btn" style="padding: 9px 18px; border-radius: 10px; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button id="purge-execute-selected-btn" class="danger-btn" style="background: #ef4444; color: #ffffff; padding: 9px 18px; border-radius: 10px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-trash-alt"></i> Delete Selected (<span id="purge-btn-count">${orphanList.length}</span>)
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const selectAllCb = modal.querySelector('#purge-select-all-cb');
            const itemCbs = modal.querySelectorAll('.purge-item-cb');
            const countSpan = modal.querySelector('#purge-selected-count');
            const btnCountSpan = modal.querySelector('#purge-btn-count');
            const deleteBtn = modal.querySelector('#purge-execute-selected-btn');

            const updateCounts = () => {
                const checked = Array.from(itemCbs).filter(cb => cb.checked);
                if (countSpan) countSpan.textContent = checked.length;
                if (btnCountSpan) btnCountSpan.textContent = checked.length;
                if (deleteBtn) deleteBtn.disabled = checked.length === 0;
                if (selectAllCb) selectAllCb.checked = checked.length === itemCbs.length;
            };

            if (selectAllCb) {
                selectAllCb.addEventListener('change', (e) => {
                    itemCbs.forEach(cb => cb.checked = e.target.checked);
                    updateCounts();
                });
            }

            itemCbs.forEach(cb => {
                cb.addEventListener('change', updateCounts);
            });

            const closeModal = () => modal.remove();

            modal.querySelector('#close-purge-modal-btn')?.addEventListener('click', closeModal);
            modal.querySelector('#purge-cancel-analysis-btn')?.addEventListener('click', closeModal);

            deleteBtn?.addEventListener('click', async () => {
                const selectedIndices = Array.from(itemCbs).filter(cb => cb.checked).map(cb => parseInt(cb.dataset.index));
                const selectedItems = selectedIndices.map(idx => orphanList[idx]);

                if (selectedItems.length === 0) return;

                deleteBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Deleting...`;
                deleteBtn.disabled = true;

                try {
                    const deletedCount = await deleteSelectedOrphanItems(selectedItems);
                    if (typeof loadCoursesFromDB === 'function') await loadCoursesFromDB();
                    if (typeof renderHistoryView === 'function') renderHistoryView();
                    if (typeof renderNotesCourseSelectionView === 'function') renderNotesCourseSelectionView();
                    if (typeof renderIntellHome === 'function') renderIntellHome();

                    showToast(`Successfully purged ${deletedCount} selected orphan items!`);
                    closeModal();
                } catch (err) {
                    console.error('Error deleting selected orphan items:', err);
                    showToast('Error during orphan deletion.', true);
                }
            });
        }

        if (purgeBtn) {
            purgeBtn.addEventListener('click', () => {
                purgeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing...`;
                purgeBtn.disabled = true;

                setTimeout(async () => {
                    try {
                        const orphanList = await analyzeOrphanData();
                        if (!orphanList || orphanList.length === 0) {
                            showToast('No orphan data found to purge. Everything is clean!');
                        } else {
                            document.getElementById('modal-overlay')?.classList.add('hidden');
                            showPurgeAnalysisModal(orphanList);
                        }
                    } catch (err) {
                        console.error('Error analyzing orphan data:', err);
                        showToast('Error analyzing orphan data.', true);
                    } finally {
                        purgeBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Purge Orphan Data`;
                        purgeBtn.disabled = false;
                    }
                }, 50);
            });
        }

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

        function formatBytes(bytes, decimals = 1) {
            if (!bytes || bytes <= 0) return '0 B';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        async function getHandleSize(handle) {
            if (!handle) return 0;
            if (typeof handle === 'number') return handle;
            if (handle instanceof Blob || handle instanceof File) return handle.size;
            if (typeof handle.getFile === 'function') {
                try {
                    const file = await handle.getFile();
                    return file ? file.size : 0;
                } catch (e) {
                    return 0;
                }
            }
            if (typeof handle === 'string') {
                if (handle.startsWith('data:')) {
                    const base64Str = handle.split(',')[1] || '';
                    return Math.round((base64Str.length * 3) / 4);
                }
                return new Blob([handle]).size;
            }
            return 0;
        }

        async function analyzeExportData() {
            await ensureDB();
            const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const allHistory = await new Promise(r => getStore(HISTORY_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const localStoreData = { ...localStorage };

            // Backup ProgressAppDB assignmentFiles
            const progressFiles = [];
            try {
                const progRequest = indexedDB.open('ProgressAppDB', 1);
                await new Promise((resolve) => {
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
                                            } else if (handle && typeof handle.getFile === 'function') {
                                                if (await handle.queryPermission() === 'granted') {
                                                    file = await handle.getFile();
                                                }
                                            }
                                            if (file) {
                                                const filename = `prog_${id}_${file.name}`;
                                                progressFiles.push({ id: id, filename: filename, file: file, size: file.size });
                                            }
                                        } catch (err) {
                                            console.warn("Could not inspect progress file size", id, err);
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
            } catch (e) { console.error("Error reading ProgressAppDB", e); }

            // Helper to resolve Subject Title
            const getSubjectTitle = (cId) => {
                if (!cId) return 'General / Other';
                const found = courses.find(c => String(c.id) === String(cId));
                return found ? (found.title || `Subject ${cId}`) : `Subject #${cId}`;
            };

            // 1. Lecture Notes PDFs Grouped by Subject
            const notesSubjectsMap = {};
            let totalNotesPdfSize = 0;
            for (const prog of allProgress) {
                if (prog && prog.pdfHandle) {
                    const size = await getHandleSize(prog.pdfHandle);
                    totalNotesPdfSize += size;
                    const cId = String(prog.courseId || 'other');
                    if (!notesSubjectsMap[cId]) {
                        notesSubjectsMap[cId] = {
                            courseId: cId,
                            title: getSubjectTitle(cId),
                            count: 0,
                            size: 0
                        };
                    }
                    notesSubjectsMap[cId].count++;
                    notesSubjectsMap[cId].size += size;
                }
            }

            // 2. DPP & Assignment Files Grouped by Subject (Deduplicated)
            const dppSubjectsMap = {};
            let totalDppPdfSize = 0;
            const processedDppHandles = new Set();

            // DPPs from DPP_STORE
            for (const dpp of allDpps) {
                if (dpp && dpp.fileHandle) {
                    if (!processedDppHandles.has(dpp.fileHandle)) {
                        processedDppHandles.add(dpp.fileHandle);
                        const size = await getHandleSize(dpp.fileHandle);
                        totalDppPdfSize += size;
                        const cId = String(dpp.courseId || 'other');
                        if (!dppSubjectsMap[cId]) {
                            dppSubjectsMap[cId] = {
                                courseId: cId,
                                title: getSubjectTitle(cId),
                                dppCount: 0,
                                assignCount: 0,
                                totalCount: 0,
                                size: 0
                            };
                        }
                        dppSubjectsMap[cId].dppCount++;
                        dppSubjectsMap[cId].totalCount++;
                        dppSubjectsMap[cId].size += size;
                    }
                }
            }

            // Assignments from PROGRESS_STORE (only if not already counted via DPP_STORE)
            for (const prog of allProgress) {
                if (prog && prog.assignmentHandle) {
                    if (!processedDppHandles.has(prog.assignmentHandle)) {
                        processedDppHandles.add(prog.assignmentHandle);
                        const size = await getHandleSize(prog.assignmentHandle);
                        totalDppPdfSize += size;
                        const cId = String(prog.courseId || 'other');
                        if (!dppSubjectsMap[cId]) {
                            dppSubjectsMap[cId] = {
                                courseId: cId,
                                title: getSubjectTitle(cId),
                                dppCount: 0,
                                assignCount: 0,
                                totalCount: 0,
                                size: 0
                            };
                        }
                        dppSubjectsMap[cId].assignCount++;
                        dppSubjectsMap[cId].totalCount++;
                        dppSubjectsMap[cId].size += size;
                    }
                }
            }

            // ProgressAppDB assignmentFiles (only if not already counted)
            for (const pf of progressFiles) {
                if (pf.file && !processedDppHandles.has(pf.file)) {
                    processedDppHandles.add(pf.file);
                    totalDppPdfSize += (pf.size || 0);
                }
            }

            // 3. Courses JSON + Thumbnails (Deduplicated base64)
            let coursesSize = 0;
            try {
                const cleanCoursesForCalc = [];
                for (const c of courses) {
                    const cleanC = { ...c };
                    if (cleanC.thumbnail && typeof cleanC.thumbnail === 'string' && cleanC.thumbnail.startsWith('data:')) {
                        try {
                            coursesSize += base64ToBlob(cleanC.thumbnail).size;
                        } catch (e) {}
                        delete cleanC.thumbnail;
                    }
                    if (cleanC.subCourseData) {
                        const newSub = {};
                        for (const sub in cleanC.subCourseData) {
                            const subObj = { ...cleanC.subCourseData[sub] };
                            if (subObj.thumbnail && typeof subObj.thumbnail === 'string' && subObj.thumbnail.startsWith('data:')) {
                                try {
                                    coursesSize += base64ToBlob(subObj.thumbnail).size;
                                } catch (e) {}
                                delete subObj.thumbnail;
                            }
                            newSub[sub] = subObj;
                        }
                        cleanC.subCourseData = newSub;
                    }
                    cleanCoursesForCalc.push(cleanC);
                }
                coursesSize += new Blob([JSON.stringify(cleanCoursesForCalc)]).size;
            } catch (e) {}

            // 4. Doubts Size
            let doubtsSize = 0;
            try {
                doubtsSize = new Blob([JSON.stringify(allDoubts)]).size;
            } catch (e) {}

            // 5. History Size (Deduplicated base64)
            let historySize = 0;
            try {
                const cleanHistForCalc = [];
                if (Array.isArray(allHistory)) {
                    for (const h of allHistory) {
                        const cleanH = { ...h };
                        if (cleanH.thumbnail && typeof cleanH.thumbnail === 'string' && cleanH.thumbnail.startsWith('data:')) {
                            try {
                                historySize += base64ToBlob(cleanH.thumbnail).size;
                            } catch (e) {}
                            delete cleanH.thumbnail;
                        }
                        cleanHistForCalc.push(cleanH);
                    }
                }
                historySize += new Blob([JSON.stringify(cleanHistForCalc)]).size;
            } catch (e) {}

            // 6. Settings / LocalStorage Size (Deduplicated base64)
            let settingsSize = 0;
            try {
                const cleanLS = { ...localStoreData };
                const facultyMetaRaw = cleanLS['courseflix_faculty_meta'];
                if (facultyMetaRaw) {
                    try {
                        const facultyMeta = JSON.parse(facultyMetaRaw);
                        for (const [fName, meta] of Object.entries(facultyMeta)) {
                            if (meta.photo && typeof meta.photo === 'string' && meta.photo.startsWith('data:')) {
                                try {
                                    settingsSize += base64ToBlob(meta.photo).size;
                                } catch (e) {}
                                delete meta.photo;
                            }
                        }
                        cleanLS['courseflix_faculty_meta'] = JSON.stringify(facultyMeta);
                    } catch (e) {}
                }
                settingsSize += new Blob([JSON.stringify(cleanLS)]).size;
            } catch (e) {}

            return {
                notesData: {
                    totalSize: totalNotesPdfSize,
                    subjects: Object.values(notesSubjectsMap).sort((a, b) => b.size - a.size)
                },
                dppsData: {
                    totalSize: totalDppPdfSize,
                    subjects: Object.values(dppSubjectsMap).sort((a, b) => b.size - a.size)
                },
                categorySizes: {
                    courses: coursesSize,
                    doubts: doubtsSize,
                    history: historySize,
                    settings: settingsSize
                },
                raw: {
                    allProgress,
                    allDpps,
                    allDoubts,
                    allHistory,
                    courses,
                    localStoreData,
                    progressFiles
                }
            };
        }

        async function openExportBackupModal(analysis) {
            let modal = document.getElementById('export-backup-modal');
            if (modal) modal.remove();

            const { notesData, dppsData, categorySizes } = analysis;

            // Generate Subject Rows HTML for DPPs / Assignments
            const dppSubjectRowsHtml = dppsData.subjects.length === 0
                ? `<div style="padding: 8px 12px; font-size: 0.82rem; color: #94a3b8; font-style: italic;">No DPP or Assignment PDFs found</div>`
                : dppsData.subjects.map(s => `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.25); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                            <input type="checkbox" class="export-dpp-subj-cb" data-course-id="${s.courseId}" checked style="width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer;" />
                            <span style="font-size: 0.88rem; font-weight: 600; color: #f1f5f9;">${s.title}</span>
                        </label>
                        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; background: rgba(255, 255, 255, 0.06); padding: 2px 8px; border-radius: 6px;">
                            ${s.totalCount} item${s.totalCount > 1 ? 's' : ''} (${formatBytes(s.size)})
                        </span>
                    </div>
                `).join('');

            // Generate Subject Rows HTML for Lecture Notes PDFs
            const notesSubjectRowsHtml = notesData.subjects.length === 0
                ? `<div style="padding: 8px 12px; font-size: 0.82rem; color: #94a3b8; font-style: italic;">No Lecture Notes PDFs found</div>`
                : notesData.subjects.map(s => `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.25); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                            <input type="checkbox" class="export-notes-subj-cb" data-course-id="${s.courseId}" checked style="width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer;" />
                            <span style="font-size: 0.88rem; font-weight: 600; color: #f1f5f9;">${s.title}</span>
                        </label>
                        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; background: rgba(255, 255, 255, 0.06); padding: 2px 8px; border-radius: 6px;">
                            ${s.count} PDF${s.count > 1 ? 's' : ''} (${formatBytes(s.size)})
                        </span>
                    </div>
                `).join('');

            modal = document.createElement('div');
            modal.id = 'export-backup-modal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'z-index: 1000000; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease-out;';

            modal.innerHTML = `
                <style>
                    #export-backup-modal ::-webkit-scrollbar,
                    #export-backup-modal *::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    #export-backup-modal,
                    #export-backup-modal * {
                        -ms-overflow-style: none !important;
                        scrollbar-width: none !important;
                    }
                </style>
                <div class="modal-content glass-modal" style="max-width: 680px; width: 100%; max-height: 88vh; display: flex; flex-direction: column; padding: 1.4rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(15, 23, 42, 0.96); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8); color: #ffffff; font-family: inherit;">
                    
                    <!-- Header -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.85rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                <i class="fas fa-file-export"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: #ffffff;">Export Backup Options</h2>
                                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #94a3b8;">Select which items and subject PDFs to include in your export</p>
                            </div>
                        </div>
                        <button id="close-export-modal-btn" style="background: none; border: none; font-size: 1.6rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; line-height: 1; transition: color 0.2s;">&times;</button>
                    </div>

                    <!-- Body List (DPP & Notes at TOP, NO SCROLLBAR) -->
                    <div style="flex: 1; overflow-y: auto; margin: 0.85rem 0; padding-right: 0; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; -ms-overflow-style: none;">
                        
                        <!-- 1. DPP & Assignment Files (TOP ITEM) -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; transition: border-color 0.2s;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-dpps-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.98rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-tasks" style="color: #10b981;"></i> DPP & Assignment Files
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Daily practice problems and lecture assignment attachments</div>
                                    </div>
                                </label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span id="export-cat-dpps-size" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                        ${formatBytes(dppsData.totalSize)}
                                    </span>
                                    <button id="toggle-dpps-subject-btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #e2e8f0; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Show Subject Wise PDFs">
                                        <i class="fas fa-chevron-down" id="dpps-chevron-icon" style="transition: transform 0.2s ease;"></i>
                                    </button>
                                </div>
                            </div>
                            <!-- Subject Breakdown Container -->
                            <div id="dpps-subject-container" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.1); flex-direction: column; gap: 8px;">
                                ${dppSubjectRowsHtml}
                            </div>
                        </div>

                        <!-- 2. Lecture Notes PDFs (TOP ITEM) -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; transition: border-color 0.2s;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-notes-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.98rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-book-open" style="color: #3b82f6;"></i> Lecture Notes PDFs
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Downloaded and attached lecture PDF notes</div>
                                    </div>
                                </label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span id="export-cat-notes-size" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                        ${formatBytes(notesData.totalSize)}
                                    </span>
                                    <button id="toggle-notes-subject-btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #e2e8f0; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Show Subject Wise PDFs">
                                        <i class="fas fa-chevron-down" id="notes-chevron-icon" style="transition: transform 0.2s ease;"></i>
                                    </button>
                                </div>
                            </div>
                            <!-- Subject Breakdown Container -->
                            <div id="notes-subject-container" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.1); flex-direction: column; gap: 8px;">
                                ${notesSubjectRowsHtml}
                            </div>
                        </div>

                        <!-- 3. Course Structure & Metadata -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-courses-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-layer-group" style="color: #a855f7;"></i> Course Structure & Metadata
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Courses, chapters, lecture hierarchy, and thumbnails</div>
                                    </div>
                                </label>
                                <span style="background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.courses)}
                                </span>
                            </div>
                        </div>

                        <!-- 4. Doubts & Discussion Data -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-doubts-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-question-circle" style="color: #f59e0b;"></i> Doubts & Discussion Data
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Saved doubts, comments, and query entries</div>
                                    </div>
                                </label>
                                <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.doubts)}
                                </span>
                            </div>
                        </div>

                        <!-- 5. Study History & Logs -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-history-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-history" style="color: #ec4899;"></i> Study History & Logs
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Watch history, completion logs, and progress metrics</div>
                                    </div>
                                </label>
                                <span style="background: rgba(236, 72, 153, 0.15); color: #ec4899; border: 1px solid rgba(236, 72, 153, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.history)}
                                </span>
                            </div>
                        </div>

                        <!-- 6. App Settings & Preferences -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-settings-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-cog" style="color: #64748b;"></i> App Settings & LocalStorage
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">LocalStorage options, theme settings, and faculty info</div>
                                    </div>
                                </label>
                                <span style="background: rgba(100, 116, 139, 0.15); color: #cbd5e1; border: 1px solid rgba(100, 116, 139, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.settings)}
                                </span>
                            </div>
                        </div>

                    </div>

                    <!-- Footer -->
                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 1rem; gap: 16px; flex-wrap: wrap;">
                        <div>
                            <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 500;">Total Backup Size</div>
                            <div id="export-total-size-display" style="font-size: 1.15rem; font-weight: 700; color: #3b82f6;">0 MB</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button id="export-cancel-btn" class="secondary-btn" style="padding: 10px 18px; border-radius: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">Cancel</button>
                            <button id="export-confirm-btn" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 10px 22px; border-radius: 12px; font-weight: 600; font-size: 0.92rem; border: 1px solid rgba(255, 255, 255, 0.2); cursor: pointer; box-shadow: 0 4px 18px rgba(37, 99, 235, 0.45); display: inline-flex; align-items: center; justify-content: center; gap: 10px; white-space: nowrap; word-break: keep-all; flex-shrink: 0; line-height: 1.2; transition: all 0.2s ease;">
                                <i class="fas fa-file-export" style="font-size: 0.95rem;"></i>
                                <span>Export Selected</span>
                                <span id="export-btn-size-span" style="background: rgba(255, 255, 255, 0.22); backdrop-filter: blur(4px); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.3); display: inline-flex; align-items: center; margin-left: 2px;">0 MB</span>
                            </button>
                        </div>
                    </div>

                </div>
            `;

            document.body.appendChild(modal);

            // Element references
            const catDppsCb = modal.querySelector('#export-cat-dpps-cb');
            const catNotesCb = modal.querySelector('#export-cat-notes-cb');
            const catCoursesCb = modal.querySelector('#export-cat-courses-cb');
            const catDoubtsCb = modal.querySelector('#export-cat-doubts-cb');
            const catHistoryCb = modal.querySelector('#export-cat-history-cb');
            const catSettingsCb = modal.querySelector('#export-cat-settings-cb');

            const dppSubjCbs = modal.querySelectorAll('.export-dpp-subj-cb');
            const notesSubjCbs = modal.querySelectorAll('.export-notes-subj-cb');

            const toggleDppsBtn = modal.querySelector('#toggle-dpps-subject-btn');
            const toggleNotesBtn = modal.querySelector('#toggle-notes-subject-btn');
            const dppsSubjContainer = modal.querySelector('#dpps-subject-container');
            const notesSubjContainer = modal.querySelector('#notes-subject-container');
            const dppsChevronIcon = modal.querySelector('#dpps-chevron-icon');
            const notesChevronIcon = modal.querySelector('#notes-chevron-icon');

            const totalSizeDisplay = modal.querySelector('#export-total-size-display');
            const btnSizeSpan = modal.querySelector('#export-btn-size-span');
            const confirmBtn = modal.querySelector('#export-confirm-btn');
            const cancelBtn = modal.querySelector('#export-cancel-btn');
            const closeBtn = modal.querySelector('#close-export-modal-btn');

            // Accordion toggle handlers
            if (toggleDppsBtn && dppsSubjContainer) {
                toggleDppsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isHidden = dppsSubjContainer.style.display === 'none';
                    dppsSubjContainer.style.display = isHidden ? 'flex' : 'none';
                    if (dppsChevronIcon) dppsChevronIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            }

            if (toggleNotesBtn && notesSubjContainer) {
                toggleNotesBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isHidden = notesSubjContainer.style.display === 'none';
                    notesSubjContainer.style.display = isHidden ? 'flex' : 'none';
                    if (notesChevronIcon) notesChevronIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            }

            // Recalculate size function
            const updateSelectionSizes = () => {
                let bytes = 0;

                if (catCoursesCb && catCoursesCb.checked) bytes += categorySizes.courses;
                if (catDoubtsCb && catDoubtsCb.checked) bytes += categorySizes.doubts;
                if (catHistoryCb && catHistoryCb.checked) bytes += categorySizes.history;
                if (catSettingsCb && catSettingsCb.checked) bytes += categorySizes.settings;

                // Sum DPPs selected subject sizes
                dppSubjCbs.forEach(cb => {
                    if (cb.checked) {
                        const cId = cb.dataset.courseId;
                        const subj = dppsData.subjects.find(s => String(s.courseId) === String(cId));
                        if (subj) bytes += subj.size;
                    }
                });

                // Sum Notes selected subject sizes
                notesSubjCbs.forEach(cb => {
                    if (cb.checked) {
                        const cId = cb.dataset.courseId;
                        const subj = notesData.subjects.find(s => String(s.courseId) === String(cId));
                        if (subj) bytes += subj.size;
                    }
                });

                const formatted = formatBytes(bytes);
                if (totalSizeDisplay) totalSizeDisplay.textContent = formatted;
                if (btnSizeSpan) btnSizeSpan.textContent = formatted;
                if (confirmBtn) confirmBtn.disabled = (bytes === 0 && !catCoursesCb?.checked && !catSettingsCb?.checked && !catDoubtsCb?.checked && !catHistoryCb?.checked);
            };

            // Master checkbox listeners
            if (catDppsCb) {
                catDppsCb.addEventListener('change', () => {
                    dppSubjCbs.forEach(cb => cb.checked = catDppsCb.checked);
                    updateSelectionSizes();
                });
            }

            if (catNotesCb) {
                catNotesCb.addEventListener('change', () => {
                    notesSubjCbs.forEach(cb => cb.checked = catNotesCb.checked);
                    updateSelectionSizes();
                });
            }

            // Subject checkbox listeners
            dppSubjCbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    const checkedCount = Array.from(dppSubjCbs).filter(c => c.checked).length;
                    if (catDppsCb) catDppsCb.checked = (checkedCount > 0);
                    updateSelectionSizes();
                });
            });

            notesSubjCbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    const checkedCount = Array.from(notesSubjCbs).filter(c => c.checked).length;
                    if (catNotesCb) catNotesCb.checked = (checkedCount > 0);
                    updateSelectionSizes();
                });
            });

            [catCoursesCb, catDoubtsCb, catHistoryCb, catSettingsCb].forEach(cb => {
                cb?.addEventListener('change', updateSelectionSizes);
            });

            // Initial calculation
            updateSelectionSizes();

            const closeModal = () => modal.remove();

            closeBtn?.addEventListener('click', closeModal);
            cancelBtn?.addEventListener('click', closeModal);

            confirmBtn?.addEventListener('click', async () => {
                const selectedDppSubjectIds = new Set(Array.from(dppSubjCbs).filter(cb => cb.checked).map(cb => String(cb.dataset.courseId)));
                const selectedNotesSubjectIds = new Set(Array.from(notesSubjCbs).filter(cb => cb.checked).map(cb => String(cb.dataset.courseId)));

                const options = {
                    exportCourses: catCoursesCb ? catCoursesCb.checked : true,
                    exportDoubts: catDoubtsCb ? catDoubtsCb.checked : true,
                    exportHistory: catHistoryCb ? catHistoryCb.checked : true,
                    exportSettings: catSettingsCb ? catSettingsCb.checked : true,
                    exportDppPdf: catDppsCb ? catDppsCb.checked : true,
                    selectedDppSubjectIds,
                    exportNotesPdf: catNotesCb ? catNotesCb.checked : true,
                    selectedNotesSubjectIds
                };

                await executeSelectiveExport(analysis, options);
            });
        }

        async function executeSelectiveExport(analysis, options) {
            const confirmBtn = document.getElementById('export-confirm-btn');
            if (confirmBtn) {
                confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating Zip...`;
                confirmBtn.disabled = true;
            }

            try {
                const zip = new JSZip();
                const { raw } = analysis;

                // 1. Courses
                const serializableCourses = [];
                if (options.exportCourses) {
                    for (const course of raw.courses) {
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
                                });
                                return cleanC;
                            });
                        }
                        if (course.handle) cleanCourse.folderName = course.handle.name;

                        if (cleanCourse.subCourseData) {
                            const newSubData = {};
                            let subIdx = 0;
                            for (const sub in cleanCourse.subCourseData) {
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
                }

                // 2. Progress & Lecture Notes / Lecture Assignments
                const serializableProgress = [];
                for (const progress of raw.allProgress) {
                    const cleanProgress = { ...progress };
                    const progCourseId = String(progress.courseId || 'other');

                    if (progress.pdfHandle) {
                        if (options.exportNotesPdf && options.selectedNotesSubjectIds.has(progCourseId)) {
                            const pdfFilename = `pdf_${progress.id}.pdf`;
                            zip.folder('pdfs').file(pdfFilename, progress.pdfHandle);
                            cleanProgress.pdfFilename = pdfFilename;
                        }
                        delete cleanProgress.pdfHandle;
                    }

                    if (progress.assignmentHandle) {
                        if (options.exportDppPdf && options.selectedDppSubjectIds.has(progCourseId)) {
                            const assignFilename = `assign_${progress.id}_${progress.assignmentName || 'file'}`;
                            zip.folder('assignments').file(assignFilename, progress.assignmentHandle);
                            cleanProgress.assignmentFilename = assignFilename;
                        }
                        delete cleanProgress.assignmentHandle;
                    }

                    serializableProgress.push(cleanProgress);
                }

                // 3. DPPs
                const serializableDpps = [];
                for (const dpp of raw.allDpps) {
                    const cleanDpp = { ...dpp };
                    const dppCourseId = String(dpp.courseId || 'other');

                    if (dpp.fileHandle) {
                        if (options.exportDppPdf && options.selectedDppSubjectIds.has(dppCourseId)) {
                            const dppFilename = `dpp_${dpp.id}_${dpp.fileName || 'file'}`;
                            zip.folder('dpps').file(dppFilename, dpp.fileHandle);
                            cleanDpp.dppFilename = dppFilename;
                        }
                        delete cleanDpp.fileHandle;
                    }
                    serializableDpps.push(cleanDpp);
                }

                // 4. Doubts
                const allDoubts = options.exportDoubts ? raw.allDoubts : [];

                // 5. History
                const serializableHistory = [];
                if (options.exportHistory && Array.isArray(raw.allHistory)) {
                    let histIdx = 0;
                    for (const hist of raw.allHistory) {
                        const cleanHist = { ...hist };
                        if (hist.thumbnail && typeof hist.thumbnail === 'string' && hist.thumbnail.startsWith('data:')) {
                            try {
                                const histThumbBlob = base64ToBlob(hist.thumbnail);
                                const histThumbFilename = `hist_${hist.id || histIdx}_${histIdx}.png`;
                                zip.folder('history_thumbnails').file(histThumbFilename, histThumbBlob);
                                cleanHist.thumbnailFilename = histThumbFilename;
                                delete cleanHist.thumbnail;
                            } catch (e) {}
                        }
                        histIdx++;
                        serializableHistory.push(cleanHist);
                    }
                }

                // 6. Settings / LocalStorage
                let localStoreData = {};
                if (options.exportSettings) {
                    localStoreData = { ...raw.localStoreData };
                    const facultyMetaRaw = localStoreData['courseflix_faculty_meta'];
                    if (facultyMetaRaw) {
                        try {
                            const facultyMeta = JSON.parse(facultyMetaRaw);
                            for (const [facultyName, meta] of Object.entries(facultyMeta)) {
                                if (meta.photo && typeof meta.photo === 'string' && meta.photo.startsWith('data:')) {
                                    try {
                                        const photoBlob = base64ToBlob(meta.photo);
                                        const sanitizedName = facultyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                        const photoFilename = `faculty_${sanitizedName}.png`;
                                        zip.folder('faculty_faces').file(photoFilename, photoBlob);
                                        meta.photoFilename = photoFilename;
                                        delete meta.photo;
                                    } catch (e) {}
                                }
                            }
                            localStoreData['courseflix_faculty_meta'] = JSON.stringify(facultyMeta);
                        } catch (e) {}
                    }
                }

                // 7. ProgressAppDB assignmentFiles
                const progressFiles = [];
                if (options.exportDppPdf && raw.progressFiles && raw.progressFiles.length > 0) {
                    for (const pf of raw.progressFiles) {
                        zip.folder('progress_assignments').file(pf.filename, pf.file);
                        progressFiles.push({ id: pf.id, filename: pf.filename });
                    }
                }

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

                showToast("Backup exported successfully!");
                document.getElementById('export-backup-modal')?.remove();
                document.getElementById('modal-overlay')?.classList.add('hidden');
            } catch (err) {
                console.error("Selective export failed:", err);
                showToast("Export failed. Check the console for errors.", true);
            } finally {
                if (confirmBtn) {
                    const currentSize = document.getElementById('export-total-size-display')?.textContent || '0 MB';
                    confirmBtn.innerHTML = `<i class="fas fa-file-export" style="font-size: 0.95rem;"></i><span>Export Selected</span><span id="export-btn-size-span" style="background: rgba(255, 255, 255, 0.22); backdrop-filter: blur(4px); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.3); display: inline-flex; align-items: center; margin-left: 2px;">${currentSize}</span>`;
                    confirmBtn.disabled = false;
                }
            }
        }

        async function triggerExportBackup(btn) {
            const exportBtnEl = btn || document.getElementById('export-btn');
            if (typeof courses === 'undefined' || !courses || courses.length === 0) {
                return showToast("There are no courses to export.", true);
            }
            if (exportBtnEl) {
                exportBtnEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing...`;
                exportBtnEl.disabled = true;
            }

            try {
                const analysis = await analyzeExportData();
                openExportBackupModal(analysis);
            } catch (err) {
                console.error("Export analysis failed:", err);
                showToast("Error preparing export options.", true);
            } finally {
                if (exportBtnEl) {
                    exportBtnEl.innerHTML = `<i class="fas fa-file-export"></i> Export Backup`;
                    exportBtnEl.disabled = false;
                }
            }
        }
        window.triggerExportBackup = triggerExportBackup;
        window.analyzeExportData = analyzeExportData;
        window.openExportBackupModal = openExportBackupModal;

        // Global Event Delegation for #export-btn
        document.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('#export-btn');
            if (targetBtn) {
                e.preventDefault();
                e.stopPropagation();
                triggerExportBackup(targetBtn);
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
                    // Restore Faculty Faces
                    try {
                        const facultyMetaStr = backupData.localStorage['courseflix_faculty_meta'];
                        if (facultyMetaStr) {
                            const facultyMeta = JSON.parse(facultyMetaStr);
                            let needsUpdate = false;
                            for (const [facultyName, meta] of Object.entries(facultyMeta)) {
                                if (meta.photoFilename) {
                                    const photoFile = zip.file(`faculty_faces/${meta.photoFilename}`);
                                    if (photoFile) {
                                        meta.photo = await blobToDataURL(await photoFile.async('blob'));
                                        delete meta.photoFilename;
                                        needsUpdate = true;
                                    }
                                }
                            }
                            if (needsUpdate) {
                                localStorage.setItem('courseflix_faculty_meta', JSON.stringify(facultyMeta));
                            }
                        }
                    } catch (e) {
                        console.error("Error restoring faculty faces", e);
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
        videoWrapper.addEventListener('dblclick', (e) => { if (e.target.closest('.video-controls-container') || e.target.closest('#media-viewer')) return; clearTimeout(clickTimer); clickTimer = null; const r=videoWrapper.getBoundingClientRect(),c=e.clientX-r.left;if(c<r.width/2){videoPlayer.currentTime-=10;showSeekIcon(leftSeekOverlay)}else{videoPlayer.currentTime+=10;showSeekIcon(rightSeekOverlay);if(window.triggerSmartSkipCheck) window.triggerSmartSkipCheck();}});
        videoWrapper.addEventListener('wheel', (e) => {
            if (e.target.closest('.video-controls-container') || e.target.closest('#media-viewer')) return;
            e.preventDefault();
            if (e.deltaY < 0) {
                videoPlayer.currentTime += 10;
                showSeekIcon(rightSeekOverlay);
                if(window.triggerSmartSkipCheck) window.triggerSmartSkipCheck();
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
            if (!window.isBookmarkCyclingSession) {
                window.savedTimelinePosition = currentTime;
            }
            document.getElementById('current-time').textContent = formatTime(currentTime); 
            if (!isNaN(videoPlayer.duration)) { 
                updateTimeDisplay();
                timeline.value = currentTime; 
                const p = (currentTime / videoPlayer.duration) * 100; 
                timeline.style.background = `linear-gradient(to right, var(--accent-primary) ${p}%, rgba(255, 255, 255, 0.3) ${p}%)`;
                
                const skipBtn = document.getElementById('skip-intro-btn');
                if (currentTime <= 25 && videoPlayer.duration > 25) {
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
        timeline.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            videoPlayer.currentTime = val;
            if (!window.isBookmarkCyclingSession) {
                window.savedTimelinePosition = val;
            }
        });
        timeline.addEventListener('change', () => {
            if (!window.isBookmarkCyclingSession) {
                window.savedTimelinePosition = videoPlayer.currentTime;
            }
            timeline.blur();
        });
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
                const folderDisplayName = currentSubfolder ? getSubfolderDisplayName(currentCourse, currentSubfolder) : (currentCourse ? currentCourse.title : 'DPP');
                let num = 1;
                if (currentCourse && currentCourse.lectures) {
                    let lectures = currentCourse.lectures;
                    if (currentSubfolder) lectures = currentCourse.lectures.filter(l => l.chapter === currentSubfolder || (l.chapter && l.chapter.startsWith(currentSubfolder + '/')));
                    const idx = lectures.findIndex(l => String(l.id) === String(lectureId));
                    if (idx !== -1) num = idx + 1;
                }
                const autoName = `${folderDisplayName} ${num}`;

                await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: autoName, assignmentType: file.type, courseId: currentCourse.id, lectureId: lectureId });
                
                const dpp = {
                    courseId: currentCourse.id,
                    lectureId: lectureId,
                    folderName: currentSubfolder || '',
                    fileName: autoName,
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

            if (e.key === 'Escape' && view.id === 'player-view') {
                const mediaViewer = document.getElementById('media-viewer');
                const playerNotesSidebar = document.getElementById('player-notes-sidebar');
                if (mediaViewer && !mediaViewer.classList.contains('hidden')) {
                    hideMediaViewer();
                    return;
                }
                if (playerNotesSidebar && playerView.classList.contains('notes-active')) {
                    playerView.classList.remove('notes-active');
                    playerNotesSidebar.classList.add('hidden');
                    return;
                }
            }
            
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
                    if (e.shiftKey) {
                        e.preventDefault();
                        if (view.id === 'player-view') window.togglePlayerNotesPanel();
                    } else {
                        if (view.id === 'player-view' && currentLectureLi) {
                            const nextLi = getNextLectureLi(currentLectureLi);
                            if (nextLi) playVideo(nextLi);
                            else showToast('No next lecture available.');
                        }
                    }
                    break;
                case 'd':
                    if (e.shiftKey) {
                        e.preventDefault();
                        if (view.id === 'player-view') window.togglePlayerDppPanel();
                    }
                    break;
                case 'p': 
                    if (view.id === 'player-view') {
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            jumpToPresentTimeline();
                        } else if (currentLectureLi) {
                            const prevLi = getPreviousLectureLi(currentLectureLi);
                            if (prevLi) playVideo(prevLi);
                            else showToast('No previous lecture available.');
                        }
                    }
                    break;
                case 'z':
                    if (view.id === 'player-view') {
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            cycleBookmarks();
                        } else {
                            addBookmark();
                        }
                    }
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
                case 'ArrowRight': 
                    if (view.id === 'player-view') { 
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            videoPlayer.currentTime += 30;
                            showToast('+30s Forward');
                            if(window.triggerSmartSkipCheck) window.triggerSmartSkipCheck();
                        } else if (e.shiftKey) {
                            window.cycleOrOpenRightSidePanel();
                        } else {
                            videoPlayer.currentTime += 10; 
                            if(window.triggerSmartSkipCheck) window.triggerSmartSkipCheck(); 
                        }
                    } 
                    break;
                case 'ArrowLeft': 
                    if (view.id === 'player-view') {
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            videoPlayer.currentTime -= 30;
                            showToast('-30s Rewind');
                        } else if (e.shiftKey) {
                            window.cycleOrOpenRightSidePanel();
                        } else {
                            videoPlayer.currentTime -= 10; 
                        }
                    } 
                    break; 
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
            document.body.classList.add('is-resizing');
            document.body.style.cursor = 'ew-resize'; 
            playerView.style.userSelect = 'none'; 
            mediaViewer.style.pointerEvents = 'none';
            document.getElementById('video-wrapper').style.pointerEvents = 'none';
        });
        let resizeTicking = false;
        let lastClientX = 0;
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return; 
            e.preventDefault(); 
            lastClientX = e.clientX;
            if (!resizeTicking) {
                window.requestAnimationFrame(() => {
                    if (!isResizing) {
                        resizeTicking = false;
                        return;
                    }
                    const totalWidth = playerView.offsetWidth;
                    const menuWidth = lectureMenu.classList.contains('hidden') ? 0 : lectureMenu.offsetWidth;
                    let newViewerWidth = totalWidth - lastClientX;
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
                document.body.classList.remove('is-resizing');
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

        window.savedTimelinePosition = null;
        window.isBookmarkCyclingSession = false;

        function cycleBookmarks() {
            if (!currentCourse || !currentLectureLi || !videoPlayer) return;
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);
            const bookmarks = progress.bookmarks || [];

            if (bookmarks.length === 0) {
                return showToast('No bookmarks saved for this lecture.');
            }

            const curr = videoPlayer.currentTime;

            // Before starting a bookmark cycling sequence, anchor current video position as saved timeline
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

        function jumpToPresentTimeline() {
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

        async function purgeEmptyDppAndNotesEngine() {
            try {
                await ensureDB();

                // 1. Purge DPP_STORE entries that have no fileHandle, empty fileHandle, or non-existent courseId
                const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
                const dppIdsToDelete = [];

                for (const dpp of allDpps) {
                    if (!dpp) continue;
                    let isInvalid = false;

                    if (!dpp.fileHandle) {
                        isInvalid = true;
                    } else if (dpp.fileHandle instanceof Blob || dpp.fileHandle instanceof File) {
                        if (dpp.fileHandle.size === 0) isInvalid = true;
                    } else if (typeof dpp.fileHandle === 'string' && dpp.fileHandle.trim() === '') {
                        isInvalid = true;
                    }

                    if (!isInvalid && typeof courses !== 'undefined' && Array.isArray(courses) && courses.length > 0) {
                        const courseExists = courses.some(c => String(c.id) === String(dpp.courseId));
                        if (!courseExists) isInvalid = true;
                    }

                    if (isInvalid && dpp.id) {
                        dppIdsToDelete.push(dpp.id);
                    }
                }

                if (dppIdsToDelete.length > 0) {
                    for (const delId of dppIdsToDelete) {
                        await new Promise(r => getStore(DPP_STORE, 'readwrite').delete(delId).onsuccess = r);
                    }
                }

                // 2. Clean invalid pdfHandle/assignmentHandle entries in PROGRESS_STORE
                const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
                for (const prog of allProgress) {
                    if (!prog) continue;
                    let modified = false;

                    if (prog.pdfHandle) {
                        if ((prog.pdfHandle instanceof Blob || prog.pdfHandle instanceof File) && prog.pdfHandle.size === 0) {
                            delete prog.pdfHandle;
                            delete prog.pdfFilename;
                            modified = true;
                        }
                    }

                    if (prog.assignmentHandle) {
                        if ((prog.assignmentHandle instanceof Blob || prog.assignmentHandle instanceof File) && prog.assignmentHandle.size === 0) {
                            delete prog.assignmentHandle;
                            delete prog.assignmentName;
                            modified = true;
                        }
                    }

                    if (modified && typeof saveLectureProgress === 'function') {
                        await saveLectureProgress(prog);
                    }
                }
            } catch (e) {
                console.error("Error in purgeEmptyDppAndNotesEngine:", e);
            }
        }
        window.purgeEmptyDppAndNotesEngine = purgeEmptyDppAndNotesEngine;

        async function scanDirectoryHandleForPdfs(dirHandle, course, basePath, allDpps) {
            const cIdStr = String(course.id);
            async function recurse(currentHandle, path) {
                const folderName = path || '';
                const entries = [];
                try {
                    for await (const entry of currentHandle.values()) {
                        entries.push(entry);
                    }
                } catch(e) { return; }

                for (const entry of entries) {
                    if (entry.kind === 'file' && /\.pdf$/i.test(entry.name)) {
                        try {
                            const file = await entry.getFile();
                            const fileNameNoExt = entry.name.replace(/\.[^/.]+$/, "");

                            const existing = allDpps.find(d => 
                                String(d.courseId) === cIdStr && 
                                (d.fileName === fileNameNoExt || d.fileName === entry.name) &&
                                (d.folderName || '') === folderName
                            );

                            if (!existing) {
                                const newDpp = {
                                    courseId: course.id,
                                    folderName: folderName,
                                    fileName: fileNameNoExt,
                                    fileHandle: file,
                                    completed: false,
                                    starred: false,
                                    status: null
                                };
                                await new Promise(r => getStore(DPP_STORE, 'readwrite').add(newDpp).onsuccess = r);
                                allDpps.push(newDpp);
                            }
                        } catch(e) {
                            console.error(`Error reading pdf file ${entry.name}:`, e);
                        }
                    } else if (entry.kind === 'directory') {
                        await recurse(entry, path ? `${path}/${entry.name}` : entry.name);
                    }
                }
            }
            await recurse(dirHandle, basePath);
        }

        async function scanAllCoursesForDppsAndNotes() {
            await ensureDB();
            if (typeof courses === 'undefined' || !Array.isArray(courses)) return;
            let allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));

            for (const course of courses) {
                if (!course) continue;
                if (course.isLinked && course.handle) {
                    try {
                        await scanDirectoryHandleForPdfs(course.handle, course, '', allDpps);
                    } catch(err) {
                        console.warn(`Could not scan directory handle for course ${course.title}:`, err);
                    }
                }
            }
        }

        function isSameFolder(f1, f2) {
            if (!f1 && !f2) return true;
            if (!f1 || !f2) return false;
            const s1 = f1.trim().toLowerCase();
            const s2 = f2.trim().toLowerCase();
            if (s1 === s2) return true;
            return s1.split('/').pop() === s2.split('/').pop();
        }

        // --- DPP Functions ---
        async function syncDppsFromProgress() {
            await ensureDB();
            await purgeEmptyDppAndNotesEngine();
            let allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));

            // Clean up duplicate entries in DPP_STORE
            const seenDppKeys = new Set();
            const duplicateIdsToDelete = [];

            for (const dpp of allDpps) {
                const key = `${dpp.courseId}_${dpp.folderName || ''}_${dpp.lectureId || dpp.fileName}`;
                if (seenDppKeys.has(key)) {
                    if (dpp.id) duplicateIdsToDelete.push(dpp.id);
                } else {
                    seenDppKeys.add(key);
                }
            }

            if (duplicateIdsToDelete.length > 0) {
                for (const delId of duplicateIdsToDelete) {
                    await new Promise(r => getStore(DPP_STORE, 'readwrite').delete(delId).onsuccess = r);
                }
                allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            }

            const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            let addedAny = false;

            for (const prog of allProgress) {
                if (prog.assignmentHandle) {
                    const course = courses.find(c => String(c.id) === String(prog.courseId));
                    let folder = '';
                    let num = 1;
                    if (course && course.lectures) {
                        const lec = course.lectures.find(l => String(l.id) === String(prog.lectureId) || l.name === prog.lectureId);
                        if (lec && lec.chapter) folder = lec.chapter;
                        let lectures = course.lectures;
                        if (folder) lectures = course.lectures.filter(l => l.chapter === folder || (l.chapter && l.chapter.startsWith(folder + '/')));
                        const idx = lectures.findIndex(l => String(l.id) === String(prog.lectureId) || l.name === prog.lectureId);
                        if (idx !== -1) num = idx + 1;
                    }
                    const folderLabel = (folder && folder !== 'Uncategorized' && folder !== '') ? folder.split('/').pop() : (course ? course.title : 'DPP');
                    const autoName = prog.assignmentName || `${folderLabel} ${num}`;

                    const existingIndex = allDpps.findIndex(d => 
                        String(d.courseId) === String(prog.courseId) && (
                            (d.lectureId && String(d.lectureId) === String(prog.lectureId)) ||
                            (isSameFolder(d.folderName, folder) && (
                                d.fileName === autoName || 
                                (prog.assignmentName && d.fileName === prog.assignmentName)
                            ))
                        )
                    );
                    if (existingIndex === -1) {
                        const dpp = { 
                            courseId: prog.courseId, 
                            lectureId: prog.lectureId,
                            folderName: folder, 
                            fileName: autoName, 
                            fileHandle: prog.assignmentHandle, 
                            completed: false, 
                            starred: false, 
                            status: null 
                        };
                        await new Promise(r => getStore(DPP_STORE, 'readwrite').add(dpp).onsuccess = r);
                        allDpps.push(dpp);
                        addedAny = true;
                    } else {
                        const existing = allDpps[existingIndex];
                        if (existing.fileName !== autoName || existing.folderName !== folder || !existing.fileHandle) {
                            existing.fileName = autoName;
                            existing.folderName = folder;
                            existing.fileHandle = prog.assignmentHandle;
                            await new Promise(r => getStore(DPP_STORE, 'readwrite').put(existing).onsuccess = r);
                        }
                    }

                    // Keep assignmentName updated in progress Data as well
                    if (prog.assignmentName !== autoName) {
                        prog.assignmentName = autoName;
                        await saveLectureProgress(prog);
                    }
                }
            }
            if (addedAny) {
                if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
            }
        }

        async function renderDppCourseSelectionView() {
            await ensureDB();
            await scanAllCoursesForDppsAndNotes();
            await purgeEmptyDppAndNotesEngine();
            await syncDppsFromProgress();
            nav.classList.remove('hidden');
            const dppCourseGrid = document.getElementById('dpp-course-grid');
            document.getElementById('dpp-detail-container').classList.add('hidden');
            dppCourseGrid.classList.remove('hidden');

            let allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));

            // Only filter DPPs that actually have a file attached
            const validDpps = allDpps.filter(dpp => dpp && (dpp.fileHandle || dpp.handle));

            const courseIdsWithDpps = [...new Set(validDpps.map(dpp => String(dpp.courseId)))];
            const coursesWithDpps = courses.filter(c => courseIdsWithDpps.includes(String(c.id)));

            dppCourseGrid.innerHTML = '';
            if (coursesWithDpps.length === 0) {
                dppCourseGrid.innerHTML = `<p id="no-content-message">No DPPs uploaded for any course yet. Go to the Upload tab to add some.</p>`;
                return;
            }

            coursesWithDpps.forEach(course => {
                const courseDpps = validDpps.filter(d => String(d.courseId) === String(course.id));
                if (courseDpps.length === 0) return;

                const card = document.createElement('div');
                card.className = 'course-card';
                card.dataset.courseId = course.id;

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

        function getDppDisplayName(dpp, folderName, courseTitle, fallbackIndex = 1) {
            if (!dpp) return '';
            const lastFolder = (folderName && folderName !== 'Uncategorized' && folderName !== '') 
                ? folderName.split('/').pop() 
                : (courseTitle || 'DPP');
            let name = (dpp.fileName || '').trim();

            const match = name.match(/(?:^|\s)(\d+)$/);
            const num = match ? match[1] : fallbackIndex;
            return `${lastFolder} ${num}`;
        }

        async function renderDppDetailView(courseId) {
            await ensureDB();
            await scanAllCoursesForDppsAndNotes();
            await syncDppsFromProgress();
            if (nav) nav.classList.remove('hidden');
            const course = courses.find(c => String(c.id) === String(courseId));
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
            const courseDpps = allDpps.filter(dpp => String(dpp.courseId) === String(courseId));

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
                groupedByFolder[folderName].sort((a,b) => naturalSort({name: a.fileName}, {name: b.fileName})).forEach((dpp, idx) => {
                    const displayName = getDppDisplayName(dpp, folderName, course.title, idx + 1);
                    const statusClass = dpp.status || '';
                    html += `
                        <div class="dpp-item" data-dpp-id="${dpp.id}">
                            <span class="dpp-item-title ${dpp.completed ? 'completed' : ''}">${displayName}</span>
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


        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        async function renderDppUploadView(courseId, targetFolderName = null) {
            await ensureDB();
            await syncDppsFromProgress();
            const course = courses.find(c => String(c.id) === String(courseId));
            if (!course) return;

            const view = document.getElementById('dpp-upload-view');
            view.dataset.courseId = courseId;

            document.getElementById('dpp-upload-course-title').textContent = course.title;
            const folderList = document.getElementById('dpp-folder-list');

            const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const courseDpps = allDpps.filter(dpp => String(dpp.courseId) === String(courseId));

            const dppCountMap = {};
            const foldersSet = new Set(course.dppFolders || []);
            
            if (course.lectures) {
                course.lectures.forEach(l => {
                    if (l.chapter) foldersSet.add(l.chapter);
                });
            }

            courseDpps.forEach(dpp => {
                const fn = dpp.folderName || '';
                if (fn) foldersSet.add(fn);
            });

            const allFoldersList = Array.from(foldersSet).sort((a, b) => naturalSort({name: a}, {name: b}));

            allFoldersList.forEach(folder => {
                const count = courseDpps.filter(d => isSameFolder(d.folderName, folder)).length;
                dppCountMap[folder] = count;
            });

            const rootCount = courseDpps.filter(d => !d.folderName).length;
            dppCountMap[''] = rootCount;

            const currentSelectedEl = folderList.querySelector('.dpp-folder-item.selected');
            let selectedFolder = targetFolderName !== null ? targetFolderName : (currentSelectedEl ? currentSelectedEl.dataset.folderName : '');

            if (targetFolderName === null && selectedFolder === '' && rootCount === 0) {
                const folderWithDpps = allFoldersList.find(f => (dppCountMap[f] || 0) > 0);
                if (folderWithDpps) {
                    selectedFolder = folderWithDpps;
                }
            }

            const rootBadge = rootCount > 0 
                ? `<span class="dpp-count-badge" style="background:#f59e0b; color:#000; font-size:0.75rem; font-weight:bold; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-left:auto;">${rootCount}</span>`
                : '';

            let folderHTML = `<div class="dpp-folder-item ${selectedFolder === '' ? 'selected' : ''}" data-folder-name="" style="display:flex; align-items:center;">
                <span><i class="fas fa-folder"></i> No Folder (Root)</span>
                ${rootBadge}
            </div>`;

            if (allFoldersList.length > 0) {
                folderHTML += allFoldersList.map(folder => {
                    const count = dppCountMap[folder] || 0;
                    const badge = count > 0 
                        ? `<span class="dpp-count-badge" style="background:#f59e0b; color:#000; font-size:0.75rem; font-weight:bold; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; margin-left:auto; margin-right:8px;">${count}</span>`
                        : '';
                    const isManual = (course.dppFolders || []).includes(folder);
                    const deleteBtn = isManual ? `<button class="file-btn delete-dpp-folder-btn" title="Delete folder" data-folder-name="${folder}" style="margin-left: ${count > 0 ? '0' : 'auto'};"><i class="fas fa-trash"></i></button>` : '';
                    
                    return `
                        <div class="dpp-folder-item ${isSameFolder(selectedFolder, folder) ? 'selected' : ''}" data-folder-name="${folder}" style="display:flex; align-items:center;">
                            <span><i class="fas fa-folder"></i> ${folder}</span>
                            ${badge}
                            ${deleteBtn}
                        </div>
                    `;
                }).join('');
            }
            folderList.innerHTML = folderHTML;

            renderDppUploadFilesList(courseId, selectedFolder, courseDpps);

            folderList.querySelectorAll('.dpp-folder-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.delete-dpp-folder-btn')) return;
                    folderList.querySelectorAll('.dpp-folder-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    const folderName = item.dataset.folderName;
                    renderDppUploadFilesList(courseId, folderName, courseDpps);
                });
            });
        }

        function renderDppUploadFilesList(courseId, folderName, courseDpps) {
            const titleEl = document.getElementById('dpp-upload-current-folder-title');
            const filesListEl = document.getElementById('dpp-upload-files-list');
            if (!titleEl || !filesListEl) return;

            const course = courses.find(c => String(c.id) === String(courseId));
            const folderDisplay = folderName ? folderName : 'No Folder (Root)';
            const folderFiles = courseDpps.filter(d => (d.folderName || '') === folderName || isSameFolder(d.folderName, folderName));
            
            titleEl.innerHTML = `<i class="fas fa-folder-open" style="color:var(--accent-primary); margin-right:8px;"></i> ${folderDisplay} <span style="font-size:0.85rem; color:var(--text-secondary); font-weight:normal; margin-left:8px;">(${folderFiles.length} DPP${folderFiles.length === 1 ? '' : 's'})</span>`;

            if (folderFiles.length === 0) {
                filesListEl.innerHTML = `<p style="color:var(--text-secondary); font-size:0.9rem; text-align:center; padding:1.5rem;">No DPPs in this folder yet. Drag & drop files above or click browse to upload.</p>`;
                return;
            }

            folderFiles.sort((a,b) => naturalSort({name: a.fileName}, {name: b.fileName}));

            let html = '';
            folderFiles.forEach((dpp, idx) => {
                const displayName = getDppDisplayName(dpp, folderName, course ? course.title : '', idx + 1);
                html += `
                    <div class="dpp-upload-item" data-dpp-id="${dpp.id}" style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-secondary, #1e293b); border:1px solid var(--border-primary, #334155); padding:14px 20px; border-radius:12px; margin-bottom:12px; cursor:pointer; transition:all 0.2s ease; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <div class="dpp-card-main" style="display:flex; align-items:center; gap:14px; flex:1;">
                            <div style="width:40px; height:40px; border-radius:10px; background:rgba(239, 68, 68, 0.15); display:flex; align-items:center; justify-content:center; color:#ef4444; flex-shrink:0;">
                                <i class="fas fa-file-pdf" style="font-size:1.25rem;"></i>
                            </div>
                            <div>
                                <span style="font-weight:600; font-size:1rem; color:var(--text-primary, #f8fafc); display:block;">${displayName}</span>
                                <span style="font-size:0.75rem; color:var(--text-secondary, #94a3b8);">PDF Document</span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:12px; flex-shrink:0;">
                            <button class="view-dpp-file-btn" data-dpp-id="${dpp.id}" title="View DPP" style="display:inline-flex; align-items:center; gap:6px; background:rgba(59, 130, 246, 0.15); color:#60a5fa; border:1px solid rgba(59, 130, 246, 0.3); padding:8px 16px; border-radius:8px; font-weight:600; font-size:0.85rem; cursor:pointer; transition:background 0.2s;">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="delete-dpp-file-btn" data-dpp-id="${dpp.id}" title="Delete DPP" style="display:inline-flex; align-items:center; gap:6px; background:rgba(239, 68, 68, 0.15); color:#f87171; border:1px solid rgba(239, 68, 68, 0.3); padding:8px 16px; border-radius:8px; font-weight:600; font-size:0.85rem; cursor:pointer; transition:background 0.2s;">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>
                        </div>
                    </div>
                `;
            });
            filesListEl.innerHTML = html;

            const handleViewClick = async (dppId) => {
                const idStr = String(dppId);
                const dpp = folderFiles.find(d => String(d.id) === idStr);
                let fileHandle = dpp ? (dpp.fileHandle || dpp.handle) : null;
                if (!fileHandle && dpp && dpp.lectureId) {
                    const prog = getLectureProgress(courseId, dpp.lectureId);
                    if (prog && prog.assignmentHandle) fileHandle = prog.assignmentHandle;
                }

                if (fileHandle) {
                    try {
                        let file = (fileHandle && fileHandle.getFile && typeof fileHandle.getFile === 'function') ? await fileHandle.getFile() : fileHandle;
                        if (file) {
                            const fileUrl = URL.createObjectURL(file);
                            window.open(fileUrl, '_blank');
                        } else {
                            showToast("Unable to open file.", true);
                        }
                    } catch (err) {
                        console.error("View file error:", err);
                        showToast("Error opening file.", true);
                    }
                } else {
                    showToast("File preview not available.", true);
                }
            };

            filesListEl.querySelectorAll('.dpp-upload-item').forEach(card => {
                card.addEventListener('click', async (e) => {
                    if (e.target.closest('.delete-dpp-file-btn')) return;
                    await handleViewClick(card.dataset.dppId);
                });
            });

            filesListEl.querySelectorAll('.delete-dpp-file-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const idStr = String(btn.dataset.dppId);
                    const dpp = folderFiles.find(d => String(d.id) === idStr);
                    if (dpp && confirm(`Are you sure you want to permanently delete "${dpp.fileName}"? This cannot be undone.`)) {
                        // 1. Delete from DPP_STORE
                        if (dpp.id) {
                            await new Promise(r => getStore(DPP_STORE, 'readwrite').delete(dpp.id).onsuccess = r);
                        }
                        // 2. Delete from PROGRESS_STORE
                        const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
                        for (const prog of allProgress) {
                            if (prog.courseId === courseId && (String(prog.lectureId) === String(dpp.lectureId) || prog.assignmentName === dpp.fileName)) {
                                prog.assignmentHandle = null;
                                prog.assignmentName = null;
                                prog.assignmentType = null;
                                await saveLectureProgress(prog);
                            }
                        }
                        // 3. Delete from localStorage (courseflix_dpps & dppStatuses)
                        try {
                            let cfDpps = JSON.parse(localStorage.getItem('courseflix_dpps') || '[]');
                            cfDpps = cfDpps.filter(d => String(d.id) !== idStr && d.fileName !== dpp.fileName && d.name !== dpp.fileName);
                            localStorage.setItem('courseflix_dpps', JSON.stringify(cfDpps));

                            let dppStatuses = JSON.parse(localStorage.getItem('dppStatuses') || '{}');
                            delete dppStatuses['dpp_' + dpp.id];
                            localStorage.setItem('dppStatuses', JSON.stringify(dppStatuses));
                        } catch (err) {
                            console.warn("Error purging localStorage on delete:", err);
                        }

                        showToast(`Permanently deleted ${dpp.fileName}`);
                        if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
                        await renderDppUploadView(courseId, folderName);
                    }
                });
            });
        }

        async function processDppUploadFiles(files) {
            if (!files || files.length === 0) return;
            const courseId = parseInt(document.getElementById('dpp-upload-view').dataset.courseId);
            const course = courses.find(c => c.id === courseId);
            if (!courseId || !course) return;

            const selectedFolderEl = document.querySelector('#dpp-folder-list .dpp-folder-item.selected');
            const folderName = selectedFolderEl ? selectedFolderEl.dataset.folderName : '';

            const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const existingFolderDpps = allDpps.filter(d => d.courseId === courseId && (d.folderName || '') === folderName);

            const baseName = folderName ? folderName.split('/').pop() : course.title;

            let maxNum = 0;
            existingFolderDpps.forEach(dpp => {
                const match = dpp.fileName.match(new RegExp('(?:^|\\s)' + escapeRegExp(baseName) + '\\s+(\\d+)$', 'i')) || dpp.fileName.match(/(\d+)$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNum) maxNum = num;
                }
            });

            if (maxNum === 0 && existingFolderDpps.length > 0) {
                maxNum = existingFolderDpps.length;
            }

            const fileArray = Array.from(files);
            fileArray.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            const tx = db.transaction(DPP_STORE, 'readwrite');
            const store = tx.objectStore(DPP_STORE);
            let uploadedCount = 0;

            for (const file of fileArray) {
                maxNum++;
                const autoName = `${baseName} ${maxNum}`;
                const dpp = {
                    courseId: courseId,
                    folderName: folderName,
                    fileName: autoName,
                    fileHandle: file,
                    completed: false,
                    starred: false,
                    status: null
                };
                store.add(dpp);
                uploadedCount++;
            }
            await new Promise(r => tx.oncomplete = r);
            
            if (uploadedCount > 0) {
                showToast(`${uploadedCount} DPP(s) uploaded successfully!`);
                if (typeof syncCourseflixSubjects === 'function') syncCourseflixSubjects();
                await renderDppUploadView(courseId, folderName);
            }
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
            await renderDppUploadView(courseId, folderName);
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
            await renderDppUploadView(courseId, '');
        }

        // --- DPP & Upload Listeners ---
        document.getElementById('back-to-upload-from-dpp').addEventListener('click', () => switchView('upload-view'));
        document.getElementById('back-to-upload-grid').addEventListener('click', () => {
            const detailView = document.getElementById('upload-detail-view');
            const subfolder = detailView.dataset.uploadSubfolder;
            if (subfolder) {
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
        if (dppSidebarToggleBtn) {
            dppSidebarToggleBtn.addEventListener('click', () => {
                document.getElementById('dpp-sidebar').classList.toggle('hidden');
                dppSidebarToggleBtn.classList.toggle('collapsed');
            });
        }

        const dppUploadSidebarToggleBtn = document.getElementById('dpp-upload-sidebar-toggle-btn');
        if (dppUploadSidebarToggleBtn) {
            dppUploadSidebarToggleBtn.addEventListener('click', () => {
                document.getElementById('dpp-upload-sidebar').classList.toggle('hidden');
                dppUploadSidebarToggleBtn.classList.toggle('collapsed');
            });
        }

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

        if (addDppFolderBtn) addDppFolderBtn.addEventListener('click', handleAddDppFolder);
        if (newDppFolderNameInput) {
            newDppFolderNameInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDppFolder();
                }
            });
        }

        if (dppFolderList) {
            dppFolderList.addEventListener('click', e => {
                const deleteBtn = e.target.closest('.delete-dpp-folder-btn');
                if (deleteBtn) {
                    e.stopPropagation();
                    const courseId = parseInt(document.getElementById('dpp-upload-view').dataset.courseId);
                    const folderName = deleteBtn.dataset.folderName;
                    deleteDppFolder(courseId, folderName);
                }
            });
        }
        
        const dppDropZone = document.getElementById('dpp-upload-drop-zone');
        if (dppDropZone) {
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
                await processDppUploadFiles(files);
            });
        }

        const browseDppFilesBtn = document.getElementById('browse-dpp-files-btn');
        const dppFileInput = document.getElementById('dpp-file-input');
        if (browseDppFilesBtn && dppFileInput) {
            browseDppFilesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dppFileInput.click();
            });
            dppFileInput.addEventListener('change', async (e) => {
                const files = e.target.files;
                await processDppUploadFiles(files);
                dppFileInput.value = null;
            });
        }

        document.getElementById('dpp-list-container').addEventListener('click', async (e) => {
            const folderTitle = e.target.closest('.dpp-folder-title');
            if (folderTitle) {
                e.stopPropagation();
                folderTitle.parentElement.classList.toggle('open');
                return;
            }

            const dppItem = e.target.closest('.dpp-item');
            if (!dppItem) return;
            
            const rawId = dppItem.dataset.dppId;
            const dppId = parseInt(rawId);
            let dpp = await new Promise(r => getStore(DPP_STORE, 'readonly').get(dppId).onsuccess = e => r(e.target.result));
            if (!dpp && rawId) {
                dpp = await new Promise(r => getStore(DPP_STORE, 'readonly').get(rawId).onsuccess = e => r(e.target.result));
            }
            if (!dpp) {
                if (typeof showToast === 'function') showToast("DPP entry not found.", true);
                return;
            }

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
                    const dppHeader = document.getElementById('dpp-viewer-header');
                    if (dppHeader) dppHeader.classList.add('hidden');
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
                let fileHandle = dpp ? (dpp.fileHandle || dpp.handle) : null;
                if (!fileHandle && dpp && dpp.lectureId) {
                    const detailContainer = document.getElementById('dpp-detail-container');
                    const courseId = detailContainer ? parseInt(detailContainer.dataset.courseId) : dpp.courseId;
                    const prog = getLectureProgress(courseId, dpp.lectureId);
                    if (prog && prog.assignmentHandle) fileHandle = prog.assignmentHandle;
                }
                if (!fileHandle) {
                    if (typeof showToast === 'function') showToast("File for this DPP is not available.", true);
                    return;
                }
                await showMediaViewer(fileHandle, 'dpp', dpp.fileName, null);
            }
        });

        async function handleLectureFileDrop(files, type) {
            if (!files || files.length === 0) return;

            if (isSmartAddActive) {
                const fileList = Array.from(files);
                if (type === 'pdf') {
                    const nonPdf = fileList.filter(f => !f.name.toLowerCase().endsWith('.pdf'));
                    if (nonPdf.length > 0) {
                        showToast('Only PDF files are allowed for notes.', true);
                        return;
                    }
                }

                const lectureEls = Array.from(document.querySelectorAll('#upload-lecture-list .lecture-item'));
                if (lectureEls.length === 0) {
                    showToast('No lectures available in this section to assign files to.', true);
                    return;
                }

                const courseId = parseInt(document.getElementById('upload-detail-view').dataset.courseId);

                // Target remaining lectures without file of 'type' first, or fallback to all lectures
                let unassignedLectures = lectureEls.filter(el => {
                    const prog = getLectureProgress(courseId, el.dataset.lectureId);
                    return type === 'pdf' ? !prog.pdfHandle : !prog.assignmentHandle;
                });

                // If all lectures already have files of 'type', target all lectures in order
                let targetLectures = unassignedLectures.length > 0 ? unassignedLectures : lectureEls;

                // Sort files naturally / by number
                fileList.sort((a, b) => {
                    const numA = extractNumberFromText(a.name);
                    const numB = extractNumberFromText(b.name);
                    if (numA !== null && numB !== null) {
                        return numA - numB;
                    }
                    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                });

                const maxAssignable = targetLectures.length;
                const assignedFiles = fileList.slice(0, maxAssignable);
                const overflowFiles = fileList.slice(maxAssignable);

                const detailView = document.getElementById('upload-detail-view');
                const uploadSubfolder = detailView ? detailView.dataset.uploadSubfolder : '';
                const course = courses.find(c => c.id === courseId);
                const folderDisplayName = uploadSubfolder ? getSubfolderDisplayName(course, uploadSubfolder) : (course ? course.title : 'DPP');

                for (let i = 0; i < assignedFiles.length; i++) {
                    const file = assignedFiles[i];
                    const targetEl = targetLectures[i];
                    const lectureId = targetEl.dataset.lectureId;
                    const progressData = getLectureProgress(courseId, lectureId);

                    if (type === 'pdf') {
                        await saveLectureProgress({ ...progressData, pdfHandle: file, pdfName: file.name, courseId, lectureId });
                    } else if (type === 'assignment') {
                        const lectureIdx = lectureEls.indexOf(targetEl);
                        const num = lectureIdx !== -1 ? (lectureIdx + 1) : (i + 1);
                        const autoName = `${folderDisplayName} ${num}`;
                        await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: autoName, assignmentType: file.type, courseId, lectureId });
                    }

                    const updatedProgress = getLectureProgress(courseId, lectureId);
                    const displayName = targetEl.dataset.displayName || targetEl.querySelector('.lecture-item-title')?.textContent || 'Lecture';
                    targetEl.innerHTML = buildLectureItemHTML(displayName, updatedProgress, lectureId);
                }

                if (overflowFiles.length > 0) {
                    const overflowNames = overflowFiles.map(f => f.name).join(', ');
                    showToast(`No more lectures left! Failed to add ${overflowFiles.length} file(s): ${overflowNames}`, true);
                } else {
                    showToast(`Smart Add: Assigned ${assignedFiles.length} ${type === 'pdf' ? 'notes PDF(s)' : 'assignment file(s)'}!`);
                }
                return;
            }

            // --- MANUAL MODE (single file drop) ---
            const lectureEls = Array.from(document.querySelectorAll('#upload-lecture-list .lecture-item'));
            const selectedLectureEl = document.querySelector('#upload-lecture-list .lecture-item.selected');
            if (!selectedLectureEl) {
                showToast('Please select a lecture from the list first!', true);
                return;
            }
            if (files.length > 1) {
                showToast('Please drop only one file at a time or switch to Smart Add mode.', true);
                return;
            }
            
            const file = files[0];
            const courseId = parseInt(document.getElementById('upload-detail-view').dataset.courseId);
            const lectureId = selectedLectureEl.dataset.lectureId;
            const progressData = getLectureProgress(courseId, lectureId);

            const detailView = document.getElementById('upload-detail-view');
            const uploadSubfolder = detailView ? detailView.dataset.uploadSubfolder : '';
            const course = courses.find(c => c.id === courseId);
            const folderDisplayName = uploadSubfolder ? getSubfolderDisplayName(course, uploadSubfolder) : (course ? course.title : 'DPP');

            if (type === 'pdf') {
                if (!file.name.toLowerCase().endsWith('.pdf')) {
                    showToast('Only PDF files are allowed for notes.', true);
                    return;
                }
                await saveLectureProgress({ ...progressData, pdfHandle: file, pdfName: file.name, courseId, lectureId });
            } else if (type === 'assignment') {
                const selectedIdx = lectureEls.indexOf(selectedLectureEl);
                const num = selectedIdx !== -1 ? (selectedIdx + 1) : 1;
                const autoName = `${folderDisplayName} ${num}`;
                await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: autoName, assignmentType: file.type, courseId, lectureId });
            }

            showToast(`${type === 'pdf' ? 'Notes' : 'Assignment'} for "${selectedLectureEl.dataset.displayName || selectedLectureEl.textContent.trim()}" added successfully!`);
            
            const updatedProgress = getLectureProgress(courseId, lectureId);
            const displayName = selectedLectureEl.dataset.displayName || selectedLectureEl.querySelector('.lecture-item-title')?.textContent || selectedLectureEl.textContent.trim();
            selectedLectureEl.innerHTML = buildLectureItemHTML(displayName, updatedProgress, lectureId);
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
            await ensureDB();
            await scanAllCoursesForDppsAndNotes();
            await purgeEmptyDppAndNotesEngine();
            nav.classList.remove('hidden');
            const gridHeader = document.getElementById('notes-grid-header');
            if (gridHeader) gridHeader.style.display = 'flex';
            const notesCourseGrid = document.getElementById('notes-course-grid');

            document.getElementById('notes-detail-container').classList.add('hidden');
            notesCourseGrid.classList.remove('hidden');
            const intellBtn = document.getElementById('notes-intell-hub-btn');
            if (intellBtn) {
                intellBtn.style.display = 'inline-flex';
                if (!intellBtn.dataset.listenerAttached) {
                    intellBtn.dataset.listenerAttached = 'true';
                    intellBtn.addEventListener('click', () => switchView('intell-view'));
                }
            }

            const notesProgress = Object.values(courseProgress).filter(p => p && p.pdfHandle && (p.pdfHandle instanceof Blob ? p.pdfHandle.size > 0 : true));
            const courseIdsWithNotes = [...new Set(notesProgress.map(p => String(p.courseId)))];
            const coursesWithNotes = courses.filter(c => courseIdsWithNotes.includes(String(c.id)));

            notesCourseGrid.innerHTML = '';
            if (coursesWithNotes.length === 0) {
                notesCourseGrid.innerHTML = `<p id="no-content-message">No notes uploaded for any course yet. Go to the Upload tab to add some.</p>`;
                return;
            }

            coursesWithNotes.forEach(course => {
                const notesCount = notesProgress.filter(p => String(p.courseId) === String(course.id)).length;
                if (notesCount === 0) return;

                const card = document.createElement('div');
                card.className = 'course-card';
                card.dataset.courseId = course.id;

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
            await ensureDB();
            await scanAllCoursesForDppsAndNotes();
            if (nav) nav.classList.remove('hidden');
            const course = courses.find(c => String(c.id) === String(courseId));
             if (!course) {
                showToast("Error: Course not found.", true);
                switchView('notes-view');
                return;
            };

            const gridHeader = document.getElementById('notes-grid-header');
            if (gridHeader) gridHeader.style.display = 'none';
            const intellBtn = document.getElementById('notes-intell-hub-btn');
            if (intellBtn) intellBtn.style.display = 'none';

            // Ensure lectures are loaded for chapter info
            if (course.isLinked && course.handle && !course.lectures) {
               await refreshCourse(course.id, null);
            }

            document.getElementById('notes-course-grid').classList.add('hidden');
            const detailContainer = document.getElementById('notes-detail-container');
            detailContainer.dataset.courseId = courseId;
            detailContainer.classList.remove('hidden');
            
            const notesListContainer = document.getElementById('notes-list-container');
            
            const courseNotes = Object.values(courseProgress).filter(p => String(p.courseId) === String(courseId) && p.pdfHandle);

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
                    notesInChapter.sort((a, b) => {
                        const idxA = chapter.lectures.findIndex(lec => String(lec.id) === String(a.lectureId));
                        const idxB = chapter.lectures.findIndex(lec => String(lec.id) === String(b.lectureId));
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        const nameA = a.lectureName || a.pdfName || String(a.lectureId);
                        const nameB = b.lectureName || b.pdfName || String(b.lectureId);
                        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
                    });

                    const chapterParts = (chapter.name || '').split('/').filter(Boolean);
                    const lastFolderName = chapterParts.length > 0 ? chapterParts[chapterParts.length - 1].trim() : (chapter.name || 'Note');

                    html += `<div class="notes-folder-group open">
                                <div class="notes-folder-title"><i class="fas fa-chevron-right"></i> <span>${chapter.name}</span></div>
                                <div class="notes-list">`;
                    
                    notesInChapter.forEach((note, index) => {
                        const lectureIndexInChapter = chapter.lectures.findIndex(lec => String(lec.id) === String(note.lectureId));
                        const num = lectureIndexInChapter !== -1 ? (lectureIndexInChapter + 1) : (index + 1);

                        const lecture = course.lectures ? course.lectures.find(l => String(l.id) === String(note.lectureId)) : null;
                        let displayName = note.lectureName || (lecture && (lecture.title || lecture.name));
                        if (!displayName || displayName === 'Unnamed Note' || displayName.endsWith('.pdf')) {
                            displayName = `${lastFolderName} ${num}`;
                        }
                        html += `<div class="notes-item" data-lecture-id="${note.lectureId}" style="display: flex; justify-content: space-between; align-items: center;">
                                    <span class="notes-item-title">${displayName}</span>
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
                    const notesHeader = document.getElementById('notes-viewer-header');
                    if (notesHeader) notesHeader.classList.add('hidden');
                    const intellBtn = document.getElementById('notes-intell-hub-btn');
                    if (intellBtn) intellBtn.style.display = 'inline-flex';
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
                    const intellBtn = document.getElementById('notes-intell-hub-btn');
                    if (intellBtn) intellBtn.style.display = 'none';
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
                window.dispatchEvent(new Event('doubtsUpdated'));
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
            await cleanupOrphanedHistoryEntries();
            const history = await getHistoryEntries();
            const now = new Date();
            
            // Filter 30 hours for continue grid and exclude hidden/deleted/ignored courses & subfolders
            const thirtyHoursAgo = new Date(now.getTime() - (30 * 60 * 60 * 1000));
            const recentHistory = history.filter(h => {
                if (h.isHiddenFromContinue) return false;
                if (new Date(h.timestamp) < thirtyHoursAgo) return false;

                const course = (courses || []).find(c => c.id === parseInt(h.courseId));
                if (!course) return false;

                if (h.subfolder) {
                    if (course.subCourseData && course.subCourseData[h.subfolder] && course.subCourseData[h.subfolder].hidden) return false;
                }
                return true;
            });
            
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
            await ensureDB();
            await cleanupOrphanedHistoryEntries();
            const history = await getHistoryEntries();
            const now = new Date();
            
            // Filter history for the last 30 hours and exclude deleted/ignored courses & subfolders
            const thirtyHoursAgo = new Date(now.getTime() - (30 * 60 * 60 * 1000));
            const recentHistory = history.filter(h => {
                if (h.isHiddenFromHistory) return false;
                if (new Date(h.timestamp) < thirtyHoursAgo) return false;

                const course = (courses || []).find(c => c.id === parseInt(h.courseId));
                if (!course) return false;

                if (h.subfolder) {
                    if (course.subCourseData && course.subCourseData[h.subfolder] && course.subCourseData[h.subfolder].hidden) return false;
                }
                return true;
            });
            recentHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
            
            const tableBody = document.getElementById('history-table-body');
            if (!tableBody) return;
            tableBody.innerHTML = '';
            if (recentHistory.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No watch history found for the last 30 hours.</td></tr>';
            } else {
                let htmlStr = '';
                recentHistory.forEach(h => {
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
        window.renderHistoryView = renderHistoryView;

        async function renderDoubtsCourseSelectionView() {
            nav.classList.remove('hidden');
            const doubtsDetail = document.getElementById('doubts-detail-container');
            if (doubtsDetail) doubtsDetail.classList.add('hidden');
            const doubtsListContainer = document.getElementById('doubts-list-container');
            if (doubtsListContainer) doubtsListContainer.classList.remove('hidden');
            const grid = document.getElementById('doubts-course-grid');
            if (!grid) return;
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
                        window.dispatchEvent(new Event('doubtsUpdated'));
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

        let currentCalcTargetMode = localStorage.getItem('calcTargetMode') || 'hours';

        function setupCalcModeListeners() {
            const hoursBtn = document.getElementById('calc-mode-hours-btn');
            const lecturesBtn = document.getElementById('calc-mode-lectures-btn');
            const hoursContainer = document.getElementById('calc-hours-inputs-container');
            const lecturesContainer = document.getElementById('calc-lectures-inputs-container');
            const timeInfoBox = document.getElementById('calc-lecture-intake-time-info');

            const speedHoursInput = document.getElementById('calc-playback-speed-hours');
            const speedLecturesInput = document.getElementById('calc-playback-speed-lectures');

            if (!hoursBtn || !lecturesBtn) return;

            const applyModeUI = (mode) => {
                currentCalcTargetMode = mode;
                localStorage.setItem('calcTargetMode', mode);

                if (mode === 'hours') {
                    hoursBtn.style.background = 'var(--accent-primary)';
                    hoursBtn.style.color = '#ffffff';
                    hoursBtn.classList.add('active');

                    lecturesBtn.style.background = 'transparent';
                    lecturesBtn.style.color = 'var(--text-secondary)';
                    lecturesBtn.classList.remove('active');

                    if (hoursContainer) hoursContainer.style.display = 'grid';
                    if (lecturesContainer) lecturesContainer.style.display = 'none';
                    if (timeInfoBox) timeInfoBox.style.display = 'none';
                } else {
                    lecturesBtn.style.background = 'var(--accent-primary)';
                    lecturesBtn.style.color = '#ffffff';
                    lecturesBtn.classList.add('active');

                    hoursBtn.style.background = 'transparent';
                    hoursBtn.style.color = 'var(--text-secondary)';
                    hoursBtn.classList.remove('active');

                    if (hoursContainer) hoursContainer.style.display = 'none';
                    if (lecturesContainer) lecturesContainer.style.display = 'grid';
                    if (timeInfoBox) timeInfoBox.style.display = 'flex';
                }
            };

            hoursBtn.onclick = () => { applyModeUI('hours'); runCompletionCalculator(); };
            lecturesBtn.onclick = () => { applyModeUI('lectures'); runCompletionCalculator(); };

            if (speedHoursInput && speedLecturesInput) {
                speedHoursInput.oninput = () => {
                    speedLecturesInput.value = speedHoursInput.value;
                    runCompletionCalculator();
                };
                speedLecturesInput.oninput = () => {
                    speedHoursInput.value = speedLecturesInput.value;
                    runCompletionCalculator();
                };
            }

            const dailyHoursInput = document.getElementById('calc-daily-hours');
            if (dailyHoursInput) dailyHoursInput.oninput = runCompletionCalculator;

            const dailyLecturesInput = document.getElementById('calc-daily-lectures');
            if (dailyLecturesInput) dailyLecturesInput.oninput = runCompletionCalculator;

            applyModeUI(currentCalcTargetMode);
        }

        document.getElementById('run-calculator-btn').addEventListener('click', runCompletionCalculator);

        // Restore calc config
        const savedHours = localStorage.getItem('calcDailyHours');
        if (savedHours && document.getElementById('calc-daily-hours')) document.getElementById('calc-daily-hours').value = savedHours;
        const savedLectures = localStorage.getItem('calcDailyLectures');
        if (savedLectures && document.getElementById('calc-daily-lectures')) document.getElementById('calc-daily-lectures').value = savedLectures;
        const savedSpeed = localStorage.getItem('calcPlaybackSpeed');
        if (savedSpeed) {
            if (document.getElementById('calc-playback-speed-hours')) document.getElementById('calc-playback-speed-hours').value = savedSpeed;
            if (document.getElementById('calc-playback-speed-lectures')) document.getElementById('calc-playback-speed-lectures').value = savedSpeed;
        }

        function runCompletionCalculator() {
             setupCalcModeListeners();

             const stats = updateTotalTimeLeftDisplay();
             const totalSeconds = stats ? stats.totalSecondsLeft : 0;
             const completedSeconds = stats ? stats.totalCompletedSeconds : 0;
             const pendingLectures = stats ? stats.pendingLectures : 0;
             const totalLectures = stats ? stats.totalLecturesCount : 0;
             const completedLectures = stats ? stats.totalCompletedLectures : 0;
             const pct = stats ? stats.pct : 0;
             const courseBreakdown = stats ? stats.courseBreakdown : [];

             // Stat cards update
             const hoursStudiedEl = document.getElementById('calc-hours-studied');
             if (hoursStudiedEl) hoursStudiedEl.innerText = (completedSeconds / 3600).toFixed(1);

             const hoursRemainingEl = document.getElementById('calc-hours-remaining');
             if (hoursRemainingEl) hoursRemainingEl.innerText = (totalSeconds / 3600).toFixed(1);

             const completedLecsEl = document.getElementById('calc-completed-lectures-count');
             if (completedLecsEl) completedLecsEl.innerText = completedLectures;

             const pendingLecsEl = document.getElementById('calc-pending-lectures-count');
             if (pendingLecsEl) pendingLecsEl.innerText = pendingLectures;

             // Progress bar update & colors
             const calcProgressEl = document.getElementById('calc-progress-percentage');
             const calcProgressBar = document.getElementById('calc-progress-bar');
             let progressColor = '#ef4444'; // red
             if (pct >= 80) progressColor = '#10b981'; // green
             else if (pct >= 60) progressColor = '#06b6d4'; // cyan
             else if (pct >= 30) progressColor = '#f59e0b'; // yellow

             if (calcProgressEl) {
                 calcProgressEl.innerText = `${pct}%`;
                 calcProgressEl.style.color = progressColor;
             }
             if (calcProgressBar) {
                 calcProgressBar.style.width = `${pct}%`;
                 calcProgressBar.style.background = progressColor;
             }

             // Exact time total & breakdown
             const exactTotalEl = document.getElementById('calc-exact-time-total');
             if (exactTotalEl) {
                 exactTotalEl.innerText = formatExactTime(totalSeconds);
                 exactTotalEl.style.color = progressColor;
             }

             const breakdownListEl = document.getElementById('calc-course-time-breakdown');
             if (breakdownListEl) {
                 if (courseBreakdown.length === 0) {
                     breakdownListEl.innerHTML = '<div style="color:var(--text-secondary); font-size:0.82rem; padding:6px;">No active courses found.</div>';
                 } else {
                     breakdownListEl.innerHTML = courseBreakdown.map(c => `
                         <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-secondary); border-radius:10px; border:1px solid var(--border-secondary);">
                             <div style="display:flex; flex-direction:column; min-width:0; flex:1; margin-right:12px;">
                                 <span style="font-weight:700; font-size:0.85rem; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${c.title}</span>
                                 <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">${c.completedLectures}/${c.totalLectures} lecs done (${c.percentage}%)</span>
                             </div>
                             <div style="font-weight:800; font-size:0.85rem; color:${c.percentage >= 80 ? '#10b981' : c.percentage >= 60 ? '#06b6d4' : c.percentage >= 30 ? '#f59e0b' : '#ef4444'}; white-space:nowrap; background:var(--bg-tertiary); padding:4px 8px; border-radius:6px; border:1px solid var(--border-primary);">
                                 ${formatExactTime(c.secondsLeft)}
                             </div>
                         </div>
                     `).join('');
                 }
             }

             if (totalSeconds === 0) {
                 document.getElementById('calc-result-date').innerText = "Already Finished!";
                 document.getElementById('calc-result-stats').innerText = "0 pending lectures.";
                 return;
             }

             let speed = 1.5;
             let daysRequired = 0;
             let metaText = "";

             if (currentCalcTargetMode === 'hours') {
                 const dailyHoursInput = document.getElementById('calc-daily-hours');
                 const speedInput = document.getElementById('calc-playback-speed-hours');
                 const dailyHours = parseFloat(dailyHoursInput?.value) || 7;
                 speed = parseFloat(speedInput?.value) || 1.5;

                 localStorage.setItem('calcDailyHours', dailyHours);
                 localStorage.setItem('calcPlaybackSpeed', speed);
                 updateDailyGoalDisplay(dailyHours, speed);

                 const totalHours = totalSeconds / 3600;
                 const adjustedHours = totalHours / speed;
                 daysRequired = adjustedHours / dailyHours;
                 metaText = `${pendingLectures} pending lectures (${Math.ceil(adjustedHours)} hrs adjusted view time at ${speed}x speed).`;
             } else {
                 const dailyLecturesInput = document.getElementById('calc-daily-lectures');
                 const speedInput = document.getElementById('calc-playback-speed-lectures');
                 const dailyLectures = parseFloat(dailyLecturesInput?.value) || 4;
                 speed = parseFloat(speedInput?.value) || 1.5;

                 localStorage.setItem('calcDailyLectures', dailyLectures);
                 localStorage.setItem('calcPlaybackSpeed', speed);
                 updateDailyGoalDisplay(0, speed, dailyLectures);

                 const avgLectureDurationSec = pendingLectures > 0 ? (totalSeconds / pendingLectures) : 0;
                 const dailyWatchTimeSec = (dailyLectures * avgLectureDurationSec) / speed;
                 daysRequired = pendingLectures > 0 ? (pendingLectures / dailyLectures) : 0;

                 const dailyTimeSpan = document.getElementById('calc-lecture-intake-daily-time');
                 const countSpan = document.getElementById('calc-lecture-intake-count');
                 const speedSpan = document.getElementById('calc-lecture-intake-speed');

                 if (dailyTimeSpan) dailyTimeSpan.innerText = formatExactTime(dailyWatchTimeSec);
                 if (countSpan) countSpan.innerText = dailyLectures;
                 if (speedSpan) speedSpan.innerText = speed;

                 metaText = `${pendingLectures} pending lectures (${daysRequired.toFixed(1)} days at ${dailyLectures} lecs/day • ${formatExactTime(dailyWatchTimeSec)}/day required at ${speed}x speed).`;
             }
             
             const finishDate = new Date(Date.now() + (daysRequired * 24 * 60 * 60 * 1000));
             const options = { day: 'numeric', month: 'long', year: 'numeric' };
             const dateString = finishDate.toLocaleDateString('en-GB', options);
             
             document.getElementById('calc-result-date').innerText = dateString;
             document.getElementById('calc-result-stats').innerText = metaText;
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
            const overlay = document.getElementById('faculty-profile-overlay');
            const origin = overlay ? overlay.dataset.originView : 'faculty-view';
            if (overlay) overlay.style.display = 'none';
            if (origin === 'home-view' || origin === 'dashboard-view') {
                if (typeof switchView === 'function') {
                    switchView('home-view');
                } else {
                    window.location.hash = '#home-view';
                }
            } else {
                if (typeof switchView === 'function') {
                    switchView('faculty-view');
                } else {
                    window.location.hash = '#faculty-view';
                }
            }
        });

        function renderFacultyProfile(facultyName, originView) {
            const overlay = document.getElementById('faculty-profile-overlay');
            const effectiveOrigin = originView || (overlay ? overlay.dataset.originView : 'faculty-view') || 'faculty-view';
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.dataset.originView = effectiveOrigin;
            }
            
            const closeBtn = document.getElementById('close-faculty-profile-btn');

            if (closeBtn) {
                if (effectiveOrigin === 'home-view' || effectiveOrigin === 'dashboard-view') {
                    closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Landing Page';
                } else {
                    closeBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Go to Faculty Page';
                }
            }

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
                            <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)}h
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
                            <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)}h
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

        window.renderFacultyProfile = renderFacultyProfile;
        window.openFacultyProfile = function(facultyName, originView = 'home-view') {
            const overlay = document.getElementById('faculty-profile-overlay');
            if (overlay) {
                overlay.dataset.originView = originView;
            }
            if (typeof switchView === 'function') {
                switchView('faculty-view');
            } else {
                window.location.hash = '#faculty-view';
            }
            setTimeout(() => {
                renderFacultyProfile(facultyName, originView);
            }, 50);
        };

        // --- Init ---
        async function main() {
            if (!window.indexedDB || !window.showDirectoryPicker) { document.body.innerHTML = "<h1>Browser Not Supported</h1><p>Please use a modern browser like Google Chrome or Microsoft Edge that supports the File System Access API and IndexedDB.</p>"; return; }
            
            // Synchronously activate target view immediately to eliminate dashboard flash globally
            const initialHash = window.location.hash ? window.location.hash.substring(1) : '';
            const initialSavedState = sessionStorage.getItem('courseflixState');
            let initialTargetView = 'dashboard-view';

            let savedStateParsed = null;
            if (initialSavedState) {
                try { savedStateParsed = JSON.parse(initialSavedState); } catch(e) {}
            }

            if (savedStateParsed && savedStateParsed.view === 'player-view') {
                initialTargetView = 'player-view';
            } else if (initialHash) {
                if (initialHash.startsWith('subcourse/')) {
                    initialTargetView = 'subcourse-view';
                } else if (initialHash.endsWith('-view')) {
                    initialTargetView = initialHash;
                }
            } else if (savedStateParsed && savedStateParsed.view) {
                initialTargetView = savedStateParsed.view;
            }

            if (typeof switchView === 'function') {
                switchView(initialTargetView, false);
            }

            await openDB();
            await Promise.all([
                loadAllProgress(),
                loadCoursesFromDB()
            ]);
            
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
                        if (lectureMenu) lectureMenu.classList.remove('hidden');
                        if (sidebarToggleBtn) sidebarToggleBtn.classList.remove('collapsed');
                        const courseExists = courses.some(c => String(c.id) === String(savedState.courseId));
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
                    populateSortGroupOptions();
                    renderCourseGrid();
                });
            }

            const glassTrigger = document.getElementById('glass-sort-trigger');
            const glassMenu = document.getElementById('glass-sort-dropdown-menu');

            if (glassTrigger && glassMenu) {
                glassTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = !glassMenu.classList.contains('hidden');
                    if (isOpen) {
                        glassMenu.classList.add('hidden');
                        glassTrigger.classList.remove('active');
                    } else {
                        populateSortGroupOptions();
                        glassMenu.classList.remove('hidden');
                        glassTrigger.classList.add('active');
                    }
                });

                document.addEventListener('click', (e) => {
                    if (!e.target.closest('.glass-sort-container')) {
                        glassMenu.classList.add('hidden');
                        glassTrigger.classList.remove('active');
                    }
                });
            }

            window.addEventListener('completion_groups_updated', () => {
                populateSortGroupOptions();
                renderCourseGrid();
            });

            window.addEventListener('storage', (e) => {
                if (e.key === 'courseflix_completion_groups') {
                    populateSortGroupOptions();
                    renderCourseGrid();
                }
            });
            
            const continueSortSelect = document.getElementById('continue-sort-select');
            if (continueSortSelect) {
                continueSortSelect.addEventListener('change', () => {
                    localStorage.setItem('continueSortPref', continueSortSelect.value);
                    renderContinueView();
                });
            }
            
            async function handleRoute() {
                const hash = window.location.hash.substring(1);
                if (hash === 'filter-results-view') {
                    window.location.hash = '#home-view';
                    return;
                }
                if (!hash || hash === 'home-view') {
                    switchView('home-view', false);
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
                switchView('home-view');
            }

            window.getCourseflixStats = function() {
                let totalCourses = (typeof courses !== 'undefined' && Array.isArray(courses)) ? courses.length : 0;
                let totalLectures = 0;
                let totalSec = 0;
                const facultyMap = new Map();
                const aliases = JSON.parse(localStorage.getItem('courseflix_faculty_aliases')) || {};
                const hiddenFaculties = JSON.parse(localStorage.getItem('courseflix_hidden_faculties')) || [];
                let facultyRatings = JSON.parse(localStorage.getItem('courseflix_faculty_meta')) || {};

                const isValidIndividualFaculty = (name) => {
                    if (!name || typeof name !== 'string') return false;
                    const clean = name.trim();
                    const lower = clean.toLowerCase();
                    if (lower === 'unknown' || lower === 'unknown faculty' || lower === 'n/a' || lower === 'n/a faculty') return false;
                    if (lower === 'multiple faculty' || lower === 'multiple faculties' || lower.includes('multiple') || lower.includes('various') || lower.includes('several') || lower.includes('mixed')) return false;
                    if (hiddenFaculties.includes(clean)) return false;
                    return true;
                };

                const processCourseForFaculty = (facultyName, courseTotalLectures, courseTotalDuration) => {
                    if (!isValidIndividualFaculty(facultyName)) return;
                    let finalName = facultyName;
                    while (aliases[finalName]) {
                        finalName = aliases[finalName];
                    }
                    if (!isValidIndividualFaculty(finalName)) return;

                    let data = facultyMap.get(finalName);
                    if (!data) {
                        data = { name: finalName, totalLectures: 0, totalDurationSec: 0, coursesCount: 0 };
                        facultyMap.set(finalName, data);
                    }
                    data.totalLectures += courseTotalLectures;
                    data.totalDurationSec += courseTotalDuration;
                    data.coursesCount += 1;
                };

                const subjectStatsMap = {};

                const gateSubjects = [
                    'Data Structures & Algorithms',
                    'Operating Systems',
                    'Computer Networks',
                    'Database Management Systems',
                    'Theory of Computation',
                    'Compiler Design',
                    'Computer Organization & Architecture',
                    'Digital Logic & Design',
                    'Discrete Mathematics',
                    'Engineering Mathematics',
                    'General Aptitude'
                ];

                if (typeof courses !== 'undefined' && Array.isArray(courses)) {
                    courses.forEach(course => {
                        if (!course.lectures) return;

                        let validLectures = course.lectures || [];

                        totalLectures += validLectures.length;
                        const lecsDuration = validLectures.reduce((acc, l) => acc + (l.duration || 0), 0);
                        const cDur = Math.max(course.totalDuration || 0, lecsDuration);
                        totalSec += cDur;

                        let hasSubfolders = course.subCourseData && Object.keys(course.subCourseData).length > 0;
                        if (!hasSubfolders && course.lectures && course.lectures.some(l => l.chapter)) {
                            hasSubfolders = true;
                        }

                        if (!hasSubfolders) {
                            let tLecs = validLectures.length;
                            let tDur = validLectures.reduce((acc, l) => acc + (l.duration || 0), 0);
                            processCourseForFaculty(course.facultyName || 'Unknown', tLecs, tDur);
                        } else {
                            const subfolderStats = {};
                            validLectures.forEach(lecture => {
                                let topLevel = lecture.chapter ? lecture.chapter.split('/')[0] : '';
                                let matchedSub = null;
                                if (course.subCourseData) {
                                    for (const subName in course.subCourseData) {
                                        if (lecture.chapter === subName || (lecture.chapter && lecture.chapter.startsWith(subName + '/'))) {
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
                                    subfolderStats[effectiveSub] = { totalLecs: 0, totalDur: 0, facultyName: fName };
                                }
                                subfolderStats[effectiveSub].totalLecs++;
                                subfolderStats[effectiveSub].totalDur += (lecture.duration || 0);
                            });
                            for (const subName in subfolderStats) {
                                const st = subfolderStats[subName];
                                processCourseForFaculty(st.facultyName, st.totalLecs, st.totalDur);
                            }
                        }

                        // Match subject
                        const matchedSub = gateSubjects.find(subName => {
                            const titleLower = (course.title || '').toLowerCase();
                            const subLower = subName.toLowerCase();
                            if (subLower.includes('data structure') && (titleLower.includes('data') || titleLower.includes('dsa') || titleLower.includes('algo'))) return true;
                            if (subLower.includes('operating') && (titleLower.includes('operating') || titleLower.includes('os'))) return true;
                            if (subLower.includes('network') && (titleLower.includes('network') || titleLower.includes('cn'))) return true;
                            if (subLower.includes('database') && (titleLower.includes('database') || titleLower.includes('dbms') || titleLower.includes('sql'))) return true;
                            if (subLower.includes('computation') && (titleLower.includes('toc') || titleLower.includes('automata') || titleLower.includes('computation'))) return true;
                            if (subLower.includes('compiler') && titleLower.includes('compiler')) return true;
                            if (subLower.includes('organization') && (titleLower.includes('coa') || titleLower.includes('architecture') || titleLower.includes('organization'))) return true;
                            if (subLower.includes('digital') && (titleLower.includes('digital') || titleLower.includes('logic'))) return true;
                            if (subLower.includes('discrete') && (titleLower.includes('discrete') || titleLower.includes('math'))) return true;
                            if (subLower.includes('engineering') && (titleLower.includes('engineering') || titleLower.includes('em'))) return true;
                            if (subLower.includes('aptitude') && titleLower.includes('aptitude')) return true;
                            return false;
                        });

                        if (matchedSub) {
                            if (!subjectStatsMap[matchedSub]) {
                                subjectStatsMap[matchedSub] = { totalLectures: 0, facultyMap: {} };
                            }
                            subjectStatsMap[matchedSub].totalLectures += validLectures.length;
                            const fac = course.facultyName;
                            if (isValidIndividualFaculty(fac)) {
                                subjectStatsMap[matchedSub].facultyMap[fac] = (subjectStatsMap[matchedSub].facultyMap[fac] || 0) + validLectures.length;
                            }
                        }
                    });
                }

                const allFaculties = Array.from(facultyMap.values()).filter(f => isValidIndividualFaculty(f.name));
                allFaculties.forEach(f => {
                    const meta = facultyRatings[f.name] || { rating: 0, photo: '' };
                    f.rating = meta.rating || 5;
                    f.photo = meta.photo || '';
                    f.totalHours = Math.round(f.totalDurationSec / 3600);
                });
                allFaculties.sort((a, b) => b.totalDurationSec - a.totalDurationSec);

                const starFaculties = allFaculties.slice(0, 8);

                let trivia = null;
                if (allFaculties.length > 0) {
                    const top = allFaculties[0];
                    trivia = {
                        facultyName: top.name,
                        hoursTaught: Math.round(top.totalDurationSec / 3600),
                        coursesCount: top.coursesCount > 0 ? top.coursesCount : 4,
                        lecturesCount: top.totalLectures > 0 ? top.totalLectures : 343
                    };
                } else {
                    trivia = {
                        facultyName: 'AMIT SIR',
                        hoursTaught: 489,
                        coursesCount: 4,
                        lecturesCount: 343
                    };
                }

                const formattedSubjectStats = {};
                gateSubjects.forEach(subName => {
                    const data = subjectStatsMap[subName];
                    if (data && data.totalLectures > 0) {
                        const faculties = Object.keys(data.facultyMap).filter(isValidIndividualFaculty);
                        let primaryFac = 'AMIT SIR';
                        let primaryLecs = 0;
                        faculties.forEach(f => {
                            if (data.facultyMap[f] > primaryLecs) {
                                primaryFac = f;
                                primaryLecs = data.facultyMap[f];
                            }
                        });
                        formattedSubjectStats[subName] = {
                            totalLectures: data.totalLectures,
                            facultiesCount: faculties.length || 1,
                            primaryFaculty: primaryFac !== 'N/A' ? primaryFac : 'AMIT SIR',
                            primaryFacultyLectures: primaryLecs || data.totalLectures
                        };
                    }
                });

                return {
                    totalCourses,
                    totalLectures,
                    totalHours: Math.round(totalSec / 3600),
                    starFaculties,
                    subjectStats: formattedSubjectStats,
                    trivia
                };
            };

            window.openSubjectPage = function(subjectName) {
                const allCourses = courses || [];
                const sLower = subjectName.toLowerCase();
                
                const subjectAliases = {
                    'data structures & algorithms': ['dsa', 'data structures', 'algorithms', 'ds & algo', 'algo', 'ds'],
                    'operating systems': ['os', 'operating system', 'opsys'],
                    'computer networks': ['cn', 'networks', 'networking', 'computer network'],
                    'database management systems': ['dbms', 'database', 'databases', 'db'],
                    'theory of computation': ['toc', 'automata', 'flat', 'formal languages'],
                    'compiler design': ['cd', 'compiler', 'compilers'],
                    'computer organization & architecture': ['coa', 'cao', 'architecture', 'organization', 'comp org'],
                    'digital logic & design': ['dld', 'digital logic', 'digital', 'dl'],
                    'discrete mathematics': ['discrete', 'dm', 'discrete maths'],
                    'engineering mathematics': ['maths', 'em', 'engg maths', 'linear algebra', 'calculus', 'probability'],
                    'general aptitude': ['aptitude', 'apti', 'ga', 'general apt']
                };

                const aliases = subjectAliases[sLower] || [];

                let matchedCourse = allCourses.find(c => {
                    const title = (c.title || '').toLowerCase();
                    if (title === sLower || title.includes(sLower) || sLower.includes(title)) return true;
                    return aliases.some(alias => title === alias || title.includes(alias) || alias.includes(title));
                });

                const subView = document.getElementById('subcourse-view');
                if (subView) {
                    subView.dataset.origin = 'home-view';
                }

                if (matchedCourse && typeof renderSubcourseView === 'function') {
                    renderSubcourseView(matchedCourse.id, '', true);
                    return;
                }

                if (subView) {
                    subView.dataset.currentPath = '';
                    const titleEl = document.getElementById('subcourse-parent-title');
                    if (titleEl) titleEl.textContent = subjectName;
                    
                    const backLink = document.getElementById('back-to-dashboard-from-sub');
                    if (backLink) {
                        backLink.innerHTML = '&larr; Back to Landing Page';
                    }
                    
                    const subcourseGrid = document.getElementById('subcourse-grid');
                    if (subcourseGrid) {
                        subcourseGrid.innerHTML = `
                            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                                <i className="fas fa-folder-open" style="font-size: 3.5rem; color: var(--accent-primary); opacity: 0.6; margin-bottom: 16px;"></i>
                                <h3 style="font-size: 1.3rem; color: var(--text-primary); margin-bottom: 8px;">No lectures uploaded yet for ${subjectName}</h3>
                                <p style="font-size: 0.95rem; max-width: 480px; margin: 0 auto 24px; line-height: 1.5;">
                                    Upload your lecture video folder for this subject in the Upload section to unlock subcourse tracking, progress analytics, and notes.
                                </p>
                                <button onclick="window.switchView ? window.switchView('upload-view') : (window.location.hash = '#upload-view')" className="primary-btn" style="padding: 10px 22px; font-weight: 700; border-radius: 10px; cursor: pointer;">
                                    <i className="fas fa-cloud-upload-alt" style="margin-right: 6px;"></i> Go to Upload Section
                                </button>
                            </div>
                        `;
                    }
                    switchView('subcourse-view');
                } else {
                    switchView('dashboard-view');
                }
            };
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
                    const origin = searchView ? searchView.dataset.origin : 'dashboard-view';
                    if (origin === 'home-view') {
                        switchView('home-view');
                        if (searchView) searchView.dataset.origin = 'dashboard-view';
                    } else {
                        switchView('dashboard-view');
                    }
                    searchInput.value = '';
                    backBtn.innerHTML = '<i className="fas fa-arrow-left"></i>';
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
                                        <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)}h
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
                                        <i class="far fa-clock"></i> ${Math.ceil(remainingSecs / 3600)}h
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
                
                const smartSkipCountInput = document.getElementById('settings-smart-skip-count');
                const smartSkipMinInput = document.getElementById('settings-smart-skip-min');
                const smartSkipSecInput = document.getElementById('settings-smart-skip-sec');
                if (smartSkipCountInput) smartSkipCountInput.value = localStorage.getItem('smartSkipCount') || '7';
                if (smartSkipMinInput) smartSkipMinInput.value = localStorage.getItem('smartSkipMin') || '5';
                if (smartSkipSecInput) smartSkipSecInput.value = localStorage.getItem('smartSkipSec') || '0';
                
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
                const currentSkipTimeInput = document.getElementById('settings-skip-time');
                const currentPlaybackSpeedInput = document.getElementById('settings-playback-speed');
                const currentAutoplayPromptInput = document.getElementById('settings-autoplay-prompt');
                
                if (currentSkipTimeInput) localStorage.setItem('defaultSkipTime', currentSkipTimeInput.value);
                const speed = currentPlaybackSpeedInput ? (parseFloat(currentPlaybackSpeedInput.value) || 1.75) : 1.75;
                localStorage.setItem('defaultPlaybackSpeed', speed);
                if (currentAutoplayPromptInput) localStorage.setItem('defaultAutoplayPrompt', currentAutoplayPromptInput.value);
                
                window.activePlaybackRate = speed;
                if (videoPlayer) videoPlayer.playbackRate = speed;
                if (speedBtn) speedBtn.textContent = `${speed}x`;
                
                const smartSkipCountInput = document.getElementById('settings-smart-skip-count');
                const smartSkipMinInput = document.getElementById('settings-smart-skip-min');
                const smartSkipSecInput = document.getElementById('settings-smart-skip-sec');
                if (smartSkipCountInput) localStorage.setItem('smartSkipCount', smartSkipCountInput.value);
                if (smartSkipMinInput) localStorage.setItem('smartSkipMin', smartSkipMinInput.value);
                if (smartSkipSecInput) localStorage.setItem('smartSkipSec', smartSkipSecInput.value);
                
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

        // 2.5 Smart Skip / Rewind Feature
        const smartSkipBtn = document.getElementById('smart-skip-btn');
        const smartRewindBtn = document.getElementById('smart-rewind-btn');
        let smartSkipHideTimer = null;
        let smartRewindHideTimer = null;
        let preSkipTime = null;
        let skipTrackingCount = 0;
        let skipTrackingTimer = null;

        window.triggerSmartSkipCheck = function() {
            if (!smartSkipBtn || !videoPlayer || videoPlayer.paused) return;
            skipTrackingCount++;
            
            if (skipTrackingTimer) clearTimeout(skipTrackingTimer);
            
            const targetCount = parseInt(localStorage.getItem('smartSkipCount') || '7');
            
            if (skipTrackingCount >= targetCount) {
                const targetMin = parseInt(localStorage.getItem('smartSkipMin') || '5');
                const targetSec = parseInt(localStorage.getItem('smartSkipSec') || '0');
                let timeText = [];
                if (targetMin > 0) timeText.push(`${targetMin} mins`);
                if (targetSec > 0) timeText.push(`${targetSec} secs`);
                
                smartSkipBtn.innerHTML = `Skip ${timeText.join(' ')} ahead <i class="fas fa-forward" style="margin-left:8px"></i>`;
                
                smartSkipBtn.style.display = 'flex';
                setTimeout(() => smartSkipBtn.style.opacity = '1', 10);
                
                if (smartSkipHideTimer) clearTimeout(smartSkipHideTimer);
                smartSkipHideTimer = setTimeout(() => {
                    smartSkipBtn.style.opacity = '0';
                    setTimeout(() => smartSkipBtn.style.display = 'none', 300);
                }, 5000);
                skipTrackingCount = 0; // Reset after showing
            } else {
                skipTrackingTimer = setTimeout(() => {
                    skipTrackingCount = 0; // Reset if user stops skipping for 2 seconds
                }, 2000);
            }
        };

        if (smartSkipBtn && smartRewindBtn && videoPlayer) {

            smartSkipBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                preSkipTime = videoPlayer.currentTime;
                
                const targetMin = parseInt(localStorage.getItem('smartSkipMin') || '5');
                const targetSec = parseInt(localStorage.getItem('smartSkipSec') || '0');
                const targetTime = (targetMin * 60) + targetSec;
                
                videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + targetTime);
                
                smartSkipBtn.style.opacity = '0';
                setTimeout(() => smartSkipBtn.style.display = 'none', 300);
                if (smartSkipHideTimer) clearTimeout(smartSkipHideTimer);
                
                smartRewindBtn.style.display = 'flex';
                setTimeout(() => smartRewindBtn.style.opacity = '1', 10);
                
                if (smartRewindHideTimer) clearTimeout(smartRewindHideTimer);
                smartRewindHideTimer = setTimeout(() => {
                    smartRewindBtn.style.opacity = '0';
                    setTimeout(() => smartRewindBtn.style.display = 'none', 300);
                }, 5000);
            });

            smartRewindBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (preSkipTime !== null) {
                    videoPlayer.currentTime = preSkipTime;
                }
                smartRewindBtn.style.opacity = '0';
                setTimeout(() => smartRewindBtn.style.display = 'none', 300);
                if (smartRewindHideTimer) clearTimeout(smartRewindHideTimer);
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

        let playerNotesSaveDebounce = null;

        window.loadPlayerNotes = function() {
            if (!currentCourse || !currentLectureLi) return;
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);
            if (playerNotesEditor) {
                playerNotesEditor.innerHTML = progress.notes || '';
            }
            const statusEl = document.getElementById('player-notes-save-status');
            if (statusEl) {
                statusEl.innerHTML = '<i class="fas fa-check-circle" style="font-size:0.7rem"></i> Saved';
                statusEl.style.color = '#10b981';
            }
        };

        window.savePlayerNotes = function() {
            if (!currentCourse || !currentLectureLi || !playerNotesEditor) return;
            const statusEl = document.getElementById('player-notes-save-status');
            if (statusEl) {
                statusEl.innerHTML = '<i class="fas fa-sync fa-spin" style="font-size:0.7rem"></i> Saving...';
                statusEl.style.color = '#f59e0b';
            }

            if (playerNotesSaveDebounce) clearTimeout(playerNotesSaveDebounce);
            playerNotesSaveDebounce = setTimeout(() => {
                const lectureId = currentLectureLi.dataset.lectureId;
                const progress = getLectureProgress(currentCourse.id, lectureId);
                progress.courseId = currentCourse.id;
                progress.lectureId = lectureId;
                progress.notes = playerNotesEditor.innerHTML;
                saveLectureProgress(progress);

                if (statusEl) {
                    statusEl.innerHTML = '<i class="fas fa-check-circle" style="font-size:0.7rem"></i> Saved';
                    statusEl.style.color = '#10b981';
                }
            }, 500);
        };

        if (playerNotesEditor) {
            playerNotesEditor.addEventListener('input', window.savePlayerNotes);

            // Handle clicking timestamp badges inside notes to seek video player
            playerNotesEditor.addEventListener('click', (e) => {
                const badge = e.target.closest('.note-timestamp-badge');
                if (badge) {
                    const seekSec = parseFloat(badge.dataset.time);
                    if (!isNaN(seekSec) && videoPlayer) {
                        videoPlayer.currentTime = seekSec;
                        showToast(`Jumped to video ${formatTime(seekSec)}`);
                    }
                }
            });
        }

        if (playerNotesTimestampBtn) {
            playerNotesTimestampBtn.addEventListener('click', () => {
                if (!videoPlayer || !playerNotesEditor) return;
                const timeSec = Math.floor(videoPlayer.currentTime);
                const timeFormatted = formatTime(timeSec);
                const badgeHtml = `<button class="note-timestamp-badge" data-time="${timeSec}" contenteditable="false"><i class="fas fa-play" style="font-size:0.65rem"></i> ${timeFormatted}</button>&nbsp;`;
                
                document.execCommand('insertHTML', false, badgeHtml);
                window.savePlayerNotes();
            });
        }

        window.toggleNoteHighlight = function() {
            const editor = document.getElementById('player-notes-editor');
            if (!editor) return;

            const sel = window.getSelection();
            let isHighlighted = false;
            let targetNode = null;

            if (sel && sel.anchorNode) {
                let node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
                while (node && node !== editor) {
                    if (node.tagName === 'MARK' || (node.style && node.style.backgroundColor && node.style.backgroundColor !== 'transparent' && node.style.backgroundColor !== 'rgba(0, 0, 0, 0)')) {
                        isHighlighted = true;
                        targetNode = node;
                        break;
                    }
                    node = node.parentNode;
                }
            }

            if (isHighlighted && targetNode) {
                // Remove highlight background and clear font colors inside node
                const textContent = targetNode.innerText || targetNode.textContent;
                const textNode = document.createTextNode(textContent);
                targetNode.replaceWith(textNode);
                document.execCommand('hiliteColor', false, 'transparent');
                showToast('Highlight removed');
            } else {
                // Apply highlight (CSS automatically makes text black while background is yellow!)
                document.execCommand('hiliteColor', false, '#fef08a');
            }
            window.savePlayerNotes();
        };

        // Quick Tag Pill & Copy Button Handlers
        document.body.addEventListener('click', (e) => {
            const tagBtn = e.target.closest('.note-quick-tag-btn');
            if (tagBtn && playerNotesEditor) {
                const tagType = tagBtn.dataset.tag;
                const timeSec = videoPlayer ? Math.floor(videoPlayer.currentTime) : 0;
                const timeFormatted = formatTime(timeSec);

                // Check if selection/cursor is inside an existing callout block
                const sel = window.getSelection();
                let parentCallout = null;
                if (sel && sel.anchorNode) {
                    let node = sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode;
                    while (node && node !== playerNotesEditor) {
                        if (node.classList && node.classList.contains('note-callout-block')) {
                            parentCallout = node;
                            break;
                        }
                        node = node.parentNode;
                    }
                }

                if (parentCallout) {
                    const existingTag = parentCallout.dataset.tag;
                    if (existingTag === tagType) {
                        // DESELECT / REMOVE CALLOUT BLOCK
                        const clone = parentCallout.cloneNode(true);
                        const badges = clone.querySelectorAll('.note-timestamp-badge');
                        badges.forEach(b => b.remove());
                        const strongs = clone.querySelectorAll('strong');
                        strongs.forEach(s => s.remove());

                        const plainText = clone.innerText.trim();
                        const p = document.createElement('p');
                        p.innerText = plainText || '';
                        parentCallout.replaceWith(p);
                        window.savePlayerNotes();
                        showToast(`Removed ${tagType} callout`);
                        return;
                    } else {
                        // SWAP CALLOUT TAG TYPE
                        let tagConfig = { label: 'Important', icon: '⚡', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
                        if (tagType === 'concept') tagConfig = { label: 'Concept', icon: '💡', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' };
                        else if (tagType === 'formula') tagConfig = { label: 'Formula', icon: '📌', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' };
                        else if (tagType === 'doubt') tagConfig = { label: 'Doubt', icon: '❓', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
                        else if (tagType === 'summary') tagConfig = { label: 'Summary', icon: '📝', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };

                        parentCallout.dataset.tag = tagType;
                        parentCallout.style.background = tagConfig.bg;
                        parentCallout.style.borderLeft = `3px solid ${tagConfig.color}`;
                        
                        const strong = parentCallout.querySelector('strong');
                        if (strong) {
                            strong.style.color = tagConfig.color;
                            strong.innerHTML = `${tagConfig.icon} ${tagConfig.label}:`;
                        }
                        window.savePlayerNotes();
                        showToast(`Changed tag to ${tagConfig.label}`);
                        return;
                    }
                }

                // Insert NEW Callout Block
                let tagConfig = { label: 'Important', icon: '⚡', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
                if (tagType === 'concept') tagConfig = { label: 'Concept', icon: '💡', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' };
                else if (tagType === 'formula') tagConfig = { label: 'Formula', icon: '📌', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' };
                else if (tagType === 'doubt') tagConfig = { label: 'Doubt', icon: '❓', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
                else if (tagType === 'summary') tagConfig = { label: 'Summary', icon: '📝', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };

                const tagHtml = `<div class="note-callout-block" data-tag="${tagType}" style="background:${tagConfig.bg}; border-left:3px solid ${tagConfig.color}; padding:6px 12px; border-radius:8px; margin:6px 0; font-weight:500;">
                    <span class="note-timestamp-badge" data-time="${timeSec}" contenteditable="false" style="margin-right:8px;"><i class="fas fa-play" style="font-size:0.65rem"></i> ${timeFormatted}</span>&nbsp;<strong style="color:${tagConfig.color}; font-size:0.88rem; font-weight:700;">${tagConfig.icon} ${tagConfig.label}:</strong>&nbsp;
                </div><p>&nbsp;</p>`;

                document.execCommand('insertHTML', false, tagHtml);
                window.savePlayerNotes();
            }

            // Copy Notes Button
            if (e.target.closest('#player-notes-copy-btn')) {
                if (playerNotesEditor) {
                    const text = playerNotesEditor.innerText;
                    navigator.clipboard.writeText(text).then(() => {
                        showToast('Notes copied to clipboard!');
                    }).catch(() => {
                        showToast('Failed to copy notes', true);
                    });
                }
            }
        });

        window.showMediaViewerPlaceholder = function(type, lectureId) {
            const playerNotesSidebar = document.getElementById('player-notes-sidebar');
            if (playerNotesSidebar && playerView.classList.contains('notes-active')) {
                playerView.classList.remove('notes-active');
                playerNotesSidebar.classList.add('hidden');
            }

            const uploadPlaceholder = document.getElementById('media-viewer-upload-placeholder');
            const placeholderTitle = document.getElementById('placeholder-title');
            const placeholderSubtitle = document.getElementById('placeholder-subtitle');

            activeViewerFileType = type.toLowerCase();
            activeViewerLectureId = lectureId;

            if (type.toLowerCase() === 'pdf' || type.toLowerCase() === 'notes') {
                if (viewerTitle) viewerTitle.textContent = 'Lecture Notes (PDF)';
                if (placeholderTitle) placeholderTitle.textContent = 'Lecture Notes (PDF)';
                if (placeholderSubtitle) placeholderSubtitle.textContent = 'Click or Drag & Drop a PDF Here';
            } else {
                if (viewerTitle) viewerTitle.textContent = 'DPP / Assignment (PDF)';
                if (placeholderTitle) placeholderTitle.textContent = 'DPP (PDF)';
                if (placeholderSubtitle) placeholderSubtitle.textContent = 'Click or Drag & Drop a PDF Here';
            }

            if (mediaViewerFrame) mediaViewerFrame.style.display = 'none';
            if (uploadPlaceholder) {
                uploadPlaceholder.classList.remove('hidden');
                uploadPlaceholder.style.display = 'flex';
            }

            deleteViewerFileBtn.classList.remove('visible');

            const preferredWidth = localStorage.getItem('viewerWidth') || '500px';
            playerView.style.setProperty('--viewer-width', preferredWidth);
            mediaViewer.style.width = preferredWidth;
            playerView.classList.add('viewer-active');
            mediaViewer.classList.remove('hidden');
            mediaViewerToggleBtn.classList.add('hidden');
        };

        window.togglePlayerNotesPanel = function() {
            if (!currentCourse || !currentLectureLi) return;
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);

            if (!mediaViewer.classList.contains('hidden') && (activeViewerFileType === 'pdf' || activeViewerFileType === 'notes')) {
                hideMediaViewer();
                return;
            }

            if (progress.pdfHandle) {
                showMediaViewer(progress.pdfHandle, 'PDF', progress.pdfName || 'Notes.pdf', progress);
            } else {
                window.showMediaViewerPlaceholder('pdf', lectureId);
            }
        };

        window.togglePlayerDppPanel = function() {
            if (!currentCourse || !currentLectureLi) return;
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);

            if (!mediaViewer.classList.contains('hidden') && (activeViewerFileType === 'assignment' || activeViewerFileType === 'dpp')) {
                hideMediaViewer();
                return;
            }

            if (progress.assignmentHandle) {
                showMediaViewer(progress.assignmentHandle, 'Assignment', progress.assignmentName || 'DPP.pdf', progress);
            } else {
                window.showMediaViewerPlaceholder('assignment', lectureId);
            }
        };

        window.cycleOrOpenRightSidePanel = function() {
            if (!currentCourse || !currentLectureLi) return;
            const lectureId = currentLectureLi.dataset.lectureId;
            const progress = getLectureProgress(currentCourse.id, lectureId);

            if (!mediaViewer.classList.contains('hidden')) {
                if (activeViewerFileType === 'pdf' || activeViewerFileType === 'notes') {
                    if (progress.assignmentHandle) {
                        showMediaViewer(progress.assignmentHandle, 'Assignment', progress.assignmentName || 'DPP.pdf', progress);
                    } else {
                        window.showMediaViewerPlaceholder('assignment', lectureId);
                    }
                } else {
                    if (progress.pdfHandle) {
                        showMediaViewer(progress.pdfHandle, 'PDF', progress.pdfName || 'Notes.pdf', progress);
                    } else {
                        window.showMediaViewerPlaceholder('pdf', lectureId);
                    }
                }
            } else {
                if (progress.pdfHandle) {
                    showMediaViewer(progress.pdfHandle, 'PDF', progress.pdfName || 'Notes.pdf', progress);
                } else if (progress.assignmentHandle) {
                    showMediaViewer(progress.assignmentHandle, 'Assignment', progress.assignmentName || 'DPP.pdf', progress);
                } else {
                    window.showMediaViewerPlaceholder('pdf', lectureId);
                }
            }
        };

        const playerNotesBtn = document.getElementById('player-notes-btn');
        const playerDppBtn = document.getElementById('player-dpp-btn');
        if (playerNotesBtn) {
            playerNotesBtn.addEventListener('click', () => {
                window.togglePlayerNotesPanel();
            });
        }
        if (playerDppBtn) {
            playerDppBtn.addEventListener('click', () => {
                window.togglePlayerDppPanel();
            });
        }

        const uploadPlaceholder = document.getElementById('media-viewer-upload-placeholder');
        if (uploadPlaceholder) {
            uploadPlaceholder.addEventListener('click', () => {
                if (!currentLectureLi) return;
                const lectureId = currentLectureLi.dataset.lectureId;
                if (activeViewerFileType === 'pdf' || activeViewerFileType === 'notes') {
                    addPdfInput.dataset.lectureId = lectureId;
                    addPdfInput.click();
                } else {
                    addAssignmentInput.dataset.lectureId = lectureId;
                    addAssignmentInput.click();
                }
            });

            uploadPlaceholder.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadPlaceholder.style.borderColor = 'var(--accent-primary)';
                uploadPlaceholder.style.background = 'rgba(16, 185, 129, 0.1)';
            });

            uploadPlaceholder.addEventListener('dragleave', () => {
                uploadPlaceholder.style.borderColor = 'var(--border-secondary)';
                uploadPlaceholder.style.background = 'var(--bg-tertiary)';
            });

            uploadPlaceholder.addEventListener('drop', async (e) => {
                e.preventDefault();
                uploadPlaceholder.style.borderColor = 'var(--border-secondary)';
                uploadPlaceholder.style.background = 'var(--bg-tertiary)';

                if (!currentLectureLi || !currentCourse) return;
                const file = e.dataTransfer.files[0];
                if (!file) return;

                const lectureId = currentLectureLi.dataset.lectureId;
                const progressData = getLectureProgress(currentCourse.id, lectureId);

                if (activeViewerFileType === 'pdf' || activeViewerFileType === 'notes') {
                    await saveLectureProgress({ ...progressData, pdfHandle: file, pdfName: file.name, courseId: currentCourse.id, lectureId: lectureId });
                    await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
                    await showMediaViewer(file, 'PDF', file.name, getLectureProgress(currentCourse.id, lectureId));
                } else {
                    await saveLectureProgress({ ...progressData, assignmentHandle: file, assignmentName: file.name, assignmentType: file.type, courseId: currentCourse.id, lectureId: lectureId });
                    await renderPlayer(currentCourse.id, lectureId, lastView, null, currentSubfolder);
                    await showMediaViewer(file, 'Assignment', file.name, getLectureProgress(currentCourse.id, lectureId));
                }
            });
        }

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
            if (navEl) {
                const activeView = document.querySelector('.view.active')?.id;
                if (activeView === 'player-view') {
                    navEl.classList.add('hidden');
                } else {
                    navEl.classList.remove('hidden');
                }
            }
        });

        // ============================================================
        // CALENDAR VIEW ENGINE
        // ============================================================

        function dateToStr(d) {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const dy = String(d.getDate()).padStart(2, '0');
            return `${yr}-${mo}-${dy}`;
        }

        function isToday(dateStr) {
            return dateStr === dateToStr(new Date());
        }

        function isFuture(dateStr) {
            return dateStr > dateToStr(new Date());
        }

        function formatCalendarDate(dateStr) {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }

        // Get uncompleted lectures for a subject (same logic as goals.html)
        function getNextUncompletedLecture(baseName, facultyName, count) {
            let uncompleted = [];
            const matchingCourses = courses.filter(c => c.title === baseName && !c.isIgnored);
            for (const course of matchingCourses) {
                if (uncompleted.length >= count) break;
                const allLectures = [];
                if (course.chapters) {
                    course.chapters.forEach(ch => {
                        if (getSubfolderFacultyName(course, ch.name) !== facultyName) return;
                        if (ch.lectures) ch.lectures.forEach(l => allLectures.push({ ...l, courseId: course.id, courseTitle: course.title, chName: ch.name, facultyName }));
                    });
                } else if (course.lectures) {
                    if ((course.facultyName || 'Unknown Faculty') === facultyName) {
                        course.lectures.forEach(l => allLectures.push({ ...l, courseId: course.id, courseTitle: course.title, facultyName }));
                    }
                }
                for (const lec of allLectures) {
                    if (uncompleted.length >= count) break;
                    const prog = courseProgress[`${lec.courseId}_${lec.id}`];
                    if (!prog || !prog.completed) uncompleted.push(lec);
                }
            }
            return uncompleted;
        }

        window.calendarUndoStack = window.calendarUndoStack || [];
        window.isUndoingCalendar = false;
        document.addEventListener('keydown', async (e) => {
            if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
                const calView = document.getElementById('calendar-view');
                if (calView && !calView.classList.contains('hidden') && !calView.closest('.hidden')) {
                    if (window.calendarUndoStack.length > 0) {
                        e.preventDefault();
                        const lastAction = window.calendarUndoStack.pop();
                        window.isUndoingCalendar = true;
                        await ensureDB();
                        if (lastAction.action === 'delete') {
                            await new Promise(r => {
                                const req = getStore(CALENDAR_STORE, 'readwrite').put(lastAction.event);
                                req.onsuccess = r;
                                req.onerror = r;
                            });
                        } else if (lastAction.action === 'add') {
                            await new Promise(r => {
                                const req = getStore(CALENDAR_STORE, 'readwrite').delete(Number(lastAction.event.id));
                                req.onsuccess = r;
                                req.onerror = r;
                            });
                        } else if (lastAction.action === 'update') {
                            await new Promise(r => {
                                const req = getStore(CALENDAR_STORE, 'readwrite').put(lastAction.event);
                                req.onsuccess = r;
                                req.onerror = r;
                            });
                        } else if (lastAction.action === 'hide_history') {
                            const hidden = JSON.parse(localStorage.getItem('cal_hidden_history') || '[]');
                            const newHidden = hidden.filter(hId => hId !== lastAction.id);
                            localStorage.setItem('cal_hidden_history', JSON.stringify(newHidden));
                        }
                        window.isUndoingCalendar = false;
                        if (typeof window.renderCalendarDay === 'function' && typeof currentCalendarDate !== 'undefined') {
                            window.renderCalendarDay(currentCalendarDate);
                        }
                    }
                }
            }
        });

        // Main calendar open function (exposed to window)
        window.openCalendarView = function(targetDate) {
            currentCalendarDate = targetDate || dateToStr(new Date());
            switchView('history-view');
            if (window.setHistoryTabCalendar) {
                window.setHistoryTabCalendar(currentCalendarDate);
            } else {
                renderCalendarDay(currentCalendarDate, false);
            }
        };

        // Expose renderCalendarDay so React CalendarView component can call it
        // (The function will be assigned after definition below)

        function isDateUnlocked(dateStr) {
            if (!dateStr || !isFuture(dateStr)) return true;
            try {
                const unlocked = JSON.parse(localStorage.getItem('cal_unlocked_dates') || '[]');
                return unlocked.includes(dateStr);
            } catch (e) {
                return false;
            }
        }

        async function renderCalendarDay(dateStr, isUnlocked) {
            await ensureDB();
            currentCalendarDate = dateStr;
            const calView = document.getElementById('calendar-view');
            if (!calView) return;

            isUnlocked = isUnlocked || isDateUnlocked(dateStr);

            const future = isFuture(dateStr);
            const today = isToday(dateStr);

            // Update date display
            const dateDisplay = calView.querySelector('#cal-date-display');
            if (dateDisplay) dateDisplay.textContent = formatCalendarDate(dateStr);

            // Unlock button state
            const lockOverlay = calView.querySelector('#cal-lock-overlay');
            if (lockOverlay) {
                if (future && !isUnlocked) {
                    lockOverlay.classList.remove('cal-hidden');
                } else {
                    lockOverlay.classList.add('cal-hidden');
                }
            }

            // Make Playlist button - show on today and future (if unlocked)
            const makePlaylistBtn = calView.querySelector('#cal-make-playlist-btn');
            if (makePlaylistBtn) {
                if (!future || isUnlocked) {
                    makePlaylistBtn.classList.remove('cal-hidden');
                } else {
                    makePlaylistBtn.classList.add('cal-hidden');
                }
            }

            // Build timeline
            const timeline = calView.querySelector('#cal-timeline');
            if (!timeline) return;
            timeline.innerHTML = '';

            const HOUR_HEIGHT = 80; // px per hour
            const totalMinutes = 24 * 60;

            // Fetch history & completed progress entries for this date
            await cleanupOrphanedHistoryEntries();
            const allHistory = await getHistoryEntries();
            const dayTickedEvents = [];
            const seenKeysCal = new Set();

            allHistory.forEach(h => {
                if (!h.timestamp || !h.timestamp.startsWith(dateStr)) return;
                const course = (courses || []).find(c => c.id === parseInt(h.courseId));
                if (!course || course.isIgnored) return;
                if (h.subfolder) {
                    if (typeof isSubfolderIgnored === 'function' && isSubfolderIgnored(course, h.subfolder)) return;
                    if (course.subCourseData && course.subCourseData[h.subfolder] && course.subCourseData[h.subfolder].hidden) return;
                }
                const progKey = `${h.courseId}_${h.lectureId}`;
                if (seenKeysCal.has(progKey)) return;
                const prog = courseProgress[progKey];
                if (prog && prog.completed) {
                    seenKeysCal.add(progKey);
                    dayTickedEvents.push(h);
                }
            });

            Object.values(courseProgress).forEach(prog => {
                if (!prog.completed) return;
                const ts = prog.completedAt || prog.lastStudiedAt;
                if (ts && ts.startsWith(dateStr)) {
                    const progKey = prog.id || `${prog.courseId}_${prog.lectureId}`;
                    if (!seenKeysCal.has(progKey)) {
                        seenKeysCal.add(progKey);
                        const course = courses.find(c => String(c.id) === String(prog.courseId));
                        const lecture = course?.lectures?.find(l => String(l.id) === String(prog.lectureId));
                        dayTickedEvents.push({
                            id: progKey,
                            courseId: prog.courseId,
                            lectureId: prog.lectureId,
                            courseTitle: prog.courseTitle || course?.title || 'Course',
                            lectureName: prog.lectureName || lecture?.displayName || 'Lecture',
                            duration: prog.lectureDuration || lecture?.duration || 3600,
                            timestamp: ts,
                            subfolder: prog.subfolder || ''
                        });
                    }
                }
            });

            // Calculate total hours studied for this specific day
            let dayStudiedSecs = 0;
            dayTickedEvents.forEach(h => {
                dayStudiedSecs += (h.duration || 3600);
            });
            const dayHours = Math.round((dayStudiedSecs / 3600) * 10) / 10;
            const calDayHoursDisplay = calView.querySelector('#cal-day-hours-studied');
            if (calDayHoursDisplay) {
                calDayHoursDisplay.innerHTML = `<i class="fas fa-history" style="color: #34d399; margin-right: 6px;"></i><span>${dayHours}h Studied</span>`;
            }

            // Fetch stored calendar events for this date
            const storedEvents = await getCalendarEventsForDate(dateStr);

            // Build hour slots
            for (let hour = 0; hour < 24; hour++) {
                const hourSlot = document.createElement('div');
                hourSlot.className = 'cal-hour-slot';
                hourSlot.dataset.hour = hour;
                hourSlot.style.height = HOUR_HEIGHT + 'px';

                const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
                hourSlot.innerHTML = `<div class="cal-hour-label">${label}</div><div class="cal-hour-line"></div>`;

                // Click to add event (only for today, or unlocked future)
                if (!future || isUnlocked) {
                    hourSlot.addEventListener('click', (e) => {
                        if (e.target.closest('.cal-event')) return;
                        showAddEventModal(dateStr, hour, 0, isUnlocked, () => renderCalendarDay(dateStr, isUnlocked));
                    });
                    hourSlot.style.cursor = 'pointer';
                    hourSlot.title = `Click to add event at ${label}`;
                }

                timeline.appendChild(hourSlot);
            }

            // Gather all day events for overlap layout
            const allDayEvents = [];

            // History-derived events (ticked/completed tasks)
            const hiddenHistory = JSON.parse(localStorage.getItem('cal_hidden_history') || '[]');
            dayTickedEvents.forEach(h => {
                if (hiddenHistory.includes(h.id)) return;
                const endTime = new Date(h.timestamp);
                const durationSecs = h.duration || 3600;
                const course = courses.find(c => c.id === parseInt(h.courseId));
                const faculty = course ? getSubfolderFacultyName(course, h.subfolder || '') : (h.courseTitle || 'Unknown');

                allDayEvents.push({
                    endMinute: endTime.getHours() * 60 + endTime.getMinutes(),
                    durationMins: Math.round(durationSecs / 60),
                    label: h.courseTitle || 'Unknown Subject',
                    tooltip: `${h.lectureName || 'Lecture'} — ${faculty}`,
                    type: 'history',
                    id: h.id,
                    courseId: h.courseId,
                    lectureId: h.lectureId,
                    subfolder: h.subfolder || '',
                    isCompleted: true,
                    canDelete: (!future || isUnlocked),
                    onDelete: () => renderCalendarDay(dateStr, isUnlocked)
                });
            });

            // Place stored calendar events (planned)
            storedEvents.forEach(ev => {
                let isCompleted = false;
                let cId = ev.courseId;
                let lId = ev.lectureId;
                let sub = ev.subfolder || '';

                if (!cId && ev.courseTitle) {
                    const match = courses.find(c => c.title === ev.courseTitle);
                    if (match) cId = match.id;
                }

                if (cId && lId && courseProgress[`${cId}_${lId}`]?.completed) {
                    isCompleted = true;
                }

                // Check if this planned event is already represented by a dayTickedEvent for the same lecture
                const alreadyInTicked = dayTickedEvents.some(h => {
                    if (cId && lId && String(h.courseId) === String(cId) && String(h.lectureId) === String(lId)) return true;
                    return false;
                });

                if (alreadyInTicked) return;

                allDayEvents.push({
                    endMinute: ev.endMinute,
                    durationMins: ev.durationMins,
                    label: ev.courseTitle || 'Planned',
                    tooltip: `${ev.lectureName || 'Lecture'} — ${ev.faculty || 'Faculty'}`,
                    type: 'planned',
                    id: ev.id,
                    courseId: cId,
                    lectureId: lId,
                    subfolder: sub,
                    isCompleted,
                    canDelete: (!future || isUnlocked),
                    onDelete: () => renderCalendarDay(dateStr, isUnlocked)
                });
            });

            // Calculate horizontal column layout for overlapping events
            layoutDayEvents(allDayEvents);
            window.currentCalendarAllDayEvents = allDayEvents;

            // Render all events
            allDayEvents.forEach(ev => {
                placeCalendarBlock(timeline, ev, HOUR_HEIGHT);
            });

            // Scroll to current system time minus 4 hours
            const currentHour = new Date().getHours();
            let scrollTo = Math.max(0, (currentHour - 4) * HOUR_HEIGHT);

            requestAnimationFrame(() => { timeline.scrollTop = Math.max(0, scrollTo); });
        }
        // Expose after definition
        window.renderCalendarDay = renderCalendarDay;

        function layoutDayEvents(events) {
            if (!events || events.length === 0) return;

            const uniqueMap = new Map();
            const uniqueEvents = [];
            events.forEach(ev => {
                const dMins = ev.durationMins && ev.durationMins > 0 ? ev.durationMins : 60;
                ev.startMinute = Math.max(0, ev.endMinute - dMins);
                ev.durationMins = dMins;
                const key = ev.id || `${ev.courseId || ev.label}_${ev.startMinute}_${ev.endMinute}_${Math.random()}`;
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, ev);
                    uniqueEvents.push(ev);
                }
            });

            events.length = 0;
            uniqueEvents.forEach(e => events.push(e));

            // Sort by start minute ascending, then end minute descending
            events.sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

            const overlapGroups = [];
            let currentGroup = [];
            let groupEnd = -1;

            events.forEach(ev => {
                if (currentGroup.length === 0) {
                    currentGroup.push(ev);
                    groupEnd = ev.endMinute;
                } else if (ev.startMinute < groupEnd) {
                    currentGroup.push(ev);
                    if (ev.endMinute > groupEnd) groupEnd = ev.endMinute;
                } else {
                    overlapGroups.push(currentGroup);
                    currentGroup = [ev];
                    groupEnd = ev.endMinute;
                }
            });
            if (currentGroup.length > 0) overlapGroups.push(currentGroup);

            overlapGroups.forEach(group => {
                // Sweep-line to find max overlaps
                const points = [];
                group.forEach(ev => {
                    points.push({ time: ev.startMinute, type: 1 });
                    points.push({ time: ev.endMinute, type: -1 });
                });
                points.sort((a, b) => a.time - b.time || a.type - b.type);
                
                let currentOverlap = 0;
                let maxOverlap = 0;
                points.forEach(p => {
                    currentOverlap += p.type;
                    if (currentOverlap > maxOverlap) maxOverlap = currentOverlap;
                });
                
                const totalCols = Math.max(1, maxOverlap);

                const columns = [];
                group.forEach(ev => {
                    let placed = false;
                    for (let c = 0; c < columns.length; c++) {
                        if (columns[c] <= ev.startMinute) {
                            columns[c] = ev.endMinute;
                            ev.colIndex = c;
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        ev.colIndex = columns.length;
                        columns.push(ev.endMinute);
                    }
                    ev.totalCols = totalCols;
                });
            });
        }

        function placeCalendarBlock(timeline, eventData, HOUR_HEIGHT, defaultCanDelete, defaultOnDelete) {
            const {
                endMinute, durationMins, label, tooltip, type, id, courseId, lectureId, subfolder, isCompleted
            } = eventData;
            
            const canDelete = eventData.canDelete !== undefined ? eventData.canDelete : defaultCanDelete;
            const onDelete = eventData.onDelete !== undefined ? eventData.onDelete : defaultOnDelete;

            const block = document.createElement('div');
            block.className = `cal-event cal-event-${type}`;
            eventData.element = block;

            const applyVisuals = (ev, el, isDrag = false) => {
                const absoluteTop = (ev.startMinute / 60) * HOUR_HEIGHT;
                const blockHeight = Math.max(30, (ev.durationMins / 60) * HOUR_HEIGHT);

                const leftCss = ev.totalCols === 1
                    ? '64px'
                    : `calc(64px + (${ev.colIndex} * ((100% - 72px) / ${ev.totalCols})))`;
                const widthCss = ev.totalCols === 1
                    ? 'auto'
                    : `calc(((100% - 72px) / ${ev.totalCols}) - 4px)`;
                const rightCss = ev.totalCols === 1 ? '8px' : 'auto';

                if (!isDrag) {
                    el.style.top = absoluteTop + 'px';
                }
                el.style.left = leftCss;
                el.style.width = widthCss;
                el.style.right = rightCss;
                el.style.height = blockHeight + 'px';
                
                if (!el.dataset.initAnim) {
                    requestAnimationFrame(() => {
                        el.style.transition = 'top 200ms ease-out, left 200ms ease-out, width 200ms ease-out, height 200ms ease-out, transform 0s, z-index 0.2s, box-shadow 0.2s, opacity 0.2s';
                        el.dataset.initAnim = 'true';
                    });
                }
            };
            
            applyVisuals(eventData, block);

            function formatTimeMin(min) {
                const h = Math.floor(min / 60) % 24;
                const m = min % 60;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayH = h % 12 === 0 ? 12 : h % 12;
                const displayM = String(m).padStart(2, '0');
                return `${displayH}:${displayM} ${ampm}`;
            }

            const updateTimeLabel = (el, sm, em) => {
                const timeStr = `${formatTimeMin(sm)} - ${formatTimeMin(em)}`;
                const tooltipEl = el.querySelector('.cal-event-tooltip');
                if (tooltipEl) tooltipEl.innerHTML = `🕒 ${timeStr} • ${tooltip}`;
                el.title = `${label} (${timeStr})\n${tooltip}${isCompleted || type === 'history' ? '\n✓ Completed' : ''}\n(Click to play lecture • Right-click to delete)`;
            };

            const PALETTE = [
                { bg: 'linear-gradient(135deg, rgba(99, 102, 241, 0.68), rgba(139, 92, 246, 0.58))', border: 'rgba(139, 92, 246, 0.65)', shadow: 'rgba(99, 102, 241, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.68), rgba(20, 184, 166, 0.58))', border: 'rgba(16, 185, 129, 0.65)', shadow: 'rgba(16, 185, 129, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.68), rgba(234, 88, 12, 0.58))', border: 'rgba(245, 158, 11, 0.65)', shadow: 'rgba(245, 158, 11, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.68), rgba(236, 72, 153, 0.58))', border: 'rgba(244, 63, 94, 0.65)', shadow: 'rgba(244, 63, 94, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(14, 165, 233, 0.68), rgba(59, 130, 246, 0.58))', border: 'rgba(14, 165, 233, 0.65)', shadow: 'rgba(14, 165, 233, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.68), rgba(217, 70, 239, 0.58))', border: 'rgba(168, 85, 247, 0.65)', shadow: 'rgba(168, 85, 247, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.68), rgba(245, 158, 11, 0.58))', border: 'rgba(239, 68, 68, 0.65)', shadow: 'rgba(239, 68, 68, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(132, 204, 22, 0.68), rgba(16, 185, 129, 0.58))', border: 'rgba(132, 204, 22, 0.65)', shadow: 'rgba(132, 204, 22, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(79, 70, 229, 0.68), rgba(6, 182, 212, 0.58))', border: 'rgba(79, 70, 229, 0.65)', shadow: 'rgba(79, 70, 229, 0.25)' },
                { bg: 'linear-gradient(135deg, rgba(109, 40, 217, 0.68), rgba(147, 51, 234, 0.58))', border: 'rgba(109, 40, 217, 0.65)', shadow: 'rgba(109, 40, 217, 0.25)' }
            ];

            let hash = 0;
            const strForHash = String(label || 'Event');
            for (let i = 0; i < strForHash.length; i++) {
                hash = (hash << 5) - hash + strForHash.charCodeAt(i);
                hash |= 0;
            }
            const colorScheme = PALETTE[Math.abs(hash) % PALETTE.length];
            const isDone = type === 'history' || isCompleted;

            block.style.position = 'absolute';
            block.style.zIndex = '5';
            block.style.background = colorScheme.bg;
            block.style.border = `1px solid ${colorScheme.border}`;
            block.style.boxShadow = `0 2px 12px ${colorScheme.shadow}`;
            block.style.backdropFilter = 'blur(8px)';
            block.style.cursor = (type === 'planned' && id && !isCompleted) ? 'grab' : 'pointer';
            block.style.opacity = isDone ? '0.88' : '1';
            block.tabIndex = 0;

            block.innerHTML = `
                <div class="cal-event-inner ${isDone ? 'cal-event-done' : ''}">
                    <div class="cal-event-label" style="${isDone ? 'text-decoration: line-through; opacity: 0.9;' : ''}">
                        ${isDone ? '<i class="fas fa-check-circle" style="color: #34d399; margin-right: 6px;"></i>' : ''}
                        ${label}
                    </div>
                    <div class="cal-event-tooltip"></div>
                    ${isDone ? '<div class="cal-strike-arrow"></div>' : ''}
                    ${canDelete && id ? `<button class="cal-event-delete" data-id="${id}" title="Remove event">×</button>` : ''}
                </div>
            `;
            
            updateTimeLabel(block, eventData.startMinute, eventData.endMinute);

            block.addEventListener('mouseenter', () => { if (block.style.cursor !== 'grabbing') block.style.zIndex = '20'; });
            block.addEventListener('mouseleave', () => { if (block.style.cursor !== 'grabbing') block.style.zIndex = '5'; });

            const playLecture = async () => {
                let targetCourseId = courseId;
                let targetLectureId = lectureId;
                if (!targetCourseId && label) {
                    const matchC = courses.find(c => c.title === label);
                    if (matchC) targetCourseId = matchC.id;
                }
                if (targetCourseId) {
                    const matchC = courses.find(c => String(c.id) === String(targetCourseId));
                    if (matchC && matchC.lectures && matchC.lectures.length > 0) {
                        if (!targetLectureId) targetLectureId = matchC.lectures[0].id;
                    }
                    if (typeof playLectureFromAnywhere === 'function') {
                        await playLectureFromAnywhere(targetCourseId, targetLectureId || null, 'history-view', subfolder || null);
                    }
                }
            };

            if (canDelete && id) {
                block.querySelector('.cal-event-delete').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (type === 'history' || isCompleted) {
                        const hidden = JSON.parse(localStorage.getItem('cal_hidden_history') || '[]');
                        hidden.push(id);
                        localStorage.setItem('cal_hidden_history', JSON.stringify(hidden));
                        window.calendarUndoStack = window.calendarUndoStack || [];
                        window.calendarUndoStack.push({ action: 'hide_history', id: id });
                    } else {
                        await deleteCalendarEvent(id);
                    }
                    if (onDelete) onDelete();
                });
            }

            // Keyboard Accessibility
            block.addEventListener('keydown', async (e) => {
                if (type === 'planned' && id && !isCompleted) {
                    const dMins = eventData.durationMins;
                    let step = e.shiftKey ? 60 : 15;
                    let newSm = eventData.startMinute;
                    
                    if (e.key === 'ArrowUp') {
                        newSm = Math.max(0, newSm - step);
                        e.preventDefault();
                    } else if (e.key === 'ArrowDown') {
                        newSm = Math.min(24 * 60 - dMins, newSm + step);
                        e.preventDefault();
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playLecture();
                        return;
                    } else {
                        return;
                    }

                    if (newSm !== eventData.startMinute) {
                        eventData.startMinute = newSm;
                        eventData.endMinute = newSm + dMins;
                        
                        await ensureDB();
                        const evRecord = await new Promise(r => {
                            const req = getStore(CALENDAR_STORE, 'readonly').get(Number(id));
                            req.onsuccess = ev => r(ev.target.result);
                            req.onerror = () => r(null);
                        });

                        if (evRecord) {
                            window.calendarUndoStack = window.calendarUndoStack || [];
                            window.calendarUndoStack.push({ action: 'update', event: { ...evRecord } });
                            evRecord.endMinute = eventData.endMinute;
                            await new Promise(r => {
                                const req = getStore(CALENDAR_STORE, 'readwrite').put(evRecord);
                                req.onsuccess = r;
                            });
                            if (onDelete) onDelete();
                        }
                    }
                } else {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        playLecture();
                    }
                }
            });

            // Pointer Event State Machine for Drag & Drop
            if (type === 'planned' && id && !isCompleted) {
                let isDragging = false;
                let startY = 0;
                let initialAbsoluteTop = 0;
                let initialStartMinute = eventData.startMinute;
                let pointerId = null;
                
                block.addEventListener('pointerdown', (e) => {
                    if (e.target.closest('.cal-event-delete')) return;
                    if (e.button !== 0 && e.pointerType === 'mouse') return;
                    
                    pointerId = e.pointerId;
                    block.setPointerCapture(pointerId);
                    
                    isDragging = false; // Pending
                    startY = e.clientY;
                    initialAbsoluteTop = (eventData.startMinute / 60) * HOUR_HEIGHT;
                    initialStartMinute = eventData.startMinute;
                    
                    block.addEventListener('pointermove', onPointerMove);
                    block.addEventListener('pointerup', onPointerUp);
                    block.addEventListener('pointercancel', onPointerUp);
                });

                const onPointerMove = (e) => {
                    const deltaY = e.clientY - startY;
                    
                    if (!isDragging) {
                        if (Math.abs(deltaY) > 6) { // 6px threshold
                            isDragging = true;
                            block.style.cursor = 'grabbing';
                            block.style.zIndex = '1000';
                            block.style.opacity = '0.96';
                            block.style.boxShadow = `0 12px 24px ${colorScheme.shadow}`;
                            block.style.transition = 'left 200ms ease-out, width 200ms ease-out, height 200ms ease-out';
                        } else {
                            return;
                        }
                    }

                    // Live following cursor
                    let newAbsoluteTop = initialAbsoluteTop + deltaY;
                    newAbsoluteTop = Math.max(0, Math.min(newAbsoluteTop, 24 * HOUR_HEIGHT - block.offsetHeight));
                    block.style.transform = `translateY(${newAbsoluteTop - initialAbsoluteTop}px) scale(1.02)`;

                    // Live snapping
                    const topMinutes = (newAbsoluteTop / HOUR_HEIGHT) * 60;
                    const snappedStartMins = Math.round(topMinutes / 15) * 15;
                    
                    if (snappedStartMins !== eventData.startMinute) {
                        eventData.startMinute = snappedStartMins;
                        eventData.endMinute = snappedStartMins + eventData.durationMins;
                        updateTimeLabel(block, eventData.startMinute, eventData.endMinute);
                        
                        const allEvents = window.currentCalendarAllDayEvents || [];
                        layoutDayEvents(allEvents);
                        allEvents.forEach(ev => {
                            if (ev.element) {
                                applyVisuals(ev, ev.element, ev === eventData);
                            }
                        });
                    }

                    // Auto scroll
                    const rect = timeline.getBoundingClientRect();
                    const edgeThreshold = 40;
                    if (e.clientY < rect.top + edgeThreshold) {
                        timeline.scrollTop -= 15;
                    } else if (e.clientY > rect.bottom - edgeThreshold) {
                        timeline.scrollTop += 15;
                    }
                };

                const onPointerUp = async (e) => {
                    block.removeEventListener('pointermove', onPointerMove);
                    block.removeEventListener('pointerup', onPointerUp);
                    block.removeEventListener('pointercancel', onPointerUp);
                    if (pointerId !== null) block.releasePointerCapture(pointerId);

                    if (!isDragging) {
                        playLecture();
                        return;
                    }

                    isDragging = false;
                    block.style.cursor = 'grab';
                    block.style.zIndex = '5';
                    block.style.opacity = '1';
                    block.style.transform = 'none';
                    block.style.boxShadow = `0 2px 12px ${colorScheme.shadow}`;
                    block.style.transition = 'top 200ms ease-out, left 200ms ease-out, width 200ms ease-out, height 200ms ease-out, transform 0s, z-index 0.2s, box-shadow 0.2s, opacity 0.2s';
                    
                    if (eventData.startMinute !== initialStartMinute) {
                        await ensureDB();
                        const evRecord = await new Promise(r => {
                            const req = getStore(CALENDAR_STORE, 'readonly').get(Number(id));
                            req.onsuccess = ev => r(ev.target.result);
                            req.onerror = () => r(null);
                        });

                        if (evRecord) {
                            window.calendarUndoStack = window.calendarUndoStack || [];
                            window.calendarUndoStack.push({ action: 'update', event: { ...evRecord } });
                            evRecord.endMinute = eventData.endMinute;
                            await new Promise(r => {
                                const req = getStore(CALENDAR_STORE, 'readwrite').put(evRecord);
                                req.onsuccess = r;
                            });
                        }
                    }
                    
                    applyVisuals(eventData, block, false);
                };
            } else {
                block.addEventListener('click', async (e) => {
                    if (e.target.closest('.cal-event-delete')) return;
                    playLecture();
                });
            }

            // Right click handler to show blurry context menu with "Delete Task"
            block.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const existingMenu = document.getElementById('cal-custom-contextmenu');
                if (existingMenu) existingMenu.remove();

                const menu = document.createElement('div');
                menu.id = 'cal-custom-contextmenu';
                menu.style.cssText = `
                    position: fixed;
                    top: ${e.clientY}px;
                    left: ${e.clientX}px;
                    z-index: 10000;
                    background: rgba(18, 18, 28, 0.78);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 12px;
                    padding: 6px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    min-width: 140px;
                `;

                menu.innerHTML = `
                    <div class="cal-context-item cal-delete-item" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; color: #f87171; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: background 0.15s ease;">
                        <i class="fas fa-trash-alt"></i> Delete Task
                    </div>
                `;

                const deleteBtn = menu.querySelector('.cal-delete-item');
                deleteBtn.addEventListener('mouseenter', () => { deleteBtn.style.background = 'rgba(239, 68, 68, 0.2)'; });
                deleteBtn.addEventListener('mouseleave', () => { deleteBtn.style.background = 'transparent'; });

                deleteBtn.addEventListener('click', async (evt) => {
                    evt.stopPropagation();
                    menu.remove();
                    if (id) {
                        if (type === 'history' || isCompleted) {
                            const hidden = JSON.parse(localStorage.getItem('cal_hidden_history') || '[]');
                            hidden.push(id);
                            localStorage.setItem('cal_hidden_history', JSON.stringify(hidden));
                            window.calendarUndoStack = window.calendarUndoStack || [];
                            window.calendarUndoStack.push({ action: 'hide_history', id: id });
                        } else {
                            await deleteCalendarEvent(id);
                        }
                        if (onDelete) onDelete();
                    }
                });

                document.body.appendChild(menu);

                const closeMenu = (evt) => {
                    if (!menu.contains(evt.target)) {
                        menu.remove();
                        document.removeEventListener('click', closeMenu);
                        document.removeEventListener('contextmenu', closeMenu);
                    }
                };
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                    document.addEventListener('contextmenu', closeMenu);
                }, 10);
            });

            timeline.appendChild(block);
        }

        function showAddEventModal(dateStr, hour, minute, isUnlocked, onSave) {
            // Remove any existing modal
            const existing = document.getElementById('cal-add-event-modal');
            if (existing) existing.remove();

            // Build subject options from courses
            const subjectMap = {};
            courses.forEach(course => {
                if (course.isIgnored) return;
                const name = course.title;
                if (!subjectMap[name]) subjectMap[name] = new Set();
                if (course.chapters) {
                    course.chapters.forEach(ch => {
                        const fac = getSubfolderFacultyName(course, ch.name);
                        subjectMap[name].add(fac);
                    });
                } else {
                    subjectMap[name].add(course.facultyName || 'Unknown Faculty');
                }
            });

            const subjectOptions = Object.keys(subjectMap).map(name =>
                `<option value="${name}">${name}</option>`
            ).join('');

            const labelHour = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

            const modal = document.createElement('div');
            modal.id = 'cal-add-event-modal';
            modal.className = 'cal-modal-overlay';
            modal.innerHTML = `
                <div class="cal-modal-content">
                    <div class="cal-modal-header">
                        <h3><i class="fas fa-plus-circle"></i> Add Study Event</h3>
                        <span class="cal-modal-close">×</span>
                    </div>
                    <div class="cal-modal-body">
                        <div class="cal-modal-time-badge">${labelHour}</div>
                        <div class="cal-form-group">
                            <label>Subject</label>
                            <select id="cal-subject-select" class="cal-select">
                                <option value="">— Select a subject —</option>
                                ${subjectOptions}
                            </select>
                        </div>
                        <div class="cal-form-group" id="cal-faculty-group" style="display:none;">
                            <label>Faculty</label>
                            <select id="cal-faculty-select" class="cal-select"></select>
                        </div>
                        <div class="cal-form-group">
                            <label>Number of Lectures</label>
                            <div class="cal-number-control">
                                <button type="button" id="cal-lec-dec">−</button>
                                <span id="cal-lec-count">1</span>
                                <button type="button" id="cal-lec-inc">+</button>
                            </div>
                        </div>
                        <div id="cal-modal-error" class="cal-modal-error"></div>
                    </div>
                    <div class="cal-modal-footer">
                        <button type="button" class="cal-btn-secondary" id="cal-modal-cancel">Cancel</button>
                        <button type="button" class="cal-btn-primary" id="cal-modal-save"><i class="fas fa-check"></i> Add Event</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            let lecCount = 1;
            document.getElementById('cal-lec-dec').onclick = () => { if (lecCount > 1) { lecCount--; document.getElementById('cal-lec-count').textContent = lecCount; }};
            document.getElementById('cal-lec-inc').onclick = () => { lecCount++; document.getElementById('cal-lec-count').textContent = lecCount; };

            const subjectSel = document.getElementById('cal-subject-select');
            const facultyGroup = document.getElementById('cal-faculty-group');
            const facultySel = document.getElementById('cal-faculty-select');

            subjectSel.addEventListener('change', () => {
                const name = subjectSel.value;
                if (name && subjectMap[name]) {
                    const faculties = Array.from(subjectMap[name]);
                    facultySel.innerHTML = faculties.map(f => `<option value="${f}">${f}</option>`).join('');
                    facultyGroup.style.display = faculties.length > 1 ? 'flex' : 'none';
                } else {
                    facultyGroup.style.display = 'none';
                }
            });

            modal.querySelector('.cal-modal-close').onclick = () => modal.remove();
            document.getElementById('cal-modal-cancel').onclick = () => modal.remove();

            document.getElementById('cal-modal-save').onclick = async () => {
                const subjectName = subjectSel.value;
                if (!subjectName) {
                    document.getElementById('cal-modal-error').textContent = 'Please select a subject.';
                    return;
                }
                const facultyName = facultySel.value || Array.from(subjectMap[subjectName] || [])[0] || 'Unknown';

                // Find next uncompleted lectures
                const lecs = getNextUncompletedLecture(subjectName, facultyName, lecCount);
                if (lecs.length === 0) {
                    document.getElementById('cal-modal-error').textContent = 'No uncompleted lectures found for this subject.';
                    return;
                }

                // Calculate end time based on lecture durations
                let currentMin = hour * 60 + minute;
                for (const lec of lecs) {
                    const durMins = Math.round((lec.duration || 3600) / 60);
                    const endMin = currentMin + durMins;
                    await addCalendarEvent({
                        date: dateStr,
                        courseId: lec.courseId,
                        courseTitle: lec.courseTitle || subjectName,
                        lectureId: lec.id,
                        lectureName: lec.displayName || lec.title || lec.name || 'Lecture',
                        faculty: facultyName,
                        durationMins: durMins,
                        endMinute: Math.min(endMin, 23 * 60 + 59),
                        eventType: 'planned',
                        source: 'manual'
                    });
                    currentMin = endMin;
                }

                modal.remove();
                if (onSave) onSave();
            };

            // Close on backdrop click
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

            // Animate in
            requestAnimationFrame(() => modal.classList.add('cal-modal-visible'));
        }

        // Make Playlist from calendar day events
        window.makeCalendarPlaylist = async function(dateStr, isUnlocked, onDone) {
            const currentEvents = window.currentCalendarAllDayEvents || [];
            
            // Sort events exactly by their visual top position (startMinute)
            const sortedEvents = [...currentEvents].sort((a, b) => a.startMinute - b.startMinute);

            const playlist = [];
            sortedEvents.forEach(ev => {
                const course = courses.find(c => String(c.id) === String(ev.courseId));
                let faculty = ev.faculty || '';
                if (!faculty && course) {
                    faculty = getSubfolderFacultyName(course, ev.subfolder || '');
                }
                
                playlist.push({
                    courseId: ev.courseId,
                    courseTitle: ev.courseTitle || (course ? course.title : 'Course'),
                    lectureId: ev.lectureId,
                    title: ev.label || 'Lecture',
                    duration: (ev.durationMins || 60) * 60,
                    facultyName: faculty,
                    chName: ev.subfolder || ''
                });
            });

            if (playlist.length === 0) {
                alert('No events found for this day to create a playlist.');
                return;
            }

            localStorage.setItem('courseflix_calendar_playlist_date', dateStr);
            localStorage.setItem('courseflix_calendar_playlist', JSON.stringify(playlist));

            // Start playlist from first item that has a valid course
            const firstItem = playlist.find(p => p.courseId && p.lectureId);
            if (firstItem) {
                await renderCalendarPlayer(firstItem.courseId, firstItem.lectureId);
            } else {
                alert('Playlist created! Navigate to the player to start watching.');
            }
        };

    
    
};