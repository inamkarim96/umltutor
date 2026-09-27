import React from 'react';
import { BookOpen, ArrowRight, Calendar, Users, Clock, CheckCircle2, AlertCircle, Star, TrendingUp, Flag, Layers } from 'lucide-react';
import StatusChip from './StatusChip';

/**
 * Shared AssignmentRow component for both student and teacher dashboards
 * @param {Object} props
 * @param {Object} props.assignment - Assignment object
 * @param {Object} props.submission - Submission object (optional)
 * @param {Function} props.onClick - Click handler
 * @param {string} props.role - 'student' | 'teacher'
 * @param {string} props.className - Class name
 * @param {number} props.score - Score (optional)
 * @param {string} props.classCode - Class code (optional)
 * @param {Function} props.getDeadlineStatus - Function to get deadline status
 * @param {boolean} props.showScore - Show score badge
 * @param {boolean} props.showClassTag - Show class tag
 */
export default function AssignmentRow({
    assignment,
    submission = null,
    onClick,
    role = 'student',
    className = '',
    score = null,
    classCode = '',
    getDeadlineStatus = null,
    showScore = true,
    showClassTag = false,
}) {
    const subStatus = (submission?.status || assignment.status || 'pending').toLowerCase();
    const isSubmitted = subStatus === 'submitted' || subStatus === 'graded';
    const isGraded = subStatus === 'graded';
    const isOverdue = assignment.deadline && new Date(assignment.deadline) < new Date() && !isSubmitted;

    const statusLabel = isGraded
        ? 'graded'
        : isSubmitted
            ? 'submitted'
            : isOverdue
                ? 'overdue'
                : 'pending';

    const deadlineStr = assignment.deadline
        ? new Date(assignment.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : 'No deadline';

    const deadlineStatus = getDeadlineStatus
        ? getDeadlineStatus(assignment.deadline)
        : (isOverdue ? 'overdue' : 'normal');

    const scoreVal = score ?? submission?.score ?? null;

    return (
        <div
            className={`sdb-asgn-row${deadlineStatus === 'overdue' ? ' sdb-asgn-row-overdue' : ''}`}
            onClick={onClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => e.key === 'Enter' && onClick?.(e)}
        >
            <div className="sdb-asgn-icon-wrap">
                {deadlineStatus === 'overdue'
                    ? <span style={{ fontSize: '22px' }}>⚠️</span>
                    : isGraded
                        ? <Star size={22} style={{ color: 'var(--green)' }} />
                        : isSubmitted
                            ? <CheckCircle2 size={22} style={{ color: 'var(--blue)' }} />
                            : <BookOpen size={22} />
                }
            </div>

            <div className="sdb-asgn-info">
                <div className="sdb-asgn-title-row">
                    <span className="sdb-asgn-title">{assignment.title}</span>
                    <StatusChip status={statusLabel} size="sm" />
                </div>

                {assignment.description && (
                    <p className="sdb-asgn-desc">{assignment.description}</p>
                )}

                <div className="sdb-asgn-meta-row">
                    {role === 'student' && className && (
                        <span className="sdb-asgn-class-tag">
                            <Layers size={11} /> {className}
                        </span>
                    )}

                    {showClassTag && classCode && (
                        <span className="sdb-asgn-class-tag">
                            <BookOpen size={11} /> {classCode}
                        </span>
                    )}

                    {role === 'teacher' && className && (
                        <span className="sdb-asgn-class-tag">
                            <Users size={11} /> {className}
                        </span>
                    )}

                    <span className={`sdb-deadline-chip sdb-dc-${deadlineStatus}`}>
                        <Calendar size={10} /> {deadlineStr}
                    </span>

                    {showScore && scoreVal !== null && (
                        <span
                            className="sdb-grade-score-pill"
                            style={{
                                background: scoreVal >= 80 ? 'var(--green-soft)' : scoreVal >= 50 ? 'var(--amber-soft)' : 'var(--red-soft)',
                                color: scoreVal >= 80 ? 'var(--green)' : scoreVal >= 50 ? 'var(--amber)' : 'var(--red)',
                            }}
                        >
                            {scoreVal}%
                        </span>
                    )}
                </div>
            </div>

            <ArrowRight size={16} className="sdb-asgn-arrow" />
        </div>
    );
}

export default AssignmentRow;