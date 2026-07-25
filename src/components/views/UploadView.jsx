import React from 'react';

export default function UploadView() {
  return (
    <div id="upload-view" className="view">
        <main id="upload-course-grid" className="grid-container"></main>
        <div id="upload-subfolder-view" className="hidden">
            <div className="view-header">
                <a className="back-link" id="back-to-upload-from-subfolder" style={{"cursor":"pointer","color":"var(--accent-primary)","fontWeight":"500"}}>&larr; Back to Upload</a>
                <h2 id="upload-subfolder-title" style={{"marginLeft":"1rem","fontSize":"1.25rem"}}></h2>
            </div>
            <main id="upload-subfolder-grid" className="grid-container"></main>
        </div>
        <div id="upload-detail-view" className="hidden">
            <div id="upload-lecture-list-container">
                <div id="upload-lecture-list-header">
                    <a className="back-link" id="back-to-upload-grid">&larr; Back to Courses</a>
                    <div style={{"display":"flex","alignItems":"center","justify":"space-between","marginTop":"0.5rem","gap":"0.5rem"}}>
                        <h3 id="upload-course-title" style={{"margin":0,"wordBreak":"break-word","flexGrow":1}}></h3>
                        <button id="smart-add-toggle-btn" className="smart-add-btn" title="Toggle Smart Add mode for bulk file upload">
                            <i className="fas fa-magic"></i> <span>Smart Add</span>
                        </button>
                    </div>
                </div>
                <div id="upload-lecture-list"></div>
            </div>
            <div id="upload-drop-zones">
                <input type="file" id="pdf-file-input" accept=".pdf" style={{"display":"none"}} />
                <input type="file" id="assignment-file-input" style={{"display":"none"}} />
                
                <div className="drop-zone" id="pdf-drop-zone" data-type="pdf">
                    <i className="fas fa-file-pdf"></i>
                    <h4>Lecture Notes (PDF)</h4>
                    <p className="drop-zone-desc">Drag & Drop a PDF Here</p>
                </div>
                <div className="drop-zone" id="assignment-drop-zone" data-type="assignment">
                    <i className="fas fa-file-alt"></i>
                    <h4>Assignment / DPP</h4>
                    <p className="drop-zone-desc">Drag & Drop File Here</p>
                </div>
            </div>
        </div>
    </div>
  );
}
