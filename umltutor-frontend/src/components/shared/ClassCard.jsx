import React from 'react';
import { Users, BookOpen, ArrowRight, GraduationCap, CheckCircle2, Clock, TrendingUp, ArrowRight as ArrowRightIcon } from 'lucide-react';

/**
 * Shared ClassCard component for both student and teacher views
 * @param {Object} props
 * @param {Object} props.class - Class object
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.showProgress - Show progress bar
 * @param {number} props.progress - Progress percentage
 * @param {number} props.assignmentsCount - Number of assignments
 * @param {number} props.submittedCount - Number of submitted assignments
 * @param {number} props.studentCount - Student count (teacher view)
 * @param {number} props.totalAssignments - Total assignments (teacher view)
 * @param {string} props.teacherName - Teacher name (student view)
 * @param {string} props.role - 'student' | 'teacher'
 * @param {boolean} props.showEnterButton - Show enter button (student view)
 * @param {Function} props.onEnterClick - Enter button click handler
 */
export default function ClassCard({
    class: cls,
    onClick,
    showProgress = false,
    progress = null,
    assignmentsCount = 0,
    submittedCount = 0,
    studentCount = 0,
    totalAssignments = 0,
    teacherName = '',
    role = 'student',
    showEnterButton = false,
    onEnterClick = null,
}) {
    const avatarChar = cls.name?.charAt(0)?.toUpperCase() || 'C';

    return (
        <div
            className="cls-card"
            style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)'
            }}
            onClick={onClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && onClick?.(e)}
        >
            <div className="cls-card-banner">
                <div className="cls-card-avatar">{avatarChar}</div>
                <span className="cls-card-code">{cls.code || 'CODE'}</span>
            </div>

            <div className="cls-card-body" style={{ background: '#ffffff', padding: '22px' }}>
                <h3 className="cls-card-name" style={{ color: '#0f172a', fontWeight: 800 }}>{cls.name}</h3>
                {cls.description && (
                    <p className="cls-card-desc" style={{ color: '#334155', fontWeight: 500 }}>{cls.description}</p>
                )}

                <div className="cls-card-meta">
                    {role === 'student' ? (
                        <>
                            <span className="cls-meta-tag" style={{ color: '#1e293b', background: '#f1f5f9', borderColor: '#cbd5e1' }}>
                                <Users size={11} /> {teacherName || 'Teacher'}
                            </span>
                            <span className="cls-meta-tag" style={{ color: '#1e293b', background: '#f1f5f9', borderColor: '#cbd5e1' }}>
                                <BookOpen size={11} /> {assignmentsCount} assignments
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="cls-meta-tag" style={{ color: '#1e293b', background: '#f1f5f9', borderColor: '#cbd5e1' }}>
                                <GraduationCap size={11} /> {studentCount} students
                            </span>
                            <span className="cls-meta-tag" style={{ color: '#1e293b', background: '#f1f5f9', borderColor: '#cbd5e1' }}>
                                <BookOpen size={11} /> {totalAssignments} assignments
                            </span>
                        </>
                    )}
                </div>

                {showProgress && progress !== null && (
                    <div className="cls-progress-wrap" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                        <div className="cls-progress-header">
                            <span className="cls-progress-label" style={{ color: '#475569', fontWeight: 800 }}>Progress</span>
                            <span className="cls-progress-pct" style={{ color: '#0f172a', fontWeight: 900 }}>{progress}%</span>
                        </div>
                        <div className="cls-progress-track" style={{ background: '#e2e8f0', height: '7px' }}>
                            <div
                                className="cls-progress-fill"
                                style={{ width: `${progress}%`, height: '100%', borderRadius: '99px' }}
                            />
                        </div>
                        <p className="cls-progress-note" style={{ color: '#475569', fontWeight: 600 }}>
                            {submittedCount} of {assignmentsCount} completed
                        </p>
                    </div>
                )}

                {showEnterButton && (
                    <button
                        className="cls-card-enter"
                        style={{ background: '#f8fafc', color: '#4338ca', fontWeight: 800, borderTop: '1px solid #e2e8f0' }}
                        onClick={(e) => { e.stopPropagation(); onEnterClick?.(); }}
                    >
                        Enter Classroom
                        <ArrowRightIcon size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}