import React from 'react';
import { useRouter } from '../../hooks/useRouter.js';

export default function ProgressView() {
  const { currentView } = useRouter();

  return (
    <div id="progress-view" className={`view ${currentView === 'progress-view' ? 'active' : ''}`} style={{"padding":"0"}}>
        <iframe id="progress-iframe" src="static/progress.html#dashboard" style={{"width":"100%","height":"100%","border":"none"}}></iframe>
    </div>
  );
}
