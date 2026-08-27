import React, { useState, useEffect, memo } from 'react';

const HistoryView = memo(function HistoryView() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'calendar'

  useEffect(() => {
    if (activeTab === 'calendar') {
      if (typeof window.openCalendarView === 'function') {
        window.openCalendarView();
      }
    }
  }, [activeTab]);

  return (
    <div id="history-view" className="view">
        <div className="view-header" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"10px 24px","borderBottom":"1px solid var(--border-secondary)","flexWrap":"wrap","gap":"10px"}}>
            <div style={{"display":"flex","alignItems":"center","gap":"12px"}}>
                <div className="history-tab-controls" style={{"display":"flex","background":"var(--bg-secondary)","padding":"3px","borderRadius":"8px","border":"1px solid var(--border-secondary)"}}>
                    <button 
                      id="history-tab-list-btn" 
                      className={`tab-toggle-btn ${activeTab === 'list' ? 'active' : ''}`}
                      onClick={() => setActiveTab('list')}
                      style={{"padding":"6px 14px","border":"none","background":activeTab === 'list' ? 'var(--accent-primary)' : 'transparent',"color":activeTab === 'list' ? '#fff' : 'var(--text-secondary)',"borderRadius":"6px","cursor":"pointer","fontWeight":"600","fontSize":"0.85rem","display":"flex","alignItems":"center","gap":"6px"}}
                    >
                        <i className="fas fa-list"></i> Detailed List
                    </button>
                    <button 
                      id="history-tab-calendar-btn" 
                      className={`tab-toggle-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                      onClick={() => setActiveTab('calendar')}
                      style={{"padding":"6px 14px","border":"none","background":activeTab === 'calendar' ? 'var(--accent-primary)' : 'transparent',"color":activeTab === 'calendar' ? '#fff' : 'var(--text-secondary)',"borderRadius":"6px","cursor":"pointer","fontWeight":"600","fontSize":"0.85rem","display":"flex","alignItems":"center","gap":"6px"}}
                    >
                        <i className="fas fa-calendar-alt"></i> Calendar / Planner
                    </button>
                </div>
            </div>
            {activeTab === 'list' && (
                <div style={{"display":"flex","gap":"10px","alignItems":"center"}}>
                    <button id="clear-history-btn" className="secondary-btn"><i className="fas fa-trash"></i> Clear All History</button>
                </div>
            )}
        </div>

        {/* List View Container */}
        <div id="history-list-section" style={{"display": activeTab === 'list' ? 'block' : 'none', "height":"calc(100% - 65px)","overflowY":"auto"}}>
            <div className="history-table-container">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th>Date &amp; Time</th>
                            <th>Course</th>
                            <th>Lecture</th>
                            <th>Duration</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="history-table-body">
                        {/* Populated by JS */}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Calendar / Planner View Container */}
        <div id="history-calendar-section" style={{"display": activeTab === 'calendar' ? 'block' : 'none', "height":"calc(100% - 65px)","overflowY":"hidden"}}>
            <div id="calendar-view" style={{"height":"100%","display":"flex","flexDirection":"column"}}>
                <div className="calendar-header" style={{"display":"flex","alignItems":"center","justifyContent":"space-between","padding":"8px 24px","background":"var(--bg-secondary)","borderBottom":"1px solid var(--border-secondary)","flexShrink":0}}>
                    <div style={{"display":"flex","alignItems":"center","gap":"12px"}}>
                        <button id="cal-prev-week-btn" className="control-btn" style={{"background":"none","border":"none","color":"var(--text-primary)","cursor":"pointer"}}><i className="fas fa-chevron-left"></i></button>
                        <h3 id="cal-week-range" style={{"margin":"0","fontSize":"1.1rem","color":"var(--text-primary)"}}>This Week</h3>
                        <button id="cal-next-week-btn" className="control-btn" style={{"background":"none","border":"none","color":"var(--text-primary)","cursor":"pointer"}}><i className="fas fa-chevron-right"></i></button>
                        <button id="cal-today-btn" className="secondary-btn" style={{"padding":"4px 10px","fontSize":"0.8rem"}}>Today</button>
                        <button id="cal-undo-btn" className="secondary-btn" style={{"padding":"4px 10px","fontSize":"0.8rem","display":"none"}} title="Undo last action (Ctrl+Z)"><i className="fas fa-undo"></i> Undo</button>
                    </div>
                    <div style={{"display":"flex","gap":"8px"}}>
                        <button id="cal-add-event-btn" className="primary-btn" style={{"padding":"6px 12px","fontSize":"0.85rem"}}><i className="fas fa-plus"></i> Add Event</button>
                    </div>
                </div>
                <div className="calendar-grid-container" style={{"flex":"1","overflowY":"auto","padding":"16px 24px","display":"flex","flexDirection":"column","gap":"12px"}}>
                    <div id="calendar-days-row" style={{"display":"grid","gridTemplateColumns":"repeat(7, 1fr)","gap":"8px","minHeight":"100%"}}>
                        {/* Populated dynamically */}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
});

export default HistoryView;
