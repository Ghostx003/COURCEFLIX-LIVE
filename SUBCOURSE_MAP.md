# CourseFlix — Subcourse & Course Detail Architecture Map (Phase 8A Audit)

> **Document Status**: Complete Subcourse View Dependency Audit & Discovery Baseline  
> **Target Branch**: `risky-asf-bruh`  
> **Rollback Baseline**: `working-fine-x03` (Protected)  
> **Author**: Antigravity Assistant  
> **Date**: August 2026  

---

## Executive Summary

The **Subcourse View** (`#subcourse-view`, URL hash `#subcourse/<courseId>/<path>`) is CourseFlix's recursive hierarchy explorer. It sits architecturally between the **Courses Dashboard** (React-owned in Phase 5/6) and the **Video Player** (legacy, deferred to Phase 10). 

When a course contains structured chapter folders (or custom nested topics), the Subcourse View extracts immediate subdirectories, renders interactive subcourse cards displaying progress, video count, remaining duration, rating, teacher/faculty metadata, thumbnail, and folder action tools, and allows users to drill down arbitrarily deep into the directory tree or launch direct video playback.

---

## 1. Complete Subcourse Navigation Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Courses Dashboard                               │
│                   (User clicks "Enter Course")                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
      Is course.isSplitView && isLinked?        Direct lecture course?
               │                                         │
               ▼                                         ▼
   #subcourse/<courseId>/ (Root)              Direct to Player View
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Subcourse View (Base Path)                        │
│             Displays immediate subfolders as course cards              │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
      User clicks Subfolder with deeper       User clicks leaf subfolder
            isSplitView checked               or non-split topic
                    │                                │
                    ▼                                ▼
   #subcourse/<courseId>/<subfolder>         playLectureFromAnywhere(...)
    (Recurses into deeper subfolder)                 │
                    │                                ▼
                    │                        Video Player View
                    │                     (Sets origin dataset &
                    │                      shows "Back to Folder")
                    │                                │
                    ▼                                ▼
            Browser Back / Header Back <─────────────┘
          (Returns to exact parent path)
```

### Flow Walkthrough:
1. **Entry from Dashboard**: User clicks "Enter Course" on a course card. If `course.isSplitView && course.isLinked`, legacy `renderSubcourseView(course.id, '')` is invoked, and URL hash updates to `#subcourse/<courseId>`.
2. **Subfolder Resolution**: Finds all chapters matching `basePath`. Extracts immediate first-level folder names and sorts them using `naturalSortByNameOnly`.
3. **Auto-Enter Player Jump**: If `immediateSubfolders.length === 0` (leaf folder with no child subdirectories), it immediately executes `playLectureFromAnywhere(course.id, null, 'subcourse-view', basePath)`.
4. **Drill Down**: User clicks "Enter Course" on a subfolder card:
   - If `subData.isSplitView` is checked, navigates deeper to `#subcourse/<courseId>/<subfolder>`.
   - If not split further, directly launches video player for that subfolder.
5. **Back Navigation**:
   - Leaf to deeper folder &rarr; `getParentPath(currentPath)`.
   - Root folder (`basePath === ''`) &rarr; returns to origin view (`dashboard-view`, `home-view`, `faculty-view`, `continue-view`, or `search-results-view`).
6. **Page Reload (F5)**: The URL hash `#subcourse/<courseId>/<path>` is parsed on startup by `handleRoute()` / `RouterContext.parseLocation()` and restores the exact subfolder view and path hierarchy without data loss.

---

## 2. Legacy Functions Map

