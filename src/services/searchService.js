// Global Search & Intelligence Search Engine
// Extracted and modularized from legacy.js

import { getLectureProgress } from './progressService.js';
import { formatTime, showToast } from './utils.js';

export function performGlobalSearch(query) {
    if (!query) return { subjects: [], chapters: [], lectures: [], facultyCourses: [], facultyNameMatch: null };
    query = query.trim();
    if (/^\d+$/.test(query) || query.length < 2) {
        return { subjects: [], chapters: [], lectures: [], facultyCourses: [], facultyNameMatch: null };
    }
    
    const qLower = query.toLowerCase();
    const courses = window.courses || [];
    let exactRegex = null;
    if (window.globalSearchMode === 'exact') {
        try {
            exactRegex = new RegExp(`\\b${query}\\b`);
        } catch(e) {
            exactRegex = new RegExp(query);
        }
    }
    
    const checkMatch = (text) => {
        if (!text) return false;
        if (window.globalSearchMode === 'exact') {
            return exactRegex.test(text);
        }
        return text.toLowerCase().includes(qLower);
    };
    
    const matchedSubjects = [];
    const matchedChapters = [];
    const matchedLectures = [];
    const facultyCourses = [];
    let facultyNameMatch = null;
    
    courses.forEach(course => {
        let isTitleMatch = checkMatch(course.title);
        let isFacultyMatch = checkMatch(course.facultyName);
        
        if (window.globalFacultySearchMode) {
            if (isFacultyMatch) {
                matchedSubjects.push({ type: 'subject', course });
            }
            if (course.subCourseData) {
                Object.keys(course.subCourseData).forEach(subPath => {
                    if (checkMatch(course.subCourseData[subPath].facultyName)) {
                        matchedSubjects.push({ type: 'subfolder', course, subfolder: subPath });
                    }
                });
            }
            return;
        }
        
        if (isTitleMatch) {
            matchedSubjects.push({ type: 'subject', course });
        }
        
        if (isFacultyMatch) {
            facultyNameMatch = course.facultyName;
            if (!isTitleMatch) {
                facultyCourses.push({ type: 'subject', course });
            }
        }
        
        const matchedSubfolderNames = new Set();
        (course.chapters || []).forEach(ch => {
             if (checkMatch(ch.name)) {
                 matchedSubfolderNames.add(ch.name);
             }
        });
        
        let facultyMatchedInSubfolder = false;
        if (course.subCourseData) {
             Object.keys(course.subCourseData).forEach(subPath => {
                 const sd = course.subCourseData[subPath];
                 if (checkMatch(sd.customName)) {
                     matchedSubfolderNames.add(subPath);
                 }
                 if (checkMatch(sd.facultyName)) {
                     if (!facultyNameMatch) facultyNameMatch = sd.facultyName;
                     facultyMatchedInSubfolder = true;
                 }
             });
        }
        
        if (facultyMatchedInSubfolder && !isFacultyMatch) {
             if (!isTitleMatch) {
                 if (!facultyCourses.some(fc => fc.course.id === course.id)) {
                     facultyCourses.push({ type: 'subject', course });
                 }
             }
        }
        
        matchedSubfolderNames.forEach(subPath => {
             matchedChapters.push({ type: 'subfolder', course, subfolder: subPath });
        });
        
        if (course.lectures) {
            course.lectures.forEach(l => {
                if (checkMatch(l.chapter) && !matchedSubfolderNames.has(l.chapter)) {
                    matchedSubfolderNames.add(l.chapter);
                    matchedChapters.push({ type: 'subfolder', course, subfolder: l.chapter });
                }
                if (checkMatch(l.name)) {
                    matchedLectures.push({ course, lecture: l });
                }
            });
        }
    });
    
    if (matchedSubjects.length === 0 && matchedChapters.length === 1) {
        matchedSubjects.push(matchedChapters.pop());
    }
    
    return { subjects: matchedSubjects, chapters: matchedChapters, lectures: matchedLectures, facultyCourses, facultyNameMatch };
}

// Bind to window for backwards compatibility
if (typeof window !== 'undefined') {
    window.performGlobalSearch = performGlobalSearch;
}
