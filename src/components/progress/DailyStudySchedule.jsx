import React, { useMemo } from 'react';
import { useCourses } from '../../hooks/useCourses.js';
import { useProgress } from '../../hooks/useProgress.js';
import { transformLogsToActivitySchedule } from '../../utils/studySchedule.js';

/**
 * Pure React Daily Study Schedule & Activity Log Component
 * Displays chronological study sessions with subject badges, teacher metadata, and duration.
 * Consumes useCourses() and useProgress().
 */
export default function DailyStudySchedule({ className = '' }) {
    const { courses } = useCourses();
    const { getStudyLogs } = useProgress();

    const studyLogs = useMemo(() => {
        return getStudyLogs();
    }, [getStudyLogs]);

    const scheduleItems = useMemo(() => {
        return transformLogsToActivitySchedule(studyLogs, courses);
    }, [studyLogs, courses]);

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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-list-check" style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}></i>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        Study Activity Log
                    </h3>
                </div>

                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '3px 8px', borderRadius: '6px' }}>
                    {scheduleItems.length} {scheduleItems.length === 1 ? 'Session' : 'Sessions'}
                </span>
            </div>

            {/* List of study activities */}
            <div 
                id="daily-schedule-list"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                }}
            >
                {scheduleItems.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            No study activity recorded yet.
                        </p>
                    </div>
                ) : (
                    scheduleItems.map((item, idx) => (
                        <div 
                            key={`${item.id}-${idx}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid rgba(255,255,255,0.03)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {/* Icon / LOG Badge */}
                            <div 
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px',
                                    flexShrink: 0,
                                    backgroundColor: `${item.iconColor}22`,
                                    border: `1px solid ${item.iconColor}44`
                                }}
                            >
                                <span style={{ color: item.iconColor, fontWeight: '800', fontSize: '9px', letterSpacing: '0.5px' }}>
                                    LOG
                                </span>
                            </div>

                            {/* Subject & Teacher Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.subject}
                                    </span>
                                    {item.teacher && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            - {item.teacher}
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    {item.formattedDate}
                                </div>
                            </div>

                            {/* Duration */}
                            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {item.formattedDuration}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
