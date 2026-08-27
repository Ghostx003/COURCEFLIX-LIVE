# CourseFlix — Progress Subsystem & Analytics Map (Phase 9A Audit)

> **Document Status**: Complete Progress View Dependency Audit & Discovery Baseline  
> **Target Branch**: `risky-asf-bruh`  
> **Rollback Baseline**: `working-fine-x03` (Protected)  
> **Author**: Antigravity Assistant  
> **Date**: August 2026  

---

## Executive Summary

The **Progress Subsystem** in CourseFlix is the core analytical and state-tracking engine of the application. It is responsible for:
1. Granular lecture-level progress recording (video position, completion status, timestamps, notes, and attachments).
2. Course and subcourse level aggregate metrics (completion %, total duration, remaining time, active video counts).
3. Visual analytics, heatmaps, study time distribution charts, and daily study schedules.
4. Global countdown and completion date calculations based on user-configured target pace.
5. Feeding data into adjacent views: **Continue Watching**, **Watch History**, **Faculty Profiles**, **Notes**, and **Doubts**.

---

## 1. Progress View Architecture & Structure

The Progress Subsystem currently operates through a hybrid iframe architecture:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                  CourseFlix Parent App (React / Legacy)                    │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ <ProgressView /> (React component in src/components/views/)          │  │
│  │   └── <iframe id="progress-iframe" src="static/progress.html#dashboard"> │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
│                                     │ window.postMessage                   │
│                                     ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ static/progress.html (Standalone Performance & Analytics Dashboard)  │  │
│  │  - Chart.js (Activity Bar Chart, Learning Time Donut)                │  │
│  │  - Heatmap Engine (GitHub-style study streak matrix)                 │  │
│  │  - Study Schedule & Lecture Tracker                                  │  │
│  │  - Doubt Resolution & Query System                                   │  │
│  │  - Reads directly from CourseFlixDB (courses, progress, dpps, etc.)  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Legacy Progress Renderer (`static/progress.html`)

* **Location**: `public/static/progress.html` (4,407 lines, ~255 KB).
* **Dependencies**: Tailwind CSS CDN, Chart.js, chartjs-plugin-datalabels, FontAwesome, Highlight.js.
* **Data Ingestion**:
  * **IndexedDB `CourseFlixDB`**: Opens direct `readonly` transactions to read `courses`, `progress`, `dpps`, and `doubts` stores.
  * **IndexedDB `ProgressAppDB`**: Uses `assignmentFiles` store for attached assignment PDFs.
  * **LocalStorage**: Reads `courseflix_logs`, `subjectRatings`, `courseData`, `assignments`, `dDayDate`.
* **Cross-Window Communication (postMessage)**:
  * Emits `{ action: 'switchView', viewId: '...', hash: '...' }` to switch parent app views.
  * Emits `{ action: 'playLecture', courseId, lectureId, lastView, currentTime, subfolder }` to launch video playback in the parent app.
  * Emits `{ action: 'playGoalsPlaylist', courseId, lectureId }` and `{ action: 'playCalendarPlaylist', courseId, lectureId }`.

---

## 3. Current React Component (`ProgressView.jsx`)

