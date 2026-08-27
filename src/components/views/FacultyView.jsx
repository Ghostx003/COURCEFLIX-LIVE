import React, { memo } from 'react';

const FacultyView = memo(function FacultyView() {
  return (
    <div id="faculty-view" className="view" style={{"display":"flex","flexDirection":"column","height":"100%","overflow":"hidden"}}>
        <div className="faculty-view-header" style={{"padding":"16px 24px 0 24px","display":"flex","justifyContent":"space-between","alignItems":"center","flexShrink":0}}>
            <h2 style={{"margin":0,"fontSize":"1.5rem","fontWeight":"700","color":"var(--text-primary)"}}>Teacher Analytics &amp; Profiles</h2>
            <div style={{"display":"flex","gap":"12px","alignItems":"center"}}>
                <input type="text" id="faculty-search-input" className="input-main" placeholder="Search teacher or subject..." style={{"padding":"6px 12px","minWidth":"220px"}} />
                <select id="faculty-time-filter" className="input-main" style={{"padding":"6px 12px"}}>
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                </select>
                <select id="faculty-sort-select" className="input-main" style={{"padding":"6px 12px"}}>
                    <option value="most_studied">Sort by: Most Studied Time</option>
                    <option value="least_studied">Sort by: Least Studied Time</option>
                    <option value="most_taught_hours">Sort by: Most Total Content</option>
                    <option value="least_taught_hours">Sort by: Least Total Content</option>
                    <option value="most_lectures">Sort by: Most Lectures</option>
                    <option value="alphabetical">Sort by: Alphabetical (A-Z)</option>
                    <option value="highest_rating">Sort by: Star Rating</option>
                </select>
                <button id="reset-hidden-faculties-btn" className="secondary-btn" style={{"padding":"6px 12px","fontSize":"0.85rem","display":"none"}} title="Manage Aliases &amp; Unhide Teachers"><i className="fas fa-undo"></i> Reset / Unhide</button>
            </div>
        </div>

        <div className="faculty-view-body" style={{"display":"flex","flex":1,"overflow":"hidden","padding":"16px 24px 24px 24px","gap":"24px"}}>
            {/* Main Cards Grid */}
            <div className="faculty-grid-container" style={{"flex":"1 1 65%","overflowY":"auto","paddingRight":"8px"}}>
                <div id="faculty-grid" className="grid-container" style={{"gridTemplateColumns":"repeat(auto-fill, minmax(280px, 1fr))","gap":"20px"}}></div>
            </div>

            {/* Right Side Stats & Chart */}
            <div className="faculty-insights-panel" style={{"flex":"0 0 340px","background":"var(--bg-secondary)","border":"1px solid var(--border-primary)","borderRadius":"16px","padding":"20px","display":"flex","flexDirection":"column","gap":"20px","overflowY":"auto"}}>
                <h3 id="faculty-aside-title" style={{"margin":0,"fontSize":"1.1rem","color":"var(--text-primary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"10px"}}>Study Distribution</h3>
                
                {/* Time Distribution Pie/Doughnut Placeholder */}
                <div className="faculty-chart-box" style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"12px"}}>
                    <div id="faculty-pie-chart" style={{"width":"140px","height":"140px","borderRadius":"50%","background":"conic-gradient(#38bdf8 0% 100%)","position":"relative","boxShadow":"0 4px 15px rgba(0,0,0,0.3)","display":"flex","alignItems":"center","justifyContent":"center"}}>
                        <div style={{"width":"90px","height":"90px","borderRadius":"50%","background":"var(--bg-secondary)","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"}}>
                            <span id="faculty-total-time-val" style={{"fontSize":"0.95rem","fontWeight":"700","color":"var(--accent-primary)"}}>0h 0m</span>
                            <span id="faculty-total-time-label" style={{"fontSize":"0.65rem","color":"var(--text-secondary)","textTransform":"uppercase"}}>Total Time</span>
                        </div>
                    </div>
                    <div id="faculty-pie-legend" style={{"display":"flex","flexDirection":"column","gap":"6px","width":"100%","fontSize":"0.8rem","color":"var(--text-secondary)"}}></div>
                </div>

                {/* Subject Summary Breakdown */}
                <div className="faculty-subject-breakdown" style={{"borderTop":"1px solid var(--border-secondary)","paddingTop":"16px"}}>
                    <h4 style={{"margin":"0 0 12px 0","fontSize":"0.95rem","color":"var(--text-primary)"}}>Subject Overview</h4>
                    <div id="faculty-subject-list" style={{"display":"flex","flexDirection":"column","gap":"8px"}}></div>
                </div>
            </div>
        </div>

        {/* Hidden Inputs for Profile Photo Upload */}
        <input type="file" id="faculty-photo-upload" accept="image/*" style={{"display":"none"}} />

        {/* Faculty Profile Modal / Detail Drilldown */}
        <div id="faculty-profile-modal" className="modal-overlay hidden" style={{"zIndex":100000}}>
            <div className="modal-content" style={{"maxWidth":"700px","width":"90%","maxHeight":"85vh","display":"flex","flexDirection":"column","padding":"24px","borderRadius":"16px","background":"var(--bg-secondary)","color":"var(--text-primary)","border":"1px solid var(--border-primary)"}}>
                <div style={{"display":"flex","justifyContent":"space-between","alignItems":"center","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"12px","marginBottom":"16px"}}>
                    <h2 id="faculty-profile-title" style={{"margin":0,"fontSize":"1.3rem","color":"var(--accent-primary)"}}>Teacher Profile</h2>
                    <button className="close-modal-btn" onClick={() => document.getElementById('faculty-profile-modal').classList.add('hidden')} style={{"background":"none","border":"none","color":"var(--text-secondary)","fontSize":"1.5rem","cursor":"pointer"}}>&times;</button>
                </div>
                <div id="faculty-profile-body" style={{"overflowY":"auto","flex":1}}></div>
            </div>
        </div>
    </div>
  );
});

export default FacultyView;
