import React, { useState, useEffect } from 'react';

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
            <a href="https://testflix-pro.vercel.app/app/test-dashboard" target="_blank" rel="noopener noreferrer" className="nav-link" style={{"backgroundColor":"#e11d48","color":"white","marginLeft":"8px","padding":"4px 8px","fontSize":"0.85rem","display":"inline-flex","alignItems":"center"}}><i className="fas fa-flask" style={{"marginRight":"4px"}}></i> Testflix</a>
            <a href="#" className="nav-link" data-view="plan-view" style={{"backgroundColor":"#6d28d9","color":"white","marginLeft":"4px","padding":"4px 8px","fontSize":"0.85rem","display":"inline-flex","alignItems":"center"}}><i className="fas fa-calendar-alt" style={{"marginRight":"4px"}}></i> Planner</a>
            <a href="#" className="nav-link" data-view="progress-view" style={{"backgroundColor":"#1d4ed8","color":"white","marginLeft":"4px","padding":"4px 8px","fontSize":"0.85rem","display":"inline-flex","alignItems":"center"}}><i className="fas fa-chart-line" style={{"marginRight":"4px"}}></i> Performance</a>
            <button id="theme-toggle-btn" className="nav-link" style={{"background":"none","border":"none","cursor":"pointer","display":"flex","alignItems":"center","padding":"8px"}} title="Toggle Pure Black Theme"><i className="fas fa-moon"></i></button>
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
            
            {isDDayPopoverOpen && (
                <div 
                    className="modal-overlay" 
                    onClick={() => setIsDDayPopoverOpen(false)}
                    style={{ zIndex: 99999 }}
                >
                    <div 
                        className="modal-content" 
                        onClick={(e) => e.stopPropagation()} 
                        style={{ maxWidth: '380px', padding: '1.8rem', color: 'var(--text-primary)' }}
                    >
                        <button 
                            className="close-modal-btn" 
                            onClick={() => setIsDDayPopoverOpen(false)}
                            title="Close"
                        >&times;</button>
                        
                        <h3 style={{ margin: '0 0 1rem 0', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
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
                                        borderRadius: '8px',
                                        padding: '10px 12px',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {targetDate && (
                                <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', fontWeight: '600' }}>
                                        Formatted Target Date
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                        {(() => {
                                            const parts = targetDate.split('-');
                                            if (parts.length === 3) {
                                                const [y, m, d] = parts;
                                                return `${d}/${m}/${y}`; // Day/Month/Year format
                                            }
                                            return targetDate;
                                        })()}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '6px', fontWeight: '600' }}>
                                        {timeLeft.days} days {timeLeft.hours} hours remaining
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
                                <button 
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => setDDayMode(prev => prev === 'days' ? 'detailed' : 'days')}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', padding: '10px' }}
                                >
                                    Mode: {dDayMode === 'days' ? 'Days Only' : 'Days & Hours'}
                                </button>

                                <button 
                                    type="button"
                                    className="primary-btn"
                                    onClick={() => setIsDDayPopoverOpen(false)}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', padding: '10px' }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div id="total-time-left-display" className="info-display"></div>
        <button id="add-course-btn" className="primary-btn" style={{"padding":"6px 12px", "fontSize":"0.9rem"}}><i className="fas fa-plus"></i> Add Course</button>
    </nav>
  );
}
