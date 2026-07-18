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
        <div id="dpp-upload-drop-zone" className="drop-zone">
            <i className="fas fa-file-upload"></i>
            <h4>Upload DPPs</h4>
            <p>Drag & Drop Files Here</p>
        </div>
        <button id="dpp-upload-sidebar-toggle-btn"><i className="fas fa-chevron-left"></i></button>
    </div>
  );
}
