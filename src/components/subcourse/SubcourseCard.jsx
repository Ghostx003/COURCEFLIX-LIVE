import React, { useState, useRef, useEffect } from 'react';
import {
    getSubfolderDisplayName,
    getSubfolderFacultyName,
    resolveSubfolderThumbnail,
    hasDeeperSubfolders
} from '../../utils/subcourseUtils.js';
import { formatDuration } from '../../services/utils.js';

export default function SubcourseCard({
    course,
    fullPath,
    stats,
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
    const subData = course?.subCourseData?.[fullPath] || {};
    const folderNameOnly = getSubfolderDisplayName(course, fullPath);
    const faculty = getSubfolderFacultyName(course, fullPath);
    const rating = subData.rating !== undefined ? subData.rating : (course.rating || 0);
    const thumbnail = resolveSubfolderThumbnail(course, fullPath);
    const hasDeeper = hasDeeperSubfolders(course.chapters, fullPath);

    // Edit modes
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(folderNameOnly);
    const [isEditingFaculty, setIsEditingFaculty] = useState(false);
    const [facultyInput, setFacultyInput] = useState(faculty === 'N/A Faculty' ? '' : faculty);

    const titleInputRef = useRef(null);
    const facultyInputRef = useRef(null);

    useEffect(() => {
        setTitleInput(folderNameOnly);
    }, [folderNameOnly]);

    useEffect(() => {
        setFacultyInput(faculty === 'N/A Faculty' ? '' : faculty);
    }, [faculty]);

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    useEffect(() => {
        if (isEditingFaculty && facultyInputRef.current) {
            facultyInputRef.current.focus();
            facultyInputRef.current.select();
        }
    }, [isEditingFaculty]);

    const handleSaveTitle = () => {
        setIsEditingTitle(false);
        const trimmed = titleInput.trim();
        if (trimmed && trimmed !== folderNameOnly) {
            onTitleChange(fullPath, trimmed);
        } else {
            setTitleInput(folderNameOnly);
        }
    };

    const handleSaveFaculty = () => {
        setIsEditingFaculty(false);
        const trimmed = facultyInput.trim();
        if (trimmed !== (faculty === 'N/A Faculty' ? '' : faculty)) {
            onFacultyChange(fullPath, trimmed || null);
        } else {
            setFacultyInput(faculty === 'N/A Faculty' ? '' : faculty);
        }
    };

    const total = stats?.total || 0;
    const completed = stats?.completed || 0;
    const percentage = stats?.percentage || 0;
    const totalDuration = stats?.totalDuration || 0;
    const remainingDuration = stats?.remainingDuration || 0;

    return (
        <div className="course-card" data-id={course.id} data-subfolder={fullPath}>
            {/* Thumbnail Box */}
            <div
                className={`thumbnail-placeholder ${thumbnail ? 'has-thumbnail' : ''}`}
                data-id={course.id}
                data-subfolder={fullPath}
                style={thumbnail ? { backgroundImage: `url('${thumbnail}')` } : {}}
                onClick={(e) => {
                    if (!e.target.closest('button')) {
                        onThumbnailClick(course.id, fullPath);
                    }
                }}
            >
                <i className="fas fa-folder-open"></i>
                <button
                    className="relocate-course-btn"
                    data-id={course.id}
                    data-subfolder={fullPath}
                    title="Relocate Specific Subfolder"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRelocateSubfolder(course.id, fullPath);
                    }}
                >
                    <i className="fas fa-link"></i>
                </button>
                <button
                    className="refresh-course-btn"
                    data-id={course.id}
                    data-subfolder={fullPath}
                    title="Refresh Content"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRefreshSubfolder(course.id, fullPath, e.currentTarget);
                    }}
                >
                    <i className="fas fa-sync-alt"></i>
                </button>
                {subData.thumbnail && (
                    <button
                        className="remove-thumbnail-btn"
                        data-id={course.id}
                        data-subfolder={fullPath}
                        title="Remove Thumbnail"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemoveThumbnail(course.id, fullPath);
                        }}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                )}
                <button
                    className="remove-course-btn"
                    data-id={course.id}
                    data-subfolder={fullPath}
                    title="Delete Subfolder"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSubfolder(course.id, fullPath);
                    }}
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>

            {/* Course Info */}
            <div className="course-info">
                <div>
                    {isEditingTitle ? (
                        <input
                            ref={titleInputRef}
                            type="text"
                            className="course-info-input"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') {
                                    setIsEditingTitle(false);
                                    setTitleInput(folderNameOnly);
                                }
                            }}
                        />
                    ) : (
                        <h3
                            title={`${folderNameOnly} (Double-click to edit)`}
                            onDoubleClick={() => setIsEditingTitle(true)}
                        >
                            {folderNameOnly}
                        </h3>
                    )}

                    <div className="course-extra-info subcourse-extra" data-id={course.id} data-subfolder={fullPath}>
                        {isEditingFaculty ? (
                            <input
                                ref={facultyInputRef}
                                type="text"
                                className="course-faculty-input"
                                value={facultyInput}
                                onChange={(e) => setFacultyInput(e.target.value)}
                                onBlur={handleSaveFaculty}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveFaculty();
                                    if (e.key === 'Escape') {
                                        setIsEditingFaculty(false);
                                        setFacultyInput(faculty === 'N/A Faculty' ? '' : faculty);
                                    }
                                }}
                            />
                        ) : (
                            <div
                                className="course-faculty"
                                title="Double-click to edit faculty"
                                onDoubleClick={() => setIsEditingFaculty(true)}
                            >
                                {faculty}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <label
                                className="course-ignore-container"
                                title="Ignore this topic from your global remaining time"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                                <input
                                    type="checkbox"
                                    className="course-ignore-cb"
                                    data-id={course.id}
                                    data-subfolder={fullPath}
                                    checked={!!subData.isIgnored}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
                                        onIgnoreToggle(fullPath, e.target.checked);
                                    }}
                                /> Ignore
                            </label>
                            <div className="course-rating">
                                {[1, 2, 3, 4, 5].map((val) => (
                                    <i
                                        key={val}
                                        className={`fa-star ${rating >= val ? 'fas' : 'far'}`}
                                        data-value={val}
                                        onClick={() => onRatingChange(fullPath, val)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <p className="course-meta">{total} videos</p>
                    <div className="course-duration-wrapper">
                        <div className="course-duration">
                            {formatDuration(totalDuration)} total • {formatDuration(remainingDuration)} left
                        </div>
                        {hasDeeper ? (
                            <label className="split-view-label" title="Show subfolders as separate courses">
                                <input
                                    type="checkbox"
                                    className="split-course-cb"
                                    data-id={course.id}
                                    data-subfolder={fullPath}
                                    checked={!!subData.isSplitView}
                                    onChange={(e) => onSplitToggle(fullPath, e.target.checked)}
                                /> Split Further
                            </label>
                        ) : (
                            <div></div>
                        )}
                    </div>
                </div>

                <div className="course-progress-container">
                    <div className="course-progress-bar">
                        <div className="course-progress-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className="course-progress-text">{completed} / {total} lectures completed</div>
                </div>

                <button
                    className="enter-course-btn"
                    data-id={course.id}
                    data-subfolder={fullPath}
                    onClick={() => onEnter(course, fullPath)}
                >
                    Enter Course
                </button>
            </div>
        </div>
    );
}
