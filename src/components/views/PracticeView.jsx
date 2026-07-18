import React from 'react';
export default function PracticeView() {
  return (
    <div id="practice-view" className="view">
        <div className="view-header">
            <button className="primary-btn" id="filter-btn-practice"><i className="fas fa-filter"></i> Filter by Course</button>
        </div>
        <main id="practice-grid" className="grid-container"></main>
    </div>
  );
}
