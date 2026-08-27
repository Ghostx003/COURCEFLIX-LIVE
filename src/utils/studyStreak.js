/**
 * Study Streak & Heatmap Pure Calculation Engine
 * Contains zero DOM, zero React, and zero IndexedDB dependencies.
 * Computes calendar month heatmaps, activity intensity tiers, and consecutive study streak stats.
 */

/**
 * Formats total minutes into human-readable hours and minutes.
 * @param {number} totalMinutes
 * @returns {string} e.g. "2h 30m" or "45m"
 */
export function formatMinutesToHoursAndMinutes(totalMinutes = 0) {
    const mins = Math.round(totalMinutes);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours > 0) {
        return `${hours}h ${remainingMins}m`;
    }
    return `${remainingMins}m`;
}

/**
 * Determines the intensity level (0 - 5) based on study hours.
 * Matches legacy progress.html thresholds.
 * @param {number} totalHours
 * @returns {number} 0 to 5
 */
export function getIntensityLevel(totalHours = 0) {
    if (totalHours <= 0) return 0;
    if (totalHours >= 8) return 5;
    if (totalHours >= 6) return 4;
    if (totalHours >= 4) return 3;
    if (totalHours >= 2) return 2;
    return 1;
}

/**
 * Normalizes date to 'YYYY-MM-DD' string for consistent day keying.
 * @param {Date|string|number} d
 * @returns {string} 'YYYY-MM-DD'
 */
export function toDateKey(d) {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/**
 * Builds the month calendar matrix for the heatmap grid.
 * @param {number} year - Full year (e.g. 2026)
 * @param {number} month - Month index (0 - 11)
 * @param {Array<Object>} studyLogs - Array of study log objects [{ date, duration }]
 * @returns {Object} { monthName, year, firstDayOfWeek, totalDays, cells: Array<Object> }
 */
export function buildMonthGrid(year, month, studyLogs = []) {
    const targetDate = new Date(year, month, 1);
    const monthName = targetDate.toLocaleString('default', { month: 'long' });
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun ... 6 = Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const todayKey = toDateKey(today);

    // Map logs to date keys for O(1) daily summation
    const dailyMinutesMap = new Map();
    (studyLogs || []).forEach(log => {
        if (!log || !log.date) return;
        const key = toDateKey(log.date);
        if (!key) return;
        const mins = (log.duration || 0) / 60;
        dailyMinutesMap.set(key, (dailyMinutesMap.get(key) || 0) + mins);
    });

    const cells = [];

    // Empty padding slots before first day of month
    for (let i = 0; i < firstDayOfWeek; i++) {
        cells.push({
            isPadding: true,
            dayNumber: null,
            dateKey: null,
            totalMinutes: 0,
            totalHours: 0,
            level: 0,
            isToday: false,
            tooltip: ''
        });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateKey = toDateKey(currentDate);
        const totalMinutes = dailyMinutesMap.get(dateKey) || 0;
        const totalHours = totalMinutes / 60;
        const level = getIntensityLevel(totalHours);
        const isToday = dateKey === todayKey;

        const dateFormatted = currentDate.toDateString();
        const tooltip = `${dateFormatted} — ${formatMinutesToHoursAndMinutes(totalMinutes)} studied`;

        cells.push({
            isPadding: false,
            dayNumber: day,
            dateKey,
            date: currentDate,
            totalMinutes,
            totalHours,
            level,
            isToday,
            tooltip
        });
    }

    return {
        monthName,
        year,
        firstDayOfWeek,
        daysInMonth,
        cells
    };
}

/**
 * Calculates current streak, longest streak, total active days, and total study hours.
 * @param {Array<Object>} studyLogs - Array of study log objects [{ date, duration }]
 * @param {Date} [referenceDate=new Date()] - Reference date for streak evaluation
 * @returns {Object} { currentStreak, longestStreak, totalActiveDays, totalStudyHours }
 */
export function calculateStreakStats(studyLogs = [], referenceDate = new Date()) {
    if (!Array.isArray(studyLogs) || studyLogs.length === 0) {
        return {
            currentStreak: 0,
            longestStreak: 0,
            totalActiveDays: 0,
            totalStudyHours: 0
        };
    }

    // Aggregate daily minutes across all days
    const dailyMinutesMap = new Map();
    let totalMinutesAll = 0;

    studyLogs.forEach(log => {
        if (!log || !log.date) return;
        const key = toDateKey(log.date);
        if (!key) return;
        const mins = (log.duration || 0) / 60;
        totalMinutesAll += mins;
        dailyMinutesMap.set(key, (dailyMinutesMap.get(key) || 0) + mins);
    });

    // Extract sorted unique active day keys (days with > 0 minutes)
    const activeDateKeys = Array.from(dailyMinutesMap.keys())
        .filter(key => (dailyMinutesMap.get(key) || 0) > 0)
        .sort();

    const totalActiveDays = activeDateKeys.length;
    const totalStudyHours = Math.round((totalMinutesAll / 60) * 10) / 10;

    if (totalActiveDays === 0) {
        return {
            currentStreak: 0,
            longestStreak: 0,
            totalActiveDays: 0,
            totalStudyHours: 0
        };
    }

    // Convert date keys to distinct midnight timestamp days
    const activeDaysSet = new Set(activeDateKeys);

    // Calculate longest consecutive streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevTimestamp = null;

    activeDateKeys.forEach(dateKey => {
        const [y, m, d] = dateKey.split('-').map(Number);
        const currentMidnight = new Date(y, m - 1, d).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (prevTimestamp === null) {
            tempStreak = 1;
        } else if (currentMidnight - prevTimestamp === oneDayMs) {
            tempStreak += 1;
        } else if (currentMidnight !== prevTimestamp) {
            tempStreak = 1;
        }

        prevTimestamp = currentMidnight;
        if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
        }
    });

    // Calculate current streak relative to reference date (today)
    const refKey = toDateKey(referenceDate);
    const yesterday = new Date(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    let currentStreak = 0;
    let checkDate = new Date(referenceDate);

    // If today is active, start streak walk from today; otherwise if yesterday was active, start from yesterday
    if (activeDaysSet.has(refKey)) {
        checkDate = new Date(referenceDate);
    } else if (activeDaysSet.has(yesterdayKey)) {
        checkDate = yesterday;
    } else {
        // Neither today nor yesterday was active -> streak is broken (0)
        return {
            currentStreak: 0,
            longestStreak,
            totalActiveDays,
            totalStudyHours
        };
    }

    while (activeDaysSet.has(toDateKey(checkDate))) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        totalActiveDays,
        totalStudyHours
    };
}
