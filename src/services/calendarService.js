// Calendar & Study Plan Service
// Extracted and modularized from legacy.js

import { ensureDB, getStore, CALENDAR_STORE } from './db.js';
import { dateToStr, isToday, isFuture, formatCalendarDate } from './utils.js';

if (typeof window !== 'undefined') {
    window.calendarUndoStack = window.calendarUndoStack || [];
    window.isUndoingCalendar = false;
}

export async function addCalendarEvent(eventData) {
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

export async function getCalendarEventsForDate(dateStr) {
    await ensureDB();
    return new Promise((resolve, reject) => {
        const store = getStore(CALENDAR_STORE, 'readonly');
        const idx = store.index('date');
        const request = idx.getAll(IDBKeyRange.only(dateStr));
        request.onsuccess = e => resolve(e.target.result || []);
        request.onerror = reject;
    });
}

export async function deleteCalendarEvent(id) {
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

export async function getAllCalendarEvents() {
    await ensureDB();
    return new Promise((resolve, reject) => {
        const request = getStore(CALENDAR_STORE, 'readonly').getAll();
        request.onsuccess = e => resolve(e.target.result || []);
        request.onerror = reject;
    });
}

export function getNextUncompletedLecture(baseName, facultyName, count) {
    let uncompleted = [];
    const courses = window.courses || [];
    const courseProgress = window.courseProgress || {};
    const matchingCourses = courses.filter(c => c.title === baseName && !c.isIgnored);

    for (const course of matchingCourses) {
        if (uncompleted.length >= count) break;
        const allLectures = [];
        if (course.chapters) {
            course.chapters.forEach(ch => {
                const getSubFaculty = typeof window.getSubfolderFacultyName === 'function' ? window.getSubfolderFacultyName : () => facultyName;
                if (getSubFaculty(course, ch.name) !== facultyName) return;
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

export function isDateUnlocked(dateStr) {
    if (!dateStr || !isFuture(dateStr)) return true;
    try {
        const unlocked = JSON.parse(localStorage.getItem('cal_unlocked_dates') || '[]');
        return unlocked.includes(dateStr);
    } catch (e) {
        return false;
    }
}

export function openCalendarView(targetDate) {
    const currentCalendarDate = targetDate || dateToStr(new Date());
    if (typeof window.switchView === 'function') window.switchView('history-view');
    if (window.setHistoryTabCalendar) {
        window.setHistoryTabCalendar(currentCalendarDate);
    } else {
        renderCalendarDay(currentCalendarDate, false);
    }
}

export async function renderCalendarDay(dateStr, isUnlocked) {
    await ensureDB();
    if (typeof window !== 'undefined') window.currentCalendarDate = dateStr;
    const calView = document.getElementById('calendar-view');
    if (!calView) return;

    isUnlocked = isUnlocked || isDateUnlocked(dateStr);
    const future = isFuture(dateStr);
    const today = isToday(dateStr);

    const dateDisplay = calView.querySelector('#cal-date-display');
    if (dateDisplay) dateDisplay.textContent = formatCalendarDate(dateStr);

    const lockOverlay = calView.querySelector('#cal-lock-overlay');
    if (lockOverlay) {
        if (future && !isUnlocked) lockOverlay.classList.remove('cal-hidden');
        else lockOverlay.classList.add('cal-hidden');
    }

    const makePlaylistBtn = calView.querySelector('#cal-make-playlist-btn');
    if (makePlaylistBtn) {
        if (!future || isUnlocked) makePlaylistBtn.classList.remove('cal-hidden');
        else makePlaylistBtn.classList.add('cal-hidden');
    }

    const timeline = calView.querySelector('#cal-timeline');
    if (!timeline) return;
    timeline.innerHTML = '';

    const HOUR_HEIGHT = 80;
    const dayTickedEvents = [];
    const seenKeysCal = new Set();
    const courseProgress = window.courseProgress || {};
    const courses = window.courses || [];

    if (typeof window.cleanupOrphanedHistoryEntries === 'function') {
        await window.cleanupOrphanedHistoryEntries();
    }

    Object.values(courseProgress).forEach(prog => {
        if (!prog.completed) return;
        const ts = prog.completedAt || (!prog.completedAt && prog.lastStudiedAt);
        if (ts && ts.startsWith(dateStr)) {
            const course = courses.find(c => String(c.id) === String(prog.courseId));
            if (!course || course.isIgnored) return;
            if (prog.subfolder) {
                if (typeof window.isSubfolderIgnored === 'function' && window.isSubfolderIgnored(course, prog.subfolder)) return;
                if (course.subCourseData && course.subCourseData[prog.subfolder] && course.subCourseData[prog.subfolder].hidden) return;
            }
            const progKey = prog.id || `${prog.courseId}_${prog.lectureId}`;
            if (!seenKeysCal.has(progKey)) {
                seenKeysCal.add(progKey);
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

    let dayStudiedSecs = 0;
    dayTickedEvents.forEach(h => { dayStudiedSecs += (h.duration || 3600); });
    const dayHours = Math.round((dayStudiedSecs / 3600) * 10) / 10;
    const calDayHoursDisplay = calView.querySelector('#cal-day-hours-studied');
    if (calDayHoursDisplay) {
        calDayHoursDisplay.innerHTML = `<i class="fas fa-history" style="color: #34d399; margin-right: 6px;"></i><span>${dayHours}h Studied</span>`;
    }

    const storedEvents = await getCalendarEventsForDate(dateStr);

    for (let hour = 0; hour < 24; hour++) {
        const hourSlot = document.createElement('div');
        hourSlot.className = 'cal-hour-slot';
        hourSlot.dataset.hour = hour;
        hourSlot.style.height = HOUR_HEIGHT + 'px';

        const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        hourSlot.innerHTML = `<div class="cal-hour-label">${label}</div><div class="cal-hour-line"></div>`;

        if (!future || isUnlocked) {
            hourSlot.addEventListener('click', (e) => {
                if (e.target.closest('.cal-event')) return;
                if (typeof window.showAddEventModal === 'function') {
                    window.showAddEventModal(dateStr, hour, 0, isUnlocked, () => renderCalendarDay(dateStr, isUnlocked));
                }
            });
            hourSlot.style.cursor = 'pointer';
            hourSlot.title = `Click to add event at ${label}`;
        }
        timeline.appendChild(hourSlot);
    }

    const allDayEvents = [];
    const hiddenHistory = JSON.parse(localStorage.getItem('cal_hidden_history') || '[]');
    dayTickedEvents.forEach(h => {
        if (hiddenHistory.includes(h.id)) return;
        const endTime = new Date(h.timestamp);
        const durationSecs = h.duration || 3600;
        const course = courses.find(c => c.id === parseInt(h.courseId));
        const faculty = course && typeof window.getSubfolderFacultyName === 'function' ? window.getSubfolderFacultyName(course, h.subfolder || '') : (h.courseTitle || 'Unknown');

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

    layoutDayEvents(allDayEvents);
    if (typeof window !== 'undefined') window.currentCalendarAllDayEvents = allDayEvents;

    allDayEvents.forEach(ev => {
        placeCalendarBlock(timeline, ev, HOUR_HEIGHT);
    });

    const currentHour = new Date().getHours();
    let scrollTo = Math.max(0, (currentHour - 4) * HOUR_HEIGHT);
    requestAnimationFrame(() => { timeline.scrollTop = Math.max(0, scrollTo); });
}

export function layoutDayEvents(events) {
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

    uniqueEvents.sort((a, b) => a.startMinute - b.startMinute || b.durationMins - a.durationMins);

    const columns = [];
    uniqueEvents.forEach(ev => {
        let placed = false;
        for (let i = 0; i < columns.length; i++) {
            const lastInCol = columns[i][columns[i].length - 1];
            if (lastInCol.endMinute <= ev.startMinute) {
                columns[i].push(ev);
                ev.colIndex = i;
                placed = true;
                break;
            }
        }
        if (!placed) {
            ev.colIndex = columns.length;
            columns.push([ev]);
        }
    });

    uniqueEvents.forEach(ev => {
        let maxOverlapCols = 1;
        uniqueEvents.forEach(other => {
            if (ev !== other) {
                if (ev.startMinute < other.endMinute && ev.endMinute > other.startMinute) {
                    maxOverlapCols = Math.max(maxOverlapCols, Math.max(ev.colIndex, other.colIndex) + 1);
                }
            }
        });
        ev.totalCols = maxOverlapCols;
    });
}

export function placeCalendarBlock(timeline, eventData, HOUR_HEIGHT = 80, defaultCanDelete = true, defaultOnDelete = null) {
    const startMins = eventData.startMinute !== undefined ? eventData.startMinute : Math.max(0, eventData.endMinute - eventData.durationMins);
    const topPx = (startMins / 60) * HOUR_HEIGHT;
    const heightPx = Math.max(26, (eventData.durationMins / 60) * HOUR_HEIGHT);

    const colIndex = eventData.colIndex || 0;
    const totalCols = eventData.totalCols || 1;
    const widthPct = 94 / totalCols;
    const leftPct = 5 + (colIndex * widthPct);

    const block = document.createElement('div');
    block.className = `cal-event ${eventData.type === 'history' ? 'cal-event-history' : 'cal-event-planned'} ${eventData.isCompleted ? 'is-completed' : ''}`;
    block.style.top = topPx + 'px';
    block.style.height = heightPx + 'px';
    block.style.left = leftPct + '%';
    block.style.width = widthPct + '%';
    block.style.zIndex = 10 + colIndex;

    const canDelete = eventData.canDelete !== undefined ? eventData.canDelete : defaultCanDelete;
    const onDelete = eventData.onDelete || defaultOnDelete;

    const tickIcon = eventData.isCompleted ? '<i class="fas fa-check-circle cal-event-check"></i>' : '';
    const deleteBtn = canDelete ? `<button class="cal-event-delete-btn" title="Delete event">&times;</button>` : '';

    block.innerHTML = `
        <div class="cal-event-header">
            <span class="cal-event-title">${eventData.label}</span>
            <div style="display:flex; align-items:center; gap:4px;">
                ${tickIcon}
                ${deleteBtn}
            </div>
        </div>
        ${heightPx > 36 ? `<div class="cal-event-sub">${eventData.tooltip}</div>` : ''}
    `;

    if (canDelete) {
        const delBtn = block.querySelector('.cal-event-delete-btn');
        if (delBtn) {
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (eventData.type === 'history') {
                    const hidden = JSON.parse(localStorage.getItem('cal_hidden_history') || '[]');
                    if (!hidden.includes(eventData.id)) {
                        hidden.push(eventData.id);
                        localStorage.setItem('cal_hidden_history', JSON.stringify(hidden));
                        if (!window.isUndoingCalendar) {
                            window.calendarUndoStack = window.calendarUndoStack || [];
                            window.calendarUndoStack.push({ action: 'hide_history', id: eventData.id });
                        }
                    }
                } else if (eventData.type === 'planned') {
                    await deleteCalendarEvent(eventData.id);
                }
                if (onDelete) onDelete();
            });
        }
    }

    block.addEventListener('click', (e) => {
        if (e.target.closest('.cal-event-delete-btn')) return;
        if (eventData.courseId && eventData.lectureId) {
            if (typeof window.switchView === 'function') window.switchView('player-view');
            if (typeof window.renderPlayer === 'function') {
                window.renderPlayer(eventData.courseId, eventData.lectureId, 'calendar-view', 0, eventData.subfolder);
            }
        }
    });

    timeline.appendChild(block);
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.addCalendarEvent = addCalendarEvent;
    window.getCalendarEventsForDate = getCalendarEventsForDate;
    window.deleteCalendarEvent = deleteCalendarEvent;
    window.getAllCalendarEvents = getAllCalendarEvents;
    window.formatCalendarDate = formatCalendarDate;
    window.getNextUncompletedLecture = getNextUncompletedLecture;
    window.openCalendarView = openCalendarView;
    window.isDateUnlocked = isDateUnlocked;
    window.renderCalendarDay = renderCalendarDay;
    window.layoutDayEvents = layoutDayEvents;
    window.placeCalendarBlock = placeCalendarBlock;
}
