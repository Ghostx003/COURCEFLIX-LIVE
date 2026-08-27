import React, { memo } from 'react';

const ReviewView = memo(function ReviewView() {
  return (
    <div id="review-view" className="view">
        <div className="view-header">
            <button className="primary-btn" id="filter-btn-review" onClick={() => window.showFilteredCoursesView && window.showFilteredCoursesView('review')}><i className="fas fa-filter"></i> Filter by Course</button>
        </div>
        <main id="review-grid" className="grid-container"></main>
    </div>
  );
});

export default ReviewView;
