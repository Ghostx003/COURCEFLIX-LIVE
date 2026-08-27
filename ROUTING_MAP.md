# CourseFlix — Routing & Navigation Architecture Map (Phase 7A Audit)

> **Document Status**: Complete Audit & Discovery Baseline  
> **Target Branch**: `risky-asf-bruh`  
> **Rollback Baseline**: `working-fine-x03` (Protected)  
> **Author**: Antigravity Assistant  
> **Date**: August 2026  

---

## Executive Summary

CourseFlix's navigation is a hybrid system built on top of imperative DOM class toggling (`.view.active`), browser URL hash manipulation (`#view-id`, `#subcourse/id/path`), and `sessionStorage` player context persistence (`courseflixState`). 

Historically, navigation was orchestrated entirely by `switchView(viewId, pushState)` inside `public/legacy.js`. In Phase 5 & 6, React assumed ownership of the primary Courses Dashboard and course collection state. This audit provides the foundational blueprint for **Phase 7B (React Navigation & Routing Ownership)** without modifying any existing runtime behavior.

---

## 1. Complete View Inventory (All 26 Views)

| View Identifier | DOM ID | React Component | Legacy Renderer | Navigation Entry Points | URL / Hash Contract | State Dependencies | Events & Side Effects | Special Behavior | Migration Status |
|---|---|---|---|---|---|---|---|---|---|
| **Landing Page** | `home-view` | `src/components/views/HomeView.jsx` | `renderHomeView()` | Top logo, `#home-btn`, empty hash `#` | `#home-view` or `""` | `getCourseflixStats()` | `courseflix:courses-loaded`, `courseflix:data-updated` | Displays hero stats, GATE curriculum pools, quick launches | `Pending Phase 8` |
| **Courses Dashboard** | `dashboard-view` / `dashboard-view-el` | `src/components/views/DashboardViewElView.jsx` | `CourseGrid.jsx` (React-owned in Phase 5) | Navbar Dashboard link, back buttons, escape key | `#dashboard-view` | `useCourses()`, `localStorage:courseSortPref`, `hide_ignored` | `courseflix:data-updated`, `open-completion-modal` | Instant render from pre-cached stats; drag-and-drop ordering | **React Owned (Phase 5)** |
| **Subcourse Explorer** | `subcourse-view` | `src/components/views/SubcourseView.jsx` | `renderSubcourseView(courseId, basePath)` | Course card "Enter Course" button, search results, subfolder cards | `#subcourse/<id>/<path>` | `courseId`, `basePath`, `origin`, `resumePath` | Updates `viewEl.dataset`, checks directory read permission | Recursive folder hierarchy; auto-enters player if no subfolders | `Pending Phase 8` |
| **Video Player** | `player-view` | `src/components/views/PlayerView.jsx` | `renderPlayer()`, `renderGoalsPlayer()`, `renderStudyTogetherPlayer()` | Lecture click, "Play Now", continue card, deep links | *None* (omits hash; uses `sessionStorage`) | `currentCourse`, `lectureId`, `currentTime`, `origin` | Hides `<nav>`, pauses noise/video on exit, saves progress | Fullscreen video player, sidebar syllabus, PDF viewer, pip | `Pending Phase 10 (Last)` |
| **Goals & Targets** | `goals-view` | `src/components/views/GoalsView.jsx` | `renderGoalsView()` | Navbar "Goals" link, completion modal shortcut | `#goals-view` | `courseflix_goals`, daily target logs | Dispatches playlist launch to player | Daily lecture targets, playlist continuous playback | `Pending Phase 8` |
| **Study Planner** | `plan-view` | `src/components/views/PlanView.jsx` | `renderPlanView()` | Navbar "Planner" button | `#plan-view` | `courseflix_schedules`, `courseflix_calendar_notes` | Synchronizes calendar repository | Interactive calendar, study schedule allocation | `Pending Phase 8` |
| **Performance** | `progress-view` | `src/components/views/ProgressView.jsx` | `renderProgressView()` | Navbar "Performance" button, time pill click | `#progress-view` | `courseflix_logs`, `courseProgressCache` | Loads `static/progress.html` iframe | Visual charts, study time distribution, subject metrics | `Pending Phase 9` |
| **Upload / Manage** | `upload-view` | `src/components/views/UploadView.jsx` | `renderUploadView()` | Navbar "Upload" link | `#upload-view` | File System Access API handles | Scans directory tree, validates video formats | Folder import, folder relinking, custom JSON export | `Pending Phase 8` |
| **DPP Hub** | `dpp-view` | `src/components/views/DppView.jsx` | `renderDppCourseSelectionView()`, `renderDppDetailView()` | Navbar "DPP" link, deep hash `#dpp/<id>` | `#dpp-view` or `#dpp/<id>` | `dppRepository`, `courseflix_dpp` | Opens PDF viewer, solution toggles | Daily practice problems, solution keys, PDF viewer | `Pending Phase 8` |
| **DPP Upload** | `dpp-upload-view` | `src/components/views/DppUploadView.jsx` | `renderDppUploadView()` | Upload button inside DPP view | `#dpp-upload-view` | File System PDF handles | Persists DPP attachments | PDF batch uploader and chapter assignment | `Pending Phase 8` |
| **Notes Hub** | `notes-view` | `src/components/views/NotesView.jsx` | `renderNotesCourseSelectionView()`, `renderNotesDetailView()` | Navbar "Notes" link | `#notes-view` | `notesService`, lecture attachments | Embedded PDF viewer modal | Hand-written notes, lecture summary sheets, search | `Pending Phase 8` |
| **Doubts Hub** | `doubts-view` | `src/components/views/DoubtsView.jsx` | `renderDoubtsCourseSelectionView()`, `renderDoubtsDetailView()` | Navbar "Doubts" link with badge count | `#doubts-view` | `doubtsRepository`, `doubtsDashboard` | `doubtsUpdated` event | Screenshot gallery, doubt notes, timestamp bookmarks | `Pending Phase 8` |
| **Continue Watching** | `continue-view` | `src/components/views/ContinueView.jsx` | `renderContinueView()` | Navbar "Continue" link | `#continue-view` | In-progress lecture map (`progressService`) | Launches player with resume timestamp | Resume unfinished lectures sorted by last watched date | `Pending Phase 9` |
| **Watch History** | `history-view` | `src/components/views/HistoryView.jsx` | `renderHistoryView()` | Navbar "History" link | `#history-view` | `historyRepository` | Chronological event logs | Daily watch logs, completed lectures timeline | `Pending Phase 9` |
| **Faculty Hub** | `faculty-view` | `src/components/views/FacultyView.jsx` | `renderFacultyView()`, `renderFacultyProfile()` | Navbar "Faculty" link, faculty click in cards | `#faculty-view` | `courseflix_faculty_aliases`, ratings | Star faculty filtering, merge teachers | Faculty profiles, course assignments, alias merger | `Pending Phase 8` |
| **Review Batch** | `review-view` | `src/components/views/ReviewView.jsx` | `showFilteredCoursesView('review')` | Navbar Mode toggle "Review" switch | `#review-view` | Lecture status `status === 'review'` | Batch player "Study Together" | Filtered view of all lectures flagged for review | `Pending Phase 8` |
| **Practice Batch** | `practice-view` | `src/components/views/PracticeView.jsx` | `showFilteredCoursesView('practice')` | Navbar Mode toggle "Practice" switch | `#practice-view` | Lecture status `status === 'practice'` | Batch player "Study Together" | Filtered view of all lectures flagged for practice | `Pending Phase 8` |
| **Intell Smart Notes** | `intell-view` | `src/components/views/IntellView.jsx` | `renderIntellView()` | Smart notes button, shortcut | `#intell-view` | Local Markdown store, lecture IDs | Fullscreen editor, split preview | Markdown editor, lecture notes indexing, AI summaries | `Pending Phase 8` |
| **Global Search** | `search-results-view` | `src/components/views/SearchResultsView.jsx` | `renderSearchResultsView()` | Header search input, `Ctrl+Space` shortcut | *Dynamic overlay* | Search query, `searchView.dataset.origin` | Returns on `Escape` or back arrow | Fuzzy search across courses, chapters, and lectures | `Pending Phase 8` |
| **Filter Results** | `filter-results-view` | `src/components/views/FilterResultsView.jsx` | `renderFilterResultsView()` | Review/Practice course cards | `#filter-results-view` | Filter type (`review`/`practice`), courseId | Batch playlists | Status-filtered lecture list for a single course | `Pending Phase 8` |
| **Contact View** | `contact-view` | `src/components/views/ContactView.jsx` | Static React View | Footer / Settings links | `#contact-view` | None | None | Help, keyboard shortcuts, version info | `Pending Phase 8` |
| **Intell Full Note** | `intell-full-note-view` | Inside `IntellView.jsx` | `renderIntellFullNoteView()` | Note card click in Intell view | *Internal Subview* | Active note id | Markdown formatting | Distraction-free markdown reader/writer | `Pending Phase 8` |
| **Upload Detail** | `upload-detail-view` | Inside `UploadView.jsx` | `renderUploadDetailView()` | Course card in Upload view | *Internal Subview* | Course ID | Scan handle | Course file structure manager | `Pending Phase 8` |
| **Upload Subfolder** | `upload-subfolder-view` | Inside `UploadView.jsx` | `renderUploadSubfolderView()` | Subfolder in Upload view | *Internal Subview* | Course ID, Subfolder | Scan handle | Subfolder file structure manager | `Pending Phase 8` |
| **Doubts Detail** | `doubts-detail-view` | Inside `DoubtsView.jsx` | `renderDoubtsDetailView()` | Course card in Doubts view | *Internal Subview* | Course ID | Doubt screenshots | Course-specific doubt manager | `Pending Phase 8` |
| **Course Detail** | `course-detail-view` | Legacy Placeholder | None | Unused legacy placeholder | *Internal Subview* | None | None | Deprecated placeholder | `To Be Removed` |

