import React from 'react';
export default function ModalOverlayModal() {
  return (
    <div id="modal-overlay" className="modal-overlay hidden">
        <div className="modal-content">
            <button className="close-modal-btn" title="Close">&times;</button>
            <h2>Manage Courses</h2>
            <button id="add-folder-btn" className="secondary-btn"><i className="fas fa-folder-plus"></i> Add Course Folder</button>
            <hr style={{"width":"100%","border":"none","borderTop":"1px solid var(--border-primary)"}} />
            <button id="import-btn" className="secondary-btn"><i className="fas fa-file-import"></i> Import Backup</button>
            <button id="export-btn" className="secondary-btn"><i className="fas fa-file-export"></i> Export Backup</button>
        </div>
    </div>
  );
}
