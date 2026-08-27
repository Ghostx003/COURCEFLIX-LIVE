// Completion Calculator Service
// Re-uses pure calculation engine from completionEstimator.js for legacy callers

import { formatExactTime } from './utils.js';
import {
    calculateTotalProgressStats,
    estimateCompletion,
    calculateTodayGoal,
    getProgressColor
} from '../utils/completionEstimator.js';

export function updateDailyGoalDisplay(dailyHours, speed, overrideTargetLectures = null) {
    const courseProgress = typeof window.courseProgress !== 'undefined' ? window.courseProgress : {};
    const mode = (overrideTargetLectures !== null && overrideTargetLectures !== undefined) ? 'lectures' : 'hours';
    const goalData = calculateTodayGoal(courseProgress, mode, dailyHours, overrideTargetLectures, speed);

    const textEl = document.getElementById('daily-goal-text');
    const checkboxEl = document.getElementById('daily-goal-checkbox');
    const dropdownEl = document.getElementById('daily-goal-dropdown');
    
    if (textEl) textEl.textContent = `Goal: ${goalData.completedTodayCount}/${goalData.targetLectures} lectures`;
    if (checkboxEl) checkboxEl.checked = goalData.isGoalMet;
    
    if (dropdownEl) {
        if (goalData.completedTodayList.length === 0) {
            dropdownEl.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">No lectures completed today.</div>';
        } else {
            dropdownEl.innerHTML = goalData.completedTodayList.map(prog => {
                return `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-primary); padding-bottom: 4px; margin-bottom: 4px;">
                            <div style="font-size: 0.8rem; flex-grow: 1; margin-right: 10px; overflow: hidden;">
                                <strong style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prog.courseTitle}</strong>
                                <span style="color: var(--text-secondary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prog.lectureName}</span>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--accent-primary); white-space: nowrap;">${prog.timeFormatted}</div>
                        </div>`;
            }).join('');
        }
    }
}

let currentCalcTargetMode = typeof localStorage !== 'undefined' ? (localStorage.getItem('calcTargetMode') || 'hours') : 'hours';

export function setupCalcModeListeners() {
    const hoursBtn = document.getElementById('calc-mode-hours-btn');
    const lecturesBtn = document.getElementById('calc-mode-lectures-btn');
    const hoursContainer = document.getElementById('calc-hours-inputs-container');
    const lecturesContainer = document.getElementById('calc-lectures-inputs-container');
    const timeInfoBox = document.getElementById('calc-lecture-intake-time-info');

    const speedHoursInput = document.getElementById('calc-playback-speed-hours');
    const speedLecturesInput = document.getElementById('calc-playback-speed-lectures');

    if (!hoursBtn || !lecturesBtn) return;

    const applyModeUI = (mode) => {
        currentCalcTargetMode = mode;
        try { localStorage.setItem('calcTargetMode', mode); } catch (e) {}

        if (mode === 'hours') {
            hoursBtn.style.background = 'var(--accent-primary)';
            hoursBtn.style.color = '#ffffff';
            hoursBtn.classList.add('active');

            lecturesBtn.style.background = 'transparent';
            lecturesBtn.style.color = 'var(--text-secondary)';
            lecturesBtn.classList.remove('active');

            if (hoursContainer) hoursContainer.style.display = 'grid';
            if (lecturesContainer) lecturesContainer.style.display = 'none';
            if (timeInfoBox) timeInfoBox.style.display = 'none';
        } else {
            lecturesBtn.style.background = 'var(--accent-primary)';
            lecturesBtn.style.color = '#ffffff';
            lecturesBtn.classList.add('active');

            hoursBtn.style.background = 'transparent';
            hoursBtn.style.color = 'var(--text-secondary)';
            hoursBtn.classList.remove('active');

            if (hoursContainer) hoursContainer.style.display = 'none';
            if (lecturesContainer) lecturesContainer.style.display = 'grid';
            if (timeInfoBox) timeInfoBox.style.display = 'flex';
        }
    };

    hoursBtn.onclick = () => { applyModeUI('hours'); runCompletionCalculator(); };
    lecturesBtn.onclick = () => { applyModeUI('lectures'); runCompletionCalculator(); };

    if (speedHoursInput && speedLecturesInput) {
        speedHoursInput.oninput = () => {
            speedLecturesInput.value = speedHoursInput.value;
            runCompletionCalculator();
        };
        speedLecturesInput.oninput = () => {
            speedHoursInput.value = speedLecturesInput.value;
            runCompletionCalculator();
        };
    }

    const dailyHoursInput = document.getElementById('calc-daily-hours');
    if (dailyHoursInput) dailyHoursInput.oninput = runCompletionCalculator;

    const dailyLecturesInput = document.getElementById('calc-daily-lectures');
    if (dailyLecturesInput) dailyLecturesInput.oninput = runCompletionCalculator;

    applyModeUI(currentCalcTargetMode);
}

