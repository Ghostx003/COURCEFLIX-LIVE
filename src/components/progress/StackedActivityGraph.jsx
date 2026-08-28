import React, { useState, useMemo } from 'react';
import { useCourses } from '../../hooks/useCourses.js';
import { useProgress } from '../../hooks/useProgress.js';
import { calculateStackedActivity, getSubjectColor } from '../../utils/studyLogs.js';

/**
 * Pure React Stacked Activity Bar Graph Component
 * Displays stacked comparison of study time criteria per subject with period filters and interactive tooltips.
 * Consumes useCourses() and useProgress() (Zero heavy chart libraries).
 */
export default function StackedActivityGraph({ className = '' }) {
    const { courses } = useCourses();
    const { getStudyLogs } = useProgress();

    const [period, setPeriod] = useState('all'); // 'today' | 'week' | 'month' | 'all'
    const [hoveredBar, setHoveredBar] = useState(null);

    const studyLogs = useMemo(() => {
        return getStudyLogs();
    }, [getStudyLogs]);

    const stackedData = useMemo(() => {
        return calculateStackedActivity(studyLogs, courses, period, 'Logged Time', 'Completed Time');
    }, [studyLogs, courses, period]);

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
            {/* Header with Title and Period Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-layer-group" style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}></i>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        Subject Activity Distribution
                    </h3>
                </div>

                {/* Period Pill Selector */}
                <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-secondary)' }}>
                    {['today', 'week', 'month', 'all'].map(p => (
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

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-primary)' }} />
                    <span>Logged Hours</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(52, 211, 153, 0.7)' }} />
                    <span>Completed Hours</span>
                </div>
            </div>

            {/* Stacked Bars Container */}
            {stackedData.bars.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        No stacked activity found for this period.
                    </p>
                </div>
            ) : (
                <div style={{ position: 'relative', height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: '16px' }}>
                    {/* Background gridlines */}
                    <div style={{ position: 'absolute', top: '16px', left: 0, right: 0, bottom: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', opacity: 0.15 }}>
                        <div style={{ borderTop: '1px dashed var(--text-secondary)' }} />
                        <div style={{ borderTop: '1px dashed var(--text-secondary)' }} />
                        <div style={{ borderTop: '1px dashed var(--text-secondary)' }} />
                    </div>

                    {/* Bars Horizontal Flex Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: 'calc(100% - 30px)', overflowX: 'auto', paddingBottom: '2px', zIndex: 1 }}>
                        {stackedData.bars.map((bar, idx) => {
                            const isHovered = hoveredBar?.subject === bar.subject;
                            const minHeight = Math.max(bar.heightPct, 6);

                            return (
                                <div 
                                    key={`${bar.subject}-${idx}`}
                                    onMouseEnter={() => setHoveredBar(bar)}
                                    onMouseLeave={() => setHoveredBar(null)}
                                    style={{
                                        flex: '0 0 auto',
                                        minWidth: '48px',
                                        maxWidth: '72px',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}
                                >
                                    {/* Hover Tooltip */}
                                    {isHovered && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 'calc(100% + 4px)',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-secondary)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                            padding: '6px 10px',
                                            borderRadius: '8px',
                                            fontSize: '0.75rem',
                                            fontWeight: '700',
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            zIndex: 10,
                                            pointerEvents: 'none'
                                        }}>
                                            <div style={{ color: 'var(--text-primary)', marginBottom: '2px' }}>{bar.subject}</div>
                                            <div style={{ color: 'var(--accent-primary)', fontSize: '0.72rem' }}>Logged: {bar.formattedVal1}</div>
                                            <div style={{ color: '#34d399', fontSize: '0.72rem' }}>Completed: {bar.formattedVal2}</div>
                                            <div style={{ borderTop: '1px solid var(--border-secondary)', marginTop: '3px', paddingTop: '2px', fontSize: '0.72rem', opacity: 0.8 }}>
                                                Total: {bar.formattedTotal}
                                            </div>
                                        </div>
                                    )}

                                    {/* Stacked Vertical Pill */}
                                    <div 
                                        style={{
                                            width: '100%',
                                            height: `${minHeight}%`,
                                            borderRadius: '6px 6px 1px 1px',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            boxShadow: isHovered ? '0 0 12px rgba(var(--accent-glow, 16, 185, 129), 0.4)' : 'none',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {/* Top Segment (Completed Buffer) */}
                                        <div 
                                            style={{
                                                flex: bar.pct2,
                                                background: isHovered ? '#10b981' : 'rgba(52, 211, 153, 0.7)',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                        />
                                        {/* Bottom Segment (Logged Time) */}
                                        <div 
                                            style={{
                                                flex: bar.pct1,
                                                background: isHovered ? 'var(--accent-primary)' : 'rgba(var(--accent-glow, 16, 185, 129), 0.9)',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* X-Axis labels */}
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'hidden', borderTop: '1px solid var(--border-secondary)', paddingTop: '6px' }}>
                        {stackedData.bars.map((bar, idx) => (
                            <div 
                                key={`label-${bar.subject}-${idx}`}
                                style={{
                                    flex: '0 0 auto',
                                    minWidth: '48px',
                                    maxWidth: '72px',
                                    textAlign: 'center',
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    color: hoveredBar?.subject === bar.subject ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                                title={bar.subject}
                            >
                                {bar.subject}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
