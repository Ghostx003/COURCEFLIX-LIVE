import React, { useState, useMemo } from 'react';
import { useProgress } from '../../hooks/useProgress.js';
import { calculateHoursActivity } from '../../utils/studyLogs.js';

/**
 * Pure React Hours Activity Bar Chart Component
 * Renders weekly/monthly study time series with change metrics and interactive tooltips.
 * Consumes useProgress() (Zero heavy chart libraries).
 */
export default function HoursActivityChart({ className = '' }) {
    const { getStudyLogs } = useProgress();

    const [period, setPeriod] = useState('weekly'); // 'weekly' | 'monthly'
    const [hoveredBar, setHoveredBar] = useState(null);

    const studyLogs = useMemo(() => {
        return getStudyLogs();
    }, [getStudyLogs]);

    const activityData = useMemo(() => {
        return calculateHoursActivity(studyLogs, period);
    }, [studyLogs, period]);

    const getBadgeColor = (type) => {
        if (type === 'increase' || type === 'start') return '#10b981'; // emerald green
        if (type === 'decrease') return '#ef4444'; // rose red
        return 'var(--text-secondary)';
    };

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
            {/* Header with Title, Change Indicator, and Period Select */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fas fa-chart-column" style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}></i>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                            Hours Activity
                        </h3>
                    </div>

                    {/* Change indicator text */}
                    {activityData.changeText && (
                        <span style={{
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            color: getBadgeColor(activityData.changeType),
                            background: 'var(--bg-tertiary)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${getBadgeColor(activityData.changeType)}33`
                        }}>
                            {activityData.changeText}
                        </span>
                    )}
                </div>

                <select 
                    id="hours-activity-period-select"
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
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </div>

            {/* Bar Chart Container */}
            <div style={{ position: 'relative', height: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: '20px' }}>
                {/* Horizontal guide lines */}
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, bottom: '26px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', opacity: 0.15 }}>
                    <div style={{ borderTop: '1px dashed var(--text-secondary)' }} />
                    <div style={{ borderTop: '1px dashed var(--text-secondary)' }} />
                    <div style={{ borderTop: '1px dashed var(--text-secondary)' }} />
                </div>

                {/* Bars flex row */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: period === 'weekly' ? '12px' : '3px', height: 'calc(100% - 26px)', zIndex: 1 }}>
                    {activityData.bars.map((bar, idx) => {
                        const isHovered = hoveredBar?.dateStr === bar.dateStr;
                        const minHeight = bar.hours > 0 ? Math.max(bar.percentageHeight, 6) : 2;

                        return (
                            <div 
                                key={`${bar.label}-${idx}`}
                                onMouseEnter={() => setHoveredBar(bar)}
                                onMouseLeave={() => setHoveredBar(null)}
                                style={{
                                    flex: 1,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }}
                            >
                                {/* Floating Tooltip */}
                                {isHovered && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 'calc(100% + 4px)',
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-secondary)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.72rem',
                                        fontWeight: '700',
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        zIndex: 10,
                                        pointerEvents: 'none'
                                    }}>
                                        <div>{bar.dateStr}</div>
                                        <div style={{ color: 'var(--accent-primary)', marginTop: '1px' }}>
                                            Studied: {bar.hours.toFixed(1)}h
                                        </div>
                                    </div>
                                )}

                                {/* Bar shape */}
                                <div 
                                    style={{
                                        width: '100%',
                                        maxWidth: period === 'weekly' ? '32px' : '10px',
                                        height: `${minHeight}%`,
                                        borderRadius: '4px 4px 1px 1px',
                                        background: bar.hours > 0
                                            ? (isHovered ? 'var(--accent-primary)' : 'linear-gradient(180deg, var(--accent-primary) 0%, rgba(16, 185, 129, 0.4) 100%)')
                                            : 'var(--bg-tertiary)',
                                        boxShadow: bar.hours > 0 && isHovered ? '0 0 10px rgba(16, 185, 129, 0.5)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* X-Axis labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: period === 'weekly' ? '12px' : '3px', marginTop: '6px', borderTop: '1px solid var(--border-secondary)', paddingTop: '4px' }}>
                    {activityData.bars.map((bar, idx) => {
                        // In monthly mode, show label every 5 days for cleanliness
                        const showLabel = period === 'weekly' || (idx + 1) === 1 || (idx + 1) % 5 === 0 || (idx + 1) === activityData.bars.length;

                        return (
                            <div 
                                key={`label-${bar.label}-${idx}`}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    fontSize: period === 'weekly' ? '0.75rem' : '0.65rem',
                                    fontWeight: '700',
                                    color: hoveredBar?.dateStr === bar.dateStr ? 'var(--accent-primary)' : 'var(--text-secondary)'
                                }}
                            >
                                {showLabel ? bar.label : ''}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary text footer */}
            {activityData.summaryText && (
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-secondary)', paddingTop: '10px', marginTop: '2px' }}>
                    {activityData.summaryText}
                </div>
            )}
        </div>
    );
}