---

## 2. Current Active-View Mechanism

```
DOM Class Toggling:
  ├── .view.active           -> display: block / flex / grid (Active View)
  ├── .view (inactive)       -> display: none
  ├── .nav-link.active       -> Highlights corresponding Navbar Tab
  └── nav (hidden/visible)   -> Hidden during 'player-view', visible everywhere else
```

### Mechanism Details:
1. All 26 view containers are permanently present in the DOM within `src/App.jsx`.
2. Visibility is controlled via CSS rule `.view:not(.active) { display: none !important; }`.
3. When switching views, `switchView(viewId)` iterates over all `document.querySelectorAll('.view')` and toggles `.classList.toggle('active', view.id === targetId)`.
4. Special mapping: when `viewId === 'dashboard-view'`, target DOM ID is `dashboard-view-el`.

---

## 3. `switchView()` Complete Breakdown

The canonical implementation resides in `public/legacy.js` (lines 1328–1395):

```javascript
function switchView(viewId, pushState = true) {
    // 1. Navigation Bar Visibility
    const navEl = document.querySelector('nav') || nav;
    if (navEl) {
        if (viewId === 'player-view') {
            navEl.classList.add('hidden');
        } else {
            navEl.classList.remove('hidden');
        }
    }
    window.switchView = switchView;
    
    // 2. History Push / Hash Sync
    if (pushState && viewId !== 'subcourse-view' && viewId !== 'player-view') {
        const newHash = '#' + viewId;
        if (window.location.hash !== newHash) {
            window.history.pushState(null, '', newHash);
        }
    }

    // 3. View DOM Class Activation
    const targetId = viewId === 'dashboard-view' ? 'dashboard-view-el' : viewId;
    document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view.id === targetId));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === viewId));
    
    // 4. Deferred View Data Initialization (10ms timeout)
    setTimeout(async () => {
        await ensureDB();
        if (viewId === 'review-view' || viewId === 'practice-view') {
            showFilteredCoursesView(viewId.split('-')[0]);
        }
        if (viewId === 'dashboard-view') renderCourseGrid();
        if (viewId === 'intell-view') { if (typeof renderIntellView === 'function') renderIntellView(); }
        if (viewId === 'upload-view') {
             const detailView = document.getElementById('upload-detail-view');
             const subfolderView = document.getElementById('upload-subfolder-view');
             if ((!detailView || detailView.classList.contains('hidden')) && (!subfolderView || subfolderView.classList.contains('hidden'))) {
                 document.getElementById('upload-course-grid').classList.remove('hidden');
                 renderUploadView();
             }
        }
        if (viewId === 'dpp-view') {
            const detailContainer = document.getElementById('dpp-detail-container');
            if (!detailContainer || detailContainer.classList.contains('hidden')) {
                renderDppCourseSelectionView();
            }
        }
        if (viewId === 'notes-view') {
            const detailContainer = document.getElementById('notes-detail-container');
            if (!detailContainer || detailContainer.classList.contains('hidden')) {
                renderNotesCourseSelectionView();
            }
        }
        if (viewId === 'doubts-view' && typeof window.renderDoubtsCourseSelectionView !== 'function') renderDoubtsCourseSelectionView();
        if (viewId === 'continue-view') renderContinueView();
        if (viewId === 'history-view') renderHistoryView();
        if (viewId === 'faculty-view') renderFacultyView();
    }, 10);
    
    // 5. Non-Player Teardown & Cleanup
    if (viewId !== 'player-view') {
        window.customLectureTracking = null;
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
```

