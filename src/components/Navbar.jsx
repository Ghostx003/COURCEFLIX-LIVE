import React from 'react';
export default function Navbar() {
  return (
    <nav>
        <h1 id="home-btn">CourseFlix</h1>
        <div className="nav-links">
            <a href="#" className="nav-link" data-view="dashboard-view">Dashboard</a>
            <a href="#" className="nav-link" data-view="upload-view">Upload</a>
            <a href="#" className="nav-link" data-view="review-view">Review</a>
            <a href="#" className="nav-link" data-view="practice-view">Practice</a>
            <a href="#" className="nav-link" data-view="dpp-view">DPP</a>
            <a href="#" className="nav-link" data-view="notes-view">Notes</a>
            <a href="#" className="nav-link" data-view="intell-view"><i className="fas fa-brain" style={{"marginRight":"4px"}}></i> Intell</a>
            <a href="#" className="nav-link" data-view="doubts-view"><i className="fas fa-question-circle" style={{"marginRight":"4px"}}></i> Doubts</a>
            <a href="#" className="nav-link" data-view="continue-view"><i className="fas fa-play-circle" style={{"marginRight":"4px"}}></i> Continue</a>
            <a href="#" className="nav-link" data-view="history-view"><i className="fas fa-history" style={{"marginRight":"4px"}}></i> History</a>
            <a href="#" className="nav-link" data-view="faculty-view"><i className="fas fa-chalkboard-teacher" style={{"marginRight":"4px"}}></i> Faculty</a>
            <a href="#" className="nav-link" data-view="goals-view"><i className="fas fa-bullseye" style={{"marginRight":"4px"}}></i> Goals</a>
            <a href="#" className="nav-link" data-view="plan-view" style={{"backgroundColor":"#6d28d9","color":"white","marginLeft":"8px"}}><i className="fas fa-calendar-alt" style={{"marginRight":"4px"}}></i> Planner</a>
            <a href="#" className="nav-link" data-view="progress-view" style={{"backgroundColor":"#1d4ed8","color":"white","marginLeft":"4px"}}><i className="fas fa-chart-line" style={{"marginRight":"4px"}}></i> Performance</a>
            <button id="theme-toggle-btn" className="nav-link" style={{"background":"none","border":"none","cursor":"pointer","display":"flex","alignItems":"center","padding":"8px"}} title="Toggle Pure Black Theme"><i className="fas fa-moon"></i></button>
        </div>
        <div id="total-time-left-display" className="info-display"></div>
        <button id="add-course-btn" className="primary-btn"><i className="fas fa-plus"></i> Add Course</button>
    </nav>
  );
}