| Function Name | Defined At | Primary Callers | Input Arguments | Output / Action | Globals / State Used | Side Effects |
|---|---|---|---|---|---|---|
| `renderSubcourseView` | `public/legacy.js:1990` | Card clicks, `handleRoute()`, back buttons, thumbnails, deletions | `courseId` (num/str), `basePath` (str), `pushState` (bool) | Imperatively builds `#subcourse-grid` HTML; calls `switchView('subcourse-view')` | `courses`, `courseProgress`, `localStorage:hide_ignored` | Requests FileSystem permission if unlinked; updates DOM; syncs history hash |
| `getSubfolderDisplayName` | `public/legacy.js:1005` | `renderSubcourseView`, `renderPlayer`, card templates | `course` (obj), `subfolder` (str) | `string` (customName or basename) | `course.subCourseData` | None (pure resolver) |
| `getSubfolderFacultyName` | `public/legacy.js:1013` | `renderSubcourseView`, `renderPlayer`, faculty editor | `course` (obj), `fullPath` (str) | `string` (faculty name or `'N/A Faculty'`) | `course.subCourseData`, `course.facultyName` | Walks path ancestors backwards to inherit teacher name |
| `getParentPath` | `public/legacy.js:326` | Back button, delete/thumbnail callbacks | `path` (str) | `string` (parent path without trailing slash) | None | Splits by `'/'` and pops last segment |
| `isSubfolderPathHidden` | `public/legacy.js:654` | `renderSubcourseView`, `playLectureFromAnywhere` | `course` (obj), `subfolderPath` (str) | `boolean` (true if deleted/hidden) | `course.subCourseData` | Case-insensitive prefix/suffix search |
| `isSubfolderPathIgnoredOrHidden` | `public/legacy.js:640` | Progress calculations, global timer | `course` (obj), `subfolderPath` (str) | `boolean` (true if ignored or hidden) | `course.subCourseData` | Checks `.isIgnored` or `.hidden` |
| `calculateCourseProgress` | `public/legacy.js:1035` | `renderSubcourseView`, Dashboard, stats | `course` (obj), `forceRecalculate` (bool), `targetSubfolder` (str) | `{ completed, total, percentage, remainingDuration, totalDuration }` | `courseProgress`, `courseProgressCache` | Reads pre-cached `subCourseStats` if available |

---

## 3. React Components Audit

