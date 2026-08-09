import React from 'react';
export default function SearchResultsView() {
  return (
    <div id="search-results-view" className="view" style={{"overflowY":"auto"}}>
        <div style={{"position":"sticky","top":"0","zIndex":"20","background":"var(--bg-primary)","borderBottom":"1px solid var(--border-primary)","paddingBottom":"12px","display":"flex","flexDirection":"column","alignItems":"center","width":"100%"}}>
            <div className="view-header" style={{"justifyContent":"center","padding":"0px 24px 12px 24px","borderBottom":"none","background":"transparent","width":"100%","position":"relative","gap":"16px"}}>
                <button className="icon-btn" id="back-from-search-btn" title="Back" style={{"background":"var(--bg-tertiary)","borderRadius":"50%","width":"40px","height":"40px","display":"flex","alignItems":"center","justifyContent":"center","boxShadow":"0 4px 10px rgba(0,0,0,0.1)","flexShrink":"0"}}><i className="fas fa-arrow-left"></i></button>
                <div id="search-results-bar-container" style={{"display":"flex","alignItems":"center","background":"var(--bg-tertiary)","border":"2px solid var(--accent-primary)","borderRadius":"12px","padding":"8px 20px","width":"100%","maxWidth":"600px","boxShadow":"0 4px 15px rgba(59, 130, 246, 0.15)"}}>
                    <i className="fas fa-search" style={{"color":"var(--accent-primary)","marginRight":"12px","fontSize":"1.2rem"}}></i>
                    <input type="text" id="search-results-input" placeholder="Search courses, chapters, or videos..." style={{"border":"none","background":"transparent","color":"var(--text-primary)","fontFamily":"inherit","fontSize":"1.1rem","width":"100%","outline":"none","padding":"4px 0"}} autoComplete="off" />
                    <div style={{"display":"flex","gap":"8px","marginLeft":"12px","borderLeft":"1px solid var(--border-secondary)","paddingLeft":"12px"}}>
                        <button id="search-mode-partial" className="icon-btn" style={{"background":"var(--accent-primary)","color":"white","borderRadius":"4px","padding":"4px 8px","fontSize":"0.9rem"}} title="Partial Match (Anywhere)"><i className="fas fa-cubes"></i></button>
                        <button id="search-mode-exact" className="icon-btn" style={{"background":"transparent","color":"var(--text-secondary)","borderRadius":"4px","padding":"4px 8px","fontSize":"0.9rem","border":"1px solid var(--border-secondary)"}} title="Exact Word & Case Match"><i className="fas fa-font"></i></button>
                    </div>
                </div>
                <button id="search-mode-faculty" className="icon-btn" style={{"background":"var(--bg-tertiary)","color":"var(--text-secondary)","borderRadius":"12px","width":"46px","height":"46px","display":"flex","alignItems":"center","justifyContent":"center","boxShadow":"0 4px 10px rgba(0,0,0,0.1)","border":"2px solid transparent","transition":"all 0.2s","flexShrink":"0"}} title="Search Faculty Only"><i className="fas fa-chalkboard-teacher" style={{"fontSize":"1.2rem"}}></i></button>
            </div>
            
            <div id="search-jump-bar" style={{"display":"none","alignItems":"center","justifyContent":"center","flexWrap":"wrap","gap":"12px","background":"transparent","padding":"0 20px"}}>
                <span style={{"color":"var(--text-secondary)","fontWeight":"500","fontSize":"0.95rem","marginRight":"8px"}}><i className="fas fa-level-down-alt" style={{"marginRight":"6px"}}></i>Jump to:</span>
                <button id="jump-to-lectures" className="text-btn jump-btn" style={{"background":"var(--bg-tertiary)","border":"1px solid var(--border-primary)","padding":"6px 14px","borderRadius":"20px","color":"var(--text-primary)","fontSize":"0.9rem","transition":"all 0.2s","display":"none","cursor":"pointer"}}>Lectures</button>
                <button id="jump-to-notes" className="text-btn jump-btn" style={{"background":"var(--bg-tertiary)","border":"1px solid var(--border-primary)","padding":"6px 14px","borderRadius":"20px","color":"var(--text-primary)","fontSize":"0.9rem","transition":"all 0.2s","display":"none","cursor":"pointer"}}>Notes</button>
                <button id="jump-to-dpps" className="text-btn jump-btn" style={{"background":"var(--bg-tertiary)","border":"1px solid var(--border-primary)","padding":"6px 14px","borderRadius":"20px","color":"var(--text-primary)","fontSize":"0.9rem","transition":"all 0.2s","display":"none","cursor":"pointer"}}>DPPs / Assignments</button>
                <button id="jump-to-chapters" className="text-btn jump-btn" style={{"background":"var(--bg-tertiary)","border":"1px solid var(--border-primary)","padding":"6px 14px","borderRadius":"20px","color":"var(--text-primary)","fontSize":"0.9rem","transition":"all 0.2s","display":"none","cursor":"pointer"}}>Chapters</button>
                <button id="jump-to-subjects" className="text-btn jump-btn" style={{"background":"var(--bg-tertiary)","border":"1px solid var(--border-primary)","padding":"6px 14px","borderRadius":"20px","color":"var(--text-primary)","fontSize":"0.9rem","transition":"all 0.2s","display":"none","cursor":"pointer"}}>Subjects</button>
            </div>
        </div>
        
        <div style={{"padding":"24px","maxWidth":"1200px","margin":"0 auto","width":"100%","boxSizing":"border-box"}}>
            
            <div id="search-results-lectures-section" style={{"marginBottom":"40px","display":"none","scrollMarginTop":"140px"}}>
                <h2 style={{"fontSize":"1.25rem","marginBottom":"16px","color":"var(--text-secondary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"8px","fontWeight":"500"}}>Matching Lectures</h2>
                <div id="search-results-lectures-list" style={{"display":"flex","flexDirection":"column","gap":"12px"}}></div>
            </div>

            <div id="search-results-notes-section" style={{"marginBottom":"40px","display":"none","scrollMarginTop":"140px"}}>
                <h2 id="notes-section-title" style={{"fontSize":"1.25rem","marginBottom":"16px","color":"var(--text-secondary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"8px","fontWeight":"500"}}>Matching Notes</h2>
                <div id="search-results-notes-grid" className="course-grid" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(280px, 1fr))","gap":"20px"}}></div>
            </div>

            <div id="search-results-dpps-section" style={{"marginBottom":"40px","display":"none","scrollMarginTop":"140px"}}>
                <h2 id="dpps-section-title" style={{"fontSize":"1.25rem","marginBottom":"16px","color":"var(--text-secondary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"8px","fontWeight":"500"}}>Matching DPPs & Assignments</h2>
                <div id="search-results-dpps-grid" className="course-grid" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(280px, 1fr))","gap":"20px"}}></div>
            </div>

            <div id="search-results-chapters-section" style={{"marginBottom":"40px","display":"none","scrollMarginTop":"140px"}}>
                <h2 id="chapter-section-title" style={{"fontSize":"1.25rem","marginBottom":"16px","color":"var(--text-secondary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"8px","fontWeight":"500"}}>Chapters / Topics</h2>
                <div id="search-results-chapters-grid" className="course-grid" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(280px, 1fr))","gap":"20px"}}></div>
            </div>

            <div id="search-results-subjects-section" style={{"marginBottom":"40px","display":"none","scrollMarginTop":"140px"}}>
                <h2 id="subject-section-title" style={{"fontSize":"1.25rem","marginBottom":"16px","color":"var(--text-secondary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"8px","fontWeight":"500"}}>Matching Subjects</h2>
                <div id="search-results-subjects-grid" className="course-grid" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(280px, 1fr))","gap":"20px"}}></div>
            </div>
            
            <div id="search-results-faculty-section" style={{"marginBottom":"40px","display":"none"}}>
                <h2 id="faculty-section-title" style={{"fontSize":"1.25rem","marginBottom":"16px","color":"var(--text-secondary)","borderBottom":"1px solid var(--border-secondary)","paddingBottom":"8px","fontWeight":"500"}}>Other Subjects taught by Faculty</h2>
                <div id="search-results-faculty-grid" className="course-grid" style={{"display":"grid","gridTemplateColumns":"repeat(auto-fill, minmax(280px, 1fr))","gap":"20px"}}></div>
            </div>
            
            <div id="search-no-results" style={{"display":"none","textAlign":"center","padding":"40px","color":"var(--text-secondary)"}}>
                <i className="fas fa-search" style={{"fontSize":"3rem","marginBottom":"16px","opacity":"0.5"}}></i>
                <h2 style={{"fontSize":"1.5rem","marginBottom":"8px"}}>No results found</h2>
                <p>Try adjusting your search query.</p>
            </div>
        </div>
    </div>
  );
}
