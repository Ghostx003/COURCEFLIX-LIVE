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