export function runCompletionCalculator() {
    setupCalcModeListeners();

    const stats = typeof window.updateTotalTimeLeftDisplay === 'function' ? window.updateTotalTimeLeftDisplay() : null;
    const totalSeconds = stats ? stats.totalSecondsLeft : 0;
    const completedSeconds = stats ? stats.totalCompletedSeconds : 0;
    const pendingLectures = stats ? stats.pendingLectures : 0;
    const completedLectures = stats ? stats.totalCompletedLectures : 0;
    const pct = stats ? stats.pct : 0;
    const courseBreakdown = stats ? stats.courseBreakdown : [];

    const hoursStudiedEl = document.getElementById('calc-hours-studied');
    if (hoursStudiedEl) hoursStudiedEl.innerText = (completedSeconds / 3600).toFixed(1);

    const hoursRemainingEl = document.getElementById('calc-hours-remaining');
    if (hoursRemainingEl) hoursRemainingEl.innerText = (totalSeconds / 3600).toFixed(1);

    const completedLecsEl = document.getElementById('calc-completed-lectures-count');
    if (completedLecsEl) completedLecsEl.innerText = completedLectures;

    const pendingLecsEl = document.getElementById('calc-pending-lectures-count');
    if (pendingLecsEl) pendingLecsEl.innerText = pendingLectures;

    const calcProgressEl = document.getElementById('calc-progress-percentage');
    const calcProgressBar = document.getElementById('calc-progress-bar');
    const progressColor = getProgressColor(pct);

    if (calcProgressEl) {
        calcProgressEl.innerText = `${pct}%`;
        calcProgressEl.style.color = progressColor;
    }
    if (calcProgressBar) {
        calcProgressBar.style.width = `${pct}%`;
        calcProgressBar.style.background = progressColor;
    }

    const exactTotalEl = document.getElementById('calc-exact-time-total');
    if (exactTotalEl) {
        exactTotalEl.innerText = formatExactTime(totalSeconds);
        exactTotalEl.style.color = progressColor;
    }

    const breakdownListEl = document.getElementById('calc-course-time-breakdown');
    if (breakdownListEl) {
        if (courseBreakdown.length === 0) {
            breakdownListEl.innerHTML = '<div style="color:var(--text-secondary); font-size:0.82rem; padding:6px;">No active courses found.</div>';
        } else {
            breakdownListEl.innerHTML = courseBreakdown.map(c => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-secondary); border-radius:10px; border:1px solid var(--border-secondary);">
                    <div style="display:flex; flex-direction:column; min-width:0; flex:1; margin-right:12px;">
                        <span style="font-weight:700; font-size:0.85rem; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${c.title}</span>
                        <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">${c.completedLectures}/${c.totalLectures} lecs done (${c.percentage}%)</span>
                    </div>
                    <div style="font-weight:800; font-size:0.85rem; color:${getProgressColor(c.percentage)}; white-space:nowrap; background:var(--bg-tertiary); padding:4px 8px; border-radius:6px; border:1px solid var(--border-primary);">
                        ${formatExactTime(c.secondsLeft)}
                    </div>
                </div>
            `).join('');
        }
    }

    const resultDateEl = document.getElementById('calc-result-date');
    const resultStatsEl = document.getElementById('calc-result-stats');

    const dailyHoursInput = document.getElementById('calc-daily-hours');
    const dailyLecturesInput = document.getElementById('calc-daily-lectures');
    const speedHoursInput = document.getElementById('calc-playback-speed-hours');
    const speedLecturesInput = document.getElementById('calc-playback-speed-lectures');

    const dailyHours = parseFloat(dailyHoursInput?.value) || 7;
    const dailyLectures = parseFloat(dailyLecturesInput?.value) || 4;
    const speed = parseFloat(currentCalcTargetMode === 'hours' ? speedHoursInput?.value : speedLecturesInput?.value) || 1.5;

    try {
        if (currentCalcTargetMode === 'hours') {
            localStorage.setItem('calcDailyHours', dailyHours);
        } else {
            localStorage.setItem('calcDailyLectures', dailyLectures);
        }
        localStorage.setItem('calcPlaybackSpeed', speed);
    } catch (e) {}

    updateDailyGoalDisplay(dailyHours, speed, currentCalcTargetMode === 'lectures' ? dailyLectures : null);

    const est = estimateCompletion({
        totalSecondsLeft: totalSeconds,
        pendingLectures,
        mode: currentCalcTargetMode,
        dailyHours,
        dailyLectures,
        speed
    });

    if (currentCalcTargetMode === 'lectures') {
        const dailyTimeSpan = document.getElementById('calc-lecture-intake-daily-time');
        const countSpan = document.getElementById('calc-lecture-intake-count');
        const speedSpan = document.getElementById('calc-lecture-intake-speed');

        if (dailyTimeSpan) dailyTimeSpan.innerText = formatExactTime(est.dailyWatchTimeSec);
        if (countSpan) countSpan.innerText = dailyLectures;
        if (speedSpan) speedSpan.innerText = speed;
    }

    if (resultDateEl) resultDateEl.innerText = est.finishDateFormatted;
    if (resultStatsEl) resultStatsEl.innerText = est.metaText;
}

export function openCalculatorModal() {
    const modal = document.getElementById('completion-calculator-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    // If the legacy DOM fields exist, populate them as well
    if (document.getElementById('calc-hours-studied')) {
        runCompletionCalculator();
    }
}

export function initCalculatorListeners() {
    const triggerEl = document.getElementById('total-time-left-display');
    const runBtn = document.getElementById('run-calculator-btn');
    if (triggerEl) triggerEl.addEventListener('click', openCalculatorModal);
    if (runBtn) runBtn.addEventListener('click', runCompletionCalculator);
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.updateDailyGoalDisplay = updateDailyGoalDisplay;
    window.setupCalcModeListeners = setupCalcModeListeners;
    window.runCompletionCalculator = runCompletionCalculator;
    window.openCalculatorModal = openCalculatorModal;
    window.initCalculatorListeners = initCalculatorListeners;
}
