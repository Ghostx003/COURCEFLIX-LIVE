import React, { useEffect } from 'react';

export default function ReviewView() {
  useEffect(() => {
    if (typeof window.showFilteredCoursesView === 'function') {
      window.showFilteredCoursesView('review');
    }
  }, []);

  return (
    <div id="review-view" className="view">
        <div className="view-header">
            <button className="primary-btn" id="filter-btn-review" onClick={() => window.showFilteredCoursesView && window.showFilteredCoursesView('review')}><i className="fas fa-filter"></i> Filter by Course</button>
        </div>
        <main id="review-grid" className="grid-container"></main>
    </div>
  );
}
