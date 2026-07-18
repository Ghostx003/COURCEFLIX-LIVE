import React from 'react';
export default function HistoryView() {
  return (
    <div id="history-view" className="view" style={{"overflowY":"auto"}}>
        <div style={{"padding":"20px"}}>
            <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","marginBottom":"20px"}}>
                <h2 style={{"margin":"0"}}>Watch History (Last 7 Days)</h2>
                <button id="clear-history-btn" className="secondary-btn"><i className="fas fa-trash"></i> Clear History</button>
            </div>
            <div id="history-table-container" style={{"background":"var(--bg-secondary)","borderRadius":"8px","overflow":"hidden","border":"1px solid var(--border-secondary)"}}>
                <table style={{"width":"100%","borderCollapse":"collapse","textAlign":"left"}}>
                    <thead>
                        <tr style={{"background":"var(--bg-tertiary)","borderBottom":"1px solid var(--border-secondary)"}}>
                            <th style={{"padding":"12px 16px"}}>Course</th>
                            <th style={{"padding":"12px 16px"}}>Lecture</th>
                            <th style={{"padding":"12px 16px"}}>Duration</th>
                            <th style={{"padding":"12px 16px"}}>Time</th>
                            <th style={{"padding":"12px 16px","width":"40px"}}></th>
                        </tr>
                    </thead>
                    <tbody id="history-table-body">
                        {/* History rows injected here */}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}
