import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function FloatingTimer() {
  const [isVisible, setIsVisible] = useState(false);
  const [inLecture, setInLecture] = useState(false);
  
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('floatingTimerPos');
    return saved ? JSON.parse(saved) : { top: 20, left: window.innerWidth - 220 };
  });
  
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem('floatingTimerSize');
    return saved ? JSON.parse(saved) : { width: 220, height: 180 };
  });

  // Timer States
  const [mode, setMode] = useState('menu'); // 'menu', 'stopwatch', 'pomodoro_select', 'pomodoro'
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // seconds
  const [pomodoroSessionType, setPomodoroSessionType] = useState('study'); // 'study' or 'break'
  const [pomodoroTarget, setPomodoroTarget] = useState(0); // target time in seconds for pomodoro
  const [completedSessions, setCompletedSessions] = useState(0);

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, top: 0, left: 0 });
  const timerRef = useRef(null);

  useEffect(() => {
    const checkMidnight = () => {
      const lastDate = localStorage.getItem('pomodoroLastDate');
      const today = new Date().toDateString();
      if (lastDate !== today) {
        setCompletedSessions(0);
        localStorage.setItem('pomodoroLastDate', today);
        localStorage.setItem('pomodoroCompletedSessions', '0');
      } else {
        const savedCount = localStorage.getItem('pomodoroCompletedSessions');
        if (savedCount) setCompletedSessions(parseInt(savedCount, 10));
      }
    };
    checkMidnight();
    const interval = setInterval(checkMidnight, 60000);
    return () => clearInterval(interval);
  }, []);

  const addCompletedSession = useCallback(() => {
    setCompletedSessions((prev) => {
      const next = prev + 1;
      localStorage.setItem('pomodoroCompletedSessions', next.toString());
      return next;
    });
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setIsVisible((prev) => !prev);
    };

    const handleViewChange = (e) => {
      const viewId = e.detail;
      if (viewId === 'player-view') {
        setInLecture(true);
      } else {
        setInLecture(false);
        setIsVisible(false);
      }
    };

    window.addEventListener('toggle-floating-timer', handleToggle);
    window.addEventListener('view-changed', handleViewChange);

    const activeView = document.querySelector('.view.active');
    if (activeView && activeView.id === 'player-view') {
      setInLecture(true);
    }

    return () => {
      window.removeEventListener('toggle-floating-timer', handleToggle);
      window.removeEventListener('view-changed', handleViewChange);
    };
  }, []);

  useEffect(() => {
    if (isRunning && inLecture) {
      timerRef.current = setInterval(() => {
        setTime((prev) => {
          if (mode === 'stopwatch') {
            return prev + 1;
          } else if (mode === 'pomodoro') {
            if (prev > 0) {
              return prev - 1;
            } else {
              handleSessionComplete();
              return 0; 
            }
          }
          return prev;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, inLecture]);

  useEffect(() => {
    if (!inLecture && isRunning) {
      setIsRunning(false);
    }
  }, [inLecture, isRunning]);

  const latestState = useRef({ pomodoroSessionType, pomodoroTarget });
  useEffect(() => {
    latestState.current = { pomodoroSessionType, pomodoroTarget };
  }, [pomodoroSessionType, pomodoroTarget]);

  const handleSessionComplete = useCallback(() => {
    const { pomodoroSessionType: currentType, pomodoroTarget: currentTarget } = latestState.current;
    
    if (currentType === 'study') {
      addCompletedSession();
      setPomodoroSessionType('break');
      setTime(5 * 60);
    } else {
      setPomodoroSessionType('study');
      setTime(currentTarget);
    }
  }, [addCompletedSession]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.timer-btn') || e.target.tagName.toLowerCase() === 'button') return;
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      top: position.top,
      left: position.left
    };
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dy = e.clientY - dragStart.current.y;
    const dx = e.clientX - dragStart.current.x;
    
    const newTop = dragStart.current.top + dy;
    const newLeft = dragStart.current.left + dx;
    
    setPosition({ top: newTop, left: newLeft });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      localStorage.setItem('floatingTimerPos', JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleResizeMouseUp = () => {
    const el = document.getElementById('floating-timer-widget');
    if (el) {
      const newSize = { width: el.offsetWidth, height: el.offsetHeight };
      setSize(newSize);
      localStorage.setItem('floatingTimerSize', JSON.stringify(newSize));
    }
  };

  if (!isVisible) return null;

  return (
    <div
      id="floating-timer-widget"
      onMouseDown={handleMouseDown}
      onMouseUp={handleResizeMouseUp}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        minWidth: '160px',
        minHeight: '120px',
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #333',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        resize: 'both',
        overflow: 'hidden',
        cursor: isDragging.current ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
    >
      {completedSessions > 0 && (
        <div style={{ position: 'absolute', top: '4px', left: '8px', fontSize: '0.7rem', color: '#10b981', display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '80%', pointerEvents: 'none' }}>
          {Array.from({ length: completedSessions }).map((_, i) => (
             <span key={i} title="Completed Session">✔</span>
          ))}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px 12px 12px' }}>
        
        {mode === 'menu' && (
          <>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 600, color: '#e5e5e5' }}>Choose Mode</h3>
            <button className="timer-btn" onClick={() => { setMode('stopwatch'); setTime(0); setIsRunning(false); }} style={btnStyle}>Stopwatch</button>
            <button className="timer-btn" onClick={() => setMode('pomodoro_select')} style={{...btnStyle, marginTop: '8px'}}>Pomodoro</button>
          </>
        )}

        {mode === 'pomodoro_select' && (
          <>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: 600, color: '#e5e5e5' }}>Select Time</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[25, 30, 50].map(m => (
                <button
                  key={m}
                  className="timer-btn"
                  style={presetBtnStyle}
                  onClick={() => {
                    setMode('pomodoro');
                    setPomodoroSessionType('study');
                    const targetSecs = m * 60;
                    setPomodoroTarget(targetSecs);
                    setTime(targetSecs);
                    setIsRunning(true);
                  }}
                >{m} Min</button>
              ))}
            </div>
            <button className="timer-btn" onClick={() => setMode('menu')} style={{...iconBtnStyle, marginTop: '12px', fontSize: '0.8rem', width: 'auto', padding: '4px 12px', borderRadius: '16px'}}>Back</button>
          </>
        )}

        {(mode === 'stopwatch' || mode === 'pomodoro') && (
          <>
            {mode === 'pomodoro' && (
              <div style={{ fontSize: '0.8rem', color: pomodoroSessionType === 'study' ? '#38bdf8' : '#10b981', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {pomodoroSessionType === 'study' ? 'Study Session' : 'Break Time'}
              </div>
            )}
            
            <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'monospace', lineHeight: 1, marginBottom: '16px' }}>
              {formatTime(time)}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {isRunning ? (
                <button className="timer-btn" onClick={() => setIsRunning(false)} style={iconBtnStyle} title="Pause">
                  <i className="fas fa-pause"></i>
                </button>
              ) : (
                <button className="timer-btn" onClick={() => setIsRunning(true)} style={iconBtnStyle} title="Start/Resume">
                  <i className="fas fa-play"></i>
                </button>
              )}
              
              <button className="timer-btn" onClick={() => { setIsRunning(false); setMode('menu'); }} style={iconBtnStyle} title="Reset">
                <i className="fas fa-undo"></i>
              </button>
              
              {mode === 'pomodoro' && (
                <button className="timer-btn" onClick={handleSessionComplete} style={iconBtnStyle} title={pomodoroSessionType === 'break' ? 'Skip Break' : 'Skip to Break'}>
                  <i className="fas fa-step-forward"></i>
                </button>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

const btnStyle = {
  background: '#1f1f1f',
  color: 'white',
  border: '1px solid #333',
  padding: '8px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  width: '100%',
  fontWeight: 600,
  transition: 'background 0.2s'
};

const presetBtnStyle = {
  ...btnStyle,
  width: 'auto',
  padding: '6px 10px',
  fontSize: '0.85rem'
};

const iconBtnStyle = {
  ...btnStyle,
  width: '40px',
  height: '40px',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%'
};
