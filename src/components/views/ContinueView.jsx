import React from 'react';
export default function ContinueView() {
  return (
    <div id="continue-view" className="view" style={{"overflowY":"auto"}}>
        <div style={{"padding":"20px"}}>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"20px"}}>
                <div>
                    <h2 style={{"margin":"0"}}>Continue Studying</h2>
                    <p style={{"color":"var(--text-secondary)","margin":"5px 0 0 0"}}>Courses you've accessed in the last 30 hours</p>
                </div>
                <div style={{"display":"flex","gap":"10px","alignItems":"center"}}>
                    <select id="continue-sort-select" className="input-main" style={{"padding":"6px 10px"}}>
                        <option value="last_studied">Sort by: Last Studied</option>
                        <option value="most_studied">Sort by: Most Studied</option>
                        <option value="least_studied">Sort by: Least Studied</option>
                    </select>
                    <button id="clear-continue-btn" className="secondary-btn"><i className="fas fa-trash"></i> Clear All</button>
                </div>
            </div>
            <main id="history-continue-grid" className="grid-container"></main>
        </div>
    </div>
  );
}
