import React from 'react';
export default function CompletionCalculatorModalModal() {
  return (
    <div id="completion-calculator-modal" className="modal-overlay hidden">
        <div className="modal-content" style={{"maxWidth":"450px"}}>
            <button className="close-modal-btn" title="Close">&times;</button>
            <h2>Completion Calculator</h2>
            <p style={{"color":"var(--text-secondary)","margin":"-0.5rem 0 1rem 0"}}>Estimate when you'll finish all your un-ignored lectures.</p>
            
            <div className="modal-content-scrollable">
                <div className="calc-input-group">
                    <label>Daily Study Hours</label>
                    <input type="number" id="calc-daily-hours" defaultValue="7" min="1" max="24" step="0.5" />
                </div>
                <div className="calc-input-group">
                    <label>Average Playback Speed</label>
                    <input type="number" id="calc-playback-speed" defaultValue="1.5" min="0.5" max="5" step="0.1" />
                </div>
                
                <div className="calc-results-panel">
                    <h3>Realistic Finish Date:</h3>
                    <div className="calc-big-date" id="calc-result-date">Calculating...</div>
                    <div className="calc-meta-stats" id="calc-result-stats">...</div>
                </div>
                
                <div className="calc-results-panel" style={{"marginTop":"1rem"}}>
                    <h3 style={{"marginBottom":"5px"}}>Overall Progress:</h3>
                    <div className="calc-big-date" id="calc-progress-percentage" style={{"color":"var(--accent-primary)"}}>0%</div>
                </div>
                
                <div className="calc-results-panel" style={{"marginTop":"1rem","padding":"1rem","position":"relative"}}>
                    <h3 style={{"fontSize":"1rem","marginBottom":"8px","color":"var(--text-secondary)"}}>Today's Lecture Goal</h3>
                    <div id="daily-goal-display" style={{"cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","gap":"8px","padding":"8px","background":"var(--bg-secondary)","border":"1px solid var(--border-primary)","borderRadius":"8px"}}>
                        <input type="checkbox" id="daily-goal-checkbox" style={{"pointerEvents":"none","accentColor":"var(--accent-primary)","width":"18px","height":"18px","margin":"0"}} />
                        <span id="daily-goal-text" style={{"fontSize":"1.1rem","fontWeight":"600","color":"var(--text-primary)"}}>Goal: 0/0 lectures</span>
                        <i className="fas fa-chevron-down" style={{"fontSize":"0.9rem","color":"var(--text-secondary)"}}></i>
                    </div>
                    <div id="daily-goal-dropdown" className="hidden" style={{"position":"absolute","top":"calc(100% - 10px)","left":"0","right":"0","backgroundColor":"var(--bg-secondary)","border":"1px solid var(--border-primary)","borderRadius":"6px","boxShadow":"var(--shadow)","zIndex":"70","maxHeight":"200px","overflowY":"auto","padding":"8px","textAlign":"left","display":"flex","flexDirection":"column","gap":"4px"}}>
                    </div>
                </div>
            </div>
            
            <button className="primary-btn" id="run-calculator-btn" style={{"width":"100%","marginTop":"1rem"}}>Update Calculation</button>
        </div>
    </div>
  );
}
