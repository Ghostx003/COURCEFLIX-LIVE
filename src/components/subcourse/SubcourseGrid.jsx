import React from 'react';
import SubcourseCard from './SubcourseCard.jsx';
import { isSubfolderPathHidden } from '../../utils/subcourseUtils.js';

export default function SubcourseGrid({
    course,
    subfolders = [],
    hideIgnored = false,
    onEnter,
    onTitleChange,
    onFacultyChange,
    onRatingChange,
    onIgnoreToggle,
    onSplitToggle,
    onThumbnailClick,
    onRemoveThumbnail,
    onDeleteSubfolder,
    onRefreshSubfolder,
    onRelocateSubfolder
}) {
    if (!course) return null;

    const visibleSubfolders = subfolders.filter(fullPath => {
        const subData = course.subCourseData?.[fullPath] || {};
        if (subData.hidden || isSubfolderPathHidden(course, fullPath)) return false;
        if (hideIgnored && subData.isIgnored) return false;
        return true;
    });

    if (visibleSubfolders.length === 0) {
        return (
            <main id="subcourse-grid" className="grid-container">
                <p id="no-content-message" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No subfolders found in this topic.
                </p>
            </main>
        );
    }

    return (
        <main id="subcourse-grid" className="grid-container">
            {visibleSubfolders.map(fullPath => {
                const stats = course.subCourseStats?.[fullPath];
                return (
                    <SubcourseCard
                        key={fullPath}
                        course={course}
                        fullPath={fullPath}
                        stats={stats}
                        onEnter={onEnter}
                        onTitleChange={onTitleChange}
                        onFacultyChange={onFacultyChange}
                        onRatingChange={onRatingChange}
                        onIgnoreToggle={onIgnoreToggle}
                        onSplitToggle={onSplitToggle}
                        onThumbnailClick={onThumbnailClick}
                        onRemoveThumbnail={onRemoveThumbnail}
                        onDeleteSubfolder={onDeleteSubfolder}
                        onRefreshSubfolder={onRefreshSubfolder}
                        onRelocateSubfolder={onRelocateSubfolder}
                    />
                );
            })}
        </main>
    );
}
