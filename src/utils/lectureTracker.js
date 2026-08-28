/**
 * Lecture Tracker Pure Transformation Engine
 * Contains zero DOM, zero React, and zero IndexedDB dependencies.
 * Formats and sorts subject progress cards for the tracker carousel.
 */

/**
 * Formats remaining duration seconds into rounded whole hours left.
 * @param {number} remainingDurationSec
 * @returns {number} Hours left
 */
export function formatHoursLeft(remainingDurationSec = 0) {
    if (!remainingDurationSec || remainingDurationSec <= 0) return 0;
    return Math.round(remainingDurationSec / 3600);
}

/**
 * Sorts tracker subject cards by completed lectures descending, then alphabetically by name.
 * Matches exact legacy sorting in progress.html.
 * @param {Array<Object>} cards
 * @returns {Array<Object>}
 */
export function sortTrackerCards(cards = []) {
    return [...cards].sort((a, b) => {
        const diffCompleted = (b.completedLectures || 0) - (a.completedLectures || 0);
        if (diffCompleted !== 0) {
            return diffCompleted;
        }
        return (a.name || '').localeCompare(b.name || '');
    });
}

/**
 * Transforms an array of courses into sorted lecture tracker card view-models.
 * @param {Array<Object>} courses - Array of course objects
 * @param {Function} [getCourseProgressFn] - Optional callback returning { total, completed, remainingDuration }
 * @returns {Array<Object>}
 */
export function transformCoursesToTrackerCards(courses = [], getCourseProgressFn = null) {
    if (!Array.isArray(courses) || courses.length === 0) {
        return [];
    }

    const cards = [];

    courses.forEach(course => {
        if (!course || course.isIgnored) return;

        const prog = (typeof getCourseProgressFn === 'function')
            ? getCourseProgressFn(course)
            : (course.stats || { total: 0, completed: 0, remainingDuration: 0 });

        const totalLectures = prog.total !== undefined ? prog.total : (course.videoCount || 0);
        const completedLectures = prog.completed || 0;
        const remainingDuration = prog.remainingDuration || 0;
        const percentage = totalLectures > 0
            ? Math.round((completedLectures / totalLectures) * 100)
            : 0;

        const hoursLeft = formatHoursLeft(remainingDuration);

        cards.push({
            id: course.id,
            name: course.title || 'Untitled Subject',
            faculty: course.facultyName || 'Unknown',
            totalLectures,
            completedLectures,
            remainingDuration,
            hoursLeft,
            percentage
        });
    });

    return sortTrackerCards(cards);
}