### Critical Findings:
* `switchView` is **both a router and an initializer**.
* It teardowns media playback (video, brown noise audio).
* It enforces `sessionStorage` cleanup when moving away from the player.
* It uses a 10ms `setTimeout` to await IndexedDB readiness before calling legacy view renderers.

---

## 4. Navigation Events Map

| Event Name | Dispatcher / Emitter | Listener | Purpose | React Replacement Path | Status |
|---|---|---|---|---|---|
| `hashchange` | Browser URL navigation, `switchView()`, manual back/forward | `handleRoute()` in `legacy.js`, `Navbar.jsx` | Reacts to hash URL changes | React RouterContext state listener | `Active` |
| `popstate` | Browser back / forward buttons | `legacy.js`, Browser window | Restores previous history state | React RouterContext popstate handler | `Active` |
| `courseflix-hide-ignored-changed` | `Navbar.jsx` toggle button | `DashboardViewElView.jsx`, `legacy.js` | Toggles display of ignored courses/subfolders | React CourseContext / Settings state | `Active` |
| `courseflix:courses-loaded` | `courseService.getCourses()`, `loadCoursesFromDB()` | `useCourses.js`, `CourseContext.jsx`, `HomeView.jsx` | Notifies that courses collection is loaded | Direct React Context subscription | `Active` |
| `courseflix:data-updated` | `courseService`, `progressService`, `legacy.js` | `useCourses.js`, `DashboardViewElView.jsx`, `HomeView.jsx` | Notifies when progress or metadata changes | Direct React Context subscription | `Active` |
| `open-completion-modal` | `Navbar.jsx` "Completion" button | `CompletionModal.jsx` | Displays completion tracker modal | React Modal Context or state | `Active` |
| `open-settings-modal` | `Navbar.jsx` Settings gear, Dashboard settings gear | Settings modal container | Displays settings modal overlay | React Modal Context or state | `Active` |
| `open-custom-course-creator`| Upload view custom button | `CustomCourseCreatorModal.jsx` | Opens custom course creator modal | React Modal Context or state | `Active` |
| `doubtsUpdated` | `doubtService.js` mutations | `Navbar.jsx` (doubts counter badge) | Updates navbar badge counter | React DoubtContext / Badge state | `Active` |

