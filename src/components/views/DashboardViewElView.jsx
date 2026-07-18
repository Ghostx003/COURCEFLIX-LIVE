import React from 'react';
export default function DashboardViewElView() {
  return (
    <div id="dashboard-view-el" className="view active">
        <div style={{"padding":"10px 24px","display":"flex","justifyContent":"flex-end","alignItems":"center","gap":"10px","borderBottom":"1px solid var(--border-primary)","background":"var(--bg-primary)","flexWrap":"wrap"}}>
            <div id="search-bar-container" style={{"display":"flex","alignItems":"center","background":"var(--bg-tertiary)","border":"1px solid var(--border-secondary)","borderRadius":"20px","padding":"6px 14px","width":"220px","transition":"all 0.3s ease","marginRight":"auto","boxShadow":"0 2px 5px rgba(0,0,0,0.05)"}}>
                <i className="fas fa-search" style={{"color":"var(--text-secondary)","marginRight":"8px","fontSize":"0.9rem"}}></i>
                <input type="text" id="global-search-input" placeholder="" style={{"border":"none","background":"transparent","color":"var(--text-primary)","fontFamily":"inherit","fontSize":"0.85rem","width":"100%","outline":"none"}} autoComplete="off" />
            </div>
            <label htmlFor="course-sort-select" style={{"fontSize":"0.9rem","color":"var(--text-secondary)","fontWeight":"600"}}>Sort by:</label>
            <select id="course-sort-select" style={{"padding":"6px 12px","borderRadius":"6px","border":"1px solid var(--border-secondary)","background":"var(--bg-tertiary)","color":"var(--text-primary)","fontFamily":"inherit","fontSize":"0.85rem","fontWeight":"500","cursor":"pointer"}}>
                <option value="custom">Custom (Drag & Drop)</option>
                <option value="completion_asc">Completion (Low to High)</option>
                <option value="completion_desc">Completion (High to Low)</option>
                <option value="duration_desc">Duration (High to Low)</option>
                <option value="duration_asc">Duration (Low to High)</option>
            </select>
            <button id="open-settings-btn" style={{"background":"none","border":"none","color":"var(--text-secondary)","cursor":"pointer","fontSize":"1.2rem","display":"flex","alignItems":"center","justifyContent":"center","transition":"color 0.2s"}} title="Settings">
                <i className="fas fa-gear"></i>
            </button>
        </div>
        <main id="course-grid" className="grid-container"></main>
    </div>
  );
}
