/**
 * Pure Daily Study Schedule & Activity Log Utility
 * Contains zero DOM, zero React, and zero IndexedDB dependencies.
 * Formats study logs and calendar schedules into structured view models.
 */

import { getSubjectColor, parseLogDate } from './studyLogs.js';
import { formatMinutesToHoursAndMinutes } from './studyStreak.js';

/**
 * Formats a log date into a localized string matching legacy display ('Aug 28, 10:30 AM').
 * @param {string|number|Date} dateVal
 * @returns {string}
 */
export function formatActivityDate(dateVal) {
    const d = parseLogDate(dateVal);
    if (isNaN(d.getTime())) return 'Recently';

    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Transforms study logs into structured, sorted activity schedule items.
 * @param {Array<Object>} logs - Array of study logs
 * @param {Array<Object>} [courses=[]] - Enrolled courses for teacher name resolution
 * @returns {Array<{
 *   id: string|number,
 *   subject: string,
 *   teacher: string,
 *   formattedDate: string,
 *   durationMinutes: number,
 *   formattedDuration: string,
 *   iconColor: string,
 *   rawDate: string
 * }>}
 */
export function transformLogsToActivitySchedule(logs = [], courses = []) {
    if (!Array.isArray(logs) || logs.length === 0) return [];

    // Build subject-to-faculty lookup map from courses
    const facultyMap = new Map();
    (courses || []).forEach(c => {
        if (!c) return;
        const title = c.title || c.name;
        const teacher = c.facultyName || c.faculty;
        if (title && teacher && teacher !== 'Unknown' && teacher !== 'undefined') {
            facultyMap.set(title.toLowerCase(), teacher);
        }
    });

    const sortedLogs = [...logs].sort((a, b) => {
        const dateA = a && a.date ? new Date(a.date).getTime() : 0;
        const dateB = b && b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA; // Most recent first
    });

    return sortedLogs.map((log, index) => {
        const subject = log.subject || log.course || log.courseName || 'General Study';
        let teacher = log.teacher || log.faculty || '';
        
        if (!teacher || teacher === 'Unknown' || teacher === 'undefined') {
            teacher = facultyMap.get(subject.toLowerCase()) || '';
        }

        const durSec = log.duration || log.lectureDuration || 0;
        const durationMinutes = durSec > 0 ? durSec / 60 : 45; // Legacy fallback
        const formattedDuration = formatMinutesToHoursAndMinutes(durationMinutes);
        const iconColor = getSubjectColor(subject);
        const formattedDate = formatActivityDate(log.date);

        return {
            id: log.id || `${log.date}-${index}`,
            subject,
            teacher,
            formattedDate,
            durationMinutes: Math.round(durationMinutes),
            formattedDuration,
            iconColor,
            rawDate: log.date
        };
    });
}
