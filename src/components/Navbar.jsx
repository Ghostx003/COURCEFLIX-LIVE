import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Navbar() {
  const [targetDate, setTargetDate] = useState(() => localStorage.getItem('dDayDate') || '');
  const [dDayMode, setDDayMode] = useState('days'); // 'days' or 'detailed'
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0 });
  const [isDDayPopoverOpen, setIsDDayPopoverOpen] = useState(false);

  useEffect(() => {
    if (targetDate) {
      localStorage.setItem('dDayDate', targetDate);
    }
  }, [targetDate]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!targetDate) return;
      const target = new Date(targetDate);
      target.setHours(0, 0, 0, 0); // focus on full days difference
      const now = new Date();
      const difference = target.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        setTimeLeft({ days, hours });
      } else {
        setTimeLeft({ days: 0, hours: 0 });
      }
    };

    calculateTimeLeft();
    // Update every minute to be safe and accurate for hours
    const timer = setInterval(calculateTimeLeft, 1000 * 60); 
    return () => clearInterval(timer);
  }, [targetDate]);

  const handleDDayClick = () => {
    setDDayMode(prev => prev === 'days' ? 'detailed' : 'days');
  };

  return (
    <nav>
        <h1 id="home-btn">
            <i className="fas fa-play" style={{"fontSize":"0.95rem","color":"#10b981","filter":"drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))"}}></i> 
            <span>CourseFlix</span>
        </h1>
        <div className="nav-links">
            <a href="#" className="nav-link" data-view="dashboard-view"><i className="fas fa-th-large" style={{"marginRight":"6px","fontSize":"0.85rem"}}></i>Dashboard</a>
            <a href="#" className="nav-link" data-view="upload-view"><i className="fas fa-cloud-upload-alt" style={{"marginRight":"6px","fontSize":"0.85rem"}}></i>Upload</a>
            <a href="#" className="nav-link" data-view="review-view"><i className="fas fa-redo-alt" style={{"marginRight":"6px","fontSize":"0.85rem"}}></i>Review</a>
            <a href="#" className="nav-link" data-view="practice-view"><i className="fas fa-tasks" style={{"marginRight":"6px","fontSize":"0.85rem"}}></i>Practice</a>
            <a href="#" className="nav-link" data-view="dpp-view"><i className="fas fa-file-alt" style={{"marginRight":"6px","fontSize":"0.85rem"}}></i>DPP</a>
            <a href="#" className="nav-link" data-view="notes-view"><i className="fas fa-sticky-note" style={{"marginRight":"6px","fontSize":"0.85rem"}}></i>Notes</a>
            <a href="#" className="nav-link" data-view="intell-view"><i className="fas fa-brain" style={{"marginRight":"6px","color":"#a855f7"}}></i> Intell</a>
            <a href="#" className="nav-link" data-view="doubts-view"><i className="fas fa-question-circle" style={{"marginRight":"6px","color":"#f59e0b"}}></i> Doubts</a>
            <a href="#" className="nav-link" data-view="continue-view"><i className="fas fa-play-circle" style={{"marginRight":"6px","color":"#06b6d4"}}></i> Continue</a>
            <a href="#" className="nav-link" data-view="history-view"><i className="fas fa-history" style={{"marginRight":"6px"}}></i> History</a>
            <a href="#" className="nav-link" data-view="faculty-view"><i className="fas fa-chalkboard-teacher" style={{"marginRight":"6px"}}></i> Faculty</a>
            <a href="#" className="nav-link" data-view="goals-view"><i className="fas fa-bullseye" style={{"marginRight":"6px"}}></i> Goals</a>
            <a href="https://testflix-pro.vercel.app/app/test-dashboard" target="_blank" rel="noopener noreferrer" className="nav-link" style={{"background":"linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)","color":"white","marginLeft":"6px","padding":"5px 12px","fontSize":"0.82rem","display":"inline-flex","alignItems":"center","borderRadius":"20px","boxShadow":"0 4px 12px rgba(225, 29, 72, 0.3)","border":"1px solid rgba(255,255,255,0.2)"}}><i className="fas fa-flask" style={{"marginRight":"5px"}}></i> Testflix</a>
            <a href="#" className="nav-link" data-view="plan-view" style={{"background":"linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)","color":"white","marginLeft":"4px","padding":"5px 12px","fontSize":"0.82rem","display":"inline-flex","alignItems":"center","borderRadius":"20px","boxShadow":"0 4px 12px rgba(109, 40, 217, 0.3)","border":"1px solid rgba(255,255,255,0.2)"}}><i className="fas fa-calendar-alt" style={{"marginRight":"5px"}}></i> Planner</a>
            <a href="#" className="nav-link" data-view="progress-view" style={{"background":"linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)","color":"white","marginLeft":"4px","padding":"5px 12px","fontSize":"0.82rem","display":"inline-flex","alignItems":"center","borderRadius":"20px","boxShadow":"0 4px 12px rgba(29, 78, 216, 0.3)","border":"1px solid rgba(255,255,255,0.2)"}}><i className="fas fa-chart-line" style={{"marginRight":"5px"}}></i> Performance</a>
            <button id="theme-toggle-btn" className="nav-link" style={{"background":"var(--bg-tertiary)","border":"1px solid var(--border-secondary)","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","width":"34px","height":"34px","borderRadius":"50%","padding":"0","marginLeft":"4px"}} title="Toggle Pure Black Theme"><i className="fas fa-moon"></i></button>
        </div>
        
        <div>
            <div 
                className="info-display"
                onClick={() => setIsDDayPopoverOpen(true)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                title="Click to open D-Day box"
            >
                <i className="fas fa-flag-checkered" style={{color: 'var(--accent-primary)'}}></i>
                <span>
                    {targetDate ? (
                        dDayMode === 'days' 
                            ? `${timeLeft.days} days left` 
                            : `${timeLeft.days}d ${timeLeft.hours}h left`
                    ) : 'Set D-Day'}
                </span>
            </div>
            
            {isDDayPopoverOpen && createPortal(
                <div 
                    className="modal-overlay"
                    onClick={() => setIsDDayPopoverOpen(false)}
                >
                    <div 
                        className="modal-content"
                        style={{ 
                            maxWidth: '400px',
                            padding: '1.8rem',
                            color: 'var(--text-primary)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            className="close-modal-btn" 
                            onClick={() => setIsDDayPopoverOpen(false)}
                            style={{ top: '1.2rem', right: '1.2rem', width: '32px', height: '32px', fontSize: '1.2rem', color: 'var(--text-secondary)' }}
                            title="Close"
                        >&times;</button>
                        
                        <h3 style={{ margin: '0 0 1.2rem 0', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: '700' }}>
                            <i className="fas fa-flag-checkered"></i> D-Day Target Date
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: '600' }}>
                                    Select Date (DD/MM/YYYY)
                                </label>
                                <input 
                                    type="date" 
                                    value={targetDate} 
                                    onChange={(e) => setTargetDate(e.target.value)} 
                                    style={{
                                        width: '100%',
                                        background: 'var(--bg-tertiary)', 
                                        color: 'var(--text-primary)', 
                                        border: '1px solid var(--border-secondary)', 
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        fontSize: '0.95rem',
                                        fontWeight: '600',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {targetDate && (
                                <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', fontWeight: '700' }}>
                                        Formatted Target Date
                                    </div>
                                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                                        {(() => {
                                            const parts = targetDate.split('-');
                                            if (parts.length === 3) {
                                                const [y, m, d] = parts;
                                                return `${d}/${m}/${y}`;
                                            }
                                            return targetDate;
                                        })()}
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginTop: '6px', fontWeight: '700' }}>
                                        {timeLeft.days} days {timeLeft.hours} hours remaining
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '0.4rem' }}>
                                <button 
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => setDDayMode(prev => prev === 'days' ? 'detailed' : 'days')}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', padding: '10px 12px', borderRadius: '10px' }}
                                >
                                    Mode: {dDayMode === 'days' ? 'Days Only' : 'Days & Hours'}
                                </button>

                                <button 
                                    type="button"
                                    className="primary-btn"
                                    onClick={() => setIsDDayPopoverOpen(false)}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', padding: '10px 12px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>

        <div id="total-time-left-display" className="info-display"></div>
        <button id="add-course-btn" className="primary-btn" style={{"padding":"6px 12px", "fontSize":"0.9rem"}}><i className="fas fa-plus"></i> Add Course</button>
    </nav>
  );
}
