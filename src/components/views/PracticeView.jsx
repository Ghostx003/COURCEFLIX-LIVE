import React, { useEffect } from 'react';
import { useRouter } from '../../hooks/useRouter.js';

export default function PracticeView() {
  const { currentView } = useRouter();

  return (
    <div id="practice-view" className={`view ${currentView === 'practice-view' ? 'active' : ''}`}>
        <div className="view-header">
            <button className="primary-btn" id="filter-btn-practice" onClick={() => window.showFilteredCoursesView && window.showFilteredCoursesView('practice')}><i className="fas fa-filter"></i> Filter by Course</button>
        </div>
        <main id="practice-grid" className="grid-container"></main>
    </div>
  );
}