### Current Status:
* **[`src/components/views/SubcourseView.jsx`](file:///e:/projects/courceflix-react/src/components/views/SubcourseView.jsx)**:
  * Currently an empty 13-line shell rendering static containers:
    ```jsx
    <div id="subcourse-view" className="view">
        <div className="view-header">
            <a className="back-link" id="back-to-dashboard-from-sub">← Back to Dashboard</a>
            <h2 id="subcourse-parent-title"></h2>
        </div>
        <main id="subcourse-grid" className="grid-container"></main>
    </div>
    ```

### Proposed Phase 8B React Subcomponents:
1. `SubcourseView.jsx`: Main container subscribing to `useRouter()`, resolving active course and `basePath`.
2. `SubcourseHeader.jsx`: Title display, dynamic breadcrumb/back-link respecting `origin` (`dashboard`, `home`, `faculty`, `search`, `continue`, or parent folder).
3. `SubcourseGrid.jsx`: Renders grid of subfolder cards, empty state messages, and filtered ignored elements.
4. `SubcourseCard.jsx`: Reusable subfolder card supporting:
   - Thumbnail placeholder / preview with relocate, refresh, remove-thumbnail, and delete buttons.
   - Inline double-click title and faculty editor.
   - Star rating widget.
   - Ignore topic checkbox.
   - Split further checkbox.
   - Progress bar and completed/total lecture metrics.
   - "Enter Course" action button.

---

## 4. URL / Hash Contract

```
Format: #subcourse/<courseId>/<encodedPath>

Examples:
  Root Subcourse : #subcourse/1718000000000
  Single Level   : #subcourse/1718000000000/Algorithms
  Nested Path    : #subcourse/1718000000000/GATE%20CS%2FAlgorithms%2FSorting
  Custom String  : #subcourse/custom_1720000000000/Unit%201
```

### Parsing Rules (`RouterContext.jsx:parseLocation`):
* Prefix: `subcourse/`
* Course ID: First token before `/` (e.g. `1718000000000`).
* Subpath: Remainder of the hash string after `courseId/`, decoded via `decodeURIComponent()`.
* Missing path: Defaults to `""` (root level).
* Invalid Course: If `courseId` does not match any course in `courses`, safely fallback to `#dashboard-view`.

---

## 5. Course Data Dependencies

The Subcourse View operates purely on the in-memory/IndexedDB `course` document structure:

```json
{
  "id": 1718000000000,
  "title": "Computer Science GATE",
  "facultyName": "Dr. Smith",
  "thumbnail": "data:image/jpeg;base64,...",
  "isSplitView": true,
  "isLinked": true,
  "isCustomCourse": false,
  "chapters": [
    { "name": "Algorithms/Sorting", "lectures": [...] },
    { "name": "Algorithms/Graphs", "lectures": [...] },
    { "name": "Operating Systems", "lectures": [...] }
  ],
  "subCourseData": {
    "Algorithms": {
      "customName": "Algorithms & Data Structures",
      "facultyName": "Prof. Alan",
      "thumbnail": "data:image/png;base64,...",
      "rating": 5,
      "isSplitView": true,
      "isIgnored": false,
      "hidden": false
    },
    "Algorithms/Sorting": {
      "rating": 4,
      "isSplitView": false,
      "isIgnored": false,
      "hidden": false
    }
  },
  "subCourseStats": {
    "Algorithms": {
      "total": 45,
      "completed": 20,
      "percentage": 44.4,
      "totalDuration": 162000,
      "remainingDuration": 90000
    }
  }
}
```

---

## 6. FileSystem Access API Dependencies

### Pure UI Operations (0 FileSystem Access required):
* Rendering subfolder cards
* Breadcrumb navigation
* Editing subfolder custom title
* Editing subfolder faculty name
* Rating subfolders
* Checking "Ignore" or "Split Further"
* Deleting / hiding a subfolder
* Removing custom subfolder thumbnail

### Operations Requiring FileSystem Access:
* **Directory Relinking / Permission Check**: If `!course.isLinked && !course.isCustomCourse`, calls `handle.requestPermission({ mode: 'read' })` or `showDirectoryPicker()`.
* **Refresh Subfolder**: User clicks refresh button on a subfolder card (`refreshCourse(courseId, btn)`), which rescans video files and updates durations via `fileSystemService`.
* **Relocate Specific Subfolder**: User clicks relocate button (`course.subCourseData[subfolder].handle = await window.showDirectoryPicker()`).

---

## 7. Progress System Dependencies

* **Subfolder Progress**: Calculated by aggregating lectures where `lecture.chapter === fullPath || lecture.chapter.startsWith(fullPath + '/')`.
* **Pre-computed Cache**: `course.subCourseStats[fullPath]` provides $O(1)$ instant progress stats during subfolder card rendering.
* **Recalculation**: Handled via `progressService.calculateCourseProgress(course, false, fullPath)`.

---

## 8. Player Boundary Interface

Subcourse view communicates with Player via three explicit parameters:
1. `courseId`: Active course identifier.
2. `lectureId`: Target lecture to start with (`null` to auto-resume first incomplete lecture).
3. `originView`: Passed as `'subcourse-view'`.
4. `subfolder`: Active subfolder path (e.g. `'Algorithms/Sorting'`).

When player loads from subcourse:
* Player sets `backToLibraryBtn.dataset.view = 'subcourse-view'`.
* Player sets `backToLibraryBtn.dataset.subfolder = subfolder`.
* Clicking player back button invokes `renderSubcourseView(course.id, subfolder)`.

---

## 9. DOM & Event Inventory

### DOM Elements:
* `#subcourse-view` (view container)
* `#subcourse-parent-title` (header title display)
* `#back-to-dashboard-from-sub` (back button)
* `#subcourse-grid` (grid container)
* `.enter-course-btn` (enter subcourse button)
* `.split-course-cb` (split deeper checkbox)
* `.course-ignore-cb` (ignore topic checkbox)
* `.relocate-course-btn` (relocate directory handle)
* `.refresh-course-btn` (rescan folder contents)
* `.remove-thumbnail-btn` (clear custom thumbnail)
* `.remove-course-btn` (delete / hide subfolder)
* `.course-rating i.fa-star` (star rating elements)
* `#thumbnail-uploader` (hidden image input)

### Custom Events:
* `courseflix:data-updated` (emitted on mutations to trigger React re-renders)
* `courseflix:courses-loaded` (emitted when database finishes course loading)
* `view-changed` (emitted when switching between views)

---

## 10. Global Variables

| Variable | Usage in Subcourse View | React Replacement Target |
|---|---|---|
| `window.courses` | Fallback lookup for course data | `useCourses()` / `CourseContext` |
| `window.currentCourse` | Set on player launch from subfolder | `useRouter().params` / `PlayerContext` |
| `window.currentSubfolder` | Set on subcourse drill-down | `useRouter().params.path` |
| `window.lastView` | Set to `'subcourse-view'` for player back navigation | `useRouter().historyStack` |
| `window.lastViewedFaculty` | Preserved if user navigated from faculty profile | `useRouter().params.origin` |

---

## 11. Proposed React Architecture (Phase 8B Blueprint)

```
┌─────────────────────────────────────────────────────────────┐
│                    <SubcourseView />                        │
│  - Consumes useRouter() -> { params: { courseId, path } }   │
│  - Consumes useCourses() -> { courses, updateCourse, ... }  │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
<SubcourseHeader />                             <SubcourseGrid />
- Title & "(Folders)" indicator                 - Filters hidden/ignored
- Dynamic Back Button (origin aware)            - Sorts via naturalSort
                                                       │
                                                       ▼
                                              <SubcourseCard />
                                              - Thumbnail + Action Icons
                                              - Editable Title & Faculty
                                              - Rating Stars & Ignore Checkbox
                                              - Split Further Checkbox
                                              - Progress Bar & Duration
                                              - "Enter Course" Button
```

---

## 12. Migration Risks & Safety Mitigations

1. **Risk: URL Path Encoding Glitches**
   * *Issue*: Windows folder names containing slashes, brackets, or Unicode (e.g. `Chapter 1 [Intro]`) can cause malformed hashes.
   * *Mitigation*: Strictly sanitize via `encodeURIComponent` / `decodeURIComponent` in `RouterContext`.
2. **Risk: Rescanning FileSystem on Every Render**
   * *Issue*: Legacy code occasionally tried to check permissions or refresh handles during view switching.
   * *Mitigation*: React component renders purely from persisted in-memory `course` and `subCourseData` objects. FileSystem handles are touched *only* when user explicitly clicks "Refresh" or "Relocate".
3. **Risk: Leaf Subfolder Auto-Play Jump**
   * *Issue*: When drilling into a folder with 0 deeper subfolders, legacy code instantly launched the player.
   * *Mitigation*: Preserve this exact rule in `SubcourseView.jsx` (`if (immediateSubfolders.length === 0) playLecture(...)`).

---

---

## 14. Phase 8B Status: Subcourse View React Ownership (COMPLETED)

### A. React Implementation Delivered
1. **[`src/utils/subcourseUtils.js`](file:///e:/projects/courceflix-react/src/utils/subcourseUtils.js)**:
   - Pure utilities: `naturalSortByNameOnly`, `getParentPath`, `getSubfolderDisplayName`, `getSubfolderFacultyName`, `isSubfolderPathHidden`, `getImmediateSubfolders`, `hasDeeperSubfolders`, and `resolveSubfolderThumbnail`.
2. **[`src/components/subcourse/SubcourseCard.jsx`](file:///e:/projects/courceflix-react/src/components/subcourse/SubcourseCard.jsx)**:
   - Interactive subfolder card supporting thumbnail preview/upload/removal, double-click inline title and faculty editing, star ratings (1-5), ignore topic checkbox, split-further checkbox, progress bar, duration indicators, and "Enter Course" action button.
3. **[`src/components/subcourse/SubcourseHeader.jsx`](file:///e:/projects/courceflix-react/src/components/subcourse/SubcourseHeader.jsx)**:
   - Origin-aware dynamic back navigation (`← Back to Dashboard`, `← Back to Landing Page`, `← Back to Faculty`, `← Back to Search`, `← Back to Continue`, or `← Back to <parentFolder>`).
4. **[`src/components/subcourse/SubcourseGrid.jsx`](file:///e:/projects/courceflix-react/src/components/subcourse/SubcourseGrid.jsx)**:
   - Filtered subfolder grid respecting `courseflix_hide_ignored` and `.hidden` subcourse flags.
5. **[`src/components/views/SubcourseView.jsx`](file:///e:/projects/courceflix-react/src/components/views/SubcourseView.jsx)**:
   - Canonical container connected to `useRouter()` and `useCourses()`, managing leaf folder auto-jump, directory permissions, and mutations through `courseService`.

### B. Legacy Renderer Retirement
- Retired 184 lines of imperative DOM construction inside `public/legacy.js:renderSubcourseView()`.
- Replaced with lightweight navigation delegation bridge: `window.renderSubcourseView(courseId, basePath)` &rarr; `window.switchView('#subcourse/' + courseId + '/' + path)`.

### C. Build & Bundle Safety Verification
- Bundle size: `497.69 kB` (gzip `124.60 kB`) — 0 errors, no large player dependencies leaked into initial bundle.
- Active Branch: `risky-asf-bruh`. Baseline `working-fine-x03` preserved untouched.

---

*End of Subcourse & Course Detail Architecture Map.*

