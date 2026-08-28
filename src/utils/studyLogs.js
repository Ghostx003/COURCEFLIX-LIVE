/**
 * Pure Study Logs & Subject Analytics Utility
 * Contains zero DOM, zero React, and zero IndexedDB dependencies.
 * Provides period filtering, subject aggregation, ranked subject metrics, and donut chart data.
 */

import { formatMinutesToHoursAndMinutes } from './studyStreak.js';

export const SUBJECT_COLORS = [
    '#34d399', '#60a5fa', '#fbbf24', '#c084fc', '#f87171',
    '#fb923c', '#818cf8', '#a78bfa', '#f472b6', '#2dd4bf',
    '#a3e635', '#fde047', '#93c5fd'
];

/**
 * Deterministically generates a subject color from the subject name.
 * Matches legacy progress.html hash algorithm.
 * @param {string} subjectName
 * @returns {string} HEX color string
 */
export function getSubjectColor(subjectName = '') {
    if (!subjectName) return SUBJECT_COLORS[0];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
        hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % SUBJECT_COLORS.length);
    return SUBJECT_COLORS[index];
}

/**
 * Normalizes log date value into a valid Date object.
 * @param {string|number|Date} dateVal
 * @returns {Date}
 */
export function parseLogDate(dateVal) {
    if (!dateVal) return new Date(NaN);
    if (typeof dateVal === 'string' && dateVal.length === 10 && dateVal.includes('-')) {
        const [y, m, d] = dateVal.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateVal);
}

/**
 * Filters an array of study logs by calendar period.
 * @param {Array<Object>} logs
 * @param {'all'|'month'|'week'|'today'} period
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array<Object>}
 */
export function filterLogsByPeriod(logs = [], period = 'all', referenceDate = new Date()) {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    if (period === 'all') return logs;

    const ref = new Date(referenceDate);
    const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
    
    // Week start on Sunday
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    // Month start on 1st of current month
    const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1);

    return logs.filter(log => {
        if (!log || !log.date) return false;
        const logDate = parseLogDate(log.date);
        if (isNaN(logDate.getTime())) return false;

        if (period === 'today') return logDate >= today;
        if (period === 'week') return logDate >= weekStart;
        if (period === 'month') return logDate >= monthStart;
        return true;
    });
}

/**
 * Aggregates study logs into per-subject statistics.
 * @param {Array<Object>} logs - Study logs from storage [{ date, subject, duration, course }]
 * @param {'all'|'month'|'week'|'today'} [period='all'] - Time range filter
 * @param {Array<Object>} [courses=[]] - Enrolled course objects for priming
 * @param {Date} [referenceDate=new Date()] - Date reference
 * @returns {Record<string, { minutes: number, count: number, teacher: string, totalLectures: number, completedLectures: number }>}
 */
export function aggregateLogsBySubject(logs = [], period = 'all', courses = [], referenceDate = new Date()) {
    const filteredLogs = filterLogsByPeriod(logs, period, referenceDate);
    const stats = {};

    // 1. Prime stats with enrolled subjects
    (courses || []).forEach(course => {
        if (!course || course.isIgnored) return;
        const subjectName = course.title || 'Untitled Course';
        stats[subjectName] = {
            name: subjectName,
            minutes: 0,
            count: 0,
            loggedMinutes: 0,
            loggedCount: 0,
            teacher: course.facultyName || 'Unknown',
            totalLectures: course.stats?.total || course.videoCount || 0,
            completedLectures: course.stats?.completed || 0
        };
    });

    // 2. Aggregate logs
    filteredLogs.forEach(log => {
        if (!log) return;
        const subject = log.subject || log.course || log.courseName;
        if (!subject) return;

        if (!stats[subject]) {
            stats[subject] = {
                name: subject,
                minutes: 0,
                count: 0,
                loggedMinutes: 0,
                loggedCount: 0,
                teacher: log.teacher || log.faculty || 'Unknown',
                totalLectures: 0,
                completedLectures: 0
            };
        }

        const durMinutes = (log.duration || log.lectureDuration || 0) / 60;
        let addedMins = durMinutes > 0 ? durMinutes : 45; // Legacy fallback

        stats[subject].loggedMinutes += addedMins;
        stats[subject].loggedCount += 1;
    });

    // 3. Finalize totals matching legacy formula
    Object.values(stats).forEach(stat => {
        if (period === 'today' || period === 'week') {
            stat.minutes = Math.round(stat.loggedMinutes);
            stat.count = stat.loggedCount;
        } else {
            const missingCount = Math.max(0, stat.completedLectures - stat.loggedCount);
            stat.count = stat.loggedCount + missingCount;
            stat.minutes = Math.round(stat.loggedMinutes + (missingCount * 45));
        }
    });

    return stats;
}

