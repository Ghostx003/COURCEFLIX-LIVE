// Completion Calculator Service
// Extracted and modularized from legacy.js

import { formatExactTime } from './utils.js';

export function updateDailyGoalDisplay(dailyHours, speed, overrideTargetLectures = null) {
    const targetLectures = (overrideTargetLectures !== null && overrideTargetLectures !== undefined)
        ? Math.ceil(overrideTargetLectures)
        : Math.ceil(dailyHours / (2 / speed));
    
    const todayStr = new Date().toLocaleDateString();
    let completedToday = [];
    
    const courseProgress = typeof window.courseProgress !== 'undefined' ? window.courseProgress : {};
    Object.values(courseProgress).forEach(prog => {
        if (prog.completed && prog.completedAt) {
            const completedDate = new Date(prog.completedAt).toLocaleDateString();
            if (completedDate === todayStr) {
                completedToday.push(prog);
            }
        }
    });
    
    const count = completedToday.length;
    const textEl = document.getElementById('daily-goal-text');
    const checkboxEl = document.getElementById('daily-goal-checkbox');
    const dropdownEl = document.getElementById('daily-goal-dropdown');
    
    if (textEl) textEl.textContent = `Goal: ${count}/${targetLectures} lectures`;
    if (checkboxEl) checkboxEl.checked = count >= targetLectures;
    
    if (dropdownEl) {
        if (count === 0) {
            dropdownEl.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px;">No lectures completed today.</div>';
        } else {
            completedToday.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
            
            dropdownEl.innerHTML = completedToday.map(prog => {
                const timeStr = new Date(prog.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-primary); padding-bottom: 4px; margin-bottom: 4px;">
                            <div style="font-size: 0.8rem; flex-grow: 1; margin-right: 10px; overflow: hidden;">
                                <strong style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prog.courseTitle || 'Course'}</strong>
                                <span style="color: var(--text-secondary); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prog.lectureName || 'Lecture'}</span>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--accent-primary); white-space: nowrap;">${timeStr}</div>
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
        localStorage.setItem('calcTargetMode', mode);

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
    let progressColor = '#ef4444';
    if (pct >= 80) progressColor = '#10b981';
    else if (pct >= 60) progressColor = '#06b6d4';
    else if (pct >= 30) progressColor = '#f59e0b';

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
                    <div style="font-weight:800; font-size:0.85rem; color:${c.percentage >= 80 ? '#10b981' : c.percentage >= 60 ? '#06b6d4' : c.percentage >= 30 ? '#f59e0b' : '#ef4444'}; white-space:nowrap; background:var(--bg-tertiary); padding:4px 8px; border-radius:6px; border:1px solid var(--border-primary);">
                        ${formatExactTime(c.secondsLeft)}
                    </div>
                </div>
            `).join('');
        }
    }

    const resultDateEl = document.getElementById('calc-result-date');
    const resultStatsEl = document.getElementById('calc-result-stats');

    if (totalSeconds === 0) {
        if (resultDateEl) resultDateEl.innerText = "Already Finished!";
        if (resultStatsEl) resultStatsEl.innerText = "0 pending lectures.";
        return;
    }

    let speed = 1.5;
    let daysRequired = 0;
    let metaText = "";

    if (currentCalcTargetMode === 'hours') {
        const dailyHoursInput = document.getElementById('calc-daily-hours');
        const speedInput = document.getElementById('calc-playback-speed-hours');
        const dailyHours = parseFloat(dailyHoursInput?.value) || 7;
        speed = parseFloat(speedInput?.value) || 1.5;

        localStorage.setItem('calcDailyHours', dailyHours);
        localStorage.setItem('calcPlaybackSpeed', speed);
        updateDailyGoalDisplay(dailyHours, speed);

        const totalHours = totalSeconds / 3600;
        const adjustedHours = totalHours / speed;
        daysRequired = adjustedHours / dailyHours;
        metaText = `${pendingLectures} pending lectures (${Math.ceil(adjustedHours)} hrs adjusted view time at ${speed}x speed).`;
    } else {
        const dailyLecturesInput = document.getElementById('calc-daily-lectures');
        const speedInput = document.getElementById('calc-playback-speed-lectures');
        const dailyLectures = parseFloat(dailyLecturesInput?.value) || 4;
        speed = parseFloat(speedInput?.value) || 1.5;

        localStorage.setItem('calcDailyLectures', dailyLectures);
        localStorage.setItem('calcPlaybackSpeed', speed);
        updateDailyGoalDisplay(0, speed, dailyLectures);

        const avgLectureDurationSec = pendingLectures > 0 ? (totalSeconds / pendingLectures) : 0;
        const dailyWatchTimeSec = (dailyLectures * avgLectureDurationSec) / speed;
        daysRequired = pendingLectures > 0 ? (pendingLectures / dailyLectures) : 0;

        const dailyTimeSpan = document.getElementById('calc-lecture-intake-daily-time');
        const countSpan = document.getElementById('calc-lecture-intake-count');
        const speedSpan = document.getElementById('calc-lecture-intake-speed');

        if (dailyTimeSpan) dailyTimeSpan.innerText = formatExactTime(dailyWatchTimeSec);
        if (countSpan) countSpan.innerText = dailyLectures;
        if (speedSpan) speedSpan.innerText = speed;

        metaText = `${pendingLectures} pending lectures (${daysRequired.toFixed(1)} days at ${dailyLectures} lecs/day • ${formatExactTime(dailyWatchTimeSec)}/day required at ${speed}x speed).`;
    }
    
    const finishDate = new Date(Date.now() + (daysRequired * 24 * 60 * 60 * 1000));
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateString = finishDate.toLocaleDateString('en-GB', options);
    
    if (resultDateEl) resultDateEl.innerText = dateString;
    if (resultStatsEl) resultStatsEl.innerText = metaText;
}

export function openCalculatorModal() {
    const modal = document.getElementById('completion-calculator-modal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-modal-btn');
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
    runCompletionCalculator();
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
