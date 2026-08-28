import React, { useMemo } from 'react';
import { useCourses } from '../../hooks/useCourses.js';
import { useProgress } from '../../hooks/useProgress.js';
import { transformCoursesToTrackerCards } from '../../utils/lectureTracker.js';

/**
 * Pure React Lecture Tracker Carousel Component
 * Displays horizontal scrolling subject cards with radial progress rings and lecture metrics.
 * Consumes useCourses() and useProgress().
 */
export default function LectureTracker({ className = '' }) {
    const { courses } = useCourses();
    const { getCourseProgress } = useProgress();

    const trackerCards = useMemo(() => {
        return transformCoursesToTrackerCards(courses, (c) => getCourseProgress(c));
    }, [courses, getCourseProgress]);

    return (
        <div className={`lecture-tracker-section flex flex-col gap-3 ${className}`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fas fa-layer-group" style={{ color: 'var(--accent-primary)', fontSize: '1rem' }}></i>
                    Subject Lecture Progress
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    {trackerCards.length} {trackerCards.length === 1 ? 'Subject' : 'Subjects'}
                </span>
            </div>

            {trackerCards.length === 0 ? (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        No subjects found in Courseflix. Add a course first.
                    </p>
                </div>
            ) : (
                <div 
                    id="lecture-tracker-cards"
                    style={{
                        display: 'flex',
                        gap: '14px',
                        overflowX: 'auto',
                        paddingBottom: '8px',
                        paddingTop: '2px',
                        scrollbarWidth: 'thin'
                    }}
                >
                    {trackerCards.map(card => {
                        return (
                            <div 
                                key={card.id}
                                className="lecture-tracker-card"
                                style={{
                                    width: '260px',
                                    flexShrink: 0,
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-secondary)',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                                }}
                            >
                                {/* Card Header */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                        <h4 
                                            title={card.name}
                                            style={{
                                                margin: 0,
                                                fontSize: '1rem',
                                                fontWeight: '800',
                                                color: 'var(--text-primary)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                flex: 1
                                            }}
                                        >
                                            {card.name}
                                        </h4>
                                        {card.hoursLeft > 0 && (
                                            <span 
                                                style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: '800',
                                                    padding: '2px 7px',
                                                    borderRadius: '6px',
                                                    background: 'rgba(var(--accent-glow, 16, 185, 129), 0.15)',
                                                    color: 'var(--accent-primary)',
                                                    border: '1px solid rgba(var(--accent-glow, 16, 185, 129), 0.3)',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {card.hoursLeft}h left
                                            </span>
                                        )}
                                    </div>
                                    <p 
                                        title={card.faculty}
                                        style={{
                                            margin: 0,
                                            fontSize: '0.78rem',
                                            color: 'var(--text-secondary)',
                                            fontWeight: '500',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                    >
                                        {card.faculty}
                                    </p>
                                </div>

                                {/* Card Progress Bottom Section */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                    {/* Radial Meter */}
                                    <div 
                                        style={{
                                            position: 'relative',
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: `conic-gradient(var(--accent-primary, #10b981) ${card.percentage}%, var(--bg-secondary) 0)`
                                        }}
                                    >
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                width: '46px',
                                                height: '46px',
                                                borderRadius: '50%',
                                                background: 'var(--bg-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                {card.percentage}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Lecture Counts */}
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                                            {card.completedLectures} <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)' }}>/ {card.totalLectures}</span>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Lectures
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
