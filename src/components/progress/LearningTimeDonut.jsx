import React, { useState, useMemo } from 'react';
import { useCourses } from '../../hooks/useCourses.js';
import { useProgress } from '../../hooks/useProgress.js';
import { aggregateLogsBySubject, calculateDonutSlices } from '../../utils/studyLogs.js';

/**
 * Pure React Learning Time Donut Chart Component
 * Displays interactive SVG/conic donut chart for subject study time distribution with period filters.
 * Consumes useCourses() and useProgress().
 */
export default function LearningTimeDonut({ className = '' }) {
    const { courses } = useCourses();
    const { getStudyLogs } = useProgress();

    const [period, setPeriod] = useState('month'); // 'today' | 'week' | 'month' | 'all'
    const [hoveredSlice, setHoveredSlice] = useState(null);

    const studyLogs = useMemo(() => {
        return getStudyLogs();
    }, [getStudyLogs]);

    const donutData = useMemo(() => {
        const stats = aggregateLogsBySubject(studyLogs, period, courses);
        return calculateDonutSlices(stats);
    }, [studyLogs, period, courses]);

    // Build conic gradient string for pure CSS/SVG donut ring
    const conicGradientStr = useMemo(() => {
        if (!donutData.slices || donutData.slices.length === 0) {
            return 'var(--bg-tertiary) 0% 100%';
        }
        return donutData.slices.map(s => `${s.color} ${s.startPercent}% ${s.endPercent}%`).join(', ');
    }, [donutData.slices]);

    return (
        <div 
            className={`dashboard-card flex flex-col gap-4 ${className}`}
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '16px',
                padding: '20px',
                position: 'relative'
            }}
        >
            {/* Header with Title and Period Filter */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-chart-pie" style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}></i>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        Learning Time
                    </h3>
                </div>

                <select 
                    id="learning-time-period-select"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
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
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                </select>
            </div>

            {/* Donut Chart Presentation */}
            {donutData.slices.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        No completed subjects for this period.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
                    {/* Ring Container with 70% Cutout */}
                    <div 
                        style={{
                            position: 'relative',
                            width: '180px',
                            height: '180px',
                            borderRadius: '50%',
                            background: `conic-gradient(${conicGradientStr})`,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        {/* 70% Inner Cutout Circle */}
                        <div 
                            style={{
                                width: '126px',
                                height: '126px',
                                borderRadius: '50%',
                                background: 'var(--bg-secondary)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                padding: '8px',
                                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.25)',
                                pointerEvents: 'none'
                            }}
                        >
                            <span style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                                {hoveredSlice ? hoveredSlice.formattedDuration : donutData.formattedTotal}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                                {hoveredSlice ? `${hoveredSlice.percentage}%` : 'Total Time'}
                            </span>
                        </div>
                    </div>

                    {/* Legend List */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {donutData.slices.map(slice => {
                            const isHovered = hoveredSlice?.name === slice.name;
                            return (
                                <div 
                                    key={slice.name}
                                    onMouseEnter={() => setHoveredSlice(slice)}
                                    onMouseLeave={() => setHoveredSlice(null)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 8px',
                                        borderRadius: '8px',
                                        background: isHovered ? 'var(--bg-tertiary)' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: slice.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {slice.name}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                            {slice.formattedDuration}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-secondary)', opacity: 0.7 }}>
                                            ({slice.percentage}%)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
