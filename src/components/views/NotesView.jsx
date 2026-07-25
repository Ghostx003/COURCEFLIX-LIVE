import React from 'react';

export default function NotesView() {
  return (
    <div id="notes-view" className="view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fas fa-sticky-note" style={{ color: 'var(--accent-primary)' }}></i> Course Notes
        </h2>
        <button 
          onClick={() => window.switchView ? window.switchView('intell-view') : (window.location.hash = '#intell-view')}
          style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)',
            transition: 'transform 0.2s ease'
          }}
        >
          <i className="fas fa-brain"></i> Open Intell Hub
        </button>
      </div>

      <main id="notes-course-grid" className="grid-container"></main>

      <div id="notes-detail-container" className="hidden">
        <div id="notes-sidebar">
          <div id="notes-sidebar-header">
            <a className="back-link" id="back-to-notes-grid" style={{ marginBottom: "1rem" }}>&larr; Back to Courses</a>
            <h2 id="notes-detail-course-title">Class Notes</h2>
          </div>
          <div id="notes-list-container"></div>
        </div>
        <div id="notes-content-area" style={{ display: "flex", flexDirection: "column" }}>
          <div id="notes-viewer-header" className="hidden" style={{ padding: "10px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "flex-end" }}>
            <a id="notes-open-external" href="#" target="_blank" className="secondary-btn" style={{ textDecoration: "none" }}><i className="fas fa-external-link-alt"></i> Open PDF in Browser</a>
          </div>
          <iframe id="notes-viewer-frame" src="about:blank" style={{ flex: "1", border: "none" }}></iframe>
          <p id="notes-no-content-message" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "50px" }}>Select a note from the sidebar to view it.</p>
        </div>
        <button id="notes-sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
      </div>
    </div>
  );
}
