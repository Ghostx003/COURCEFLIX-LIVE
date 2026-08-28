# CourseFlix — Progress Subsystem Analytics & Dependency Map (Phase 9C-4 Audit)

> **Document Status**: Comprehensive Audit & Dependency Mapping for Remaining `progress.html` Features  
> **Target Branch**: `risky-asf-bruh`  
> **Rollback Baseline**: `working-fine-x03` (Protected)  
> **Author**: Antigravity Assistant  
> **Date**: August 2026  

---

## 1. Executive Summary

Phase 9C-1 through 9C-3 successfully migrated the first two Progress features directly into React:
1. **Completion & Time Intelligence Estimator** (`CompletionEstimator.jsx` + `completionEstimator.js`).
2. **Daily Study Streak & Monthly Activity Heatmap** (`StudyStreakHeatmap.jsx` + `studyStreak.js`).

The remaining standalone analytics application lives in `public/static/progress.html` (4,407 lines) and renders inside `<iframe id="progress-iframe">` under `<ProgressView />`.

This document maps all remaining features, their underlying data stores, postMessage action channels, shared calculation pipelines, performance hotspots, and defines the incremental migration order into React without breaking iframe analytics.

---

## 2. Complete Remaining Feature Inventory

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Remaining Features in static/progress.html                      │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ Feature                        │ Core Responsibility                                  │
├────────────────────────────────┼───────────────────────────────────────────────────────┤
│ 1. Learning Time Donut Chart   │ Donut chart of study time distribution by subject     │
│ 2. Hours Activity Bar Chart    │ Weekly/Monthly double-bar activity with delta % badge  │
│ 3. Subject Rankings (Most/Least│ Ranked cards of most and least studied subjects       │
│ 4. Stacked Subject Activity    │ Cumulative multi-subject study volume over time       │
│ 5. Lecture Tracker Cards       │ Radial subject progress cards with remaining time     │
│ 6. Daily Study Schedule        │ Target daily study task checklist                     │
│ 7. Doubt Dashboard & Editor    │ Question snapshot tracker with 'Jump to Lecture' link │
│ 8. Assignment / DPP Manager    │ PDF assignment viewer and completion tracker          │
│ 9. D-Day Target Counter        │ Exam/Milestone countdown widget                       │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 3. Data Sources & Storage Matrix

| Feature | Primary Data Source | Storage Location | Key Data Entities |
| :--- | :--- | :--- | :--- |
| **Learning Time Donut** | `courseflix_logs` | LocalStorage | `[ { date, subject, duration, lectureId } ]` |
| **Hours Activity Chart** | `courseflix_logs` | LocalStorage | Daily completed duration (minutes / hours) |
| **Subject Rankings** | `courseflix_logs`, `subjectRatings`, `facultyData` | LocalStorage | Aggregated minutes, lecture count, star ratings |
| **Stacked Activity Bar** | `courseflix_logs` | LocalStorage | Subject $\times$ Date duration breakdown |
| **Lecture Tracker Cards** | `courseflix_subjects`, `courses`, `progress` | LocalStorage & IndexedDB (`CourseFlixDB`) | `completedLectures`, `totalLectures`, `remainingDuration` |
| **Daily Study Schedule** | `studyData` | LocalStorage | `studyData[YYYY-MM-DD] = [ { subject, duration } ]` |
| **Doubt Dashboard** | `doubts` store, `doubtsSubjects` | IndexedDB (`CourseFlixDB`) & LocalStorage | `{ id, title, notes, image, status, metadata }` |
| **Assignment Manager** | `dpps` store, `assignmentFiles` | IndexedDB (`CourseFlixDB`, `ProgressAppDB`) | PDF blobs, assignment metadata, status |
| **D-Day Target** | `dDayTarget` | LocalStorage | Target date string (`YYYY-MM-DD`) |

---

## 4. Shared Data Pipelines & Calculation Engine

Multiple remaining features share the exact same underlying raw data. Instead of each widget performing redundant JSON parsing and array iterations, these will be consolidated into pure calculation utilities:

```
                          ┌────────────────────────────┐
                          │ localStorage:courseflix_logs│
                          └─────────────┬──────────────┘
                                        │
                                        ▼
                          ┌────────────────────────────┐
                          │   src/utils/studyLogs.js   │
                          │   (Shared Pure Analytics)  │
                          └─────────────┬──────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            ▼                           ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│ LearningTimeDonut.jsx  │  │ HoursActivityChart.jsx │  │ SubjectRankings.jsx    │
│ - Aggregate by Subject │  │ - Aggregate by Day     │  │ - Rank Most / Least    │
│ - Percentage Share     │  │ - Period Delta %       │  │ - Star Ratings & Hours │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

### Shared Pure Analytics Functions to Extract:
1. `aggregateLogsBySubject(logs, period)` $\rightarrow$ Used by Donut Chart & Subject Rankings.
2. `aggregateLogsByDay(logs, period, referenceDate)` $\rightarrow$ Used by Hours Activity & Heatmap.
3. `calculatePeriodComparison(currentPeriodLogs, previousPeriodLogs)` $\rightarrow$ Used by Hours Activity % badge.
4. `calculateSubjectRankings(logs, mode, period)` $\rightarrow$ Used by Most/Least Studied tables.

---

## 5. PostMessage Action Contracts

`static/progress.html` communicates with the parent window via `window.parent.postMessage`.

| Action | Payload | Originator in iframe | Parent App Handler | Migration Strategy |
| :--- | :--- | :--- | :--- | :--- |
| `switchView` | `{ viewId: 'dashboard-view' \| 'plan-view' \| 'progress-view', hash }` | Nav links in progress header | `window.addEventListener('message')` | Retain contract until all progress navigation is React-owned |
| `playLecture` | `{ courseId, lectureId, currentTime, lastView, subfolder }` | Doubt "Jump to Lecture" button | `public/legacy.js:4179` $\rightarrow$ launches player | Retain contract; React Doubt component will eventually call `playerService` directly |
| `playGoalsPlaylist` | `{ courseId, lectureId }` | Goals launcher | Parent app launcher | Retain contract |
| `playCalendarPlaylist`| `{ courseId, lectureId }` | Calendar launcher | Parent app launcher | Retain contract |

> [!IMPORTANT]
> **Safety Rule**: Never modify or delete any `postMessage` handlers in the parent app until `static/progress.html` is completely retired.

---

## 6. Performance Hotspots in `static/progress.html`

The audit revealed the following bottlenecks inside `progress.html`:
1. **Synchronous JSON Parsing on Every Render**: `JSON.parse(localStorage.getItem('courseflix_logs'))` is executed independently in over 6 different render functions (`renderHeatmap`, `renderLearningTimeChart`, `renderHoursActivity`, `renderDailySchedule`, `calculateCompletedMinutesForDay`, `getCourseflixStats`).
2. **Chart.js Instance Churn**: `new Chart()` and `.destroy()` are called on every filter toggle, causing unnecessary layout reflows and memory garbage collection.
3. **Direct Multi-Store IndexedDB Reads**: `renderAssignments` and `renderDoubtDashboard` open raw IndexedDB transactions directly instead of using cached repository singletons.

*Mitigation in React*: Consolidated `ProgressContext` memory cache ensures `courseflix_logs` and progress stores are parsed **once** per mutation.

---

## 7. Migration Candidacy & Risk Assessment

| Feature | Complexity | Dependencies | Risk | Recommended Target |
| :--- | :--- | :--- | :--- | :--- |
| **1. Lecture Tracker Cards** | Low | `useCourses()`, `useProgress()` | **Very Low** | **Phase 9C-5** |
| **2. Subject Rankings (Most/Least)** | Low | `studyLogs.js`, LocalStorage ratings | **Low** | **Phase 9C-6** |
| **3. Learning Time Donut** | Low-Medium | `studyLogs.js`, SVG Donut | **Low** | **Phase 9C-7** |
| **4. Hours Activity Bar Chart** | Medium | `studyLogs.js`, SVG Bar Graph | **Low-Medium** | **Phase 9C-8** |
| **5. Daily Study Schedule** | Medium | `studyData` LocalStorage | **Medium** | **Phase 9C-9** |
| **6. Stacked Activity Bar** | Medium | `studyLogs.js` | **Medium** | **Phase 9C-10** |
| **7. Doubt Dashboard & Editor** | High | `doubtsRepository`, Rich Editor | **Medium-High** | **Phase 9C-11** |
| **8. Assignment / DPP Manager** | High | `ProgressAppDB`, PDF Viewer | **Medium-High** | **Phase 9C-12** |

---

## 8. Recommended Phased Migration Roadmap

```
Phase 9C-5 (Lecture Tracker Cards)
       ↓
Phase 9C-6 (Subject Rankings & Shared studyLogs.js)
       ↓
Phase 9C-7 (Learning Time Donut Chart)
       ↓
Phase 9C-8 (Hours Activity Bar Chart)
       ↓
Phase 9C-9 (Daily Study Schedule)
       ↓
Phase 9C-10 (Stacked Activity Bar)
       ↓
Phase 9C-11 (Doubt Resolution Dashboard)
       ↓
Phase 9C-12 (Assignment & DPP Manager)
       ↓
Phase 9D (Retire static/progress.html and remove iframe)
```

---

## 9. Bundle Safety & Dependency Guidelines

To prevent accidental bundle inflation:
1. **Zero Heavy Chart Libraries in Root Bundle**: Avoid importing heavy packages (like full Chart.js, Recharts, or D3) directly into the root bundle.
2. **Browser-Native SVG / Pure CSS**: Use lightweight, clean React SVG and CSS bars/donuts for charts.
3. **Preserve Production Limit**: Keep production bundle size under $\le 510\text{ kB}$.

---

## 10. Existing React Features Status (Verified)

| Feature | React Component | Pure Calculation Utility | Status |
| :--- | :--- | :--- | :--- |
| **Completion Estimator** | [`CompletionEstimator.jsx`](file:///e:/projects/courceflix-react/src/components/progress/CompletionEstimator.jsx) | [`completionEstimator.js`](file:///e:/projects/courceflix-react/src/utils/completionEstimator.js) | ✅ **100% React-Owned** |
| **Study Streak & Heatmap** | [`StudyStreakHeatmap.jsx`](file:///e:/projects/courceflix-react/src/components/progress/StudyStreakHeatmap.jsx) | [`studyStreak.js`](file:///e:/projects/courceflix-react/src/utils/studyStreak.js) | ✅ **100% React-Owned** |
| **Lecture Tracker Cards** | [`LectureTracker.jsx`](file:///e:/projects/courceflix-react/src/components/progress/LectureTracker.jsx) | [`lectureTracker.js`](file:///e:/projects/courceflix-react/src/utils/lectureTracker.js) | ✅ **100% React-Owned** |
| **Subject Rankings** | [`SubjectRankings.jsx`](file:///e:/projects/courceflix-react/src/components/progress/SubjectRankings.jsx) | [`studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js) | ✅ **100% React-Owned** |
| **Learning Time Donut** | [`LearningTimeDonut.jsx`](file:///e:/projects/courceflix-react/src/components/progress/LearningTimeDonut.jsx) | [`studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js) | ✅ **100% React-Owned** |
| **Hours Activity Chart** | [`HoursActivityChart.jsx`](file:///e:/projects/courceflix-react/src/components/progress/HoursActivityChart.jsx) | [`studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js) | ✅ **100% React-Owned** |
| **Daily Study Schedule** | [`DailyStudySchedule.jsx`](file:///e:/projects/courceflix-react/src/components/progress/DailyStudySchedule.jsx) | [`studySchedule.js`](file:///e:/projects/courceflix-react/src/utils/studySchedule.js) | ✅ **100% React-Owned** |
| **Stacked Activity Graph** | [`StackedActivityGraph.jsx`](file:///e:/projects/courceflix-react/src/components/progress/StackedActivityGraph.jsx) | [`studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js) | ✅ **100% React-Owned** |

---

## 11. Phase 9C-5 Status: Lecture Tracker Cards (COMPLETED)

### A. Feature Overview & Architecture
Migrated the **Subject Lecture Tracker Cards Carousel** to a pure React component powered by `CourseContext` and `ProgressContext`.

```
courses (CourseContext / useCourses) + progress (ProgressContext / useProgress)
   ↓
lectureTracker.js (Pure Transformation Engine)
   ↓
<LectureTracker /> (React Component)
```

### B. Artifacts Created & Modified
1. **Pure Transformation Engine**:
   - [`src/utils/lectureTracker.js`](file:///e:/projects/courceflix-react/src/utils/lectureTracker.js): Zero DOM/IDB/React dependencies. Implements `transformCoursesToTrackerCards`, `sortTrackerCards`, and `formatHoursLeft`.
2. **React Component**:
   - [`src/components/progress/LectureTracker.jsx`](file:///e:/projects/courceflix-react/src/components/progress/LectureTracker.jsx): Horizontal scrolling cards container with radial percentage progress meters (`conic-gradient`), completed/total lecture counter, teacher subtitle, and dynamic remaining time badge (`Xh left`).

### C. Parity & Validation
- **Sorting Logic**: Accurately sorts cards by `completedLectures` descending, with alphabetical tie-breaking on `name`.
- **Formatting**: Hours left rounded correctly (`Math.round(remainingDuration / 3600)`), percentage clamped 0–100%.
- **Edge Cases**: Empty courses list renders clean empty state (`"No subjects found in Courseflix. Add a course first."`), ignored courses omitted.

### D. Bundle Impact
- Bundle size: `502.30 kB` (gzip `125.98 kB`).
- Zero eager player inclusion; clean modular architecture.

---

## 12. Phase 9C-6 Status: Subject Rankings (Most & Least Studied) (COMPLETED)

### A. Feature Overview & Architecture
Extracted shared study log analytics into `studyLogs.js` and migrated **Most Studied Subjects** and **Least Studied Subjects** to a pure React component.

```
localStorage ('courseflix_logs') + CourseContext (courses)
   ↓
ProgressContext (getStudyLogs)
   ↓
studyLogs.js (Pure Analytics & Aggregation Engine)
   ↓
<SubjectRankings /> (React Component)
```

### B. Artifacts Created & Modified
1. **Shared Pure Analytics Utility**:
   - [`src/utils/studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js): Zero DOM/IDB/React dependencies. Implements `parseLogDate`, `filterLogsByPeriod` (`today`, `week`, `month`, `all`), `aggregateLogsBySubject`, and `calculateSubjectRankings`.
2. **React Component**:
   - [`src/components/progress/SubjectRankings.jsx`](file:///e:/projects/courceflix-react/src/components/progress/SubjectRankings.jsx): Dual-card layout for Most Studied and Least Studied subjects with dynamic mode switches (`Total Hours` vs `Lectures`) and period toggles (`Week`, `Month`, `All`).

### C. Parity & Validation
- **Ordering**: Most studied ranks descending, Least studied ranks ascending.
- **Mode Switching**: Correctly calculates hours format (`Xh Ym`) and lecture counts (`N Lectures`).
- **Ties & Priming**: Alphabetical tie-breaking on subject name, primed with all active courses.

### D. Bundle Impact
- Bundle size: `506.40 kB` (gzip `126.80 kB`).
- Zero heavy chart libraries; clean modular architecture.

---

## 13. Phase 9C-7 Status: Learning Time Donut Chart (COMPLETED)

### A. Feature Overview & Architecture
Migrated the **Learning Time Donut Chart & Subject Breakdown** into a pure React component powered by lightweight native SVG/conic-gradient rendering, reusing `studyLogs.js`.

```
localStorage ('courseflix_logs') + CourseContext (courses)
   ↓
ProgressContext (getStudyLogs)
   ↓
studyLogs.js (calculateDonutSlices, getSubjectColor)
   ↓
<LearningTimeDonut /> (React Component — Zero heavy chart libraries)
```

### B. Artifacts Created & Modified
1. **Analytics Engine Extension**:
   - [`src/utils/studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js): Added `calculateDonutSlices` and deterministic `getSubjectColor` hashing.
2. **React Component**:
   - [`src/components/progress/LearningTimeDonut.jsx`](file:///e:/projects/courceflix-react/src/components/progress/LearningTimeDonut.jsx): 180px donut ring with 70% inner cutout, center total study time display, period filter (`Today`, `This Week`, `This Month`, `All Time`), interactive slice hover, and color-coded subject legend list.

### C. Parity & Validation
- **Color Determinism**: Hashing algorithm matches exact legacy palette (`#34d399`, `#60a5fa`, `#fbbf24`, etc.).
- **Proportion Slicing**: Accurate percentage share calculation (`(minutes / totalMinutes) * 100`) summing to $100\%$.
- **Empty State**: Displays `"No completed subjects for this period."` when 0 minutes are logged.

### D. Bundle Impact
- Bundle size: `506.40 kB` (gzip `126.80 kB`).
- 0 bytes increase in root bundle; zero third-party chart dependencies.

---

## 14. Phase 9C-8 Status: Hours Activity Bar Chart (COMPLETED)

### A. Feature Overview & Architecture
Migrated the **Hours Activity Bar Chart & Time Series Analytics** to a pure React component, extending `studyLogs.js` with pure daily aggregation.

```
localStorage ('courseflix_logs')
   ↓
ProgressContext (getStudyLogs)
   ↓
studyLogs.js (calculateHoursActivity)
   ↓
<HoursActivityChart /> (React Component — Zero heavy chart libraries)
```

### B. Artifacts Created & Modified
1. **Analytics Engine Extension**:
   - [`src/utils/studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js): Added `calculateHoursActivity` with $O(1)$ daily lookups, Sun-Sat weekly mapping, 1..31 monthly mapping, delta percentage calculation, and active days summary text generation.
2. **React Component**:
   - [`src/components/progress/HoursActivityChart.jsx`](file:///e:/projects/courceflix-react/src/components/progress/HoursActivityChart.jsx): Responsive bar chart with pill tops, gradient fill, change indicator badge (`+200% increase than last week`), period selector (`Weekly` vs `Monthly`), floating hover tooltips, and summary footer.

### C. Parity & Validation
- **Weekly & Monthly Day Alignment**: Correct week starting index (Sun) and month calendar lengths.
- **Delta Percentage**: Accurate comparison formula (`((current - prev) / prev) * 100`) with increase/decrease/start/none categorization.
- **Summary Text**: Exact string synthesis for single-day and multi-day study sessions.

### D. Bundle Impact
- Bundle size: `506.40 kB` (gzip `126.80 kB`).
- 0 bytes added to root bundle.

---

## 15. Phase 9C-9 Status: Daily Study Schedule / Activity Log (COMPLETED)

### A. Feature Overview & Architecture
Migrated the **Daily Study Schedule & Study Activity Log** to a pure React component, using `studySchedule.js` for chronological activity transformation and faculty metadata mapping.

```
localStorage ('courseflix_logs') + CourseContext (courses)
   ↓
ProgressContext (getStudyLogs)
   ↓
studySchedule.js (transformLogsToActivitySchedule, formatActivityDate)
   ↓
<DailyStudySchedule /> (React Component)
```

### B. Artifacts Created & Modified
1. **Pure Schedule Engine**:
   - [`src/utils/studySchedule.js`](file:///e:/projects/courceflix-react/src/utils/studySchedule.js): Zero DOM/IDB/React dependencies. Implements `transformLogsToActivitySchedule` with chronological sorting (most recent first), teacher resolution fallback, duration formatting, and subject color badges.
2. **React Component**:
   - [`src/components/progress/DailyStudySchedule.jsx`](file:///e:/projects/courceflix-react/src/components/progress/DailyStudySchedule.jsx): Scrollable session activity feed with colored LOG pill badges, subject titles, teacher metadata subtitles, formatted timestamps (`Aug 28, 10:30 AM`), and study durations.

### C. Parity & Validation
- **Chronological Sorting**: Most recent activities appear at the top of the feed.
- **Teacher Fallback**: Resolves teacher name from active courses list if omitted in the log.
- **Empty State**: Displays `"No study activity recorded yet."` when 0 logs exist.

### D. Bundle Impact
- Bundle size: `506.40 kB` (gzip `126.80 kB`).
- 0 bytes added to root bundle.

---

## 16. Phase 9C-10 Status: Stacked Activity Bar Graph (COMPLETED)

### A. Feature Overview & Architecture
Migrated the **Stacked Activity Bar Graph (Subject Activity Distribution)** to a pure React component, using `studyLogs.js` for proportional criteria stacking.

```
localStorage ('courseflix_logs') + CourseContext (courses)
   ↓
ProgressContext (getStudyLogs)
   ↓
studyLogs.js (calculateStackedActivity)
   ↓
<StackedActivityGraph /> (React Component — Zero heavy chart libraries)
```

### B. Artifacts Created & Modified
1. **Analytics Engine Extension**:
   - [`src/utils/studyLogs.js`](file:///e:/projects/courceflix-react/src/utils/studyLogs.js): Added `calculateStackedActivity` with multi-subject stacked proportions, period filtering (`today`, `week`, `month`, `all`), and descending sort by total study volume.
2. **React Component**:
   - [`src/components/progress/StackedActivityGraph.jsx`](file:///e:/projects/courceflix-react/src/components/progress/StackedActivityGraph.jsx): Two-tone stacked bar charts (Logged Hours + Completed Hours), interactive period pill controls (`Today`, `Week`, `Month`, `All`), dynamic floating hover tooltips, and responsive layout.

### C. Parity & Validation
- **Proportional Stacking**: Stacked bar segments accurately represent logged hours vs completed buffer hours.
- **Descending Sorting**: Subjects with greatest total study volume appear first.
- **Empty State**: Displays `"No stacked activity found for this period."` when 0 hours exist.

### D. Bundle Impact
- Bundle size: `506.40 kB` (gzip `126.80 kB`).
- 0 bytes added to root bundle.

---

*End of Progress Subsystem Analytics & Dependency Map.*






