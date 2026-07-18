import React from 'react';
export default function PlanView() {
  return (
    <div id="plan-view" className="view" style={{"padding":"0"}}>
        <iframe id="plan-iframe" src="static/plan.html" style={{"width":"100%","height":"100%","border":"none"}}></iframe>
    </div>
  );
}
