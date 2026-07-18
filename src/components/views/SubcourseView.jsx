import React from 'react';
export default function SubcourseView() {
  return (
    <div id="subcourse-view" className="view">
        <div className="view-header">
            <a className="back-link" id="back-to-dashboard-from-sub" style={{"cursor":"pointer","color":"var(--accent-primary)","fontWeight":"500"}}>&larr; Back to Dashboard</a>
            <h2 id="subcourse-parent-title" style={{"marginLeft":"1rem","fontSize":"1.25rem"}}></h2>
        </div>
        <main id="subcourse-grid" className="grid-container"></main>
    </div>
  );
}
