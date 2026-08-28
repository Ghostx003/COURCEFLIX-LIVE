import React, { useState, useMemo } from 'react';
import { useCourses } from '../../hooks/useCourses.js';
import { useProgress } from '../../hooks/useProgress.js';
import { aggregateLogsBySubject, calculateSubjectRankings } from '../../utils/studyLogs.js';

/**
 * Pure React Subject Rankings (Most & Least Studied) Component
 * Displays ranked subject leaderboards by hours studied or completed lecture count.
 * Consumes useCourses() and useProgress().
 */
export default function SubjectRankings({ className = '' }) {
    const { courses } = useCourses();
    const { getStudyLogs } = useProgress();

    const [mostMode, setMostMode] = useState('hours'); // 'hours' | 'lectures'
    const [mostPeriod, setMostPeriod] = useState('week'); // 'week' | 'month' | 'all'

    const [leastMode, setLeastMode] = useState('hours'); // 'hours' | 'lectures'
    const [leastPeriod, setLeastPeriod] = useState('week'); // 'week' | 'month' | 'all'

    const studyLogs = useMemo(() => {
        return getStudyLogs();
    }, [getStudyLogs]);

    const mostRankings = useMemo(() => {
        const stats = aggregateLogsBySubject(studyLogs, mostPeriod, courses);
        return calculateSubjectRankings(stats, mostMode, 'most', 7);
    }, [studyLogs, mostPeriod, courses, mostMode]);

    const leastRankings = useMemo(() => {
        const stats = aggregateLogsBySubject(studyLogs, leastPeriod, courses);
        return calculateSubjectRankings(stats, leastMode, 'least', 7);
    }, [studyLogs, leastPeriod, courses, leastMode]);

    const renderRankingCard = (title, iconClass, iconColor, rankings, mode, setMode, period, setPeriod) => {
        return (
            <div 
                className="dashboard-card" 
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}
            >
                {/* Header & Controls */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className={iconClass} style={{ color: iconColor }}></i>
                        {title}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Mode Selector */}
                        <select 
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            style={{
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-secondary)',
                                color: 'var(--text-primary)',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="hours">Total Hours</option>
                            <option value="lectures">Lectures</option>
                        </select>

                        {/* Period Pill Toggles */}
                        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-secondary)' }}>
                            {['week', 'month', 'all'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPeriod(p)}
                                    style={{
                                        border: 'none',
                                        background: period === p ? 'var(--accent-primary)' : 'transparent',
                                        color: period === p ? '#fff' : 'var(--text-secondary)',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        textTransform: 'capitalize',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {p === 'all' ? 'All' : p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                                <th style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)' }}>Subject</th>
                                <th style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textAlign: 'right' }}>
                                    {mode === 'hours' ? 'Time Studied' : 'Lectures'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.length === 0 ? (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        No subjects to rank.
                                    </td>
                                </tr>
                            ) : (
                                rankings.map((item, idx) => (
                                    <tr 
                                        key={`${item.name}-${idx}`}
                                        style={{
                                            borderBottom: idx !== rankings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                    >
                                        <td style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: idx === 0 ? 'rgba(var(--accent-glow, 16, 185, 129), 0.2)' : 'var(--bg-tertiary)',
                                                    color: idx === 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '800'
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                            {item.displayValue}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className={`subject-rankings-grid ${className}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {renderRankingCard(
                'Most Studied Subjects',
                'fas fa-trophy',
                '#f59e0b',
                mostRankings,
                mostMode,
                setMostMode,
                mostPeriod,
                setMostPeriod
            )}

            {renderRankingCard(
                'Least Studied Subjects',
                'fas fa-chart-line-down',
                '#ef4444',
                leastRankings,
                leastMode,
                setLeastMode,
                leastPeriod,
                setLeastPeriod
            )}
        </div>
    );
}
