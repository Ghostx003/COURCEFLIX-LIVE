/**
 * View Lifecycle Transition Service
 * Decouples presentation, DOM synchronization, media teardown,
 * and legacy view render invocations from core routing logic.
 */

import { handleLeavingPlayer } from './playerService.js';
import { ensureDB } from './db.js';

/**
 * Executes DOM presentation updates, player teardown, and view initializers.
 * @param {string} targetView - The destination view identifier.
 * @param {string|null} previousView - The origin view identifier.
 * @param {object} options - Transition options ({ pushState: boolean }).
 */
export function handleViewTransition(targetView, previousView = null, options = {}) {
    if (typeof document === 'undefined') return;

    // 1. Navigation Bar Visibility
    const navEl = document.querySelector('nav');
    if (navEl) {
        if (targetView === 'player-view') {
            navEl.classList.add('hidden');
        } else {
            navEl.classList.remove('hidden');
        }
    }

    // 2. DOM View Activation (.view.active)
    const targetDOMId = targetView === 'dashboard-view' ? 'dashboard-view-el' : targetView;
    document.querySelectorAll('.view').forEach(view => {
        view.classList.toggle('active', view.id === targetDOMId);
    });

    // 3. Navbar Link Highlighting (.nav-link.active)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.view === targetView);
    });

    // 4. Player Teardown Lifecycle
    if (targetView !== 'player-view' && (previousView === 'player-view' || !previousView)) {
        handleLeavingPlayer({ clearSession: !!options.pushState });
    }

    // 5. Emit Legacy view-changed Compatibility Event
    window.dispatchEvent(new CustomEvent('view-changed', {
        detail: { view: targetView, previousView }
    }));

    // 6. Trigger Deferred Unmigrated Legacy View Initializers
    triggerLegacyViewInitializers(targetView);
}

/**
 * Triggers view renderers for unmigrated legacy views.
 * Will be progressively retired as each view transitions to React ownership.
 */
function triggerLegacyViewInitializers(viewId) {
    setTimeout(async () => {
        try {
            if (typeof ensureDB === 'function') await ensureDB();

            if (viewId === 'review-view' || viewId === 'practice-view') {
                if (typeof window.showFilteredCoursesView === 'function') {
                    window.showFilteredCoursesView(viewId.split('-')[0]);
                }
            } else if (viewId === 'intell-view') {
                if (typeof window.renderIntellView === 'function') {
                    window.renderIntellView();
                }
            } else if (viewId === 'upload-view') {
                const detailView = document.getElementById('upload-detail-view');
                const subfolderView = document.getElementById('upload-subfolder-view');
                if ((!detailView || detailView.classList.contains('hidden')) && (!subfolderView || subfolderView.classList.contains('hidden'))) {
                    const grid = document.getElementById('upload-course-grid');
                    if (grid) grid.classList.remove('hidden');
                    if (typeof window.renderUploadView === 'function') window.renderUploadView();
                }
            } else if (viewId === 'dpp-view') {
                const detailContainer = document.getElementById('dpp-detail-container');
                if (!detailContainer || detailContainer.classList.contains('hidden')) {
                    if (typeof window.renderDppCourseSelectionView === 'function') window.renderDppCourseSelectionView();
                }
            } else if (viewId === 'notes-view') {
                const detailContainer = document.getElementById('notes-detail-container');
                if (!detailContainer || detailContainer.classList.contains('hidden')) {
                    if (typeof window.renderNotesCourseSelectionView === 'function') window.renderNotesCourseSelectionView();
                }
            } else if (viewId === 'doubts-view') {
                if (typeof window.renderDoubtsCourseSelectionView === 'function') window.renderDoubtsCourseSelectionView();
            } else if (viewId === 'continue-view') {
                if (typeof window.renderContinueView === 'function') window.renderContinueView();
            } else if (viewId === 'history-view') {
                if (typeof window.renderHistoryView === 'function') window.renderHistoryView();
            } else if (viewId === 'faculty-view') {
                if (typeof window.renderFacultyView === 'function') window.renderFacultyView();
            }
        } catch (err) {
            console.warn('[viewLifecycleService] Deferred view initializer warning:', err);
        }
    }, 10);
}

// Expose globally for legacy scripts
if (typeof window !== 'undefined') {
    window.viewLifecycleService = {
        handleViewTransition,
        handleLeavingPlayer
    };
}
