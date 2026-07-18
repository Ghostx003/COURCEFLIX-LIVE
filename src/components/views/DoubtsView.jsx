import React from 'react';
export default function DoubtsView() {
  return (
    <div id="doubts-view" className="view">
        <div id="doubts-list-container" style={{"display":"flex","flexDirection":"column","width":"100%","height":"100%"}}>
            <main id="doubts-course-grid" className="grid-container"></main>
        </div>
        <div id="doubts-detail-container" className="hidden">
            <div className="view-header">
                <a className="back-link" id="back-to-doubts-grid" style={{"cursor":"pointer","color":"var(--accent-primary)","fontWeight":"500"}}>&larr; Back to Doubts Folders</a>
                <h2 id="doubts-detail-title" style={{"marginLeft":"1rem","fontSize":"1.25rem"}}></h2>
            </div>
            <main id="doubts-specific-grid" className="grid-container"></main>
        </div>
    </div>
  );
}
