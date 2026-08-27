/**
 * Completion Estimator Pure Calculation Engine
 * Contains zero DOM, zero IndexedDB, and zero React dependencies.
 * Computes course aggregation metrics, finish date predictions, and daily goal progress.
 */

import { formatExactTime } from '../services/utils.js';

/**
 * Calculates aggregated study metrics across all active courses.
 * @param {Array<Object>} courses - Array of course objects.
 * @param {Function} [getCourseProgressFn] - Optional progress calculator callback.
 * @returns {Object} Aggregated totals and breakdown.
 */
export function calculateTotalProgressStats(courses = [], getCourseProgressFn = null) {
    let totalSecondsLeft = 0;
    let totalCompletedSeconds = 0;
    let totalSecondsCount = 0;
    let pendingLectures = 0;
    let totalLecturesCount = 0;
    let totalCompletedLectures = 0;
    const courseBreakdown = [];

    (courses || []).forEach(course => {
        if (!course || course.isIgnored) return;

        const prog = (typeof getCourseProgressFn === 'function')
            ? getCourseProgressFn(course)
            : (course.stats || { totalDuration: 0, remainingDuration: 0, total: 0, completed: 0 });

        const cTotalSec = prog.totalDuration || 0;
        const cSecondsLeft = prog.remainingDuration || 0;
        const cCompletedSec = Math.max(0, cTotalSec - cSecondsLeft);
        const cTotalLec = prog.total || (course.videoCount || 0);
        const cCompletedLec = prog.completed || 0;
        const cPendingLec = Math.max(0, cTotalLec - cCompletedLec);
        const cPct = cTotalLec > 0 ? Math.round((cCompletedLec / cTotalLec) * 100) : 0;

        totalSecondsLeft += cSecondsLeft;
        totalSecondsCount += cTotalSec;
        totalCompletedSeconds += cCompletedSec;
        pendingLectures += cPendingLec;
        totalCompletedLectures += cCompletedLec;
        totalLecturesCount += cTotalLec;

        courseBreakdown.push({
            id: course.id,
            title: course.title || 'Untitled Course',
            secondsLeft: cSecondsLeft,
            completedSeconds: cCompletedSec,
            totalSeconds: cTotalSec,
            pendingLectures: cPendingLec,
            completedLectures: cCompletedLec,
            totalLectures: cTotalLec,
            percentage: cPct
        });
    });

    const pct = totalLecturesCount > 0
        ? Math.round((totalCompletedLectures / totalLecturesCount) * 100)
        : 0;

    return {
        totalSecondsLeft,
        totalCompletedSeconds,
        totalSecondsCount,
        pendingLectures,
        totalLecturesCount,
        totalCompletedLectures,
        pct,
        courseBreakdown
    };
}

/**
 * Computes finish date estimation and statistics based on user targets.
 * @param {Object} params
 * @param {number} params.totalSecondsLeft
 * @param {number} params.pendingLectures
 * @param {string} [params.mode='hours'] - 'hours' or 'lectures'
 * @param {number} [params.dailyHours=7]
 * @param {number} [params.dailyLectures=4]
 * @param {number} [params.speed=1.5]
 * @returns {Object}
 */
export function estimateCompletion({
    totalSecondsLeft = 0,
    pendingLectures = 0,
    mode = 'hours',
    dailyHours = 7,
    dailyLectures = 4,
    speed = 1.5
}) {
    if (totalSecondsLeft <= 0 || pendingLectures <= 0) {
        return {
            isFinished: true,
            daysRequired: 0,
            finishDate: new Date(),
            finishDateFormatted: 'Already Finished!',
            adjustedHours: 0,
            dailyWatchTimeSec: 0,
            metaText: '0 pending lectures.'
        };
    }

    const safeSpeed = Math.max(0.1, speed || 1.5);
    let daysRequired = 0;
    let adjustedHours = 0;
    let dailyWatchTimeSec = 0;
    let metaText = '';

    if (mode === 'hours') {
        const safeDailyHours = Math.max(0.1, dailyHours || 7);
        const totalHours = totalSecondsLeft / 3600;
        adjustedHours = totalHours / safeSpeed;
        daysRequired = adjustedHours / safeDailyHours;
        metaText = `${pendingLectures} pending lectures (${Math.ceil(adjustedHours)} hrs adjusted view time at ${safeSpeed}x speed).`;
    } else {
        const safeDailyLectures = Math.max(0.1, dailyLectures || 4);
        const avgLectureDurationSec = pendingLectures > 0 ? (totalSecondsLeft / pendingLectures) : 0;
        dailyWatchTimeSec = (safeDailyLectures * avgLectureDurationSec) / safeSpeed;
        daysRequired = pendingLectures > 0 ? (pendingLectures / safeDailyLectures) : 0;
        metaText = `${pendingLectures} pending lectures (${daysRequired.toFixed(1)} days at ${safeDailyLectures} lecs/day • ${formatExactTime(dailyWatchTimeSec)}/day required at ${safeSpeed}x speed).`;
    }

    const finishDate = new Date(Date.now() + (daysRequired * 24 * 60 * 60 * 1000));
    const finishDateFormatted = finishDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return {
        isFinished: false,
        daysRequired,
        finishDate,
        finishDateFormatted,
        adjustedHours,
        dailyWatchTimeSec,
        metaText
    };
}

/**
 * Computes today's lecture completion goals from progress records.
 * @param {Object} progressMap - Map of progress records { [id]: ProgressRecord }
 * @param {string} [mode='hours']
 * @param {number} [dailyHours=7]
 * @param {number} [dailyLectures=4]
 * @param {number} [speed=1.5]
 * @returns {Object}
 */
export function calculateTodayGoal(progressMap = {}, mode = 'hours', dailyHours = 7, dailyLectures = 4, speed = 1.5) {
    const safeSpeed = Math.max(0.1, speed || 1.5);
    const targetLectures = mode === 'lectures'
        ? Math.ceil(dailyLectures || 4)
        : Math.ceil((dailyHours || 7) / (2 / safeSpeed));

    const todayStr = new Date().toLocaleDateString();
    const completedTodayList = [];

    Object.values(progressMap || {}).forEach(prog => {
        if (prog && prog.completed && prog.completedAt) {
            const completedDate = new Date(prog.completedAt).toLocaleDateString();
            if (completedDate === todayStr) {
                const timeStr = new Date(prog.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                completedTodayList.push({
                    id: prog.id,
                    courseTitle: prog.courseTitle || 'Course',
                    lectureName: prog.lectureName || 'Lecture',
                    completedAt: prog.completedAt,
                    timeFormatted: timeStr
                });
            }
        }
    });

    completedTodayList.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const completedTodayCount = completedTodayList.length;
    const isGoalMet = completedTodayCount >= targetLectures;

    return {
        targetLectures,
        completedTodayCount,
        completedTodayList,
        isGoalMet
    };
}

/**
 * Determines UI accent color corresponding to progress percentage.
 * @param {number} pct - Progress percentage (0 - 100).
 * @returns {string} Hex color string.
 */
export function getProgressColor(pct) {
    if (pct >= 80) return '#10b981'; // green
    if (pct >= 60) return '#06b6d4'; // cyan
    if (pct >= 30) return '#f59e0b'; // amber
    return '#ef4444';                // red
}
