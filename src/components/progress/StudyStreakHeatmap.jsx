import React, { useState, useMemo, useCallback } from 'react';
import { useProgress } from '../../hooks/useProgress.js';
import {
    buildMonthGrid,
    calculateStreakStats
} from '../../utils/studyStreak.js';

/**
 * Pure React Study Streak & Heatmap Matrix Component
 * Displays monthly study intensity matrix, consecutive streaks, and active study day statistics.
 * Consumes useProgress().
 */
export default function StudyStreakHeatmap({ showStats = true, className = '' }) {
    const { getStudyLogs } = useProgress();
    const [viewDate, setViewDate] = useState(() => new Date());
    const [hoveredCell, setHoveredCell] = useState(null);

    const studyLogs = useMemo(() => {
        return getStudyLogs();
    }, [getStudyLogs]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const monthData = useMemo(() => {
        return buildMonthGrid(year, month, studyLogs);
    }, [year, month, studyLogs]);

    const streakStats = useMemo(() => {
        return calculateStreakStats(studyLogs);
    }, [studyLogs]);

    const handlePrevMonth = useCallback(() => {
        setViewDate(prev => {
            const next = new Date(prev);
            next.setDate(1);
            next.setMonth(next.getMonth() - 1);
            return next;
        });
    }, []);

    const handleNextMonth = useCallback(() => {
        setViewDate(prev => {
            const next = new Date(prev);
            next.setDate(1);
            next.setMonth(next.getMonth() + 1);
            return next;
        });
    }, []);

    const handleResetToday = useCallback(() => {
        setViewDate(new Date());
    }, []);

    // Get color for intensity level (0 to 5)
    const getCellBgColor = (level) => {
        switch (level) {
            case 5: return 'rgba(var(--accent-heatmap, 16, 185, 129), 1.0)';
            case 4: return 'rgba(var(--accent-heatmap, 16, 185, 129), 0.8)';
            case 3: return 'rgba(var(--accent-heatmap, 16, 185, 129), 0.6)';
            case 2: return 'rgba(var(--accent-heatmap, 16, 185, 129), 0.4)';
            case 1: return 'rgba(var(--accent-heatmap, 16, 185, 129), 0.2)';
            default: return 'var(--bg-tertiary)';
        }
    };

    return (
        <div className={`dashboard-card flex flex-col gap-4 ${className}`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '16px', padding: '20px', position: 'relative' }}>
            
            {/* Header with Title and Month Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-fire" style={{ color: '#f59e0b', fontSize: '1.1rem' }}></i>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        Study Activity &amp; Streaks
                    </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                        type="button"
                        onClick={handlePrevMonth}
                        title="Previous Month"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s ease' }}
                    >
                        <i className="fas fa-chevron-left"></i>
                    </button>

                    <span 
                        onClick={handleResetToday}
                        title="Click to jump to Current Month"
                        style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', minWidth: '110px', textAlign: 'center', cursor: 'pointer' }}
                    >
                        {monthData.monthName} {monthData.year}
                    </span>

                    <button 
                        type="button"
                        onClick={handleNextMonth}
                        title="Next Month"
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s ease' }}
                    >
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            {/* 4 Quick Streak Stats */}
            {showStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Current</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f59e0b' }}>
                            {streakStats.currentStreak} <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>days</span>
                        </span>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Best</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#10b981' }}>
                            {streakStats.longestStreak} <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>days</span>
                        </span>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Active</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#06b6d4' }}>
                            {streakStats.totalActiveDays} <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>days</span>
                        </span>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '8px 10px', borderRadius: '10px', border: '1px solid var(--border-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Logged</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#a855f7' }}>
                            {streakStats.totalStudyHours} <span style={{ fontSize: '0.72rem', fontWeight: '600' }}>hrs</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Heatmap Grid Container */}
            <div style={{ width: '100%' }}>
                {/* Weekday Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '4px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '700', marginBottom: '6px' }}>
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                </div>

                {/* Day Cells Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '5px' }}>
                    {monthData.cells.map((cell, idx) => {
                        if (cell.isPadding) {
                            return <div key={`pad-${idx}`} style={{ width: '100%', aspectRatio: '1 / 1', opacity: 0 }} />;
                        }

                        const isHovered = hoveredCell === cell;

                        return (
                            <div 
                                key={`cell-${cell.dateKey}`}
                                onMouseEnter={() => setHoveredCell(cell)}
                                onMouseLeave={() => setHoveredCell(null)}
                                style={{
                                    width: '100%',
                                    aspectRatio: '1 / 1',
                                    borderRadius: '6px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    background: getCellBgColor(cell.level),
                                    border: cell.isToday ? '2px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: cell.level >= 4 ? '0 0 10px rgba(var(--accent-heatmap, 16, 185, 129), 0.35)' : 'none',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                                    zIndex: isHovered ? 20 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    color: cell.level > 2 ? '#ffffff' : 'var(--text-secondary)'
                                }}
                            >
                                <span>{cell.dayNumber}</span>

                                {/* Floating Tooltip */}
                                {isHovered && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 'calc(100% + 6px)',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-secondary)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                        padding: '5px 9px',
                                        borderRadius: '8px',
                                        fontSize: '0.72rem',
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none',
                                        zIndex: 100
                                    }}>
                                        {cell.tooltip}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend Scale */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <span>Less</span>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(var(--accent-heatmap, 16, 185, 129), 0.2)' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(var(--accent-heatmap, 16, 185, 129), 0.4)' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(var(--accent-heatmap, 16, 185, 129), 0.6)' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(var(--accent-heatmap, 16, 185, 129), 0.8)' }} />
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(var(--accent-heatmap, 16, 185, 129), 1.0)' }} />
                <span>More</span>
            </div>
        </div>
    );
}
