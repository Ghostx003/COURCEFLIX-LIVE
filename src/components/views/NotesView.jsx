import React from 'react';
export default function NotesView() {
  return (
    <div id="notes-view" className="view">
        <main id="notes-course-grid" className="grid-container"></main>
        <div id="notes-detail-container" className="hidden">
            <div id="notes-sidebar">
                <div id="notes-sidebar-header">
                    <a className="back-link" id="back-to-notes-grid" style={{"marginBottom":"1rem"}}>&larr; Back to Courses</a>
                    <h2 id="notes-detail-course-title">Class Notes</h2>
                </div>
                <div id="notes-list-container"></div>
            </div>
            <div id="notes-content-area" style={{"display":"flex","flexDirection":"column"}}>
                <div id="notes-viewer-header" className="hidden" style={{"padding":"10px","background":"var(--bg-secondary)","borderBottom":"1px solid var(--border-primary)","display":"flex","justifyContent":"flex-end"}}>
                    <a id="notes-open-external" href="#" target="_blank" className="secondary-btn" style={{"textDecoration":"none"}}><i className="fas fa-external-link-alt"></i> Open PDF in Browser</a>
                </div>
                <iframe id="notes-viewer-frame" src="about:blank" style={{"flex":"1","border":"none"}}></iframe>
                <p id="notes-no-content-message" style={{"textAlign":"center","color":"var(--text-secondary)","padding":"50px"}}>Select a note from the sidebar to view it.</p>
            </div>
            <button id="notes-sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
        </div>
    </div>
  );
}