---

## 5. URL Hash Contract

```
URL Hash Hierarchy:
  ├── Standard View Route    : #[view-id]             (e.g., #dashboard-view, #goals-view)
  ├── Subcourse Direct Link  : #subcourse/[id]/[path] (e.g., #subcourse/171800/Algorithms)
  ├── DPP Direct Link        : #dpp/[id] or #pb/[id]  (e.g., #dpp/171800)
  ├── Root Fallback          : "" or "#" -> Redirects to #home-view
  └── Player View            : Omits URL Hash (Managed via sessionStorage:courseflixState)
```

### Hash Handling in `handleRoute()`:
1. If hash is empty: calls `switchView('home-view', false)`.
2. If hash is `filter-results-view`: redirects to `#home-view`.
3. If hash starts with `subcourse/`: parses `courseId` and `path`, calls `renderSubcourseView(courseId, path, false)`.
4. If hash contains `dpp`, `practice`, or `pb`: parses course and calls `renderDppDetailView(courseId)` or `renderDppCourseSelectionView()`.
5. If hash ends with `-view`: directly calls `switchView(hash, false)`.

---

## 6. `sessionStorage` Player State Contract

Key: `courseflixState`  
Storage format: JSON string

```json
{
  "view": "player-view",
  "courseId": 1724750000000,
  "lectureId": "lec-01-intro",
  "currentTime": 142.5,
  "lastView": "subcourse-view",
  "sidebarCollapsed": false,
  "subfolder": "01 Introduction",
  "isGoalsPlaylist": false
}
```

### Lifecycle Rules:
1. **Creation**: Saved continuously by the video player timeupdate listener (`saveLectureProgress()`, `renderPlayer()`).
2. **F5 / Page Reload**: On app startup (`legacy.js:main()`), if `sessionStorage.getItem('courseflixState')` exists and reload is detected, automatically restores the player session with saved lecture and playback timestamp.
3. **Explicit Navigation Away**: When navigating to another view via `switchView(viewId)` where `viewId !== 'player-view'`, `sessionStorage.removeItem('courseflixState')` is called.

---

## 7. Global Routing State Inventory

