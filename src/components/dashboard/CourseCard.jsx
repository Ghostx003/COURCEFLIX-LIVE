import React, { useState, useRef, useEffect } from 'react';
import { formatDuration } from '../../services/utils.js';
import { calculateCourseProgress } from '../../services/progressService.js';

export default function CourseCard({
    course,
    progressMap,
    sortPref = 'custom',
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
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop
}) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState(course.title || '');
    const [isEditingFaculty, setIsEditingFaculty] = useState(false);
    const [facultyInput, setFacultyInput] = useState(course.facultyName || '');

    const titleInputRef = useRef(null);
    const facultyInputRef = useRef(null);

    // Calculate or retrieve progress stats for this course
    const progress = (progressMap && progressMap.get(course.id)) || course.stats || calculateCourseProgress(course);

    useEffect(() => {
        setTitleInput(course.title || '');
    }, [course.title]);

    useEffect(() => {
        setFacultyInput(course.facultyName || '');
    }, [course.facultyName]);

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
        const trimmed = titleInput.trim();
        setIsEditingTitle(false);
        if (trimmed && trimmed !== course.title) {
            onUpdateTitle ? onUpdateTitle(course.id, trimmed) : null;
        } else {
            setTitleInput(course.title || '');
        }
    };

    const handleSaveFaculty = () => {
        const trimmed = facultyInput.trim();
        setIsEditingFaculty(false);
        if (trimmed !== (course.facultyName || '')) {
            onUpdateFaculty ? onUpdateFaculty(course.id, trimmed) : null;
        } else {
            setFacultyInput(course.facultyName || '');
        }
    };

    const isDraggable = sortPref === 'custom';

    return (
        <div
            className="course-card"
            data-id={course.id}
            draggable={isDraggable}
            onDragStart={onDragStart ? (e) => onDragStart(e, course.id) : undefined}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop ? (e) => onDrop(e, course.id) : undefined}
        >
            <div
                className={`thumbnail-placeholder ${course.thumbnail ? 'has-thumbnail' : ''}`}
                data-id={course.id}
                style={course.thumbnail ? { backgroundImage: `url('${course.thumbnail}')` } : {}}
                onClick={(e) => {
                    if (e.target.closest('button')) return;
                    if (onUploadThumbnail) onUploadThumbnail(course.id);
                }}
            >
                <i className="fas fa-photo-video"></i>
                {!course.isCustomCourse ? (
                    <>
                        <button
                            type="button"
                            className="relocate-course-btn"
                            data-id={course.id}
                            title="Relocate Main Course Folder"
                            onClick={(e) => { e.stopPropagation(); onRelocateCourse ? onRelocateCourse(course.id) : null; }}
                        >
                            <i className="fas fa-link"></i>
                        </button>
                        <button
                            type="button"
                            className="refresh-course-btn"
                            data-id={course.id}
                            title="Refresh Course Content"
                            onClick={(e) => { e.stopPropagation(); onRefreshCourse ? onRefreshCourse(course.id, e.currentTarget) : null; }}
                        >
                            <i className="fas fa-sync-alt"></i>
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        className="refresh-custom-course-btn"
                        data-id={course.id}
                        title="Refresh HTML Links"
                        onClick={(e) => { e.stopPropagation(); onRefreshCourse ? onRefreshCourse(course.id, e.currentTarget) : null; }}
                    >
                        <i className="fas fa-sync-alt"></i>
                    </button>
                )}
                <button
                    type="button"
                    className="remove-thumbnail-btn"
                    data-id={course.id}
                    title="Remove Thumbnail"
                    onClick={(e) => { e.stopPropagation(); onRemoveThumbnail ? onRemoveThumbnail(course.id) : null; }}
                >
                    <i className="fas fa-times"></i>
                </button>
                <button
                    type="button"
                    className="remove-course-btn"
                    data-id={course.id}
                    title="Remove Course"
                    onClick={(e) => { e.stopPropagation(); onRemoveCourse ? onRemoveCourse(course.id) : null; }}
                >
                    <i className="fas fa-trash"></i>
                </button>
            </div>

            <div className="course-info">
                <div>
                    {isEditingTitle ? (
                        <h3>
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
                                        setTitleInput(course.title || '');
                                        setIsEditingTitle(false);
                                    }
                                }}
                            />
                        </h3>
                    ) : (
                        <h3
                            title={`${course.title} (Double-click to edit)`}
                            onDoubleClick={() => setIsEditingTitle(true)}
                        >
                            {course.title}
                        </h3>
                    )}

                    <div className="course-extra-info" data-id={course.id}>
                        {isEditingFaculty ? (
                            <div className="course-faculty">
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
                                            setFacultyInput(course.facultyName || '');
                                            setIsEditingFaculty(false);
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div
                                className="course-faculty"
                                title="Double-click to edit faculty"
                                onDoubleClick={() => setIsEditingFaculty(true)}
                            >
                                {course.facultyName || 'N/A Faculty'}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <label
                                className="course-ignore-container"
                                title="Ignore this course from your global remaining time"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            >
                                <input
                                    type="checkbox"
                                    className="course-ignore-cb"
                                    data-id={course.id}
                                    checked={!!course.isIgnored}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
                                        if (onToggleIgnore) onToggleIgnore(course.id, e.target.checked);
                                    }}
                                /> Ignore
                            </label>

                            <div className="course-rating">
                                {Array.from({ length: 5 }, (_, i) => (
                                    <i
                                        key={i}
                                        className={`fa-star ${(course.rating || 0) > i ? 'fas' : 'far'}`}
                                        data-value={i + 1}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => onSetRating ? onSetRating(course.id, i + 1) : null}
                                    ></i>
                                ))}
                            </div>
                        </div>
                    </div>

                    <p className="course-meta">{progress.total || course.videoCount || 0} videos</p>

                    <div className="course-duration-wrapper">
                        {progress.totalDuration ? (
                            <div className="course-duration">
                                {formatDuration(progress.totalDuration)} total • {formatDuration(progress.remainingDuration)} left
                            </div>
                        ) : (
                            <div></div>
                        )}

                        {course.isLinked && !course.isCustomCourse ? (
                            <label className="split-view-label" title="Show subfolders as separate courses">
                                <input
                                    type="checkbox"
                                    className="split-course-cb"
                                    data-id={course.id}
                                    checked={!!course.isSplitView}
                                    onChange={(e) => onToggleSplitView ? onToggleSplitView(course.id, e.target.checked) : null}
                                />
                                Split by Folders
                            </label>
                        ) : null}
                    </div>
                </div>

                <div className="course-progress-container">
                    <div className="course-progress-bar">
                        <div className="course-progress-fill" style={{ width: `${progress.percentage || 0}%` }}></div>
                    </div>
                    <div className="course-progress-text">
                        {progress.completed || 0} / {progress.total || course.videoCount || 0} lectures completed
                    </div>
                </div>

                <button
                    type="button"
                    className="enter-course-btn"
                    data-id={course.id}
                    onClick={() => onEnterCourse ? onEnterCourse(course.id) : null}
                >
                    Enter Course
                </button>
            </div>
        </div>
    );
}
