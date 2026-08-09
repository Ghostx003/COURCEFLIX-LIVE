// Course Upload & Processing Engine
// Extracted and modularized from legacy.js

import { getLectureProgress } from './progressService.js';
import { showToast, naturalSortByNameOnly } from './utils.js';

export function renderUploadView() {
    const grid = document.getElementById('upload-course-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const courses = window.courses || [];
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

export async function renderUploadSubfolderView(courseId, basePath = '') {
    const courses = window.courses || [];
    const course = courses.find(c => String(c.id) === String(courseId));
    if (!course || !course.handle) return;

    if (await course.handle.queryPermission({ mode: 'read' }) !== 'granted') {
        if (await course.handle.requestPermission({ mode: 'read' }) !== 'granted') {
            showToast('Permission denied.', true);
            return;
        }
    }

    if (!course.lectures && typeof window.refreshCourse === 'function') {
        try { await window.refreshCourse(course.id, null); } catch (e) {
            showToast("Failed to scan course", true); return;
        }
    }

    course.subCourseData = course.subCourseData || {};

    const uploadGrid = document.getElementById('upload-course-grid');
    const uploadDetail = document.getElementById('upload-detail-view');
    const subfolderView = document.getElementById('upload-subfolder-view');
    
    if (uploadGrid) uploadGrid.classList.add('hidden');
    if (uploadDetail) uploadDetail.classList.add('hidden');
    if (subfolderView) {
        subfolderView.classList.remove('hidden');
        subfolderView.dataset.courseId = courseId;
        subfolderView.dataset.currentPath = basePath;
    }

    const titleDisplay = basePath === '' ? course.title : (typeof window.getSubfolderDisplayName === 'function' ? window.getSubfolderDisplayName(course, basePath) : basePath);
    const titleEl = document.getElementById('upload-subfolder-title');
    if (titleEl) titleEl.textContent = titleDisplay + " (Upload Folders)";

    const backLink = document.getElementById('back-to-upload-from-subfolder');
    if (backLink) {
        if (basePath === '') {
            backLink.textContent = '\u2190 Back to Upload';
        } else {
            const parent = typeof window.getParentPath === 'function' ? window.getParentPath(basePath) : '';
            backLink.textContent = '\u2190 Back to ' + (parent === '' ? course.title : (typeof window.getSubfolderDisplayName === 'function' ? window.getSubfolderDisplayName(course, parent) : parent));
        }
    }

    const relevantChapters = (course.chapters || []).filter(ch => basePath === '' || ch.name.startsWith(basePath + '/') || ch.name === basePath);
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
    if (!grid) return;
    grid.innerHTML = '';

    if (immediateSubfolders.length === 0) {
        if (subfolderView) subfolderView.classList.add('hidden');
        if (uploadDetail) uploadDetail.classList.remove('hidden');
        await renderLectureUploadDetail(parseInt(courseId), basePath);
        return;
    }

    immediateSubfolders.forEach(fullPath => {
        const subData = course.subCourseData[fullPath] || {};
        if (subData.hidden) return;

        const folderNameOnly = typeof window.getSubfolderDisplayName === 'function' ? window.getSubfolderDisplayName(course, fullPath) : fullPath;
        const faculty = typeof window.getSubfolderFacultyName === 'function' ? window.getSubfolderFacultyName(course, fullPath) : 'Unknown';
        let thumb = subData.thumbnail;
        if (!thumb) {
            const parts = fullPath.split('/');
            for (let i = parts.length - 1; i > 0; i--) {
                const parentPath = parts.slice(0, i).join('/');
                if (course.subCourseData[parentPath] && course.subCourseData[parentPath].thumbnail) {
                    thumb = course.subCourseData[parentPath].thumbnail;
                    break;
                }
            }
        }
        thumb = thumb || course.thumbnail || null;
        const subLectures = (course.lectures || []).filter(l => l.chapter === fullPath || l.chapter.startsWith(fullPath + '/'));
        const total = subLectures.length;

        const hasDeeper = (course.chapters || []).some(ch => ch.name.startsWith(fullPath + '/') && ch.name.length > fullPath.length + 1);
        const isSplitDeeper = subData.isSplitView && hasDeeper;

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

export async function renderLectureUploadDetail(courseId, subfolder = null) {
    const courses = window.courses || [];
    const course = courses.find(c => String(c.id) === String(courseId));
    if (!course) return;

    const titleEl = document.getElementById('upload-detail-course-title');
    if (titleEl) titleEl.textContent = course.title + (subfolder ? ` (${subfolder})` : '');

    const listContainer = document.getElementById('upload-lecture-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const lectures = subfolder ? (course.lectures || []).filter(l => l.chapter === subfolder) : (course.lectures || []);
    
    lectures.forEach(lecture => {
        const prog = getLectureProgress(course.id, lecture.id);
        const item = document.createElement('div');
        item.className = 'upload-lecture-item';
        item.dataset.lectureId = lecture.id;

        item.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid var(--border-primary);">
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem;">${lecture.displayName || lecture.name}</h4>
                    <div style="display: flex; gap: 12px; margin-top: 4px; font-size: 0.8rem; color: var(--text-secondary);">
                        <span>${prog.pdfHandle ? '<i class="fas fa-check-circle" style="color: var(--accent-success);"></i> Notes' : 'No Notes'}</span>
                        <span>${prog.assignmentHandle ? '<i class="fas fa-check-circle" style="color: var(--accent-success);"></i> DPP' : 'No DPP'}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <label class="primary-btn" style="cursor: pointer; padding: 6px 12px; font-size: 0.85rem;">
                        Upload Notes <input type="file" class="lecture-notes-file-input" data-lecture-id="${lecture.id}" accept=".pdf" style="display: none;">
                    </label>
                    <label class="primary-btn" style="cursor: pointer; padding: 6px 12px; font-size: 0.85rem;">
                        Upload DPP <input type="file" class="lecture-dpp-file-input" data-lecture-id="${lecture.id}" accept=".pdf" style="display: none;">
                    </label>
                </div>
            </div>`;
        listContainer.appendChild(item);
    });
}

export async function loadCoursesFromDB() {
    await ensureDB();
    const storedCourses = await new Promise(resolve => getStore(STORE_NAME, 'readonly').getAll().onsuccess = e => resolve(e.target.result || []));
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
    window.courses = storedCourses || [];
    window.dispatchEvent(new CustomEvent('courseflix:courses-loaded', { detail: window.courses }));
    const activeView = document.querySelector('.view.active');
    if (!activeView || activeView.id === 'dashboard-view-el') {
        renderCourseGrid();
    } else {
        setTimeout(() => renderCourseGrid(), 10);
    }
}

export async function renderCourseGrid() {
    const courseGrid = document.getElementById('course-grid');
    if (!courseGrid) return;
    courseGrid.innerHTML = '';
    const courses = window.courses || [];
    if (courses.length === 0) { 
        courseGrid.innerHTML = `<p id="no-content-message">No courses added. Click 'Add Course' to begin.</p>`;
        const totalTimeDisplay = document.getElementById('total-time-display');
        if (totalTimeDisplay) totalTimeDisplay.style.display = 'none';
        return;
    }

    let sortedCourses = [...courses];
    sortedCourses.sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const course of sortedCourses) {
        if (localStorage.getItem('courseflix_hide_ignored') === 'true' && course.isIgnored) continue;

        const card = document.createElement('div');
        card.className = 'course-card';
        card.dataset.id = course.id;

        const splitBadge = course.isSplitView && course.isLinked ? `<span style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 600;"><i class="fas fa-folder-tree"></i> Split by Folders</span>` : '';

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
                    </div>
                 </div>
                 <p class="course-meta">${course.videoCount || 0} videos ${splitBadge}</p>
            </div>`;
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('.relocate-course-btn, .refresh-course-btn, .remove-thumbnail-btn, .remove-course-btn')) return;
            if (typeof window.openCourse === 'function') window.openCourse(course.id);
            else if (typeof window.switchView === 'function') {
                window.location.hash = `#subcourse/${course.id}`;
                window.switchView('subcourse-view');
            }
        });

        courseGrid.appendChild(card);
    }
}

export function extractNumberFromText(str) {
    if (!str) return null;
    const matches = str.match(/\d+/g);
    if (!matches) return null;
    return parseInt(matches[matches.length - 1], 10);
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.renderUploadView = renderUploadView;
    window.renderUploadSubfolderView = renderUploadSubfolderView;
    window.renderLectureUploadDetail = renderLectureUploadDetail;
    window.extractNumberFromText = extractNumberFromText;
    window.loadCoursesFromDB = loadCoursesFromDB;
    window.renderCourseGrid = renderCourseGrid;
    window.initCourseFlix = async function() {
        await ensureDB();
        await loadCoursesFromDB();
        await renderCourseGrid();
    };
}
