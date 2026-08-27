# CourseFlix Database & Repository Architecture

This directory (`src/db/`) contains the canonical data-access infrastructure for CourseFlix.

## Architectural Flow

```
React Components / Views / Hooks
            ↓
    Services Layer (src/services/*)
            ↓
   Repositories Layer (src/db/*Repository.js)
            ↓
  Canonical DB Connection (src/db/database.js)
            ↓
        IndexedDB (CourseFlixDB v13)
```

## Core Principles

1. **Pure Data Access in Repositories**:
   - Repositories (`coursesRepository.js`, `progressRepository.js`, `dppRepository.js`, `doubtsRepository.js`, `historyRepository.js`, `calendarRepository.js`) perform **ONLY** database operations (CRUD, cursor iteration, transactions).
   - They contain **NO** business logic, **NO** progress calculation formulas, **NO** filesystem manipulation, and **NO** DOM interactions.

2. **Single Database Connection (`database.js`)**:
   - Manages connection lifecycle (`openDB`, `ensureDB`, `closeDB`).
   - Ensures safe connection reuse via singleton promise.
   - Handles database version upgrades, blocked states, and version change requests.

3. **Backward Compatibility**:
   - Exposes global bindings (`window.db`, `window.openDB`, `window.ensureDB`, `window.getStore`, `window.parseCourseId`) for unmigrated legacy modules.
   - `src/services/db.js` re-exports from `src/db/index.js` to prevent breaking existing service imports.

## Available Repositories

| Repository | Object Store | Key Methods |
| :--- | :--- | :--- |
| `coursesRepository.js` | `courses` | `getAllCourses()`, `getCourseById(id)`, `putCourse(course)`, `deleteCourse(id)`, `bulkPutCourses(courses)`, `clearAllCourses()` |
| `progressRepository.js` | `progress` | `getAllProgress()`, `getProgressById(id)`, `getLectureProgress(courseId, lectureId)`, `putProgress(data)`, `deleteProgress(id)`, `deleteProgressForCourse(courseId)`, `bulkPutProgress(list)`, `clearAllProgress()` |
| `dppRepository.js` | `dpps` | `getAllDpps()`, `getDppById(id)`, `addDpp(dpp)`, `putDpp(dpp)`, `deleteDpp(id)`, `deleteDppsForCourse(courseId)`, `bulkPutDpps(list)`, `clearAllDpps()` |
| `doubtsRepository.js` | `doubts` | `getAllDoubts()`, `getDoubtById(id)`, `addDoubt(doubt)`, `putDoubt(doubt)`, `deleteDoubt(id)`, `deleteDoubtsForCourse(courseId)`, `bulkPutDoubts(list)`, `clearAllDoubts()` |
| `historyRepository.js` | `history` | `getAllHistory()`, `getHistoryById(id)`, `addHistory(item)`, `putHistory(item)`, `deleteHistory(id)`, `deleteHistoryForCourse(courseId)`, `deleteHistoryForSubfolder(courseId, subfolder)`, `clearAllHistory()` |
| `calendarRepository.js` | `calendarEvents` | `getAllCalendarEvents()`, `getCalendarEventsByDate(dateStr)`, `getCalendarEventById(id)`, `addCalendarEvent(event)`, `putCalendarEvent(event)`, `deleteCalendarEvent(id)`, `deleteCalendarEventsForCourse(courseId)`, `clearAllCalendarEvents()` |
