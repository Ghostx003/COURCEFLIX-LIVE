import React from 'react';
import { getSubfolderDisplayName, getParentPath } from '../../utils/subcourseUtils.js';

export default function SubcourseHeader({
    course,
    basePath,
    origin = 'dashboard-view',
    resumePath,
    onBack
}) {
    const titleDisplay = basePath === '' ? (course?.title || '') : getSubfolderDisplayName(course, basePath);

    let backText = '← Back to Dashboard';
    if (origin === 'home-view' && basePath === '') {
        backText = '← Back to Landing Page';
    } else if (origin === 'faculty-view' && basePath === (resumePath || '')) {
        backText = '← Back to Faculty';
    } else if (origin === 'search-results-view') {
        backText = '← Back to Search';
    } else if (origin === 'continue-view' && basePath === (resumePath || '')) {
        backText = '← Back to Continue';
    } else if (basePath !== '') {
        const parentPath = getParentPath(basePath);
        const parentName = parentPath === '' ? (course?.title || '') : getSubfolderDisplayName(course, parentPath);
        backText = `← Back to ${parentName}`;
    }

    return (
        <div className="view-header">
            <a
                className="back-link"
                id="back-to-dashboard-from-sub"
                style={{ cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: '500' }}
                onClick={(e) => {
                    e.preventDefault();
                    onBack();
                }}
            >
                {backText}
            </a>
            <h2 id="subcourse-parent-title" style={{ marginLeft: '1rem', fontSize: '1.25rem' }}>
                {titleDisplay} (Folders)
            </h2>
        </div>
    );
}
