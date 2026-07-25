import React from 'react';
export default function IntellView() {
  return (
    <div id="intell-view" className="view">
        <div className="intell-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <button 
                  id="back-to-notes-from-intell" 
                  className="primary-btn" 
                  onClick={() => {
                    if (typeof window.switchView === 'function') {
                      window.switchView('notes-view');
                    } else {
                      window.location.hash = '#notes-view';
                    }
                  }}
                  style={{ padding: "6px 14px", fontSize: "0.85rem", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                >
                  <i className="fas fa-arrow-left"></i> Back to Notes
                </button>
                <h2 style={{"margin":"0","color":"var(--text-primary)","fontSize":"1.8rem"}}>
                  <i className="fas fa-brain" style={{"color":"var(--accent-primary)","marginRight":"8px"}}></i> Intell Notes Hub
                </h2>
            </div>
            <div className="intell-search-container">
                <i className="fas fa-search" style={{"color":"var(--text-secondary)"}}></i>
                <input type="text" id="intell-search-input" placeholder="Search across all your notes..." />
            </div>
        </div>
        <div id="intell-feed-container"></div>
    </div>
  );
}
