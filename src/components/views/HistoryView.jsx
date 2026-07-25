import React, { useState, useEffect, useRef } from 'react';

export default function HistoryView() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'calendar'
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const unlockedRef = useRef(false);
  const dateStrRef = useRef('');

  function dateToStr(d) {
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return yr + '-' + mo + '-' + dy;
  }

  function isFuture(dateStr) {
    return dateStr > dateToStr(new Date());
  }

  function checkDateUnlocked(dStr) {
    if (!dStr) return true;
    if (!isFuture(dStr)) return true; // Auto-unlocked after midnight when date becomes today/past
    try {
      const unlockedDates = JSON.parse(localStorage.getItem('cal_unlocked_dates') || '[]');
      return unlockedDates.includes(dStr);
    } catch {
      return false;
    }
  }

  function unlockCurrentDate(dStr) {
    if (!dStr) return;
    try {
      const unlockedDates = JSON.parse(localStorage.getItem('cal_unlocked_dates') || '[]');
      if (!unlockedDates.includes(dStr)) {
        unlockedDates.push(dStr);
        localStorage.setItem('cal_unlocked_dates', JSON.stringify(unlockedDates));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function navigate(delta) {
    const base = dateStrRef.current || dateToStr(new Date());
    const d = new Date(base + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    const newDate = dateToStr(d);
    dateStrRef.current = newDate;
    setCurrentDateStr(newDate);
    const isUnl = checkDateUnlocked(newDate);
    setIsUnlocked(isUnl);
    unlockedRef.current = isUnl;
    if (window.renderCalendarDay) window.renderCalendarDay(newDate, isUnl);
  }

  function handleUnlock() {
    unlockCurrentDate(dateStrRef.current);
    setIsUnlocked(true);
    unlockedRef.current = true;
    if (window.renderCalendarDay) window.renderCalendarDay(dateStrRef.current, true);
  }

  function handleMakePlaylist() {
    if (window.makeCalendarPlaylist) {
      window.makeCalendarPlaylist(dateStrRef.current, unlockedRef.current);
    }
  }

  useEffect(() => {
    window.setHistoryTabCalendar = (dateStr) => {
      setActiveTab('calendar');
      if (dateStr) {
        dateStrRef.current = dateStr;
        setCurrentDateStr(dateStr);
      }
      const isUnl = checkDateUnlocked(dateStrRef.current || dateToStr(new Date()));
      setIsUnlocked(isUnl);
      unlockedRef.current = isUnl;
      setTimeout(() => {
        if (window.renderCalendarDay) {
          window.renderCalendarDay(dateStrRef.current || dateToStr(new Date()), isUnl);
        }
      }, 50);
    };
    return () => {
      delete window.setHistoryTabCalendar;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      const today = dateToStr(new Date());
      if (!dateStrRef.current) {
        dateStrRef.current = today;
      }
      setCurrentDateStr(dateStrRef.current);
      const isUnl = checkDateUnlocked(dateStrRef.current);
      setIsUnlocked(isUnl);
      unlockedRef.current = isUnl;
      setTimeout(() => {
        if (window.renderCalendarDay) {
          window.renderCalendarDay(dateStrRef.current, isUnl);
        }
      }, 50);
    } else if (activeTab === 'list') {
      setTimeout(() => {
        if (window.renderHistoryView) {
          window.renderHistoryView();
        }
      }, 50);
    }
  }, [activeTab]);

  const future = currentDateStr ? isFuture(currentDateStr) : false;

  return (
    <div id="history-view" className="view" style={{ height: '100%', overflowY: activeTab === 'list' ? 'auto' : 'hidden' }}>
      {activeTab === 'list' ? (
        <div style={{ padding: '20px', minHeight: '100%', boxSizing: 'border-box' }}>
          {/* Main Header with Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: '0' }}>Watch History (Last 30 Hours)</h2>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* View Switcher Tabs */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <button
                  className={`secondary-btn ${activeTab === 'list' ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'list' ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === 'list' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setActiveTab('list')}
                >
                  <i className="fas fa-list"></i> List View
                </button>
                <button
                  className={`secondary-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'calendar' ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === 'calendar' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setActiveTab('calendar')}
                >
                  <i className="fas fa-calendar-alt"></i> Calendar View
                </button>
              </div>

              <button id="clear-history-btn" className="secondary-btn">
                <i className="fas fa-trash"></i> Clear History
              </button>
            </div>
          </div>

          {/* LIST VIEW TAB */}
          <div id="history-table-container" style={{ background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-secondary)', marginBottom: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-secondary)' }}>
                  <th style={{ padding: '12px 16px' }}>Course</th>
                  <th style={{ padding: '12px 16px' }}>Lecture</th>
                  <th style={{ padding: '12px 16px' }}>Duration</th>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                  <th style={{ padding: '12px 16px', width: '40px' }}></th>
                </tr>
              </thead>
              <tbody id="history-table-body">
                {/* History rows injected here */}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', boxSizing: 'border-box' }}>
          {/* Main Header with Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: '0' }}>Watch History</h2>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* View Switcher Tabs */}
              <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                <button
                  className={`secondary-btn ${activeTab === 'list' ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'list' ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === 'list' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setActiveTab('list')}
                >
                  <i className="fas fa-list"></i> List View
                </button>
                <button
                  className={`secondary-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === 'calendar' ? 'var(--accent-primary)' : 'transparent',
                    color: activeTab === 'calendar' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => setActiveTab('calendar')}
                >
                  <i className="fas fa-calendar-alt"></i> Calendar View
                </button>
              </div>
            </div>
          </div>

          {/* CALENDAR VIEW TAB */}
          <div id="calendar-view" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-secondary)' }}>
            {/* === CALENDAR SUB-HEADER === */}
            <div className="cal-header">
              <div className="cal-header-left">
                <h3 className="cal-title" style={{ margin: 0 }}>
                  <i className="fas fa-calendar-day"></i> Timeline Planner
                </h3>
              </div>

              <div className="cal-nav-center">
                <button className="cal-arrow-btn" onClick={() => navigate(-1)} title="Previous day">
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div className="cal-date-display-wrapper">
                  <div id="cal-date-display" className="cal-date-text">
                    {currentDateStr ? '' : 'Loading...'}
                  </div>
                  {future && !isUnlocked && (
                    <span className="cal-future-badge">
                      <i className="fas fa-lock"></i> Future
                    </span>
                  )}
                  {isUnlocked && (
                    <span className="cal-unlocked-badge">
                      <i className="fas fa-lock-open"></i> Unlocked
                    </span>
                  )}
                </div>
                <button className="cal-arrow-btn" onClick={() => navigate(1)} title="Next day">
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>

              <div className="cal-header-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  id="cal-day-hours-studied"
                  className="info-display progress-green"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    color: '#34d399',
                    fontSize: '0.82rem',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'default'
                  }}
                  title="Hours Studied for this day"
                >
                  <i className="fas fa-history" style={{ color: '#34d399', marginRight: '6px' }}></i>
                  <span>0h Studied</span>
                </div>

                {(!future || isUnlocked) && (
                  <button
                    id="cal-make-playlist-btn"
                    className="cal-playlist-btn"
                    onClick={handleMakePlaylist}
                    title="Create a Calendar Event Playlist from this day"
                  >
                    <i className="fas fa-play-circle"></i>
                    Make Playlist
                  </button>
                )}
              </div>
            </div>

            {/* === CALENDAR BODY === */}
            <div className="cal-body">
              {/* Lock overlay for future days */}
              {future && !isUnlocked && (
                <div id="cal-lock-overlay" className="cal-lock-overlay">
                  <div className="cal-lock-content">
                    <div className="cal-lock-icon">
                      <i className="fas fa-lock"></i>
                    </div>
                    <h3 className="cal-lock-title">Future Day</h3>
                    <p className="cal-lock-subtitle">
                      This day has not arrived yet. Unlock it to plan your study schedule in advance.
                    </p>
                    <button className="cal-unlock-btn" onClick={handleUnlock}>
                      <i className="fas fa-lock-open"></i> Unlock to Plan
                    </button>
                  </div>
                </div>
              )}

              {/* 24-hour timeline — slots injected by legacy.js */}
              <div id="cal-timeline" className="cal-timeline"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