* **Location**: [`src/components/views/ProgressView.jsx`](file:///e:/projects/courceflix-react/src/components/views/ProgressView.jsx).
* **Current Implementation**:
  ```jsx
  import React from 'react';
  export default function ProgressView() {
    return (
      <div id="progress-view" className="view" style={{"padding":"0"}}>
          <iframe id="progress-iframe" src="static/progress.html#dashboard" style={{"width":"100%","height":"100%","border":"none"}}></iframe>
      </div>
    );
  }
  ```

---

## 4. `progressService.js` Analysis

* **Location**: [`src/services/progressService.js`](file:///e:/projects/courceflix-react/src/services/progressService.js) (425 lines).
* **Core Responsibilities**:
  1. `loadAllProgress()`: Ingests all records from `progressRepository`, seeds memory cache, synchronizes `window.courseProgress`.
  2. `getAllProgress()`: Returns in-memory progress dictionary.
  3. `getLectureProgress(courseId, lectureId)`: Returns progress object or default empty record.
  4. `calculateCourseProgress(course, forceRecalculate, targetSubfolder)`: Fast-path cached calculations with ignored subfolder filtering and multi-level directory aggregation.
  5. `saveLectureProgress(data)`: Persists progress, updates completion timestamps (`completedAt`, `lastStudiedAt`), recomputes course statistics, updates `courseflix_logs` in LocalStorage, and dispatches `courseflix:progress-updated`.
  6. `markLectureCompleted(courseId, lectureId, isCompleted, metadata)`: Convenience completion updater.
  7. `updatePlaybackPosition(courseId, lectureId, currentTime, duration)`: High-frequency video time updater.
  8. `deleteProgressForCourse(courseId)`: Cascade deletes all progress records associated with a course.
  9. `invalidateCourseProgressCache(courseId)`: Clears `courseProgressCache` map.

---

## 5. `progressRepository.js` & IndexedDB Schema

* **Location**: [`src/db/progressRepository.js`](file:///e:/projects/courceflix-react/src/db/progressRepository.js).
* **IndexedDB Object Store**: `progress` in database `CourseFlixDB`.
* **Primary Key**: `id` format: `"${courseId}_${lectureId}"` (e.g. `"1718000000000_lec_01"`).
* **Record Structure**:
  ```json
  {
    "id": "1718000000000_12",
    "courseId": 1718000000000,
    "lectureId": 12,
    "completed": true,
    "completedAt": "2026-08-27T12:00:00.000Z",
    "lastStudiedAt": "2026-08-27T12:00:00.000Z",
    "lastPlayed": "2026-08-27T11:45:00.000Z",
    "currentTime": 1540.25,
    "duration": 2700,
    "status": "normal",
    "bookmarks": [
      { "time": 320, "note": "Important theorem proof" }
    ],
    "pdfHandle": null,
    "assignmentHandle": null
  }
  ```

---

## 6. `window.courseProgress` Global Consumers Catalog

All 45+ occurrences across the codebase have been audited:

| File & Location | Read / Write | Purpose | Migration Seam |
|---|---|---|---|
| `public/legacy.js:277` | Declaration | Global variable declaration | Retained for unmigrated code |
| `public/legacy.js:424` | Write | Synced during `loadAllProgress()` | Owned by `progressService` |
| `public/legacy.js:452` | Write | Synced during `saveLectureProgress()` | Owned by `progressService` |
| `public/legacy.js:824` | Write | Deleted during course deletion purge | Owned by `progressService.deleteProgressForCourse` |
| `public/legacy.js:1002` | Read | `getLectureProgress(courseId, lectureId)` | Delegated to `progressService.getLectureProgress` |
| `public/legacy.js:1087` | Read | `calculateCourseProgress()` lecture loop | Handled in `progressService.calculateCourseProgress` |
| `public/legacy.js:1274` | Read | `updateTotalTimeLeftDisplay()` | Handled via `calculateCourseProgress` |
| `public/legacy.js:2002` | Read | `showFilteredCoursesView(status)` | Filters status lectures |
| `public/legacy.js:2524` | Read/Write | Course PDF reset | Batch update in `progressService` |
| `public/legacy.js:2876` | Read | Status lecture playback | Player subsystem |
| `public/legacy.js:4338` | Read/Write | Relocate course PDF handler | Batch update |
| `public/legacy.js:9257` | Read | Notes view PDF filtering | `useProgress()` in Notes phase |
| `public/legacy.js:12979` | Read | Search lecture results matching | Search subsystem |
| `public/legacy.js:13101` | Read | Doubts view lecture matching | Doubts subsystem |

---

## 7. Progress Events Map

| Event Name | Dispatcher | Payload | Listeners | Action |
|---|---|---|---|---|
| `courseflix:progress-updated` | `progressService.saveLectureProgress()` | `{ courseId, lectureId, progress }` | React Dashboard, SubcourseView, Player UI | Triggers re-renders, syncs subject progress |
| `courseflix:data-updated` | `courseService`, `progressService` | None | `useCourses()`, `CourseContext` | Re-fetches fresh course entities |
| `courseflix-hide-ignored-changed` | Navbar Ignore toggle | `{ hideIgnored: boolean }` | Dashboard, SubcourseView, TotalTimeLeft | Filters ignored topics from active views |
| `postMessage` | `static/progress.html` | `{ action: 'playLecture', ... }` | `legacy.js:window.onmessage` | Directs playback to Video Player |

---

## 8. Course Progress & Pre-computed Stats Dependencies

* **Course Entity Cache**: `course.stats` stores:
  ```json
  {
    "completed": 15,
    "total": 40,
    "percentage": 37.5,
    "remainingDuration": 45000,
    "totalDuration": 72000
  }
  ```
* **Subcourse Entity Cache**: `course.subCourseStats["Algorithms/Sorting"]` stores matching metrics for subdirectories.
* **Cache Invalidation**: Whenever a lecture's `completed` or `duration` changes, `invalidateCourseProgressCache(courseId)` clears memory caches and re-computes `course.stats` in IndexedDB.

---

## 9. Player Subsystem Interface Boundary

* **Lecture Playback Entry**: Player initiates with `playLectureFromAnywhere(courseId, lectureId, originView, subfolder)`.
* **Time Updating**: Video element fires `timeupdate` &rarr; throttled call to `progressService.updatePlaybackPosition()`.
* **Completion Toggle**: User clicks completed button or video hits 90% &rarr; `progressService.markLectureCompleted()`.
* **Bookmarks**: Stored in `progress.bookmarks` array inside the lecture's progress document.

---

## 10. History & Continue Dependencies

* **Continue View (`renderContinueView`)**:
  * Reads `history` IndexedDB store filtered to entries in the last 30 hours.
  * Calculates current course progress via `calculateCourseProgress(course, h.subfolder)` to show mini progress bars on continue cards.
* **History View (`renderHistoryView`)**:
  * Reads `history` store and `courseflix_logs` to build chronological playback table.

---

## 11. IndexedDB Store Catalog

| Store Name | Primary Key | Key Fields Used by Progress |
|---|---|---|
| `progress` | `id` (`courseId_lectureId`) | `completed`, `completedAt`, `currentTime`, `duration`, `bookmarks`, `status` |
| `courses` | `id` (integer) | `stats`, `subCourseStats`, `subCourseData`, `isIgnored` |
| `history` | `id` (auto-increment) | `courseId`, `lectureId`, `subfolder`, `timestamp`, `duration` |
| `dpps` | `id` (integer/string) | `name`, `status`, `completed`, `pdfHandle` |
| `doubts` | `id` (auto-increment) | `courseId`, `lectureId`, `doubtText`, `status` |

---

## 12. LocalStorage Catalog

| Key | Format | Consumer | Purpose |
|---|---|---|---|
| `courseflix_logs` | JSON Array of Log Objects | `progress.html`, `history.js` | Study history log for charts and heatmaps |
| `continueSortPref` | String (`'last_studied'`, `'most_studied'`) | `renderContinueView` | Sorting preference for continue cards |
| `calcTargetMode` | String (`'hours'`, `'lectures'`) | Completion Calculator | Mode toggle for date estimator |
| `calcDailyHours` | Number | Completion Calculator | User daily study goal in hours |
| `calcDailyLectures`| Number | Completion Calculator | User daily study goal in video counts |
| `calcPlaybackSpeed`| Number | Completion Calculator | Assumed playback speed (e.g. `1.5`x) |
| `dDayDate` | ISO Date String | `progress.html` | Target exam / deadline countdown timer |

---

## 13. UI & Analytical Features Inventory

1. **GitHub-style Study Heatmap**: Color-coded daily completion intensity matrix across months.
2. **Hours Activity Bar Chart**: Weekly / monthly breakdown of hours watched per day.
3. **Learning Time Donut Chart**: Percentage of total study time spent per course/subject.
4. **Daily Study Schedule Tracker**: Hourly schedule with completed tasks and lecture milestones.
5. **Completion Calculator Modal**: Predicts exact completion date given remaining hours, speed multiplier, and target daily hours/lectures.
6. **Total Time Left Indicator**: Color-coded status badge on top navigation bar with dynamic countdown.
7. **D-Day Countdown Timer**: Real-time ticker counting down to exam deadline.

---

## 14. Performance Analysis & Bottlenecks

1. **Synchronous `courseflix_logs` Parsing**: `progressService.saveLectureProgress` reads and writes large JSON stringified logs into LocalStorage on every completed video.
2. **Duplicate Progress Traversals**: In unmigrated views, `calculateCourseProgress` was called repeatedly without checking `course.stats`. `progressService` now avoids this via memory caching.
3. **Iframe Overhead**: Loading `static/progress.html` requires a separate browser context, redundant DB connections (`CourseFlixDB`), and duplicate CDN asset downloads (Chart.js, Tailwind).

---

## 15. Proposed React Progress Architecture (Phase 9B Blueprint)

```
┌─────────────────────────────────────────────────────────────────┐
│                      <ProgressContext />                        │
│  - Owns progressMap, summaryStats, studyLogs, calcConfig        │
│  - Subscribes to 'courseflix:progress-updated'                  │
│  - Exposes useProgress() hook                                   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
  <ProgressView /> (React)                    <CompletionCalculator />
  ├── <StudyHeatmap />                         (Modal & Navbar widget)
  ├── <ActivityChart />
  ├── <SubjectDistribution />
  └── <LectureHistoryTracker />
```

* **Step 1 (Safe Seam)**: Create `src/context/ProgressContext.jsx` and `src/hooks/useProgress.js` providing reactive access to `progressService`.
* **Step 2**: Wire `TotalTimeLeft` / completion calculator components in React to consume `useProgress()`.
* **Step 3**: Preserve `<iframe src="static/progress.html">` under `<ProgressView />` while bridging events seamlessly through postMessage, ensuring zero disruption to existing charts and study tools.

---

## 16. Migration Risks & Mitigations

1. **Risk: Disconnected LocalStorage Logs in `progress.html`**
   * *Mitigation*: Ensure `progressService.saveLectureProgress()` keeps writing to `courseflix_logs` so standalone iframe charts remain 100% in sync.
2. **Risk: `window.courseProgress` Breakage in Unmigrated Player / DPP**
   * *Mitigation*: Keep `window.courseProgress` updated in-memory inside `progressService`. Never delete the global until Player is migrated.
3. **Risk: postMessage Contract Breakage**
   * *Mitigation*: Retain `window.addEventListener('message', ...)` listener for `playLecture` and `switchView` actions emitted from `progress.html`.

---

## 17. Phase 9B Action Plan

1. Create `src/context/ProgressContext.jsx` and `src/hooks/useProgress.js`.
2. Wrap App with `<ProgressProvider>`.
---

## 18. Phase 9B Status: Progress State Foundation (COMPLETED)

### A. Core Architecture Implemented
1. **Canonical Context (`ProgressContext.jsx`)**:
   - Implemented in [`src/context/ProgressContext.jsx`](file:///e:/projects/courceflix-react/src/context/ProgressContext.jsx).
   - Provides reactive getters (`getLectureProgress`, `getCourseProgress`, `getAllProgress`), mutation delegates (`saveLectureProgress`, `markLectureCompleted`, `updatePlaybackPosition`, `deleteProgressForCourse`), and cache control (`invalidateCache`).
   - Manages reactivity via `progressVersion` state triggered on `courseflix:progress-updated` and `courseflix:data-updated` events.
2. **Custom Hook (`useProgress.js`)**:
   - Implemented in [`src/hooks/useProgress.js`](file:///e:/projects/courceflix-react/src/hooks/useProgress.js).
   - Exposes clean React API for current and future React views/components.
3. **Application Provider Tree**:
   - Mounted `<ProgressProvider>` within `<CourseProvider>` $\rightarrow$ `<RouterProvider>` $\rightarrow$ `<ProgressProvider>` in [`src/App.jsx`](file:///e:/projects/courceflix-react/src/App.jsx).

### B. State Ownership & Service Relationship
- **IndexedDB**: Handled strictly by [`src/db/progressRepository.js`](file:///e:/projects/courceflix-react/src/db/progressRepository.js).
- **Business Logic**: Handled strictly by [`src/services/progressService.js`](file:///e:/projects/courceflix-react/src/services/progressService.js).
- **React State**: Managed through `ProgressContext` without creating a duplicate database copy.
- **In-Flight Deduplication**: `loadAllProgress()` uses a shared promise so concurrent calls do not generate multiple IDB `getAll()` transactions.

### C. Legacy Compatibility & PostMessage Contracts
- **`window.courseProgress`**: Kept fully in sync as an in-memory mirror on every progress mutation for unmigrated legacy consumers.
- **`static/progress.html` & Iframe**: Untouched and 100% operational under memoized `<ProgressView />`.
- **`postMessage` Actions**: All messages (`playLecture`, `switchView`, `playGoalsPlaylist`, `playCalendarPlaylist`) remain functional.
- **`courseflix_logs`**: Maintained in `localStorage` by `progressService.saveLectureProgress()` ensuring external iframe charts update continuously.

### D. Unresolved `progress.html` Dependencies (Future Phases)
- Standalone Chart.js activity charts and learning time donut.
- Heatmap streak matrix component.
- Study schedule planner & D-Day completion calculator.
- Doubt screenshot query tools inside `progress.html`.

---

*End of Progress Subsystem & Analytics Map.*

