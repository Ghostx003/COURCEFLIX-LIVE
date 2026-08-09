// Doubts & Screenshot Annotation Service
// Extracted and modularized from legacy.js

import { ensureDB, getStore, DOUBTS_STORE } from './db.js';
import { showToast, formatTime } from './utils.js';

export let activeDoubtId = null;

export function syncDoubtToProgressApp(d) {
    try {
        let progressDoubts = JSON.parse(localStorage.getItem('doubtsDashboard') || '[]');
        let doubtSubjects = JSON.parse(localStorage.getItem('doubtsSubjects') || '[]');
        
        const existingIndex = progressDoubts.findIndex(pd => pd.id === d.createdAt);
        
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

export async function captureDoubt() {
    const currentCourse = window.currentCourse;
    const currentLectureLi = window.currentLectureLi;
    const videoPlayer = document.getElementById('video-player') || window.videoPlayer;
    const currentSubfolder = window.currentSubfolder;

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
            subfolder: (currentSubfolder || '').trim().replace(/\/+$/, ''),
            lectureId: lectureId,
            timestamp: timestamp,
            image: dataUrl,
            comment: '',
            tags: [],
            createdAt: now,
            id: now
        };
        
        await ensureDB();
        await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').add(d).onsuccess = r);
        syncDoubtToProgressApp(d);
        showToast("Doubt Screenshot Captured!");
    } catch (err) {
        console.error("Doubt capture failed:", err);
        showToast("Could not capture screenshot.", true);
    }
}

