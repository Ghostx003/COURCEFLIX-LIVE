import React from 'react';
export default function IntellView() {
  return (
    <div id="intell-view" className="view">
        <div className="intell-header">
            <h2 style={{"marginTop":"0","marginBottom":"16px","color":"var(--text-primary)","fontSize":"1.8rem"}}><i className="fas fa-brain" style={{"color":"var(--accent-primary)"}}></i> Intell Notes Hub</h2>
            <div className="intell-search-container">
                <i className="fas fa-search" style={{"color":"var(--text-secondary)"}}></i>
                <input type="text" id="intell-search-input" placeholder="Search across all your notes..." />
            </div>
        </div>
        <div id="intell-feed-container"></div>
    </div>
  );
}