/**
 * Computes ranked subjects (Most or Least Studied) based on hours or lecture counts.
 * @param {Record<string, Object>|Array<Object>} stats - Subject stats map or array
 * @param {'hours'|'lectures'} [mode='hours'] - Ranking criterion
 * @param {'most'|'least'} [direction='most'] - Sort order
 * @param {number} [limit=7] - Maximum items to return
 * @returns {Array<{ name: string, minutes: number, count: number, displayValue: string, teacher: string }>}
 */
export function calculateSubjectRankings(stats = {}, mode = 'hours', direction = 'most', limit = 7) {
    const entries = Array.isArray(stats) ? stats : Object.values(stats || {});
    if (entries.length === 0) return [];

    const sorted = [...entries].sort((a, b) => {
        if (mode === 'hours') {
            const diff = direction === 'most' ? b.minutes - a.minutes : a.minutes - b.minutes;
            if (diff !== 0) return diff;
        } else {
            const diff = direction === 'most' ? b.count - a.count : a.count - b.count;
            if (diff !== 0) return diff;
        }
        // Tie-breaker: alphabetical by subject name
        return (a.name || '').localeCompare(b.name || '');
    });

    return sorted.slice(0, limit).map(item => {
        const displayValue = mode === 'hours'
            ? formatMinutesToHoursAndMinutes(item.minutes)
            : `${item.count} Lecture${item.count !== 1 ? 's' : ''}`;

        return {
            name: item.name,
            minutes: item.minutes,
            count: item.count,
            displayValue,
            teacher: item.teacher || 'Unknown'
        };
    });
}

/**
 * Computes learning time donut chart slices, percentages, and legend metrics.
 * @param {Record<string, Object>} stats - Aggregated subject stats
 * @returns {{ totalMinutes: number, formattedTotal: string, slices: Array<Object> }}
 */
export function calculateDonutSlices(stats = {}) {
    const entries = Object.entries(stats || {})
        .filter(([, data]) => data && data.minutes > 0)
        .map(([name, data]) => ({
            name,
            minutes: data.minutes,
            teacher: data.teacher || 'Unknown',
            color: getSubjectColor(name)
        }));

    const totalMinutes = entries.reduce((sum, item) => sum + item.minutes, 0);

    if (totalMinutes === 0 || entries.length === 0) {
        return {
            totalMinutes: 0,
            formattedTotal: '0m',
            slices: []
        };
    }

    let cumulativePercentage = 0;
    const slices = entries.map(item => {
        const percentage = (item.minutes / totalMinutes) * 100;
        const startPercent = cumulativePercentage;
        const endPercent = cumulativePercentage + percentage;
        cumulativePercentage = endPercent;

        return {
            name: item.name,
            minutes: item.minutes,
            formattedDuration: formatMinutesToHoursAndMinutes(item.minutes),
            percentage: Math.round(percentage * 10) / 10,
            startPercent,
            endPercent,
            color: item.color
        };
    });

    return {
        totalMinutes,
        formattedTotal: formatMinutesToHoursAndMinutes(totalMinutes),
        slices
    };
}
