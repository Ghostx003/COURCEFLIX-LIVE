import React from 'react';
export default function GoalsView() {
  return (
    <div id="goals-view" className="view" style={{"padding":"0"}}>
        <iframe id="goals-iframe" src="static/goals.html" style={{"width":"100%","height":"100%","border":"none"}}></iframe>
    </div>
  );
}
