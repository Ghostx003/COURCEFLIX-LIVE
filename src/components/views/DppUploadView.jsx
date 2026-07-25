import React from 'react';
export default function DppUploadView() {
  return (
    <div id="dpp-upload-view" className="view">
        <div id="dpp-upload-sidebar">
            <div id="dpp-upload-header">
                <a className="back-link" id="back-to-upload-from-dpp">&larr; Back to Upload</a>
                <h3 id="dpp-upload-course-title"></h3>
                <div style={{"display":"flex","gap":"8px"}}>
                    <input type="text" id="new-dpp-folder-name" placeholder="New folder name..." style={{"width":"100%"}} className="course-info-input" />
                    <button id="add-dpp-folder-btn" className="primary-btn"><i className="fas fa-plus"></i></button>
                </div>
            </div>
            <div id="dpp-folder-list"></div>
        </div>
        <div id="dpp-upload-main-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', paddingBottom: '1rem' }}>
                <h3 id="dpp-upload-current-folder-title" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Select a folder</h3>
            </div>
            <div id="dpp-upload-drop-zone" className="drop-zone">
                <i className="fas fa-file-upload"></i>
                <h4>Upload DPPs</h4>
                <p>Drag & Drop Files Here or click to browse</p>
                <input type="file" id="dpp-file-input" multiple accept=".pdf" style={{ display: 'none' }} />
                <button id="browse-dpp-files-btn" className="primary-btn" style={{ marginTop: '0.75rem', padding: '6px 14px', fontSize: '0.85rem' }}>
                    <i className="fas fa-folder-open"></i> Browse Files
                </button>
            </div>
            <div id="dpp-upload-files-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}></div>
        </div>
        <button id="dpp-upload-sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
    </div>
  );
}
