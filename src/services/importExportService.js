// Import / Export, Selective Zip Backup & Purge Engine
// Modularized from legacy.js

import { ensureDB, getStore, STORE_NAME, PROGRESS_STORE, DPP_STORE, DOUBTS_STORE, HISTORY_STORE } from './db.js';
import { showToast, switchView } from './utils.js';

        async function analyzeOrphanData() {
            await ensureDB();
            const activeCourses = await new Promise((resolve) => {
                const req = getStore(STORE_NAME, 'readonly').getAll();
                req.onsuccess = e => resolve(e.target.result || []);
                req.onerror = () => resolve([]);
            });

            const activeLectureMap = {};
            activeCourses.forEach(c => {
                if (c && !c.isIgnored && Array.isArray(c.lectures)) {
                    activeLectureMap[c.id] = new Set(c.lectures.map(l => String(l.id)));
                }
            });

            const getRecordStatus = (courseId, subfolderPath, lectureId, itemId) => {
                if (!courseId) return { valid: false, reason: 'Deleted Subject' };
                const cId = parseInt(courseId);
                const course = activeCourses.find(c => parseInt(c.id) === cId);
                if (!course) return { valid: false, reason: 'Deleted Subject', courseTitle: `Subject (ID ${cId})` };
                if (subfolderPath && isSubfolderPathHidden(course, subfolderPath)) {
                    return { valid: false, reason: 'Deleted Subfolder', courseTitle: course.title, subfolder: subfolderPath };
                }
                
                let lecId = lectureId ? String(lectureId) : null;
                if (!lecId && itemId && typeof itemId === 'string' && itemId.startsWith(cId + '_')) {
                    lecId = itemId.replace(cId + '_', '');
                }
                if (lecId && activeLectureMap[cId] && activeLectureMap[cId].size > 0) {
                    if (!activeLectureMap[cId].has(lecId)) {
                        return { valid: false, reason: 'Deleted Lecture File', courseTitle: course.title, lectureId: lecId };
                    }
                }
                return { valid: true, courseTitle: course.title };
            };

            const orphanList = [];

            // 1. PROGRESS_STORE
            const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            for (const prog of allProgress) {
                const sub = prog.subfolder || prog.chapter || '';
                const st = getRecordStatus(prog.courseId, sub, prog.lectureId, prog.id);
                if (!st.valid) {
                    let extras = [];
                    if (prog.pdfHandle || prog.pdfName) extras.push('PDF Note');
                    if (prog.notes) extras.push('Intel Note');
                    if (prog.assignmentHandle || prog.assignmentName) extras.push('Assignment');
                    const extraStr = extras.length > 0 ? ` (${extras.join(', ')})` : '';
                    orphanList.push({
                        id: prog.id,
                        store: 'progress',
                        type: 'Progress & Notes',
                        courseTitle: st.courseTitle || `Course #${prog.courseId}`,
                        targetName: (prog.lectureName || prog.name || prog.id) + extraStr,
                        reason: st.reason,
                        rawItem: prog
                    });
                }
            }

            // 2. DOUBTS_STORE
            const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            for (const d of allDoubts) {
                const sub = d.subfolder || d.chapter || '';
                const st = getRecordStatus(d.courseId, sub, d.lectureId, d.id);
                if (!st.valid) {
                    orphanList.push({
                        id: d.id,
                        store: 'doubts',
                        type: 'Doubt Entry',
                        courseTitle: st.courseTitle || `Course #${d.courseId}`,
                        targetName: d.comment || d.lectureName || `Doubt #${d.id}`,
                        reason: st.reason,
                        rawItem: d
                    });
                }
            }

            // 3. DPP_STORE
            const allDpp = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            for (const dpp of allDpp) {
                const sub = dpp.subfolder || dpp.chapter || '';
                const st = getRecordStatus(dpp.courseId, sub, dpp.lectureId, dpp.id);
                if (!st.valid) {
                    orphanList.push({
                        id: dpp.id,
                        store: 'dpps',
                        type: 'DPP Assignment',
                        courseTitle: st.courseTitle || `Course #${dpp.courseId}`,
                        targetName: dpp.name || dpp.title || `DPP #${dpp.id}`,
                        reason: st.reason,
                        rawItem: dpp
                    });
                }
            }

            // 4. courseflix_logs in localStorage
            try {
                let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
                cfLogs.forEach((log, index) => {
                    const st = getRecordStatus(log.courseId, log.subfolder || log.chapter, log.lectureId, log.id);
                    if (!st.valid) {
                        orphanList.push({
                            id: index,
                            store: 'logs',
                            type: 'Study Log',
                            courseTitle: st.courseTitle || `Course #${log.courseId}`,
                            targetName: log.lectureName || log.action || `Log #${index}`,
                            reason: st.reason,
                            rawItem: log
                        });
                    }
                });
            } catch (e) {}

            return orphanList;
        }

        async function deleteSelectedOrphanItems(selectedItems) {
            let count = 0;
            const progressIdsToDelete = selectedItems.filter(i => i.store === 'progress').map(i => i.id);
            const doubtIdsToDelete = selectedItems.filter(i => i.store === 'doubts').map(i => i.id);
            const dppIdsToDelete = selectedItems.filter(i => i.store === 'dpps').map(i => i.id);
            const logIndicesToDelete = new Set(selectedItems.filter(i => i.store === 'logs').map(i => i.id));

            if (progressIdsToDelete.length > 0) {
                const progressStore = getStore(PROGRESS_STORE, 'readwrite');
                for (const pid of progressIdsToDelete) {
                    progressStore.delete(pid);
                    count++;
                    if (typeof courseProgress !== 'undefined' && courseProgress) {
                        delete courseProgress[pid];
                    }
                }
            }

            if (doubtIdsToDelete.length > 0) {
                const doubtsStore = getStore(DOUBTS_STORE, 'readwrite');
                for (const did of doubtIdsToDelete) {
                    doubtsStore.delete(did);
                    count++;
                }
            }

            if (dppIdsToDelete.length > 0) {
                const dppStore = getStore(DPP_STORE, 'readwrite');
                for (const dpid of dppIdsToDelete) {
                    dppStore.delete(dpid);
                    count++;
                }
            }

            if (logIndicesToDelete.size > 0) {
                try {
                    let cfLogs = JSON.parse(localStorage.getItem('courseflix_logs') || '[]');
                    const filteredLogs = cfLogs.filter((_, idx) => !logIndicesToDelete.has(idx));
                    count += (cfLogs.length - filteredLogs.length);
                    localStorage.setItem('courseflix_logs', JSON.stringify(filteredLogs));
                } catch (e) {}
            }

            await cleanupOrphanedHistoryEntries();
            return count;
        }

        function showPurgeAnalysisModal(orphanList) {
            let modal = document.getElementById('purge-analysis-modal');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'purge-analysis-modal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'z-index: 1000000; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 20px;';

            const rowsHtml = orphanList.map((item, idx) => `
                <tr style="border-bottom: 1px solid var(--border-secondary, rgba(255,255,255,0.08)); font-size: 0.88rem;">
                    <td style="padding: 10px 12px; text-align: center;">
                        <input type="checkbox" class="purge-item-cb" data-index="${idx}" checked style="width: 16px; height: 16px; cursor: pointer; accent-color: #ef4444;" />
                    </td>
                    <td style="padding: 10px 12px; white-space: nowrap;">
                        <span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 3px 8px; border-radius: 6px; font-weight: 600; font-size: 0.78rem;">
                            ${item.type}
                        </span>
                    </td>
                    <td style="padding: 10px 12px; color: var(--text-primary, #f8fafc); font-weight: 600;">
                        ${item.courseTitle}
                    </td>
                    <td style="padding: 10px 12px; color: var(--text-secondary, #94a3b8); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${item.targetName}
                    </td>
                    <td style="padding: 10px 12px; white-space: nowrap;">
                        <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 3px 8px; border-radius: 6px; font-size: 0.78rem; font-weight: 600;">
                            ${item.reason}
                        </span>
                    </td>
                </tr>
            `).join('');

            modal.innerHTML = `
                <div class="modal-content glass-modal" style="max-width: 850px; width: 95%; max-height: 85vh; display: flex; flex-direction: column; padding: 1.5rem; border-radius: 16px; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(15, 23, 42, 0.96); box-shadow: 0 25px 60px rgba(0,0,0,0.7); color: #ffffff;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid var(--border-secondary, rgba(255,255,255,0.1)); padding-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                <i class="fas fa-trash-alt"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #ffffff;">Purge Orphan Data Analysis</h2>
                                <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #94a3b8;">There are <strong>${orphanList.length}</strong> orphan items to purge.</p>
                            </div>
                        </div>
                        <button id="close-purge-modal-btn" style="background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer;">&times;</button>
                    </div>

                    <div style="flex: 1; overflow-y: auto; margin-bottom: 1rem; border-radius: 10px; border: 1px solid var(--border-secondary, rgba(255,255,255,0.08)); background: rgba(0,0,0,0.2);">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead style="position: sticky; top: 0; background: rgba(30, 41, 59, 0.95); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10;">
                                <tr style="font-size: 0.82rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">
                                    <th style="padding: 10px 12px; width: 40px; text-align: center;">
                                        <input type="checkbox" id="purge-select-all-cb" checked style="width: 16px; height: 16px; cursor: pointer; accent-color: #ef4444;" />
                                    </th>
                                    <th style="padding: 10px 12px;">Type</th>
                                    <th style="padding: 10px 12px;">Subject / Course</th>
                                    <th style="padding: 10px 12px;">Target Content / Lecture</th>
                                    <th style="padding: 10px 12px;">Reason</th>
                                </tr>
                            </thead>
                            <tbody id="purge-table-body">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-secondary, rgba(255,255,255,0.1)); padding-top: 1rem;">
                        <div id="purge-selection-status" style="font-size: 0.88rem; font-weight: 600; color: #94a3b8;">
                            Selected: <span id="purge-selected-count" style="color: #ef4444;">${orphanList.length}</span> / ${orphanList.length} items
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button id="purge-cancel-analysis-btn" class="secondary-btn" style="padding: 9px 18px; border-radius: 10px; font-weight: 600; cursor: pointer;">Cancel</button>
                            <button id="purge-execute-selected-btn" class="danger-btn" style="background: #ef4444; color: #ffffff; padding: 9px 18px; border-radius: 10px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4); display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-trash-alt"></i> Delete Selected (<span id="purge-btn-count">${orphanList.length}</span>)
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const selectAllCb = modal.querySelector('#purge-select-all-cb');
            const itemCbs = modal.querySelectorAll('.purge-item-cb');
            const countSpan = modal.querySelector('#purge-selected-count');
            const btnCountSpan = modal.querySelector('#purge-btn-count');
            const deleteBtn = modal.querySelector('#purge-execute-selected-btn');

            const updateCounts = () => {
                const checked = Array.from(itemCbs).filter(cb => cb.checked);
                if (countSpan) countSpan.textContent = checked.length;
                if (btnCountSpan) btnCountSpan.textContent = checked.length;
                if (deleteBtn) deleteBtn.disabled = checked.length === 0;
                if (selectAllCb) selectAllCb.checked = checked.length === itemCbs.length;
            };

            if (selectAllCb) {
                selectAllCb.addEventListener('change', (e) => {
                    itemCbs.forEach(cb => cb.checked = e.target.checked);
                    updateCounts();
                });
            }

            itemCbs.forEach(cb => {
                cb.addEventListener('change', updateCounts);
            });

            const closeModal = () => modal.remove();

            modal.querySelector('#close-purge-modal-btn')?.addEventListener('click', closeModal);
            modal.querySelector('#purge-cancel-analysis-btn')?.addEventListener('click', closeModal);

            deleteBtn?.addEventListener('click', async () => {
                const selectedIndices = Array.from(itemCbs).filter(cb => cb.checked).map(cb => parseInt(cb.dataset.index));
                const selectedItems = selectedIndices.map(idx => orphanList[idx]);

                if (selectedItems.length === 0) return;

                deleteBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Deleting...`;
                deleteBtn.disabled = true;

                try {
                    const deletedCount = await deleteSelectedOrphanItems(selectedItems);
                    if (typeof loadCoursesFromDB === 'function') await loadCoursesFromDB();
                    if (typeof renderHistoryView === 'function') renderHistoryView();
                    if (typeof renderNotesCourseSelectionView === 'function') renderNotesCourseSelectionView();
                    if (typeof renderIntellHome === 'function') renderIntellHome();

                    showToast(`Successfully purged ${deletedCount} selected orphan items!`);
                    closeModal();
                } catch (err) {
                    console.error('Error deleting selected orphan items:', err);
                    showToast('Error during orphan deletion.', true);
                }
            });
        }

        if (purgeBtn) {
            purgeBtn.addEventListener('click', () => {
                purgeBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing...`;
                purgeBtn.disabled = true;

                setTimeout(async () => {
                    try {
                        const orphanList = await analyzeOrphanData();
                        if (!orphanList || orphanList.length === 0) {
                            showToast('No orphan data found to purge. Everything is clean!');
                        } else {
                            document.getElementById('modal-overlay')?.classList.add('hidden');
                            showPurgeAnalysisModal(orphanList);
                        }
                    } catch (err) {
                        console.error('Error analyzing orphan data:', err);
                        showToast('Error analyzing orphan data.', true);
                    } finally {
                        purgeBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Purge Orphan Data`;
                        purgeBtn.disabled = false;
                    }
                }, 50);
            });
        }

        function downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        function base64ToBlob(base64) {
            const byteString = atob(base64.split(',')[1]);
            const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeString });
        }
        async function blobToDataURL(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(reader.error);
                reader.readAsDataURL(blob);
            });
        }

        function formatBytes(bytes, decimals = 1) {
            if (!bytes || bytes <= 0) return '0 B';
            const k = 1024;
            const dm = decimals < 0 ? 0 : decimals;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }

        async function getHandleSize(handle) {
            if (!handle) return 0;
            if (typeof handle === 'number') return handle;
            if (handle instanceof Blob || handle instanceof File) return handle.size;
            if (typeof handle.getFile === 'function') {
                try {
                    const file = await handle.getFile();
                    return file ? file.size : 0;
                } catch (e) {
                    return 0;
                }
            }
            if (typeof handle === 'string') {
                if (handle.startsWith('data:')) {
                    const base64Str = handle.split(',')[1] || '';
                    return Math.round((base64Str.length * 3) / 4);
                }
                return new Blob([handle]).size;
            }
            return 0;
        }

        async function analyzeExportData() {
            await ensureDB();
            const allProgress = await new Promise(r => getStore(PROGRESS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const allDpps = await new Promise(r => getStore(DPP_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const allDoubts = await new Promise(r => getStore(DOUBTS_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const allHistory = await new Promise(r => getStore(HISTORY_STORE, 'readonly').getAll().onsuccess = e => r(e.target.result || []));
            const localStoreData = { ...localStorage };

            // Backup ProgressAppDB assignmentFiles
            const progressFiles = [];
            try {
                const progRequest = indexedDB.open('ProgressAppDB', 1);
                await new Promise((resolve) => {
                    progRequest.onsuccess = async (e) => {
                        const db = e.target.result;
                        if (db.objectStoreNames.contains('assignmentFiles')) {
                            const tx = db.transaction('assignmentFiles', 'readonly');
                            const store = tx.objectStore('assignmentFiles');
                            const allReq = store.getAll();
                            const keysReq = store.getAllKeys();
                            allReq.onsuccess = async () => {
                                keysReq.onsuccess = async () => {
                                    const handles = allReq.result;
                                    const keys = keysReq.result;
                                    for (let i = 0; i < handles.length; i++) {
                                        const handle = handles[i];
                                        const id = keys[i];
                                        let file;
                                        try {
                                            if (handle instanceof File) {
                                                file = handle;
                                            } else if (handle && typeof handle.getFile === 'function') {
                                                if (await handle.queryPermission() === 'granted') {
                                                    file = await handle.getFile();
                                                }
                                            }
                                            if (file) {
                                                const filename = `prog_${id}_${file.name}`;
                                                progressFiles.push({ id: id, filename: filename, file: file, size: file.size });
                                            }
                                        } catch (err) {
                                            console.warn("Could not inspect progress file size", id, err);
                                        }
                                    }
                                    resolve();
                                };
                            };
                        } else {
                            resolve();
                        }
                    };
                    progRequest.onerror = () => resolve();
                });
            } catch (e) { console.error("Error reading ProgressAppDB", e); }

            // Helper to resolve Subject Title
            const getSubjectTitle = (cId) => {
                if (!cId) return 'General / Other';
                const found = courses.find(c => String(c.id) === String(cId));
                return found ? (found.title || `Subject ${cId}`) : `Subject #${cId}`;
            };

            // 1. Lecture Notes PDFs Grouped by Subject
            const notesSubjectsMap = {};
            let totalNotesPdfSize = 0;
            for (const prog of allProgress) {
                if (prog && prog.pdfHandle) {
                    const size = await getHandleSize(prog.pdfHandle);
                    totalNotesPdfSize += size;
                    const cId = String(prog.courseId || 'other');
                    if (!notesSubjectsMap[cId]) {
                        notesSubjectsMap[cId] = {
                            courseId: cId,
                            title: getSubjectTitle(cId),
                            count: 0,
                            size: 0
                        };
                    }
                    notesSubjectsMap[cId].count++;
                    notesSubjectsMap[cId].size += size;
                }
            }

            // 2. DPP & Assignment Files Grouped by Subject (Deduplicated)
            const dppSubjectsMap = {};
            let totalDppPdfSize = 0;
            const processedDppHandles = new Set();

            // DPPs from DPP_STORE
            for (const dpp of allDpps) {
                if (dpp && dpp.fileHandle) {
                    if (!processedDppHandles.has(dpp.fileHandle)) {
                        processedDppHandles.add(dpp.fileHandle);
                        const size = await getHandleSize(dpp.fileHandle);
                        totalDppPdfSize += size;
                        const cId = String(dpp.courseId || 'other');
                        if (!dppSubjectsMap[cId]) {
                            dppSubjectsMap[cId] = {
                                courseId: cId,
                                title: getSubjectTitle(cId),
                                dppCount: 0,
                                assignCount: 0,
                                totalCount: 0,
                                size: 0
                            };
                        }
                        dppSubjectsMap[cId].dppCount++;
                        dppSubjectsMap[cId].totalCount++;
                        dppSubjectsMap[cId].size += size;
                    }
                }
            }

            // Assignments from PROGRESS_STORE (only if not already counted via DPP_STORE)
            for (const prog of allProgress) {
                if (prog && prog.assignmentHandle) {
                    if (!processedDppHandles.has(prog.assignmentHandle)) {
                        processedDppHandles.add(prog.assignmentHandle);
                        const size = await getHandleSize(prog.assignmentHandle);
                        totalDppPdfSize += size;
                        const cId = String(prog.courseId || 'other');
                        if (!dppSubjectsMap[cId]) {
                            dppSubjectsMap[cId] = {
                                courseId: cId,
                                title: getSubjectTitle(cId),
                                dppCount: 0,
                                assignCount: 0,
                                totalCount: 0,
                                size: 0
                            };
                        }
                        dppSubjectsMap[cId].assignCount++;
                        dppSubjectsMap[cId].totalCount++;
                        dppSubjectsMap[cId].size += size;
                    }
                }
            }

            // ProgressAppDB assignmentFiles (only if not already counted)
            for (const pf of progressFiles) {
                if (pf.file && !processedDppHandles.has(pf.file)) {
                    processedDppHandles.add(pf.file);
                    totalDppPdfSize += (pf.size || 0);
                }
            }

            // 3. Courses JSON + Thumbnails (Deduplicated base64)
            let coursesSize = 0;
            try {
                const cleanCoursesForCalc = [];
                for (const c of courses) {
                    const cleanC = { ...c };
                    if (cleanC.thumbnail && typeof cleanC.thumbnail === 'string' && cleanC.thumbnail.startsWith('data:')) {
                        try {
                            coursesSize += base64ToBlob(cleanC.thumbnail).size;
                        } catch (e) {}
                        delete cleanC.thumbnail;
                    }
                    if (cleanC.subCourseData) {
                        const newSub = {};
                        for (const sub in cleanC.subCourseData) {
                            const subObj = { ...cleanC.subCourseData[sub] };
                            if (subObj.thumbnail && typeof subObj.thumbnail === 'string' && subObj.thumbnail.startsWith('data:')) {
                                try {
                                    coursesSize += base64ToBlob(subObj.thumbnail).size;
                                } catch (e) {}
                                delete subObj.thumbnail;
                            }
                            newSub[sub] = subObj;
                        }
                        cleanC.subCourseData = newSub;
                    }
                    cleanCoursesForCalc.push(cleanC);
                }
                coursesSize += new Blob([JSON.stringify(cleanCoursesForCalc)]).size;
            } catch (e) {}

            // 4. Doubts Size
            let doubtsSize = 0;
            try {
                doubtsSize = new Blob([JSON.stringify(allDoubts)]).size;
            } catch (e) {}

            // 5. History Size (Deduplicated base64)
            let historySize = 0;
            try {
                const cleanHistForCalc = [];
                if (Array.isArray(allHistory)) {
                    for (const h of allHistory) {
                        const cleanH = { ...h };
                        if (cleanH.thumbnail && typeof cleanH.thumbnail === 'string' && cleanH.thumbnail.startsWith('data:')) {
                            try {
                                historySize += base64ToBlob(cleanH.thumbnail).size;
                            } catch (e) {}
                            delete cleanH.thumbnail;
                        }
                        cleanHistForCalc.push(cleanH);
                    }
                }
                historySize += new Blob([JSON.stringify(cleanHistForCalc)]).size;
            } catch (e) {}

            // 6. Settings / LocalStorage Size (Deduplicated base64)
            let settingsSize = 0;
            try {
                const cleanLS = { ...localStoreData };
                const facultyMetaRaw = cleanLS['courseflix_faculty_meta'];
                if (facultyMetaRaw) {
                    try {
                        const facultyMeta = JSON.parse(facultyMetaRaw);
                        for (const [fName, meta] of Object.entries(facultyMeta)) {
                            if (meta.photo && typeof meta.photo === 'string' && meta.photo.startsWith('data:')) {
                                try {
                                    settingsSize += base64ToBlob(meta.photo).size;
                                } catch (e) {}
                                delete meta.photo;
                            }
                        }
                        cleanLS['courseflix_faculty_meta'] = JSON.stringify(facultyMeta);
                    } catch (e) {}
                }
                settingsSize += new Blob([JSON.stringify(cleanLS)]).size;
            } catch (e) {}

            return {
                notesData: {
                    totalSize: totalNotesPdfSize,
                    subjects: Object.values(notesSubjectsMap).sort((a, b) => b.size - a.size)
                },
                dppsData: {
                    totalSize: totalDppPdfSize,
                    subjects: Object.values(dppSubjectsMap).sort((a, b) => b.size - a.size)
                },
                categorySizes: {
                    courses: coursesSize,
                    doubts: doubtsSize,
                    history: historySize,
                    settings: settingsSize
                },
                raw: {
                    allProgress,
                    allDpps,
                    allDoubts,
                    allHistory,
                    courses,
                    localStoreData,
                    progressFiles
                }
            };
        }

        async function openExportBackupModal(analysis) {
            let modal = document.getElementById('export-backup-modal');
            if (modal) modal.remove();

            const { notesData, dppsData, categorySizes } = analysis;

            // Generate Subject Rows HTML for DPPs / Assignments
            const dppSubjectRowsHtml = dppsData.subjects.length === 0
                ? `<div style="padding: 8px 12px; font-size: 0.82rem; color: #94a3b8; font-style: italic;">No DPP or Assignment PDFs found</div>`
                : dppsData.subjects.map(s => `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.25); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                            <input type="checkbox" class="export-dpp-subj-cb" data-course-id="${s.courseId}" checked style="width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer;" />
                            <span style="font-size: 0.88rem; font-weight: 600; color: #f1f5f9;">${s.title}</span>
                        </label>
                        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; background: rgba(255, 255, 255, 0.06); padding: 2px 8px; border-radius: 6px;">
                            ${s.totalCount} item${s.totalCount > 1 ? 's' : ''} (${formatBytes(s.size)})
                        </span>
                    </div>
                `).join('');

            // Generate Subject Rows HTML for Lecture Notes PDFs
            const notesSubjectRowsHtml = notesData.subjects.length === 0
                ? `<div style="padding: 8px 12px; font-size: 0.82rem; color: #94a3b8; font-style: italic;">No Lecture Notes PDFs found</div>`
                : notesData.subjects.map(s => `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.25); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                            <input type="checkbox" class="export-notes-subj-cb" data-course-id="${s.courseId}" checked style="width: 16px; height: 16px; accent-color: #3b82f6; cursor: pointer;" />
                            <span style="font-size: 0.88rem; font-weight: 600; color: #f1f5f9;">${s.title}</span>
                        </label>
                        <span style="font-size: 0.8rem; color: #94a3b8; font-weight: 600; background: rgba(255, 255, 255, 0.06); padding: 2px 8px; border-radius: 6px;">
                            ${s.count} PDF${s.count > 1 ? 's' : ''} (${formatBytes(s.size)})
                        </span>
                    </div>
                `).join('');

            modal = document.createElement('div');
            modal.id = 'export-backup-modal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'z-index: 1000000; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease-out;';

            modal.innerHTML = `
                <style>
                    #export-backup-modal ::-webkit-scrollbar,
                    #export-backup-modal *::-webkit-scrollbar {
                        display: none !important;
                        width: 0 !important;
                        height: 0 !important;
                    }
                    #export-backup-modal,
                    #export-backup-modal * {
                        -ms-overflow-style: none !important;
                        scrollbar-width: none !important;
                    }
                </style>
                <div class="modal-content glass-modal" style="max-width: 680px; width: 100%; max-height: 88vh; display: flex; flex-direction: column; padding: 1.4rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(15, 23, 42, 0.96); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8); color: #ffffff; font-family: inherit;">
                    
                    <!-- Header -->
                    <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.85rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                                <i class="fas fa-file-export"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.2rem; font-weight: 700; color: #ffffff;">Export Backup Options</h2>
                                <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #94a3b8;">Select which items and subject PDFs to include in your export</p>
                            </div>
                        </div>
                        <button id="close-export-modal-btn" style="background: none; border: none; font-size: 1.6rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; line-height: 1; transition: color 0.2s;">&times;</button>
                    </div>

                    <!-- Body List (DPP & Notes at TOP, NO SCROLLBAR) -->
                    <div style="flex: 1; overflow-y: auto; margin: 0.85rem 0; padding-right: 0; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; -ms-overflow-style: none;">
                        
                        <!-- 1. DPP & Assignment Files (TOP ITEM) -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; transition: border-color 0.2s;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-dpps-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.98rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-tasks" style="color: #10b981;"></i> DPP & Assignment Files
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Daily practice problems and lecture assignment attachments</div>
                                    </div>
                                </label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span id="export-cat-dpps-size" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                        ${formatBytes(dppsData.totalSize)}
                                    </span>
                                    <button id="toggle-dpps-subject-btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #e2e8f0; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Show Subject Wise PDFs">
                                        <i class="fas fa-chevron-down" id="dpps-chevron-icon" style="transition: transform 0.2s ease;"></i>
                                    </button>
                                </div>
                            </div>
                            <!-- Subject Breakdown Container -->
                            <div id="dpps-subject-container" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.1); flex-direction: column; gap: 8px;">
                                ${dppSubjectRowsHtml}
                            </div>
                        </div>

                        <!-- 2. Lecture Notes PDFs (TOP ITEM) -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; transition: border-color 0.2s;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-notes-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.98rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-book-open" style="color: #3b82f6;"></i> Lecture Notes PDFs
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Downloaded and attached lecture PDF notes</div>
                                    </div>
                                </label>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span id="export-cat-notes-size" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                        ${formatBytes(notesData.totalSize)}
                                    </span>
                                    <button id="toggle-notes-subject-btn" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #e2e8f0; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" title="Show Subject Wise PDFs">
                                        <i class="fas fa-chevron-down" id="notes-chevron-icon" style="transition: transform 0.2s ease;"></i>
                                    </button>
                                </div>
                            </div>
                            <!-- Subject Breakdown Container -->
                            <div id="notes-subject-container" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.1); flex-direction: column; gap: 8px;">
                                ${notesSubjectRowsHtml}
                            </div>
                        </div>

                        <!-- 3. Course Structure & Metadata -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-courses-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-layer-group" style="color: #a855f7;"></i> Course Structure & Metadata
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Courses, chapters, lecture hierarchy, and thumbnails</div>
                                    </div>
                                </label>
                                <span style="background: rgba(168, 85, 247, 0.15); color: #a855f7; border: 1px solid rgba(168, 85, 247, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.courses)}
                                </span>
                            </div>
                        </div>

                        <!-- 4. Doubts & Discussion Data -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-doubts-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-question-circle" style="color: #f59e0b;"></i> Doubts & Discussion Data
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Saved doubts, comments, and query entries</div>
                                    </div>
                                </label>
                                <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.doubts)}
                                </span>
                            </div>
                        </div>

                        <!-- 5. Study History & Logs -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-history-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-history" style="color: #ec4899;"></i> Study History & Logs
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">Watch history, completion logs, and progress metrics</div>
                                    </div>
                                </label>
                                <span style="background: rgba(236, 72, 153, 0.15); color: #ec4899; border: 1px solid rgba(236, 72, 153, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.history)}
                                </span>
                            </div>
                        </div>

                        <!-- 6. App Settings & Preferences -->
                        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px;">
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                                    <input type="checkbox" id="export-cat-settings-cb" checked style="width: 18px; height: 18px; accent-color: #3b82f6; cursor: pointer;" />
                                    <div>
                                        <div style="font-weight: 700; font-size: 0.95rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                                            <i class="fas fa-cog" style="color: #64748b;"></i> App Settings & LocalStorage
                                        </div>
                                        <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 2px;">LocalStorage options, theme settings, and faculty info</div>
                                    </div>
                                </label>
                                <span style="background: rgba(100, 116, 139, 0.15); color: #cbd5e1; border: 1px solid rgba(100, 116, 139, 0.3); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700;">
                                    ${formatBytes(categorySizes.settings)}
                                </span>
                            </div>
                        </div>

                    </div>

                    <!-- Footer -->
                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 1rem; gap: 16px; flex-wrap: wrap;">
                        <div>
                            <div style="font-size: 0.78rem; color: #94a3b8; font-weight: 500;">Total Backup Size</div>
                            <div id="export-total-size-display" style="font-size: 1.15rem; font-weight: 700; color: #3b82f6;">0 MB</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <button id="export-cancel-btn" class="secondary-btn" style="padding: 10px 18px; border-radius: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;">Cancel</button>
                            <button id="export-confirm-btn" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; padding: 10px 22px; border-radius: 12px; font-weight: 600; font-size: 0.92rem; border: 1px solid rgba(255, 255, 255, 0.2); cursor: pointer; box-shadow: 0 4px 18px rgba(37, 99, 235, 0.45); display: inline-flex; align-items: center; justify-content: center; gap: 10px; white-space: nowrap; word-break: keep-all; flex-shrink: 0; line-height: 1.2; transition: all 0.2s ease;">
                                <i class="fas fa-file-export" style="font-size: 0.95rem;"></i>
                                <span>Export Selected</span>
                                <span id="export-btn-size-span" style="background: rgba(255, 255, 255, 0.22); backdrop-filter: blur(4px); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.3); display: inline-flex; align-items: center; margin-left: 2px;">0 MB</span>
                            </button>
                        </div>
                    </div>

                </div>
            `;

            document.body.appendChild(modal);

            // Element references
            const catDppsCb = modal.querySelector('#export-cat-dpps-cb');
            const catNotesCb = modal.querySelector('#export-cat-notes-cb');
            const catCoursesCb = modal.querySelector('#export-cat-courses-cb');
            const catDoubtsCb = modal.querySelector('#export-cat-doubts-cb');
            const catHistoryCb = modal.querySelector('#export-cat-history-cb');
            const catSettingsCb = modal.querySelector('#export-cat-settings-cb');

            const dppSubjCbs = modal.querySelectorAll('.export-dpp-subj-cb');
            const notesSubjCbs = modal.querySelectorAll('.export-notes-subj-cb');

            const toggleDppsBtn = modal.querySelector('#toggle-dpps-subject-btn');
            const toggleNotesBtn = modal.querySelector('#toggle-notes-subject-btn');
            const dppsSubjContainer = modal.querySelector('#dpps-subject-container');
            const notesSubjContainer = modal.querySelector('#notes-subject-container');
            const dppsChevronIcon = modal.querySelector('#dpps-chevron-icon');
            const notesChevronIcon = modal.querySelector('#notes-chevron-icon');

            const totalSizeDisplay = modal.querySelector('#export-total-size-display');
            const btnSizeSpan = modal.querySelector('#export-btn-size-span');
            const confirmBtn = modal.querySelector('#export-confirm-btn');
            const cancelBtn = modal.querySelector('#export-cancel-btn');
            const closeBtn = modal.querySelector('#close-export-modal-btn');

            // Accordion toggle handlers
            if (toggleDppsBtn && dppsSubjContainer) {
                toggleDppsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isHidden = dppsSubjContainer.style.display === 'none';
                    dppsSubjContainer.style.display = isHidden ? 'flex' : 'none';
                    if (dppsChevronIcon) dppsChevronIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            }

            if (toggleNotesBtn && notesSubjContainer) {
                toggleNotesBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isHidden = notesSubjContainer.style.display === 'none';
                    notesSubjContainer.style.display = isHidden ? 'flex' : 'none';
                    if (notesChevronIcon) notesChevronIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
                });
            }

            // Recalculate size function
            const updateSelectionSizes = () => {
                let bytes = 0;

                if (catCoursesCb && catCoursesCb.checked) bytes += categorySizes.courses;
                if (catDoubtsCb && catDoubtsCb.checked) bytes += categorySizes.doubts;
                if (catHistoryCb && catHistoryCb.checked) bytes += categorySizes.history;
                if (catSettingsCb && catSettingsCb.checked) bytes += categorySizes.settings;

                // Sum DPPs selected subject sizes
                dppSubjCbs.forEach(cb => {
                    if (cb.checked) {
                        const cId = cb.dataset.courseId;
                        const subj = dppsData.subjects.find(s => String(s.courseId) === String(cId));
                        if (subj) bytes += subj.size;
                    }
                });

                // Sum Notes selected subject sizes
                notesSubjCbs.forEach(cb => {
                    if (cb.checked) {
                        const cId = cb.dataset.courseId;
                        const subj = notesData.subjects.find(s => String(s.courseId) === String(cId));
                        if (subj) bytes += subj.size;
                    }
                });

                const formatted = formatBytes(bytes);
                if (totalSizeDisplay) totalSizeDisplay.textContent = formatted;
                if (btnSizeSpan) btnSizeSpan.textContent = formatted;
                if (confirmBtn) confirmBtn.disabled = (bytes === 0 && !catCoursesCb?.checked && !catSettingsCb?.checked && !catDoubtsCb?.checked && !catHistoryCb?.checked);
            };

            // Master checkbox listeners
            if (catDppsCb) {
                catDppsCb.addEventListener('change', () => {
                    dppSubjCbs.forEach(cb => cb.checked = catDppsCb.checked);
                    updateSelectionSizes();
                });
            }

            if (catNotesCb) {
                catNotesCb.addEventListener('change', () => {
                    notesSubjCbs.forEach(cb => cb.checked = catNotesCb.checked);
                    updateSelectionSizes();
                });
            }

            // Subject checkbox listeners
            dppSubjCbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    const checkedCount = Array.from(dppSubjCbs).filter(c => c.checked).length;
                    if (catDppsCb) catDppsCb.checked = (checkedCount > 0);
                    updateSelectionSizes();
                });
            });

            notesSubjCbs.forEach(cb => {
                cb.addEventListener('change', () => {
                    const checkedCount = Array.from(notesSubjCbs).filter(c => c.checked).length;
                    if (catNotesCb) catNotesCb.checked = (checkedCount > 0);
                    updateSelectionSizes();
                });
            });

            [catCoursesCb, catDoubtsCb, catHistoryCb, catSettingsCb].forEach(cb => {
                cb?.addEventListener('change', updateSelectionSizes);
            });

            // Initial calculation
            updateSelectionSizes();

            const closeModal = () => modal.remove();

            closeBtn?.addEventListener('click', closeModal);
            cancelBtn?.addEventListener('click', closeModal);

            confirmBtn?.addEventListener('click', async () => {
                const selectedDppSubjectIds = new Set(Array.from(dppSubjCbs).filter(cb => cb.checked).map(cb => String(cb.dataset.courseId)));
                const selectedNotesSubjectIds = new Set(Array.from(notesSubjCbs).filter(cb => cb.checked).map(cb => String(cb.dataset.courseId)));

                const options = {
                    exportCourses: catCoursesCb ? catCoursesCb.checked : true,
                    exportDoubts: catDoubtsCb ? catDoubtsCb.checked : true,
                    exportHistory: catHistoryCb ? catHistoryCb.checked : true,
                    exportSettings: catSettingsCb ? catSettingsCb.checked : true,
                    exportDppPdf: catDppsCb ? catDppsCb.checked : true,
                    selectedDppSubjectIds,
                    exportNotesPdf: catNotesCb ? catNotesCb.checked : true,
                    selectedNotesSubjectIds
                };

                await executeSelectiveExport(analysis, options);
            });
        }

        async function executeSelectiveExport(analysis, options) {
            const confirmBtn = document.getElementById('export-confirm-btn');
            if (confirmBtn) {
                confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating Zip...`;
                confirmBtn.disabled = true;
            }

            try {
                const zip = new JSZip();
                const { raw } = analysis;

                // 1. Courses
                const serializableCourses = [];
                if (options.exportCourses) {
                    for (const course of raw.courses) {
                        const cleanCourse = { ...course };
                        delete cleanCourse.handle;
                        if (cleanCourse.lectures) {
                            cleanCourse.lectures = cleanCourse.lectures.map(l => {
                                const cleanL = { ...l };
                                delete cleanL.handle;
                                return cleanL;
                            });
                        }
                        if (cleanCourse.chapters) {
                            cleanCourse.chapters = cleanCourse.chapters.map(c => {
                                const cleanC = { ...c };
                                cleanC.lectures = cleanC.lectures.map(l => {
                                    const cleanL = { ...l };
                                    delete cleanL.handle;
                                    return cleanL;
                                });
                                return cleanC;
                            });
                        }
                        if (course.handle) cleanCourse.folderName = course.handle.name;

                        if (cleanCourse.subCourseData) {
                            const newSubData = {};
                            let subIdx = 0;
                            for (const sub in cleanCourse.subCourseData) {
                                const subObj = { ...cleanCourse.subCourseData[sub] };
                                delete subObj.handle;
                                if (subObj.thumbnail && typeof subObj.thumbnail === 'string' && subObj.thumbnail.startsWith('data:')) {
                                    try {
                                        const subThumbBlob = base64ToBlob(subObj.thumbnail);
                                        const subThumbFilename = `sub_${course.id}_${subIdx++}.png`;
                                        zip.folder('sub_thumbnails').file(subThumbFilename, subThumbBlob);
                                        subObj.thumbnailFilename = subThumbFilename;
                                        delete subObj.thumbnail;
                                    } catch (e) {
                                        console.warn("Could not backup sub-course thumbnail for", sub, e);
                                    }
                                }
                                newSubData[sub] = subObj;
                            }
                            cleanCourse.subCourseData = newSubData;
                        }

                        if (course.thumbnail) {
                            const thumbBlob = base64ToBlob(course.thumbnail);
                            const thumbFilename = `thumb_${course.id}.png`;
                            zip.folder('thumbnails').file(thumbFilename, thumbBlob);
                            cleanCourse.thumbnailFilename = thumbFilename;
                        }
                        delete cleanCourse.thumbnail;
                        serializableCourses.push(cleanCourse);
                    }
                }

                // 2. Progress & Lecture Notes / Lecture Assignments
                const serializableProgress = [];
                for (const progress of raw.allProgress) {
                    const cleanProgress = { ...progress };
                    const progCourseId = String(progress.courseId || 'other');

                    if (progress.pdfHandle) {
                        if (options.exportNotesPdf && options.selectedNotesSubjectIds.has(progCourseId)) {
                            const pdfFilename = `pdf_${progress.id}.pdf`;
                            zip.folder('pdfs').file(pdfFilename, progress.pdfHandle);
                            cleanProgress.pdfFilename = pdfFilename;
                        }
                        delete cleanProgress.pdfHandle;
                    }

                    if (progress.assignmentHandle) {
                        if (options.exportDppPdf && options.selectedDppSubjectIds.has(progCourseId)) {
                            const assignFilename = `assign_${progress.id}_${progress.assignmentName || 'file'}`;
                            zip.folder('assignments').file(assignFilename, progress.assignmentHandle);
                            cleanProgress.assignmentFilename = assignFilename;
                        }
                        delete cleanProgress.assignmentHandle;
                    }

                    serializableProgress.push(cleanProgress);
                }

                // 3. DPPs
                const serializableDpps = [];
                for (const dpp of raw.allDpps) {
                    const cleanDpp = { ...dpp };
                    const dppCourseId = String(dpp.courseId || 'other');

                    if (dpp.fileHandle) {
                        if (options.exportDppPdf && options.selectedDppSubjectIds.has(dppCourseId)) {
                            const dppFilename = `dpp_${dpp.id}_${dpp.fileName || 'file'}`;
                            zip.folder('dpps').file(dppFilename, dpp.fileHandle);
                            cleanDpp.dppFilename = dppFilename;
                        }
                        delete cleanDpp.fileHandle;
                    }
                    serializableDpps.push(cleanDpp);
                }

                // 4. Doubts
                const allDoubts = options.exportDoubts ? raw.allDoubts : [];

                // 5. History
                const serializableHistory = [];
                if (options.exportHistory && Array.isArray(raw.allHistory)) {
                    let histIdx = 0;
                    for (const hist of raw.allHistory) {
                        const cleanHist = { ...hist };
                        if (hist.thumbnail && typeof hist.thumbnail === 'string' && hist.thumbnail.startsWith('data:')) {
                            try {
                                const histThumbBlob = base64ToBlob(hist.thumbnail);
                                const histThumbFilename = `hist_${hist.id || histIdx}_${histIdx}.png`;
                                zip.folder('history_thumbnails').file(histThumbFilename, histThumbBlob);
                                cleanHist.thumbnailFilename = histThumbFilename;
                                delete cleanHist.thumbnail;
                            } catch (e) {}
                        }
                        histIdx++;
                        serializableHistory.push(cleanHist);
                    }
                }

                // 6. Settings / LocalStorage
                let localStoreData = {};
                if (options.exportSettings) {
                    localStoreData = { ...raw.localStoreData };
                    const facultyMetaRaw = localStoreData['courseflix_faculty_meta'];
                    if (facultyMetaRaw) {
                        try {
                            const facultyMeta = JSON.parse(facultyMetaRaw);
                            for (const [facultyName, meta] of Object.entries(facultyMeta)) {
                                if (meta.photo && typeof meta.photo === 'string' && meta.photo.startsWith('data:')) {
                                    try {
                                        const photoBlob = base64ToBlob(meta.photo);
                                        const sanitizedName = facultyName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                        const photoFilename = `faculty_${sanitizedName}.png`;
                                        zip.folder('faculty_faces').file(photoFilename, photoBlob);
                                        meta.photoFilename = photoFilename;
                                        delete meta.photo;
                                    } catch (e) {}
                                }
                            }
                            localStoreData['courseflix_faculty_meta'] = JSON.stringify(facultyMeta);
                        } catch (e) {}
                    }
                }

                // 7. ProgressAppDB assignmentFiles
                const progressFiles = [];
                if (options.exportDppPdf && raw.progressFiles && raw.progressFiles.length > 0) {
                    for (const pf of raw.progressFiles) {
                        zip.folder('progress_assignments').file(pf.filename, pf.file);
                        progressFiles.push({ id: pf.id, filename: pf.filename });
                    }
                }

                const backupData = {
                    courses: serializableCourses,
                    progress: serializableProgress,
                    dpps: serializableDpps,
                    progressAppFiles: progressFiles,
                    doubts: allDoubts,
                    history: serializableHistory,
                    localStorage: localStoreData,
                    version: 3,
                    exportedAt: new Date().toISOString()
                };

                zip.file("backup.json", JSON.stringify(backupData));
                const zipBlob = await zip.generateAsync({ type: "blob" });
                downloadBlob(zipBlob, `CourseFlix_Backup_${new Date().toISOString().split('T')[0]}.zip`);

                showToast("Backup exported successfully!");
                document.getElementById('export-backup-modal')?.remove();
                document.getElementById('modal-overlay')?.classList.add('hidden');
            } catch (err) {
                console.error("Selective export failed:", err);
                showToast("Export failed. Check the console for errors.", true);
            } finally {
                if (confirmBtn) {
                    const currentSize = document.getElementById('export-total-size-display')?.textContent || '0 MB';
                    confirmBtn.innerHTML = `<i class="fas fa-file-export" style="font-size: 0.95rem;"></i><span>Export Selected</span><span id="export-btn-size-span" style="background: rgba(255, 255, 255, 0.22); backdrop-filter: blur(4px); padding: 3px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.3); display: inline-flex; align-items: center; margin-left: 2px;">${currentSize}</span>`;
                    confirmBtn.disabled = false;
                }
            }
        }

        async function triggerExportBackup(btn) {
            const exportBtnEl = btn || document.getElementById('export-btn');
            if (typeof courses === 'undefined' || !courses || courses.length === 0) {
                return showToast("There are no courses to export.", true);
            }
            if (exportBtnEl) {
                exportBtnEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing...`;
                exportBtnEl.disabled = true;
            }

            try {
                const analysis = await analyzeExportData();
                openExportBackupModal(analysis);
            } catch (err) {
                console.error("Export analysis failed:", err);
                showToast("Error preparing export options.", true);
            } finally {
                if (exportBtnEl) {
                    exportBtnEl.innerHTML = `<i class="fas fa-file-export"></i> Export Backup`;
                    exportBtnEl.disabled = false;
                }
            }
        }
        window.triggerExportBackup = triggerExportBackup;
        window.analyzeExportData = analyzeExportData;
        window.openExportBackupModal = openExportBackupModal;

        // Global Event Delegation for #export-btn
        document.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('#export-btn');
            if (targetBtn) {
                e.preventDefault();
                e.stopPropagation();
                triggerExportBackup(targetBtn);
            }
        });

        importBtn.addEventListener('click', () => {
            importZipInput.click();
        });

        importZipInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const importModal = document.getElementById('import-modal-overlay');
            const importModalContent = document.getElementById('import-modal-content');
            importModalContent.innerHTML = `<h2><i class="fas fa-spinner fa-spin"></i> Reading Backup...</h2>`;
            importModal.classList.remove('hidden');

            try {
                const zip = await JSZip.loadAsync(file);
                const backupFile = zip.file('backup.json');
                if (!backupFile) {
                    throw new Error('Invalid backup file: backup.json not found.');
                }
                const backupData = JSON.parse(await backupFile.async('string'));
                showImportRelinkModal(backupData, zip);
            } catch (err) {
                console.error("Import failed:", err);
                showToast(`Import failed: ${err.message}`, true);
                importModal.classList.add('hidden');
            } finally {
                e.target.value = null; 
            }
        });
        
        function showImportRelinkModal(backupData, zip) {
            const importModalContent = document.getElementById('import-modal-content');
            let courseLinksHTML = backupData.courses.map(c => `
                <div class="import-course-link-item" data-course-id="${c.id}" data-folder-name="${c.folderName || ''}">
                    <span class="import-course-title">${c.folderName || c.title}</span>
                    <div class="status-container">
                        ${c.folderName ? `<button class="primary-btn link-folder-btn" data-course-id="${c.id}">Select Folder</button>` : `<span class="status">OK</span>`}
                    </div>
                </div>
            `).join('');

            importModalContent.innerHTML = `
                <button class="close-modal-btn" title="Close">&times;</button>
                <h2>Link Course Folders</h2>
                <p style="color: var(--text-secondary); margin: -0.5rem 0 0.5rem 0;">Select a master folder to link all courses automatically, or link them individually. You can add multiple master folders.</p>
                <button id="select-master-folder" class="secondary-btn"><i class="fas fa-folder-tree"></i> Add Auto-Link Master Folder</button>
                <div class="modal-content-scrollable" style="margin-top:1rem;">
                    ${courseLinksHTML}
                </div>
                <button id="import-final-btn" class="primary-btn" disabled>Start Import</button>
                <div id="import-status-message"></div>
            `;
            
            const linkedHandles = {};
            const coursesThatNeedLinks = backupData.courses.filter(c => c.folderName);
            const coursesToLinkCount = coursesThatNeedLinks.length;
            let linkedCount = 0;

            const checkAllLinked = () => {
                const allLinked = linkedCount >= coursesToLinkCount;
                document.getElementById('import-final-btn').disabled = !allLinked;
            };
            checkAllLinked();

            importModalContent.querySelector('.close-modal-btn').onclick = () => {
                document.getElementById('import-modal-overlay').classList.add('hidden');
            };

            async function findSubdirectoryHandle(parentHandle, targetFolderName, maxDepth = 3) {
                if (!parentHandle || !targetFolderName) return null;
                const targetNorm = targetFolderName.trim().toLowerCase();

                if (parentHandle.name && parentHandle.name.trim().toLowerCase() === targetNorm) {
                    return parentHandle;
                }

                try {
                    const direct = await parentHandle.getDirectoryHandle(targetFolderName, { create: false });
                    if (direct) return direct;
                } catch (e) {}

                try {
                    for await (const entry of parentHandle.values()) {
                        if (entry.kind === 'directory' && entry.name.trim().toLowerCase() === targetNorm) {
                            return entry;
                        }
                    }
                } catch (e) {}

                async function search(dirHandle, currentDepth) {
                    if (currentDepth > maxDepth) return null;
                    try {
                        for await (const entry of dirHandle.values()) {
                            if (entry.kind === 'directory') {
                                if (entry.name.trim().toLowerCase() === targetNorm) {
                                    return entry;
                                }
                                const found = await search(entry, currentDepth + 1);
                                if (found) return found;
                            }
                        }
                    } catch (e) {}
                    return null;
                }

                return await search(parentHandle, 1);
            }

            importModalContent.querySelector('#select-master-folder').onclick = async () => {
                try {
                    const masterHandle = await window.showDirectoryPicker();
                    let newlyLinked = 0;
                    for (const courseItem of coursesThatNeedLinks) {
                        const courseId = courseItem.id;
                        if (linkedHandles[courseId]) continue;

                        const folderToSearch = courseItem.folderName || courseItem.title;
                        let courseHandle = await findSubdirectoryHandle(masterHandle, folderToSearch);
                        if (!courseHandle && courseItem.title && courseItem.title !== folderToSearch) {
                            courseHandle = await findSubdirectoryHandle(masterHandle, courseItem.title);
                        }

                        if (courseHandle) {
                            linkedHandles[courseId] = courseHandle;
                            const itemEl = importModalContent.querySelector(`.import-course-link-item[data-course-id="${courseId}"] .status-container`);
                            if (itemEl) {
                                itemEl.innerHTML = `<span class="status">✅ Auto-Linked</span>`;
                                linkedCount++;
                                newlyLinked++;
                            }
                        } else {
                            console.warn(`Could not find folder "${courseItem.folderName || courseItem.title}" in master directory.`);
                        }
                    }
                    if (newlyLinked > 0) {
                        showToast(`Auto-linked ${newlyLinked} course folder(s) from selected master directory.`);
                    } else {
                        showToast('No matching course folders found in selected master directory.', true);
                    }
                    checkAllLinked();
                } catch(e) { console.log('User cancelled master folder picker.', e); }
            };

            importModalContent.querySelectorAll('.link-folder-btn').forEach(btn => {
                btn.onclick = async () => {
                    try {
                        const handle = await window.showDirectoryPicker();
                        const courseId = btn.dataset.courseId;
                        if (!linkedHandles[courseId]) linkedCount++;
                        linkedHandles[courseId] = handle;
                        btn.parentElement.innerHTML = `<span class="status">✅ Linked</span>`;
                        checkAllLinked();
                    } catch (err) {
                        console.log("User cancelled folder picker.");
                    }
                };
            });

            document.getElementById('import-final-btn').onclick = async () => {
                if (!confirm("This will overwrite all current courses and progress. Are you sure you want to continue?")) return;
                await processImport(backupData, zip, linkedHandles);
            };
        }
        
        async function processImport(backupData, zip, linkedHandles) {
            const statusMsg = document.getElementById('import-status-message');
            statusMsg.textContent = 'Importing... Please wait.';
            document.getElementById('import-final-btn').disabled = true;

            try {
                await ensureDB();
                await Promise.all([
                    new Promise(r => getStore(STORE_NAME, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(PROGRESS_STORE, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(DPP_STORE, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(DOUBTS_STORE, 'readwrite').clear().onsuccess = r),
                    new Promise(r => getStore(HISTORY_STORE, 'readwrite').clear().onsuccess = r)
                ]);

                for (const course of backupData.courses) {
                    statusMsg.textContent = `Importing course: ${course.title}...`;
                    const newCourse = { ...course };
                    if (course.folderName) {
                        newCourse.handle = linkedHandles[course.id];
                        if (!newCourse.handle) throw new Error(`Folder for ${course.title} was not linked.`);
                        try {
                            const courseData = await scanDirectoryHandle(newCourse.handle, '', newCourse.lectures || [], true);
                            newCourse.lectures = courseData.lectures;
                            newCourse.totalDuration = courseData.totalDuration;
                            newCourse.chapters = courseData.chapters;
                            newCourse.videoCount = courseData.videoCount;
                            enrichCourseDurationsInBackground(newCourse.id, newCourse.handle);
                        } catch (e) {
                            console.error(`Error scanning imported course "${course.title}":`, e);
                        }
                    }
                    if (course.thumbnailFilename) {
                        const thumbFile = zip.file(`thumbnails/${course.thumbnailFilename}`);
                        if (thumbFile) newCourse.thumbnail = await blobToDataURL(await thumbFile.async('blob'));
                    }
                    if (newCourse.subCourseData) {
                        for (const sub in newCourse.subCourseData) {
                            const subObj = newCourse.subCourseData[sub];
                            if (subObj.thumbnailFilename) {
                                const subThumbFile = zip.file(`sub_thumbnails/${subObj.thumbnailFilename}`);
                                if (subThumbFile) {
                                    subObj.thumbnail = await blobToDataURL(await subThumbFile.async('blob'));
                                }
                            }
                        }
                    }
                    await new Promise(r => getStore(STORE_NAME, 'readwrite').put(newCourse).onsuccess = r);
                }

                for (const progress of backupData.progress) {
                    statusMsg.textContent = `Importing progress...`;
                    const newProgress = { ...progress };
                    if (progress.pdfFilename) {
                        const pdfFile = zip.file(`pdfs/${progress.pdfFilename}`);
                        if (pdfFile) newProgress.pdfHandle = new File([await pdfFile.async('blob')], progress.pdfName, { type: 'application/pdf' });
                    }
                     if (progress.assignmentFilename) {
                        const assignFile = zip.file(`assignments/${progress.assignmentFilename}`);
                        if (assignFile) {
                            const blob = await assignFile.async('blob');
                            const type = progress.assignmentType || 'application/octet-stream';
                            newProgress.assignmentHandle = new File([blob], progress.assignmentName, { type });
                        }
                    }
                    await new Promise(r => getStore(PROGRESS_STORE, 'readwrite').put(newProgress).onsuccess = r);
                }

                if (backupData.dpps) {
                    for (const dpp of backupData.dpps) {
                        statusMsg.textContent = `Importing DPPs...`;
                        const newDpp = { ...dpp };
                        if (dpp.dppFilename) {
                            const dppFile = zip.file(`dpps/${dpp.dppFilename}`);
                            if (dppFile) {
                                const blob = await dppFile.async('blob');
                                newDpp.fileHandle = new File([blob], dpp.fileName, { type: 'application/pdf' });
                            }
                        }
                        await new Promise(r => getStore(DPP_STORE, 'readwrite').put(newDpp).onsuccess = r);
                    }
                }

                if (backupData.doubts) {
                    for (const doubt of backupData.doubts) {
                        await new Promise(r => getStore(DOUBTS_STORE, 'readwrite').put(doubt).onsuccess = r);
                    }
                }
                
                if (backupData.history) {
                    for (const hist of backupData.history) {
                        const newHist = { ...hist };
                        if (hist.thumbnailFilename) {
                            const histThumbFile = zip.file(`history_thumbnails/${hist.thumbnailFilename}`);
                            if (histThumbFile) {
                                newHist.thumbnail = await blobToDataURL(await histThumbFile.async('blob'));
                            }
                        }
                        await new Promise(r => getStore(HISTORY_STORE, 'readwrite').put(newHist).onsuccess = r);
                    }
                }
                
                if (backupData.localStorage) {
                    for (const [key, value] of Object.entries(backupData.localStorage)) {
                        localStorage.setItem(key, value);
                    }
                    // Restore Faculty Faces
                    try {
                        const facultyMetaStr = backupData.localStorage['courseflix_faculty_meta'];
                        if (facultyMetaStr) {
                            const facultyMeta = JSON.parse(facultyMetaStr);
                            let needsUpdate = false;
                            for (const [facultyName, meta] of Object.entries(facultyMeta)) {
                                if (meta.photoFilename) {
                                    const photoFile = zip.file(`faculty_faces/${meta.photoFilename}`);
                                    if (photoFile) {
                                        meta.photo = await blobToDataURL(await photoFile.async('blob'));
                                        delete meta.photoFilename;
                                        needsUpdate = true;
                                    }
                                }
                            }
                            if (needsUpdate) {
                                localStorage.setItem('courseflix_faculty_meta', JSON.stringify(facultyMeta));
                            }
                        }
                    } catch (e) {
                        console.error("Error restoring faculty faces", e);
                    }
                }

                if (backupData.progressAppFiles) {
                    try {
                        const progRequest = indexedDB.open('ProgressAppDB', 1);
                        await new Promise((resolve, reject) => {
                            progRequest.onupgradeneeded = (e) => {
                                const db = e.target.result;
                                if (!db.objectStoreNames.contains('assignmentFiles')) {
                                    db.createObjectStore('assignmentFiles');
                                }
                            };
                            progRequest.onsuccess = async (e) => {
                                const db = e.target.result;
                                if (!db.objectStoreNames.contains('assignmentFiles')) {
                                    return resolve();
                                }
                                const tx = db.transaction('assignmentFiles', 'readwrite');
                                const store = tx.objectStore('assignmentFiles');
                                store.clear();
                                
                                for (const pFile of backupData.progressAppFiles) {
                                    const zipFile = zip.folder('progress_assignments').file(pFile.filename);
                                    if (zipFile) {
                                        const blob = await zipFile.async("blob");
                                        const originalName = pFile.filename.replace(/^prog_[^_]+_/, '');
                                        const file = new File([blob], originalName, { type: 'application/pdf' });
                                        store.put(file, pFile.id);
                                    }
                                }
                                tx.oncomplete = () => resolve();
                                tx.onerror = () => resolve();
                            };
                            progRequest.onerror = () => resolve();
                        });
                    } catch(e) { console.error("Error restoring ProgressAppDB", e); }
                }

                statusMsg.textContent = 'Import complete! Reloading...';
                showToast("Import successful! Your library has been restored.");
                
                setTimeout(async () => {
                    document.getElementById('import-modal-overlay').classList.add('hidden');
                    document.getElementById('modal-overlay').classList.add('hidden');
                    await loadAllProgress();
                    await loadCoursesFromDB();
                    switchView('dashboard-view');
                }, 1500);

            } catch (err) {
                console.error("Error during final import stage:", err);
                statusMsg.textContent = `Error: ${err.message}`;
                showToast(`Import failed: ${err.message}`, true);
            }
        }


// Attach modal openers to window and DOM
if (typeof window !== 'undefined') {
    window.analyzeOrphanData = analyzeOrphanData;
    window.deleteSelectedOrphanItems = deleteSelectedOrphanItems;
    window.downloadBlob = downloadBlob;
    window.base64ToBlob = base64ToBlob;
    window.triggerExportBackup = triggerExportBackup;
    window.showImportRelinkModal = showImportRelinkModal;
    window.processImport = processImport;
}

document.addEventListener('click', (e) => {
    const target = e.target.closest('#open-settings-btn, #add-course-btn, .manage-backup-btn, #manage-backup-btn');
    if (target) {
        e.preventDefault();
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }
});
