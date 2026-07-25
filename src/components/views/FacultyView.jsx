import React from 'react';
export default function FacultyView() {
  return (
    <div id="faculty-view" className="view" style={{"position":"relative"}}>
        <div className="faculty-header" style={{"padding":"10px 24px","display":"flex","justifyContent":"flex-end","alignItems":"center","gap":"10px","borderBottom":"1px solid var(--border-primary)","background":"var(--bg-primary)"}}>
            <button id="reset-hidden-faculties-btn" title="Reset Preferences" style={{"padding":"6px 12px","borderRadius":"6px","border":"1px solid var(--border-secondary)","background":"var(--bg-tertiary)","color":"var(--text-primary)","cursor":"pointer","fontSize":"0.85rem","fontWeight":"500","display":"none","alignItems":"center","justifyContent":"center","transition":"background-color 0.2s"}}><i className="fas fa-undo"></i></button>
            <label htmlFor="faculty-sort-select" style={{"fontSize":"0.9rem","color":"var(--text-secondary)","fontWeight":"600"}}>Sort by:</label>
            <select id="faculty-sort-select" style={{"padding":"6px 12px","borderRadius":"6px","border":"1px solid var(--border-secondary)","background":"var(--bg-tertiary)","color":"var(--text-primary)","fontFamily":"inherit","fontSize":"0.85rem","fontWeight":"500","cursor":"pointer"}}>
                <option value="most_studied">Most Studied (Hours)</option>
                <option value="least_studied">Least Studied (Hours)</option>
                <option value="most_taught_hours">Most Taught (Hours)</option>
                <option value="least_taught_hours">Least Taught (Hours)</option>
                <option value="most_lectures">Most Lectures</option>
                <option value="least_lectures">Least Lectures</option>
                <option value="most_fav">Most Fav</option>
                <option value="least_fav">Least Fav</option>
            </select>
            <select id="faculty-time-filter" style={{"padding":"6px 12px","borderRadius":"6px","border":"1px solid var(--border-secondary)","background":"var(--bg-tertiary)","color":"var(--text-primary)","fontFamily":"inherit","fontSize":"0.85rem","fontWeight":"500","cursor":"pointer","marginRight":"auto"}}>
                <option value="all">All Time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
            </select>
            <input type="file" id="faculty-photo-upload" accept="image/*" style={{"display":"none"}} />
            <button id="toggle-faculty-aside-btn" style={{"padding":"6px 12px","borderRadius":"6px","border":"1px solid var(--accent-primary)","background":"var(--accent-primary)","color":"white","cursor":"pointer","fontSize":"0.85rem","fontWeight":"600","display":"flex","alignItems":"center","gap":"6px","transition":"background-color 0.2s"}}><i className="fas fa-chart-pie"></i> Stats</button>
        </div>
        <div style={{"display":"flex","flexGrow":"1","overflow":"hidden","position":"relative"}}>
            <main id="faculty-grid" className="grid-container" style={{"flex":"1","padding":"1.5rem","overflowY":"auto","display":"grid","gridTemplateColumns":"repeat(auto-fit, minmax(320px, 1fr))","gap":"1.5rem","alignContent":"start"}}></main>
            <aside id="faculty-aside">
                <button id="close-faculty-aside-btn" style={{"position":"absolute","top":"12px","left":"12px","background":"none","border":"none","color":"var(--text-primary)","fontSize":"1.2rem","cursor":"pointer"}}><i className="fas fa-times"></i></button>
                <h3 id="faculty-aside-title" style={{"marginTop":"0","marginBottom":"24px","textAlign":"center","color":"var(--text-secondary)","fontWeight":"600","fontSize":"1.1rem"}}>Most Studied Teachers</h3>
                <div id="faculty-pie-chart" style={{"width":"200px","height":"200px","borderRadius":"50%","background":"conic-gradient(var(--bg-tertiary) 0% 100%)","display":"flex","alignItems":"center","justifyContent":"center","position":"relative","marginBottom":"24px","boxShadow":"0 4px 15px rgba(0,0,0,0.2)"}}>
                    <div style={{"width":"130px","height":"130px","backgroundColor":"var(--bg-secondary)","borderRadius":"50%","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center","position":"absolute","top":"50%","left":"50%","transform":"translate(-50%, -50%)","boxShadow":"inset 0 2px 5px rgba(0,0,0,0.2)"}}>
                        <span id="faculty-total-time" style={{"fontSize":"1.25rem","fontWeight":"bold","color":"var(--text-primary)"}}>0h 0m</span>
                        <span id="faculty-total-label" style={{"fontSize":"0.75rem","color":"var(--text-secondary)","textTransform":"uppercase","marginTop":"4px","fontWeight":"600"}}>Total Time</span>
                    </div>
                </div>
                <div style={{"width":"100%","display":"flex","justifyContent":"space-between","borderBottom":"1px solid var(--border-primary)","paddingBottom":"8px","marginBottom":"12px","fontSize":"0.75rem","fontWeight":"700","color":"var(--text-secondary)","textTransform":"uppercase"}}>
                    <span>Faculty</span>
                    <span id="faculty-legend-metric">Time Studied</span>
                </div>
                <div id="faculty-pie-legend" style={{"width":"100%","display":"flex","flexDirection":"column","gap":"10px"}}></div>
            </aside>
        </div>
        
        <div id="faculty-profile-overlay" style={{"position":"absolute","top":"0","left":"0","right":"0","bottom":"0","background":"var(--bg-primary)","zIndex":"200","display":"none","flexDirection":"column","overflowY":"auto"}}>
            <div style={{"padding":"24px","borderBottom":"1px solid var(--border-primary)","display":"flex","alignItems":"center","gap":"16px","position":"sticky","top":"0","background":"var(--bg-primary)","zIndex":"10"}}>
                <button id="close-faculty-profile-btn" className="primary-btn" style={{"fontSize":"0.9rem","padding":"6px 12px"}}><i className="fas fa-arrow-left"></i> Back to Faculty</button>
                <h2 id="faculty-profile-title" style={{"margin":"0","fontSize":"1.5rem","fontWeight":"600","color":"var(--text-primary)"}}>Faculty Profile</h2>
            </div>
            <div id="faculty-profile-grid" className="course-grid" style={{"padding":"24px","display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(280px, 1fr))","gap":"20px","alignContent":"start"}}></div>
        </div>
    </div>
  );
}