export async function renderDoubtsCourseSelectionView() {
    const nav = document.querySelector('nav');
    if (nav) nav.classList.remove('hidden');
    const doubtsDetail = document.getElementById('doubts-detail-container');
    if (doubtsDetail) doubtsDetail.classList.add('hidden');
    const doubtsListContainer = document.getElementById('doubts-list-container');
    if (doubtsListContainer) doubtsListContainer.classList.remove('hidden');
    const grid = document.getElementById('doubts-course-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    await ensureDB();
    const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
    if (!allDoubts || allDoubts.length === 0) {
        grid.innerHTML = '<p id="no-content-message">No doubts captured yet. Press "s" while playing a video to take a screenshot.</p>';
        return;
    }
    
    const courses = window.courses || [];
    const grouped = {};
    allDoubts.forEach(d => {
        const course = courses.find(c => String(c.id) === String(d.courseId));
        const courseIdKey = course ? String(course.id) : String(d.courseId);
        const subfolderKey = (d.subfolder || '').trim().replace(/\/+$/, '');
        const key = `${courseIdKey}_|_${subfolderKey}`;
        if (!grouped[key]) grouped[key] = { items: [], courseId: course ? course.id : d.courseId, subfolder: subfolderKey };
        grouped[key].items.push(d);
    });
    
    grid.innerHTML = ''; // Clear grid synchronously right before appending to prevent async race condition duplicates
    for (const key in grouped) {
        const group = grouped[key];
        const course = courses.find(c => String(c.id) === String(group.courseId));
        if (!course) continue;
        
        const count = group.items.length;
        let thumb = course.thumbnail;
        let hierarchyText = course.title;
        
        if (group.subfolder) {
            const subName = typeof window.getSubfolderDisplayName === 'function' ? window.getSubfolderDisplayName(course, group.subfolder) : group.subfolder;
            hierarchyText += ` &raquo; ${subName}`;
            if (course.subCourseData) {
                let tempThumb = null;
                if (course.subCourseData[group.subfolder] && course.subCourseData[group.subfolder].thumbnail) {
                    tempThumb = course.subCourseData[group.subfolder].thumbnail;
                }
                if (!tempThumb) {
                    const parts = group.subfolder.split('/');
                    for (let i = parts.length - 1; i > 0; i--) {
                        const parentPath = parts.slice(0, i).join('/');
                        if (course.subCourseData[parentPath] && course.subCourseData[parentPath].thumbnail) {
                            tempThumb = course.subCourseData[parentPath].thumbnail;
                            break;
                        }
                    }
                }
                if (tempThumb) thumb = tempThumb;
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

export async function renderDoubtsDetailView(courseId, subfolder) {
    const listContainer = document.getElementById('doubts-list-container');
    if (listContainer) listContainer.classList.add('hidden');
    const detailContainer = document.getElementById('doubts-detail-container');
    if (detailContainer) detailContainer.classList.remove('hidden');
    
    const courses = window.courses || [];
    const course = courses.find(c => String(c.id) === String(courseId));
    const targetSubfolder = (subfolder || '').trim().replace(/\/+$/, '');
    const titleEl = document.getElementById('doubts-detail-title');
    if (titleEl) {
        const subName = course && targetSubfolder && typeof window.getSubfolderDisplayName === 'function' ? window.getSubfolderDisplayName(course, targetSubfolder) : targetSubfolder;
        titleEl.innerHTML = course ? course.title + (targetSubfolder ? ` &raquo; ${subName}` : '') : 'Doubts';
    }
    
    const grid = document.getElementById('doubts-specific-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    await ensureDB();
    const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result));
    const groupDoubts = (allDoubts || []).filter(d => {
        const matchCourse = String(d.courseId) === String(courseId);
        const matchSubfolder = (d.subfolder || '').trim().replace(/\/+$/, '') === targetSubfolder;
        return matchCourse && matchSubfolder;
    });
    
    if (groupDoubts.length === 0) {
         grid.innerHTML = '<p id="no-content-message">No doubts found for this folder.</p>';
         return;
    }
    
    grid.innerHTML = ''; // Clear grid synchronously right before appending to prevent async race condition duplicates
    groupDoubts.sort((a,b) => b.createdAt - a.createdAt).forEach(d => {
        const card = document.createElement('div');
        card.className = 'doubt-card';
        card.dataset.id = d.id;
        card.innerHTML = `
            <button class="delete-doubt-btn" data-id="${d.id}" title="Delete Doubt"><i class="fas fa-trash"></i></button>
            <img src="${d.image}" alt="Doubt Snapshot">
            <div class="doubt-meta">
                <span class="doubt-timestamp" data-id="${d.id}" data-c="${d.courseId}" data-s="${d.subfolder || ''}" data-l="${d.lectureId}" data-t="${d.timestamp}">
                    <i class="fas fa-play-circle"></i> ${formatTime(d.timestamp)}
                </span>
            </div>`;
        grid.appendChild(card);
    });
}

export async function openDoubtFullscreen(doubtId) {
    await ensureDB();
    const d = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').get(parseInt(doubtId)).onsuccess = e => r(e.target.result));
    if (!d) return;
    activeDoubtId = d.id;
    if (typeof window !== 'undefined') window.activeDoubtId = activeDoubtId;
    
    const imgEl = document.getElementById('doubt-full-img');
    const commentInput = document.getElementById('doubt-comment-input');
    const tagInput = document.getElementById('doubt-tag-input');
    const overlay = document.getElementById('doubt-full-overlay');

    if (imgEl) imgEl.src = d.image;
    if (commentInput) commentInput.value = d.comment || '';
    renderDoubtTags(d.tags || []);
    if (tagInput) tagInput.value = '';
    
    if (overlay) overlay.classList.remove('hidden');
}

export function renderDoubtTags(tags) {
    const list = document.getElementById('doubt-tags-list');
    if (!list) return;
    list.innerHTML = tags.map(tag => `
        <div class="doubt-tag">
            <span>${tag}</span>
            <i class="fas fa-times remove-tag" data-tag="${tag}"></i>
        </div>
    `).join('');
}

export function initDoubtListeners() {
    window.addEventListener('storage', (e) => {
        if (e.key === 'doubtsDashboard') {
            const detailContainer = document.getElementById('doubts-detail-container');
            const listContainer = document.getElementById('doubts-list-container');
            if (detailContainer && !detailContainer.classList.contains('hidden')) {
                 const courseId = parseInt(document.querySelector('.doubt-timestamp')?.dataset.c);
                 if (courseId) renderDoubtsDetailView(courseId, document.querySelector('.doubt-timestamp').dataset.s);
                 else renderDoubtsCourseSelectionView();
            } else if (listContainer && !listContainer.classList.contains('hidden')) {
                 renderDoubtsCourseSelectionView();
            }
        }
    });

    document.body.addEventListener('click', async (e) => {
        if (e.target.closest('.enter-doubt-btn')) {
            const btn = e.target.closest('.enter-doubt-btn');
            renderDoubtsDetailView(parseInt(btn.dataset.c), btn.dataset.s);
        }
        if (e.target.closest('#back-to-doubts-grid')) {
            renderDoubtsCourseSelectionView();
        }
        if (e.target.closest('.doubt-card') && !e.target.closest('.delete-doubt-btn') && !e.target.closest('.doubt-timestamp')) {
            const id = e.target.closest('.doubt-card').dataset.id;
            openDoubtFullscreen(id);
        }
        if (e.target.closest('.close-doubt-full-btn')) {
            const overlay = document.getElementById('doubt-full-overlay');
            if (overlay) overlay.classList.add('hidden');
            activeDoubtId = null;
            if (typeof window !== 'undefined') window.activeDoubtId = null;
        }
        if (e.target.closest('.delete-doubt-btn')) {
            const id = parseInt(e.target.closest('.delete-doubt-btn').dataset.id);
            if (confirm('Are you sure you want to delete this doubt snapshot?')) {
                await ensureDB();
                await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').delete(id).onsuccess = r);
                try {
                    let progressDoubts = JSON.parse(localStorage.getItem('doubtsDashboard') || '[]');
                    progressDoubts = progressDoubts.filter(pd => pd.id !== id);
                    localStorage.setItem('doubtsDashboard', JSON.stringify(progressDoubts));
                    window.dispatchEvent(new Event('doubtsUpdated'));
                } catch (err) {}
                
                const detailContainer = document.getElementById('doubts-detail-container');
                if (detailContainer && !detailContainer.classList.contains('hidden')) {
                     const courseId = parseInt(document.querySelector('.doubt-timestamp')?.dataset.c);
                     if (courseId) renderDoubtsDetailView(courseId, document.querySelector('.doubt-timestamp').dataset.s);
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
            if (typeof window.switchView === 'function') window.switchView('player-view');
            if (typeof window.renderPlayer === 'function') {
                await window.renderPlayer(courseId, lectureId, 'doubts-detail-view', timestamp, subfolder);
            }
        }
        if (e.target.closest('.remove-tag')) {
            const tagToRemove = e.target.closest('.remove-tag').dataset.tag;
            if (!activeDoubtId) return;
            await ensureDB();
            const d = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').get(activeDoubtId).onsuccess = e => r(e.target.result));
            if (d) {
                d.tags = d.tags.filter(t => t !== tagToRemove);
                await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').put(d).onsuccess = r);
                renderDoubtTags(d.tags);
            }
        }
        if (e.target.closest('#add-doubt-tag-btn')) {
            const input = document.getElementById('doubt-tag-input');
            const tag = input ? input.value.trim() : '';
            if (tag && activeDoubtId) {
                await ensureDB();
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
                await ensureDB();
                const d = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').get(activeDoubtId).onsuccess = e => r(e.target.result));
                if (d) {
                    const commentInput = document.getElementById('doubt-comment-input');
                    if (commentInput) d.comment = commentInput.value;
                    await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').put(d).onsuccess = r);
                    syncDoubtToProgressApp(d);
                    showToast('Changes Saved!');
                }
            }
        }
    });
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.syncDoubtToProgressApp = syncDoubtToProgressApp;
    window.captureDoubt = captureDoubt;
    window.renderDoubtsCourseSelectionView = renderDoubtsCourseSelectionView;
    window.renderDoubtsDetailView = renderDoubtsDetailView;
    window.openDoubtFullscreen = openDoubtFullscreen;
    window.renderDoubtTags = renderDoubtTags;
    window.initDoubtListeners = initDoubtListeners;
}
