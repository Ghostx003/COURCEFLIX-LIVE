import React, { useMemo, useState } from 'react';
import CourseCard from './CourseCard.jsx';
import { calculateCourseProgress } from '../../services/progressService.js';

export default function CourseGrid({
    courses = [],
    hideIgnored = false,
    sortPref = 'custom',
    searchQuery = '',
    onEnterCourse,
    onRefreshCourse,
    onRelocateCourse,
    onRemoveCourse,
    onRemoveThumbnail,
    onUploadThumbnail,
    onToggleIgnore,
    onToggleSplitView,
    onSetRating,
    onUpdateTitle,
    onUpdateFaculty,
    onReorderCourses
}) {
    const [draggedCourseId, setDraggedCourseId] = useState(null);

    // Pre-calculate progress map once using fast cached stats
    const progressMap = useMemo(() => {
        const map = new Map();
        courses.forEach(c => {
            map.set(c.id, calculateCourseProgress(c));
        });
        return map;
    }, [courses]);

    // Filter and sort courses
    const visibleCourses = useMemo(() => {
        let list = [...courses];

        // Hide ignored filter
        if (hideIgnored) {
            list = list.filter(c => !c.isIgnored);
        }

        // Search query filter
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(c => {
                const titleMatch = (c.title || '').toLowerCase().includes(query);
                const facultyMatch = (c.facultyName || '').toLowerCase().includes(query);
                return titleMatch || facultyMatch;
            });
        }

        // Group sorting
        if (sortPref.startsWith('group_')) {
            const targetGroupId = sortPref.replace('group_', '');
            let groups = [];
            try {
                const raw = localStorage.getItem('courseflix_completion_groups');
                if (raw) groups = JSON.parse(raw);
            } catch (e) {}
            const targetGroup = groups.find(g => String(g.id) === String(targetGroupId));
            if (targetGroup && Array.isArray(targetGroup.selectedCourseIds)) {
                list = list.filter(c => targetGroup.selectedCourseIds.includes(c.id));
            }
        } else if (sortPref !== 'custom') {
            list.sort((a, b) => {
                const progA = progressMap.get(a.id) || { percentage: 0, totalDuration: 0, remainingDuration: 0 };
                const progB = progressMap.get(b.id) || { percentage: 0, totalDuration: 0, remainingDuration: 0 };
                if (sortPref === 'completion_asc') return progA.percentage - progB.percentage;
                if (sortPref === 'completion_desc') return progB.percentage - progA.percentage;
                if (sortPref === 'duration_desc') return progB.totalDuration - progA.totalDuration;
                if (sortPref === 'duration_asc') return progA.totalDuration - progB.totalDuration;
                if (sortPref === 'duration_left_desc') return progB.remainingDuration - progA.remainingDuration;
                if (sortPref === 'duration_left_asc') return progA.remainingDuration - progB.remainingDuration;
                return 0;
            });
        } else {
            list.sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        return list;
    }, [courses, hideIgnored, sortPref, searchQuery, progressMap]);

    // Drag and Drop handlers for custom reordering
    const handleDragStart = (e, courseId) => {
        setDraggedCourseId(courseId);
        e.dataTransfer.setData('text/plain', String(courseId));
        e.currentTarget.style.opacity = '0.5';
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
        setDraggedCourseId(null);
        e.currentTarget.style.opacity = '1';
        e.currentTarget.classList.remove('dragging');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, targetCourseId) => {
        e.preventDefault();
        if (!draggedCourseId || String(draggedCourseId) === String(targetCourseId)) return;

        const currentOrderedIds = visibleCourses.map(c => c.id);
        const sourceIndex = currentOrderedIds.findIndex(id => String(id) === String(draggedCourseId));
        const targetIndex = currentOrderedIds.findIndex(id => String(id) === String(targetCourseId));

        if (sourceIndex === -1 || targetIndex === -1) return;

        const newOrder = [...currentOrderedIds];
        const [moved] = newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, moved);

        if (onReorderCourses) {
            onReorderCourses(newOrder);
        }
    };

    if (courses.length === 0) {
        return (
            <main id="course-grid" className="grid-container">
                <p id="no-content-message">No courses added. Click &apos;Add Course&apos; to begin.</p>
            </main>
        );
    }

    if (visibleCourses.length === 0) {
        return (
            <main id="course-grid" className="grid-container">
                <p id="no-content-message">No matching courses found.</p>
            </main>
        );
    }

    return (
        <main id="course-grid" className="grid-container">
            {visibleCourses.map(course => (
                <CourseCard
                    key={course.id}
                    course={course}
                    progressMap={progressMap}
                    sortPref={sortPref}
                    onEnterCourse={onEnterCourse}
                    onRefreshCourse={onRefreshCourse}
                    onRelocateCourse={onRelocateCourse}
                    onRemoveCourse={onRemoveCourse}
                    onRemoveThumbnail={onRemoveThumbnail}
                    onUploadThumbnail={onUploadThumbnail}
                    onToggleIgnore={onToggleIgnore}
                    onToggleSplitView={onToggleSplitView}
                    onSetRating={onSetRating}
                    onUpdateTitle={onUpdateTitle}
                    onUpdateFaculty={onUpdateFaculty}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
            ))}
        </main>
    );
}
