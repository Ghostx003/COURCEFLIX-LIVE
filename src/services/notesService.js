// Notes Service & Player Notes Panel
// Extracted and modularized from legacy.js

import { ensureDB, getStore, STORE_NAME } from './db.js';
import { saveLectureProgress, getLectureProgress } from './progressService.js';
import { showToast, formatTime } from './utils.js';

export async function renderNotesCourseSelectionView() {
    await ensureDB();
    
    const nav = document.querySelector('nav');
    if (nav) nav.classList.remove('hidden');
    const notesCourseGrid = document.getElementById('notes-course-grid');
    const detailContainer = document.getElementById('notes-detail-container');
    if (detailContainer) detailContainer.classList.add('hidden');
    if (notesCourseGrid) notesCourseGrid.classList.remove('hidden');

    const renderGrid = () => {
        const courses = window.courses || [];
        const coursesWithNotes = courses.filter(c => {
            if (!c.lectures) return false;
            return c.lectures.some(l => {
                const prog = getLectureProgress(c.id, l.id);
                return (prog.notes && prog.notes.trim()) || prog.pdfNotesHandle;
            });
        });

        if (!notesCourseGrid) return;
        notesCourseGrid.innerHTML = '';
        if (coursesWithNotes.length === 0) {
            notesCourseGrid.innerHTML = `<p id="no-content-message">No notes found for any course. Take notes during lectures to view them here.</p>`;
            return;
        }

        coursesWithNotes.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.dataset.courseId = course.id;

            const count = course.lectures.filter(l => {
                const prog = getLectureProgress(course.id, l.id);
                return (prog.notes && prog.notes.trim()) || prog.pdfNotesHandle;
            }).length;

            card.innerHTML = `
                <button class="delete-all-notes-btn" title="Delete all Notes for this subject"><i class="fas fa-times"></i></button>
                <div class="thumbnail-placeholder ${course.thumbnail ? 'has-thumbnail' : ''}" style="${course.thumbnail ? `background-image: url('${course.thumbnail}')` : ''}">
                    <i class="fas fa-sticky-note" style="font-size: 3rem;"></i>
                </div>
                <div class="course-info">
                    <div>
                        <h3 title="${course.title}">${course.title}</h3>
                        <div class="course-faculty" style="margin-top: 4px; font-size: 0.85rem;">${course.facultyName || 'N/A Faculty'}</div>
                        <p class="course-meta" style="margin-top: 8px;">${count} lectures with notes</p>
                    </div>
                    <button class="enter-notes-btn" style="margin-top: 12px; width: 100%;">View Notes</button>
                </div>`;
            notesCourseGrid.appendChild(card);
        });
    };

    renderGrid();

    Promise.resolve().then(async () => {
        if (typeof window.scanAllCoursesForDppsAndNotes === 'function') await window.scanAllCoursesForDppsAndNotes();
        if (typeof window.purgeEmptyDppAndNotesEngine === 'function') await window.purgeEmptyDppAndNotesEngine();
        if (notesCourseGrid && !notesCourseGrid.classList.contains('hidden')) {
            renderGrid();
        }
    });
}

export async function renderNotesDetailView(courseId) {
    await ensureDB();
    const notesCourseGrid = document.getElementById('notes-course-grid');
    const detailContainer = document.getElementById('notes-detail-container');
    if (notesCourseGrid) notesCourseGrid.classList.add('hidden');
    if (detailContainer) detailContainer.classList.remove('hidden');

    const courses = window.courses || [];
    const course = courses.find(c => String(c.id) === String(courseId));
    if (!course) return;

    const titleEl = document.getElementById('notes-detail-course-title');
    if (titleEl) titleEl.textContent = course.title;

    const notesListContainer = document.getElementById('notes-list-container');
    if (!notesListContainer) return;
    notesListContainer.innerHTML = '';

    const lecturesWithNotes = (course.lectures || []).filter(l => {
        const prog = getLectureProgress(course.id, l.id);
        return (prog.notes && prog.notes.trim()) || prog.pdfNotesHandle;
    });

    if (lecturesWithNotes.length === 0) {
        notesListContainer.innerHTML = '<p id="no-content-message">No notes available for this course.</p>';
        return;
    }

    lecturesWithNotes.forEach(l => {
        const prog = getLectureProgress(course.id, l.id);
        const item = document.createElement('div');
        item.className = 'notes-item';
        item.dataset.lectureId = l.id;
        item.dataset.courseId = course.id;

        item.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <h4 style="margin: 0; font-size: 1rem; color: var(--text-primary);">${l.displayName || l.name || 'Lecture'}</h4>
                <div style="display: flex; gap: 8px;">
                    ${prog.pdfNotesHandle ? `<button class="primary-btn open-pdf-notes-btn" style="font-size: 0.8rem; padding: 4px 8px;">Open PDF Notes</button>` : ''}
                    <button class="icon-btn delete-note-btn" title="Delete Note"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            ${prog.notes ? `<div class="notes-content" style="background: var(--bg-tertiary); padding: 10px; border-radius: 6px; font-size: 0.9rem; color: var(--text-secondary); max-height: 150px; overflow-y: auto;">${prog.notes}</div>` : ''}`;
        notesListContainer.appendChild(item);
    });
}

export function loadPlayerNotes() {
    const currentCourse = window.currentCourse;
    const currentLectureLi = window.currentLectureLi;
    const editor = document.getElementById('player-notes-editor');
    if (!currentCourse || !currentLectureLi || !editor) return;

    const lectureId = currentLectureLi.dataset.lectureId;
    const prog = getLectureProgress(currentCourse.id, lectureId);
    editor.innerHTML = prog.notes || '';
}

export async function savePlayerNotes() {
    const currentCourse = window.currentCourse;
    const currentLectureLi = window.currentLectureLi;
    const editor = document.getElementById('player-notes-editor');
    if (!currentCourse || !currentLectureLi || !editor) return;

    const lectureId = currentLectureLi.dataset.lectureId;
    const prog = getLectureProgress(currentCourse.id, lectureId);
    const content = editor.innerHTML;

    await saveLectureProgress({ ...prog, courseId: currentCourse.id, lectureId, notes: content });
}

export function togglePlayerNotesPanel() {
    const playerView = document.getElementById('player-view');
    const sidebar = document.getElementById('player-notes-sidebar');
    if (!playerView || !sidebar) return;

    const isActive = playerView.classList.contains('notes-active');
    if (isActive) {
        playerView.classList.remove('notes-active');
        sidebar.classList.add('hidden');
    } else {
        playerView.classList.add('notes-active');
        sidebar.classList.remove('hidden');
        loadPlayerNotes();
    }
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.renderNotesCourseSelectionView = renderNotesCourseSelectionView;
    window.renderNotesDetailView = renderNotesDetailView;
    window.loadPlayerNotes = loadPlayerNotes;
    window.savePlayerNotes = savePlayerNotes;
    window.togglePlayerNotesPanel = togglePlayerNotesPanel;
}
