import React, { useEffect } from 'react';

export default function PracticeView() {
  useEffect(() => {
    if (typeof window.showFilteredCoursesView === 'function') {
      window.showFilteredCoursesView('practice');
    }
  }, []);

  return (
    <div id="practice-view" className="view">
        <div className="view-header">
            <button className="primary-btn" id="filter-btn-practice" onClick={() => window.showFilteredCoursesView && window.showFilteredCoursesView('practice')}><i className="fas fa-filter"></i> Filter by Course</button>
        </div>
        <main id="practice-grid" className="grid-container"></main>
    </div>
  );
}
