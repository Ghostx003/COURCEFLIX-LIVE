// Faculty Analytics & Profile Service
// Extracted and modularized from legacy.js

import { getLectureProgress } from './progressService.js';
import { formatTime, showToast } from './utils.js';

export function renderFacultyView() {
    const facultyGrid = document.getElementById('faculty-grid');
    if (!facultyGrid) return;
    facultyGrid.innerHTML = '';
    
    const facultyMap = new Map();
    const aliases = JSON.parse(localStorage.getItem('courseflix_faculty_aliases')) || {};
    const courses = window.courses || [];
    
    const processCourseForFaculty = (facultyName, courseTotalLectures, courseTotalDuration, courseStudiedDuration, courseStudiedLectures) => {
        if (!facultyName || facultyName === 'Unknown' || facultyName === 'N/A Faculty') return;
        
        let finalName = facultyName;
        while (aliases[finalName]) {
            finalName = aliases[finalName];
        }

        let data = facultyMap.get(finalName);
        if (!data) {
            data = { name: finalName, totalLectures: 0, totalDurationSec: 0, studiedDurationSec: 0, studiedLectures: 0 };
            facultyMap.set(finalName, data);
        }
        data.totalLectures += courseTotalLectures;
        data.totalDurationSec += courseTotalDuration;
        data.studiedDurationSec += courseStudiedDuration;
        data.studiedLectures += courseStudiedLectures;
    };

    const timeFilterEl = document.getElementById('faculty-time-filter');
    const timeFilter = timeFilterEl ? timeFilterEl.value : 'all';
    let timeCutoff = 0;
    const now = Date.now();
    if (timeFilter === 'weekly') timeCutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (timeFilter === 'monthly') timeCutoff = now - 30 * 24 * 60 * 60 * 1000;

    courses.forEach(course => {
        if (!course.lectures) return;
        
        let hasSubfolders = course.subCourseData && Object.keys(course.subCourseData).length > 0;
        if (!hasSubfolders && course.lectures && course.lectures.some(l => l.chapter)) {
            hasSubfolders = true;
        }
        
        if (!hasSubfolders) {
            let totalLecs = 0, totalDur = 0, watchedDur = 0, watchedLecs = 0;
            course.lectures.forEach(lecture => {
                totalLecs++;
                totalDur += (lecture.duration || 0);
                const prog = getLectureProgress(course.id, lecture.id);
                if (prog && prog.completed) {
                    if (timeCutoff > 0) {
                        if (prog.completedAt && new Date(prog.completedAt).getTime() >= timeCutoff) {
                            watchedDur += (lecture.duration || 0);
                            watchedLecs++;
                        }
                    } else {
                        watchedDur += (lecture.duration || 0);
                        watchedLecs++;
                    }
                }
            });
            processCourseForFaculty(course.facultyName || 'Unknown', totalLecs, totalDur, watchedDur, watchedLecs);
        } else {
            const subfolderStats = {}; 
            
            course.lectures.forEach(lecture => {
                let topLevel = '';
                if (lecture.chapter) {
                    topLevel = lecture.chapter.split('/')[0];
                }
                
                let matchedSub = null;
                if (course.subCourseData) {
                    for (const subName in course.subCourseData) {
                        if (lecture.chapter === subName || lecture.chapter.startsWith(subName + '/')) {
                            matchedSub = subName;
                            break;
                        }
                    }
                }
                
                const effectiveSub = matchedSub || topLevel || 'Other Videos';
                
                if (!subfolderStats[effectiveSub]) {
                    let fName = course.facultyName || 'Unknown';
                    if (course.subCourseData && course.subCourseData[effectiveSub] && course.subCourseData[effectiveSub].facultyName) {
                        fName = course.subCourseData[effectiveSub].facultyName;
                    }
                    subfolderStats[effectiveSub] = { totalLecs: 0, totalDur: 0, watchedDur: 0, watchedLecs: 0, facultyName: fName };
                }
                
                subfolderStats[effectiveSub].totalLecs++;
                subfolderStats[effectiveSub].totalDur += (lecture.duration || 0);
                const prog = getLectureProgress(course.id, lecture.id);
                if (prog && prog.completed) {
                    if (timeCutoff > 0) {
                        if (prog.completedAt && new Date(prog.completedAt).getTime() >= timeCutoff) {
                            subfolderStats[effectiveSub].watchedDur += (lecture.duration || 0);
                            subfolderStats[effectiveSub].watchedLecs++;
                        }
                    } else {
                        subfolderStats[effectiveSub].watchedDur += (lecture.duration || 0);
                        subfolderStats[effectiveSub].watchedLecs++;
                    }
                }
            });
            
            for (const subName in subfolderStats) {
                const stats = subfolderStats[subName];
                processCourseForFaculty(stats.facultyName, stats.totalLecs, stats.totalDur, stats.watchedDur, stats.watchedLecs);
            }
        }
    });

    const hiddenFaculties = JSON.parse(localStorage.getItem('courseflix_hidden_faculties')) || [];
    const hiddenProfileCourses = JSON.parse(localStorage.getItem('courseflix_hidden_profile_courses')) || [];
    const resetBtn = document.getElementById('reset-hidden-faculties-btn');
    const hasAliases = Object.keys(aliases).length > 0;
    if (resetBtn) {
        if (hiddenFaculties.length > 0 || hasAliases || hiddenProfileCourses.length > 0) {
            resetBtn.style.display = 'inline-flex';
        } else {
            resetBtn.style.display = 'none';
        }
    }

    const faculties = Array.from(facultyMap.values()).filter(f => !hiddenFaculties.includes(f.name));
    let facultyRatings = JSON.parse(localStorage.getItem('courseflix_faculty_meta')) || {};
    
    faculties.forEach(f => {
        const meta = facultyRatings[f.name] || { rating: 0, photo: '' };
        f.rating = meta.rating;
        f.photo = meta.photo;
    });
    
    const sortSelect = document.getElementById('faculty-sort-select');
    const sortVal = sortSelect ? sortSelect.value : 'most_studied';
    let chartProperty = 'studiedDurationSec';
    let chartLabel = 'Time Studied';
    let chartIsTime = true;

    if (sortVal === 'most_studied') { faculties.sort((a,b) => b.studiedDurationSec - a.studiedDurationSec); }
    else if (sortVal === 'least_studied') { faculties.sort((a,b) => a.studiedDurationSec - b.studiedDurationSec); }
    else if (sortVal === 'most_taught_hours') { faculties.sort((a,b) => b.totalDurationSec - a.totalDurationSec); chartProperty = 'totalDurationSec'; chartLabel = 'Hours Taught'; }
    else if (sortVal === 'least_taught_hours') { faculties.sort((a,b) => a.totalDurationSec - b.totalDurationSec); chartProperty = 'totalDurationSec'; chartLabel = 'Hours Taught'; }
    else if (sortVal === 'most_lectures') { faculties.sort((a,b) => b.totalLectures - a.totalLectures); chartProperty = 'totalLectures'; chartLabel = 'Lectures Taught'; chartIsTime = false; }
    else if (sortVal === 'least_lectures') { faculties.sort((a,b) => a.totalLectures - b.totalLectures); chartProperty = 'totalLectures'; chartLabel = 'Lectures Taught'; chartIsTime = false; }
    else if (sortVal === 'most_fav') { faculties.sort((a,b) => b.rating - a.rating); }
    else if (sortVal === 'least_fav') { faculties.sort((a,b) => a.rating - b.rating); }
    
    const asideTitle = document.getElementById('faculty-aside-title');
    if (asideTitle) {
        if (sortVal === 'most_studied') asideTitle.innerText = 'Most Studied Teachers';
        else if (sortVal === 'least_studied') asideTitle.innerText = 'Least Studied Teachers';
        else if (sortVal === 'most_taught_hours') asideTitle.innerText = 'Most Taught Teachers';
        else if (sortVal === 'least_taught_hours') asideTitle.innerText = 'Least Taught Teachers';
        else if (sortVal === 'most_lectures') asideTitle.innerText = 'Most Lectures';
        else if (sortVal === 'least_lectures') asideTitle.innerText = 'Least Lectures';
        else if (sortVal === 'most_fav') asideTitle.innerText = 'Highest Rated Teachers';
        else if (sortVal === 'least_fav') asideTitle.innerText = 'Lowest Rated Teachers';
    }
    
    const totalTimeSpan = document.getElementById('faculty-total-time');
    const totalTimeLabel = document.getElementById('faculty-total-label');
    const legendMetricLabel = document.getElementById('faculty-legend-metric');
    
    let totalAppMetric = faculties.reduce((sum, f) => sum + f[chartProperty], 0);
    
    if (totalTimeSpan) {
        if (chartIsTime) {
            totalTimeSpan.innerText = totalAppMetric > 0 ? `${Math.floor(totalAppMetric / 3600)}h ${Math.floor((totalAppMetric % 3600)/60)}m` : '0h 0m';
            if (totalTimeLabel) totalTimeLabel.innerText = 'Total Time';
            if (legendMetricLabel) legendMetricLabel.innerText = chartLabel;
        } else {
            totalTimeSpan.innerText = totalAppMetric;
            if (totalTimeLabel) totalTimeLabel.innerText = 'Total ' + chartLabel;
            if (legendMetricLabel) legendMetricLabel.innerText = chartLabel;
        }
    }

    faculties.forEach(f => {
        const card = document.createElement('div');
        card.className = 'faculty-card';
        const ratingStarsHTML = Array.from({length: 5}, (_, i) => 
            `<i class="fa-star ${ f.rating > i ? 'fas' : 'far'}" data-rating="${i + 1}"></i>`
        ).join('');

        const studiedHours = (f.studiedDurationSec / 3600).toFixed(1);
        const totalHours = (f.totalDurationSec / 3600).toFixed(1);
        const pct = f.totalDurationSec > 0 ? Math.round((f.studiedDurationSec / f.totalDurationSec) * 100) : 0;

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div class="faculty-avatar" style="${f.photo ? `background-image: url('${f.photo}')` : ''}">${f.photo ? '' : f.name.charAt(0)}</div>
                <div>
                    <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary); cursor: pointer;" class="faculty-name-link" data-name="${f.name}">${f.name}</h3>
                    <div class="faculty-stars" data-name="${f.name}">${ratingStarsHTML}</div>
                </div>
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
                <span>${studiedHours} / ${totalHours} hrs studied (${pct}%)</span>
            </div>
            <div class="course-progress-bar" style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: var(--accent-primary);"></div>
            </div>`;
        facultyGrid.appendChild(card);
    });
}

export function openFacultyProfile(facultyName, originView = 'home-view') {
    if (typeof window.renderFacultyProfile === 'function') {
        window.renderFacultyProfile(facultyName, originView);
    }
}

export function initFacultyListeners() {
    const sortSelect = document.getElementById('faculty-sort-select');
    const timeFilter = document.getElementById('faculty-time-filter');
    if (sortSelect) sortSelect.addEventListener('change', renderFacultyView);
    if (timeFilter) timeFilter.addEventListener('change', renderFacultyView);
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.renderFacultyView = renderFacultyView;
    window.openFacultyProfile = openFacultyProfile;
    window.initFacultyListeners = initFacultyListeners;
}
