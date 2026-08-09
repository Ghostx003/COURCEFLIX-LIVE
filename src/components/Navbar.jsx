import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function Navbar() {
  const [targetDate, setTargetDate] = useState(() => localStorage.getItem('dDayDate') || '');
  const [dDayMode, setDDayMode] = useState('days'); // 'days' or 'detailed'
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0 });
  const [isDDayPopoverOpen, setIsDDayPopoverOpen] = useState(false);
  const [hideIgnored, setHideIgnored] = useState(() => localStorage.getItem('courseflix_hide_ignored') === 'true');
  const [activeView, setActiveView] = useState(() => window.location.hash.replace('#', '') || 'home-view');
  const [doubtsCount, setDoubtsCount] = useState(0);
  const [focusedToggle, setFocusedToggle] = useState(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (toggleRef.current && !toggleRef.current.contains(event.target)) {
        setFocusedToggle(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const updateDoubtsCount = () => {
      try {
        const doubts = JSON.parse(localStorage.getItem('doubtsDashboard') || '[]');
        setDoubtsCount(doubts.length);
      } catch (e) {
        setDoubtsCount(0);
      }
    };
    updateDoubtsCount();
    
    const handleStorage = (e) => {
      if (e.key === 'doubtsDashboard') updateDoubtsCount();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('doubtsUpdated', updateDoubtsCount);
    return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('doubtsUpdated', updateDoubtsCount);
    };
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const current = window.location.hash.replace('#', '') || 'home-view';
      setActiveView(current);
      const navEl = document.querySelector('nav');
      if (navEl) {
        if (current === 'player-view' || current.startsWith('player')) {
          navEl.classList.add('hidden');
        } else {
          navEl.classList.remove('hidden');
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleToggleMode = (targetView) => {
    setActiveView(targetView);
    setFocusedToggle(targetView);
    if (typeof window.switchView === 'function') {
      window.switchView(targetView);
    } else {
      window.location.hash = `#${targetView}`;
    }
  };

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

  const handleToggleHideIgnored = useCallback(() => {
    setHideIgnored(prev => {
      const next = !prev;
      localStorage.setItem('courseflix_hide_ignored', String(next));
      window.dispatchEvent(new CustomEvent('courseflix-hide-ignored-changed', { detail: { hideIgnored: next } }));
      return next;
    });
  }, []);

  return (
    <nav>
        <h1 id="home-btn" data-view="home-view" onClick={() => window.switchView ? window.switchView('home-view') : (window.location.hash = '#home-view')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/favicon.jpg" alt="CourseFlix Logo" style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'contain' }} /> 
            <span className="brand-text-course" style={{ fontSize: '1.35rem' }}>Course<span className="brand-text-flix">Flix</span></span>
        </h1>
        <div className="nav-links">
            <a href="#dashboard-view" className="nav-link" data-view="dashboard-view" onClick={(e) => { e.preventDefault(); handleToggleMode('dashboard-view'); }}><i className="fas fa-th-large" style={{"marginRight":"4px","fontSize":"0.78rem"}}></i>Dashboard</a>
            <a href="#upload-view" className="nav-link" data-view="upload-view" onClick={(e) => { e.preventDefault(); handleToggleMode('upload-view'); }}><i className="fas fa-cloud-upload-alt" style={{"marginRight":"4px","fontSize":"0.78rem"}}></i>Upload</a>
            <div 
                ref={toggleRef}
                className="nav-mode-toggle-switch"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid var(--border-secondary)',
                    borderRadius: '24px',
                    padding: '2px',
                    position: 'relative',
                    userSelect: 'none',
                    margin: '0 2px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    flexShrink: 0
                }}
            >
                <div 
                    style={{
                        position: 'absolute',
                        top: '2px',
                        bottom: '2px',
                        width: 'calc(50% - 2px)',
                        left: focusedToggle === 'practice-view' ? 'calc(50%)' : '2px',
                        borderRadius: '20px',
                        background: focusedToggle === 'practice-view'
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(29, 78, 216, 0.45) 100%)' 
                            : focusedToggle === 'review-view'
                                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.45) 100%)'
                                : 'transparent',
                        border: focusedToggle === 'practice-view'
                            ? '1px solid rgba(59, 130, 246, 0.6)' 
                            : focusedToggle === 'review-view'
                                ? '1px solid rgba(245, 158, 11, 0.6)'
                                : '1px solid transparent',
                        boxShadow: focusedToggle === 'practice-view'
                            ? '0 0 10px rgba(59, 130, 246, 0.35)' 
                            : focusedToggle === 'review-view'
                                ? '0 0 10px rgba(245, 158, 11, 0.35)'
                                : 'none',
                        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        opacity: focusedToggle ? 1 : 0
                    }}
                />
                <button
                    type="button"
                    onClick={() => handleToggleMode('review-view')}
                    title="Switch to Review Mode"
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'none',
                        border: 'none',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        color: focusedToggle === 'review-view' ? '#fbbf24' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'color 0.25s ease'
                    }}
                >
                    <i className="fas fa-redo-alt" style={{ fontSize: '0.72rem', transform: focusedToggle === 'review-view' ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s ease' }}></i>
                    Review
                </button>
                <button
                    type="button"
                    onClick={() => handleToggleMode('practice-view')}
                    title="Switch to Practice Mode"
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'none',
                        border: 'none',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        color: focusedToggle === 'practice-view' ? '#60a5fa' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'color 0.25s ease'
                    }}
                >
                    <i className="fas fa-tasks" style={{ fontSize: '0.72rem', transform: focusedToggle === 'practice-view' ? 'scale(1.15)' : 'none', transition: 'transform 0.3s ease' }}></i>
                    Practice
                </button>
            </div>
            <a href="#dpp-view" className="nav-link" data-view="dpp-view" onClick={(e) => { e.preventDefault(); handleToggleMode('dpp-view'); }}><i className="fas fa-file-alt" style={{"marginRight":"4px","fontSize":"0.78rem"}}></i>DPP</a>
            <a href="#notes-view" className="nav-link" data-view="notes-view" onClick={(e) => { e.preventDefault(); handleToggleMode('notes-view'); }}><i className="fas fa-sticky-note" style={{"marginRight":"4px","fontSize":"0.78rem"}}></i>Notes</a>
            <a href="#doubts-view" className="nav-link" data-view="doubts-view" onClick={(e) => { e.preventDefault(); handleToggleMode('doubts-view'); }}>
                {doubtsCount > 0 ? (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f59e0b',
                        color: 'black',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        marginRight: '6px'
                    }}>
                        {doubtsCount}
                    </span>
                ) : (
                    <i className="fas fa-question-circle" style={{"marginRight":"4px","color":"#f59e0b"}}></i>
                )}
                 Doubts
            </a>
            <a href="#continue-view" className="nav-link" data-view="continue-view" onClick={(e) => { e.preventDefault(); handleToggleMode('continue-view'); }}><i className="fas fa-play-circle" style={{"marginRight":"4px","color":"#06b6d4"}}></i> Continue</a>
            <a href="#history-view" className="nav-link" data-view="history-view" onClick={(e) => { e.preventDefault(); handleToggleMode('history-view'); }}><i className="fas fa-history" style={{"marginRight":"4px"}}></i> History</a>
            <a href="#faculty-view" className="nav-link" data-view="faculty-view" onClick={(e) => { e.preventDefault(); handleToggleMode('faculty-view'); }}><i className="fas fa-chalkboard-teacher" style={{"marginRight":"4px"}}></i> Faculty</a>
            <a href="#goals-view" className="nav-link" data-view="goals-view" onClick={(e) => { e.preventDefault(); handleToggleMode('goals-view'); }}><i className="fas fa-bullseye" style={{"marginRight":"4px"}}></i> Goals</a>
            <button 
                id="completion-feature-btn" 
                className="nav-link completion-btn"
                onClick={() => window.dispatchEvent(new CustomEvent('open-completion-modal'))}
                style={{"background":"var(--brand-gradient, linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%))","color":"white","marginLeft":"3px","padding":"4px 10px","fontSize":"0.76rem","display":"inline-flex","alignItems":"center","borderRadius":"20px","boxShadow":"0 4px 12px var(--accent-glow)","border":"1px solid rgba(255,255,255,0.2)","cursor":"pointer"}}
                title="Open Completion Planner & Target Tracker"
            >
                <i className="fas fa-chart-pie" style={{"marginRight":"4px"}}></i> Completion
            </button>
            <a href="https://testflix-pro.vercel.app/app/test-dashboard" target="_blank" rel="noopener noreferrer" className="nav-link" style={{"background":"linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)","color":"white","marginLeft":"3px","padding":"4px 10px","fontSize":"0.76rem","display":"inline-flex","alignItems":"center","borderRadius":"20px","boxShadow":"0 4px 12px rgba(225, 29, 72, 0.3)","border":"1px solid rgba(255,255,255,0.2)"}}><i className="fas fa-flask" style={{"marginRight":"4px"}}></i> Testflix</a>
            <a href="#plan-view" className="nav-link" data-view="plan-view" onClick={(e) => { e.preventDefault(); handleToggleMode('plan-view'); }} style={{"background":"linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)","color":"white","marginLeft":"3px","padding":"4px 10px","fontSize":"0.76rem","display":"inline-flex","alignItems":"center","borderRadius":"20px","boxShadow":"0 4px 12px rgba(109, 40, 217, 0.3)","border":"1px solid rgba(255,255,255,0.2)"}}><i className="fas fa-calendar-alt" style={{"marginRight":"4px"}}></i> Planner</a>
            <a href="#progress-view" className="nav-link" data-view="progress-view" onClick={(e) => { e.preventDefault(); handleToggleMode('progress-view'); }} style={{"background":"linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)","color":"white","marginLeft":"3px","padding":"4px 10px","fontSize":"0.76rem","display":"inline-flex","alignItems":"center","borderRadius":"20px","boxShadow":"0 4px 12px rgba(29, 78, 216, 0.3)","border":"1px solid rgba(255,255,255,0.2)"}}><i className="fas fa-chart-line" style={{"marginRight":"4px"}}></i> Performance</a>
            <button id="theme-toggle-btn" className="nav-link" style={{"background":"var(--bg-tertiary)","border":"1px solid var(--border-secondary)","cursor":"pointer","display":"flex","alignItems":"center","justifyContent":"center","width":"30px","height":"30px","borderRadius":"50%","padding":"0","marginLeft":"3px"}} title="Toggle Pure Black Theme"><i className="fas fa-moon"></i></button>
            <button
                id="hide-ignored-btn"
                className="nav-link"
                onClick={handleToggleHideIgnored}
                title={hideIgnored ? 'Ignored items hidden — click to show' : 'Click to hide ignored courses & sub-courses'}
                style={{
                    background: hideIgnored ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'var(--bg-tertiary)',
                    border: hideIgnored ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-secondary)',
                    color: hideIgnored ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    padding: '0',
                    marginLeft: '3px',
                    transition: 'all 0.25s ease',
                    boxShadow: hideIgnored ? '0 4px 12px rgba(239,68,68,0.5)' : 'none',
                    flexShrink: 0,
                }}
            >
                <i className={`fas ${hideIgnored ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
            <button 
                id="nav-open-settings-btn"
                className="nav-link"
                onClick={() => {
                    if (typeof window.openSettingsModal === 'function') {
                        window.openSettingsModal();
                    } else {
                        window.dispatchEvent(new CustomEvent('open-settings-modal'));
                    }
                }}
                style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    padding: '0',
                    marginLeft: '3px'
                }}
                title="Open Settings & Color Palettes"
            >
                <i className="fas fa-gear"></i>
            </button>
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
                            ? `${timeLeft.days}` 
                            : `${timeLeft.days}d ${timeLeft.hours}h`
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
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', padding: '10px 12px', borderRadius: '10px', background: 'var(--brand-gradient, linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%))' }}
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
        <button id="add-course-btn" className="primary-btn" style={{"padding":"0", "width":"30px", "height":"30px", "borderRadius":"50%", "display":"inline-flex", "alignItems":"center", "justifyContent":"center", "fontSize":"0.85rem", "flexShrink":"0"}} title="Add Course / Sub-Course"><i className="fas fa-plus"></i></button>
    </nav>
  );
}
