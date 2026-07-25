import React from 'react';

export default function NotesView() {
  return (
    <div id="notes-view" className="view">
      <div id="notes-grid-header" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "16px 24px 0 24px" }}>
        <button id="notes-intell-hub-btn" className="primary-btn" style={{ padding: "6px 14px", fontSize: "0.85rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <i className="fas fa-brain"></i> Intell Hub
        </button>
      </div>

      <main id="notes-course-grid" className="grid-container" style={{ paddingTop: "12px" }}></main>

      <div id="notes-detail-container" className="hidden">
        <div id="notes-sidebar">
          <div id="notes-sidebar-header">
            <a className="back-link" id="back-to-notes-grid" style={{ marginBottom: "1rem" }}>&larr; Back to Courses</a>
          </div>
          <div id="notes-list-container"></div>
        </div>
        <div id="notes-content-area" style={{ display: "flex", flexDirection: "column" }}>
          <iframe id="notes-viewer-frame" src="about:blank" style={{ flex: "1", border: "none", display: "none" }}></iframe>
          <p id="notes-no-content-message" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "50px" }}>Select a note from the sidebar to view it.</p>
        </div>
        <button id="notes-sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
      </div>
    </div>
  );
}



