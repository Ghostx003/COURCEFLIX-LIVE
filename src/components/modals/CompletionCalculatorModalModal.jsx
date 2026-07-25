import React from 'react';

export default function CompletionCalculatorModalModal() {
  return (
    <div id="completion-calculator-modal" className="modal-overlay hidden">
        <div className="modal-content" style={{ maxWidth: "580px", padding: "2rem 2.2rem" }}>
            <button className="close-modal-btn" title="Close">&times;</button>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                <i className="fas fa-chart-pie" style={{ color: 'var(--accent-primary)', fontSize: '1.25rem' }}></i>
                Completion & Time Intelligence
            </h2>
            <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem 0", fontSize: "0.88rem", fontWeight: "500" }}>
                Comprehensive progress, exact course time breakdown, and finish date estimator.
            </p>
            
            <div className="modal-content-scrollable" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* 4 Quick Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-history" style={{ color: '#10b981' }}></i> Hours Studied
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>
                            <span id="calc-hours-studied">0</span> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>hrs</span>
                        </div>
                    </div>

                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-hourglass-half" style={{ color: '#f59e0b' }}></i> Hours to Study
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f59e0b' }}>
                            <span id="calc-hours-remaining">0</span> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>hrs</span>
                        </div>
                    </div>

                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-check-circle" style={{ color: '#06b6d4' }}></i> Lectures Completed
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#06b6d4' }}>
                            <span id="calc-completed-lectures-count">0</span>
                        </div>
                    </div>

                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-list-ul" style={{ color: '#a855f7' }}></i> Lectures Left
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#a855f7' }}>
                            <span id="calc-pending-lectures-count">0</span>
                        </div>
                    </div>
                </div>

                {/* Overall Progress Panel */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' }}>Overall Completion Progress</span>
                        <div className="calc-big-date" id="calc-progress-percentage" style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--accent-primary)' }}>0%</div>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div id="calc-progress-bar" style={{ width: '0%', height: '100%', background: 'var(--accent-primary)', borderRadius: '10px', transition: 'width 0.5s ease, background 0.5s ease' }}></div>
                    </div>
                </div>

                {/* Exact Time Left Section */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border-secondary)' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-clock" style={{ color: 'var(--accent-primary)' }}></i> Exact Time Left Across All Courses
                    </h3>
                    <div id="calc-exact-time-total" style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-primary)', marginBottom: '14px' }}>
                        0 hours 0 mins 0 secs
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                        Course-by-Course Breakdown
                    </div>
                    <div id="calc-course-time-breakdown" style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {/* Dynamic course breakdown list inserted here */}
                    </div>
                </div>

                {/* Calculation Mode Switcher */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calculation Target Mode</label>
                    <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-tertiary)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border-secondary)' }}>
                        <button 
                            type="button" 
                            id="calc-mode-hours-btn"
                            className="calc-mode-btn active"
                            style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem', fontWeight: '700', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', background: 'var(--accent-primary)', color: '#ffffff' }}
                        >
                            <i className="fas fa-clock"></i> Daily Study Hours
                        </button>
                        <button 
                            type="button" 
                            id="calc-mode-lectures-btn"
                            className="calc-mode-btn"
                            style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem', fontWeight: '700', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', background: 'transparent', color: 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-list-ol"></i> Daily Lecture Intake
                        </button>
                    </div>
                </div>

                {/* Mode 1 Inputs: Daily Study Hours */}
                <div id="calc-hours-inputs-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div className="calc-input-group">
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>Daily Study Hours</label>
                        <input type="number" id="calc-daily-hours" defaultValue="7" min="0.5" max="24" step="0.5" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} />
                    </div>
                    <div className="calc-input-group">
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>Avg Playback Speed</label>
                        <input type="number" id="calc-playback-speed-hours" defaultValue="1.5" min="0.5" max="5" step="0.1" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} />
                    </div>
                </div>

                {/* Mode 2 Inputs: Daily Lecture Intake */}
                <div id="calc-lectures-inputs-container" style={{ display: 'none', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div className="calc-input-group">
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>Daily Lectures Intake</label>
                        <input type="number" id="calc-daily-lectures" defaultValue="4" min="1" max="50" step="1" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} />
                    </div>
                    <div className="calc-input-group">
                        <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>Avg Playback Speed</label>
                        <input type="number" id="calc-playback-speed-lectures" defaultValue="1.5" min="0.5" max="5" step="0.1" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} />
                    </div>
                </div>

                {/* Auto-Appearing Daily Watch Time Info Panel for Lecture Intake Mode */}
                <div id="calc-lecture-intake-time-info" style={{ display: 'none', background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <i className="fas fa-stopwatch" style={{ color: 'var(--accent-primary)' }}></i> Daily Watch Time Required
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                        <span id="calc-lecture-intake-daily-time">0 hrs 0 mins</span> <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>/ day</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        To watch <span id="calc-lecture-intake-count" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>4</span> lectures/day at <span id="calc-lecture-intake-speed" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>1.5</span>x playback speed.
                    </div>
                </div>
                
                {/* Finish Date Prediction */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border-secondary)' }}>
                    <h3 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Realistic Finish Date:</h3>
                    <div className="calc-big-date" id="calc-result-date" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>Calculating...</div>
                    <div className="calc-meta-stats" id="calc-result-stats" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '500' }}>...</div>
                </div>
                
                {/* Today's Goal */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '16px 18px', borderRadius: '16px', border: '1px solid var(--border-secondary)', position: 'relative' }}>
                    <h3 style={{ fontSize: '0.78rem', marginBottom: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Today's Lecture Goal</h3>
                    <div id="daily-goal-display" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: '12px' }}>
                        <input type="checkbox" id="daily-goal-checkbox" style={{ pointerEvents: 'none', accentColor: 'var(--accent-primary)', width: '18px', height: '18px', margin: '0' }} />
                        <span id="daily-goal-text" style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>Goal: 0/0 lectures</span>
                        <i className="fas fa-chevron-down" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}></i>
                    </div>
                    <div id="daily-goal-dropdown" className="hidden" style={{ position: 'absolute', top: 'calc(100% - 10px)', left: '0', right: '0', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', boxShadow: 'var(--shadow)', zIndex: '70', maxHeight: '200px', overflowY: 'auto', padding: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    </div>
                </div>
            </div>
            
            <button className="primary-btn" id="run-calculator-btn" style={{ width: "100%", marginTop: "1.5rem", padding: "12px 20px", fontSize: "0.98rem", borderRadius: "12px", justifyContent: "center" }}>Update Calculation</button>
        </div>
    </div>
  );
}