| Global Variable | Type | Primary Writer | Primary Reader | Migration Action |
|---|---|---|---|---|
| `window.switchView` | Function | `legacy.js` | `Navbar.jsx`, `HomeView.jsx`, card buttons | Wrap with React router `navigate()` compatibility bridge |
| `window.lastView` | String | `renderPlayer()`, `renderSubcourseView()` | `backToLibraryBtn` click handler | Transition to React route history stack |
| `window.currentCourse` | Object | `playerService.js`, `legacy.js:renderPlayer()` | Player view, syllabus renderer | Transition to React Player/Course Context |
| `window.currentActiveCourse` | Object | `playerService.js` | Video player lifecycle | Transition to React Player Context |
| `window.currentLectureId` | String | `playerService.js`, `legacy.js:renderPlayer()` | Syllabus active highlight | Transition to React Player Context |
| `window.currentActiveLectureId` | String | `playerService.js` | Video player progress updater | Transition to React Player Context |
| `window.lastViewedFaculty` | String | `FacultyView.jsx`, card clicks | Player / Subcourse back buttons | Transition to React route navigation params |
| `window.customLectureTracking` | Object | External custom link player | Player teardown | Transition to React Player Context |
| `window.closeSearchAndReturnToOrigin`| Function | `legacy.js` | Global search modal, Escape key handler | Transition to React Search component state |
| `window.openGlobalSearchShortcut` | Function | `legacy.js` | `App.jsx` (`Ctrl+Space` keydown) | Transition to React Search component state |

---

## 8. Navbar Navigation Flow

In [`src/components/Navbar.jsx`](file:///e:/projects/courceflix-react/src/components/Navbar.jsx):

```
User Clicks Nav Link (e.g., Dashboard, DPP, Notes, History, Goals)
  │
  ▼
handleToggleMode(targetView)
  │
  ├─► typeof window.switchView === 'function' ? window.switchView(targetView)
  │   └── Activates .view.active, updates hash, triggers deferred renderers
  │
  └─► Fallback: window.location.hash = `#${targetView}`
      └── Triggers 'hashchange' -> handleRoute()
```

Navbar also manages the **Mode Toggle Switch** between `Review Mode` (`#review-view`) and `Practice Mode` (`#practice-view`) with animated sliding pill indicators.

---

## 9. Deep Links & Query Parameters

The application recognizes two query parameter workflows in `legacy.js:main()`:
1. `?playGoalsPlaylist=1&playCourse=<id>&playLecture=<id>`: Clears URL parameters via `history.replaceState` and launches `renderGoalsPlayer()`.
2. `?playCourse=<id>&playLecture=<id>`: Clears URL parameters via `history.replaceState` and launches `playLectureFromAnywhere(id, lectureId, 'dashboard-view')`.

---

## 10. Browser Navigation (Back / Forward)

* **Back / Forward Support**: Supported via `window.addEventListener('hashchange', handleRoute)`.
* When user clicks Browser Back/Forward:
  * Browser updates `window.location.hash`.
  * `handleRoute()` triggers.
  * Correct view is switched and rendered.
* **Player Exception**: The player view avoids writing `#player-view` to the URL hash, relying on `backToLibraryBtn` or browser back to return to the caller's origin view stored in `dataset.origin` / `lastView`.

---

## 11. React vs Legacy Dependencies & Race Condition Analysis

### Potential Race Conditions:
1. **Startup Race Condition**: React mounts `DashboardViewElView`, while legacy `main()` executes `switchView(initialTargetView)`. If initial hash is `#faculty-view`, `main()` must switch to `faculty-view` without triggering double renders or dashboard flash.
2. **Deferred Initialization Delay**: `legacy.js:switchView` uses `setTimeout(..., 10)`. As views migrate to React, React lifecycle (`useEffect`) must handle initialization rather than arbitrary timer delays.
3. **Dual Hash Writing**: If both React state and legacy `switchView` push state to `window.history`, it could create duplicate browser history entries.

---

## 12. Proposed React Routing Architecture (Phase 7B Foundation)

A zero-dependency, lightweight React Router:

```
┌─────────────────────────────────────────────────────────────┐
│                    <RouterProvider>                         │
│   (Holds activeView, routeParams, historyStack, navigate)   │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
       React View Switcher           window.switchView Bridge
    (Renders active React view)     (Keeps legacy.js in sync)
```

### Proposed Core Hook API (`src/hooks/useRouter.js`):
* `currentView`: active view identifier (e.g. `'dashboard-view'`).
* `params`: route parameters (e.g. `{ courseId, subpath }`).
* `navigate(viewId, options)`: programmatic navigation with pushState / replaceState options.
* `goBack()`: navigates back to origin view or previous history entry.

---

## 13. Safety & Verification Summary

* **Active Working Branch**: `risky-asf-bruh`
* **Untouched Rollback Branch**: `working-fine-x03`
* **Zero Legacy Deletions in Phase 7A**: `switchView()`, `handleRoute()`, and all global variables remain 100% operational.
* **Build Verification**: Tested with `cmd /c npm run build` (0 errors).

---

*End of Routing & Navigation Map.*
