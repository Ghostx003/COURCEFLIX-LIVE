// DPP (Daily Practice Problems) Service
// Extracted and modularized from legacy.js

import { ensureDB, getStore, DPP_STORE, PROGRESS_STORE } from './db.js';
import { saveLectureProgress } from './progressService.js';
import { showToast } from './utils.js';

export function isDppKeyDeleted(courseId, folderName, fileName) {
    try {
        const deletedSet = new Set(JSON.parse(localStorage.getItem('deleted_dpps_list') || '[]'));
        const key = `${courseId}_${folderName || ''}_${fileName || ''}`;
        return deletedSet.has(key);
    } catch(e) { return false; }
}

export function isSameFolder(f1, f2) {
    if (!f1 && !f2) return true;
    return String(f1 || '').trim() === String(f2 || '').trim();
}

export async function syncDppsFromProgress() {
    await ensureDB();
    if (typeof window.purgeEmptyDppAndNotesEngine === 'function') await window.purgeEmptyDppAndNotesEngine();
    let allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));

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
    const courses = window.courses || [];

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

            if (isDppKeyDeleted(prog.courseId, folder, autoName) || isDppKeyDeleted(prog.courseId, folder, prog.assignmentName)) {
                continue;
            }

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

            if (prog.assignmentName !== autoName) {
                prog.assignmentName = autoName;
                await saveLectureProgress(prog);
            }
        }
    }
    if (addedAny && typeof window.syncCourseflixSubjects === 'function') {
        window.syncCourseflixSubjects();
    }
}

export async function renderDppCourseSelectionView() {
    await ensureDB();
    
    const nav = document.querySelector('nav');
    if (nav) nav.classList.remove('hidden');
    const dppCourseGrid = document.getElementById('dpp-course-grid');
    const detailContainer = document.getElementById('dpp-detail-container');
    if (detailContainer) detailContainer.classList.add('hidden');
    if (dppCourseGrid) dppCourseGrid.classList.remove('hidden');

    const renderGrid = async () => {
        let allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));

        const validDpps = allDpps.filter(dpp => dpp && (dpp.fileHandle || dpp.handle) && !isDppKeyDeleted(dpp.courseId, dpp.folderName, dpp.fileName));
        const courseIdsWithDpps = [...new Set(validDpps.map(dpp => String(dpp.courseId)))];
        const courses = window.courses || [];
        const coursesWithDpps = courses.filter(c => courseIdsWithDpps.includes(String(c.id)) && !isDppKeyDeleted(c.id, '', '*'));

        if (!dppCourseGrid) return;
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
                <button class="delete-all-dpps-btn" title="Delete all DPPs for this subject"><i class="fas fa-times"></i></button>
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
    };

    await renderGrid();

    Promise.resolve().then(async () => {
        if (typeof window.scanAllCoursesForDppsAndNotes === 'function') await window.scanAllCoursesForDppsAndNotes();
        if (typeof window.purgeEmptyDppAndNotesEngine === 'function') await window.purgeEmptyDppAndNotesEngine();
        await syncDppsFromProgress();
        if (dppCourseGrid && !dppCourseGrid.classList.contains('hidden')) {
            await renderGrid();
        }
    });
}

export function getDppDisplayName(dpp, folderName, courseTitle, fallbackIndex = 1) {
    if (!dpp) return '';
    const lastFolder = (folderName && folderName !== 'Uncategorized' && folderName !== '') 
        ? folderName.split('/').pop() 
        : (courseTitle || 'DPP');
    let name = (dpp.fileName || '').trim();
    const match = name.match(/(?:^|\s)(\d+)$/);
    const num = match ? match[1] : fallbackIndex;
    return `${lastFolder} ${num}`;
}

export async function renderDppDetailView(courseId, pushState = true) {
    await ensureDB();

    const dppCourseGrid = document.getElementById('dpp-course-grid');
    const detailContainer = document.getElementById('dpp-detail-container');
    if (dppCourseGrid) dppCourseGrid.classList.add('hidden');
    if (detailContainer) detailContainer.classList.remove('hidden');

    const courses = window.courses || [];
    const course = courses.find(c => String(c.id) === String(courseId));
    if (!course) return;

    const titleEl = document.getElementById('dpp-detail-course-title');
    if (titleEl) titleEl.textContent = course.title;

    const dppListContainer = document.getElementById('dpp-list-container');

    const renderList = async () => {
        if (!dppListContainer) return;
        dppListContainer.innerHTML = '';

        const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
        const courseDpps = allDpps.filter(d => String(d.courseId) === String(courseId) && (d.fileHandle || d.handle) && !isDppKeyDeleted(d.courseId, d.folderName, d.fileName));

        if (courseDpps.length === 0) {
            dppListContainer.innerHTML = '<p id="no-content-message">No DPPs available for this course.</p>';
            return;
        }

        courseDpps.forEach((dpp, idx) => {
            const item = document.createElement('div');
            item.className = `dpp-item ${dpp.completed ? 'completed' : ''}`;
            item.dataset.id = dpp.id;
            const displayName = getDppDisplayName(dpp, dpp.folderName, course.title, idx + 1);

            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                    <input type="checkbox" class="dpp-checkbox" ${dpp.completed ? 'checked' : ''} style="cursor: pointer; width: 18px; height: 18px; accent-color: var(--accent-primary);">
                    <i class="fas fa-file-pdf" style="color: var(--accent-danger); font-size: 1.2rem;"></i>
                    <span class="dpp-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="icon-btn star-dpp-btn ${dpp.starred ? 'starred' : ''}" title="Star DPP"><i class="${dpp.starred ? 'fas' : 'far'} fa-star"></i></button>
                    <button class="primary-btn open-dpp-btn">Open PDF</button>
                    <button class="icon-btn delete-dpp-btn" title="Delete DPP"><i class="fas fa-trash"></i></button>
                </div>`;
            dppListContainer.appendChild(item);
        });
    };

    await renderList();

    Promise.resolve().then(async () => {
        if (typeof window.scanAllCoursesForDppsAndNotes === 'function') await window.scanAllCoursesForDppsAndNotes();
        await syncDppsFromProgress();
        if (detailContainer && !detailContainer.classList.contains('hidden')) {
            await renderList();
        }
    });
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.isDppKeyDeleted = isDppKeyDeleted;
    window.isSameFolder = isSameFolder;
    window.syncDppsFromProgress = syncDppsFromProgress;
    window.renderDppCourseSelectionView = renderDppCourseSelectionView;
    window.getDppDisplayName = getDppDisplayName;
    window.renderDppDetailView = renderDppDetailView;
}
