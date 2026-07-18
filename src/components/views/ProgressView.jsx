import React from 'react';
export default function ProgressView() {
  return (
    <div id="progress-view" className="view" style={{"padding":"0"}}>
        <iframe id="progress-iframe" src="static/progress.html#dashboard" style={{"width":"100%","height":"100%","border":"none"}}></iframe>
    </div>
  );
}
