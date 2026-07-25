import React from 'react';

export default function DppView() {
  return (
    <div id="dpp-view" className="view">
        <main id="dpp-course-grid" className="grid-container"></main>
        <div id="dpp-detail-container" className="hidden">
            <div id="dpp-sidebar">
                <div id="dpp-sidebar-header">
                    <a className="back-link" id="back-to-dpp-grid" style={{"marginBottom":"1rem"}}>&larr; Back to Courses</a>
                    <h2 id="dpp-detail-course-title">DPP Library</h2>
                </div>
                <div id="dpp-list-container"></div>
            </div>
            <div id="dpp-content-area" style={{"display":"flex","flexDirection":"column"}}>
                <iframe id="dpp-viewer-frame" src="about:blank" style={{"flex":"1","border":"none"}}></iframe>
                <p id="dpp-no-content-message" style={{"textAlign":"center","color":"var(--text-secondary)","padding":"50px"}}>Select a DPP from the sidebar to view it.</p>
            </div>
            <button id="dpp-sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
        </div>
    </div>
  );
}
