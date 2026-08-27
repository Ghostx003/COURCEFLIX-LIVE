import React, { memo } from 'react';

const DoubtsView = memo(function DoubtsView() {
  return (
    <div id="doubts-view" className="view">
        <main id="doubts-course-grid" className="grid-container"></main>
        <div id="doubts-detail-container" className="hidden">
            <div className="view-header">
                <a className="back-link" id="back-to-doubts-grid">&larr; Back to Courses</a>
                <h2 id="doubts-detail-title" style={{"marginLeft":"1rem"}}>Course Doubts</h2>
                <div style={{"marginLeft":"auto","display":"flex","gap":"10px"}}>
                    <button id="clear-all-doubts-btn" className="secondary-btn" style={{"color":"var(--accent-danger)","borderColor":"var(--accent-danger)"}}><i className="fas fa-trash-alt"></i> Clear All Doubts</button>
                </div>
            </div>
            <div id="doubts-list-container" className="doubts-grid"></div>
        </div>
    </div>
  );
});

export default DoubtsView;
