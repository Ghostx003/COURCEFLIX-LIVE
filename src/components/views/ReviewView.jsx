import React from 'react';
export default function ReviewView() {
  return (
    <div id="review-view" className="view">
        <div className="view-header">
            <button className="primary-btn" id="filter-btn-review"><i className="fas fa-filter"></i> Filter by Course</button>
        </div>
        <main id="review-grid" className="grid-container"></main>
    </div>
  );
}
