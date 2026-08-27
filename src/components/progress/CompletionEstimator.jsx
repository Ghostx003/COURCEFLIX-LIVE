import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useCourses } from '../../hooks/useCourses.js';
import { useProgress } from '../../hooks/useProgress.js';
import {
    calculateTotalProgressStats,
    estimateCompletion,
    calculateTodayGoal,
    getProgressColor
} from '../../utils/completionEstimator.js';
import { formatExactTime } from '../../services/utils.js';

/**
 * React Completion & Time Intelligence Estimator Component
 * Displays real-time progress aggregation, finish date forecasting, and today's goals.
 * Consumes useCourses() and useProgress() context layers.
 */
export default function CompletionEstimator({ onClose }) {
    const { courses } = useCourses();
    const { getCourseProgress, getAllProgress } = useProgress();

    // LocalStorage-backed calculation preferences
    const [mode, setMode] = useState(() => {
        return typeof localStorage !== 'undefined'
            ? (localStorage.getItem('calcTargetMode') || 'hours')
            : 'hours';
    });

    const [dailyHours, setDailyHours] = useState(() => {
        return typeof localStorage !== 'undefined'
            ? parseFloat(localStorage.getItem('calcDailyHours') || '7')
            : 7;
    });

    const [dailyLectures, setDailyLectures] = useState(() => {
        return typeof localStorage !== 'undefined'
            ? parseFloat(localStorage.getItem('calcDailyLectures') || '4')
            : 4;
    });

    const [speed, setSpeed] = useState(() => {
        return typeof localStorage !== 'undefined'
            ? parseFloat(localStorage.getItem('calcPlaybackSpeed') || '1.5')
            : 1.5;
    });

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Save preferences to localStorage
    const handleModeChange = useCallback((newMode) => {
        setMode(newMode);
        try {
            localStorage.setItem('calcTargetMode', newMode);
        } catch (e) {}
    }, []);

    const handleDailyHoursChange = (val) => {
        const num = parseFloat(val) || 0;
        setDailyHours(num);
        try {
            localStorage.setItem('calcDailyHours', num.toString());
        } catch (e) {}
    };

    const handleDailyLecturesChange = (val) => {
        const num = parseFloat(val) || 0;
        setDailyLectures(num);
        try {
            localStorage.setItem('calcDailyLectures', num.toString());
        } catch (e) {}
    };

    const handleSpeedChange = (val) => {
        const num = parseFloat(val) || 1.0;
        setSpeed(num);
        try {
            localStorage.setItem('calcPlaybackSpeed', num.toString());
        } catch (e) {}
    };

    // Calculate aggregated course statistics
    const stats = useMemo(() => {
        return calculateTotalProgressStats(courses, (c) => getCourseProgress(c));
    }, [courses, getCourseProgress]);

    // Calculate completion forecast
    const estimation = useMemo(() => {
        return estimateCompletion({
            totalSecondsLeft: stats.totalSecondsLeft,
            pendingLectures: stats.pendingLectures,
            mode,
            dailyHours,
            dailyLectures,
            speed
        });
    }, [stats.totalSecondsLeft, stats.pendingLectures, mode, dailyHours, dailyLectures, speed]);

    // Calculate today's completed goals
    const todayGoal = useMemo(() => {
        const allProgress = getAllProgress();
        return calculateTodayGoal(allProgress, mode, dailyHours, dailyLectures, speed);
    }, [getAllProgress, mode, dailyHours, dailyLectures, speed]);

    const progressColor = getProgressColor(stats.pct);

    return (
        <div className="modal-content" style={{ maxWidth: '580px', padding: '2rem 2.2rem' }}>
            <button className="close-modal-btn" title="Close" onClick={onClose}>&times;</button>
            
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                <i className="fas fa-chart-pie" style={{ color: 'var(--accent-primary)', fontSize: '1.25rem' }}></i>
                Completion &amp; Time Intelligence
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', fontSize: '0.88rem', fontWeight: '500' }}>
                Comprehensive progress, exact course time breakdown, and finish date estimator.
            </p>

            <div className="modal-content-scrollable" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '68vh', overflowY: 'auto', paddingRight: '4px' }}>
                
                {/* 4 Quick Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-history" style={{ color: '#10b981' }}></i> Hours Studied
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#10b981' }}>
                            <span>{(stats.totalCompletedSeconds / 3600).toFixed(1)}</span> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>hrs</span>
                        </div>
                    </div>

                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-hourglass-half" style={{ color: '#f59e0b' }}></i> Hours to Study
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f59e0b' }}>
                            <span>{(stats.totalSecondsLeft / 3600).toFixed(1)}</span> <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>hrs</span>
                        </div>
                    </div>

                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-check-circle" style={{ color: '#06b6d4' }}></i> Lectures Completed
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#06b6d4' }}>
                            <span>{stats.totalCompletedLectures}</span>
                        </div>
                    </div>

                    <div className="calc-stat-card" style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <i className="fas fa-list-ul" style={{ color: '#a855f7' }}></i> Lectures Left
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#a855f7' }}>
                            <span>{stats.pendingLectures}</span>
                        </div>
                    </div>
                </div>

                {/* Overall Progress Panel */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)' }}>Overall Completion Progress</span>
                        <div className="calc-big-date" style={{ fontSize: '1.45rem', fontWeight: '800', color: progressColor }}>{stats.pct}%</div>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-secondary)', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${stats.pct}%`, height: '100%', background: progressColor, borderRadius: '10px', transition: 'width 0.5s ease, background 0.5s ease' }}></div>
                    </div>
                </div>

                {/* Exact Time Left Section */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border-secondary)' }}>
                    <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-clock" style={{ color: 'var(--accent-primary)' }}></i> Exact Time Left Across All Courses
                    </h3>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: progressColor, marginBottom: '14px' }}>
                        {formatExactTime(stats.totalSecondsLeft)}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                        Course-by-Course Breakdown
                    </div>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {stats.courseBreakdown.length === 0 ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', padding: '6px' }}>No active courses found.</div>
                        ) : (
                            stats.courseBreakdown.map(c => {
                                const cColor = getProgressColor(c.percentage);
                                return (
                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-secondary)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, marginRight: '12px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.title}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{c.completedLectures}/{c.totalLectures} lecs done ({c.percentage}%)</span>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: cColor, whiteSpace: 'nowrap', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                                            {formatExactTime(c.secondsLeft)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Calculation Mode Switcher */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calculation Target Mode</label>
                    <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-tertiary)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border-secondary)' }}>
                        <button 
                            type="button" 
                            className={`calc-mode-btn ${mode === 'hours' ? 'active' : ''}`}
                            onClick={() => handleModeChange('hours')}
                            style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem', fontWeight: '700', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', background: mode === 'hours' ? 'var(--accent-primary)' : 'transparent', color: mode === 'hours' ? '#ffffff' : 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-clock"></i> Daily Study Hours
                        </button>
                        <button 
                            type="button" 
                            className={`calc-mode-btn ${mode === 'lectures' ? 'active' : ''}`}
                            onClick={() => handleModeChange('lectures')}
                            style={{ flex: 1, padding: '10px 14px', fontSize: '0.85rem', fontWeight: '700', borderRadius: '10px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s ease', background: mode === 'lectures' ? 'var(--accent-primary)' : 'transparent', color: mode === 'lectures' ? '#ffffff' : 'var(--text-secondary)' }}
                        >
                            <i className="fas fa-list-ol"></i> Daily Lecture Intake
                        </button>
                    </div>
                </div>

                {/* Mode 1 Inputs: Daily Study Hours */}
                {mode === 'hours' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                        <div className="calc-input-group">
                            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Daily Study Hours</label>
                            <input 
                                type="number" 
                                value={dailyHours} 
                                onChange={(e) => handleDailyHoursChange(e.target.value)} 
                                min="0.5" 
                                max="24" 
                                step="0.5" 
                                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} 
                            />
                        </div>
                        <div className="calc-input-group">
                            <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Avg Playback Speed</label>
                            <input 
                                type="number" 
                                value={speed} 
                                onChange={(e) => handleSpeedChange(e.target.value)} 
                                min="0.5" 
                                max="5" 
                                step="0.1" 
                                style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} 
                            />
                        </div>
                    </div>
                )}

                {/* Mode 2 Inputs: Daily Lecture Intake */}
                {mode === 'lectures' && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                            <div className="calc-input-group">
                                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Daily Lectures Intake</label>
                                <input 
                                    type="number" 
                                    value={dailyLectures} 
                                    onChange={(e) => handleDailyLecturesChange(e.target.value)} 
                                    min="1" 
                                    max="50" 
                                    step="1" 
                                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} 
                                />
                            </div>
                            <div className="calc-input-group">
                                <label style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>Avg Playback Speed</label>
                                <input 
                                    type="number" 
                                    value={speed} 
                                    onChange={(e) => handleSpeedChange(e.target.value)} 
                                    min="0.5" 
                                    max="5" 
                                    step="0.1" 
                                    style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-secondary)', borderRadius: '10px', outline: 'none', fontWeight: '600' }} 
                                />
                            </div>
                        </div>

                        {/* Daily Watch Time Info Panel for Lecture Intake Mode */}
                        <div style={{ background: 'var(--bg-tertiary)', padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <i className="fas fa-stopwatch" style={{ color: 'var(--accent-primary)' }}></i> Daily Watch Time Required
                            </div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--accent-primary)' }}>
                                <span>{formatExactTime(estimation.dailyWatchTimeSec)}</span> <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>/ day</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                                To watch <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{dailyLectures}</span> lectures/day at <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{speed}</span>x playback speed.
                            </div>
                        </div>
                    </>
                )}
                
                {/* Finish Date Prediction */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border-secondary)' }}>
                    <h3 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Realistic Finish Date:</h3>
                    <div className="calc-big-date" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{estimation.finishDateFormatted}</div>
                    <div className="calc-meta-stats" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px', fontWeight: '500' }}>{estimation.metaText}</div>
                </div>
                
                {/* Today's Goal */}
                <div className="calc-results-panel" style={{ background: 'var(--bg-tertiary)', padding: '16px 18px', borderRadius: '16px', border: '1px solid var(--border-secondary)', position: 'relative' }}>
                    <h3 style={{ fontSize: '0.78rem', marginBottom: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Today's Lecture Goal</h3>
                    <div 
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)', borderRadius: '12px' }}
                    >
                        <input 
                            type="checkbox" 
                            checked={todayGoal.isGoalMet} 
                            readOnly 
                            style={{ pointerEvents: 'none', accentColor: 'var(--accent-primary)', width: '18px', height: '18px', margin: '0' }} 
                        />
                        <span style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                            Goal: {todayGoal.completedTodayCount}/{todayGoal.targetLectures} lectures
                        </span>
                        <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}></i>
                    </div>

                    {isDropdownOpen && (
                        <div style={{ position: 'absolute', top: 'calc(100% - 10px)', left: '0', right: '0', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '10px', boxShadow: 'var(--shadow)', zIndex: 70, maxHeight: '200px', overflowY: 'auto', padding: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {todayGoal.completedTodayList.length === 0 ? (
                                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '10px', fontSize: '0.85rem' }}>No lectures completed today.</div>
                            ) : (
                                todayGoal.completedTodayList.map(prog => (
                                    <div key={prog.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', paddingBottom: '4px', marginBottom: '4px' }}>
                                        <div style={{ fontSize: '0.8rem', flexGrow: 1, marginRight: '10px', overflow: 'hidden' }}>
                                            <strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prog.courseTitle}</strong>
                                            <span style={{ color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prog.lectureName}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>{prog.timeFormatted}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <button 
                className="primary-btn" 
                onClick={onClose} 
                style={{ width: '100%', marginTop: '1.5rem', padding: '12px 20px', fontSize: '0.98rem', borderRadius: '12px', justifyContent: 'center' }}
            >
                Done
            </button>
        </div>
    );
}
