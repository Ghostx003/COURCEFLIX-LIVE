import React from 'react';

export default function DashboardViewElView() {
  return (
    <div id="dashboard-view-el" className="view">
        <div style={{
            "padding":"12px 28px",
            "display":"flex",
            "justifyContent":"flex-end",
            "alignItems":"center",
            "gap":"14px",
            "borderBottom":"1px solid var(--glass-border)",
            "background":"var(--glass-bg)",
            "backdropFilter":"var(--glass-blur)",
            "WebkitBackdropFilter":"var(--glass-blur)",
            "flexWrap":"wrap",
            "boxShadow":"0 4px 20px rgba(0,0,0,0.05)"
        }}>
            <div id="search-bar-container" style={{
                "display":"flex",
                "alignItems":"center",
                "background":"var(--bg-tertiary)",
                "border":"1px solid var(--border-secondary)",
                "borderRadius":"24px",
                "padding":"7px 16px",
                "width":"250px",
                "transition":"all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "marginRight":"auto",
                "boxShadow":"inset 0 1px 3px rgba(0,0,0,0.1)"
            }}>
                <i className="fas fa-search" style={{"color":"var(--accent-primary)","marginRight":"10px","fontSize":"0.9rem"}}></i>
                <input 
                    type="text" 
                    id="global-search-input" 
                    placeholder="Search courses..." 
                    style={{
                        "border":"none",
                        "background":"transparent",
                        "color":"var(--text-primary)",
                        "fontFamily":"inherit",
                        "fontSize":"0.88rem",
                        "fontWeight":"500",
                        "width":"100%",
                        "outline":"none"
                    }} 
                    autoComplete="off" 
                />
            </div>
            <a id="custom-dashboard-btn" href="#" target="_blank" rel="noopener noreferrer" className="primary-btn" style={{"padding":"7px 14px","fontSize":"0.85rem","textDecoration":"none","display":"none","borderRadius":"10px"}}>
                <i className="fas fa-link" style={{"marginRight":"6px"}}></i> <span id="custom-dashboard-btn-text" style={{"maxWidth":"150px","overflow":"hidden","textOverflow":"ellipsis","whiteSpace":"nowrap"}}></span>
            </a>
            <button 
                id="completion-feature-btn" 
                className="primary-btn completion-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('open-completion-modal'))}
                style={{
                    "padding":"7px 14px",
                    "fontSize":"0.85rem",
                    "borderRadius":"10px",
                    "background":"linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    "color":"#ffffff",
                    "border":"1px solid rgba(255,255,255,0.2)",
                    "cursor":"pointer",
                    "display":"inline-flex",
                    "alignItems":"center",
                    "gap":"6px",
                    "boxShadow":"0 4px 12px rgba(16, 185, 129, 0.3)",
                    "transition":"all 0.25s ease"
                }}
                title="Open Completion Planner & Target Tracker"
            >
                <i className="fas fa-chart-pie"></i> Completion
            </button>
            <div style={{"display":"flex","alignItems":"center","gap":"8px"}}>
                <label htmlFor="course-sort-select" style={{"fontSize":"0.88rem","color":"var(--text-secondary)","fontWeight":"600"}}>Sort by:</label>
                <select id="course-sort-select" style={{
                    "padding":"7px 14px",
                    "borderRadius":"10px",
                    "border":"1px solid var(--border-secondary)",
                    "background":"var(--bg-tertiary)",
                    "color":"var(--text-primary)",
                    "fontFamily":"inherit",
                    "fontSize":"0.85rem",
                    "fontWeight":"600",
                    "cursor":"pointer",
                    "outline":"none",
                    "transition":"all 0.2s ease"
                }}>
                    <option value="custom">Custom (Drag & Drop)</option>
                    <option value="completion_asc">Completion (Low to High)</option>
                    <option value="completion_desc">Completion (High to Low)</option>
                    <option value="duration_desc">Duration (High to Low)</option>
                    <option value="duration_asc">Duration (Low to High)</option>
                </select>
            </div>
            <button 
                id="open-settings-btn" 
                style={{
                    "background":"var(--bg-tertiary)",
                    "border":"1px solid var(--border-secondary)",
                    "color":"var(--text-primary)",
                    "cursor":"pointer",
                    "fontSize":"1.1rem",
                    "display":"flex",
                    "alignItems":"center",
                    "justifyContent":"center",
                    "width":"36px",
                    "height":"36px",
                    "borderRadius":"10px",
                    "transition":"all 0.25s ease",
                    "boxShadow":"0 2px 8px rgba(0,0,0,0.1)"
                }} 
                title="Settings"
            >
                <i className="fas fa-gear"></i>
            </button>
        </div>
        <main id="course-grid" className="grid-container"></main>
    </div>
  );
}
